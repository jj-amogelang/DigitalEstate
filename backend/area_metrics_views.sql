-- Views for faster retrieval of latest area metrics (PostgreSQL optimized)

-- 1. Latest value per (area, metric)
-- Uses DISTINCT ON ordering to pick the newest period_start then created_at
CREATE OR REPLACE VIEW area_metric_latest AS
SELECT DISTINCT ON (area_id, metric_id)
       id,
       area_id,
       metric_id,
       period_start,
       period_end,
       value_numeric,
       value_text,
       value_json,
       source,
       quality_score,
       created_at
FROM area_metric_values
ORDER BY area_id, metric_id, period_start DESC, created_at DESC;

-- 2. Pivot-like convenience view for key headline metrics per area
-- Extend this by adding more correlated subselects for new codes as needed.
CREATE OR REPLACE VIEW area_latest_key_metrics AS
SELECT a.id   AS area_id,
       a.name AS area_name,
       (SELECT l.value_numeric FROM area_metric_latest l JOIN metrics m ON m.id = l.metric_id WHERE l.area_id = a.id AND m.code = 'avg_price')       AS avg_price,
       (SELECT l.value_numeric FROM area_metric_latest l JOIN metrics m ON m.id = l.metric_id WHERE l.area_id = a.id AND m.code = 'rental_yield')    AS rental_yield,
       (SELECT l.value_numeric FROM area_metric_latest l JOIN metrics m ON m.id = l.metric_id WHERE l.area_id = a.id AND m.code = 'vacancy_rate')    AS vacancy_rate,
       (SELECT l.value_numeric FROM area_metric_latest l JOIN metrics m ON m.id = l.metric_id WHERE l.area_id = a.id AND m.code = 'crime_index')     AS crime_index,
       (SELECT l.value_numeric FROM area_metric_latest l JOIN metrics m ON m.id = l.metric_id WHERE l.area_id = a.id AND m.code = 'education_score') AS education_score,
       (SELECT l.value_numeric FROM area_metric_latest l JOIN metrics m ON m.id = l.metric_id WHERE l.area_id = a.id AND m.code = 'transport_score') AS transport_score
FROM areas a;
