-- =============================================================================
-- expand_hierarchy.sql
-- =============================================================================
-- Adds KwaZulu-Natal province, Pretoria city, and new areas across all
-- three provinces.  All inserts use ON CONFLICT DO NOTHING so this file
-- is safe to run multiple times.
-- =============================================================================

-- ── KwaZulu-Natal province ───────────────────────────────────────────────────
INSERT INTO provinces (country_id, name)
SELECT c.id, 'KwaZulu-Natal'
FROM   countries c
WHERE  c.code = 'ZA'
ON CONFLICT DO NOTHING;

-- ── Pretoria city (Gauteng) ──────────────────────────────────────────────────
INSERT INTO cities (province_id, name)
SELECT p.id, 'Pretoria'
FROM   provinces p JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'Gauteng'
ON CONFLICT DO NOTHING;

-- ── Durban city (KwaZulu-Natal) ──────────────────────────────────────────────
INSERT INTO cities (province_id, name)
SELECT p.id, 'Durban'
FROM   provinces p JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'KwaZulu-Natal'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Gauteng / Johannesburg  – new areas
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Midrand', 'mixed', '-25.9940,28.1281'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'Gauteng' AND ci.name = 'Johannesburg'
ON CONFLICT DO NOTHING;

INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Fourways', 'mixed', '-26.0069,28.0069'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'Gauteng' AND ci.name = 'Johannesburg'
ON CONFLICT DO NOTHING;

INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Hyde Park', 'residential', '-26.1253,28.0430'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'Gauteng' AND ci.name = 'Johannesburg'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Gauteng / Pretoria  – new areas
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Hatfield', 'mixed', '-25.7479,28.2378'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'Gauteng' AND ci.name = 'Pretoria'
ON CONFLICT DO NOTHING;

INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Menlyn', 'commercial', '-25.7836,28.2768'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'Gauteng' AND ci.name = 'Pretoria'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Western Cape / Cape Town  – new areas
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'V&A Waterfront', 'mixed', '-33.9022,18.4197'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'Western Cape' AND ci.name = 'Cape Town'
ON CONFLICT DO NOTHING;

INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Green Point', 'residential', '-33.9198,18.4088'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'Western Cape' AND ci.name = 'Cape Town'
ON CONFLICT DO NOTHING;

INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Camps Bay', 'residential', '-33.9503,18.3769'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'Western Cape' AND ci.name = 'Cape Town'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- KwaZulu-Natal / Durban – new areas
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Umhlanga', 'mixed', '-29.7276,31.0745'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'KwaZulu-Natal' AND ci.name = 'Durban'
ON CONFLICT DO NOTHING;

INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Ballito', 'mixed', '-29.5386,31.2116'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'KwaZulu-Natal' AND ci.name = 'Durban'
ON CONFLICT DO NOTHING;

INSERT INTO areas (city_id, name, area_type, coordinates)
SELECT ci.id, 'Morningside Durban', 'residential', '-29.8379,30.9972'
FROM   cities ci JOIN provinces p ON p.id = ci.province_id
       JOIN countries c ON c.id = p.country_id
WHERE  c.code = 'ZA' AND p.name = 'KwaZulu-Natal' AND ci.name = 'Durban'
ON CONFLICT DO NOTHING;

-- Ensure coordinates column exists on areas (no-op if already added earlier)
ALTER TABLE areas ADD COLUMN IF NOT EXISTS coordinates VARCHAR(40);
