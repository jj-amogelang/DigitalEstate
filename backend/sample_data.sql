-- Sample Data for Digital Estate Database
-- Insert demo data for testing the dashboard

-- Insert Countries
INSERT INTO countries (name, code) VALUES 
('South Africa', 'ZA'),
('United States', 'US'),
('United Kingdom', 'GB'),
('Canada', 'CA');

-- Insert Provinces (South Africa focus)
INSERT INTO provinces (name, country_id) VALUES 
('Gauteng', (SELECT id FROM countries WHERE code = 'ZA')),
('Western Cape', (SELECT id FROM countries WHERE code = 'ZA')),
('KwaZulu-Natal', (SELECT id FROM countries WHERE code = 'ZA')),
('Eastern Cape', (SELECT id FROM countries WHERE code = 'ZA'));

-- Insert Cities
INSERT INTO cities (name, province_id) VALUES 
-- Gauteng cities
('Johannesburg', (SELECT id FROM provinces WHERE name = 'Gauteng')),
('Pretoria', (SELECT id FROM provinces WHERE name = 'Gauteng')),
('Germiston', (SELECT id FROM provinces WHERE name = 'Gauteng')),

-- Western Cape cities
('Cape Town', (SELECT id FROM provinces WHERE name = 'Western Cape')),
('Stellenbosch', (SELECT id FROM provinces WHERE name = 'Western Cape')),
('George', (SELECT id FROM provinces WHERE name = 'Western Cape')),

-- KwaZulu-Natal cities
('Durban', (SELECT id FROM provinces WHERE name = 'KwaZulu-Natal')),
('Pietermaritzburg', (SELECT id FROM provinces WHERE name = 'KwaZulu-Natal'));

-- Insert Areas (Premium South African areas)
INSERT INTO areas (name, city_id, description, area_type, postal_code) VALUES 
-- Johannesburg areas
('Sandton', (SELECT id FROM cities WHERE name = 'Johannesburg'), 'Premier business and residential district known for luxury living', 'mixed', '2196'),
('Rosebank', (SELECT id FROM cities WHERE name = 'Johannesburg'), 'Trendy commercial and residential hub with excellent amenities', 'mixed', '2196'),
('Melrose', (SELECT id FROM cities WHERE name = 'Johannesburg'), 'Upmarket residential area with beautiful homes', 'residential', '2196'),
('Hyde Park', (SELECT id FROM cities WHERE name = 'Johannesburg'), 'Exclusive residential area with luxury properties', 'residential', '2196'),
('Fourways', (SELECT id FROM cities WHERE name = 'Johannesburg'), 'Modern suburban development with shopping centers', 'residential', '2055'),

-- Cape Town areas
('Camps Bay', (SELECT id FROM cities WHERE name = 'Cape Town'), 'Stunning beachfront location with mountain views', 'residential', '8005'),
('Sea Point', (SELECT id FROM cities WHERE name = 'Cape Town'), 'Popular coastal suburb with apartment living', 'residential', '8005'),
('Constantia', (SELECT id FROM cities WHERE name = 'Cape Town'), 'Wine-producing area with luxury estates', 'residential', '7806'),
('Waterfront', (SELECT id FROM cities WHERE name = 'Cape Town'), 'Mixed-use development with shopping and residential', 'mixed', '8001'),
('Clifton', (SELECT id FROM cities WHERE name = 'Cape Town'), 'Exclusive beachfront location with luxury homes', 'residential', '8005'),

-- Durban areas
('Umhlanga', (SELECT id FROM cities WHERE name = 'Durban'), 'Upmarket coastal area with hotels and residences', 'mixed', '4320'),
('Morningside', (SELECT id FROM cities WHERE name = 'Durban'), 'Established residential suburb with good schools', 'residential', '4001'),

-- Pretoria areas
('Waterkloof', (SELECT id FROM cities WHERE name = 'Pretoria'), 'Prestigious diplomatic area with embassies', 'residential', '0181'),
('Menlyn', (SELECT id FROM cities WHERE name = 'Pretoria'), 'Commercial hub with shopping and business centers', 'mixed', '0063');

-- Insert Area Images (Sample image URLs - you'll replace with actual images)
INSERT INTO area_images (area_id, image_url, image_title, image_description, is_primary, image_order) VALUES 
-- Sandton images
((SELECT id FROM areas WHERE name = 'Sandton'), 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop', 'Sandton City Skyline', 'Modern skyscrapers and business district', true, 1),
((SELECT id FROM areas WHERE name = 'Sandton'), 'https://images.unsplash.com/photo-1558618666-fbd2c4a66b1d?w=800&h=400&fit=crop', 'Sandton Shopping', 'Luxury shopping centers and retail', false, 2),

-- Camps Bay images
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'https://images.unsplash.com/photo-1580670446435-2b3b82d9a7f7?w=800&h=400&fit=crop', 'Camps Bay Beach', 'Beautiful beachfront with mountain backdrop', true, 1),
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'https://images.unsplash.com/photo-1517490975934-cb9fee4cb8e6?w=800&h=400&fit=crop', 'Camps Bay Sunset', 'Spectacular sunset views over the ocean', false, 2),

-- Umhlanga images
((SELECT id FROM areas WHERE name = 'Umhlanga'), 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=400&fit=crop', 'Umhlanga Coastline', 'Pristine beaches and coastal development', true, 1),

-- Waterkloof images
((SELECT id FROM areas WHERE name = 'Waterkloof'), 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=400&fit=crop', 'Waterkloof Heights', 'Elevated residential area with city views', true, 1),

-- Constantia images
((SELECT id FROM areas WHERE name = 'Constantia'), 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop', 'Constantia Vineyards', 'Wine estates and mountain views', true, 1);

-- Insert Area Statistics (Market Data)
INSERT INTO area_statistics (
    area_id, average_property_price, median_property_price, price_per_sqm, 
    price_growth_yoy, average_rental_price, rental_yield, rental_growth_yoy, 
    vacancy_rate, days_on_market, total_properties_sold, total_rental_properties,
    crime_index_score, education_score, transport_score, amenities_score,
    data_period_start, data_period_end
) VALUES 
-- Sandton statistics
((SELECT id FROM areas WHERE name = 'Sandton'), 2800000, 2500000, 28000, 12.5, 25000, 8.2, 10.1, 4.1, 45, 156, 89, 32, 95, 90, 98, '2024-01-01', '2024-12-31'),

-- Camps Bay statistics
((SELECT id FROM areas WHERE name = 'Camps Bay'), 4500000, 4200000, 45000, 15.2, 35000, 7.8, 8.5, 3.2, 62, 89, 156, 25, 92, 85, 95, '2024-01-01', '2024-12-31'),

-- Umhlanga statistics
((SELECT id FROM areas WHERE name = 'Umhlanga'), 2200000, 2000000, 22000, 9.8, 18000, 8.5, 7.2, 5.1, 38, 134, 78, 28, 88, 82, 90, '2024-01-01', '2024-12-31'),

-- Waterkloof statistics
((SELECT id FROM areas WHERE name = 'Waterkloof'), 3200000, 2900000, 32000, 11.3, 22000, 7.5, 9.1, 3.8, 52, 98, 67, 18, 96, 88, 92, '2024-01-01', '2024-12-31'),

-- Constantia statistics
((SELECT id FROM areas WHERE name = 'Constantia'), 3800000, 3500000, 38000, 13.7, 28000, 8.1, 8.8, 2.9, 58, 76, 45, 15, 94, 75, 88, '2024-01-01', '2024-12-31');

-- Insert Area Amenities
INSERT INTO area_amenities (area_id, amenity_type, name, distance_km, rating, description) VALUES 
-- Sandton amenities
((SELECT id FROM areas WHERE name = 'Sandton'), 'shopping', 'Sandton City', 0.5, 4.8, 'Premier shopping center with luxury brands'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'school', 'St. Peters Preparatory School', 1.2, 4.7, 'Top-rated private preparatory school'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'hospital', 'Morningside Mediclinic', 2.1, 4.5, 'Private hospital with specialist services'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'transport', 'Sandton Gautrain Station', 0.8, 4.6, 'High-speed rail connection to OR Tambo Airport'),

-- Camps Bay amenities
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'beach', 'Camps Bay Beach', 0.2, 4.9, 'Blue Flag beach with pristine white sand'),
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'restaurant', 'The Roundhouse', 3.5, 4.8, 'Fine dining with mountain and ocean views'),
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'school', 'Camps Bay Primary School', 0.8, 4.3, 'Well-established primary school'),

-- Umhlanga amenities
((SELECT id FROM areas WHERE name = 'Umhlanga'), 'shopping', 'Gateway Theatre of Shopping', 2.1, 4.7, 'Largest shopping center in Africa'),
((SELECT id FROM areas WHERE name = 'Umhlanga'), 'beach', 'Umhlanga Main Beach', 0.3, 4.8, 'Popular beach with shark nets and lifeguards'),
((SELECT id FROM areas WHERE name = 'Umhlanga'), 'hospital', 'Netcare Umhlanga Hospital', 1.5, 4.6, 'Modern private hospital facility');

-- Insert Market Trends (Historical data for charts)
INSERT INTO market_trends (area_id, metric_type, metric_value, metric_date) VALUES 
-- Sandton price trends (last 12 months)
((SELECT id FROM areas WHERE name = 'Sandton'), 'average_price', 2500000, '2024-01-01'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'average_price', 2520000, '2024-02-01'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'average_price', 2580000, '2024-03-01'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'average_price', 2650000, '2024-04-01'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'average_price', 2720000, '2024-05-01'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'average_price', 2750000, '2024-06-01'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'average_price', 2780000, '2024-07-01'),
((SELECT id FROM areas WHERE name = 'Sandton'), 'average_price', 2800000, '2024-08-01'),

-- Camps Bay price trends
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'average_price', 3900000, '2024-01-01'),
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'average_price', 4050000, '2024-02-01'),
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'average_price', 4200000, '2024-03-01'),
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'average_price', 4350000, '2024-04-01'),
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'average_price', 4450000, '2024-05-01'),
((SELECT id FROM areas WHERE name = 'Camps Bay'), 'average_price', 4500000, '2024-06-01');