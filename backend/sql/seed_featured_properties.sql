-- Seed featured properties for Sandton (Eris - commercial, Balwin - residential)
-- Note: Data is representative for demo purposes.

WITH sandton AS (
  SELECT id AS area_id FROM areas WHERE name='Sandton' LIMIT 1
)
INSERT INTO properties (area_id, name, developer, property_type, address, price, bedrooms, image_url, is_featured, description)
SELECT s.area_id, 'Sandton Gate - Office Tower', 'Eris Property Group', 'commercial', '5 Rudd Rd, Sandton', 0, NULL,
       'https://images.unsplash.com/photo-1505899900975-3f2f96a3b0f1?q=80&w=1200&auto=format&fit=crop', TRUE,
       'Grade A offices within Sandton Gate precinct.'
FROM sandton s
ON CONFLICT DO NOTHING;

INSERT INTO properties (area_id, name, developer, property_type, address, price, bedrooms, image_url, is_featured, description)
SELECT s.area_id, 'The Marc Retail', 'Eris Property Group', 'commercial', '129 Rivonia Rd, Sandton', 0, NULL,
       'https://images.unsplash.com/photo-1521540216272-a50305cd4421?q=80&w=1200&auto=format&fit=crop', TRUE,
       'Premium retail destination integrated with office towers.'
FROM sandton s
ON CONFLICT DO NOTHING;

INSERT INTO properties (area_id, name, developer, property_type, address, price, bedrooms, image_url, is_featured, description)
SELECT s.area_id, 'Munro Luxury Apartments', 'Balwin Properties', 'residential', '60 Alice Ln, Sandton', 3250000, 2,
       'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop', TRUE,
       'Modern residential apartments near Sandton CBD.'
FROM sandton s
ON CONFLICT DO NOTHING;

INSERT INTO properties (area_id, name, developer, property_type, address, price, bedrooms, image_url, is_featured, description)
SELECT s.area_id, 'The Blyde Sandton', 'Balwin Properties', 'residential', '11 Benmore Rd, Sandton', 2850000, 2,
       'https://images.unsplash.com/photo-1554995207-1c3fbe3df12f?q=80&w=1200&auto=format&fit=crop', TRUE,
       'Lifestyle estate apartments with amenities.'
FROM sandton s
ON CONFLICT DO NOTHING;
