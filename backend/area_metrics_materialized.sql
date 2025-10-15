-- PostgreSQL Materialized Views for latest area metrics
-- Safe to run multiple times (drops & recreates views)
-- NOTE: Requires PostgreSQL. Skip on SQLite.

-- 1. Drop existing materialized views if present
DROP MATERIALIZED VIEW IF EXISTS area_latest_key_metrics_mv;
DROP MATERIALIZED VIEW IF EXISTS area_metric_latest_mv;

-- 2. Materialized view for latest (area, metric)
CREATE MATERIALIZED VIEW area_metric_latest_mv AS
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

-- Supporting unique index (required for CONCURRENT refresh)
CREATE UNIQUE INDEX area_metric_latest_mv_uk ON area_metric_latest_mv(area_id, metric_id);
CREATE INDEX area_metric_latest_mv_metric ON area_metric_latest_mv(metric_id);

-- 3. Headline metrics materialized view
CREATE MATERIALIZED VIEW area_latest_key_metrics_mv AS
SELECT a.id   AS area_id,
       a.name AS area_name,
       l_avg.value_numeric       AS avg_price,
       l_rent.value_numeric      AS rental_yield,
       l_vac.value_numeric       AS vacancy_rate,
       l_crime.value_numeric     AS crime_index,
       l_edu.value_numeric       AS education_score,
       l_trans.value_numeric     AS transport_score
FROM areas a
LEFT JOIN area_metric_latest_mv l_avg   ON l_avg.area_id = a.id   AND l_avg.metric_id = (SELECT id FROM metrics WHERE code='avg_price')
LEFT JOIN area_metric_latest_mv l_rent  ON l_rent.area_id = a.id  AND l_rent.metric_id = (SELECT id FROM metrics WHERE code='rental_yield')
LEFT JOIN area_metric_latest_mv l_vac   ON l_vac.area_id = a.id   AND l_vac.metric_id = (SELECT id FROM metrics WHERE code='vacancy_rate')
LEFT JOIN area_metric_latest_mv l_crime ON l_crime.area_id = a.id AND l_crime.metric_id = (SELECT id FROM metrics WHERE code='crime_index')
LEFT JOIN area_metric_latest_mv l_edu   ON l_edu.area_id = a.id   AND l_edu.metric_id = (SELECT id FROM metrics WHERE code='education_score')
LEFT JOIN area_metric_latest_mv l_trans ON l_trans.area_id = a.id AND l_trans.metric_id = (SELECT id FROM metrics WHERE code='transport_score');

CREATE UNIQUE INDEX area_latest_key_metrics_mv_pk ON area_latest_key_metrics_mv(area_id);

-- 4. (Optional) Comments
COMMENT ON MATERIALIZED VIEW area_metric_latest_mv IS 'Latest metric record per (area, metric).';
COMMENT ON MATERIALIZED VIEW area_latest_key_metrics_mv IS 'Pivot of headline metrics per area sourced from area_metric_latest_mv.';
