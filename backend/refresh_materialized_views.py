"""Utility script to (re)create or refresh materialized views for area metrics.

Usage:
  python refresh_materialized_views.py --recreate   # Drops & recreates materialized views
  python refresh_materialized_views.py --refresh    # REFRESH MATERIALIZED VIEW (fast with CONCURRENT if possible)
  python refresh_materialized_views.py --both       # Recreate then refresh

Notes:
- Only meaningful on PostgreSQL. Will exit gracefully if not Postgres.
- Requires the base tables + metrics.
"""
from __future__ import annotations
import argparse
from flask import Flask
from app_config import Config
from db_core import db
from sqlalchemy import text

MV_SQL_FILE = 'area_metrics_materialized.sql'


def load_mv_sql(app):
    with app.open_resource(MV_SQL_FILE, 'r') as f:
        return f.read()


def is_postgres(engine) -> bool:
    return 'postgres' in engine.url.drivername


def recreate(engine, app):
    sql = load_mv_sql(app)
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    print('Materialized views recreated.')


def refresh(engine, concurrent: bool = True):
    with engine.connect() as conn:
        try:
            if concurrent:
                conn.execute(text('REFRESH MATERIALIZED VIEW CONCURRENTLY area_metric_latest_mv'))
                conn.execute(text('REFRESH MATERIALIZED VIEW CONCURRENTLY area_latest_key_metrics_mv'))
            else:
                conn.execute(text('REFRESH MATERIALIZED VIEW area_metric_latest_mv'))
                conn.execute(text('REFRESH MATERIALIZED VIEW area_latest_key_metrics_mv'))
            conn.commit()
            print('Materialized views refreshed.')
        except Exception as e:
            # Retry without CONCURRENTLY
            if 'CONCURRENTLY' in str(e).upper():
                print('Concurrent refresh failed, retrying non-concurrent...')
                conn.execute(text('REFRESH MATERIALIZED VIEW area_metric_latest_mv'))
                conn.execute(text('REFRESH MATERIALIZED VIEW area_latest_key_metrics_mv'))
                conn.commit()
                print('Materialized views refreshed (non-concurrent).')
            else:
                raise


def main():
    parser = argparse.ArgumentParser(description='Manage materialized metric views')
    parser.add_argument('--recreate', action='store_true')
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--both', action='store_true')
    parser.add_argument('--no-concurrent', action='store_true', help='Disable CONCURRENTLY refresh even if possible')
    args = parser.parse_args()

    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        engine = db.engine
        if not is_postgres(engine):
            print('Not a PostgreSQL database; materialized views are skipped.')
            return
        if args.both:
            recreate(engine, app)
            refresh(engine, not args.no_concurrent)
        else:
            if args.recreate:
                recreate(engine, app)
            if args.refresh:
                refresh(engine, not args.no_concurrent)
        if not any([args.recreate, args.refresh, args.both]):
            print('No action specified. Use --recreate, --refresh, or --both.')

if __name__ == '__main__':
    main()
