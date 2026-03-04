"""
parcel_cache.py
===============
Thread-safe in-memory LRU cache of pre-processed parcel arrays.

Purpose
-------
The /api/cog/preview endpoint must respond in < 50 ms.  The bottleneck is
DB I/O + QuantileNormaliser fitting, both of which are identical for a given
area regardless of the investor weights.  This module caches the results so
that a preview request only needs to:

  1. Build a weight vector  (~1 µs)
  2. Recompute feasible_mask from zoning_allow  (~1 µs for N=2000)
  3. Run _score_all (one matrix multiply)  (~10 µs for N=2000)
  4. Run discrete_solve with max_iter=5  (~100 µs for N=2000, k=20)

Total estimated preview latency: 10–30 ms round-trip on Render's free tier.

Cache design
------------
* Key   : area_id  (int or str — hashed to int on insert)
* Value : ParcelCacheEntry dataclass (see below)
* Size  : max MAX_ENTRIES areas (LRU eviction)
* TTL   : entries expire after TTL_SECONDS (default 5 min)
* Lock  : threading.RLock() — safe for Gunicorn threaded workers

Public API
----------
  get(area_id)                -> ParcelCacheEntry | None
  put(area_id, entry)         -> None
  invalidate(area_id)         -> None
  populate_from_parcels(area_id, parcel_list) -> ParcelCacheEntry
  stats()                     -> dict   (for /api/health debugging)
"""

from __future__ import annotations

import time
import threading
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from cog_solver import (
    WEIGHT_TO_METRIC,
    QuantileNormaliser,
    Parcel,
)

# ── Config ─────────────────────────────────────────────────────────────────
MAX_ENTRIES: int   = 50      # maximum number of areas cached at once
TTL_SECONDS: float = 300.0   # 5 minutes


# ── Cache entry ────────────────────────────────────────────────────────────

@dataclass
class ParcelCacheEntry:
    """
    Pre-processed parcel data for one area.

    Fields
    ------
    area_id        : int
    positions      : float64 (N, 2)   — [[lat, lng], ...]
    normed         : float64 (N, F)   — quantile-normalised metric matrix
    zoning_codes   : list[str] (N,)   — for recomputing feasible_mask
    hazard_flags   : bool    (N,)     — for recomputing hazard_mask
    parcel_ids     : int64   (N,)     — original DB / synthetic ids
    parcel_latlng  : float64 (N, 2)   — same as positions, kept for JSON
    metric_keys    : tuple[str, ...]  — column order of normed
    created_at     : float            — time.monotonic() at creation
    hit_count      : int              — for stats / LRU tie-breaking
    """
    area_id:       int
    positions:     np.ndarray   # (N, 2) float64
    normed:        np.ndarray   # (N, F) float64
    zoning_codes:  list[str]
    hazard_flags:  np.ndarray   # (N,) bool
    parcel_ids:    np.ndarray   # (N,) int64
    metric_keys:   tuple[str, ...]
    created_at:    float = field(default_factory=time.monotonic)
    hit_count:     int   = 0

    @property
    def n_parcels(self) -> int:
        return int(self.positions.shape[0])

    def is_expired(self) -> bool:
        return (time.monotonic() - self.created_at) > TTL_SECONDS

    def feasible_mask(self, zoning_allow: set[str]) -> np.ndarray:
        """Recompute (N,) bool mask from the cached zoning_codes."""
        lower = {z.lower() for z in zoning_allow}
        return np.array([z in lower for z in self.zoning_codes], dtype=bool)


# ── LRU cache ──────────────────────────────────────────────────────────────

class _ParcelLRUCache:
    """OrderedDict-backed LRU with TTL expiry and a threading.RLock."""

    def __init__(self, max_size: int = MAX_ENTRIES) -> None:
        self._store: OrderedDict[int, ParcelCacheEntry] = OrderedDict()
        self._lock  = threading.RLock()
        self._max   = max_size
        self._hits  = 0
        self._misses = 0

    # ── Public ──────────────────────────────────────────────────────────

    def get(self, area_id: int | str) -> ParcelCacheEntry | None:
        key = int(area_id)
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            if entry.is_expired():
                del self._store[key]
                self._misses += 1
                return None
            # Move to end (most-recently used)
            self._store.move_to_end(key)
            entry.hit_count += 1
            self._hits += 1
            return entry

    def put(self, area_id: int | str, entry: ParcelCacheEntry) -> None:
        key = int(area_id)
        with self._lock:
            if key in self._store:
                del self._store[key]
            self._store[key] = entry
            self._store.move_to_end(key)
            # Evict oldest if over capacity
            while len(self._store) > self._max:
                self._store.popitem(last=False)

    def invalidate(self, area_id: int | str) -> None:
        key = int(area_id)
        with self._lock:
            self._store.pop(key, None)

    def stats(self) -> dict[str, Any]:
        with self._lock:
            return {
                "entries":     len(self._store),
                "max_entries": self._max,
                "hits":        self._hits,
                "misses":      self._misses,
                "hit_rate":    round(
                    self._hits / max(1, self._hits + self._misses), 3
                ),
                "areas_cached": list(self._store.keys()),
            }


# Module-level singleton — import this everywhere
parcel_cache = _ParcelLRUCache()


# ── Builder ────────────────────────────────────────────────────────────────

def populate_from_parcels(
    area_id: int | str,
    parcel_list: list[Parcel],
) -> ParcelCacheEntry:
    """
    Fit-transform a list of cog_solver.Parcel objects into a
    ParcelCacheEntry and store it in the cache.

    Called by both /cog/solve and /cog/preview (on cache miss) so that the
    first request for an area pays the normalisation cost once and all
    subsequent preview requests are free.

    Parameters
    ----------
    area_id     : area primary key
    parcel_list : raw Parcel objects (metrics in pre-normalised units)

    Returns
    -------
    ParcelCacheEntry  (already stored in parcel_cache)
    """
    metric_keys = list(WEIGHT_TO_METRIC.values())

    # Fit & transform — modifies parcel.metrics in place
    normaliser = QuantileNormaliser(metric_keys)
    normed     = normaliser.fit_transform(parcel_list)   # (N, F) float64

    positions = np.array(
        [[p.lat, p.lng] for p in parcel_list], dtype=np.float64
    )
    zoning_codes = [p.zoning for p in parcel_list]
    hazard_flags = np.array([bool(p.hazard_flag) for p in parcel_list], dtype=bool)
    parcel_ids   = np.array([int(p.id) for p in parcel_list], dtype=np.int64)

    entry = ParcelCacheEntry(
        area_id=int(area_id),
        positions=positions,
        normed=normed,
        zoning_codes=zoning_codes,
        hazard_flags=hazard_flags,
        parcel_ids=parcel_ids,
        metric_keys=tuple(metric_keys),
    )
    parcel_cache.put(area_id, entry)
    return entry
