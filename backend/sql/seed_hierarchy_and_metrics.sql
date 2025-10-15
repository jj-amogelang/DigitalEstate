-- Seed minimal SA hierarchy and sample metric values (idempotent)
-- Countries
INSERT INTO countries (name, code)
VALUES ('South Africa', 'ZA')
ON CONFLICT (code) DO NOTHING;

-- Provinces
INSERT INTO provinces (country_id, name)
SELECT c.id, 'Gauteng' FROM countries c WHERE c.code='ZA'
AND NOT EXISTS (
  SELECT 1 FROM provinces p WHERE p.country_id = c.id AND p.name = 'Gauteng'
);

INSERT INTO provinces (country_id, name)
SELECT c.id, 'Western Cape' FROM countries c WHERE c.code='ZA'
AND NOT EXISTS (
  SELECT 1 FROM provinces p WHERE p.country_id = c.id AND p.name = 'Western Cape'
);

-- Cities
INSERT INTO cities (province_id, name)
SELECT p.id, 'Johannesburg' FROM provinces p JOIN countries c ON c.id=p.country_id
WHERE c.code='ZA' AND p.name='Gauteng'
AND NOT EXISTS (
  SELECT 1 FROM cities ci WHERE ci.province_id = p.id AND ci.name = 'Johannesburg'
);

INSERT INTO cities (province_id, name)
SELECT p.id, 'Cape Town' FROM provinces p JOIN countries c ON c.id=p.country_id
WHERE c.code='ZA' AND p.name='Western Cape'
AND NOT EXISTS (
  SELECT 1 FROM cities ci WHERE ci.province_id = p.id AND ci.name = 'Cape Town'
);

-- Areas
INSERT INTO areas (city_id, name)
SELECT ci.id, 'Sandton' FROM cities ci JOIN provinces p ON p.id=ci.province_id JOIN countries c ON c.id=p.country_id
WHERE c.code='ZA' AND p.name='Gauteng' AND ci.name='Johannesburg'
AND NOT EXISTS (
  SELECT 1 FROM areas a WHERE a.city_id = ci.id AND a.name = 'Sandton'
);

INSERT INTO areas (city_id, name)
SELECT ci.id, 'Rosebank' FROM cities ci JOIN provinces p ON p.id=ci.province_id JOIN countries c ON c.id=p.country_id
WHERE c.code='ZA' AND p.name='Gauteng' AND ci.name='Johannesburg'
AND NOT EXISTS (
  SELECT 1 FROM areas a WHERE a.city_id = ci.id AND a.name = 'Rosebank'
);

INSERT INTO areas (city_id, name)
SELECT ci.id, 'Sea Point' FROM cities ci JOIN provinces p ON p.id=ci.province_id JOIN countries c ON c.id=p.country_id
WHERE c.code='ZA' AND p.name='Western Cape' AND ci.name='Cape Town'
AND NOT EXISTS (
  SELECT 1 FROM areas a WHERE a.city_id = ci.id AND a.name = 'Sea Point'
);

INSERT INTO areas (city_id, name)
SELECT ci.id, 'Claremont' FROM cities ci JOIN provinces p ON p.id=ci.province_id JOIN countries c ON c.id=p.country_id
WHERE c.code='ZA' AND p.name='Western Cape' AND ci.name='Cape Town'
AND NOT EXISTS (
  SELECT 1 FROM areas a WHERE a.city_id = ci.id AND a.name = 'Claremont'
);

-- Ensure essential metrics (schema already seeds, but do it defensively)
INSERT INTO metrics (code, name, unit, category)
VALUES
 ('avg_price','Average Sale Price','ZAR','pricing'),
 ('rental_yield','Gross Rental Yield','%','rental'),
 ('vacancy_rate','Vacancy Rate','%','rental')
ON CONFLICT (code) DO NOTHING;

-- Helper CTEs to resolve IDs by names
WITH ids AS (
  SELECT
    (SELECT a.id FROM areas a JOIN cities ci ON ci.id=a.city_id WHERE a.name='Sandton'  AND ci.name='Johannesburg' ORDER BY a.id LIMIT 1) AS a_sand,
    (SELECT a.id FROM areas a JOIN cities ci ON ci.id=a.city_id WHERE a.name='Rosebank' AND ci.name='Johannesburg' ORDER BY a.id LIMIT 1) AS a_rose,
    (SELECT a.id FROM areas a JOIN cities ci ON ci.id=a.city_id WHERE a.name='Sea Point' AND ci.name='Cape Town'    ORDER BY a.id LIMIT 1) AS a_sea,
    (SELECT a.id FROM areas a JOIN cities ci ON ci.id=a.city_id WHERE a.name='Claremont' AND ci.name='Cape Town'    ORDER BY a.id LIMIT 1) AS a_cla,
    (SELECT id FROM metrics WHERE code='avg_price'    ORDER BY id LIMIT 1) AS m_avg,
    (SELECT id FROM metrics WHERE code='rental_yield' ORDER BY id LIMIT 1) AS m_yld,
    (SELECT id FROM metrics WHERE code='vacancy_rate' ORDER BY id LIMIT 1) AS m_vac
)
-- Insert values for each area and metric (two months for simple trend)
INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a_id, m_id, p_start, val, 'seed' FROM (
  SELECT a_sand AS a_id, m_avg AS m_id, DATE '2025-08-01' AS p_start, 3000000::DECIMAL AS val FROM ids UNION ALL
  SELECT a_sand, m_avg, DATE '2025-09-01', 3250000 FROM ids UNION ALL
  SELECT a_sand, m_yld, DATE '2025-08-01', 6.8 FROM ids UNION ALL
  SELECT a_sand, m_yld, DATE '2025-09-01', 7.2 FROM ids UNION ALL
  SELECT a_sand, m_vac, DATE '2025-08-01', 7.0 FROM ids UNION ALL
  SELECT a_sand, m_vac, DATE '2025-09-01', 6.5 FROM ids UNION ALL

  SELECT a_rose, m_avg, DATE '2025-08-01', 2500000 FROM ids UNION ALL
  SELECT a_rose, m_avg, DATE '2025-09-01', 2600000 FROM ids UNION ALL
  SELECT a_rose, m_yld, DATE '2025-08-01', 6.2 FROM ids UNION ALL
  SELECT a_rose, m_yld, DATE '2025-09-01', 6.5 FROM ids UNION ALL
  SELECT a_rose, m_vac, DATE '2025-08-01', 7.5 FROM ids UNION ALL
  SELECT a_rose, m_vac, DATE '2025-09-01', 7.2 FROM ids UNION ALL

  SELECT a_sea, m_avg, DATE '2025-08-01', 4200000 FROM ids UNION ALL
  SELECT a_sea, m_avg, DATE '2025-09-01', 4400000 FROM ids UNION ALL
  SELECT a_sea, m_yld, DATE '2025-08-01', 5.5 FROM ids UNION ALL
  SELECT a_sea, m_yld, DATE '2025-09-01', 5.7 FROM ids UNION ALL
  SELECT a_sea, m_vac, DATE '2025-08-01', 4.5 FROM ids UNION ALL
  SELECT a_sea, m_vac, DATE '2025-09-01', 4.3 FROM ids UNION ALL

  SELECT a_cla, m_avg, DATE '2025-08-01', 3200000 FROM ids UNION ALL
  SELECT a_cla, m_avg, DATE '2025-09-01', 3350000 FROM ids UNION ALL
  SELECT a_cla, m_yld, DATE '2025-08-01', 5.8 FROM ids UNION ALL
  SELECT a_cla, m_yld, DATE '2025-09-01', 6.1 FROM ids UNION ALL
  SELECT a_cla, m_vac, DATE '2025-08-01', 5.0 FROM ids UNION ALL
  SELECT a_cla, m_vac, DATE '2025-09-01', 4.8 FROM ids
) seed
WHERE a_id IS NOT NULL AND m_id IS NOT NULL
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;
