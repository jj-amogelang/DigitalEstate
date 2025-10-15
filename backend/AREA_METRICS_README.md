# Area-Centric Metrics Schema

This backend now includes an extensible schema focused on geographic hierarchy and time-series metrics instead of individual property listings.

## Goals
- Clean geographic hierarchy: Country → Province → City → Area (suburb)
- Flexible metric catalog (add new metrics without altering tables)
- Historical time series storage for trend charts
- Optional snapshot optimization (view/materialized view later)

## Core Tables
| Table | Purpose |
|-------|---------|
| countries / provinces / cities / areas | Hierarchy nodes |
| metrics | Catalog/definition for each tracked metric |
| area_metric_values | Time series fact table |
| area_images | Media assets per area |
| area_amenities | Descriptive amenity points |

## Extending Metrics
Add a row to `metrics` with a unique `code`. Future inserts into `area_metric_values` can reference this metric id. No schema migration needed.

Example:
```sql
INSERT INTO metrics (code, name, unit, category) VALUES ('population_density', 'Population Density', 'people/km2', 'demographic')
ON CONFLICT (code) DO NOTHING;
```
Then insert data points:
```sql
INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.id, '2025-09-01', 5470, 'census_estimate'
FROM areas a CROSS JOIN metrics m
WHERE a.name='Sandton' AND m.code='population_density';
```

## Initialization Script
Use `initialize_area_metrics.py` for controlled setup.

### Common Scenarios
#### 1. Fresh start (keep legacy tables intact)
```bash
python initialize_area_metrics.py --fresh
```

#### 2. Full reset of hierarchy + metrics
```bash
python initialize_area_metrics.py --reset-area --fresh
```

#### 3. Drop legacy (property-focused) tables and rebuild clean hierarchy
```bash
python initialize_area_metrics.py --drop-legacy --reset-area --fresh
```

#### 4. Dry run (no changes)
```bash
python initialize_area_metrics.py --drop-legacy --reset-area --fresh --dry-run
```

## Query Examples
### Latest values for a given area (Postgres window function)
```sql
SELECT m.code, m.name,
       FIRST_VALUE(v.value_numeric) OVER (PARTITION BY v.metric_id ORDER BY v.period_start DESC) AS latest_value
FROM metrics m
JOIN area_metric_values v ON v.metric_id = m.id
WHERE v.area_id = 42
ORDER BY m.code;
```

### Time series for a metric in an area
```sql
SELECT period_start, value_numeric
FROM area_metric_values v
JOIN metrics m ON m.id = v.metric_id
WHERE m.code='avg_price' AND v.area_id=42
ORDER BY period_start;
```

## Migration Strategy
1. Introduce new API endpoints that read from `area_metric_values`.
2. Deprecate or hide property-centric endpoints on the frontend.
3. Optionally remove legacy tables with `--drop-legacy` once unused.

## Next Steps (Suggested)
- Add API: `/api/areas/<id>/metrics/latest`
- Add API: `/api/areas/<id>/metrics/<metric_code>/series?months=12`
- Add aggregated roll-up metrics at city / province level using views.
- Add background ETL job to ingest periodic CSV/Excel updates.

## Safety Notes
- All DDL is idempotent (uses IF NOT EXISTS / ON CONFLICT) for safe repeated runs.
- Time-series uniqueness per (area_id, metric_id, period_start) prevents duplicate snapshots.

## Support
See `area_metrics_schema.sql` for full DDL and seeding.
