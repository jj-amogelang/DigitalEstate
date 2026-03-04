-- DigitalEstate — search & performance indices
-- Run once against Neon Postgres.  All statements are idempotent (IF NOT EXISTS).
-- Uses CONCURRENTLY so existing reads/writes are not blocked.

-- 1. Case-insensitive area name lookup (powers /api/areas/search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_areas_name_lower
    ON areas (lower(name));

-- 2. Starts-with autocomplete (prefix scan)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_areas_name_lower_prefix
    ON areas (lower(name) text_pattern_ops);

-- 3. Postal code exact + prefix lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_areas_postal_code_lower
    ON areas (lower(postal_code))
    WHERE postal_code IS NOT NULL;

-- 4. Foreign key indices (speed up joins in search_areas and province queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_areas_city_id
    ON areas (city_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cities_province_id
    ON cities (province_id);

-- 5. AreaStatistics latest-per-area (used by summary + why-chosen + recommended)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_area_stats_area_created
    ON area_statistics (area_id, created_at DESC);

-- 6. Optional: trigram full-text search (requires pg_trgm extension)
--    Enables fast ILIKE '%term%' scans rather than sequential scans.
--    Uncomment if pg_trgm is enabled on your Neon database:
--
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_areas_name_trgm
--     ON areas USING gin (lower(name) gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cities_name_trgm
--     ON cities USING gin (lower(name) gin_trgm_ops);
