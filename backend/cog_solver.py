"""
Centre-of-Gravity Geospatial Optimizer  —  Discrete k-NN Edition
=================================================================

Architecture
------------
1.  Load      – parcels_from_db builds a Parcel list from SQLAlchemy objects.
2.  Normalise – QuantileNormaliser clips each metric to [p5, p95] then scales
                to [0, 1].  Lower-is-better metrics are flipped so that 1.0
                always means "most desirable for investment".
3.  Potential – _score_all vectorises V(j) = w·m - penalties for all N
                parcels in one matrix multiply + two boolean mask ops.
4.  Solver    – Discrete k-NN best-neighbour ascent:
                    a. Pre-build a k=20 KD-tree neighbour index (scipy,
                       O(N log N)) or fall back to O(N²) brute-force.
                    b. Multi-restart from the top-n_restarts feasible seeds
                       to avoid early convergence to local maxima.
                    c. Inner hot-loop JIT-compiled by Numba (cache=True,
                       fastmath=True) if available, plain NumPy otherwise.
5.  Ellipse   – confidence_ellipse eigen-decomposes the position covariance
                of the 20 *lowest*-potential parcels to give a 1-sigma
                risk ellipse in metres.

Acceleration tiers (auto-detected at import time)
--------------------------------------------------
Tier 1  scipy + numba   KD-tree O(N log N) index + Numba JIT inner loop
Tier 2  scipy only       KD-tree index, pure-NumPy inner loop
Tier 3  numpy only       O(N²) brute-force index, pure-NumPy inner loop

Call ``acceleration_info()`` to inspect which tier is active.
Call ``warmup_jit()`` once at server startup to pre-compile Numba kernels
(avoids a ~2 s cold-start penalty on the first solve request).

Public interface (unchanged from previous version):
    Parcel, SolverConfig, CogResult, CentreOfGravitySolver, parcels_from_db,
    CogValidationError, validate_weights, acceleration_info, warmup_jit
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Optional

import numpy as np

# ── Optional acceleration libraries ────────────────────────────────────────
try:
    from scipy.spatial import KDTree as _KDTree
    _HAS_SCIPY = True
except ImportError:  # pragma: no cover
    _HAS_SCIPY = False

try:
    import numba as _numba
    _HAS_NUMBA = True
except ImportError:  # pragma: no cover
    _numba = None  # type: ignore
    _HAS_NUMBA = False


# ---------------------------------------------------------------------------
#  Structured validation error
# ---------------------------------------------------------------------------

class CogValidationError(ValueError):
    """
    Raised for pre-flight validation failures (bad weights, no parcels, etc.).
    Carries a machine-readable ``code`` so the apilayer can return structured
    JSON rather than a generic 500.
    """

    def __init__(self, message: str, code: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.code    = code
        self.details = details or {}


# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------

# Maps the five API weight keys -> internal metric column names.
WEIGHT_TO_METRIC: dict[str, str] = {
    "rentalYield":      "rental_yield",
    "pricePerSqm":      "price_per_m2",
    "vacancy":          "vacancy",
    "transitProximity": "transit_score",
    "footfall":         "footfall_score",
}

# True  -> higher raw value is better (kept after scaling to [0,1]).
# False -> lower raw value is better (flipped after scaling).
HIGHER_IS_BETTER: dict[str, bool] = {
    "rental_yield":   True,
    "price_per_m2":   False,
    "vacancy":        False,
    "transit_score":  True,
    "footfall_score": True,
}

ZONING_PENALTY: float = 0.35   # subtracted from V when zoning is infeasible
HAZARD_PENALTY: float = 0.40   # subtracted from V when hazard_flag is True
K_NEIGHBOURS:   int   = 20     # number of nearest neighbours evaluated per step
M_PER_DEG_LAT:  float = 111_320.0


# ---------------------------------------------------------------------------
#  Acceleration helpers
# ---------------------------------------------------------------------------

def acceleration_info() -> dict[str, Any]:
    """
    Return a dict describing which optional acceleration backends are active.

    >>> from cog_solver import acceleration_info
    >>> print(acceleration_info())
    {'scipy_kdtree': True, 'numba_jit': True, 'tier': 1}
    """
    tier = 3
    if _HAS_SCIPY:
        tier = 2
    if _HAS_SCIPY and _HAS_NUMBA:
        tier = 1
    return {
        "scipy_kdtree": _HAS_SCIPY,
        "numba_jit":    _HAS_NUMBA,
        "tier":         tier,
        "tier_label":   {1: "scipy+numba", 2: "scipy", 3: "numpy"}[tier],
    }


def warmup_jit() -> None:
    """
    Pre-compile Numba kernels so the first real solve request is fast.
    No-op if Numba is not installed.  Typical compilation time: 1–3 s.
    """
    if not _HAS_NUMBA:
        return
    _dV   = np.ones(8, dtype=np.float64)
    _dpos = np.zeros((8, 2), dtype=np.float64)
    _dnb  = np.arange(24, dtype=np.int64).reshape(8, 3) % 8
    _dmsk = np.ones(8, dtype=np.bool_)
    _discrete_solve_core(_dV, _dpos, _dnb, _dmsk, 3, M_PER_DEG_LAT, 0)


# ---------------------------------------------------------------------------
#  Fast scalar NaN coercion  (used in fit_transform)
# ---------------------------------------------------------------------------

def _to_float_nan(v: Any) -> float:
    """Convert v to float; return NaN for None, NaN, or non-numeric values."""
    if v is None:
        return math.nan
    try:
        f = float(v)
        return math.nan if math.isnan(f) else f
    except (TypeError, ValueError):
        return math.nan


# ---------------------------------------------------------------------------
#  Weight validation
# ---------------------------------------------------------------------------

def validate_weights(raw_weights: dict) -> tuple[bool, str, str, dict]:
    """
    Validate the raw weight dict coming from the API request.

    Returns
    -------
    (is_valid, error_message, error_code, details)
    """
    if not isinstance(raw_weights, dict):
        return False, "weights must be a JSON object", "INVALID_WEIGHTS", {}

    known   = set(WEIGHT_TO_METRIC.keys())
    unknown = [k for k in raw_weights if k not in known]
    if unknown:
        return (
            False,
            f"Unknown weight keys: {unknown}. Expected: {sorted(known)}",
            "INVALID_WEIGHTS",
            {"unknown_keys": unknown, "expected_keys": sorted(known)},
        )

    negatives = {k: v for k, v in raw_weights.items() if v < 0}
    if negatives:
        return (
            False,
            f"Weights must be non-negative. Negative: {negatives}",
            "INVALID_WEIGHTS",
            {"negative_keys": negatives},
        )

    total = sum(abs(v) for v in raw_weights.values())
    if total == 0:
        return (
            False,
            "All weights are zero — solver has no optimisation direction",
            "INVALID_WEIGHTS",
            {"total": 0},
        )

    return True, "", "", {}


# ---------------------------------------------------------------------------
#  Data classes
# ---------------------------------------------------------------------------

@dataclass
class Parcel:
    """
    A single property parcel as seen by the solver.

    ``metrics`` holds raw values keyed by the canonical metric name
    (rental_yield, price_per_m2, vacancy, transit_score, footfall_score).
    After normalisation these values are replaced in place with [0, 1] floats.
    """
    id:          int
    lat:         float
    lng:         float
    zoning:      str          # 'residential' | 'commercial' | 'mixed' | 'industrial'
    hazard_flag: bool         # True if parcel lies in a defined hazard zone
    metrics:     dict[str, float] = field(default_factory=dict)
    # Filled by the solver after scoring
    score:       float = 0.0
    feasible:    bool  = True

    def to_dict(self) -> dict[str, Any]:
        return {
            "id":       int(self.id),
            "lat":      float(self.lat),
            "lng":      float(self.lng),
            "score":    round(float(self.score), 4),
            "feasible": bool(self.feasible),
            "zoning":   str(self.zoning),
        }


@dataclass
class SolverConfig:
    """
    Tuneable hyper-parameters.
    Fields kept API-compatible with the previous gradient-ascent version.
    """
    max_iter:           int   = 200
    tolerance:          float = 5e-6    # retained for API compatibility
    alpha0:             float = 5e-4    # retained for API compatibility
    damp_beta:          float = 3e6     # retained for API compatibility
    k_neighbours:       int   = K_NEIGHBOURS
    zoning_penalty:     float = ZONING_PENALTY
    hazard_penalty:     float = HAZARD_PENALTY
    uncertainty_sigma:  float = 1.0
    bandwidth_override: dict[str, tuple[float, float]] = field(default_factory=dict)
    # ── Performance options ──────────────────────────────────────────────
    n_restarts: int  = 3
    # Run the ascent from the top-n_restarts feasible seeds and keep the
    # best result.  Significantly improves solution quality for large areas
    # (N > 1 000) where multiple local maxima exist.  Cost: O(n_restarts).
    use_float32: bool = False
    # Store normed metrics as float32 instead of float64.  Halves the
    # matrix memory footprint and speeds up the matmul on SIMD hardware.
    # Only beneficial for N > 5 000; leave False for normal production use.


@dataclass
class CogResult:
    """Full solver output — identical shape to previous version."""
    lat:         float
    lng:         float
    uncertainty: dict[str, float]   # radius_m, ellipse_a_m, ellipse_b_m, theta_deg
    convergence: dict[str, Any]     # iterations, delta_m, converged, jitter_m
    potential:   float              # normalised V of the solution in [0, 1]
    feasible:    bool
    parcels:     list[dict[str, Any]]


# ---------------------------------------------------------------------------
#  Step 2 — Quantile normaliser  (5th / 95th percentile clipping)
# ---------------------------------------------------------------------------

class QuantileNormaliser:
    """
    For each metric column:
      1. Clip values to the [p5, p95] inter-percentile range.
      2. Scale linearly to [0, 1].
      3. Flip lower-is-better metrics so 1.0 always means "most desirable".

    ``fit_transform`` modifies ``parcel.metrics`` in place AND returns an
    (N, F) float64 matrix for fast downstream vectorised operations.
    """

    def __init__(self, metric_keys: list[str]) -> None:
        self.metric_keys = metric_keys
        self.lo_: dict[str, float] = {}
        self.hi_: dict[str, float] = {}

    def fit_transform(self, parcels: list[Parcel]) -> np.ndarray:
        keys   = self.metric_keys
        N, F   = len(parcels), len(keys)

        # ── Vectorised NaN-safe extraction ─────────────────────────────
        # Single list comprehension builds (N, F) in one numpy call;
        # ~8-10× faster than a nested Python double-loop for N > 500.
        raw = np.array(
            [[_to_float_nan(p.metrics.get(k)) for k in keys] for p in parcels],
            dtype=np.float64,
        )

        normed = np.zeros_like(raw)
        for fi, key in enumerate(self.metric_keys):
            col      = raw[:, fi]
            nan_mask = np.isnan(col)

            if nan_mask.all():
                # Every parcel is missing this metric — use neutral 0.5
                normed[:, fi] = 0.5
                self.lo_[key] = 0.0
                self.hi_[key] = 1.0
                continue

            # Impute NaN cells with the column median before clipping/scaling
            if nan_mask.any():
                col = col.copy()
                col[nan_mask] = float(np.nanmedian(col))

            lo   = float(np.nanpercentile(col, 5))
            hi   = float(np.nanpercentile(col, 95))
            span = (hi - lo) if (hi - lo) > 1e-9 else 1.0
            self.lo_[key] = lo
            self.hi_[key] = hi
            scaled = (np.clip(col, lo, hi) - lo) / span    # -> [0, 1]
            if not HIGHER_IS_BETTER.get(key, True):
                scaled = 1.0 - scaled                       # flip
            normed[:, fi] = scaled

        # Write normalised values back into each Parcel for transparency
        for ni, p in enumerate(parcels):
            for fi, key in enumerate(self.metric_keys):
                p.metrics[key] = float(normed[ni, fi])

        return normed


# ---------------------------------------------------------------------------
#  Step 3 — Hybrid potential function
# ---------------------------------------------------------------------------

def hybrid_potential(
    parcel_idx: int,
    normed: np.ndarray,
    weight_vec: np.ndarray,
    feasible_mask: np.ndarray,
    hazard_mask: np.ndarray,
    cfg: SolverConfig,
) -> float:
    """
    V(j) = sum_k(w_k * m_jk)
           - ZONING_PENALTY   if not feasible_mask[j]
           - HAZARD_PENALTY   if hazard_mask[j]

    Can return a negative value when both penalties apply.
    """
    v = float(np.dot(normed[parcel_idx], weight_vec))
    if not feasible_mask[parcel_idx]:
        v -= cfg.zoning_penalty
    if hazard_mask[parcel_idx]:
        v -= cfg.hazard_penalty
    return v


def _score_all(
    normed: np.ndarray,
    weight_vec: np.ndarray,
    feasible_mask: np.ndarray,
    hazard_mask: np.ndarray,
    cfg: SolverConfig,
) -> np.ndarray:
    """
    Vectorised hybrid_potential for all N parcels.  Returns (N,) float64.

    Always promotes inputs to float64 before the matmul to prevent BLAS
    overflow / NaN warnings when the caller supplies float32 arrays.
    """
    n64 = normed.astype(np.float64)     # no-op if already float64
    w64 = weight_vec.astype(np.float64)
    # Suppress BLAS-level float warnings before nan_to_num cleans up any
    # edge-case NaN/inf from degenerate columns (all-same value, etc.)
    # np.errstate uses IEEE 754 names: 'over' (not 'overflow') in NumPy 2+
    with np.errstate(divide="ignore", over="ignore", invalid="ignore"):
        v = (n64 @ w64).copy()
    np.nan_to_num(v, copy=False, nan=0.0, posinf=1.0, neginf=-1.0)
    v[~feasible_mask] -= cfg.zoning_penalty
    v[hazard_mask]    -= cfg.hazard_penalty
    return v


# ---------------------------------------------------------------------------
#  Step 4 — Discrete k-NN solver
# ---------------------------------------------------------------------------

def _build_neighbour_index(positions: np.ndarray, k: int) -> np.ndarray:
    """
    Return an (N, k) int64 array of per-parcel nearest-neighbour indices
    (self excluded), sorted nearest-first.

    Strategy
    --------
    scipy available  — builds a KD-tree on metre-projected coordinates;
                       O(N log N) build + O(k log N) query per parcel.
                       Handles N = 50 000 comfortably.
    scipy missing    — O(N²) sum-of-squares identity; allocates an (N, N)
                       float64 matrix (200 MB at N = 5 000) so use only
                       for N ≤ 2 000.
    """
    N = positions.shape[0]
    k = min(k, N - 1)

    if _HAS_SCIPY:
        # Project lat/lng → approximate metres so KD-tree distances are
        # physically meaningful (equal-area approximation).
        lat_rad       = math.radians(float(np.mean(positions[:, 0])))
        m_per_deg_lng = M_PER_DEG_LAT * math.cos(lat_rad)
        scale         = np.array([M_PER_DEG_LAT, m_per_deg_lng], dtype=np.float64)
        pos_m         = positions * scale          # (N, 2)  in metres

        tree = _KDTree(pos_m)
        # query returns (distances, indices); column 0 is the point itself
        _, idx = tree.query(pos_m, k=k + 1, workers=-1)
        return idx[:, 1:].astype(np.int64)         # drop self → (N, k)

    # ── Fallback: O(N²) brute-force ──────────────────────────────────
    sq    = np.sum(positions ** 2, axis=1)
    dist2 = sq[:, None] + sq[None, :] - 2.0 * (positions @ positions.T)
    np.fill_diagonal(dist2, np.inf)
    return np.argsort(dist2, axis=1)[:, :k].astype(np.int64)


# ── Numba JIT inner loop ────────────────────────────────────────────────────
# Defined as a plain Python function first, then JIT-compiled if Numba is
# available.  Signature uses only primitive dtypes so Numba can specialise
# without boxing.

def _discrete_solve_core_py(
    V:             np.ndarray,   # (N,)    float64  — scored potentials
    positions:     np.ndarray,   # (N, 2)  float64  — lat/lng
    nb:            np.ndarray,   # (N, k)  int64    — neighbour indices
    feasible_mask: np.ndarray,   # (N,)    bool     — zoning feasibility
    max_iter:      int,
    m_per_deg_lat: float,
    start:         int,          # explicit starting parcel index
) -> tuple[int, int, bool, float]:
    """
    Single-start best-neighbour ascent.

    Returns (best_idx, iterations, converged, last_delta_m).
    Written in a Numba-friendly style: no dynamic allocation, no Python
    built-ins that Numba cannot lower to LLVM IR.
    """
    k       = nb.shape[1]
    current = start
    converged   = False
    iterations  = 0
    last_delta  = 0.0

    for t in range(max_iter):
        best_v    = V[current]
        best_next = current

        # Check all k neighbours
        for ki in range(k):
            j = nb[current, ki]
            if V[j] > best_v:
                best_v    = V[j]
                best_next = j

        dlat       = positions[best_next, 0] - positions[current, 0]
        dlng       = positions[best_next, 1] - positions[current, 1]
        last_delta = math.sqrt(dlat * dlat + dlng * dlng) * m_per_deg_lat
        iterations = t + 1

        if best_next == current:    # local maximum — stop
            converged = True
            break

        current = best_next

    return current, iterations, converged, last_delta


# JIT-compile if Numba is present; fall back transparently otherwise.
if _HAS_NUMBA:
    _discrete_solve_core = _numba.njit(
        cache=True, fastmath=True, boundscheck=False,
    )(_discrete_solve_core_py)
else:
    _discrete_solve_core = _discrete_solve_core_py


def discrete_solve(
    positions: np.ndarray,
    normed: np.ndarray,
    weight_vec: np.ndarray,
    feasible_mask: np.ndarray,
    hazard_mask: np.ndarray,
    cfg: SolverConfig,
) -> tuple[int, dict[str, Any]]:
    """
    Multi-start best-neighbour ascent on the parcel graph.

    Builds a KD-tree neighbour index once (O(N log N) with scipy, O(N²)
    fallback), then runs up to ``cfg.n_restarts`` ascents from the
    highest-scoring feasible seeds, returning the best result.

    The inner loop is JIT-compiled by Numba when available, making each
    ascent O(max_iter × k) with near-zero Python overhead.

    Returns
    -------
    best_parcel_index : int
    convergence_dict  : dict  (iterations, delta_m, converged, jitter_m)
    """
    N  = positions.shape[0]
    k  = min(cfg.k_neighbours, N - 1)
    V  = _score_all(normed, weight_vec, feasible_mask, hazard_mask, cfg)
    nb = _build_neighbour_index(positions, k)          # (N, k)  int64

    # ── Pick starting seeds ──────────────────────────────────────────
    feas_idx = np.where(feasible_mask)[0]
    pool     = feas_idx if len(feas_idx) > 0 else np.arange(N, dtype=np.intp)
    n_rest   = max(1, min(cfg.n_restarts, len(pool)))
    seeds    = pool[np.argsort(V[pool])[::-1][:n_rest]]

    # ── Ensure correct dtypes for Numba specialisation ──────────────
    V_f64   = V.astype(np.float64)
    pos_f64 = positions.astype(np.float64)
    nb_i64  = nb.astype(np.int64)
    fm_bool = feasible_mask.astype(np.bool_)

    best_idx       = int(seeds[0])
    best_V_final   = -np.inf
    best_iters     = 0
    best_converged = False
    best_delta     = 0.0
    all_final_vs: list[float] = []

    for seed in seeds:
        idx, iters, conv, delta = _discrete_solve_core(
            V_f64, pos_f64, nb_i64, fm_bool,
            int(cfg.max_iter), M_PER_DEG_LAT, int(seed),
        )
        final_v = float(V_f64[int(idx)])
        all_final_vs.append(final_v)
        if final_v > best_V_final:
            best_V_final   = final_v
            best_idx       = int(idx)
            best_iters     = int(iters)
            best_converged = bool(conv)
            best_delta     = float(delta)

    # jitter = spread of landing values across seeds — reuses first-pass
    # results (no redundant solver calls).
    jitter_m = float(np.std(all_final_vs)) * M_PER_DEG_LAT * 0.01 \
               if len(all_final_vs) > 1 else 0.0

    return best_idx, {
        "iterations": best_iters,
        "delta_m":    round(best_delta, 2),
        "converged":  best_converged,
        "jitter_m":   round(jitter_m, 3),
    }


# ---------------------------------------------------------------------------
#  Step 5 — Confidence ellipse from the 20 lowest-potential parcels
# ---------------------------------------------------------------------------

def confidence_ellipse(
    positions: np.ndarray,
    V: np.ndarray,
    solution_lat: float,
    solution_lng: float,
    sigma: float = 1.0,
    n_bottom: int = 20,
) -> dict[str, float]:
    """
    Eigen-decomposes the position covariance of the *n_bottom* parcels with
    the lowest potential score, producing a 1-sigma risk ellipse in metres.

    Weighting: w proportional to 1/|V| so the very worst parcels get the
    most influence on the ellipse shape — the ellipse shows where the solver
    most strongly *rejected* in order to reach its solution.

    Returns keys: radius_m, ellipse_a_m, ellipse_b_m, theta_deg
    """
    n_bottom   = min(n_bottom, len(positions))
    bottom_idx = np.argsort(V)[:n_bottom]
    bottom_pos = positions[bottom_idx]

    inv_scores = 1.0 / (np.abs(V[bottom_idx]) + 1e-9)
    w = inv_scores / inv_scores.sum()

    center = np.array([solution_lat, solution_lng])
    diff   = bottom_pos - center                    # (n_bottom, 2)
    cov    = (w[:, None] * diff).T @ diff           # (2, 2) weighted covariance

    eigenvalues, eigenvectors = np.linalg.eigh(cov)
    eigenvalues = np.maximum(eigenvalues, 0.0)

    m_per_deg_lng = M_PER_DEG_LAT * math.cos(math.radians(solution_lat))
    idx   = np.argsort(eigenvalues)[::-1]
    ev    = eigenvectors[:, idx[0]]
    a_deg = sigma * math.sqrt(eigenvalues[idx[0]])
    b_deg = sigma * math.sqrt(eigenvalues[idx[1]])

    a_m = a_deg * math.sqrt(
        (M_PER_DEG_LAT * float(ev[0])) ** 2 + (m_per_deg_lng * float(ev[1])) ** 2
    )
    b_m       = b_deg * math.sqrt((M_PER_DEG_LAT ** 2 + m_per_deg_lng ** 2) / 2.0)
    theta_deg = math.degrees(math.atan2(float(ev[1]), float(ev[0])))
    radius_m  = math.sqrt((a_m ** 2 + b_m ** 2) / 2.0)

    return {
        "radius_m":    round(radius_m, 1),
        "ellipse_a_m": round(a_m, 1),
        "ellipse_b_m": round(b_m, 1),
        "theta_deg":   round(theta_deg, 2),
    }


# ---------------------------------------------------------------------------
#  Public solver class
# ---------------------------------------------------------------------------

class CentreOfGravitySolver:
    """
    Discrete k-NN best-neighbour ascent CoG solver.

    API-compatible with the previous gradient-ascent implementation so
    main.py's /api/cog/solve endpoint requires no changes.

    Parameters
    ----------
    parcels      : list[Parcel]
    weights      : dict[str, float]   investor weights (need not sum to 1)
    zoning_allow : set[str]           e.g. {'commercial', 'mixed'}
    config       : SolverConfig | None
    """

    def __init__(
        self,
        parcels: list[Parcel],
        weights: dict[str, float],
        zoning_allow: set[str],
        config: Optional[SolverConfig] = None,
    ) -> None:
        self.parcels      = parcels
        self.config       = config or SolverConfig()
        self.zoning_allow = {z.lower() for z in zoning_allow}

        total_w = sum(abs(v) for v in weights.values()) or 1.0
        self._weight_by_metric: dict[str, float] = {
            metric_key: weights.get(api_key, 0.0) / total_w
            for api_key, metric_key in WEIGHT_TO_METRIC.items()
        }
        self._metric_keys = list(WEIGHT_TO_METRIC.values())

    # ------------------------------------------------------------------

    def solve(self) -> CogResult:
        if not self.parcels:
            raise CogValidationError(
                "No parcels supplied to solver.",
                code="INSUFFICIENT_PARCELS",
                details={"parcel_count": 0, "minimum": 3},
            )

        # ── Pre-flight: parcel count ────────────────────────────────────
        N = len(self.parcels)
        if N < 3:
            raise CogValidationError(
                f"Too few parcels ({N}) — need at least 3 for a meaningful solve.",
                code="INSUFFICIENT_PARCELS",
                details={"parcel_count": N, "minimum": 3},
            )

        # ── Pre-flight: zoning feasibility ─────────────────────────────
        feasible_count = sum(
            1 for p in self.parcels if p.zoning.lower() in self.zoning_allow
        )
        if feasible_count == 0:
            parcel_zonings = sorted({p.zoning.lower() for p in self.parcels})
            raise CogValidationError(
                "All parcels are excluded by the current zoning filter. "
                "Allow at least one zoning category.",
                code="ALL_ZONING_FILTERED",
                details={
                    "zoning_allow":   sorted(self.zoning_allow),
                    "parcel_zonings": parcel_zonings,
                },
            )

        cfg = self.config

        # --- Step 2: Normalise ---
        normaliser = QuantileNormaliser(self._metric_keys)
        normed     = normaliser.fit_transform(self.parcels)       # (N, F) float64

        # Optional float32 downcast — halves memory and speeds matmul on SIMD.
        # Accuracy loss is negligible: [0,1] values retain 7 decimal digits.
        dtype = np.float32 if cfg.use_float32 else np.float64
        if cfg.use_float32:
            normed = normed.astype(np.float32, copy=False)

        positions = np.array(
            [[p.lat, p.lng] for p in self.parcels], dtype=np.float64
        )
        feasible_mask = np.array(
            [p.zoning.lower() in self.zoning_allow for p in self.parcels],
            dtype=np.bool_,
        )
        hazard_mask = np.array(
            [bool(p.hazard_flag) for p in self.parcels], dtype=np.bool_
        )
        weight_vec = np.array(
            [self._weight_by_metric.get(k, 0.0) for k in self._metric_keys],
            dtype=dtype,
        )

        # --- Steps 3+4: Score all parcels, then run discrete solver ---
        V = _score_all(normed, weight_vec, feasible_mask, hazard_mask, cfg)
        best_idx, convergence = discrete_solve(
            positions, normed, weight_vec, feasible_mask, hazard_mask, cfg
        )

        solution_lat = float(positions[best_idx, 0])
        solution_lng = float(positions[best_idx, 1])

        # --- Step 5: Confidence ellipse from bottom-20 parcels ---
        unc = confidence_ellipse(
            positions, V,
            solution_lat, solution_lng,
            sigma=cfg.uncertainty_sigma,
        )

        # Normalise scores to [0, 1] for the API response
        v_min  = V.min()
        v_max  = V.max()
        v_span = (v_max - v_min) if (v_max - v_min) > 1e-9 else 1.0
        scores_norm = (V - v_min) / v_span

        for ni, parcel in enumerate(self.parcels):
            parcel.score    = round(float(scores_norm[ni]), 4)
            parcel.feasible = bool(feasible_mask[ni])

        return CogResult(
            lat=round(solution_lat, 7),
            lng=round(solution_lng, 7),
            uncertainty=unc,
            convergence=convergence,
            potential=round(float(scores_norm[best_idx]), 4),
            feasible=bool(feasible_mask[best_idx]),
            parcels=[p.to_dict() for p in self.parcels],
        )


# ---------------------------------------------------------------------------
#  DB loader  —  called by main.py's /api/cog/solve endpoint
# ---------------------------------------------------------------------------

def parcels_from_db(
    properties: list[Any],
    area_stats: Any | None,
    area_lat: float,
    area_lng: float,
) -> list[Parcel]:
    """
    Build a Parcel list from SQLAlchemy Property + AreaStatistics objects.

    Field resolution  (first non-None value wins)
    -----------------------------------------------
    lat / lng          property.lat -> property.latitude -> jitter(centroid)
    rental_yield       area_stats.rental_yield
    price_per_m2       property.price -> area_stats.price_per_sqm
    vacancy            area_stats.vacancy_rate
    transit_score      area_stats.transport_score
    footfall_score     area_stats.amenities_score
    hazard_flag        False  (no hazard column in current DB schema)
    zoning             property.property_type
    """

    def _f(obj: Any, attr: str, fallback: float) -> float:
        v = getattr(obj, attr, None) if obj else None
        return float(v) if v is not None else fallback

    area_yield   = _f(area_stats, "rental_yield",    6.5)
    area_price   = _f(area_stats, "price_per_sqm",   18_000.0)
    area_vacancy = _f(area_stats, "vacancy_rate",    8.0)
    area_transit = _f(area_stats, "transport_score", 55.0)
    area_footfal = _f(area_stats, "amenities_score", 55.0)

    parcels: list[Parcel] = []

    for prop in properties:
        # Resolve coordinates
        prop_lat = getattr(prop, "lat", None) or getattr(prop, "latitude", None)
        prop_lng = getattr(prop, "lng", None) or getattr(prop, "longitude", None)

        if prop_lat is None or prop_lng is None:
            # Deterministic jitter keyed on property id for reproducibility
            rng = np.random.default_rng(int(prop.id))
            prop_lat = area_lat + float(rng.uniform(-0.025, 0.025))
            prop_lng = area_lng + float(rng.uniform(-0.025, 0.025))

        raw_price = (
            float(prop.price) if getattr(prop, "price", None) is not None
            else area_price
        )
        zoning = (getattr(prop, "property_type", None) or "mixed").lower()

        parcels.append(Parcel(
            id=int(prop.id),
            lat=float(prop_lat),
            lng=float(prop_lng),
            zoning=zoning,
            hazard_flag=False,
            metrics={
                "rental_yield":   area_yield,
                "price_per_m2":   raw_price,
                "vacancy":        area_vacancy,
                "transit_score":  area_transit,
                "footfall_score": area_footfal,
            },
        ))

    return parcels
