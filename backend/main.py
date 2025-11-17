from flask import Flask, jsonify, request, send_file, Response
from flask_cors import CORS
from app_config import Config
from db_core import db
from area_models import Country, Province, City, Area, AreaImage, AreaAmenity, MarketTrend as LegacyMarketTrend, AreaStatistics  # keep for potential reuse
from sqlalchemy import func, desc, and_, or_, text, inspect
from datetime import datetime, date
import os
import tempfile
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
CorsAllowedOrigins = ['*']
CORS(app, origins=CorsAllowedOrigins, allow_headers=['Content-Type', 'Authorization'], methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

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
                        ORDER BY is_primary DESC, sort_order ASC, id ASC
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
            if 'latitude' in (area.keys() if isinstance(area, dict) else []):
                lat = float(area['latitude']) if area['latitude'] is not None else None
            if 'longitude' in (area.keys() if isinstance(area, dict) else []):
                lng = float(area['longitude']) if area['longitude'] is not None else None
            if (lat is None or lng is None) and 'coordinates' in (area.keys() if isinstance(area, dict) else []):
                coord = area.get('coordinates')
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
            'province': province['name'] if province else None,
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
        # 2) If none found in static, check DB table area_images for this area
        if not collected:
            try:
                if 'resolved_id' not in locals() or not resolved_id:
                    resolved_id = _resolve_area_id_flex(area_ref)
                # Use direct SQL aligned to schema (title/caption/sort_order)
                with db.engine.connect() as conn:
                    rows = conn.execute(text("""
                        SELECT image_url, COALESCE(title, caption) AS title, caption, is_primary, sort_order
                        FROM area_images
                        WHERE area_id = :id
                        ORDER BY is_primary DESC, sort_order ASC, id ASC
                    """), {'id': resolved_id}).mappings().all()
                for r in rows:
                    collected.append({
                        'image_url': _absolute_url(r['image_url']),
                        'caption': r['title'] or r['caption'] or 'Area image'
                    })
            except Exception:
                pass
        # 3) Fallback placeholder if still empty
        if not collected:
            collected = [{
                'image_url': _absolute_url(f'https://source.unsplash.com/featured/?city,architecture&sig={area_ref}'),
                'caption': 'Representative area image'
            }]
        return jsonify({'success': True, 'images': collected})
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
    """Lightweight area name search endpoint for frontend service."""
    try:
        term = request.args.get('q', '').strip()
        if not term:
            return jsonify({'success': True, 'areas': []})
        like = f"%{term}%"
        driver = db.engine.url.drivername if hasattr(db, 'engine') else ''
        id_expr = "CAST(a.id AS TEXT)" if 'sqlite' in driver else "a.id::text"
        sql = text(f"""
            SELECT a.id, a.name, a.city_id,
                   c.name AS city_name,
                   p.name AS province_name
            FROM areas a
            LEFT JOIN cities c ON c.id = a.city_id
            LEFT JOIN provinces p ON p.id = c.province_id
            WHERE a.name ILIKE :like
               OR lower(trim({id_expr})) = lower(trim(:exact))
               OR {id_expr} ILIKE :like
            ORDER BY a.name
            LIMIT 20
        """)
        with db.engine.connect() as conn:
            rows = conn.execute(sql, {'like': like, 'exact': term}).mappings().all()
        areas_payload = [
            {
                'id': r['id'],
                'name': r['name'],
                'city_id': r['city_id'],
                'city': r['city_name'],
                'province': r['province_name']
            } for r in rows
        ]
        return jsonify({'success': True, 'areas': areas_payload})
    except Exception as e:
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
    Uses window function; falls back gracefully if tables missing."""
    if not _area_metrics_supported():
        return {'available': False, 'metrics': []}
    engine = db.engine
    codes_filter_clause = ''
    params = { 'area_id': area_id }
    if metric_codes:
        codes = [c.strip() for c in metric_codes.split(',') if c.strip()]
        if codes:
            codes_filter_clause = 'AND m.code = ANY(:codes)'
            params['codes'] = codes
    sql = text(f"""
        SELECT m.code,
               m.name,
               m.unit,
               m.category,
               lv.period_start,
               lv.value_numeric,
               lv.value_text,
               lv.value_json,
               lv.source,
               lv.quality_score
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
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, params).mappings().all()
    metrics = []
    for r in rows:
        metrics.append({
            'code': r['code'],
            'name': r['name'],
            'unit': r['unit'],
            'category': r['category'],
            'latest_period_start': r['period_start'].isoformat() if r['period_start'] else None,
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

initialize_database()

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
        status = 200 if result.get('success') else 500
        return jsonify(result), status
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # Prefer FLASK_ENV for debug decision, default debug True if not production
    debug_mode = os.getenv('FLASK_ENV') != 'production'
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=debug_mode)

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
