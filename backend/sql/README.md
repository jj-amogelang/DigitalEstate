# Postgres Setup and Cleanup

Use these commands to align your `digitalestate` Postgres database with the new area + metrics architecture.

## 1) Cleanup legacy tables (optional but recommended)

This drops older tables we no longer use (like `area_statistics` and `market_trends`).

```powershell
psql -h localhost -U postgres -d digitalestate -f "c:\\Users\\amoge\\Digital Estate\\backend\\sql\\cleanup_postgres.sql"
```

Review the script before running; uncomment additional drops if you see legacy property-centric tables you don’t need.

## 2) Create/ensure core schema

This runs the flexible area + metrics schema and will do nothing if tables already exist.

```powershell
psql -h localhost -U postgres -d digitalestate -f "c:\\Users\\amoge\\Digital Estate\\backend\\sql\\setup_postgres.sql"
```

By default it includes `area_metrics_schema.sql`. If you want materialized views, uncomment the include for `area_metrics_materialized.sql` in `setup_postgres.sql` and rerun.

## 3) Verify

- Core tables:
  - countries, provinces, cities, areas
  - metrics, area_metric_values
  - area_images, area_amenities
- Optional views/MVs if enabled:
  - area_metric_latest_mv, area_latest_key_metrics_mv

Use pgAdmin or run:

```powershell
psql -h localhost -U postgres -d digitalestate -c "\\dt"
```

## 4) Start backend against Postgres

```powershell
$env:DATABASE_URL = 'postgresql://postgres:01092002@localhost:5432/digitalestate'
python "c:\\Users\\amoge\\Digital Estate\\backend\\main.py"
```

Or run from repo root so `.env` is picked up:

```powershell
cd "c:\\Users\\amoge\\Digital Estate"
python ".\\backend\\main.py"
```

## 5) Notes

- Static images still come from `backend/static/images/areas/<area_id or area name>/...`
- After switching to Postgres, area IDs will be numeric; you can keep name-based folders thanks to the fallback lookup we added.
- Use the API to explore data: `/api/areas/Johannesburg`, `/api/area/<id>`, `/api/area/<id>/statistics`.
