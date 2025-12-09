-- Seed property-type distribution counts and 10-year average price series per area (idempotent)
-- Assumes metrics for count_* and avg_price_* exist.

-- Distribution counts (latest snapshot per area)
INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.id, DATE_TRUNC('year', CURRENT_DATE)::date, 800, 'seed'
FROM areas a, metrics m
WHERE a.name IN ('Sandton','Rosebank','Sea Point','Claremont')
  AND m.code = 'count_residential'
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.id, DATE_TRUNC('year', CURRENT_DATE)::date, 220, 'seed'
FROM areas a, metrics m
WHERE a.name IN ('Sandton','Rosebank','Sea Point','Claremont')
  AND m.code = 'count_commercial'
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.id, DATE_TRUNC('year', CURRENT_DATE)::date, 110, 'seed'
FROM areas a, metrics m
WHERE a.name IN ('Sandton','Rosebank','Sea Point','Claremont')
  AND m.code = 'count_industrial'
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.id, DATE_TRUNC('year', CURRENT_DATE)::date, 140, 'seed'
FROM areas a, metrics m
WHERE a.name IN ('Sandton','Rosebank','Sea Point','Claremont')
  AND m.code = 'count_retail'
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

-- 10-year price series per type per area (one point per Jan 1st)
INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.id, make_date(y.y, 1, 1), ROUND(2500000 * POWER(1.03, y.y - start_year) + (random()-0.5)*90000), 'seed'
FROM areas a, metrics m, 
     (SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS start_year,
             generate_series(EXTRACT(YEAR FROM CURRENT_DATE)::int - 9, EXTRACT(YEAR FROM CURRENT_DATE)::int) AS y) y
WHERE a.name IN ('Sandton','Rosebank','Sea Point','Claremont')
  AND m.code = 'avg_price_residential'
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.id, make_date(y.y, 1, 1), ROUND(4200000 * POWER(1.025, y.y - start_year) + (random()-0.5)*150000), 'seed'
FROM areas a, metrics m,
     (SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS start_year,
             generate_series(EXTRACT(YEAR FROM CURRENT_DATE)::int - 9, EXTRACT(YEAR FROM CURRENT_DATE)::int) AS y) y
WHERE a.name IN ('Sandton','Rosebank','Sea Point','Claremont')
  AND m.code = 'avg_price_commercial'
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.id, make_date(y.y, 1, 1), ROUND(3200000 * POWER(1.02, y.y - start_year) + (random()-0.5)*110000), 'seed'
FROM areas a, metrics m,
     (SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS start_year,
             generate_series(EXTRACT(YEAR FROM CURRENT_DATE)::int - 9, EXTRACT(YEAR FROM CURRENT_DATE)::int) AS y) y
WHERE a.name IN ('Sandton','Rosebank','Sea Point','Claremont')
  AND m.code = 'avg_price_industrial'
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.id, make_date(y.y, 1, 1), ROUND(3600000 * POWER(1.02, y.y - start_year) + (random()-0.5)*120000), 'seed'
FROM areas a, metrics m,
     (SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS start_year,
             generate_series(EXTRACT(YEAR FROM CURRENT_DATE)::int - 9, EXTRACT(YEAR FROM CURRENT_DATE)::int) AS y) y
WHERE a.name IN ('Sandton','Rosebank','Sea Point','Claremont')
  AND m.code = 'avg_price_retail'
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;
