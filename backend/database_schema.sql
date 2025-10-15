-- Digital Estate Database Schema
-- Areas, Area Data, and Area Pictures Management

-- 1. Countries Table
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(3) NOT NULL UNIQUE, -- ISO country code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Provinces/States Table
CREATE TABLE provinces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, country_id)
);

-- 3. Cities Table
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    province_id INTEGER REFERENCES provinces(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, province_id)
);

-- 4. Areas Table (Main table for areas)
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
    description TEXT,
    area_type VARCHAR(50), -- residential, commercial, mixed, industrial
    postal_code VARCHAR(20),
    coordinates POINT, -- For latitude/longitude
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, city_id)
);

-- 5. Area Images Table
CREATE TABLE area_images (
    id SERIAL PRIMARY KEY,
    area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    image_title VARCHAR(200),
    image_description TEXT,
    is_primary BOOLEAN DEFAULT FALSE, -- Main hero image
    image_order INTEGER DEFAULT 0, -- For sorting multiple images
    uploaded_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id)
);

-- 6. Area Statistics Table (Market Data)
CREATE TABLE area_statistics (
    id SERIAL PRIMARY KEY,
    area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE,
    
    -- Property Price Data
    average_property_price DECIMAL(15,2),
    median_property_price DECIMAL(15,2),
    price_per_sqm DECIMAL(10,2),
    price_growth_yoy DECIMAL(5,2), -- Year over year percentage
    
    -- Rental Data
    average_rental_price DECIMAL(10,2),
    rental_yield DECIMAL(5,2),
    rental_growth_yoy DECIMAL(5,2),
    vacancy_rate DECIMAL(5,2),
    
    -- Market Metrics
    days_on_market INTEGER,
    total_properties_sold INTEGER,
    total_rental_properties INTEGER,
    
    -- Area Quality Metrics
    crime_index_score INTEGER, -- 0-100 scale
    education_score INTEGER, -- 0-100 scale
    transport_score INTEGER, -- 0-100 scale
    amenities_score INTEGER, -- 0-100 scale
    
    -- Data collection period
    data_period_start DATE,
    data_period_end DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (area_id) REFERENCES areas(id)
);

-- 7. Area Amenities Table
CREATE TABLE area_amenities (
    id SERIAL PRIMARY KEY,
    area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE,
    amenity_type VARCHAR(50) NOT NULL, -- school, hospital, mall, transport, etc.
    name VARCHAR(200) NOT NULL,
    distance_km DECIMAL(5,2), -- Distance from area center
    rating DECIMAL(3,2), -- 1-5 star rating
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Market Trends Table (Historical data)
CREATE TABLE market_trends (
    id SERIAL PRIMARY KEY,
    area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- price, rental, vacancy, etc.
    metric_value DECIMAL(15,2) NOT NULL,
    metric_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(area_id, metric_type, metric_date)
);

-- Create indexes for better performance
CREATE INDEX idx_areas_city_id ON areas(city_id);
CREATE INDEX idx_cities_province_id ON cities(province_id);
CREATE INDEX idx_provinces_country_id ON provinces(country_id);
CREATE INDEX idx_area_images_area_id ON area_images(area_id);
CREATE INDEX idx_area_images_primary ON area_images(area_id, is_primary);
CREATE INDEX idx_area_statistics_area_id ON area_statistics(area_id);
CREATE INDEX idx_area_amenities_area_id ON area_amenities(area_id);
CREATE INDEX idx_market_trends_area_date ON market_trends(area_id, metric_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_area_statistics_updated_at BEFORE UPDATE ON area_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();