-- =============================================================================
-- province_snapshots_schema.sql
-- =============================================================================
-- Province-level real estate market snapshot table.
-- Stores periodic (monthly/quarterly) KPIs sourced from seed data, scraped
-- sources, or future API integrations.
--
-- Safe to run multiple times (all DDL uses IF NOT EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS province_snapshots (
    id                      SERIAL          PRIMARY KEY,
    province_id             INTEGER         NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
    snapshot_date           DATE            NOT NULL,

    -- ── Pricing ──────────────────────────────────────────────────────────────
    avg_sale_price          NUMERIC(14,2),
    median_sale_price       NUMERIC(14,2),
    price_per_sqm           NUMERIC(10,2),
    price_growth_yoy        NUMERIC(6,2),   -- %

    -- ── Rental ───────────────────────────────────────────────────────────────
    avg_rental_yield        NUMERIC(5,2),   -- %
    avg_vacancy_rate        NUMERIC(5,2),   -- %
    avg_rental_price        NUMERIC(10,2),  -- monthly ZAR

    -- ── Volume ───────────────────────────────────────────────────────────────
    quarterly_sales_volume  INTEGER,
    active_listings         INTEGER,
    avg_days_on_market      NUMERIC(6,1),

    -- ── Quality of Life ──────────────────────────────────────────────────────
    avg_transport_score     NUMERIC(5,1),   -- 0-100
    avg_crime_index         NUMERIC(5,1),   -- 0-100 (lower = safer)
    avg_amenities_score     NUMERIC(5,1),   -- 0-100
    avg_education_score     NUMERIC(5,1),   -- 0-100

    -- ── Development Pipeline ─────────────────────────────────────────────────
    total_planned_dev       INTEGER,
    completed_dev_ytd       INTEGER,
    approved_rezoning       INTEGER,

    -- ── Demographics ─────────────────────────────────────────────────────────
    population_estimate     BIGINT,
    population_growth_rate  NUMERIC(5,2),   -- % YoY
    household_income_median NUMERIC(12,2),  -- ZAR annual

    -- ── Market Signals ───────────────────────────────────────────────────────
    investment_grade        VARCHAR(3),     -- A+, A, B+, B, C
    market_sentiment        VARCHAR(20),    -- hot, rising, stable, cooling, cold
    affordability_index     NUMERIC(5,2),   -- price / annual income ratio

    -- ── Metadata ─────────────────────────────────────────────────────────────
    source                  VARCHAR(120)    DEFAULT 'seed',
    notes                   TEXT,
    created_at              TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(province_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_prov_snap_province_date
    ON province_snapshots(province_id, snapshot_date DESC);
