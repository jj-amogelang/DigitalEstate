"""Initialize metrics tables in the local SQLite database (dev only)."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'property_dashboard.db')

SCHEMA = """
CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT,
    category TEXT,
    data_type TEXT DEFAULT 'numeric',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS area_metric_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    metric_id INTEGER NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT,
    value_numeric REAL,
    value_text TEXT,
    value_json TEXT,
    source TEXT,
    source_reference TEXT,
    quality_score INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(area_id, metric_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_amv_area_metric ON area_metric_values(area_id, metric_id);
CREATE INDEX IF NOT EXISTS idx_amv_metric_period ON area_metric_values(metric_id, period_start);
CREATE INDEX IF NOT EXISTS idx_amv_area_period ON area_metric_values(area_id, period_start);
"""

SEED_METRICS = [
    ('avg_price',             'Average Sale Price',               'Average transacted sale price for the period', 'ZAR',    'pricing'),
    ('median_price',          'Median Sale Price',                'Median transacted sale price for the period',  'ZAR',    'pricing'),
    ('price_per_sqm',         'Average Price per Square Meter',   'Average price per square meter',               'ZAR/m2', 'pricing'),
    ('rental_yield',          'Gross Rental Yield',               'Annual rental income / property value',        '%',      'rental'),
    ('vacancy_rate',          'Vacancy Rate',                     'Percentage of stock vacant',                   '%',      'rental'),
    ('days_on_market',        'Average Days on Market',           'Average listing days before sale',             'days',   'market'),
    ('sales_volume',          'Sales Volume',                     'Number of recorded sales',                     'count',  'market'),
    ('crime_index',           'Crime Index Score',                'Relative crime risk score (0-100)',            'score',  'quality'),
    ('education_score',       'Education Score',                  'Access & quality of education score',          'score',  'quality'),
    ('transport_score',       'Transport Accessibility Score',    'Public transport & road access score',         'score',  'quality'),
    ('amenities_score',       'Amenities Score',                  'Access to key amenities score',                'score',  'quality'),
    ('count_residential',     'Residential Stock Count',          'Number of residential properties',             'count',  'inventory'),
    ('count_commercial',      'Commercial Stock Count',           'Number of commercial properties',              'count',  'inventory'),
    ('count_industrial',      'Industrial Stock Count',           'Number of industrial properties',              'count',  'inventory'),
    ('count_retail',          'Retail Stock Count',               'Number of retail properties',                  'count',  'inventory'),
    ('avg_price_residential', 'Average Residential Price',       'Average residential sale price',               'ZAR',    'pricing'),
    ('avg_price_commercial',  'Average Commercial Price',        'Average commercial sale price',                'ZAR',    'pricing'),
    ('avg_price_industrial',  'Average Industrial Price',        'Average industrial sale price',                'ZAR',    'pricing'),
    ('avg_price_retail',      'Average Retail Price',            'Average retail sale price',                    'ZAR',    'pricing'),
    ('population_growth',     'Population Growth Rate',           'Year-over-year population growth rate',        '%',      'demographic'),
    ('planned_dev_count',     'Planned Development Count',        'Count of planned developments in pipeline',    'count',  'development'),
]

# Sample metric values for existing areas (area ids 1–4 from the seeded data)
SAMPLE_VALUES = [
    # (area_id, metric_code, period_start, value_numeric)
    (1, 'avg_price',        '2025-09-01', 4500000),
    (1, 'rental_yield',     '2025-09-01', 7.2),
    (1, 'vacancy_rate',     '2025-09-01', 4.5),
    (1, 'crime_index',      '2025-09-01', 42),
    (1, 'population_growth','2025-09-01', 1.8),
    (1, 'planned_dev_count','2025-09-01', 12),
    (1, 'days_on_market',   '2025-09-01', 38),
    (1, 'sales_volume',     '2025-09-01', 95),

    (2, 'avg_price',        '2025-09-01', 3800000),
    (2, 'rental_yield',     '2025-09-01', 6.8),
    (2, 'vacancy_rate',     '2025-09-01', 5.1),
    (2, 'crime_index',      '2025-09-01', 38),
    (2, 'population_growth','2025-09-01', 2.1),
    (2, 'planned_dev_count','2025-09-01', 7),
    (2, 'days_on_market',   '2025-09-01', 44),
    (2, 'sales_volume',     '2025-09-01', 72),

    (3, 'avg_price',        '2025-09-01', 6200000),
    (3, 'rental_yield',     '2025-09-01', 5.9),
    (3, 'vacancy_rate',     '2025-09-01', 6.3),
    (3, 'crime_index',      '2025-09-01', 55),
    (3, 'population_growth','2025-09-01', 1.2),
    (3, 'planned_dev_count','2025-09-01', 5),
    (3, 'days_on_market',   '2025-09-01', 52),
    (3, 'sales_volume',     '2025-09-01', 48),

    (4, 'avg_price',        '2025-09-01', 3200000),
    (4, 'rental_yield',     '2025-09-01', 7.5),
    (4, 'vacancy_rate',     '2025-09-01', 3.8),
    (4, 'crime_index',      '2025-09-01', 31),
    (4, 'population_growth','2025-09-01', 2.5),
    (4, 'planned_dev_count','2025-09-01', 9),
    (4, 'days_on_market',   '2025-09-01', 29),
    (4, 'sales_volume',     '2025-09-01', 61),
]

def main():
    print(f"DB path: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Create tables
    cur.executescript(SCHEMA)
    print("✅ Tables created (or already exist)")

    # Seed metrics catalog
    inserted = 0
    for code, name, desc, unit, cat in SEED_METRICS:
        cur.execute(
            "INSERT OR IGNORE INTO metrics (code, name, description, unit, category) VALUES (?,?,?,?,?)",
            (code, name, desc, unit, cat)
        )
        inserted += cur.rowcount
    print(f"✅ Metrics catalog: {inserted} new rows inserted")

    # Seed sample values
    inserted_vals = 0
    for area_id, code, period, val in SAMPLE_VALUES:
        cur.execute("SELECT id FROM metrics WHERE code=?", (code,))
        row = cur.fetchone()
        if not row:
            continue
        metric_id = row[0]
        cur.execute(
            """INSERT OR IGNORE INTO area_metric_values
               (area_id, metric_id, period_start, value_numeric, source)
               VALUES (?,?,?,?,'sample_seed')""",
            (area_id, metric_id, period, val)
        )
        inserted_vals += cur.rowcount
    print(f"✅ Sample metric values: {inserted_vals} new rows inserted")

    conn.commit()
    conn.close()
    print("Done! Restart the backend to apply changes.")

if __name__ == '__main__':
    main()
