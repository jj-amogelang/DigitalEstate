-- =============================================================================
-- parcel_snapshots_migration.sql
-- =============================================================================
-- Creates the parcel_snapshots table and all recommended indices for the
-- Centre-of-Gravity solver query layer.
--
-- Safe to run multiple times (all DDL uses IF NOT EXISTS / IF NOT EXISTS
-- equivalents).  No existing tables are modified.
--
-- Apply to your Neon PostgreSQL instance with:
--   psql $DATABASE_URL -f sql/parcel_snapshots_migration.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parcel_snapshots (
    id             BIGSERIAL    PRIMARY KEY,
    area_id        INTEGER      NOT NULL
                                REFERENCES areas(id) ON DELETE CASCADE,
    lat            DOUBLE PRECISION NOT NULL,
    lng            DOUBLE PRECISION NOT NULL,
    zoning_code    VARCHAR(30)  NOT NULL DEFAULT 'mixed',
    hazard_flag    BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Five CoG investment metrics (NULL = "use area-level fallback")
    rental_yield   NUMERIC(6, 3),    -- gross yield %,     e.g. 7.250
    price_per_m2   NUMERIC(12, 2),   -- ZAR / m²,          e.g. 18500.00
    vacancy        NUMERIC(5, 2),    -- vacancy rate %,     e.g. 7.50
    transit_score  NUMERIC(5, 1),    -- transit proximity,  0–100
    footfall_score NUMERIC(5, 1),    -- pedestrian traffic, 0–100

    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION _ps_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    CREATE TRIGGER trg_ps_updated_at
        BEFORE UPDATE ON parcel_snapshots
        FOR EACH ROW EXECUTE FUNCTION _ps_touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- -----------------------------------------------------------------------------
-- 2. Comment documentation
-- -----------------------------------------------------------------------------
COMMENT ON TABLE  parcel_snapshots               IS 'Materialised geo-parcel store for the CoG solver. Written by ETL; read-only from solver.';
COMMENT ON COLUMN parcel_snapshots.zoning_code   IS 'Lower-cased zoning label: residential | commercial | mixed | industrial | retail';
COMMENT ON COLUMN parcel_snapshots.hazard_flag   IS 'TRUE when parcel is in a defined flood/fire/infrastructure hazard zone';
COMMENT ON COLUMN parcel_snapshots.rental_yield  IS 'Gross rental yield percentage, e.g. 7.25 means 7.25%';
COMMENT ON COLUMN parcel_snapshots.price_per_m2  IS 'Price per square metre in ZAR';
COMMENT ON COLUMN parcel_snapshots.transit_score IS 'Composite transit-proximity score 0–100 (higher = better)';


-- -----------------------------------------------------------------------------
-- 3. Indices
-- -----------------------------------------------------------------------------

-- (a) Basic area filter
--     Used by: fetch_all_parcels()
CREATE INDEX IF NOT EXISTS ix_ps_area_id
    ON parcel_snapshots (area_id);


-- (b) Full feasibility composite — covers any combination of area_id + zoning
--     + hazard_flag in a single btree traversal.
--     Used by: fetch_feasible_parcels() when exclude_hazard=False
CREATE INDEX IF NOT EXISTS ix_ps_area_zoning_hazard
    ON parcel_snapshots (area_id, zoning_code, hazard_flag);


-- (c) Partial index — non-hazard parcels only.
--     ~10 % smaller than (b) when ~10 % of parcels have hazard_flag=TRUE.
--     Postgres prefers this plan when the query has "AND hazard_flag = FALSE"
--     because the predicate matches the index definition exactly.
--     Used by: fetch_feasible_parcels() when exclude_hazard=True  ← hot path
CREATE INDEX IF NOT EXISTS ix_ps_area_zoning_safe
    ON parcel_snapshots (area_id, zoning_code)
    WHERE hazard_flag = FALSE;


-- (d) Covering index — includes all five metric columns.
--     Enables index-only scans: Postgres never touches the heap when
--     SELECT-ing the full parcel payload for an area.
--     This removes the dominant I/O cost for areas with 200–2 000 parcels.
CREATE INDEX IF NOT EXISTS ix_ps_area_covering
    ON parcel_snapshots (
        area_id,
        lat,
        lng,
        zoning_code,
        hazard_flag,
        rental_yield,
        price_per_m2,
        vacancy,
        transit_score,
        footfall_score
    );


-- -----------------------------------------------------------------------------
-- 4. Optional: BRIN index on created_at for time-range admin queries
--    (much smaller than btree for append-only tables)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_ps_created_brin
    ON parcel_snapshots USING BRIN (created_at);


-- -----------------------------------------------------------------------------
-- 5. Useful maintenance queries (informational — not executed)
-- -----------------------------------------------------------------------------
/*
-- Check index usage after a load run:
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM   pg_stat_user_indexes
WHERE  relname = 'parcel_snapshots'
ORDER  BY idx_scan DESC;

-- Check index-only scan ratio (should be high after VACUUM ANALYZE):
SELECT relname,
       heap_blks_read,
       heap_blks_hit,
       idx_blks_read,
       idx_blks_hit
FROM   pg_statio_user_tables
WHERE  relname = 'parcel_snapshots';

-- Force stats refresh after bulk load:
VACUUM ANALYZE parcel_snapshots;

-- Example: load parcels from an area_statistics row (no per-property coords):
-- (Use this pattern in your ETL to seed synthetic parcels from area-level data)
INSERT INTO parcel_snapshots
    (area_id, lat, lng, zoning_code, hazard_flag,
     rental_yield, price_per_m2, vacancy, transit_score, footfall_score)
SELECT
    s.area_id,
    -- jitter applied externally before INSERT
    :lat_value,
    :lng_value,
    'mixed',
    FALSE,
    s.rental_yield,
    s.price_per_sqm,
    s.vacancy_rate,
    s.transport_score,
    s.amenities_score
FROM area_statistics s
WHERE s.area_id = :area_id
ORDER BY s.created_at DESC
LIMIT 1;
*/
