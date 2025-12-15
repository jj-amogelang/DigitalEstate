-- Seed featured properties for Sandton (Eris - commercial, Balwin - residential)
-- Note: Data is representative for demo purposes.

INSERT INTO properties (area_id, name, developer, property_type, address, price, bedrooms, image_url, is_featured, description)
VALUES (
  (SELECT id FROM areas WHERE name='Sandton' LIMIT 1),
  'Sandton Gate - Office Tower', 'Eris Property Group', 'commercial', '5 Rudd Rd, Sandton', 0, NULL,
  'https://images.unsplash.com/photo-1505899900975-3f2f96a3b0f1?q=80&w=1200&auto=format&fit=crop', TRUE,
  'Grade A offices within Sandton Gate precinct.'
)
ON CONFLICT DO NOTHING;

INSERT INTO properties (area_id, name, developer, property_type, address, price, bedrooms, image_url, is_featured, description)
VALUES (
  (SELECT id FROM areas WHERE name='Sandton' LIMIT 1),
  'The Marc Retail', 'Eris Property Group', 'commercial', '129 Rivonia Rd, Sandton', 0, NULL,
  'https://images.unsplash.com/photo-1521540216272-a50305cd4421?q=80&w=1200&auto=format&fit=crop', TRUE,
  'Premium retail destination integrated with office towers.'
)
ON CONFLICT DO NOTHING;

INSERT INTO properties (area_id, name, developer, property_type, address, price, bedrooms, image_url, is_featured, description)
VALUES (
  (SELECT id FROM areas WHERE name='Sandton' LIMIT 1),
  'Munro Luxury Apartments', 'Balwin Properties', 'residential', '60 Alice Ln, Sandton', 3250000, 2,
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop', TRUE,
  'Modern residential apartments near Sandton CBD.'
)
ON CONFLICT DO NOTHING;

INSERT INTO properties (area_id, name, developer, property_type, address, price, bedrooms, image_url, is_featured, description)
VALUES (
  (SELECT id FROM areas WHERE name='Sandton' LIMIT 1),
  'The Blyde Sandton', 'Balwin Properties', 'residential', '11 Benmore Rd, Sandton', 2850000, 2,
  'https://images.unsplash.com/photo-1554995207-1c3fbe3df12f?q=80&w=1200&auto=format&fit=crop', TRUE,
  'Lifestyle estate apartments with amenities.'
)
ON CONFLICT DO NOTHING;
