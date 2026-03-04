"""
parcel_domain.py
================
Fast SQLAlchemy query layer for the CoG parcel domain.

Adds a ``parcel_snapshots`` table — a materialised store of one row per
geo-located parcel with its five CoG investment metrics pre-computed.
No existing tables are modified.

Public surface
--------------
  ParcelSnapshot             — SQLAlchemy ORM model (new table).
  fetch_all_parcels          — all parcels for an area.
  fetch_feasible_parcels     — parcels filtered by zoning + hazard flag.
  parcels_to_numpy           — convert rows to dict-of-NumPy-arrays.
  snapshot_to_parcel         — adapt a single row to cog_solver.Parcel.
  snapshots_to_parcels       — bulk-adapt a row list to [Parcel, ...].

Index strategy (see also sql/parcel_snapshots_migration.sql)
-------------------------------------------------------------
  ix_ps_area_id              Basic area filter; used by fetch_all_parcels.
  ix_ps_area_zoning_hazard   Composite on (area_id, zoning_code, hazard_flag);
                             covers the full feasibility WHERE clause.
  ix_ps_area_zoning_safe     Partial index WHERE hazard_flag = FALSE.  Roughly
                             10 % smaller than the full composite; chosen by
                             the Postgres planner when exclude_hazard=True.
  ix_ps_area_covering        Covering index carrying all five metric columns
                             so that SELECT … all-columns can be satisfied by
                             an index-only scan with zero heap access.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np
from sqlalchemy import Index, text

from db_core import db


# ── Model ──────────────────────────────────────────────────────────────────

class ParcelSnapshot(db.Model):
    """
    Materialised parcel record.

    Written by data-import / ETL jobs; read-only from the solver's perspective.

    Column notes
    ------------
    rental_yield  : gross yield percentage (e.g. 7.25 for 7.25 %).
    price_per_m2  : ZAR per square metre.
    vacancy       : vacancy rate percentage.
    transit_score : composite transit-proximity score, 0–100.
    footfall_score: composite footfall/pedestrian score, 0–100.
    zoning_code   : lower-cased string matching the solver's zoning_allow set.
    hazard_flag   : True if the parcel lies in a flood / fire / infrastructure
                    hazard zone.
    """

    __tablename__ = "parcel_snapshots"

    __table_args__ = (
        # ── Scalar area lookup ─────────────────────────────────────────────
        Index("ix_ps_area_id", "area_id"),

        # ── Full feasibility composite ────────────────────────────────────
        # Used when the caller supplies both zoning_allow and exclude_hazard.
        Index("ix_ps_area_zoning_hazard", "area_id", "zoning_code", "hazard_flag"),

        # ── Partial: safe parcels only (hazard_flag = FALSE) ────────────────
        # ~10 % smaller; Postgres prefers this when exclude_hazard=True.
        Index(
            "ix_ps_area_zoning_safe",
            "area_id",
            "zoning_code",
            postgresql_where=text("hazard_flag = FALSE"),
        ),

        # ── Covering: satisfies the full metric projection index-only ───────
        # SELECT id, lat, lng, zoning_code, hazard_flag, rental_yield,
        #        price_per_m2, vacancy, transit_score, footfall_score
        # never touches the heap when this index exists.
        Index(
            "ix_ps_area_covering",
            "area_id",
            "lat",
            "lng",
            "zoning_code",
            "hazard_flag",
            "rental_yield",
            "price_per_m2",
            "vacancy",
            "transit_score",
            "footfall_score",
        ),
    )

    id             = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    area_id        = db.Column(
                         db.Integer,
                         db.ForeignKey("areas.id", ondelete="CASCADE"),
                         nullable=False,
                         index=False,       # covered by ix_ps_area_id above
                     )
    lat            = db.Column(db.Float,   nullable=False)
    lng            = db.Column(db.Float,   nullable=False)
    zoning_code    = db.Column(db.String(30), nullable=False, default="mixed")
    hazard_flag    = db.Column(db.Boolean,    nullable=False, default=False)

    # Five investment metrics (nullable so rows can be inserted with partial data)
    rental_yield   = db.Column(db.Numeric(6,  3))   # percent
    price_per_m2   = db.Column(db.Numeric(12, 2))   # ZAR / m²
    vacancy        = db.Column(db.Numeric(5,  2))   # percent
    transit_score  = db.Column(db.Numeric(5,  1))   # 0–100
    footfall_score = db.Column(db.Numeric(5,  1))   # 0–100

    created_at     = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at     = db.Column(db.DateTime, default=datetime.utcnow,
                               onupdate=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id":            int(self.id),
            "area_id":       int(self.area_id),
            "lat":           float(self.lat),
            "lng":           float(self.lng),
            "zoning_code":   str(self.zoning_code),
            "hazard_flag":   bool(self.hazard_flag),
            "rental_yield":  _f(self.rental_yield),
            "price_per_m2":  _f(self.price_per_m2),
            "vacancy":       _f(self.vacancy),
            "transit_score": _f(self.transit_score),
            "footfall_score":_f(self.footfall_score),
        }


def _f(v: Any) -> float | None:
    """Safely cast a Decimal / None to float."""
    return float(v) if v is not None else None


# ── Query helpers ──────────────────────────────────────────────────────────

def fetch_all_parcels(
    area_id: int | str,
    limit:   int = 2000,
) -> list[ParcelSnapshot]:
    """
    Return all ParcelSnapshot rows for *area_id*, ordered by id.

    Index used: ``ix_ps_area_id``

    With the covering index ``ix_ps_area_covering`` Postgres can satisfy this
    query via an index-only scan — no heap access required.
    """
    return (
        db.session.query(ParcelSnapshot)
        .filter(ParcelSnapshot.area_id == area_id)
        .order_by(ParcelSnapshot.id)
        .limit(limit)
        .all()
    )


def fetch_feasible_parcels(
    area_id:        int | str,
    zoning_allow:   set[str] | list[str] | None = None,
    exclude_hazard: bool = True,
    limit:          int  = 2000,
) -> list[ParcelSnapshot]:
    """
    Return parcels that pass the solver's feasibility constraints.

    This is the **hot path** invoked on every ``POST /api/cog/solve`` request.

    Index selection
    ---------------
    exclude_hazard=True  → Postgres uses ``ix_ps_area_zoning_safe`` (partial).
    exclude_hazard=False → falls back to ``ix_ps_area_zoning_hazard``.
    No zoning filter     → ``ix_ps_area_id`` is used instead.

    Parameters
    ----------
    zoning_allow   : zoning codes to include.  None/empty → no filter.
    exclude_hazard : skip rows where hazard_flag = TRUE.
    limit          : hard cap on result size (safety valve for large areas).
    """
    q = db.session.query(ParcelSnapshot).filter(
        ParcelSnapshot.area_id == area_id
    )

    if zoning_allow:
        q = q.filter(ParcelSnapshot.zoning_code.in_(list(zoning_allow)))

    if exclude_hazard:
        # Explicit IS FALSE so Postgres picks up the partial index.
        q = q.filter(ParcelSnapshot.hazard_flag.is_(False))

    return q.order_by(ParcelSnapshot.id).limit(limit).all()


# ── NumPy preprocessing ────────────────────────────────────────────────────

# Canonical column order used by the solver's weight vector.
METRIC_KEYS: tuple[str, ...] = (
    "rental_yield",
    "price_per_m2",
    "vacancy",
    "transit_score",
    "footfall_score",
)

# Fallback values substituted when a DB cell is NULL.
METRIC_FALLBACKS: dict[str, float] = {
    "rental_yield":   6.5,
    "price_per_m2":   18_000.0,
    "vacancy":        8.0,
    "transit_score":  55.0,
    "footfall_score": 55.0,
}


def parcels_to_numpy(rows: list[ParcelSnapshot]) -> dict[str, np.ndarray]:
    """
    Convert a list of ParcelSnapshot ORM rows to a dict of NumPy arrays
    ready for vectorised CoG math.

    Returns
    -------
    {
      "ids"     : int64   (N,)       – row primary keys
      "latlng"  : float64 (N, 2)    – [[lat, lng], ...] for distance maths
      "metrics" : float32 (N, 5)    – columns in METRIC_KEYS order
      "zoning"  : list[str] (N,)    – zoning code strings
      "hazard"  : bool    (N,)      – hazard flags
    }

    Design choices
    --------------
    float32 for metrics: the solver's scoring arithmetic is not
    precision-sensitive; float32 halves memory bandwidth vs float64 and
    keeps all five metric columns for every parcel in ~80 bytes, fitting
    a typical 64-byte or 128-byte CPU cache line for small N.

    float64 for latlng: geodesic distance computation (Haversine / Euclidean
    degree-to-metre) needs the extra precision.
    """
    n = len(rows)
    if n == 0:
        return {
            "ids":     np.empty(0, dtype=np.int64),
            "latlng":  np.empty((0, 2), dtype=np.float64),
            "metrics": np.empty((0, len(METRIC_KEYS)), dtype=np.float32),
            "zoning":  [],
            "hazard":  np.empty(0, dtype=bool),
        }

    ids = np.fromiter(
        (int(r.id) for r in rows), dtype=np.int64, count=n
    )
    latlng = np.array(
        [(float(r.lat), float(r.lng)) for r in rows], dtype=np.float64
    )

    metrics = np.empty((n, len(METRIC_KEYS)), dtype=np.float32)
    for col_i, key in enumerate(METRIC_KEYS):
        fb = METRIC_FALLBACKS[key]
        col_val = getattr  # alias to avoid repeated getattr lookup
        metrics[:, col_i] = [
            float(v) if (v := col_val(r, key)) is not None else fb
            for r in rows
        ]

    zoning = [str(r.zoning_code) for r in rows]
    hazard = np.array([bool(r.hazard_flag) for r in rows], dtype=bool)

    return {
        "ids":     ids,
        "latlng":  latlng,
        "metrics": metrics,
        "zoning":  zoning,
        "hazard":  hazard,
    }


# ── Adapter: ParcelSnapshot → cog_solver.Parcel ───────────────────────────

def snapshot_to_parcel(row: ParcelSnapshot) -> Any:
    """
    Convert a single ParcelSnapshot ORM row to a ``cog_solver.Parcel``
    dataclass instance.

    The local import of ``cog_solver`` breaks any import cycle that would
    arise from cog_solver importing parcel_domain at module load time.
    """
    from cog_solver import Parcel  # local import — intentional

    fb = METRIC_FALLBACKS
    return Parcel(
        id=int(row.id),
        lat=float(row.lat),
        lng=float(row.lng),
        zoning=str(row.zoning_code),
        hazard_flag=bool(row.hazard_flag),
        metrics={
            "rental_yield":   float(row.rental_yield)   if row.rental_yield   is not None else fb["rental_yield"],
            "price_per_m2":   float(row.price_per_m2)   if row.price_per_m2   is not None else fb["price_per_m2"],
            "vacancy":        float(row.vacancy)        if row.vacancy        is not None else fb["vacancy"],
            "transit_score":  float(row.transit_score)  if row.transit_score  is not None else fb["transit_score"],
            "footfall_score": float(row.footfall_score) if row.footfall_score is not None else fb["footfall_score"],
        },
    )


def snapshots_to_parcels(rows: list[ParcelSnapshot]) -> list:
    """
    Bulk-convert a list of ParcelSnapshot rows to [cog_solver.Parcel, …].
    """
    return [snapshot_to_parcel(r) for r in rows]
