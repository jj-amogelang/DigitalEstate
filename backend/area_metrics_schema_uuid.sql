-- UUID-compatible Area Metrics Schema (use when areas.id is UUID)

-- Assumes hierarchy tables (countries, provinces, cities, areas) already exist,
-- with areas.id of type UUID.

-- 5. Area Images (UUID FK)
CREATE TABLE IF NOT EXISTS area_images (
    id SERIAL PRIMARY KEY,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title VARCHAR(200),
    caption TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_area_images_area_id ON area_images(area_id);
CREATE INDEX IF NOT EXISTS idx_area_images_primary ON area_images(area_id, is_primary);

-- 6. Amenities (UUID FK)
CREATE TABLE IF NOT EXISTS area_amenities (
    id SERIAL PRIMARY KEY,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    amenity_type VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    distance_km DECIMAL(5,2),
    rating DECIMAL(3,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_area_amenities_area_id ON area_amenities(area_id);
CREATE INDEX IF NOT EXISTS idx_area_amenities_type ON area_amenities(amenity_type);

-- 7. Metrics Catalog (same as integer variant)
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

-- 8. Area Metric Time Series (UUID FK to areas)
CREATE TABLE IF NOT EXISTS area_metric_values (
    id BIGSERIAL PRIMARY KEY,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
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

-- 10. Helper function to update updated_at (idempotent re-create)
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='metrics') THEN
    BEGIN
      CREATE TRIGGER trg_metrics_updated BEFORE UPDATE ON metrics FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 11. Seed minimal metrics (idempotent)
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
