-- Ensure core schema (countries, provinces, cities, areas, metrics, area_metric_values, area_images, area_amenities)
-- Use \ir to include files relative to this script's directory (works regardless of your shell CWD)
\ir '../area_metrics_schema.sql'

-- Seed minimal hierarchy (ZA -> Gauteng/WC -> Johannesburg/Cape Town -> Sandton, etc.)
\ir 'seed_hierarchy_and_metrics.sql'

-- Seed property-type distribution counts and 10-year price series per type
\ir 'seed_property_insights.sql'

-- Optional: create materialized views / views (uncomment if desired)
-- \ir '../area_metrics_materialized.sql'
