import sys, os as _os
_venv_py = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "venv", "bin", "python3")
if _os.path.exists(_venv_py) and _os.path.abspath(sys.executable) != _os.path.abspath(_venv_py):
    _os.execv(_venv_py, [_venv_py] + sys.argv)

from flask import Flask, jsonify, request, send_file, Response
from flask_cors import CORS
from app_config import Config
from db_core import db
from area_models import Country, Province, City, Area, AreaImage, AreaAmenity, MarketTrend as LegacyMarketTrend, AreaStatistics, Property  # keep for potential reuse
from sqlalchemy import func, desc, and_, or_, text, inspect
from datetime import datetime, date
import os
import tempfile
from werkzeug.utils import secure_filename
from cog_solver import (
    CentreOfGravitySolver, SolverConfig,
    parcels_from_db, Parcel,
    WEIGHT_TO_METRIC,
    _score_all, _build_neighbour_index, discrete_solve,
    CogValidationError, validate_weights,
    acceleration_info, warmup_jit,
)
from parcel_cache import parcel_cache, populate_from_parcels
from parcel_domain import (
    fetch_feasible_parcels,
    fetch_all_parcels,
    snapshots_to_parcels,
    parcels_to_numpy,   # available for future vectorised endpoints
)

# ---------------------------------------------------------------------------
#  CoG error helper
# ---------------------------------------------------------------------------

def _cog_error(message: str, code: str, status: int = 400, **details):
    """
    Return a structured JSON error response for CoG endpoints.

    The frontend maps ``code`` to a user-facing message via ERROR_MESSAGES.
    ``details`` is an optional dict of machine-readable context.
    """
    return jsonify({
        'success': False,
        'error':   message,
        'code':    code,
        'details': details or {},
    }), status

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# Pre-compile Numba JIT kernels in a background thread so the first CoG
# solve request is not delayed by ~2 s of LLVM compilation.
import threading as _threading
_threading.Thread(target=warmup_jit, daemon=True, name="numba-warmup").start()
_accel = acceleration_info()
app.logger.info(
    "CoG solver acceleration: tier=%s (%s)",
    _accel["tier"], _accel["tier_label"],
)
# Restrict CORS in production to known frontend domain; allow all in dev
FrontendOrigin = os.getenv('FRONTEND_ORIGIN', 'https://digital-estate.vercel.app')
is_prod = os.getenv('FLASK_ENV') == 'production'
CorsAllowedOrigins = ['*'] if not is_prod else [FrontendOrigin]
CORS(app, origins=CorsAllowedOrigins, allow_headers=['Content-Type', 'Authorization'], methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
@app.get('/api/areas/<int:area_id>/properties')
def get_area_properties(area_id: int):
    try:
        q_type = request.args.get('type')
        featured = request.args.get('featured')
        qry = Property.query.filter(Property.area_id == area_id)
        if q_type:
            qry = qry.filter(Property.property_type.ilike(q_type))
        if featured is not None:
            val = featured.lower() in ('1','true','yes')
            qry = qry.filter(Property.is_featured == val)
        items = [p.to_dict() for p in qry.order_by(Property.created_at.desc()).limit(24).all()]
        return jsonify({'success': True, 'properties': items})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ---- URL helpers ----
def _absolute_url(path: str) -> str:
    """Return a fully-qualified URL for a given absolute or relative path.

    - Preserves http(s) URLs as-is.
    - Uses X-Forwarded-Proto/Host when present (e.g., behind Render/Proxies).
    - Falls back to request.host_url.
    """
    try:
        if not path:
            return path
        # Already absolute
        if isinstance(path, str) and (path.startswith('http://') or path.startswith('https://')):
            return path
        # Ensure leading slash for paths
        p = path if (isinstance(path, str) and path.startswith('/')) else f"/{path}"
        proto = request.headers.get('X-Forwarded-Proto', (request.scheme or 'http') if hasattr(request, 'scheme') else 'http')
        host = request.headers.get('X-Forwarded-Host', request.host if hasattr(request, 'host') else None)
        base = f"{proto}://{host}" if host else (request.host_url.rstrip('/') if hasattr(request, 'host_url') else '')
        if not base:
            return p
        return f"{base}{p}"
    except Exception:
        try:
            base = request.host_url.rstrip('/')
            p = path if path.startswith('/') else f"/{path}"
            return f"{base}{p}"
        except Exception:
            return path

# ---- Health endpoint ----
@app.route('/api/health', methods=['GET'])
def api_health():
    try:
        driver = db.engine.url.drivername if hasattr(db, 'engine') else 'unknown'
        ok_metrics = False
        try:
            ok_metrics = _area_metrics_supported()
        except Exception:
            ok_metrics = False
        return jsonify({
            'success': True,
            'service': 'backend',
            'driver': driver,
            'metrics': ok_metrics
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ---- Centre-of-Gravity solver endpoint ----
@app.route('/api/cog/solve', methods=['POST'])
def cog_solve():
    """
    POST /api/cog/solve

    Body (JSON)
    -----------
    {
      "area_id": <int>,
      "weights": {
          "rentalYield": 30,
          "pricePerSqm": 25,
          "vacancy": 20,
          "transitProximity": 15,
          "footfall": 10
      },
      "constraints": {
          "zoning_allow": ["commercial", "mixed", "residential"]   // optional
      },
      "solver": {                // optional overrides
          "max_iter": 200,
          "tolerance": 5e-6,
          "alpha0": 5e-4,
          "damp_beta": 3e6
      }
    }

    Response
    --------
    {
      "success": true,
      "lat": float,
      "lng": float,
      "uncertainty": { "radius_m", "ellipse_a_m", "ellipse_b_m", "theta_deg" },
      "convergence": { "iterations", "delta_m", "converged", "jitter_m" },
      "potential": float,
      "feasible": bool,
      "parcels": [ { id, lat, lng, score, feasible, zoning }, ... ]
    }
    """
    try:
        body = request.get_json(force=True, silent=True) or {}
        area_id = body.get('area_id')
        if not area_id:
            return jsonify({'success': False, 'error': 'area_id required'}), 400

        raw_weights = body.get('weights', {
            'rentalYield': 25, 'pricePerSqm': 25,
            'vacancy': 20, 'transitProximity': 15, 'footfall': 15,
        })
        constraints = body.get('constraints', {})
        solver_opts = body.get('solver', {})

        # ── Validate weight vector ────────────────────────────────────────
        ok, err_msg, err_code, err_details = validate_weights(raw_weights)
        if not ok:
            return _cog_error(err_msg, err_code, 400, **err_details)

        # Default zoning: allow all unless specified
        zoning_allow = set(constraints.get(
            'zoning_allow',
            ['residential', 'commercial', 'mixed', 'industrial', 'retail']
        ))

        # Load real data from DB
        area = Area.query.get(area_id)
        if not area:
            return jsonify({'success': False, 'error': 'Area not found'}), 404

        # Resolve area centroid from stored coordinates or statistics
        area_lat, area_lng = -26.1076, 28.0567   # safe fallback (Sandton)
        if area.coordinates:
            try:
                parts = str(area.coordinates).split(',')
                area_lat, area_lng = float(parts[0].strip()), float(parts[1].strip())
            except Exception:
                pass

        # Check for latitude/longitude columns (metrics schema)
        for lat_col in ('latitude', 'lat'):
            v = getattr(area, lat_col, None)
            if v is not None:
                try:
                    area_lat = float(v)
                except Exception:
                    pass
                break
        for lng_col in ('longitude', 'lng'):
            v = getattr(area, lng_col, None)
            if v is not None:
                try:
                    area_lng = float(v)
                except Exception:
                    pass
                break

        # ── Fetch latest area statistics (used as fallback metrics) ──────────
        area_stats = (
            AreaStatistics.query
            .filter(AreaStatistics.area_id == area_id)
            .order_by(AreaStatistics.created_at.desc())
            .first()
        )

        # ── Tier 1: parcel_snapshots table (fast, indexed, per-parcel metrics) ─
        # Uses ix_ps_area_zoning_safe (partial, non-hazard) or
        # ix_ps_area_zoning_hazard depending on the exclude_hazard flag.
        snap_rows = fetch_feasible_parcels(
            area_id,
            zoning_allow=zoning_allow,
            exclude_hazard=True,   # skip hazard parcels by default
            limit=2000,
        )
        if snap_rows:
            parcels = snapshots_to_parcels(snap_rows)
            data_source = 'real'

        else:
            # ── Tier 2: legacy Property rows (no per-parcel metrics) ──────────
            # Uses area-level statistics to fill metric values for every parcel.
            properties = (
                Property.query
                .filter(Property.area_id == area_id)
                .limit(500)
                .all()
            )
            if properties:
                parcels = parcels_from_db(properties, area_stats, area_lat, area_lng)
                data_source = 'real'

            else:
                # ── Tier 3: synthetic parcels from area_statistics ────────────
                # Graceful degradation: still returns a meaningful CoG when no
                # per-parcel data exists at all.
                import numpy as np
                rng = np.random.default_rng(int(area_id))
                zoning_choices = list(zoning_allow)

                def _fs(attr, fallback, jitter=0.0):
                    v = float(getattr(area_stats, attr) or fallback) if area_stats else fallback
                    return v + float(rng.uniform(-jitter, jitter))

                parcels = [
                    Parcel(
                        id=-(i + 1),
                        lat=area_lat + float(rng.uniform(-0.023, 0.023)),
                        lng=area_lng + float(rng.uniform(-0.023, 0.023)),
                        zoning=zoning_choices[i % len(zoning_choices)],
                        hazard_flag=False,
                        metrics={
                            'rental_yield':   _fs('rental_yield',    6.5,     1.0),
                            'price_per_m2':   _fs('price_per_sqm',   18000.0, 2000.0),
                            'vacancy':        _fs('vacancy_rate',    8.0,     2.0),
                            'transit_score':  _fs('transport_score', 55.0,    10.0),
                            'footfall_score': _fs('amenities_score', 55.0,    10.0),
                        },
                    )
                    for i in range(40)
                ]
                data_source = 'synthetic_from_area_stats'

        # ── Populate parcel cache (used by /cog/preview) ──────────────────
        # populate_from_parcels fits the QuantileNormaliser once so that
        # preview requests for this area skip all DB I/O and normalisation.
        populate_from_parcels(area_id, parcels)

        # ── Guard: must have at least 3 parcels ────────────────────────────
        if len(parcels) < 3:
            return _cog_error(
                f"Area has too few parcels ({len(parcels)}) for a meaningful solve.",
                "INSUFFICIENT_PARCELS",
                422,
                parcel_count=len(parcels),
                minimum=3,
                data_source=data_source,
            )

        # ── Guard: at least 1 parcel must pass the zoning filter ───────────
        _zoning_lower = {z.lower() for z in zoning_allow}
        feasible_count = sum(1 for p in parcels if p.zoning.lower() in _zoning_lower)
        if feasible_count == 0:
            return _cog_error(
                "All parcels are excluded by the current zoning filter. "
                "Allow at least one zoning category.",
                "ALL_ZONING_FILTERED",
                422,
                zoning_allow=sorted(zoning_allow),
                parcel_zonings=sorted({p.zoning.lower() for p in parcels}),
            )

        # Build solver config from optional overrides
        cfg = SolverConfig(
            max_iter=int(solver_opts.get('max_iter', 200)),
            tolerance=float(solver_opts.get('tolerance', 5e-6)),
            alpha0=float(solver_opts.get('alpha0', 5e-4)),
            damp_beta=float(solver_opts.get('damp_beta', 3e6)),
        )

        solver = CentreOfGravitySolver(
            parcels=parcels,
            weights=raw_weights,
            zoning_allow=zoning_allow,
            config=cfg,
        )

        try:
            result = solver.solve()
        except CogValidationError as ve:
            return _cog_error(str(ve), ve.code, 422, **ve.details)
        except Exception as se:
            import numpy as _np
            if isinstance(se, _np.linalg.LinAlgError):
                return _cog_error(
                    "Numerical error in solver (degenerate parcel distribution).",
                    "SOLVER_NUMERICAL_ERROR",
                    500,
                    internal=str(se),
                )
            app.logger.exception("Unexpected solver error for area_id=%s", area_id)
            return _cog_error(
                "Solver failed unexpectedly. Please try again.",
                "SOLVER_FAILED",
                500,
            )

        return jsonify({
            'success': True,
            'lat': result.lat,
            'lng': result.lng,
            'uncertainty': result.uncertainty,
            'convergence': result.convergence,
            'potential': result.potential,
            'feasible': result.feasible,
            'parcels': result.parcels,
            'parcel_count': len(result.parcels),
            'data_source': data_source,
        })

    except CogValidationError as ve:
        return _cog_error(str(ve), ve.code, 422, **ve.details)
    except Exception as e:
        import traceback
        app.logger.exception("Unhandled error in /cog/solve for area_id=%s", body.get('area_id'))
        return _cog_error(
            "An unexpected error occurred. Please try again.",
            "SOLVER_FAILED",
            500,
        )


# ── Centre-of-Gravity PREVIEW endpoint ────────────────────────────────────
@app.route('/api/cog/preview', methods=['POST'])
def cog_preview():
    """
    POST /api/cog/preview

    Lightweight version of /cog/solve for real-time slider drag previews.

    Differences from /cog/solve
    ---------------------------
    * Uses the in-process parcel cache (no DB query on cache hit).
    * Runs the discrete solver for at most 5 iterations — enough to move
      the marker to the rough neighbourhood of the optimum.
    * Skips the confidence-ellipse calculation entirely.
    * Returns a lean response: lat, lng, potential, and per-parcel scores
      but no uncertainty / convergence diagnostics.
    * Falls back to a full load + /cog/solve path on cache miss so the
      first request for a new area is always correct.

    Expected latency (Neon + Render free-tier)
    ------------------------------------------
    Cache hit   :  10 – 30 ms
    Cache miss  : 200 – 600 ms  (same as /cog/solve)

    Body (JSON)
    -----------
    {
      "area_id": <int>,
      "weights": { "rentalYield": 30, ... },
      "constraints": { "zoning_allow": ["commercial", "mixed"] }
    }

    Response
    --------
    {
      "success": true,
      "lat": float,
      "lng": float,
      "potential": float,
      "parcels": [ { id, lat, lng, score, feasible } ],
      "cache_hit": bool
    }
    """
    try:
        body = request.get_json(force=True, silent=True) or {}
        area_id = body.get('area_id')
        if not area_id:
            return jsonify({'success': False, 'error': 'area_id required'}), 400

        raw_weights  = body.get('weights', {
            'rentalYield': 25, 'pricePerSqm': 25,
            'vacancy': 20, 'transitProximity': 15, 'footfall': 15,
        })
        zoning_allow = set(
            body.get('constraints', {}).get(
                'zoning_allow',
                ['residential', 'commercial', 'mixed', 'industrial', 'retail'],
            )
        )

        # ── 1. Try cache first ──────────────────────────────────────────
        import numpy as np
        entry    = parcel_cache.get(area_id)
        cache_hit = entry is not None

        if not cache_hit:
            # Cache miss: run a minimal load exactly like /cog/solve does,
            # then populate_from_parcels so subsequent previews are fast.
            area = Area.query.get(area_id)
            if not area:
                return jsonify({'success': False, 'error': 'Area not found'}), 404

            area_lat, area_lng = -26.1076, 28.0567
            if area.coordinates:
                try:
                    parts = str(area.coordinates).split(',')
                    area_lat = float(parts[0].strip())
                    area_lng = float(parts[1].strip())
                except Exception:
                    pass

            area_stats = (
                AreaStatistics.query
                .filter(AreaStatistics.area_id == area_id)
                .order_by(AreaStatistics.created_at.desc())
                .first()
            )

            snap_rows = fetch_feasible_parcels(
                area_id, zoning_allow=zoning_allow,
                exclude_hazard=True, limit=2000,
            )
            if snap_rows:
                raw_parcels = snapshots_to_parcels(snap_rows)
            else:
                props = Property.query.filter(
                    Property.area_id == area_id
                ).limit(500).all()
                if props:
                    raw_parcels = parcels_from_db(props, area_stats, area_lat, area_lng)
                else:
                    rng = np.random.default_rng(int(area_id))
                    zc  = list(zoning_allow)

                    def _fs2(attr, fb, jit=0.0):
                        v = float(getattr(area_stats, attr) or fb) if area_stats else fb
                        return v + float(rng.uniform(-jit, jit))

                    raw_parcels = [
                        Parcel(
                            id=-(i + 1),
                            lat=area_lat + float(rng.uniform(-0.023, 0.023)),
                            lng=area_lng + float(rng.uniform(-0.023, 0.023)),
                            zoning=zc[i % len(zc)],
                            hazard_flag=False,
                            metrics={
                                'rental_yield':   _fs2('rental_yield',    6.5,     1.0),
                                'price_per_m2':   _fs2('price_per_sqm',   18000.0, 2000.0),
                                'vacancy':        _fs2('vacancy_rate',    8.0,     2.0),
                                'transit_score':  _fs2('transport_score', 55.0,    10.0),
                                'footfall_score': _fs2('amenities_score', 55.0,    10.0),
                            },
                        )
                        for i in range(40)
                    ]

            entry = populate_from_parcels(area_id, raw_parcels)

        # ── 2. Build weight vector from cache entry key order ───────────
        import numpy as np
        total_w = sum(abs(v) for v in raw_weights.values()) or 1.0
        weight_vec = np.array(
            [
                raw_weights.get(api_key, 0.0) / total_w
                for api_key in WEIGHT_TO_METRIC
            ],
            dtype=np.float64,
        )

        # ── Guard: weight vector must not be all-zero after normalisation ──
        if float(np.abs(weight_vec).sum()) < 1e-9:
            return _cog_error(
                "All weights are zero — solver has no optimisation direction.",
                "INVALID_WEIGHTS",
                400,
            )

        # ── 3. Recompute masks (cheap — no DB call) ─────────────────────
        feasible_mask = entry.feasible_mask(zoning_allow)

        # ── Guard: at least 1 parcel must pass the zoning filter ─────────
        if not feasible_mask.any():
            return _cog_error(
                "All parcels are excluded by the current zoning filter. "
                "Allow at least one zoning category.",
                "ALL_ZONING_FILTERED",
                422,
                zoning_allow=sorted(zoning_allow),
                parcel_zonings=sorted(set(entry.zoning_codes)),
            )

        # ── 4. Score all parcels (one matrix multiply, ~10 µs) ─────────
        from cog_solver import SolverConfig as _SC, K_NEIGHBOURS
        cfg_preview = _SC(max_iter=5, k_neighbours=min(K_NEIGHBOURS, entry.n_parcels - 1))
        V = _score_all(
            entry.normed, weight_vec,
            feasible_mask, entry.hazard_flags,
            cfg_preview,
        )

        # ── 5. Shallow discrete solve (max 5 iterations) ────────────────
        best_idx, _ = discrete_solve(
            entry.positions, entry.normed, weight_vec,
            feasible_mask, entry.hazard_flags,
            cfg_preview,
        )

        # ── 6. Normalise scores to [0, 1] ───────────────────────────────
        v_min   = float(V.min())
        v_span  = float(V.max() - v_min) or 1.0
        scores_norm = (V - v_min) / v_span

        parcels_out = [
            {
                'id':       int(entry.parcel_ids[i]),
                'lat':      float(entry.positions[i, 0]),
                'lng':      float(entry.positions[i, 1]),
                'score':    round(float(scores_norm[i]), 4),
                'feasible': bool(feasible_mask[i]),
                'zoning':   entry.zoning_codes[i],
            }
            for i in range(entry.n_parcels)
        ]

        return jsonify({
            'success':   True,
            'lat':       round(float(entry.positions[best_idx, 0]), 7),
            'lng':       round(float(entry.positions[best_idx, 1]), 7),
            'potential': round(float(scores_norm[best_idx]), 4),
            'parcels':   parcels_out,
            'cache_hit': cache_hit,
        })

    except CogValidationError as ve:
        return _cog_error(str(ve), ve.code, 422, **ve.details)
    except Exception as e:
        app.logger.exception("Unhandled error in /cog/preview for area_id=%s", body.get('area_id'))
        return _cog_error(
            "Preview failed unexpectedly. Please try again.",
            "SOLVER_FAILED",
            500,
        )


# ── Cache stats endpoint (dev / health tool) ──────────────────────────────
@app.route('/api/cog/cache-stats', methods=['GET'])
def cog_cache_stats():
    """Return current parcel-cache statistics (hit rate, entry count, etc.)."""
    return jsonify({'success': True, 'cache': parcel_cache.stats()})


# ── Acceleration info endpoint (dev / monitoring tool) ──────────────────
@app.route('/api/cog/acceleration', methods=['GET'])
def cog_acceleration():
    """Report which computation backend the solver is using."""
    return jsonify({'success': True, 'acceleration': acceleration_info()})


# ---- Helpers to resolve string refs (code/name) to numeric IDs ----
def _resolve_country_id(ref):
    try:
        with db.engine.connect() as conn:
            s = str(ref)
            if s.isdigit():
                row = conn.execute(text("SELECT id FROM countries WHERE id=:v"), {'v': int(s)}).first()
                return row.id if row else None
            # Try exact textual id (e.g., UUID)
            row = conn.execute(text("SELECT id FROM countries WHERE id=:v"), {'v': s}).first()
            if row:
                return row.id
            # Try code or exact name match (trim and case-insensitive)
            row = conn.execute(text("SELECT id FROM countries WHERE lower(trim(code))=lower(trim(:v)) OR lower(trim(name))=lower(trim(:v))"), {'v': s}).first()
            if row:
                return row.id
            # Handle common aliases
            aliases = []
            if s.lower() in {'za','south africa','south-africa'}:
                aliases = ['south africa','south-africa']
            for alt in aliases:
                row = conn.execute(text("SELECT id FROM countries WHERE lower(name)=:v"), {'v': alt}).first()
                if row:
                    return row.id
            # If only one country exists, use it as a sensible default in dev
            only = conn.execute(text("SELECT id FROM countries ORDER BY id LIMIT 2")).fetchall()
            if len(only) == 1:
                return only[0][0]
            # As a last resort for 2-letter refs (e.g., ZA), pick the first country
            if len(s) == 2 and only:
                first = conn.execute(text("SELECT id FROM countries ORDER BY id LIMIT 1")).first()
                if first:
                    return first.id
            return None
    except Exception:
        return None

def _resolve_province_id(ref):
    try:
        with db.engine.connect() as conn:
            s = str(ref)
            if s.isdigit():
                row = conn.execute(text("SELECT id FROM provinces WHERE id=:v"), {'v': int(s)}).first()
                return row.id if row else None
            # Try exact id (string id like 'ZA-GP')
            row = conn.execute(text("SELECT id FROM provinces WHERE id=:v"), {'v': s}).first()
            if row:
                return row.id
            # Common code aliases -> names
            code_map = {
                'ZA-GP': 'Gauteng',
                'ZA-WC': 'Western Cape',
                'ZA-KZN': 'KwaZulu-Natal',
                'ZA-EC': 'Eastern Cape',
                'ZA-MP': 'Mpumalanga',
                'ZA-LP': 'Limpopo',
                'ZA-NW': 'North West',
                'ZA-NC': 'Northern Cape',
                'ZA-FS': 'Free State'
            }
            alias = code_map.get(s.upper())
            if alias:
                row = conn.execute(text("SELECT id FROM provinces WHERE lower(trim(name))=lower(trim(:v))"), {'v': alias}).first()
                if row:
                    return row.id
            row = conn.execute(text("SELECT id FROM provinces WHERE lower(trim(name))=lower(trim(:v))"), {'v': s}).first()
            return row.id if row else None
    except Exception:
        return None

def _resolve_city_id(ref):
    try:
        with db.engine.connect() as conn:
            s = str(ref)
            if s.isdigit():
                row = conn.execute(text("SELECT id FROM cities WHERE id=:v"), {'v': int(s)}).first()
                return row.id if row else None
            # Try exact id (string id like 'JHB')
            row = conn.execute(text("SELECT id FROM cities WHERE id=:v"), {'v': s}).first()
            if row:
                return row.id
            # Common aliases
            code_map = {
                'JHB': 'Johannesburg',
                'CPT': 'Cape Town',
                'PTA': 'Pretoria',
                'DBN': 'Durban',
                'PLZ': 'Gqeberha',  # Port Elizabeth new name
            }
            alias = code_map.get(s.upper())
            if alias:
                row = conn.execute(text("SELECT id FROM cities WHERE lower(trim(name))=lower(trim(:v))"), {'v': alias}).first()
                if row:
                    return row.id
            row = conn.execute(text("SELECT id FROM cities WHERE lower(trim(name))=lower(trim(:v))"), {'v': s}).first()
            return row.id if row else None
    except Exception:
        return None

def _repair_sqlite_hierarchy_schema():
    """Ensure required columns exist in SQLite tables used by location APIs.

    Older local SQLite DBs may be missing new columns (e.g., countries.code).
    We add them if missing to prevent SELECT errors without a full migration.
    """
    try:
        engine = db.engine
        if 'sqlite' not in engine.url.drivername:
            return
        with engine.begin() as conn:
            def has_col(table, col):
                rows = conn.execute(text(f"PRAGMA table_info({table})")).mappings().all()
                return any(r['name'] == col for r in rows)
            def add_col(table, col, ddl):
                if not has_col(table, col):
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))
            # Countries: code, created_at, updated_at (SQLite cannot add expr defaults)
            add_col('countries', 'code', "code TEXT")
            add_col('countries', 'created_at', "created_at DATETIME")
            add_col('countries', 'updated_at', "updated_at DATETIME")
            # Provinces
            add_col('provinces', 'created_at', "created_at DATETIME")
            add_col('provinces', 'updated_at', "updated_at DATETIME")
            # Cities
            add_col('cities', 'created_at', "created_at DATETIME")
            add_col('cities', 'updated_at', "updated_at DATETIME")
            # Areas (optional additional columns)
            add_col('areas', 'description', "description TEXT")
            add_col('areas', 'area_type', "area_type TEXT")
            add_col('areas', 'postal_code', "postal_code TEXT")
            add_col('areas', 'coordinates', "coordinates TEXT")
            add_col('areas', 'created_at', "created_at DATETIME")
            add_col('areas', 'updated_at', "updated_at DATETIME")
            # Backfill country code if null
            try:
                conn.execute(text("UPDATE countries SET code = COALESCE(code, 'ZA') WHERE code IS NULL"))
            except Exception:
                pass
            # Backfill timestamps where null
            try:
                conn.execute(text("UPDATE countries SET created_at = COALESCE(created_at, datetime('now')), updated_at = COALESCE(updated_at, datetime('now'))"))
                conn.execute(text("UPDATE provinces SET created_at = COALESCE(created_at, datetime('now')), updated_at = COALESCE(updated_at, datetime('now'))"))
                conn.execute(text("UPDATE cities SET created_at = COALESCE(created_at, datetime('now')), updated_at = COALESCE(updated_at, datetime('now'))"))
                conn.execute(text("UPDATE areas SET created_at = COALESCE(created_at, datetime('now')), updated_at = COALESCE(updated_at, datetime('now'))"))
            except Exception:
                pass
    except Exception as e:
        # Non-fatal: log and continue
        print(f"⚠️ SQLite schema repair skipped/failed: {e}")

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint that doesn't require database"""
    return jsonify({
        'status': 'healthy',
        'message': 'Digital Estate Backend API is running',
        'version': '2.0.0',
        'database': 'PostgreSQL digitalestate2',
        'focus': 'area-metrics',
        'endpoints': [
            '/api/areas',
            '/api/areas/<id>/metrics/latest',
            '/api/areas/<id>/metrics/<metric_code>/series',
            '/api/metrics/catalog',
            '/api/cities/<id>/metrics/rollup',
            '/api/provinces/<id>/metrics/rollup',
            '/api/metrics/materialized/refresh'
        ]
    })

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'message': 'OK'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response


## Removed legacy property, owner, valuation, zoning, dashboard, and compatibility endpoints.

# ============ LOCATION HIERARCHY ENDPOINTS (LEGACY) ============

@app.route('/locations/countries', methods=['GET'])
def get_countries():
    """Get all countries for dropdown"""
    try:
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name FROM countries ORDER BY name")).mappings().all()
        return jsonify([{ 'id': r['id'], 'name': r['name'] } for r in rows])
    except Exception as e:
        print(f"❌ Error fetching countries: {e}")
        return jsonify({'error': 'Failed to fetch countries'}), 500

@app.route('/locations/provinces/<country_id>', methods=['GET'])
def get_provinces(country_id):
    """Get provinces for a specific country"""
    try:
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name, country_id FROM provinces WHERE country_id = :cid ORDER BY name"), {'cid': country_id}).mappings().all()
        return jsonify([{ 'id': r['id'], 'name': r['name'], 'country_id': r['country_id'] } for r in rows])
    except Exception as e:
        print(f"❌ Error fetching provinces: {e}")
        return jsonify({'error': 'Failed to fetch provinces'}), 500

@app.route('/locations/cities/<province_id>', methods=['GET'])
def get_cities(province_id):
    """Get cities for a specific province"""
    try:
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name, province_id FROM cities WHERE province_id = :pid ORDER BY name"), {'pid': province_id}).mappings().all()
        return jsonify([{ 'id': r['id'], 'name': r['name'], 'province_id': r['province_id'] } for r in rows])
    except Exception as e:
        print(f"❌ Error fetching cities: {e}")
        return jsonify({'error': 'Failed to fetch cities'}), 500

@app.route('/locations/areas/<city_id>', methods=['GET'])
def get_areas(city_id):
    """Get areas for a specific city"""
    try:
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name, city_id FROM areas WHERE city_id = :cid ORDER BY name"), {'cid': city_id}).mappings().all()
        return jsonify([{ 'id': r['id'], 'name': r['name'], 'city_id': r['city_id'] } for r in rows])
    except Exception as e:
        print(f"❌ Error fetching areas: {e}")
        return jsonify({'error': 'Failed to fetch areas'}), 500

## Removed /properties/<area_id> legacy endpoint

"""Additional unified /api/ prefixed location endpoints to satisfy frontend areaDataService."""

@app.route('/api/countries', methods=['GET'])
def api_countries():
    try:
        # Return unique countries by name; if duplicates exist, keep the one with the most areas
        # Compute area counts via LEFT JOINs (works cross-dialect)
        with db.engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT c.id, c.name, COALESCE(COUNT(a.id), 0) AS area_count
                FROM countries c
                LEFT JOIN provinces p ON p.country_id = c.id
                LEFT JOIN cities ci ON ci.province_id = p.id
                LEFT JOIN areas a ON a.city_id = ci.id
                GROUP BY c.id, c.name
                ORDER BY c.name
            """)).mappings().all()
        # Deduplicate by normalized country name
        best_by_name = {}
        for r in rows:
            name = (r['name'] or '').strip()
            key = name.lower()
            current = best_by_name.get(key)
            if not current:
                best_by_name[key] = {'id': r['id'], 'name': name, 'area_count': int(r['area_count'] or 0)}
            else:
                # Prefer higher area_count; on tie, keep existing (stable)
                if int(r['area_count'] or 0) > int(current['area_count'] or 0):
                    best_by_name[key] = {'id': r['id'], 'name': name, 'area_count': int(r['area_count'] or 0)}
        countries = [ {'id': v['id'], 'name': v['name']} for v in best_by_name.values() ]
        # Sort by name for consistent dropdown
        countries.sort(key=lambda x: (x['name'] or '').lower())
        return jsonify({'success': True, 'countries': countries})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/provinces/<country_ref>', methods=['GET'])
def api_provinces(country_ref):
    try:
        country_id = _resolve_country_id(country_ref)
        if not country_id:
            return jsonify({'success': False, 'error': 'Country not found'}), 404
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name, country_id FROM provinces WHERE country_id = :cid ORDER BY name"), {'cid': country_id}).mappings().all()
        return jsonify({'success': True, 'provinces': [ {'id': r['id'], 'name': r['name'], 'country_id': r['country_id']} for r in rows ]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# List all provinces (no filter)
@app.route('/api/provinces', methods=['GET'])
def api_provinces_all():
    try:
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name, country_id FROM provinces ORDER BY name")).mappings().all()
        return jsonify({'success': True, 'provinces': [ {'id': r['id'], 'name': r['name'], 'country_id': r['country_id']} for r in rows ]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/cities/<province_ref>', methods=['GET'])
def api_cities(province_ref):
    try:
        province_id = _resolve_province_id(province_ref)
        if not province_id:
            return jsonify({'success': False, 'error': 'Province not found'}), 404
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name, province_id FROM cities WHERE province_id = :pid ORDER BY name"), {'pid': province_id}).mappings().all()
        return jsonify({'success': True, 'cities': [ {'id': r['id'], 'name': r['name'], 'province_id': r['province_id']} for r in rows ]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# List all cities (no filter)
@app.route('/api/cities', methods=['GET'])
def api_cities_all():
    try:
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name, province_id FROM cities ORDER BY name")).mappings().all()
        return jsonify({'success': True, 'cities': [ {'id': r['id'], 'name': r['name'], 'province_id': r['province_id']} for r in rows ]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/areas/<city_ref>', methods=['GET'])
def api_areas(city_ref):
    try:
        city_id = _resolve_city_id(city_ref)
        if not city_id:
            return jsonify({'success': False, 'error': 'City not found'}), 404
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name, city_id FROM areas WHERE city_id = :cid ORDER BY name"), {'cid': city_id}).mappings().all()
        return jsonify({'success': True, 'areas': [ {'id': r['id'], 'name': r['name'], 'city_id': r['city_id']} for r in rows ]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# List all areas (plain list). Note: /api/areas is reserved for metrics listing.
@app.route('/api/areas/list', methods=['GET'])
def api_areas_list_plain():
    try:
        with db.engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name, city_id FROM areas ORDER BY name")).mappings().all()
        return jsonify({'success': True, 'areas': [ {'id': r['id'], 'name': r['name'], 'city_id': r['city_id']} for r in rows ]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<area_ref>', methods=['GET'])
def api_area_detail(area_ref):
    """Area detail with latest key metrics (avg_price, rental_yield, vacancy_rate).

    Uses direct SQL to avoid ORM column mismatches against existing DB schema.
    """
    try:
        resolved_id = _resolve_area_id_flex(area_ref)
        if not resolved_id:
            return jsonify({'success': False, 'error': 'Area not found'}), 404
        # Detect available coordinate columns
        has_lat = False; has_lng = False; has_coord = False
        try:
            insp = inspect(db.engine)
            cols = [c['name'] for c in insp.get_columns('areas')]
            has_lat = 'latitude' in cols
            has_lng = 'longitude' in cols
            has_coord = 'coordinates' in cols
        except Exception:
            has_lat = has_lng = has_coord = False
        with db.engine.connect() as conn:
            if has_lat or has_lng:
                area = conn.execute(text("SELECT id, name, city_id, latitude, longitude FROM areas WHERE id = :id"), {'id': resolved_id}).mappings().first()
            elif has_coord:
                area = conn.execute(text("SELECT id, name, city_id, coordinates FROM areas WHERE id = :id"), {'id': resolved_id}).mappings().first()
            else:
                area = conn.execute(text("SELECT id, name, city_id FROM areas WHERE id = :id"), {'id': resolved_id}).mappings().first()
            if not area:
                return jsonify({'success': False, 'error': 'Area not found'}), 404
            city = None
            province = None
            country = None
            if area['city_id'] is not None:
                city = conn.execute(text("SELECT id, name, province_id FROM cities WHERE id = :id"), {'id': area['city_id']}).mappings().first()
                if city and city['province_id'] is not None:
                    province = conn.execute(text("SELECT id, name, country_id FROM provinces WHERE id = :id"), {'id': city['province_id']}).mappings().first()
                    if province and province['country_id'] is not None:
                        country = conn.execute(text("SELECT id, name FROM countries WHERE id = :id"), {'id': province['country_id']}).mappings().first()

        # Determine primary image from static folder if available, else DB, else None
        primary_image_url = None
        try:
            static_base = os.path.join(os.path.dirname(__file__), 'static', 'images', 'areas')
            name_slug = secure_filename(area['name'] or '').strip()
            candidates = [str(area_ref)]
            if str(area['id']) not in candidates:
                candidates.append(str(area['id']))
            if name_slug:
                for v in {name_slug, name_slug.lower(), (area['name'] or '').strip(), (area['name'] or '').lower().strip()}:
                    if v and v not in candidates:
                        candidates.append(v)
            for folder in candidates:
                area_dir = os.path.join(static_base, folder)
                if os.path.isdir(area_dir):
                    for fname in sorted(os.listdir(area_dir)):
                        if fname.lower().endswith((".jpg",".jpeg",".png",".webp",".gif")):
                            primary_image_url = _absolute_url(f'/static/images/areas/{folder}/{fname}')
                            break
                if primary_image_url:
                    break
            if not primary_image_url:
                # Fall back to DB images (Postgres/SQLite compatible) using correct schema columns
                with db.engine.connect() as conn:
                    img = conn.execute(text("""
                        SELECT image_url
                        FROM area_images
                        WHERE area_id = :id
                        ORDER BY is_primary DESC, image_order ASC, id ASC
                        LIMIT 1
                    """), {'id': resolved_id}).mappings().first()
                if img and img['image_url']:
                    primary_image_url = _absolute_url(img['image_url'])
        except Exception:
            pass

        metrics_map = {}
        avg_price_val = None
        if _area_metrics_supported():
            latest = _fetch_latest_metrics_for_area(resolved_id, 'avg_price,rental_yield,vacancy_rate')
            for m in latest['metrics']:
                metrics_map[m['code']] = m['value_numeric']
            avg_price_val = metrics_map.get('avg_price')

        # Parse coordinates to lat/lng if available
        lat = None
        lng = None
        try:
            # RowMapping is not a plain dict, so use .keys() directly
            area_keys = list(area.keys())
            if 'latitude' in area_keys:
                lat = float(area['latitude']) if area['latitude'] is not None else None
            if 'longitude' in area_keys:
                lng = float(area['longitude']) if area['longitude'] is not None else None
            if (lat is None or lng is None) and 'coordinates' in area_keys:
                coord = area['coordinates']
                if coord:
                    parts = [p.strip() for p in str(coord).split(',')]
                    if len(parts) == 2:
                        lat = float(parts[0]) if parts[0] else lat
                        lng = float(parts[1]) if parts[1] else lng
        except Exception:
            lat = lat if isinstance(lat, (int, float)) else None
            lng = lng if isinstance(lng, (int, float)) else None

        return jsonify({'success': True, 'area': {
            'id': area['id'],
            'name': area['name'],
            'city': city['name'] if city else None,
            'city_id': city['id'] if city else None,
            'province': province['name'] if province else None,
            'province_id': province['id'] if province else None,
            'country': country['name'] if country else None,
            'primary_image_url': primary_image_url,
            'lat': lat,
            'lng': lng,
            'description': f"{area['name']} located in {city['name'] if city else ''} {province['name'] if province else ''}".strip(),
            'development_score': 78,
            'safety_rating': 7,
            'property_count': None,
            'average_price': avg_price_val,
            'metrics': metrics_map
        }})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def _area_metrics_supported():
    """Cross-dialect detection: verify metrics tables exist."""
    try:
        insp = inspect(db.engine)
        return insp.has_table('metrics') and insp.has_table('area_metric_values')
    except Exception:
        return False

def _latest_and_previous_numeric(area_id, metric_code):
    if not _area_metrics_supported():
        return (None, None)
    sql = text("""
        SELECT v.value_numeric, v.period_start
        FROM area_metric_values v
        JOIN metrics m ON m.id = v.metric_id
        WHERE v.area_id = :area_id AND m.code = :code
        ORDER BY v.period_start DESC, v.created_at DESC
        LIMIT 2
    """)
    with db.engine.connect() as conn:
        rows = conn.execute(sql, {'area_id': area_id, 'code': metric_code}).mappings().all()
    if not rows:
        return (None, None)
    latest = float(rows[0]['value_numeric']) if rows[0]['value_numeric'] is not None else None
    prev = float(rows[1]['value_numeric']) if len(rows) > 1 and rows[1]['value_numeric'] is not None else None
    return (latest, prev)

def _pct_change(latest, previous):
    if latest is None or previous is None or previous == 0:
        return None
    return ((latest - previous) / previous) * 100.0

@app.route('/api/area/<area_ref>/statistics', methods=['GET'])
def api_area_statistics(area_ref):
    """Real statistics derived from area_metric_values (with percentage trends)."""
    try:
        if not _area_metrics_supported():
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        resolved_id = _resolve_area_id_flex(area_ref)
        if not resolved_id:
            return jsonify({'success': False, 'error': 'Area not found'}), 404
        avg_latest, avg_prev = _latest_and_previous_numeric(resolved_id, 'avg_price')
        rent_latest, rent_prev = _latest_and_previous_numeric(resolved_id, 'rental_yield')
        vac_latest, vac_prev = _latest_and_previous_numeric(resolved_id, 'vacancy_rate')
        data = {
            'average_price': avg_latest,
            'price_trend': _pct_change(avg_latest, avg_prev),
            'rental_yield': rent_latest,
            'rental_trend': _pct_change(rent_latest, rent_prev),
            'vacancy_rate': vac_latest,
            'vacancy_trend': _pct_change(vac_latest, vac_prev),
            'population_density': None  # add metric later if needed
        }
        return jsonify({'success': True, 'statistics': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<area_ref>/images', methods=['GET'])
def api_area_images(area_ref):
    try:
        # 1) Try static folder: backend/static/images/areas/<area_id>/*
        static_base = os.path.join(os.path.dirname(__file__), 'static', 'images', 'areas')
        # Resolve area for better fallback folder names
        area_obj = None
        try:
            resolved_id = _resolve_area_id_flex(area_ref)
            if resolved_id:
                # Use lightweight direct SQL to avoid ORM schema mismatches
                with db.engine.connect() as conn:
                    area_obj = conn.execute(text("SELECT id, name FROM areas WHERE id = :id"), {'id': resolved_id}).mappings().first()
        except Exception:
            area_obj = None
        name_slug = secure_filename(area_obj['name']).strip() if area_obj and area_obj.get('name') else None
        candidates = [str(area_ref)]
        if area_obj and str(area_obj['id']) not in candidates:
            candidates.append(str(area_obj['id']))
        if name_slug:
            for v in {name_slug, name_slug.lower(), (area_obj.get('name') or '').strip(), (area_obj.get('name') or '').lower().strip()}:
                if v and v not in candidates:
                    candidates.append(v)
        collected = []
        for folder in candidates:
            area_dir = os.path.join(static_base, folder)
            if os.path.isdir(area_dir):
                for fname in sorted(os.listdir(area_dir)):
                    if fname.lower().endswith((".jpg",".jpeg",".png",".webp",".gif")):
                        rel_path = f'/static/images/areas/{folder}/{fname}'
                        collected.append({'image_url': _absolute_url(rel_path), 'caption': os.path.splitext(fname)[0]})
            if collected:
                break
        # 2) Also fetch DB images (always – merge with static so all sources show)
        try:
            if 'resolved_id' not in locals() or not resolved_id:
                resolved_id = _resolve_area_id_flex(area_ref)
            existing_urls = {i['image_url'] for i in collected}
            with db.engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT image_url,
                           COALESCE(image_title, image_description) AS title,
                           is_primary, image_order
                    FROM area_images
                    WHERE area_id = :id
                    ORDER BY is_primary DESC, image_order ASC, id ASC
                """), {'id': resolved_id}).mappings().all()
            for r in rows:
                url = _absolute_url(r['image_url'])
                if url not in existing_urls:
                    collected.append({'image_url': url, 'caption': r['title'] or 'Area image'})
                    existing_urls.add(url)
        except Exception:
            pass
        # 3) Fallback placeholder if still empty
        if not collected:
            collected = [{
                'image_url': _absolute_url(f'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&sig={area_ref}'),
                'caption': 'Area image'
            }]
        return jsonify({'success': True, 'images': collected})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<area_ref>/amenities', methods=['GET'])
def api_area_amenities(area_ref):
    """Return amenities for an area grouped by type."""
    try:
        resolved_id = _resolve_area_id_flex(area_ref)
        if not resolved_id:
            return jsonify({'success': False, 'error': 'Area not found'}), 404
        with db.engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT amenity_type, name, distance_km, rating, description
                FROM area_amenities
                WHERE area_id = :id
                ORDER BY amenity_type, distance_km ASC
            """), {'id': resolved_id}).mappings().all()
        grouped = {}
        items = []
        for r in rows:
            item = {
                'amenity_type': r['amenity_type'],
                'name': r['name'],
                'distance_km': float(r['distance_km']) if r['distance_km'] is not None else None,
                'rating': float(r['rating']) if r['rating'] is not None else None,
                'description': r['description'],
            }
            items.append(item)
            grouped.setdefault(r['amenity_type'], []).append(item)
        return jsonify({'success': True, 'amenities': grouped, 'all': items})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/area/<area_ref>/trends', methods=['GET'])
def api_area_trends(area_ref):
    """Return market trend time series from market_trends table.
    Query params: metric_type (default average_price), months (default 12)
    """
    try:
        resolved_id = _resolve_area_id_flex(area_ref)
        if not resolved_id:
            return jsonify({'success': False, 'error': 'Area not found'}), 404
        metric_type = request.args.get('metric_type', 'average_price')
        months = request.args.get('months', 12, type=int)
        driver = db.engine.url.drivername
        if 'sqlite' in driver:
            date_filter = f"AND metric_date >= date('now', '-{months} months')"
        else:
            date_filter = f"AND metric_date >= (CURRENT_DATE - INTERVAL '{months} month')"
        with db.engine.connect() as conn:
            rows = conn.execute(text(f"""
                SELECT metric_date, metric_value
                FROM market_trends
                WHERE area_id = :id
                  AND metric_type = :metric_type
                  {date_filter}
                ORDER BY metric_date ASC
            """), {'id': resolved_id, 'metric_type': metric_type}).mappings().all()
        # Also try area_metric_values as a richer fallback
        if not rows and _area_metrics_supported():
            # map legacy metric_type names to metric codes
            code_map = {
                'average_price': 'avg_price',
                'avg_price': 'avg_price',
                'rental_yield': 'rental_yield',
                'vacancy_rate': 'vacancy_rate',
            }
            code = code_map.get(metric_type, metric_type)
            with db.engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT v.period_start AS metric_date, v.value_numeric AS metric_value
                    FROM area_metric_values v
                    JOIN metrics m ON m.id = v.metric_id
                    WHERE v.area_id = :id AND m.code = :code
                    ORDER BY v.period_start ASC
                """), {'id': resolved_id, 'code': code}).mappings().all()
        trends = []
        for r in rows:
            md = r['metric_date']
            trends.append({
                'metric_date': md.isoformat() if hasattr(md, 'isoformat') else str(md),
                'metric_value': float(r['metric_value']) if r['metric_value'] is not None else None,
            })
        return jsonify({'success': True, 'trends': trends, 'metric_type': metric_type})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Simple placeholder image endpoint returning an SVG with text label
@app.route('/api/placeholder/<int:width>/<int:height>')
def api_placeholder(width, height):
    try:
        text = request.args.get('text', 'Placeholder')
        svg = f"""
        <svg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}'>
            <rect width='100%' height='100%' fill='#f0f0f0'/>
            <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#888' font-family='Arial, sans-serif' font-size='20'>
                {text}
            </text>
        </svg>
        """.strip()
        return Response(svg, mimetype='image/svg+xml')
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/areas/search', methods=['GET'])
def search_areas():
    """
    Autocomplete search – returns up to 20 areas ranked by match quality.

    ?q=<term>              – required search string (≥ 1 char)
    ?province_id=<int>     – optional: bias results toward a province
    ?limit=<int>           – optional: max results (capped at 40, default 20)

    Ranking:
      1 – exact name match
      2 – name starts with term
      3 – postal_code exact match
      4 – name contains term / city name contains term
    """
    try:
        term = request.args.get('q', '').strip()
        if not term:
            return jsonify({'success': True, 'areas': []})

        limit  = min(int(request.args.get('limit', 20)), 40)
        prov_id = request.args.get('province_id', '').strip()

        like_any   = f"%{term}%"
        like_start = f"{term}%"
        driver = db.engine.url.drivername if hasattr(db, 'engine') else ''
        is_pg  = 'sqlite' not in driver

        # Build a CASE-based priority rank directly in SQL so the ORDER BY is server-side
        rank_expr = """
            CASE
              WHEN lower(a.name) = lower(:exact)                       THEN 1
              WHEN lower(a.name) LIKE lower(:start)                    THEN 2
              WHEN a.postal_code IS NOT NULL
               AND lower(a.postal_code) = lower(:exact)                THEN 3
              ELSE 4
            END
        """
        # Province bias: boost in-province areas to the front within each rank tier
        prov_expr = "0" if not prov_id else f"CASE WHEN p.id = {int(prov_id)} THEN 0 ELSE 1 END"

        sql = text(f"""
            SELECT a.id, a.name, a.city_id, a.coordinates,
                   a.postal_code,
                   c.name  AS city_name,
                   p.id    AS province_id,
                   p.name  AS province_name,
                   ({rank_expr}) AS rank,
                   ({prov_expr}) AS prov_bias
            FROM   areas  a
            LEFT JOIN cities    c ON c.id = a.city_id
            LEFT JOIN provinces p ON p.id = c.province_id
            WHERE  lower(a.name)              LIKE lower(:like)
               OR  lower(c.name)              LIKE lower(:like)
               OR  (a.postal_code IS NOT NULL
                    AND lower(a.postal_code)  LIKE lower(:like))
            ORDER BY prov_bias, rank, a.name
            LIMIT  :lim
        """)
        with db.engine.connect() as conn:
            rows = conn.execute(sql, {
                'like': like_any, 'start': like_start,
                'exact': term, 'lim': limit,
            }).mappings().all()

        def _parse_coords(s):
            try:
                if not s: return None, None
                parts = str(s).split(',')
                return float(parts[0].strip()), float(parts[1].strip())
            except Exception:
                return None, None

        areas_payload = []
        for r in rows:
            lat, lng = _parse_coords(r['coordinates'])
            areas_payload.append({
                'id':          r['id'],
                'name':        r['name'],
                'city_id':     r['city_id'],
                'city':        r['city_name'],
                'province_id': r['province_id'],
                'province':    r['province_name'],
                'postal_code': r['postal_code'],
                'lat':         lat,
                'lng':         lng,
            })
        return jsonify({'success': True, 'areas': areas_payload})
    except Exception as e:
        app.logger.exception('search_areas error')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/areas/nearest', methods=['GET'])
def areas_nearest():
    """
    Return the area nearest to the given GPS coordinates.

    ?lat=<float>&lng=<float>   – required
    ?radius_km=<float>         – optional max search radius (default 50 km)

    Uses Python-side Haversine so it works on both SQLite and PostgreSQL.
    """
    import math
    try:
        try:
            lat = float(request.args['lat'])
            lng = float(request.args['lng'])
        except (KeyError, ValueError):
            return jsonify({'success': False, 'error': 'lat and lng are required numeric parameters'}), 400

        radius_km = float(request.args.get('radius_km', 50))

        # Fetch all areas that have coordinate data stored
        sql = text("""
            SELECT a.id, a.name, a.coordinates, a.postal_code,
                   c.name  AS city_name,
                   p.id    AS province_id,
                   p.name  AS province_name
            FROM   areas      a
            LEFT JOIN cities    c ON c.id = a.city_id
            LEFT JOIN provinces p ON p.id = c.province_id
            WHERE  a.coordinates IS NOT NULL AND a.coordinates != ''
        """)
        with db.engine.connect() as conn:
            rows = conn.execute(sql).mappings().all()

        def haversine(lat1, lng1, lat2, lng2):
            R = 6371.0  # Earth radius km
            dlat = math.radians(lat2 - lat1)
            dlng = math.radians(lng2 - lng1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

        best = None
        best_dist = float('inf')
        for r in rows:
            try:
                parts = [p.strip() for p in str(r['coordinates']).split(',')]
                if len(parts) != 2:
                    continue
                a_lat, a_lng = float(parts[0]), float(parts[1])
                dist = haversine(lat, lng, a_lat, a_lng)
                if dist < best_dist:
                    best_dist = dist
                    best = {'row': r, 'lat': a_lat, 'lng': a_lng, 'dist_km': dist}
            except Exception:
                continue

        if best is None or best_dist > radius_km:
            return jsonify({'success': False, 'error': 'No area found within radius', 'radius_km': radius_km}), 404

        r = best['row']
        return jsonify({
            'success': True,
            'area': {
                'id':          r['id'],
                'name':        r['name'],
                'city':        r['city_name'],
                'province':    r['province_name'],
                'province_id': r['province_id'],
                'postal_code': r['postal_code'],
                'lat':         best['lat'],
                'lng':         best['lng'],
                'dist_km':     round(best_dist, 2),
            },
        })
    except Exception as e:
        app.logger.exception('areas_nearest error')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/areas/<area_ref>/summary', methods=['GET'])
def area_summary(area_ref):
    """
    Quick-stats card for tooltip / hover / card body.  Sub-50 ms on cache hit.

    Returns the seven core AreaStatistics fields plus city/province context.
    Falls back to area_metric_values (extensible metric system) for richer
    data when available.
    """
    try:
        area_id = _resolve_area_id_flex(area_ref)
        if area_id is None:
            return jsonify({'success': False, 'error': 'Area not found'}), 404

        area  = Area.query.get(area_id)
        if not area:
            return jsonify({'success': False, 'error': 'Area not found'}), 404

        city     = City.query.get(area.city_id)     if area.city_id     else None
        province = Province.query.get(city.province_id) if city and city.province_id else None

        stats = (
            AreaStatistics.query
            .filter(AreaStatistics.area_id == area_id)
            .order_by(AreaStatistics.created_at.desc())
            .first()
        )

        def _s(v):
            return float(v) if v is not None else None

        summary = {
            'area_id':         area_id,
            'area_name':       area.name,
            'city':            city.name     if city     else None,
            'province':        province.name if province else None,
            'coordinates':     area.coordinates,
            'postal_code':     getattr(area, 'postal_code', None),
            # Core investment stats
            'rental_yield':    _s(stats.rental_yield)    if stats else None,
            'vacancy_rate':    _s(stats.vacancy_rate)    if stats else None,
            'price_per_sqm':   _s(stats.price_per_sqm)  if stats else None,
            'average_price':   _s(stats.average_price)  if stats else None,
            'transport_score': _s(stats.transport_score) if stats else None,
            'amenities_score': _s(stats.amenities_score) if stats else None,
            'crime_index':     _s(stats.crime_index_score) if stats else None,
        }

        # Enrich with extensible metric values if schema available
        if _area_metrics_supported():
            try:
                codes = 'rental_yield,vacancy_rate,price_per_sqm,avg_price,transport_score,amenities_score,planned_dev_count'
                enriched = _fetch_latest_metrics_for_area(area_id, codes)
                for m in enriched.get('metrics', []):
                    if m['value_numeric'] is not None:
                        summary[m['code']] = m['value_numeric']
            except Exception:
                pass

        return jsonify({'success': True, 'summary': summary})
    except Exception as e:
        app.logger.exception('area_summary error for %s', area_ref)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/areas/<area_ref>/why-chosen', methods=['GET'])
def area_why_chosen(area_ref):
    """
    Produce human-readable insight comparisons for the InsightCard.

    Compares this area's stats against the provincial median (via other areas
    in the same province) and returns a JSON list of reasons suitable for
    rendering as insight bullets.

    Response:
    {
      "success": true,
      "area_id": ...,
      "area_name": ...,
      "reasons": [
        { "icon": "yield",    "text": "Rental yield 8.2% — +2.1 pp above province average", "positive": true },
        ...
      ]
    }
    """
    try:
        area_id = _resolve_area_id_flex(area_ref)
        if area_id is None:
            return jsonify({'success': False, 'error': 'Area not found'}), 404

        area  = Area.query.get(area_id)
        if not area:
            return jsonify({'success': False, 'error': 'Area not found'}), 404

        city     = City.query.get(area.city_id)         if area.city_id else None
        prov_id  = city.province_id                      if city          else None

        # ── Area's own stats ──────────────────────────────────────────────
        stats = (
            AreaStatistics.query
            .filter(AreaStatistics.area_id == area_id)
            .order_by(AreaStatistics.created_at.desc())
            .first()
        )

        def _f(v): return float(v) if v is not None else None

        area_ry  = _f(stats.rental_yield)    if stats else None
        area_vr  = _f(stats.vacancy_rate)    if stats else None
        area_pp  = _f(stats.price_per_sqm)   if stats else None
        area_ts  = _f(stats.transport_score) if stats else None
        area_ams = _f(stats.amenities_score) if stats else None
        area_ci  = _f(stats.crime_index_score) if stats else None

        # ── Province medians ──────────────────────────────────────────────
        prov_ry = prov_vr = prov_pp = prov_ts = prov_ams = prov_ci = None
        if prov_id:
            try:
                latest_subq = (
                    db.session.query(
                        AreaStatistics.area_id,
                        func.max(AreaStatistics.id).label('max_id'),
                    )
                    .join(Area,  Area.id  == AreaStatistics.area_id)
                    .join(City,  City.id  == Area.city_id)
                    .filter(City.province_id == prov_id)
                    .group_by(AreaStatistics.area_id)
                    .subquery()
                )
                agg = (
                    db.session.query(
                        func.avg(AreaStatistics.rental_yield).label('ry'),
                        func.avg(AreaStatistics.vacancy_rate).label('vr'),
                        func.avg(AreaStatistics.price_per_sqm).label('pp'),
                        func.avg(AreaStatistics.transport_score).label('ts'),
                        func.avg(AreaStatistics.amenities_score).label('ams'),
                        func.avg(AreaStatistics.crime_index_score).label('ci'),
                    )
                    .join(latest_subq,
                          (latest_subq.c.area_id == AreaStatistics.area_id) &
                          (latest_subq.c.max_id  == AreaStatistics.id))
                    .first()
                )
                if agg:
                    prov_ry  = _f(agg.ry)
                    prov_vr  = _f(agg.vr)
                    prov_pp  = _f(agg.pp)
                    prov_ts  = _f(agg.ts)
                    prov_ams = _f(agg.ams)
                    prov_ci  = _f(agg.ci)
            except Exception:
                pass  # province stats unavailable — fall back to absolute thresholds

        reasons = []

        def _pp_diff(a, b):
            """Percentage-point difference rounded to 1 dp."""
            if a is None or b is None: return None
            return round(a - b, 1)

        def _pct_rank(val, avg, higher_is_better=True):
            """Simple text label based on distance from average."""
            if val is None or avg is None or avg == 0:
                return None
            ratio = val / avg
            if higher_is_better:
                if ratio >= 1.20: return 'top percentile'
                if ratio >= 1.10: return 'above average'
                if ratio >= 0.90: return 'near average'
                return 'below average'
            else:
                if ratio <= 0.80: return 'lowest tier'
                if ratio <= 0.90: return 'below average'
                if ratio <= 1.10: return 'near average'
                return 'above average'

        # Rental yield
        if area_ry is not None:
            diff = _pp_diff(area_ry, prov_ry)
            if diff is not None:
                sign = '+' if diff >= 0 else ''
                reasons.append({
                    'icon': 'yield',
                    'text': f"Rental yield {area_ry:.1f}% — {sign}{diff:.1f} pp vs. province avg",
                    'positive': diff >= 0,
                })
            else:
                reasons.append({
                    'icon': 'yield',
                    'text': f"Rental yield {area_ry:.1f}%",
                    'positive': area_ry >= 7.0,
                })

        # Vacancy rate (lower is better)
        if area_vr is not None:
            diff = _pp_diff(area_vr, prov_vr)
            if diff is not None:
                sign = '+' if diff >= 0 else ''
                reasons.append({
                    'icon': 'vacancy',
                    'text': f"Vacancy {area_vr:.1f}% — {sign}{diff:.1f} pp vs. province avg (lower is better)",
                    'positive': diff <= 0,
                })
            else:
                reasons.append({
                    'icon': 'vacancy',
                    'text': f"Vacancy rate {area_vr:.1f}%",
                    'positive': area_vr < 10.0,
                })

        # Price per m²
        if area_pp is not None:
            rank = _pct_rank(area_pp, prov_pp, higher_is_better=False)
            label = f" ({rank})" if rank else ''
            reasons.append({
                'icon': 'price',
                'text': f"Price R{area_pp:,.0f}/m²{label}",
                'positive': rank in ('lowest tier', 'below average') if rank else True,
            })

        # Transport
        if area_ts is not None:
            rank = _pct_rank(area_ts, prov_ts, higher_is_better=True)
            reasons.append({
                'icon': 'transit',
                'text': f"Transit score {area_ts:.0f}/100 — {rank or 'scored'}",
                'positive': (area_ts or 0) >= 50,
            })

        # Amenities
        if area_ams is not None:
            rank = _pct_rank(area_ams, prov_ams, higher_is_better=True)
            reasons.append({
                'icon': 'amenities',
                'text': f"Amenities score {area_ams:.0f}/100 — {rank or 'scored'}",
                'positive': (area_ams or 0) >= 50,
            })

        # Crime (lower is better)
        if area_ci is not None:
            rank = _pct_rank(area_ci, prov_ci, higher_is_better=False)
            reasons.append({
                'icon': 'crime',
                'text': f"Crime index {area_ci:.0f}/100 — {rank or 'rated'}",
                'positive': (area_ci or 100) < 50,
            })

        if not reasons:
            reasons.append({
                'icon': 'info',
                'text': 'No detailed statistics available for this area yet.',
                'positive': None,
            })

        return jsonify({
            'success':   True,
            'area_id':   area_id,
            'area_name': area.name,
            'reasons':   reasons,
        })
    except Exception as e:
        app.logger.exception('area_why_chosen error for %s', area_ref)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/areas/recommended', methods=['GET'])
def areas_recommended():
    """
    Return recommended areas based on province context + recent views + trends.

    ?province_id=<int>          – bias toward this province
    ?recent_ids=1,2,3           – comma-sep area IDs the user recently viewed
                                  (used to avoid repeating them AND to infer
                                   the user's province if province_id absent)
    ?limit=<int>                – default 8, max 20

    Scoring (all from latest AreaStatistics):
      raw_score = yield*0.35  +  (transit/100)*0.20  +  (amenities/100)*0.20
                - vacancy*0.15 -  (crime/100)*0.10

    Ties broken by average_price ASC (more accessible first).
    """
    try:
        limit    = min(int(request.args.get('limit', 8)), 20)
        prov_raw = request.args.get('province_id', '').strip()
        recent_raw = request.args.get('recent_ids', '').strip()

        prov_id = int(prov_raw) if prov_raw.isdigit() else None
        recent_ids = []
        if recent_raw:
            try:
                recent_ids = [int(x) for x in recent_raw.split(',') if x.strip().isdigit()]
            except Exception:
                pass

        from sqlalchemy import func as sa_func

        # Infer province from recent areas if not supplied
        if not prov_id and recent_ids:
            try:
                first_area = Area.query.get(recent_ids[0])
                if first_area and first_area.city_id:
                    city = City.query.get(first_area.city_id)
                    if city:
                        prov_id = city.province_id
            except Exception:
                pass

        # Fallback: Gauteng (most common starting province)
        if not prov_id:
            gp = Province.query.filter(
                func.lower(Province.name).like('%gauteng%')
            ).first()
            if gp:
                prov_id = gp.id

        # ── Latest AreaStatistics per area in province ─────────────────
        latest_subq = (
            db.session.query(
                AreaStatistics.area_id,
                sa_func.max(AreaStatistics.id).label('max_id'),
            )
            .join(Area, Area.id == AreaStatistics.area_id)
            .join(City, City.id == Area.city_id)
        )
        if prov_id:
            latest_subq = latest_subq.filter(City.province_id == prov_id)
        latest_subq = latest_subq.group_by(AreaStatistics.area_id).subquery()

        rows = (
            db.session.query(Area, City, AreaStatistics)
            .join(City,          City.id == Area.city_id)
            .join(AreaStatistics, AreaStatistics.area_id == Area.id)
            .join(latest_subq,
                  (latest_subq.c.area_id == AreaStatistics.area_id) &
                  (latest_subq.c.max_id  == AreaStatistics.id))
            .all()
        )

        def _f(v): return float(v) if v is not None else None

        def _score(stats):
            ry  = (_f(stats.rental_yield)     or 0) / 15.0
            vr  = 1.0 - min((_f(stats.vacancy_rate) or 10) / 20.0, 1.0)
            ts  = (_f(stats.transport_score)  or 50) / 100.0
            ams = (_f(stats.amenities_score)  or 50) / 100.0
            ci  = 1.0 - (_f(stats.crime_index_score) or 50) / 100.0
            return ry * 0.35 + ts * 0.20 + ams * 0.20 + vr * 0.15 + ci * 0.10

        def _parse_coords(s):
            try:
                if not s: return None, None
                parts = str(s).split(',')
                return float(parts[0].strip()), float(parts[1].strip())
            except Exception:
                return None, None

        scored = []
        for area, city, stats in rows:
            if area.id in recent_ids:  # exclude recently viewed
                continue
            lat, lng = _parse_coords(area.coordinates)
            scored.append({
                'area_id':         area.id,
                'area_name':       area.name,
                'city':            city.name,
                'lat':             lat,
                'lng':             lng,
                'rental_yield':    _f(stats.rental_yield),
                'vacancy_rate':    _f(stats.vacancy_rate),
                'price_per_sqm':   _f(stats.price_per_sqm),
                'transport_score': _f(stats.transport_score),
                'score':           _score(stats),
            })

        scored.sort(key=lambda r: r['score'], reverse=True)
        top = scored[:limit]

        # Build one-line summary tag per area
        for r in top:
            tags = []
            if r['rental_yield'] and r['rental_yield'] >= 8.0:
                tags.append(f"Yield ↑ {r['rental_yield']:.1f}%")
            elif r['rental_yield']:
                tags.append(f"Yield {r['rental_yield']:.1f}%")
            if r['vacancy_rate'] and r['vacancy_rate'] < 8.0:
                tags.append("Vacancy ↓")
            if r['transport_score'] and r['transport_score'] >= 65:
                tags.append("Good Transit")
            if not tags:
                tags.append("Recommended")
            r['tag_line'] = ' · '.join(tags)

        return jsonify({'success': True, 'recommended': top})
    except Exception as e:
        app.logger.exception('areas_recommended error')
        return jsonify({'success': False, 'error': str(e)}), 500


# ============ NEW AREA METRICS ENDPOINTS (EXTENSIBLE METRIC SYSTEM) ============

def _area_metrics_supported_pg_probe():
    """Secondary (Postgres-specific) existence probe retained for legacy code paths.

    NOTE: Primary cross-dialect detection lives earlier in this file using
    SQLAlchemy's inspector. This helper narrows to Postgres and is only used
    if inspector-based check unexpectedly fails.
    """
    try:
        engine = db.engine
        with engine.connect() as conn:
            res = conn.execute(text("""
                SELECT to_regclass('public.metrics') IS NOT NULL AS has_metrics,
                       to_regclass('public.area_metric_values') IS NOT NULL AS has_values
            """))
            row = res.first()
            if not row:
                return False
            return row.has_metrics and row.has_values
    except Exception:
        return False

def _fetch_latest_metrics_for_area(area_id, metric_codes=None):
    """Return latest metrics for a given area_id.
    Cross-dialect: works on both SQLite (dev) and PostgreSQL (production)."""
    if not _area_metrics_supported():
        return {'available': False, 'metrics': []}
    engine = db.engine
    driver = engine.url.drivername
    is_sqlite = 'sqlite' in driver

    codes = []
    if metric_codes:
        codes = [c.strip() for c in metric_codes.split(',') if c.strip()]

    with engine.connect() as conn:
        if is_sqlite:
            # SQLite: no LATERAL / ANY — use correlated subquery + named IN params
            params = {'area_id': area_id}
            codes_filter_clause = ''
            if codes:
                in_keys = []
                for i, c in enumerate(codes):
                    k = f'c{i}'
                    params[k] = c
                    in_keys.append(f':{k}')
                codes_filter_clause = f"AND m.code IN ({','.join(in_keys)})"
            sql_str = f"""
                SELECT m.code, m.name, m.unit, m.category,
                       v.period_start, v.value_numeric, v.value_text,
                       v.value_json, v.source, v.quality_score
                FROM metrics m
                JOIN area_metric_values v
                  ON v.metric_id = m.id
                 AND v.area_id = :area_id
                 AND v.period_start = (
                       SELECT MAX(v2.period_start)
                       FROM area_metric_values v2
                       WHERE v2.metric_id = m.id AND v2.area_id = :area_id
                 )
                WHERE 1=1 {codes_filter_clause}
                ORDER BY m.code
            """
            rows = conn.execute(text(sql_str), params).mappings().all()
        else:
            # PostgreSQL: use LATERAL for efficiency
            params = {'area_id': area_id}
            codes_filter_clause = ''
            if codes:
                codes_filter_clause = 'AND m.code = ANY(:codes)'
                params['codes'] = codes
            sql_str = f"""
                SELECT m.code, m.name, m.unit, m.category,
                       lv.period_start, lv.value_numeric, lv.value_text,
                       lv.value_json, lv.source, lv.quality_score
                FROM metrics m
                JOIN LATERAL (
                    SELECT v.*
                    FROM area_metric_values v
                    WHERE v.metric_id = m.id AND v.area_id = :area_id
                    ORDER BY v.period_start DESC, v.created_at DESC
                    LIMIT 1
                ) lv ON TRUE
                WHERE 1=1 {codes_filter_clause}
                ORDER BY m.code
            """
            rows = conn.execute(text(sql_str), params).mappings().all()

    metrics = []
    for r in rows:
        ps = r['period_start']
        if ps and hasattr(ps, 'isoformat'):
            ps = ps.isoformat()
        metrics.append({
            'code': r['code'],
            'name': r['name'],
            'unit': r['unit'],
            'category': r['category'],
            'latest_period_start': ps,
            'value_numeric': float(r['value_numeric']) if r['value_numeric'] is not None else None,
            'value_text': r['value_text'],
            'value_json': r['value_json'],
            'source': r['source'],
            'quality_score': r['quality_score']
        })
    return {'available': True, 'metrics': metrics}

def _resolve_area_id_flex(area_ref):
    """Resolve an area reference to its primary key value.

    Accepts either a numeric ID, UUID-like textual ID, or an area name.
    Works across Postgres and SQLite by adapting the SQL expression.
    Returns the raw ID (string or int) on success, or None if not found.
    """
    try:
        # If it's already numeric, return as int (fast path)
        if str(area_ref).isdigit():
            return int(area_ref)
        driver = db.engine.url.drivername if hasattr(db, 'engine') else ''
        id_expr = "CAST(id AS TEXT)" if 'sqlite' in driver else "id::text"
        sql = text(f"""
            SELECT id FROM areas
            WHERE lower(trim({id_expr})) = lower(trim(:ref))
               OR lower(trim(name)) = lower(trim(:ref))
            ORDER BY id
            LIMIT 1
        """)
        with db.engine.connect() as conn:
            row = conn.execute(sql, {'ref': str(area_ref)}).first()
        return row[0] if row and row[0] is not None else None
    except Exception:
        return None

@app.route('/api/metrics/catalog', methods=['GET'])
def api_metrics_catalog():
    try:
        if not _area_metrics_supported():
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        engine = db.engine
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT code, name, description, unit, category, data_type, is_active FROM metrics ORDER BY code"))
            catalog = [dict(r) for r in rows.mappings()]
        return jsonify({'success': True, 'metrics': catalog})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/areas', methods=['GET'])
def api_areas_latest_metrics():
    """List areas with optional latest key metrics.
    Query params:
      metrics=avg_price,rental_yield (optional)
      limit=50 (optional)
    """
    try:
        limit = min(int(request.args.get('limit', 50)), 200)
        metric_codes = request.args.get('metrics')  # comma separated
        if not _area_metrics_supported() and not _area_metrics_supported_pg_probe():
            # Fallback just list legacy areas (UUID) if available
            areas = Area.query.limit(limit).all()
            return jsonify({'success': True, 'areas': [ {'id': a.id, 'name': a.name, 'city_id': a.city_id } for a in areas ], 'metrics_included': False})
        engine = db.engine
        # Prefer view if available for efficiency
        with engine.connect() as conn:
            # Detect materialized or normal views
            have_mv = False
            have_view = False
            try:
                # Postgres: check pg_matviews
                mv_check = conn.execute(text("SELECT 1 FROM pg_matviews WHERE matviewname='area_latest_key_metrics_mv'" )).first()
                if mv_check:
                    have_mv = True
                view_check = conn.execute(text("SELECT 1 FROM pg_views WHERE viewname='area_latest_key_metrics'" )).first()
                if view_check:
                    have_view = True
            except Exception:
                # Fallback to simple assumption
                pass
            result = []
            if have_mv:
                base_rows = conn.execute(text("SELECT area_id AS id, area_name AS name, avg_price, rental_yield, vacancy_rate FROM area_latest_key_metrics_mv ORDER BY area_name LIMIT :lim"), {'lim': limit}).mappings().all()
            elif have_view:
                base_rows = conn.execute(text("SELECT area_id AS id, area_name AS name, avg_price, rental_yield, vacancy_rate FROM area_latest_key_metrics ORDER BY area_name LIMIT :lim"), {'lim': limit}).mappings().all()
                # If metric_codes specified and includes non-inline metrics, fetch individually
                requested_codes = [c.strip() for c in metric_codes.split(',')] if metric_codes else []
                inline_set = {'avg_price','rental_yield','vacancy_rate'}
                need_extra = [c for c in requested_codes if c and c not in inline_set]
            need_extra = []
            if have_mv or have_view:
                if need_extra:
                    for row in base_rows:
                        latest_extra = _fetch_latest_metrics_for_area(row['id'], ','.join(need_extra))
                        extra_map = { m['code']: m['value_numeric'] for m in latest_extra['metrics'] }
                        metrics_inline = {k: row.get(k) for k in inline_set if row.get(k) is not None}
                        metrics_inline.update(extra_map)
                        result.append({'id': row['id'], 'name': row['name'], 'metrics': metrics_inline, 'all_metrics_count': len(metrics_inline)})
                else:
                    for row in base_rows:
                        metrics_inline = {k: row.get(k) for k in ['avg_price','rental_yield','vacancy_rate'] if row.get(k) is not None}
                        result.append({'id': row['id'], 'name': row['name'], 'metrics': metrics_inline, 'all_metrics_count': len(metrics_inline)})
            else:
                # Fallback path if view not present
                area_rows = conn.execute(text("SELECT id, name FROM areas ORDER BY name LIMIT :lim"), {'lim': limit}).mappings().all()
                for ar in area_rows:
                    latest = _fetch_latest_metrics_for_area(ar['id'], metric_codes)
                    metrics_map = { m['code']: m for m in latest['metrics'] }
                    inline = {}
                    for key in ['avg_price', 'rental_yield', 'vacancy_rate']:
                        if key in metrics_map:
                            inline[key] = metrics_map[key]['value_numeric']
                    result.append({'id': ar['id'], 'name': ar['name'], 'metrics': inline, 'all_metrics_count': len(latest['metrics']) if latest['available'] else 0})
        return jsonify({'success': True, 'areas': result, 'metrics_included': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/areas/<int:area_id>/metrics/latest', methods=['GET'])
def api_area_latest_metrics(area_id):
    try:
        metric_codes = request.args.get('metrics')
        latest = _fetch_latest_metrics_for_area(area_id, metric_codes)
        if not latest['available']:
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        return jsonify({'success': True, 'area_id': area_id, 'metrics': latest['metrics']})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Flexible variant: allow string area references (e.g., 'SANDTON') as well as numeric IDs
@app.route('/api/areas/<area_ref>/metrics/latest', methods=['GET'])
def api_area_latest_metrics_flex(area_ref):
    try:
        metric_codes = request.args.get('metrics')
        resolved_id = _resolve_area_id_flex(area_ref)
        if not resolved_id:
            return jsonify({'success': False, 'error': 'Area not found'}), 404
        latest = _fetch_latest_metrics_for_area(resolved_id, metric_codes)
        if not latest['available']:
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        return jsonify({'success': True, 'area_id': resolved_id, 'metrics': latest['metrics']})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/areas/<int:area_id>/metrics/<metric_code>/series', methods=['GET'])
def api_area_metric_series(area_id, metric_code):
    """Return time series for a specific metric.
    Query params:
      months=12 (optional) OR start=YYYY-MM-DD&end=YYYY-MM-DD
    """
    try:
        if not _area_metrics_supported():
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        months = request.args.get('months', type=int)
        start = request.args.get('start')
        end = request.args.get('end')
        filters = [ 'a.area_id = :area_id', 'm.code = :metric_code' ]
        params = { 'area_id': area_id, 'metric_code': metric_code }
        date_clause = ''
        if start and end:
            date_clause = 'AND a.period_start BETWEEN :start AND :end'
            params['start'] = start
            params['end'] = end
        elif months:
            driver = db.engine.url.drivername
            if 'sqlite' in driver:
                # SQLite: approximate months using date('now','-%d months')
                date_clause = f"AND a.period_start >= date('now','-{months} months')"
            else:
                # Postgres / others
                date_clause = f"AND a.period_start >= (CURRENT_DATE - INTERVAL '{months} month')"
        sql = text(f"""
            SELECT a.period_start, a.value_numeric, a.value_text, a.value_json, a.source, a.quality_score
            FROM area_metric_values a
            JOIN metrics m ON m.id = a.metric_id
            WHERE a.area_id = :area_id
              AND m.code = :metric_code
              {date_clause}
            ORDER BY a.period_start
        """)
        engine = db.engine
        with engine.connect() as conn:
            rows = conn.execute(sql, params).mappings().all()
        series = [ {
            'period_start': r['period_start'].isoformat() if r['period_start'] else None,
            'value_numeric': float(r['value_numeric']) if r['value_numeric'] is not None else None,
            'value_text': r['value_text'],
            'value_json': r['value_json'],
            'source': r['source'],
            'quality_score': r['quality_score']
        } for r in rows ]
        return jsonify({'success': True, 'area_id': area_id, 'metric': metric_code, 'points': series})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/cities/<int:city_id>/metrics/rollup', methods=['GET'])
def api_city_metrics_rollup(city_id):
    """Aggregate latest metrics across all areas in a city.
    Returns per-metric rollup with chosen aggregation (avg or sum).
    Query params: metrics=code1,code2 (optional filter)
    """
    try:
        if not _area_metrics_supported():
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        metric_codes = request.args.get('metrics')
        codes_filter = ''
        params = {'city_id': city_id}
        if metric_codes:
            codes = [c.strip() for c in metric_codes.split(',') if c.strip()]
            if codes:
                codes_filter = 'AND m.code = ANY(:codes)'
                params['codes'] = codes
        # Decide which metrics should be summed instead of averaged
        sum_codes = {'sales_volume'}
        sql = text(f"""
            WITH latest AS (
                SELECT a.city_id, v.metric_id, v.value_numeric
                FROM areas a
                JOIN LATERAL (
                    SELECT vv.* FROM area_metric_values vv
                    WHERE vv.area_id = a.id
                    ORDER BY vv.period_start DESC, vv.created_at DESC
                    LIMIT 1
                ) v ON TRUE
                WHERE a.city_id = :city_id
            )
            SELECT m.code, m.name, m.unit, m.category,
                   AVG(latest.value_numeric) AS avg_value,
                   SUM(latest.value_numeric) AS sum_value,
                   COUNT(latest.value_numeric) AS sample_count
            FROM metrics m
            JOIN latest ON latest.metric_id = m.id
            WHERE 1=1 {codes_filter}
            GROUP BY m.code, m.name, m.unit, m.category
            ORDER BY m.code
        """)
        engine = db.engine
        with engine.connect() as conn:
            rows = conn.execute(sql, params).mappings().all()
        payload = []
        for r in rows:
            code = r['code']
            value = float(r['sum_value']) if code in sum_codes and r['sum_value'] is not None else (float(r['avg_value']) if r['avg_value'] is not None else None)
            payload.append({
                'code': code,
                'name': r['name'],
                'unit': r['unit'],
                'category': r['category'],
                'value': value,
                'aggregation': 'sum' if code in sum_codes else 'avg',
                'sample_count': r['sample_count']
            })
        return jsonify({'success': True, 'city_id': city_id, 'metrics': payload})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/provinces/<int:province_id>/metrics/rollup', methods=['GET'])
def api_province_metrics_rollup(province_id):
    """Aggregate latest metrics across all areas in a province (via cities)."""
    try:
        if not _area_metrics_supported():
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        metric_codes = request.args.get('metrics')
        codes_filter = ''
        params = {'province_id': province_id}
        if metric_codes:
            codes = [c.strip() for c in metric_codes.split(',') if c.strip()]
            if codes:
                codes_filter = 'AND m.code = ANY(:codes)'
                params['codes'] = codes
        sum_codes = {'sales_volume'}
        sql = text(f"""
            WITH latest AS (
                SELECT a.id AS area_id, c.province_id, v.metric_id, v.value_numeric
                FROM areas a
                JOIN cities c ON c.id = a.city_id
                JOIN LATERAL (
                    SELECT vv.* FROM area_metric_values vv
                    WHERE vv.area_id = a.id
                    ORDER BY vv.period_start DESC, vv.created_at DESC
                    LIMIT 1
                ) v ON TRUE
                WHERE c.province_id = :province_id
            )
            SELECT m.code, m.name, m.unit, m.category,
                   AVG(latest.value_numeric) AS avg_value,
                   SUM(latest.value_numeric) AS sum_value,
                   COUNT(latest.value_numeric) AS sample_count
            FROM metrics m
            JOIN latest ON latest.metric_id = m.id
            WHERE 1=1 {codes_filter}
            GROUP BY m.code, m.name, m.unit, m.category
            ORDER BY m.code
        """)
        engine = db.engine
        with engine.connect() as conn:
            rows = conn.execute(sql, params).mappings().all()
        payload = []
        for r in rows:
            code = r['code']
            value = float(r['sum_value']) if code in sum_codes and r['sum_value'] is not None else (float(r['avg_value']) if r['avg_value'] is not None else None)
            payload.append({
                'code': code,
                'name': r['name'],
                'unit': r['unit'],
                'category': r['category'],
                'value': value,
                'aggregation': 'sum' if code in sum_codes else 'avg',
                'sample_count': r['sample_count']
            })
        return jsonify({'success': True, 'province_id': province_id, 'metrics': payload})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/insights/province/<int:province_id>/dashboard', methods=['GET'])
def province_insights_dashboard(province_id):
    """
    Return a province-level insight dashboard.

    Response shape:
    {
      success, province_id, province_name,
      insights: { rising_yield, falling_vacancy, best_value, high_transit, low_crime, planned_dev },
      hot_zones: [ { area_id, area_name, city_name, lat, lng, composite_score }, ... ]
    }
    Each insight list item: { area_id, area_name, city_name, metric_value, metric_label, lat, lng }
    """
    try:
        # --- Fetch province name ---
        province = db.session.query(Province).filter(Province.id == province_id).first()
        if not province:
            return jsonify({'success': False, 'error': 'Province not found'}), 404

        # --- Latest AreaStatistics per area (using max id as latest proxy) ---
        from sqlalchemy import func as sa_func
        latest_subq = (
            db.session.query(
                AreaStatistics.area_id,
                sa_func.max(AreaStatistics.id).label('max_id')
            )
            .join(Area, Area.id == AreaStatistics.area_id)
            .join(City, City.id == Area.city_id)
            .filter(City.province_id == province_id)
            .group_by(AreaStatistics.area_id)
            .subquery()
        )

        rows = (
            db.session.query(Area, City, AreaStatistics)
            .join(City, City.id == Area.city_id)
            .join(AreaStatistics, AreaStatistics.area_id == Area.id)
            .join(latest_subq,
                  (latest_subq.c.area_id == AreaStatistics.area_id) &
                  (latest_subq.c.max_id == AreaStatistics.id))
            .filter(City.province_id == province_id)
            .all()
        )

        if not rows:
            return jsonify({
                'success': True,
                'province_id': province_id,
                'province_name': province.name,
                'insights': {k: [] for k in ['rising_yield','falling_vacancy','best_value','high_transit','low_crime','planned_dev']},
                'hot_zones': []
            })

        # --- Build enriched area records ---
        def _parse_coords(coord_str):
            """Parse 'lat,lng' string → (float, float) or (None, None)."""
            if not coord_str:
                return None, None
            try:
                parts = str(coord_str).split(',')
                return float(parts[0].strip()), float(parts[1].strip())
            except Exception:
                return None, None

        def _safe(v):
            if v is None:
                return None
            try:
                return float(v)
            except Exception:
                return None

        def _fmt_pct(v):
            return f"{v:.1f}%" if v is not None else '—'

        def _fmt_score(v):
            return f"{v:.0f}/100" if v is not None else '—'

        def _fmt_ratio(v):
            return f"{v:.2f}" if v is not None else '—'

        def _fmt_price(v):
            if v is None:
                return '—'
            if v >= 1_000_000:
                return f"R{v/1_000_000:.1f}M"
            if v >= 1_000:
                return f"R{v/1_000:.0f}K"
            return f"R{v:,.0f}"

        areas_data = []
        for area, city, stats in rows:
            lat, lng = _parse_coords(area.coordinates)
            ry = _safe(stats.rental_yield)
            vr = _safe(stats.vacancy_rate)
            ppsqm = _safe(stats.price_per_sqm)
            avg_price = _safe(stats.average_price)
            ts = _safe(stats.transport_score)
            ams = _safe(stats.amenities_score)
            cs = _safe(stats.crime_index_score)

            # value_ratio = rental_yield / price_per_sqm * 1000 (higher is better)
            value_ratio = (ry / ppsqm * 1000) if (ry is not None and ppsqm and ppsqm > 0) else None

            # Composite score [0..1] for hot-zone ranking
            # Components: yield contributes positively, vacancy & crime negatively
            ry_norm  = min((ry or 0) / 15.0, 1.0)
            ts_norm  = (ts or 50.0) / 100.0
            ams_norm = (ams or 50.0) / 100.0
            vr_norm  = 1.0 - min((vr or 10.0) / 20.0, 1.0)
            cs_norm  = 1.0 - (cs or 50.0) / 100.0
            composite = (ry_norm * 0.30 + ts_norm * 0.25 + ams_norm * 0.20
                         + vr_norm * 0.15 + cs_norm * 0.10)

            areas_data.append({
                'area_id': area.id,
                'area_name': area.name,
                'city_name': city.name,
                'lat': lat,
                'lng': lng,
                'rental_yield': ry,
                'vacancy_rate': vr,
                'price_per_sqm': ppsqm,
                'average_price': avg_price,
                'transport_score': ts,
                'amenities_score': ams,
                'crime_index_score': cs,
                'value_ratio': value_ratio,
                'composite': round(composite, 4),
            })

        TOP_N = 5

        def _build_item(r, metric_value, metric_label):
            return {
                'area_id': r['area_id'],
                'area_name': r['area_name'],
                'city_name': r['city_name'],
                'metric_value': metric_value,
                'metric_label': metric_label,
                'lat': r['lat'],
                'lng': r['lng'],
            }

        # 1. Rising Yield — highest rental_yield
        rising_yield = sorted([r for r in areas_data if r['rental_yield'] is not None],
                               key=lambda r: r['rental_yield'], reverse=True)[:TOP_N]
        rising_yield = [_build_item(r, r['rental_yield'], _fmt_pct(r['rental_yield'])) for r in rising_yield]

        # 2. Falling Vacancy — lowest vacancy_rate
        falling_vacancy = sorted([r for r in areas_data if r['vacancy_rate'] is not None],
                                  key=lambda r: r['vacancy_rate'])[:TOP_N]
        falling_vacancy = [_build_item(r, r['vacancy_rate'], _fmt_pct(r['vacancy_rate'])) for r in falling_vacancy]

        # 3. Best Value — highest yield/price_per_sqm ratio
        best_value = sorted([r for r in areas_data if r['value_ratio'] is not None],
                             key=lambda r: r['value_ratio'], reverse=True)[:TOP_N]
        best_value = [_build_item(r, r['value_ratio'], _fmt_ratio(r['value_ratio'])) for r in best_value]

        # 4. High Transit — best transport_score
        high_transit = sorted([r for r in areas_data if r['transport_score'] is not None],
                               key=lambda r: r['transport_score'], reverse=True)[:TOP_N]
        high_transit = [_build_item(r, r['transport_score'], _fmt_score(r['transport_score'])) for r in high_transit]

        # 5. Low Crime — lowest crime_index_score within top-50% by average_price
        priced = [r for r in areas_data if r['average_price'] is not None]
        if priced:
            price_median = sorted([r['average_price'] for r in priced])[len(priced) // 2]
            crime_pool = [r for r in priced
                          if r['average_price'] >= price_median and r['crime_index_score'] is not None]
        else:
            crime_pool = [r for r in areas_data if r['crime_index_score'] is not None]
        low_crime = sorted(crime_pool, key=lambda r: r['crime_index_score'])[:TOP_N]
        low_crime = [_build_item(r, r['crime_index_score'], _fmt_score(r['crime_index_score'])) for r in low_crime]

        # 6. Planned Development — try area_metric_values if schema available, else fallback to amenities_score
        planned_dev = []
        if _area_metrics_supported():
            try:
                dev_sql = text("""
                    WITH latest_dev AS (
                        SELECT v.area_id, v.value_numeric
                        FROM area_metric_values v
                        JOIN metrics m ON m.id = v.metric_id
                        WHERE m.code = 'planned_dev_count'
                        AND v.area_id IN (
                            SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id
                            WHERE c.province_id = :pid
                        )
                        ORDER BY v.period_start DESC, v.created_at DESC
                    )
                    SELECT DISTINCT ON (area_id) area_id, value_numeric
                    FROM latest_dev
                    ORDER BY area_id, value_numeric DESC
                """)
                with db.engine.connect() as conn:
                    dev_rows = conn.execute(dev_sql, {'pid': province_id}).mappings().all()
                dev_map = {r['area_id']: float(r['value_numeric']) for r in dev_rows if r['value_numeric'] is not None}
                if dev_map:
                    dev_pool = [r for r in areas_data if r['area_id'] in dev_map]
                    dev_pool.sort(key=lambda r: dev_map[r['area_id']], reverse=True)
                    planned_dev = [
                        _build_item(r, dev_map[r['area_id']], str(int(dev_map[r['area_id']])) + ' projects')
                        for r in dev_pool[:TOP_N]
                    ]
            except Exception:
                pass  # fall through to amenities fallback

        if not planned_dev:
            # Fallback: highest amenities_score as proxy for development activity
            dev_fallback = sorted([r for r in areas_data if r['amenities_score'] is not None],
                                  key=lambda r: r['amenities_score'], reverse=True)[:TOP_N]
            planned_dev = [_build_item(r, r['amenities_score'], _fmt_score(r['amenities_score'])) for r in dev_fallback]

        # --- Hot Zones — top 50 areas by composite score with valid coordinates ---
        hot_zones_pool = sorted(
            [r for r in areas_data if r['lat'] is not None and r['lng'] is not None],
            key=lambda r: r['composite'], reverse=True
        )[:50]
        hot_zones = [
            {
                'area_id': r['area_id'],
                'area_name': r['area_name'],
                'city_name': r['city_name'],
                'lat': r['lat'],
                'lng': r['lng'],
                'composite_score': r['composite'],
                'rental_yield': r['rental_yield'],
            }
            for r in hot_zones_pool
        ]

        return jsonify({
            'success': True,
            'province_id': province_id,
            'province_name': province.name,
            'insights': {
                'rising_yield': rising_yield,
                'falling_vacancy': falling_vacancy,
                'best_value': best_value,
                'high_transit': high_transit,
                'low_crime': low_crime,
                'planned_dev': planned_dev,
            },
            'hot_zones': hot_zones,
        })

    except Exception as e:
        app.logger.exception('province_insights_dashboard error')
        return jsonify({'success': False, 'error': str(e)}), 500


def initialize_database():
    """Minimal initialization: ensure tables exist for area hierarchy & metrics.

    Legacy property/location seeding intentionally removed. Use the new
    initialize_area_metrics.py script for structured setup & sample data.
    """
    with app.app_context():
        try:
            # Detect driver
            driver = db.engine.url.drivername if hasattr(db, 'engine') else ''
            if 'sqlite' in driver:
                # Repair legacy SQLite DBs missing new columns and create ORM tables (dev convenience)
                _repair_sqlite_hierarchy_schema()
                db.create_all()
                print("✅ Core tables ensured via ORM (SQLite dev mode).")
            else:
                # On Postgres and others, avoid ORM create_all to prevent FK/type conflicts with existing schema
                print("ℹ️ Skipping ORM create_all on non-SQLite (use SQL initializer for schema).")

            # Idempotent seeding for local dev: ensure SA + provinces + key cities + areas
            print("🧪 Ensuring minimal location hierarchy exists (dev convenience)...")
            # If existing schema uses string IDs (e.g., 'ZA', 'ZA-GP'), skip ORM-based seeding
            try:
                with db.engine.connect() as conn:
                    cols = conn.execute(text("PRAGMA table_info(areas)")).mappings().all() if 'sqlite' in db.engine.url.drivername else []
                    id_col = next((c for c in cols if c['name'] == 'id'), None)
                    if id_col and id_col.get('type', '').upper().startswith('TEXT'):
                        print("ℹ️ Detected TEXT primary keys in hierarchy tables; skipping ORM seeding.")
                        raise RuntimeError('skip_seeding')
            except RuntimeError as r:
                if str(r) == 'skip_seeding':
                    pass
                else:
                    raise
            except Exception:
                # Continue with best-effort seeding when detection fails
                pass
            if 'sqlite' in driver:
                sa = Country.query.filter(Country.name.ilike('South Africa')).first()
                if not sa:
                    sa = Country(name='South Africa', code='ZA')
                    db.session.add(sa)
                    db.session.flush()
                else:
                    if not sa.code:
                        sa.code = 'ZA'
                        db.session.add(sa)
                        db.session.flush()
                # Provinces
                gp = Province.query.filter(Province.name.ilike('Gauteng'), Province.country_id == sa.id).first()
                wc = Province.query.filter(Province.name.ilike('Western Cape'), Province.country_id == sa.id).first()
                new_provs = []
                if not gp:
                    gp = Province(name='Gauteng', country_id=sa.id); new_provs.append(gp)
                if not wc:
                    wc = Province(name='Western Cape', country_id=sa.id); new_provs.append(wc)
                if new_provs:
                    db.session.add_all(new_provs)
                    db.session.flush()
                # Cities
                jhb = City.query.filter(City.name.ilike('Johannesburg'), City.province_id == gp.id).first()
                cpt = City.query.filter(City.name.ilike('Cape Town'), City.province_id == wc.id).first()
                new_cities = []
                if not jhb:
                    jhb = City(name='Johannesburg', province_id=gp.id); new_cities.append(jhb)
                if not cpt:
                    cpt = City(name='Cape Town', province_id=wc.id); new_cities.append(cpt)
                if new_cities:
                    db.session.add_all(new_cities)
                    db.session.flush()
                # Areas
                area_pairs = [
                    (jhb.id, 'Sandton'), (jhb.id, 'Rosebank'),
                    (cpt.id, 'Sea Point'), (cpt.id, 'Claremont')
                ]
                new_areas = []
                for cid, aname in area_pairs:
                    exists = Area.query.filter(Area.name.ilike(aname), Area.city_id == cid).first()
                    if not exists:
                        new_areas.append(Area(name=aname, city_id=cid))
                if new_areas:
                    db.session.add_all(new_areas)
                if new_provs or new_cities or new_areas:
                    try:
                        db.session.commit()
                        print("✅ Ensured minimal SA hierarchy present (Gauteng/WC, Johannesburg/Cape Town, key areas)")
                    except Exception as se:
                        db.session.rollback()
                        print(f"ℹ️ Skipping ORM seeding due to schema mismatch: {se}")
            else:
                print("ℹ️ Skipping ORM-based hierarchy seeding on non-SQLite (use initializer for data).")

            # Ensure metrics schema and seed example values if possible
            try:
                from sqlalchemy import inspect as _insp
                inspector = _insp(db.engine)
                have_metrics = inspector.has_table('metrics') and inspector.has_table('area_metric_values')
            except Exception:
                have_metrics = False

            if not have_metrics:
                # Only attempt to run SQL file on Postgres; it's not SQLite-compatible
                if 'postgres' in db.engine.url.drivername:
                    schema_path = os.path.join(os.path.dirname(__file__), 'area_metrics_schema.sql')
                    if os.path.exists(schema_path):
                        print("🧱 Creating metrics schema from area_metrics_schema.sql ...")
                        with open(schema_path, 'r', encoding='utf-8') as f:
                            sql_text = f.read()
                        with db.engine.connect() as conn:
                            conn.execute(text(sql_text))
                            conn.commit()
                        print("✅ Metrics schema ensured.")
                else:
                    print("ℹ️ Skipping metrics schema file execution on SQLite (dev mode).")
            # After ensuring tables, seed sample metric points if empty
            try:
                if have_metrics:
                    with db.engine.connect() as conn:
                        existing = conn.execute(text("SELECT COUNT(1) AS c FROM area_metric_values")).first()
                        need_seed = (existing and existing.c == 0)
                else:
                    need_seed = False
                if need_seed and 'postgres' in db.engine.url.drivername:
                    print("🌱 Seeding sample metric values for demo areas (Postgres only)...")
                    with db.engine.begin() as conn:
                        def _aid(name):
                            row = conn.execute(text("SELECT id FROM areas WHERE name=:n"), {'n': name}).first()
                            return row.id if row else None
                        a_sand = _aid('Sandton'); a_rose = _aid('Rosebank'); a_sea = _aid('Sea Point'); a_cla = _aid('Claremont')
                        def _mid(code):
                            row = conn.execute(text("SELECT id FROM metrics WHERE code=:c"), {'c': code}).first()
                            return row.id if row else None
                        for code in ['avg_price','rental_yield','vacancy_rate']:
                            _mid(code)
                        m_avg = _mid('avg_price'); m_yld = _mid('rental_yield'); m_vac = _mid('vacancy_rate')
                        def ins(aid, mid, period, val):
                            if aid and mid:
                                conn.execute(text("""
                                    INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
                                    VALUES (:a,:m,:p,:v,'seed')
                                    ON CONFLICT DO NOTHING
                                """), {'a': aid, 'm': mid, 'p': period, 'v': val})
                        for aid in [a_sand, a_rose, a_sea, a_cla]:
                            if not aid:
                                continue
                            ins(aid, m_avg, '2025-08-01', 3000000)
                            ins(aid, m_avg, '2025-09-01', 3250000)
                            ins(aid, m_yld, '2025-08-01', 6.8)
                            ins(aid, m_yld, '2025-09-01', 7.2)
                            ins(aid, m_vac, '2025-08-01', 7.0)
                            ins(aid, m_vac, '2025-09-01', 6.5)
                    print("✅ Sample metrics seeded.")
                elif need_seed:
                    print("ℹ️ Skipping sample metric seeding on SQLite (dev mode).")
            except Exception as se:
                print(f"⚠️ Metrics seeding skipped: {se}")
        except Exception as e:
            print(f"Database initialization error: {e}")

def _initialize_with_retry(max_attempts=3, delay=3):
    """Call initialize_database() with retry on transient Postgres SSL/network errors."""
    import time
    for attempt in range(1, max_attempts + 1):
        try:
            initialize_database()
            return
        except Exception as exc:
            msg = str(exc)
            # Retry on SSL drops or transient connection errors
            if attempt < max_attempts and any(k in msg for k in [
                'SSL connection has been closed',
                'SSL SYSCALL error',
                'could not connect to server',
                'connection reset',
                'timeout',
            ]):
                print(f"⚠️  DB init attempt {attempt}/{max_attempts} failed ({exc}), retrying in {delay}s…")
                time.sleep(delay)
                delay *= 2  # exponential backoff
            else:
                print(f"❌ DB init failed after {attempt} attempt(s): {exc}")
                return

_initialize_with_retry()

# ================= MATERIALIZED VIEW MAINTENANCE ENDPOINT ==================

def _is_postgres():
    try:
        return 'postgres' in db.engine.url.drivername
    except Exception:
        return False

def _refresh_materialized_views(recreate=False, concurrent=True):
    """Refresh or recreate materialized views if on Postgres.

    Returns dict with status and details. No-op on non-Postgres.
    """
    if not _is_postgres():
        return {'success': False, 'error': 'Not a PostgreSQL database (materialized views unsupported)'}
    engine = db.engine
    actions = []
    try:
        with engine.connect() as conn:
            # Check for existence of expected materialized views
            have_mv_latest = False
            have_mv_keys = False
            try:
                chk = conn.execute(text("SELECT matviewname FROM pg_matviews WHERE matviewname IN ('area_metric_latest_mv','area_latest_key_metrics_mv')")).fetchall()
                names = {row[0] for row in chk} if chk else set()
                have_mv_latest = 'area_metric_latest_mv' in names
                have_mv_keys = 'area_latest_key_metrics_mv' in names
            except Exception:
                # If pg_matviews not available, proceed best-effort
                pass

            # If views are missing and a SQL file exists, try to create them
            if recreate or not (have_mv_latest and have_mv_keys):
                try:
                    sql_path = os.path.join(os.path.dirname(__file__), 'area_metrics_materialized.sql')
                    if os.path.exists(sql_path):
                        with open(sql_path, 'r', encoding='utf-8') as f:
                            sql_batch = f.read()
                        conn.execute(text(sql_batch))
                        actions.append('created_or_recreated_from_sql')
                        # Re-evaluate existence after creation
                        try:
                            chk2 = conn.execute(text("SELECT matviewname FROM pg_matviews WHERE matviewname IN ('area_metric_latest_mv','area_latest_key_metrics_mv')")).fetchall()
                            names2 = {row[0] for row in chk2} if chk2 else set()
                            have_mv_latest = 'area_metric_latest_mv' in names2
                            have_mv_keys = 'area_latest_key_metrics_mv' in names2
                        except Exception:
                            pass
                    else:
                        actions.append('materialized_sql_missing')
                except Exception as e:
                    # Don't fail hard if creation isn't possible; continue and possibly skip refresh
                    actions.append(f'create_failed:{e}')

            # If still missing, skip refresh gracefully
            if not (have_mv_latest and have_mv_keys):
                return {'success': True, 'actions': actions + ['views_missing_skipped']}
            if recreate:
                # Re-run the SQL file that (re)creates materialized views
                try:
                    with open(os.path.join(os.path.dirname(__file__), 'area_metrics_materialized.sql'), 'r', encoding='utf-8') as f:
                        sql_batch = f.read()
                    conn.execute(text(sql_batch))
                    actions.append('recreated')
                except Exception as e:
                    return {'success': False, 'error': f'Recreation failed: {e}'}
            # Refresh step
            try:
                if concurrent:
                    conn.execute(text('REFRESH MATERIALIZED VIEW CONCURRENTLY area_metric_latest_mv'))
                    conn.execute(text('REFRESH MATERIALIZED VIEW CONCURRENTLY area_latest_key_metrics_mv'))
                    actions.append('refreshed_concurrent')
                else:
                    conn.execute(text('REFRESH MATERIALIZED VIEW area_metric_latest_mv'))
                    conn.execute(text('REFRESH MATERIALIZED VIEW area_latest_key_metrics_mv'))
                    actions.append('refreshed')
                conn.commit()
            except Exception as e:
                if 'CONCURRENTLY' in str(e).upper() and concurrent:
                    # Ensure we rollback the failed transaction before retrying
                    try:
                        conn.rollback()
                    except Exception:
                        pass
                    # Retry without concurrently
                    try:
                        conn.execute(text('REFRESH MATERIALIZED VIEW area_metric_latest_mv'))
                        conn.execute(text('REFRESH MATERIALIZED VIEW area_latest_key_metrics_mv'))
                        conn.commit()
                        actions.append('refreshed_non_concurrent_fallback')
                    except Exception as e2:
                        return {'success': False, 'error': f'Refresh failed (non-concurrent fallback): {e2}', 'actions': actions}
                else:
                    # Rollback before returning error to clear aborted transaction state
                    try:
                        conn.rollback()
                    except Exception:
                        pass
                    return {'success': False, 'error': f'Refresh failed: {e}', 'actions': actions}
    except Exception as outer:
        return {'success': False, 'error': str(outer), 'actions': actions}
    return {'success': True, 'actions': actions}

@app.route('/api/metrics/materialized/refresh', methods=['POST'])
def api_metrics_materialized_refresh():
    """Admin endpoint: refresh (or recreate + refresh) materialized views.

    Body JSON (all optional):
      { "recreate": false, "concurrent": true, "auth_token": "..." }

    A simple shared secret can be set via ENV MATERIALIZED_REFRESH_TOKEN to restrict access.
    """
    try:
        payload = request.get_json(silent=True) or {}
        recreate = bool(payload.get('recreate'))
        concurrent = payload.get('concurrent', True)
        provided = payload.get('auth_token')
        expected = os.getenv('MATERIALIZED_REFRESH_TOKEN')
        if expected and provided != expected:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        if not _area_metrics_supported():
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        result = _refresh_materialized_views(recreate=recreate, concurrent=concurrent)
        if result.get('success'):
            status = 200
        elif 'unsupported' in str(result.get('error', '')).lower() or 'postgresql' in str(result.get('error', '')).lower():
            status = 400   # expected on SQLite dev env – not a server error
        else:
            status = 500
        return jsonify(result), status
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # Prefer FLASK_ENV for debug decision, default debug True if not production
    debug_mode = os.getenv('FLASK_ENV') != 'production'
    # On Windows, binding to 0.0.0.0:5000 can be blocked or reserved.
    # Use localhost and a non-default port; disable reloader to avoid double bind.
    port = int(os.getenv('PORT', 5050))
    app.run(host='127.0.0.1', port=port, debug=debug_mode, use_reloader=False)

# ================= PROPERTY INSIGHTS (TYPE DISTRIBUTION & SERIES) ==================

@app.route('/api/area/<area_ref>/types/distribution', methods=['GET'])
def api_area_types_distribution(area_ref):
    """Return property-type distribution counts for an area.

    Reads metrics: count_residential, count_commercial, count_industrial, count_retail
    Uses the latest snapshot per metric.
    """
    try:
        if not _area_metrics_supported():
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        resolved_id = _resolve_area_id_flex(area_ref)
        if not resolved_id:
            return jsonify({'success': False, 'error': 'Area not found'}), 404
        latest = _fetch_latest_metrics_for_area(resolved_id, 'count_residential,count_commercial,count_industrial,count_retail')
        dist = []
        code_map = {
            'count_residential': 'residential',
            'count_commercial': 'commercial',
            'count_industrial': 'industrial',
            'count_retail': 'retail'
        }
        for m in latest.get('metrics', []):
            typ = code_map.get(m['code'])
            if not typ:
                continue
            val = m.get('value_numeric')
            if val is None:
                continue
            dist.append({'type': typ, 'count': int(val)})
        return jsonify({'success': True, 'distribution': dist})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<area_ref>/price-series', methods=['GET'])
def api_area_price_series(area_ref):
    """Return average price series per property type for the past N years.

    Query: years=10 (default 10)
    Metrics used: avg_price_residential, avg_price_commercial, avg_price_industrial, avg_price_retail
    """
    try:
        if not _area_metrics_supported():
            return jsonify({'success': False, 'error': 'Metrics schema not initialized'}), 400
        resolved_id = _resolve_area_id_flex(area_ref)
        if not resolved_id:
            return jsonify({'success': False, 'error': 'Area not found'}), 404
        years = max(int(request.args.get('years', 10)), 1)
        # Build date range: last N years from Jan 1 of (current_year - years + 1)
        start_year = date.today().year - years + 1
        start_date = date(start_year, 1, 1)
        codes = {
            'residential': 'avg_price_residential',
            'commercial': 'avg_price_commercial',
            'industrial': 'avg_price_industrial',
            'retail': 'avg_price_retail'
        }
        series = { k: [] for k in codes.keys() }
        # Single SQL to fetch all 4 codes within range
        sql = text("""
            SELECT m.code, v.period_start, v.value_numeric
            FROM area_metric_values v
            JOIN metrics m ON m.id = v.metric_id
            WHERE v.area_id = :area_id
              AND m.code = ANY(:codes)
              AND v.period_start >= :start_date
            ORDER BY m.code, v.period_start
        """)
        with db.engine.connect() as conn:
            rows = conn.execute(sql, {'area_id': resolved_id, 'codes': list(codes.values()), 'start_date': start_date}).mappings().all()
        for r in rows:
            code = r['code']
            val = float(r['value_numeric']) if r['value_numeric'] is not None else None
            if val is None:
                continue
            key = next((k for k,v in codes.items() if v == code), None)
            if not key:
                continue
            series[key].append({'date': r['period_start'].isoformat(), 'value': val})
        return jsonify({'success': True, 'series': series})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
