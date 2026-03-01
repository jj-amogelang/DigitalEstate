"""
Production seed script for Neon PostgreSQL.

Run automatically as part of the Render build:
  python production_seed.py

Uses DATABASE_URL environment variable (set in Render dashboard).
All inserts use ON CONFLICT DO NOTHING so running multiple times is safe.
"""

import os, sys
import psycopg2
from psycopg2.extras import execute_values
import random
from datetime import date
from dateutil.relativedelta import relativedelta

DATABASE_URL = os.environ.get('DATABASE_URL', '')
if not DATABASE_URL:
    print("⚠️  DATABASE_URL not set — skipping production seed.")
    sys.exit(0)

# Render / Neon use postgres:// but psycopg2 wants postgresql://
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

# ── helpers ────────────────────────────────────────────────────────────────────
def months_back(n):
    d = date(2025, 9, 1)
    return [(d - relativedelta(months=i)).isoformat() for i in range(n - 1, -1, -1)]

def trend_series(start, growth_pct, periods, noise=0.03):
    vals = []
    v = start
    for _ in range(periods):
        v *= (1 + growth_pct / 100) * (1 + (random.random() - 0.5) * noise)
        vals.append(round(v, 4))
    return vals

PERIODS = months_back(36)

# ── area metadata ──────────────────────────────────────────────────────────────
AREA_META = [
    (1, 'Sandton is the financial capital of Africa, home to the Johannesburg Stock Exchange, luxury hotels, upscale retail centres and a dense concentration of corporate headquarters.', 'mixed', '2196', '-26.1076,28.0567'),
    (2, 'Rosebank is a cosmopolitan suburb north of central Johannesburg renowned for its art galleries, boutique hotels, the Zone@Rosebank mall and a thriving café culture.', 'mixed', '2196', '-26.1459,28.0438'),
    (3, 'Sea Point is a vibrant Atlantic Seaboard suburb of Cape Town, stretching along a dramatic coastline with mountain views and the popular Sea Point Promenade.', 'residential', '8060', '-33.9165,18.3877'),
    (4, 'Claremont is a well-established Southern Suburbs neighbourhood in Cape Town, popular for excellent schools, Cavendish Square and strong community character.', 'residential', '7708', '-33.9897,18.4679'),
]

# ── images ─────────────────────────────────────────────────────────────────────
IMAGES = [
    (1, 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200', 'Sandton City Skyline', True, 0),
    (1, 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200', 'Nelson Mandela Square', False, 1),
    (1, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200', 'Corporate Office Park', False, 2),
    (2, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200', 'Rosebank Mall Precinct', True, 0),
    (2, 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200', 'Gautrain Station', False, 1),
    (2, 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200', 'Boutique Hotel', False, 2),
    (3, 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200', 'Sea Point Promenade', True, 0),
    (3, 'https://images.unsplash.com/photo-1491472253230-a044054ca35f?w=1200', 'Atlantic Ocean Views', False, 1),
    (3, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200', 'Residential Apartments', False, 2),
    (4, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200', 'Claremont Suburb', True, 0),
    (4, 'https://images.unsplash.com/photo-1565402170291-8491f14678db?w=1200', 'Cavendish Square', False, 1),
    (4, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200', 'Parks and Gardens', False, 2),
]

# ── amenities ──────────────────────────────────────────────────────────────────
AMENITIES = [
    (1,'school','Crawford College Sandton',1.2,4.5,'Leading private school with excellent Matric results.'),
    (1,'school','Bryanston Primary School',2.8,4.2,'Well-regarded government primary school.'),
    (1,'hospital','Morningside Clinic',1.5,4.7,'Private hospital with 24-hour emergency services.'),
    (1,'mall','Sandton City',0.5,4.8,'Flagship retail centre with 300+ stores.'),
    (1,'mall','Nelson Mandela Square',0.6,4.6,'Open-air mall with restaurants and boutiques.'),
    (1,'transport','Sandton Gautrain Station',0.8,4.9,'High-speed rail link to OR Tambo and Pretoria.'),
    (1,'transport','M1 Highway On-ramp',1.1,None,'Rapid access to Johannesburg CBD and highways.'),
    (1,'park','Sandton Central Park',0.3,4.0,'Urban greenspace and jogging paths.'),
    (2,'school','Rosebank Union School',0.9,4.3,'Private co-ed school in the heart of Rosebank.'),
    (2,'school','St Teresa School',1.4,4.4,'Catholic primary school with good community values.'),
    (2,'hospital','Rosebank Clinic',0.7,4.5,'Day clinic and specialist consulting rooms.'),
    (2,'mall','The Zone @ Rosebank',0.4,4.4,'Retail and entertainment destination.'),
    (2,'mall','Rosebank Mall',0.5,4.2,'Lifestyle centre with cinema and food hall.'),
    (2,'transport','Rosebank Gautrain Station',0.6,4.8,'Gautrain station on the main Sandton–Park Station line.'),
    (2,'park','Faber Park',0.8,3.9,'Community park popular with dog owners.'),
    (3,'school','Sea Point Primary School',0.6,4.1,'Well-established government primary school by the sea.'),
    (3,'school','SACS (South African College Schools)',2.2,4.7,"One of Cape Town's most prestigious high schools."),
    (3,'hospital','Cape Town Medi-Clinic',2.4,4.6,'24-hour private hospital near the CBD.'),
    (3,'mall','Adelphi Centre',0.3,3.8,'Neighbourhood convenience mall in Sea Point.'),
    (3,'mall','V&A Waterfront',3.5,4.9,"Cape Town's premier retail and entertainment precinct."),
    (3,'transport','MyCiti Bus – Sea Point Route',0.2,4.0,'Rapid transit along Main Road to the City Bowl.'),
    (3,'park','Sea Point Promenade',0.1,4.9,'Iconic 3.5 km coastal walkway and outdoor gym.'),
    (4,'school','Rustenburg Girls High School',0.5,4.6,'Top-ranked public high school for girls.'),
    (4,'school','Bishops Diocesan College',1.1,4.8,'Prestigious boys school with strong academic record.'),
    (4,'hospital','Kingsbury Hospital Claremont',0.8,4.5,'Full-service private hospital with specialists.'),
    (4,'mall','Cavendish Square',0.4,4.5,'Premium shopping centre with over 180 stores.'),
    (4,'mall','Palmyra Junction',0.6,3.9,'Neighbourhood centre with grocery and retail.'),
    (4,'transport','Claremont Train Station',0.7,4.0,'Metrorail Southern Line to Cape Town CBD.'),
    (4,'park','Arderne Gardens',0.9,4.7,'Historic arboretum with rare tree collection.'),
    (4,'university','University of Cape Town',1.8,4.9,"Africa's top-ranked university on the slopes of Devil's Peak."),
]

# ── properties ─────────────────────────────────────────────────────────────────
PROPERTIES = [
    (1,'The Houghton Luxury Apartments','Ellerine Bros','residential','2 2nd Ave, Houghton, Sandton',4800000,2,'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',True,'Sleek 2-bedroom apartment with panoramic city views.'),
    (1,'Michelangelo Residences','Tsogo Sun','residential','Nelson Mandela Sq, Sandton',8500000,3,'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',True,'Ultra-luxury 3-bedroom residence in the iconic Michelangelo Tower.'),
    (1,'Sandton Gate Apartments','Amdec','residential','William Nicol Dr, Sandton',3200000,1,'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',False,'Modern 1-bedroom apartment in a secure mixed-use development.'),
    (1,'Katherine & West','Atterbury','residential','Cnr Katherine & West St, Sandton',5600000,2,'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800',False,'Contemporary 2-bed apartment with hotel-style amenities.'),
    (1,'Alice Lane Office Tower','Atterbury','commercial','Alice Lane, Sandton CBD',35000000,None,'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',True,'A-grade 1 200 m² commercial office floor in prime Sandton CBD.'),
    (1,'Sandton Skye Office Park','Eris','commercial','Rivonia Rd, Sandton',18500000,None,'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800',False,'400 m² flexible office space with fibre and smart technology.'),
    (2,'The Tyrwhitt','Growthpoint','residential','Tyrwhitt Ave, Rosebank',3800000,2,'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',True,'Stylish 2-bedroom apartment steps from the Gautrain station.'),
    (2,'27 on Smit','Tricolt','residential','27 Smits St, Rosebank',2900000,1,'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',False,'Compact 1-bedroom apartment ideal for young professionals.'),
    (2,'Oxford Corner','Balwin','residential','Oxford Rd, Rosebank',4500000,2,'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800',True,'Secure 2-bedroom with rooftop pool and gym.'),
    (2,'The Oval Office Park','Hyprop','commercial','Cradock Ave, Rosebank',22000000,None,'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',True,'Premium P-grade offices with green building certification.'),
    (3,'Clarens Court','Private Development','residential','9 Clarens Rd, Sea Point',6200000,3,'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',True,'Renovated 3-bed apartment with Atlantic Ocean views.'),
    (3,'Penthouse on Regent','Atlantic Developers','residential','Regent Rd, Sea Point',9800000,4,'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800',True,"Duplex penthouse with private pool and Lion's Head views."),
    (3,'Seabreeze Residences','Rabie Property','residential','Beach Rd, Sea Point',4100000,2,'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',False,'Contemporary 2-bed apartment 50 m from the promenade.'),
    (3,'Sea Point Mews','Private','residential','Main Rd, Sea Point',3600000,2,'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',False,'Charming 2-bed apartment in converted Victorian building.'),
    (3,'Main Road Retail Strip','Private','commercial','Main Rd, Sea Point',8900000,None,'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',False,'Ground-floor retail unit 120 m² in high-footfall location.'),
    (4,'The Claremont Residence','Rabie Property','residential','Main Rd, Claremont',3200000,2,'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',True,'Spacious 2-bed apartment in boutique building near Cavendish.'),
    (4,'Cavendish Outlook','Private Development','residential','Dreyer St, Claremont',2800000,2,'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800',False,'Neat 2-bedroom with braai balcony and mountain views.'),
    (4,'Surrey Lane','Vicus Developments','residential','Surrey Rd, Claremont',4100000,3,'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',True,'Family 3-bed townhouse with garden in quiet cul-de-sac.'),
    (4,'Ardenbrae Apartments','Private','residential','Campground Rd, Claremont',2200000,1,'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',False,'Entry-level 1-bed for first-time buyers or investors.'),
    (4,'Cavendish Place Office','Growthpoint','commercial','Kloof Rd, Claremont',14500000,None,'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800',False,'350 m² open-plan office suite near Cavendish Square.'),
]

# ── metrics seed ───────────────────────────────────────────────────────────────
METRICS_CATALOG = [
    ('avg_price','Average Sale Price','Average transacted sale price for the period','ZAR','pricing'),
    ('median_price','Median Sale Price','Median transacted sale price for the period','ZAR','pricing'),
    ('price_per_sqm','Average Price per Square Meter','Average price per square meter','ZAR/m2','pricing'),
    ('rental_yield','Gross Rental Yield','Annual rental income / property value','%','rental'),
    ('vacancy_rate','Vacancy Rate','Percentage of stock vacant','%','rental'),
    ('days_on_market','Average Days on Market','Average listing days before sale','days','market'),
    ('sales_volume','Sales Volume','Number of recorded sales','count','market'),
    ('crime_index','Crime Index Score','Relative crime risk score (0-100)','score','quality'),
    ('education_score','Education Score','Access & quality of education score','score','quality'),
    ('transport_score','Transport Accessibility Score','Public transport & road access score','score','quality'),
    ('amenities_score','Amenities Score','Access to key amenities score','score','quality'),
    ('count_residential','Residential Stock Count','Number of residential properties','count','inventory'),
    ('count_commercial','Commercial Stock Count','Number of commercial properties','count','inventory'),
    ('count_industrial','Industrial Stock Count','Number of industrial properties','count','inventory'),
    ('count_retail','Retail Stock Count','Number of retail properties','count','inventory'),
    ('avg_price_residential','Average Residential Price','Average residential sale price','ZAR','pricing'),
    ('avg_price_commercial','Average Commercial Price','Average commercial sale price','ZAR','pricing'),
    ('avg_price_industrial','Average Industrial Price','Average industrial sale price','ZAR','pricing'),
    ('avg_price_retail','Average Retail Price','Average retail sale price','ZAR','pricing'),
    ('population_growth','Population Growth Rate','Year-over-year population growth rate','%','demographic'),
    ('planned_dev_count','Planned Development Count','Count of planned developments in pipeline','count','development'),
]

AREA_METRIC_BASES = {
    'avg_price':         {1: 4200000, 2: 3600000, 3: 5800000, 4: 3000000},
    'rental_yield':      {1: 7.0,     2: 6.5,     3: 5.8,     4: 7.2},
    'vacancy_rate':      {1: 4.8,     2: 5.2,     3: 6.5,     4: 3.9},
    'crime_index':       {1: 44,      2: 40,      3: 56,      4: 32},
    'days_on_market':    {1: 40,      2: 46,      3: 54,      4: 30},
    'sales_volume':      {1: 90,      2: 68,      3: 44,      4: 58},
    'population_growth': {1: 1.8,     2: 2.0,     3: 1.2,     4: 2.5},
    'planned_dev_count': {1: 12,      2: 7,       3: 5,       4: 9},
    'price_per_sqm':     {1: 42000,   2: 36000,   3: 68000,   4: 28000},
}

MARKET_TREND_BASES = {
    1: (4200000, 7.0, 4.8),
    2: (3600000, 6.5, 5.2),
    3: (5800000, 5.8, 6.5),
    4: (3000000, 7.2, 3.9),
}

# ── main ───────────────────────────────────────────────────────────────────────
def main():
    print(f"Connecting to database…")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # 1. Ensure required columns exist on areas table
        print("Ensuring areas table columns…")
        for col, typedef in [
            ('description', 'TEXT'),
            ('area_type', 'VARCHAR(50)'),
            ('postal_code', 'VARCHAR(20)'),
            ('coordinates', 'VARCHAR(100)'),
        ]:
            cur.execute(f"ALTER TABLE areas ADD COLUMN IF NOT EXISTS {col} {typedef}")
        conn.commit()

        # 2. Ensure area_images table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS area_images (
                id SERIAL PRIMARY KEY,
                area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                image_title VARCHAR(200),
                image_description TEXT,
                is_primary BOOLEAN DEFAULT FALSE,
                image_order INTEGER DEFAULT 0,
                uploaded_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_area_images_area ON area_images(area_id)")

        # 3. Ensure area_amenities table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS area_amenities (
                id SERIAL PRIMARY KEY,
                area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
                amenity_type VARCHAR(50) NOT NULL,
                name VARCHAR(200) NOT NULL,
                distance_km DECIMAL(5,2),
                rating DECIMAL(3,2),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_area_amenities_area ON area_amenities(area_id)")

        # 4. Ensure properties table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS properties (
                id SERIAL PRIMARY KEY,
                area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
                name VARCHAR(200) NOT NULL,
                developer VARCHAR(120),
                property_type VARCHAR(40) NOT NULL,
                address VARCHAR(240),
                price DECIMAL(18,2),
                bedrooms INTEGER,
                image_url TEXT,
                is_featured BOOLEAN DEFAULT FALSE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(is_featured)")

        # 5. Ensure market_trends table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS market_trends (
                id SERIAL PRIMARY KEY,
                area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
                metric_type VARCHAR(50) NOT NULL,
                metric_value DECIMAL(15,2) NOT NULL,
                metric_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 6. Ensure metrics tables exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS metrics (
                id SERIAL PRIMARY KEY,
                code VARCHAR(60) NOT NULL UNIQUE,
                name VARCHAR(120) NOT NULL,
                description TEXT,
                unit VARCHAR(40),
                category VARCHAR(60),
                data_type VARCHAR(20) DEFAULT 'numeric',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS area_metric_values (
                id BIGSERIAL PRIMARY KEY,
                area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
                metric_id INTEGER NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
                period_start DATE NOT NULL,
                period_end DATE,
                value_numeric DECIMAL(18,4),
                value_text TEXT,
                value_json JSONB,
                source VARCHAR(120),
                source_reference TEXT,
                quality_score SMALLINT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(area_id, metric_id, period_start)
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_amv_area_metric ON area_metric_values(area_id, metric_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_amv_area_period ON area_metric_values(area_id, period_start DESC)")
        conn.commit()
        print("  ✅ Tables ensured")

        # 7. Update area metadata
        print("Updating area metadata…")
        for area_id, desc, area_type, postal, coords in AREA_META:
            cur.execute("""
                UPDATE areas SET description=%s, area_type=%s, postal_code=%s, coordinates=%s
                WHERE id=%s
            """, (desc, area_type, postal, coords, area_id))
        conn.commit()

        # 8. Seed images (ON CONFLICT DO NOTHING via unique index on area_id+image_url)
        print("Seeding area images…")
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_area_images_url ON area_images(area_id, image_url)")
        img_count = 0
        for area_id, url, title, is_primary, order in IMAGES:
            cur.execute("""
                INSERT INTO area_images (area_id, image_url, image_title, image_description, is_primary, image_order)
                VALUES (%s,%s,%s,%s,%s,%s)
                ON CONFLICT DO NOTHING
            """, (area_id, url, title, title, is_primary, order))
            img_count += cur.rowcount
        conn.commit()
        print(f"  ✅ {img_count} images inserted")

        # 9. Seed amenities
        print("Seeding amenities…")
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_amenities_area_name ON area_amenities(area_id, name)")
        amen_count = 0
        for row in AMENITIES:
            cur.execute("""
                INSERT INTO area_amenities (area_id, amenity_type, name, distance_km, rating, description)
                VALUES (%s,%s,%s,%s,%s,%s)
                ON CONFLICT DO NOTHING
            """, row)
            amen_count += cur.rowcount
        conn.commit()
        print(f"  ✅ {amen_count} amenities inserted")

        # 10. Seed properties
        print("Seeding properties…")
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_area_name ON properties(area_id, name)")
        prop_count = 0
        for row in PROPERTIES:
            cur.execute("""
                INSERT INTO properties
                  (area_id, name, developer, property_type, address, price,
                   bedrooms, image_url, is_featured, description)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT DO NOTHING
            """, row)
            prop_count += cur.rowcount
        conn.commit()
        print(f"  ✅ {prop_count} properties inserted")

        # 11. Seed metrics catalog
        print("Seeding metrics catalog…")
        metric_count = 0
        for row in METRICS_CATALOG:
            cur.execute("""
                INSERT INTO metrics (code, name, description, unit, category)
                VALUES (%s,%s,%s,%s,%s)
                ON CONFLICT (code) DO NOTHING
            """, row)
            metric_count += cur.rowcount
        conn.commit()
        print(f"  ✅ {metric_count} metrics inserted")

        # 12. Seed market_trends (36 months) 
        print("Seeding market trends…")
        cur.execute("ALTER TABLE market_trends ADD COLUMN IF NOT EXISTS metric_date DATE")
        trend_count = 0
        for area_id, (bp, br, bv) in MARKET_TREND_BASES.items():
            prices   = trend_series(bp, 0.6, 36, 0.04)
            rentals  = trend_series(br, 0.4, 36, 0.03)
            vacancies= trend_series(bv, 0.1, 36, 0.05)
            for i, period in enumerate(PERIODS):
                for mtype, val in [('average_price', prices[i]), ('rental_yield', rentals[i]), ('vacancy_rate', vacancies[i])]:
                    cur.execute("""
                        INSERT INTO market_trends (area_id, metric_type, metric_value, metric_date)
                        VALUES (%s,%s,%s,%s)
                        ON CONFLICT DO NOTHING
                    """, (area_id, mtype, val, period))
                    trend_count += cur.rowcount
        conn.commit()
        print(f"  ✅ {trend_count} trend rows inserted")

        # 13. Seed area_metric_values (36 months x 9 metrics x 4 areas)
        print("Seeding area metric values…")
        cur.execute("SELECT code, id FROM metrics")
        metric_map = {r[0]: r[1] for r in cur.fetchall()}
        mv_count = 0
        for metric_code, area_bases in AREA_METRIC_BASES.items():
            metric_id = metric_map.get(metric_code)
            if not metric_id:
                continue
            for area_id, base_val in area_bases.items():
                series = trend_series(base_val, 0.5, 36, 0.04)
                rows = [(area_id, metric_id, period, round(series[i], 4), 'historical_seed')
                        for i, period in enumerate(PERIODS)]
                execute_values(cur, """
                    INSERT INTO area_metric_values (area_id, metric_id, period_start, value_numeric, source)
                    VALUES %s ON CONFLICT DO NOTHING
                """, rows)
                mv_count += cur.rowcount
        conn.commit()
        print(f"  ✅ {mv_count} metric value rows inserted")

        print("\n✅ Production seed complete!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Seed failed: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    main()
