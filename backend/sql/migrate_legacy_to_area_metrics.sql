-- Migration: Align existing tables to area+metrics architecture
-- Safe, idempotent: uses IF NOT EXISTS and avoids dropping anything

-- Countries: add code + timestamps if missing
ALTER TABLE IF EXISTS countries
  ADD COLUMN IF NOT EXISTS code VARCHAR(3) UNIQUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Provinces: add timestamps if missing
ALTER TABLE IF EXISTS provinces
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Cities: add timestamps if missing
ALTER TABLE IF EXISTS cities
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Areas: add extended columns + timestamps if missing
ALTER TABLE IF EXISTS areas
  ADD COLUMN IF NOT EXISTS slug VARCHAR(180),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Metrics catalog (create if missing)
CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    unit VARCHAR(40),
    category VARCHAR(60),
    data_type VARCHAR(20) DEFAULT 'numeric',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Area metric time series
CREATE TABLE IF NOT EXISTS area_metric_values (
    id BIGSERIAL PRIMARY KEY,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    metric_id INTEGER NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE,
    value_numeric DECIMAL(18,4),
    value_text TEXT,
    value_json JSONB,
    source VARCHAR(120),
    source_reference TEXT,
    quality_score SMALLINT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(area_id, metric_id, period_start)
);
CREATE INDEX IF NOT EXISTS idx_amv_area_metric ON area_metric_values(area_id, metric_id);
CREATE INDEX IF NOT EXISTS idx_amv_metric_period ON area_metric_values(metric_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_amv_area_period ON area_metric_values(area_id, period_start DESC);

-- Optional supporting tables
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

CREATE TABLE IF NOT EXISTS area_amenities (
    id SERIAL PRIMARY KEY,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    amenity_type VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    distance_km DECIMAL(5,2),
    rating DECIMAL(3,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_area_amenities_area_id ON area_amenities(area_id);
CREATE INDEX IF NOT EXISTS idx_area_amenities_type ON area_amenities(amenity_type);

-- Update triggers helper (idempotent)
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='countries') THEN
    BEGIN
      CREATE TRIGGER trg_countries_updated BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='provinces') THEN
    BEGIN
      CREATE TRIGGER trg_provinces_updated BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='cities') THEN
    BEGIN
      CREATE TRIGGER trg_cities_updated BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='areas') THEN
    BEGIN
      CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='metrics') THEN
    BEGIN
      CREATE TRIGGER trg_metrics_updated BEFORE UPDATE ON metrics FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- Seed core metrics defensively
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
 ('amenities_score', 'Amenities Score', 'Access to key amenities score', 'score', 'quality')
) AS s(code,name,description,unit,category)
WHERE NOT EXISTS (SELECT 1 FROM metrics m WHERE m.code = s.code);
