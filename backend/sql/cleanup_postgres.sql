-- Cleanup legacy/unused tables to align the database with the new area+metrics architecture
-- Safe to run multiple times. Only drops tables if they exist.

-- Legacy time-series (replaced by metrics + area_metric_values)
DROP TABLE IF EXISTS area_statistics CASCADE;
DROP TABLE IF EXISTS market_trends CASCADE;

-- Optional: drop any old property-centric tables if they exist in your DB
-- Uncomment lines below if you see these in pgAdmin and you no longer need them
-- DROP TABLE IF EXISTS properties CASCADE;
-- DROP TABLE IF EXISTS owners CASCADE;
-- DROP TABLE IF EXISTS valuations CASCADE;
-- DROP TABLE IF EXISTS zoning CASCADE;
-- DROP TABLE IF EXISTS property_images CASCADE;

-- Note: Do NOT drop tables used by the current app: countries, provinces, cities, areas,
-- metrics, area_metric_values, area_images, area_amenities.
