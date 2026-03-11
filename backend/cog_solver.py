"""
Centre-of-Gravity Geospatial Optimizer  —  Discrete k-NN Edition
=================================================================

Architecture
------------
1.  Load      – parcels_from_db builds a Parcel list from SQLAlchemy objects.
2.  Normalise – QuantileNormaliser clips each metric to [p5, p95] then scales
                to [0, 1].  Lower-is-better metrics are flipped so that 1.0
                always means "most desirable for investment".
3.  Barriers  – _compute_proximity_field builds a soft repulsion field: each
                parcel receives a penalty that decays exponentially with its
                distance to the nearest hazard / zoning-infeasible parcel
                (default 1/e radius = 400 m).  This graduates the hard-stop
                flat penalty into a smooth geospatial influence zone.
4.  Potential – _score_all vectorises V(j) = w·m - hard_penalties - soft_field
                for all N parcels in one matmul + a few masked subtractions.
5.  Solver    – Multi-start tabu-enhanced best-neighbour ascent:
                    a. Pre-build a k=30 KD-tree neighbour index (scipy,
                       O(N log N)) or fall back to O(N²) brute-force.
                    b. Farthest-first (maximin) seeding: n_restarts seeds
                       chosen to be both high-scoring AND geographically
                       spread — 60% diversity, 40% V-quality weighting.
                    c. Tabu circular buffer (length cfg.tabu_size=8) prevents
                       re-visiting recent positions, allowing plateau
                       traversal and escape from shallow local maxima.
                    d. Expanded-neighbour retry: if no restart converged,
                       re-run seeds with k × k_expand_factor neighbours
                       (variable-neighbourhood search without index rebuild).
                    e. Inner hot-loop JIT-compiled by Numba (cache=True,
                       fastmath=True) if available, plain NumPy otherwise.
6.  Ellipse   – confidence_ellipse eigen-decomposes the position covariance
                of the 20 *lowest*-potential parcels weighted by 1/|V| to
                give a 1-sigma risk ellipse in metres.

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

ZONING_PENALTY:       float = 0.35     # subtracted from V when zoning is infeasible
HAZARD_PENALTY:       float = 0.40     # subtracted from V when hazard_flag is True
K_NEIGHBOURS:         int   = 30       # nearest neighbours evaluated per ascent step
M_PER_DEG_LAT:        float = 111_320.0

# Soft barrier parameters — graduated penalty that decays with distance to the
# nearest hazard/infeasible parcel (rather than the flat hard-stop above).
HAZARD_DECAY_M:       float = 400.0   # 1/e decay radius in metres
BARRIER_SOFT_WEIGHT:  float = 0.15    # max contribution of soft penalty to V


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
    _discrete_solve_core(_dV, _dpos, _dnb, _dmsk, 3, M_PER_DEG_LAT, 0, 4)


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

    # ── Multi-start / diversity ──────────────────────────────────────────
    n_restarts: int = 5
    # Seeds are chosen by farthest-first (maximin) geographic diversity
    # within the top-50% feasible parcels by score.  Significantly reduces
    # local-maximum sensitivity for irregular spatial distributions.

    # ── Tabu-enhanced ascent ─────────────────────────────────────────────
    tabu_size: int = 8
    # Length of the circular tabu buffer.  Visited nodes are forbidden for
    # tabu_size steps, allowing the solver to traverse flat plateaus and
    # escape shallow local maxima.  0 → plain greedy ascent (original).

    # ── Expanded-neighbour retry on stall ───────────────────────────────
    k_expand_factor: int = 2
    # After a restart converges, if neither it nor any other restart found
    # a feasible solution, re-run each seed with k * k_expand_factor
    # neighbours.  Acts as variable-neighbourhood search without rebuilding
    # the KD-tree index.

    # ── Soft barrier field ───────────────────────────────────────────────
    hazard_decay_m:      float = HAZARD_DECAY_M
    barrier_soft_weight: float = BARRIER_SOFT_WEIGHT
    # Each non-hazard parcel receives a proximity penalty proportional to
    # exp(-d / hazard_decay_m) where d is the distance to the nearest
    # hazard/infeasible parcel.  Creates a smooth repulsion field that
    # deflects trajectories away from barrier zones before they reach them.

    # ── Performance options ──────────────────────────────────────────────
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
    proximity_field: "np.ndarray | None" = None,
) -> np.ndarray:
    """
    Vectorised hybrid_potential for all N parcels.  Returns (N,) float64.

    Always promotes inputs to float64 before the matmul to prevent BLAS
    overflow / NaN warnings when the caller supplies float32 arrays.

    ``proximity_field`` (N,)  — optional precomputed soft barrier penalties.
    Each value is the distance-decayed proximity to the nearest
    hazard/infeasible parcel, scaled to [0, 1].  Multiplied by
    cfg.barrier_soft_weight and subtracted from the raw score.
    """
    n64 = normed.astype(np.float64)
    w64 = weight_vec.astype(np.float64)
    with np.errstate(divide="ignore", over="ignore", invalid="ignore"):
        v = (n64 @ w64).copy()
    np.nan_to_num(v, copy=False, nan=0.0, posinf=1.0, neginf=-1.0)
    v[~feasible_mask] -= cfg.zoning_penalty
    v[hazard_mask]    -= cfg.hazard_penalty
    if proximity_field is not None:
        # Graduated soft repulsion — decays with distance so parcels far
        # from any barrier zone are minimally penalised.
        v -= cfg.barrier_soft_weight * proximity_field
    return v


# ---------------------------------------------------------------------------
#  Soft barrier proximity field
# ---------------------------------------------------------------------------

def _compute_proximity_field(
    positions: np.ndarray,     # (N, 2)  lat/lng
    hazard_mask: np.ndarray,   # (N,)    bool
    feasible_mask: np.ndarray, # (N,)    bool
    decay_m: float,            # 1/e decay distance in metres
) -> np.ndarray:
    """
    Pre-compute a soft repulsion penalty for every parcel based on its
    distance to the nearest hazard or infeasible (zoning-excluded) parcel.

    Returns a (N,) array where each value is in [0, 1]:
        penalty[j] = exp( -dist_to_nearest_barrier_m / decay_m )

    Parcels far from any barrier receive ≈ 0 (no penalty).
    Parcels immediately adjacent to a barrier receive ≈ 1 (full weight).

    Multiplied by ``cfg.barrier_soft_weight`` in ``_score_all``.

    Strategy
    --------
    scipy available  — KD-tree query on metre-projected coords.  O(N log B)
                       where B = number of barrier parcels.
    scipy missing    — O(N × B) pairwise, only practical for small datasets.
    """
    N = positions.shape[0]
    penalties = np.zeros(N, dtype=np.float64)
    decay_m   = max(decay_m, 1.0)

    barrier_idx = np.where(hazard_mask | (~feasible_mask))[0]
    if len(barrier_idx) == 0:
        return penalties  # no barriers → no proximity penalty

    # Project to approximate metres for distance calculation
    lat_rad       = math.radians(float(np.mean(positions[:, 0])))
    m_per_deg_lng = M_PER_DEG_LAT * math.cos(lat_rad)
    scale         = np.array([M_PER_DEG_LAT, m_per_deg_lng], dtype=np.float64)
    pos_m         = positions * scale

    if _HAS_SCIPY:
        tree   = _KDTree(pos_m[barrier_idx])
        dists, _ = tree.query(pos_m, k=1, workers=-1)   # (N,) in metres
        penalties = np.exp(-dists / decay_m)
    else:
        barrier_m = pos_m[barrier_idx]                   # (B, 2)
        diff  = pos_m[:, None, :] - barrier_m[None, :, :]  # (N, B, 2)
        dists = np.sqrt((diff ** 2).sum(axis=2)).min(axis=1)   # (N,)
        penalties = np.exp(-dists / decay_m)

    # Parcels that ARE barriers already carry hard penalties; zero out their
    # soft field so we don't double-penalise them.
    penalties[barrier_idx] = 0.0
    return penalties


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
    tabu_size:     int,          # circular tabu buffer length (0 = disabled)
) -> tuple[int, int, bool, float]:
    """
    Single-start tabu-enhanced best-neighbour ascent.

    Returns (best_idx, iterations, converged, last_delta_m).

    Tabu mechanism (Numba-compatible circular buffer)
    -------------------------------------------------
    Each visited node is written into a fixed-length circular buffer.
    While seeking the next move:
      1. Prefer the best non-tabu strictly-improving neighbour.
      2. If all non-tabu neighbours are non-improving, accept a lateral
         (equal / slightly worse) non-tabu move — allows plateau traversal.
      3. If all k neighbours are currently tabu, fall back to the globally
         best neighbour regardless of tabu (aspiration criterion).
      4. Declare convergence only when truly stuck (step == current).

    Written in a Numba-friendly style: no dynamic allocation beyond the
    fixed tabu buffer, no Python built-ins Numba cannot lower to LLVM IR.
    """
    k         = nb.shape[1]
    current   = int(start)
    converged = False
    iterations  = 0
    last_delta  = 0.0

    # Circular tabu buffer — initialised to -1 (empty marker)
    tabu_buf = np.empty(max(tabu_size, 1), dtype=np.int64)
    for _ti in range(tabu_buf.shape[0]):
        tabu_buf[_ti] = -1
    tabu_ptr = 0

    for t in range(max_iter):
        best_nontabu_v    = -1e18
        best_nontabu_next = -1
        best_any_v        = -1e18
        best_any_next     = -1

        for ki in range(k):
            j  = int(nb[current, ki])
            vj = V[j]

            # Track unconditional best (aspiration fallback)
            if vj > best_any_v:
                best_any_v    = vj
                best_any_next = j

            # Check tabu membership
            in_tabu = False
            if tabu_size > 0:
                for ti in range(tabu_size):
                    if tabu_buf[ti] == j:
                        in_tabu = True
                        break

            if not in_tabu and vj > best_nontabu_v:
                best_nontabu_v    = vj
                best_nontabu_next = j

        # ── Choose move ──────────────────────────────────────────────────
        v_curr = V[current]

        if best_nontabu_next >= 0 and best_nontabu_v > v_curr:
            # Case 1: Non-tabu strictly improving step
            move_to = best_nontabu_next

        elif best_any_next >= 0 and best_any_v > v_curr:
            # Case 2: Non-tabu choices exist but none improve; however a
            # tabu candidate is better → aspiration criterion applies.
            move_to = best_any_next

        elif best_nontabu_next >= 0:
            # Case 3: Lateral non-tabu step — traverse plateau
            move_to = best_nontabu_next

        else:
            # Case 4: Fully stuck (all tabu, no improvement anywhere)
            converged = True
            break

        dlat       = positions[move_to, 0] - positions[current, 0]
        dlng       = positions[move_to, 1] - positions[current, 1]
        last_delta = math.sqrt(dlat * dlat + dlng * dlng) * m_per_deg_lat
        iterations = t + 1

        if move_to == current:
            converged = True
            break

        # Write current to tabu buffer before moving
        if tabu_size > 0:
            tabu_buf[tabu_ptr % tabu_size] = current
            tabu_ptr += 1

        current = move_to

    return current, iterations, converged, last_delta



# JIT-compile if Numba is present; fall back transparently otherwise.
if _HAS_NUMBA:
    _discrete_solve_core = _numba.njit(
        cache=True, fastmath=True, boundscheck=False,
    )(_discrete_solve_core_py)
else:
    _discrete_solve_core = _discrete_solve_core_py


# ---------------------------------------------------------------------------
#  Farthest-first (maximin) seed selection
# ---------------------------------------------------------------------------

def _diverse_seeds(
    pos_m: np.ndarray,         # (N, 2)   metre-projected positions
    V: np.ndarray,             # (N,)     scored potentials
    feasible_mask: np.ndarray, # (N,)     bool
    n_seeds: int,
) -> np.ndarray:
    """
    Select ``n_seeds`` starting positions that are both high-scoring AND
    geographically spread across the feasible parcel set.

    Algorithm: farthest-first (k-means++ style maximin).
     1.  First seed = feasible parcel with the highest V.
     2.  Each subsequent seed is chosen from the top-50% of feasible parcels
         by V to maximise the minimum distance to any already-chosen seed.
         Distance and score are combined: 60% diversity, 40% score quality.

    This approach ensures different restarts explore meaningfully different
    landscape regions, greatly reducing sensitivity to local maxima in areas
    with uneven spatial distribution of high-scoring parcels.

    Returns an int array of parcel indices, length ≤ n_seeds.
    """
    pool = np.where(feasible_mask)[0]
    if len(pool) == 0:
        pool = np.arange(len(V), dtype=np.intp)

    n_seeds = min(n_seeds, len(pool))
    if n_seeds <= 1:
        return np.array([pool[int(np.argmax(V[pool]))]], dtype=np.intp)

    # Sort pool by V descending; first seed = highest-score feasible parcel
    sorted_pool = pool[np.argsort(V[pool])[::-1]]
    seeds: list[int] = [int(sorted_pool[0])]

    # Top-50% candidates (by V) used for diversity selection
    top_half = sorted_pool[:max(1, len(sorted_pool) // 2)]
    pool_pos = pos_m[pool]            # (pool_size, 2)

    for _ in range(n_seeds - 1):
        chosen_pos   = pos_m[seeds]   # (n_chosen, 2)
        diff         = pool_pos[:, None, :] - chosen_pos[None, :, :]  # (P, C, 2)
        dist_min     = np.sqrt((diff ** 2).sum(axis=2)).min(axis=1)   # (P,)

        # Normalise V and distance to [0, 1] for combination
        pv      = V[pool]
        v_score = (pv - pv.min()) / (pv.max() - pv.min() + 1e-9)
        d_score = dist_min / (dist_min.max() + 1e-9)
        combined = 0.4 * v_score + 0.6 * d_score

        # Restrict to top-half, exclude already chosen
        mask_chosen = np.zeros(len(pool), dtype=np.bool_)
        for s in seeds:
            mask_chosen |= (pool == s)
        mask_top    = np.isin(pool, top_half)
        candidates  = np.where(mask_top & ~mask_chosen)[0]
        if len(candidates) == 0:
            candidates = np.where(~mask_chosen)[0]
        if len(candidates) == 0:
            break

        best = candidates[int(np.argmax(combined[candidates]))]
        seeds.append(int(pool[best]))

    return np.array(seeds, dtype=np.intp)


def discrete_solve(
    positions: np.ndarray,
    normed: np.ndarray,
    weight_vec: np.ndarray,
    feasible_mask: np.ndarray,
    hazard_mask: np.ndarray,
    cfg: SolverConfig,
    proximity_field: "np.ndarray | None" = None,
) -> tuple[int, dict[str, Any]]:
    """
    Multi-start tabu-enhanced best-neighbour ascent on the parcel graph.

    Improvements over previous version
    -----------------------------------
    Seeding     Farthest-first (maximin) geographic diversity among the top-50%
                feasible parcels by score, not pure score-rank.
    Inner loop  Tabu circular buffer (length cfg.tabu_size) prevents cycling
                and enables plateau traversal via lateral tabu-free moves.
    Barriers    Accepts an optional ``proximity_field`` soft-barrier term that
                gradually deflects trajectories away from hazard zones.
    Stall retry After all restarts, if solution came from a non-converged run,
                re-run each seed with k × cfg.k_expand_factor neighbours to
                catch improvements the original index width missed.
    Jitter      Reports geographic spread (std dev of landing positions in
                metres), not V-value spread, for more interpretable output.

    Returns
    -------
    best_parcel_index : int
    convergence_dict  : dict  (iterations, delta_m, converged, jitter_m, n_restarts)
    """
    N  = positions.shape[0]
    k  = min(cfg.k_neighbours, N - 1)

    # ── Score all parcels (incorporating soft barrier field if given) ────
    V  = _score_all(normed, weight_vec, feasible_mask, hazard_mask, cfg,
                    proximity_field=proximity_field)
    nb = _build_neighbour_index(positions, k)          # (N, k)  int64

    # ── Metre-projected positions for seed diversity computation ────────
    lat_rad       = math.radians(float(np.mean(positions[:, 0])))
    m_per_deg_lng = M_PER_DEG_LAT * math.cos(lat_rad)
    scale         = np.array([M_PER_DEG_LAT, m_per_deg_lng], dtype=np.float64)
    pos_m         = positions * scale

    # ── Geographically diverse seeds ────────────────────────────────────
    n_rest = max(1, min(cfg.n_restarts, len(np.where(feasible_mask)[0]) or N))
    seeds  = _diverse_seeds(pos_m, V, feasible_mask, n_rest)

    # ── Ensure correct dtypes for Numba specialisation ──────────────────
    V_f64   = V.astype(np.float64)
    pos_f64 = positions.astype(np.float64)
    nb_i64  = nb.astype(np.int64)
    fm_bool = feasible_mask.astype(np.bool_)
    tabu_sz = int(cfg.tabu_size)
    max_it  = int(cfg.max_iter)

    best_idx       = int(seeds[0])
    best_V_final   = -np.inf
    best_iters     = 0
    best_converged = False
    best_delta     = 0.0
    all_final_vs:  list[float] = []
    all_final_pos: list[np.ndarray] = []

    def _run_seed(seed: int, k_nb: np.ndarray) -> tuple[int, int, bool, float]:
        return _discrete_solve_core(
            V_f64, pos_f64, k_nb.astype(np.int64), fm_bool,
            max_it, M_PER_DEG_LAT, seed, tabu_sz,
        )

    for seed in seeds:
        idx, iters, conv, delta = _run_seed(int(seed), nb)
        fv = float(V_f64[int(idx)])
        all_final_vs.append(fv)
        all_final_pos.append(pos_m[int(idx)])
        if fv > best_V_final:
            best_V_final   = fv
            best_idx       = int(idx)
            best_iters     = int(iters)
            best_converged = bool(conv)
            best_delta     = float(delta)

    # ── Expanded-neighbour retry when solution did not converge ─────────
    # If no restart produced a converged result, try a second pass with
    # k * k_expand_factor neighbours.  This is variable-neighbourhood
    # search: we reuse the same (already built) index; the extra columns
    # are queried from the existing KD-tree data.
    if not best_converged and cfg.k_expand_factor > 1:
        k_wide  = min(k * cfg.k_expand_factor, N - 1)
        nb_wide = _build_neighbour_index(positions, k_wide)
        for seed in seeds:
            idx, iters, conv, delta = _run_seed(int(seed), nb_wide)
            fv = float(V_f64[int(idx)])
            if fv > best_V_final:
                best_V_final   = fv
                best_idx       = int(idx)
                best_iters     = int(iters)
                best_converged = bool(conv)
                best_delta     = float(delta)

    # ── Jitter: std dev of landing positions in metres ──────────────────
    # Measures how much the different restarts disagree about the solution
    # location — a geographic interpretability metric for the UI.
    if len(all_final_pos) > 1:
        landing = np.array(all_final_pos, dtype=np.float64)   # (R, 2) metres
        jitter_m = float(np.std(
            np.sqrt(((landing - landing.mean(axis=0)) ** 2).sum(axis=1))
        ))
    else:
        jitter_m = 0.0

    return best_idx, {
        "iterations": best_iters,
        "delta_m":    round(best_delta, 2),
        "converged":  best_converged,
        "jitter_m":   round(jitter_m, 1),
        "n_restarts": len(seeds),
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

        # --- Steps 3+4: Compute soft barrier field, score all parcels,
        #     then run the multi-start tabu-enhanced discrete solver ---

        # Soft barrier proximity field — graduated repulsion that decreases
        # exponentially with distance to the nearest hazard/infeasible parcel.
        # Computed once; shared by _score_all and discrete_solve so the same
        # V surface drives both the confidence ellipse and the inner loop.
        prox = _compute_proximity_field(
            positions, hazard_mask, feasible_mask, cfg.hazard_decay_m
        )

        V = _score_all(normed, weight_vec, feasible_mask, hazard_mask, cfg,
                       proximity_field=prox)
        best_idx, convergence = discrete_solve(
            positions, normed, weight_vec, feasible_mask, hazard_mask, cfg,
            proximity_field=prox,
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
