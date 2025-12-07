"""Initialize or reset the database for Area-centric exploration.

Usage (development):
  1. Set DATABASE_URL or rely on existing Flask Config in app_config.
  2. Run: python initialize_area_metrics.py --drop-legacy --fresh

Options:
  --dry-run       Show what would happen without executing destructive actions.
  --fresh         Creates hierarchy + metric tables if missing and seeds base data.
  --drop-legacy   Drops property-specific tables (properties, enhanced_properties, valuations, zoning, market_trends legacy) for a clean area-only setup.
  --reset-area    Deletes existing area hierarchy & metrics data (countries..areas, area_metric_values) then recreates & seeds.

Safe defaults: running with no flags only creates missing tables & seeds metric catalog.
"""
from __future__ import annotations
import argparse
import sys
from datetime import date
from flask import Flask
from app_config import Config
from db_core import db
from sqlalchemy import text, inspect

LEGACY_TABLES = [
    'properties', 'enhanced_properties', 'valuations', 'zoning', 'market_trends', 'legacy_properties'
]
HIERARCHY_TABLES = ['area_metric_values', 'area_amenities', 'area_images', 'areas', 'cities', 'provinces', 'countries', 'metrics']

SCHEMA_FILE = 'area_metrics_schema.sql'
VIEWS_FILE = 'area_metrics_views.sql'

seed_locations = [
    # country, province, city, area
    ('South Africa', 'ZA', 'Gauteng', 'Johannesburg', [
        'Sandton', 'Rosebank', 'Fourways', 'Randburg'
    ]),
    ('South Africa', 'ZA', 'Western Cape', 'Cape Town', [
        'Sea Point', 'Claremont', 'Rondebosch', 'Observatory'
    ])
]

SEED_METRIC_POINTS = [
    # (area_name, metric_code, period_start, value)
    ('Sandton', 'avg_price', '2025-09-01', 3250000),
    ('Sandton', 'rental_yield', '2025-09-01', 7.2),
    ('Sandton', 'vacancy_rate', '2025-09-01', 6.5),
    ('Sandton', 'crime_index', '2025-09-01', 42),
    ('Sandton', 'population_growth', '2025-09-01', 1.8),
    ('Sandton', 'planned_dev_count', '2025-09-01', 7),
    ('Rosebank', 'avg_price', '2025-09-01', 2890000),
    ('Sea Point', 'avg_price', '2025-09-01', 5400000),
    ('Sea Point', 'rental_yield', '2025-09-01', 5.8),
]

def load_schema_sql(app):
    with app.open_resource(SCHEMA_FILE, 'r') as f:
        return f.read()

def load_views_sql(app):
    try:
        with app.open_resource(VIEWS_FILE, 'r') as f:
            return f.read()
    except FileNotFoundError:
        return ''

def table_exists(engine, name: str) -> bool:
    insp = inspect(engine)
    return insp.has_table(name)

def drop_table(engine, name: str, dry: bool):
    if not table_exists(engine, name):
        return
    if dry:
        print(f"[dry-run] Would drop table {name}")
        return
    print(f"Dropping table {name}")
    with engine.connect() as conn:
        conn.execute(text(f'DROP TABLE IF EXISTS {name} CASCADE'))
        conn.commit()

def ensure_schema(app, engine, dry: bool):
    sql = load_schema_sql(app)
    # Sanitize: prevent SQLAlchemy from interpreting placeholders in commented example lines
    # e.g., ":area_id" inside a "--" comment would be treated as a bind param otherwise.
    safe_lines = []
    for line in sql.splitlines():
        stripped = line.lstrip()
        # Drop single-line SQL comments entirely to avoid driver parsing placeholders inside comments
        if stripped.startswith('--'):
            continue
        safe_lines.append(line)
    sql = '\n'.join(safe_lines)
    if dry:
        print("[dry-run] Would execute schema SQL to create/ensure tables")
        return
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    print("Schema ensured (area metrics tables present)")
    views_sql = load_views_sql(app)
    if views_sql.strip():
        with engine.connect() as conn:
            conn.execute(text(views_sql))
            conn.commit()
        print("Views created/updated (area_metric_latest, area_latest_key_metrics)")

def seed_hierarchy_and_metrics(engine, dry: bool):
    if dry:
        print("[dry-run] Would seed base hierarchy and metric values")
        return
    with engine.begin() as conn:
        # Helper upsert-like functions that work without unique constraints
        def get_or_create_country(name, code):
            # Prefer an existing row with the target code to avoid unique constraint issues
            code_row = conn.execute(text("SELECT id, code FROM countries WHERE code = :c"), {'c': code}).first()
            if code_row:
                return code_row.id
            # Otherwise use a name match
            row = conn.execute(text("SELECT id, code FROM countries WHERE lower(name)=lower(:n) ORDER BY id LIMIT 1"), {'n': name}).first()
            if row:
                # Only update code if no other row has it (checked above)
                if not row.code:
                    try:
                        conn.execute(text("UPDATE countries SET code=:c WHERE id=:id"), {'c': code, 'id': row.id})
                    except Exception:
                        pass
                return row.id
            return conn.execute(text("INSERT INTO countries (name, code) VALUES (:n,:c) RETURNING id"), {'n': name, 'c': code}).scalar()

        def get_or_create_province(country_id, name):
            row = conn.execute(text("SELECT id FROM provinces WHERE country_id=:cid AND lower(name)=lower(:n)"), {'cid': country_id, 'n': name}).first()
            if row:
                return row.id
            return conn.execute(text("INSERT INTO provinces (country_id, name) VALUES (:cid,:n) RETURNING id"), {'cid': country_id, 'n': name}).scalar()

        def get_or_create_city(province_id, name):
            row = conn.execute(text("SELECT id FROM cities WHERE province_id=:pid AND lower(name)=lower(:n)"), {'pid': province_id, 'n': name}).first()
            if row:
                return row.id
            return conn.execute(text("INSERT INTO cities (province_id, name) VALUES (:pid,:n) RETURNING id"), {'pid': province_id, 'n': name}).scalar()

        def ensure_area(city_id, name):
            row = conn.execute(text("SELECT id FROM areas WHERE city_id=:cid AND lower(name)=lower(:n)"), {'cid': city_id, 'n': name}).first()
            if row:
                return row.id
            return conn.execute(text("INSERT INTO areas (city_id, name) VALUES (:cid,:n) RETURNING id"), {'cid': city_id, 'n': name}).scalar()

        # Countries / Provinces / Cities / Areas
        for country_name, code, province_name, city_name, areas in seed_locations:
            country_id = get_or_create_country(country_name, code)
            province_id = get_or_create_province(country_id, province_name)
            city_id = get_or_create_city(province_id, city_name)
            for a in areas:
                ensure_area(city_id, a)
        # Metrics catalog already seeded by schema SQL.
        # Insert metric values
        for area_name, metric_code, period_start, val in SEED_METRIC_POINTS:
            area_row = conn.execute(text("SELECT a.id FROM areas a WHERE a.name=:n"), {'n': area_name}).first()
            metric_row = conn.execute(text("SELECT m.id FROM metrics m WHERE m.code=:c"), {'c': metric_code}).first()
            if area_row and metric_row:
                conn.execute(text("INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source) VALUES (:a,:m,:ps,:v,'seed') ON CONFLICT (area_id, metric_id, period_start) DO NOTHING"), {'a': area_row.id, 'm': metric_row.id, 'ps': period_start, 'v': val})
    print("Seed data inserted (hierarchy + example metrics)")

def parse_args():
    p = argparse.ArgumentParser(description="Initialize / reset area metrics DB")
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--fresh', action='store_true', help='Create schema if missing')
    p.add_argument('--drop-legacy', action='store_true', help='Drop legacy property-related tables')
    p.add_argument('--reset-area', action='store_true', help='Delete existing hierarchy + metrics then recreate + seed')
    return p.parse_args()

def main():
    args = parse_args()
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        engine = db.engine

        if args.drop_legacy:
            print("-- drop-legacy requested")
            for t in LEGACY_TABLES:
                drop_table(engine, t, args.dry_run)

        if args.reset_area:
            print("-- reset-area requested (will drop hierarchy + metrics tables)")
            for t in HIERARCHY_TABLES:
                drop_table(engine, t, args.dry_run)

        if args.fresh or args.reset_area:
            ensure_schema(app, engine, args.dry_run)
            seed_hierarchy_and_metrics(engine, args.dry_run)
        else:
            # Always ensure metrics table exists + seed catalog if missing
            ensure_schema(app, engine, args.dry_run)
            seed_hierarchy_and_metrics(engine, args.dry_run)

        print("Done.")

if __name__ == '__main__':
    main()
