-- Seed property-type distribution counts and 10-year average price series per area (idempotent)
-- Assumes metrics for count_* and avg_price_* exist.

WITH metric_ids AS (
  SELECT 
    (SELECT id FROM metrics WHERE code='count_residential') AS c_res,
    (SELECT id FROM metrics WHERE code='count_commercial')  AS c_com,
    (SELECT id FROM metrics WHERE code='count_industrial')  AS c_ind,
    (SELECT id FROM metrics WHERE code='count_retail')      AS c_ret,
    (SELECT id FROM metrics WHERE code='avg_price_residential') AS p_res,
    (SELECT id FROM metrics WHERE code='avg_price_commercial')  AS p_com,
    (SELECT id FROM metrics WHERE code='avg_price_industrial')  AS p_ind,
    (SELECT id FROM metrics WHERE code='avg_price_retail')      AS p_ret
), areas_sel AS (
  SELECT id, name FROM areas WHERE name IN ('Sandton','Rosebank','Sea Point','Claremont')
), years AS (
  SELECT generate_series(EXTRACT(YEAR FROM CURRENT_DATE)::int - 9, EXTRACT(YEAR FROM CURRENT_DATE)::int) AS y
)
-- Distribution counts (latest snapshot per area)
INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.c_res, DATE_TRUNC('year', CURRENT_DATE)::date, 800, 'seed'
FROM areas_sel a CROSS JOIN metric_ids m
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.c_com, DATE_TRUNC('year', CURRENT_DATE)::date, 220, 'seed'
FROM areas_sel a CROSS JOIN metric_ids m
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.c_ind, DATE_TRUNC('year', CURRENT_DATE)::date, 110, 'seed'
FROM areas_sel a CROSS JOIN metric_ids m
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.c_ret, DATE_TRUNC('year', CURRENT_DATE)::date, 140, 'seed'
FROM areas_sel a CROSS JOIN metric_ids m
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

-- 10-year price series per type per area (one point per Jan 1st)
INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.p_res, make_date(y.y, 1, 1), ROUND(2500000 * POWER(1.03, y.y - (SELECT MIN(y2.y) FROM years y2)) + (random()-0.5)*90000), 'seed'
FROM areas_sel a CROSS JOIN metric_ids m CROSS JOIN years y
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.p_com, make_date(y.y, 1, 1), ROUND(4200000 * POWER(1.025, y.y - (SELECT MIN(y2.y) FROM years y2)) + (random()-0.5)*150000), 'seed'
FROM areas_sel a CROSS JOIN metric_ids m CROSS JOIN years y
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.p_ind, make_date(y.y, 1, 1), ROUND(3200000 * POWER(1.02, y.y - (SELECT MIN(y2.y) FROM years y2)) + (random()-0.5)*110000), 'seed'
FROM areas_sel a CROSS JOIN metric_ids m CROSS JOIN years y
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;

INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
SELECT a.id, m.p_ret, make_date(y.y, 1, 1), ROUND(3600000 * POWER(1.02, y.y - (SELECT MIN(y2.y) FROM years y2)) + (random()-0.5)*120000), 'seed'
FROM areas_sel a CROSS JOIN metric_ids m CROSS JOIN years y
ON CONFLICT (area_id, metric_id, period_start) DO NOTHING;
