-- Ensure core schema (countries, provinces, cities, areas, metrics, area_metric_values, area_images, area_amenities)
-- Use \ir to include files relative to this script's directory (works regardless of your shell CWD)
\ir '../area_metrics_schema.sql'

-- Optional: create materialized views / views (uncomment if desired)
-- \ir '../area_metrics_materialized.sql'
