-- New Flexible Area Metrics Schema (v1)
-- Focus: Geographic hierarchy + extensible metrics time series + easy latest snapshot access
-- Safe to apply alongside existing tables (uses distinct table names where overlap risk exists)
-- If starting fresh, you can drop legacy tables and rename these to canonical names.

-- 1. Countries (keep if multi-country scope needed)
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(3) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Provinces
CREATE TABLE IF NOT EXISTS provinces (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_id, name)
);

-- 3. Cities
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    province_id INTEGER NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(province_id, name)
);

-- 4. Areas (aka suburbs / neighbourhoods)
CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180),
    description TEXT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city_id, name)
);

-- 5. Area Images
CREATE TABLE IF NOT EXISTS area_images (
    id SERIAL PRIMARY KEY,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title VARCHAR(200),
    caption TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_area_images_area_id ON area_images(area_id);
CREATE INDEX IF NOT EXISTS idx_area_images_primary ON area_images(area_id, is_primary);

-- 6. Amenities (static descriptive points)
CREATE TABLE IF NOT EXISTS area_amenities (
    id SERIAL PRIMARY KEY,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    amenity_type VARCHAR(50) NOT NULL, -- school, hospital, transport, mall, etc.
    name VARCHAR(200) NOT NULL,
    distance_km DECIMAL(5,2),
    rating DECIMAL(3,2),
    metadata JSONB, -- optional structured data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_area_amenities_area_id ON area_amenities(area_id);
CREATE INDEX IF NOT EXISTS idx_area_amenities_type ON area_amenities(amenity_type);

-- 7. Metrics Catalog (extensible definition of each metric)
CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    code VARCHAR(60) NOT NULL UNIQUE,          -- e.g. avg_price, rental_yield, vacancy_rate
    name VARCHAR(120) NOT NULL,                -- Human friendly label
    description TEXT,
    unit VARCHAR(40),                          -- e.g. ZAR, %, days, score
    category VARCHAR(60),                      -- pricing, rental, market, quality, population
    data_type VARCHAR(20) DEFAULT 'numeric',   -- numeric | text | json
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Area Metric Time Series (fact table)
CREATE TABLE IF NOT EXISTS area_metric_values (
    id BIGSERIAL PRIMARY KEY,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    metric_id INTEGER NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE,                           -- nullable for point-in-time metrics
    value_numeric DECIMAL(18,4),
    value_text TEXT,
    value_json JSONB,
    source VARCHAR(120),                       -- data source name / file / API
    source_reference TEXT,                     -- optional URL or document ID
    quality_score SMALLINT,                    -- 0-100 confidence
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(area_id, metric_id, period_start)   -- prevents accidental duplicates
);
CREATE INDEX IF NOT EXISTS idx_amv_area_metric ON area_metric_values(area_id, metric_id);
CREATE INDEX IF NOT EXISTS idx_amv_metric_period ON area_metric_values(metric_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_amv_area_period ON area_metric_values(area_id, period_start DESC);

-- 9. (Optional) Materialized latest snapshot (faster reads) - Postgres only
-- For SQLite or if you prefer not to manage refresh, skip this section.
-- A view approach (Postgres syntax):
-- CREATE OR REPLACE VIEW area_metric_latest AS
-- SELECT DISTINCT ON (area_id, metric_id)
--     id, area_id, metric_id, period_start, period_end,
--     value_numeric, value_text, value_json, source, quality_score, created_at
-- FROM area_metric_values
-- ORDER BY area_id, metric_id, period_start DESC, created_at DESC;

-- 10. Helper function to update updated_at columns
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='countries') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_countries_updated') THEN
      CREATE TRIGGER trg_countries_updated BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='provinces') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_provinces_updated') THEN
      CREATE TRIGGER trg_provinces_updated BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='cities') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_cities_updated') THEN
      CREATE TRIGGER trg_cities_updated BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='areas') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_areas_updated') THEN
      CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='metrics') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_metrics_updated') THEN
      CREATE TRIGGER trg_metrics_updated BEFORE UPDATE ON metrics FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    END IF;
  END IF;
END $$;

-- 11. Seed minimal metrics if empty (idempotent)
INSERT INTO metrics (code, name, description, unit, category)
SELECT * FROM (VALUES
 ('avg_price', 'Average Sale Price', 'Average transacted sale price for the period', 'ZAR', 'pricing'),
 ('median_price', 'Median Sale Price', 'Median transacted sale price for the period', 'ZAR', 'pricing'),
 ('price_per_sqm', 'Average Price per Square Meter', 'Average price per square meter', 'ZAR/m2', 'pricing'),
 ('rental_yield', 'Gross Rental Yield', 'Annual rental income / property value', '%', 'rental'),
 ('vacancy_rate', 'Vacancy Rate', 'Percentage of stock vacant', '%', 'rental'),
 ('days_on_market', 'Average Days on Market', 'Average listing days before sale', 'days', 'market'),
 ('sales_volume', 'Sales Volume', 'Number of recorded sales', 'count', 'market'),
 ('crime_index', 'Crime Index Score', 'Relative crime risk score (0-100)', 'score', 'quality'),
 ('education_score', 'Education Score', 'Access & quality of education score', 'score', 'quality'),
 ('transport_score', 'Transport Accessibility Score', 'Public transport & road access score', 'score', 'quality'),
 ('amenities_score', 'Amenities Score', 'Access to key amenities score', 'score', 'quality'),
 ('population_growth', 'Population Growth Rate', 'Year-over-year population growth rate', '%', 'demographic'),
 ('planned_dev_count', 'Planned Development Count', 'Count of planned developments in pipeline', 'count', 'development')
) AS s(code,name,description,unit,category)
WHERE NOT EXISTS (SELECT 1 FROM metrics m WHERE m.code = s.code);

-- Example query to fetch latest metrics for an area (Postgres):
-- SELECT m.code, m.name,
--        FIRST_VALUE(amv.value_numeric) OVER (PARTITION BY amv.metric_id ORDER BY amv.period_start DESC) AS latest_value
-- FROM metrics m
-- JOIN area_metric_values amv ON amv.metric_id = m.id AND amv.area_id = :area_id;

-- To insert a new data point:
-- INSERT INTO area_metric_values (area_id, metric_id, period_start, period_end, value_numeric, source)
-- VALUES (42, (SELECT id FROM metrics WHERE code='avg_price'), '2025-09-01', '2025-09-30', 3250000, 'research_import');
