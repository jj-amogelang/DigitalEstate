-- Ensure core hierarchy and metrics schema (idempotent)

-- Countries
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(3) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provinces
CREATE TABLE IF NOT EXISTS provinces (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_id, name)
);
CREATE INDEX IF NOT EXISTS idx_provinces_country_id ON provinces(country_id);

-- Cities
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    province_id INTEGER NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(province_id, name)
);
CREATE INDEX IF NOT EXISTS idx_cities_province_id ON cities(province_id);

-- Areas
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
CREATE INDEX IF NOT EXISTS idx_areas_city_id ON areas(city_id);

-- Metrics catalog
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

-- Optional: images and amenities
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
