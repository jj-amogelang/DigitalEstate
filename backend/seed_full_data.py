"""
Seed all empty tables in the local SQLite database with realistic South African
property data for Sandton, Rosebank, Sea Point and Claremont.

Tables populated:
  - areas           (update descriptions, coordinates)
  - area_images     (Unsplash image URLs)
  - area_amenities  (schools, hospitals, malls, transport)
  - properties      (residential & commercial listings)
  - market_trends   (3 years of monthly price/rental/vacancy data)
  - area_metric_values  (historical monthly metric series – extends existing seed)
"""

import sqlite3, random, math
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

DB = '/Users/amogelangsehlako/Public/DigitalEstate/backend/instance/property_dashboard.db'

# ── helpers ────────────────────────────────────────────────────────────────────
def months_back(n):
    d = date(2025, 9, 1)
    return [(d - relativedelta(months=i)).isoformat() for i in range(n - 1, -1, -1)]

def trend_series(start, growth_pct, periods, noise=0.03):
    """Geometric growth series with small random noise."""
    vals = []
    v = start
    for _ in range(periods):
        v *= (1 + growth_pct / 100) * (1 + (random.random() - 0.5) * noise)
        vals.append(round(v, 2))
    return vals

# ── area metadata ──────────────────────────────────────────────────────────────
AREA_META = {
    1: {  # Sandton
        'description': 'Sandton is the financial capital of Africa, home to the Johannesburg Stock Exchange, luxury hotels, upscale retail centres and a dense concentration of corporate headquarters. The area offers a vibrant mix of high-end residential apartments, Grade-A office parks and world-class amenities.',
        'area_type': 'mixed',
        'postal_code': '2196',
        'coordinates': '-26.1076,28.0567',
    },
    2: {  # Rosebank
        'description': 'Rosebank is a cosmopolitan suburb north of central Johannesburg renowned for its art galleries, boutique hotels, the Zone@Rosebank mall and a thriving café culture. Its pedestrian-friendly streets and Gautrain connectivity make it a top choice for urban professionals.',
        'area_type': 'mixed',
        'postal_code': '2196',
        'coordinates': '-26.1459,28.0438',
    },
    3: {  # Sea Point
        'description': 'Sea Point is a vibrant Atlantic Seaboard suburb of Cape Town, stretching along a dramatic coastline with mountain views. It offers a diverse mix of residential apartment blocks, trendy restaurants, the popular Sea Point Promenade and easy access to the city bowl.',
        'area_type': 'residential',
        'postal_code': '8060',
        'coordinates': '-33.9165,18.3877',
    },
    4: {  # Claremont
        'description': 'Claremont is a well-established Southern Suburbs neighbourhood in Cape Town, popular for its excellent schools, Cavendish Square shopping centre, open parks and strong community character. It attracts young families and professionals seeking quality suburban living close to UCT and the CBD.',
        'area_type': 'residential',
        'postal_code': '7708',
        'coordinates': '-33.9897,18.4679',
    },
}

# ── images (Unsplash static URLs – no API key needed) ─────────────────────────
AREA_IMAGES = {
    1: [  # Sandton
        ('https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200', 'Sandton City Skyline', True),
        ('https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200', 'Nelson Mandela Square', False),
        ('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200', 'Corporate Office Park', False),
    ],
    2: [  # Rosebank
        ('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200', 'Rosebank Mall Precinct', True),
        ('https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200', 'Gautrain Station', False),
        ('https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200', 'Boutique Hotel', False),
    ],
    3: [  # Sea Point
        ('https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200', 'Sea Point Promenade', True),
        ('https://images.unsplash.com/photo-1491472253230-a044054ca35f?w=1200', 'Atlantic Ocean Views', False),
        ('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200', 'Residential Apartments', False),
    ],
    4: [  # Claremont
        ('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200', 'Claremont Suburb', True),
        ('https://images.unsplash.com/photo-1565402170291-8491f14678db?w=1200', 'Cavendish Square', False),
        ('https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200', 'Parks and Gardens', False),
    ],
}

# ── amenities ──────────────────────────────────────────────────────────────────
# (area_id, type, name, distance_km, rating, description)
AMENITIES = [
    # Sandton
    (1,'school','Crawford College Sandton', 1.2, 4.5, 'Leading private school with excellent Matric results.'),
    (1,'school','Bryanston Primary School', 2.8, 4.2, 'Well-regarded government primary school.'),
    (1,'hospital','Morningside Clinic', 1.5, 4.7, 'Private hospital with 24-hour emergency services.'),
    (1,'mall','Sandton City', 0.5, 4.8, 'Flagship retail centre with 300+ stores.'),
    (1,'mall','Nelson Mandela Square', 0.6, 4.6, 'Open-air mall with restaurants and boutiques.'),
    (1,'transport','Sandton Gautrain Station', 0.8, 4.9, 'High-speed rail link to OR Tambo and Pretoria.'),
    (1,'transport','M1 Highway On-ramp', 1.1, None, 'Rapid access to Johannesburg CBD and highways.'),
    (1,'park','Sandton Central Park', 0.3, 4.0, 'Urban greenspace and jogging paths.'),
    # Rosebank
    (2,'school','Rosebank Union School', 0.9, 4.3, 'Private co-ed school in the heart of Rosebank.'),
    (2,'school','St Teresa School', 1.4, 4.4, 'Catholic primary school with good community values.'),
    (2,'hospital','Rosebank Clinic', 0.7, 4.5, 'Day clinic and specialist consulting rooms.'),
    (2,'mall','The Zone @ Rosebank', 0.4, 4.4, 'Retail and entertainment destination.'),
    (2,'mall','Rosebank Mall', 0.5, 4.2, 'Lifestyle centre with cinema and food hall.'),
    (2,'transport','Rosebank Gautrain Station', 0.6, 4.8, 'Gautrain station on the main Sandton–Park Station line.'),
    (2,'park','Faber Park', 0.8, 3.9, 'Community park popular with dog owners.'),
    # Sea Point
    (3,'school','Sea Point Primary School', 0.6, 4.1, 'Well-established government primary school by the sea.'),
    (3,'school','SACS (South African College Schools)', 2.2, 4.7, 'One of Cape Town\'s most prestigious high schools.'),
    (3,'hospital','Cape Town Medi-Clinic', 2.4, 4.6, '24-hour private hospital near the CBD.'),
    (3,'mall','Adelphi Centre', 0.3, 3.8, 'Neighbourhood convenience mall in Sea Point.'),
    (3,'mall','V&A Waterfront', 3.5, 4.9, 'Cape Town\'s premier retail and entertainment precinct.'),
    (3,'transport','MyCiti Bus – Sea Point Route', 0.2, 4.0, 'Rapid transit along Main Road to the City Bowl.'),
    (3,'park','Sea Point Promenade', 0.1, 4.9, 'Iconic 3.5 km coastal walkway and outdoor gym.'),
    # Claremont
    (4,'school','Rustenburg Girls High School', 0.5, 4.6, 'Top-ranked public high school for girls.'),
    (4,'school','Bishops Diocesan College', 1.1, 4.8, 'Prestigious boys school with strong academic record.'),
    (4,'hospital','Kingsbury Hospital Claremont', 0.8, 4.5, 'Full-service private hospital with specialists.'),
    (4,'mall','Cavendish Square', 0.4, 4.5, 'Premium shopping centre with over 180 stores.'),
    (4,'mall','Palmyra Junction', 0.6, 3.9, 'Neighbourhood centre with grocery and retail.'),
    (4,'transport','Claremont Train Station', 0.7, 4.0, 'Metrorail Southern Line to Cape Town CBD.'),
    (4,'park','Arderne Gardens', 0.9, 4.7, 'Historic arboretum with rare tree collection.'),
    (4,'university','University of Cape Town', 1.8, 4.9, 'Africa\'s top-ranked university on the slopes of Devil\'s Peak.'),
]

# ── properties ─────────────────────────────────────────────────────────────────
# (area_id, name, developer, type, address, price, bedrooms, image_url, featured, description)
PROPERTIES = [
    # Sandton – residential
    (1,'The Houghton Luxury Apartments','Ellerine Bros','residential','2 2nd Ave, Houghton, Sandton',4800000,2,'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',True,'Sleek 2-bedroom apartment with panoramic city views in a landmark building.'),
    (1,'Michelangelo Residences','Tsogo Sun','residential','Nelson Mandela Sq, Sandton',8500000,3,'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',True,'Ultra-luxury 3-bedroom residence in the iconic Michelangelo Tower.'),
    (1,'Sandton Gate Apartments','Amdec','residential','William Nicol Dr, Sandton',3200000,1,'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',False,'Modern 1-bedroom apartment in a secure mixed-use development.'),
    (1,'Katherine & West','Atterbury','residential','Cnr Katherine & West St, Sandton',5600000,2,'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800',False,'Contemporary 2-bed apartment with hotel-style amenities.'),
    # Sandton – commercial
    (1,'Alice Lane Office Tower','Atterbury','commercial','Alice Lane, Sandton CBD',35000000,None,'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',True,'A-grade 1 200 m² commercial office floor in prime Sandton CBD.'),
    (1,'Sandton Skye Office Park','Eris','commercial','Rivonia Rd, Sandton',18500000,None,'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800',False,'400 m² flexible office space with fibre and smart technology.'),
    # Rosebank – residential
    (2,'The Tyrwhitt','Growthpoint','residential','Tyrwhitt Ave, Rosebank',3800000,2,'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',True,'Stylish 2-bedroom apartment steps from the Gautrain station.'),
    (2,'27 on Smit','Tricolt','residential','27 Smits St, Rosebank',2900000,1,'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',False,'Compact 1-bedroom apartment ideal for young professionals.'),
    (2,'Oxford Corner','Balwin','residential','Oxford Rd, Rosebank',4500000,2,'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800',True,'Secure 2-bedroom with rooftop pool and gym.'),
    # Rosebank – commercial
    (2,'The Oval Office Park','Hyprop','commercial','Cradock Ave, Rosebank',22000000,None,'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',True,'Premium P-grade offices with green building certification.'),
    # Sea Point – residential
    (3,'Clarens Court','Private Development','residential','9 Clarens Rd, Sea Point',6200000,3,'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',True,'Renovated 3-bed apartment with Atlantic Ocean views.'),
    (3,'Penthouse on Regent','Atlantic Developers','residential','Regent Rd, Sea Point',9800000,4,'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800',True,'Duplex penthouse with private pool and Lion\'s Head views.'),
    (3,'Seabreeze Residences','Rabie Property','residential','Beach Rd, Sea Point',4100000,2,'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',False,'Contemporary 2-bed apartment 50 m from the promenade.'),
    (3,'Sea Point Mews','Private','residential','Main Rd, Sea Point',3600000,2,'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',False,'Charming 2-bed apartment in converted Victorian building.'),
    # Sea Point – commercial
    (3,'Main Road Retail Strip','Private','commercial','Main Rd, Sea Point',8900000,None,'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',False,'Ground-floor retail unit 120 m² in high-footfall location.'),
    # Claremont – residential
    (4,'The Claremont Residence','Rabie Property','residential','Main Rd, Claremont',3200000,2,'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',True,'Spacious 2-bed apartment in boutique building near Cavendish.'),
    (4,'Cavendish Outlook','Private Development','residential','Dreyer St, Claremont',2800000,2,'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800',False,'Neat 2-bedroom with braai balcony and mountain views.'),
    (4,'Surrey Lane','Vicus Developments','residential','Surrey Rd, Claremont',4100000,3,'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',True,'Family 3-bed townhouse with garden in quiet cul-de-sac.'),
    (4,'Ardenbrae Apartments','Private','residential','Campground Rd, Claremont',2200000,1,'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',False,'Entry-level 1-bed for first-time buyers or investors.'),
    # Claremont – commercial/retail
    (4,'Cavendish Place Office','Growthpoint','commercial','Kloof Rd, Claremont',14500000,None,'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800',False,'350 m² open-plan office suite near Cavendish Square.'),
]

# ── market trends (legacy table) & metric series ───────────────────────────────
# We generate 36 months of data per area (Jan 2023 – Sep 2025)
PERIODS = months_back(36)   # list of 36 date strings

def make_area_trends(area_id, base_price, base_rental, base_vacancy):
    prices   = trend_series(base_price,   0.6, 36, 0.04)
    rentals  = trend_series(base_rental,  0.4, 36, 0.03)
    vacancies = trend_series(base_vacancy, 0.1, 36, 0.05)

    trends = []
    for i, period in enumerate(PERIODS):
        trends.append((area_id, 'average_price',   prices[i],    period))
        trends.append((area_id, 'rental_yield',    rentals[i],   period))
        trends.append((area_id, 'vacancy_rate',    vacancies[i], period))
    return trends


# Base values per area  (avg_price, rental_yield, vacancy_rate)
AREA_BASES = {
    1: (4200000, 7.0, 4.8),   # Sandton
    2: (3600000, 6.5, 5.2),   # Rosebank
    3: (5800000, 5.8, 6.5),   # Sea Point
    4: (3000000, 7.2, 3.9),   # Claremont
}

# ── main ───────────────────────────────────────────────────────────────────────
def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    conn.execute('PRAGMA foreign_keys = ON')

    # 1. Update area descriptions / metadata
    print("Updating area metadata…")
    for area_id, meta in AREA_META.items():
        cur.execute("""
            UPDATE areas
            SET description=?, area_type=?, postal_code=?, coordinates=?
            WHERE id=?
        """, (meta['description'], meta['area_type'], meta['postal_code'], meta['coordinates'], area_id))
    print(f"  Updated {cur.rowcount} areas")

    # 2. Area images
    print("Inserting area images…")
    cur.execute("DELETE FROM area_images")
    img_rows = 0
    for area_id, images in AREA_IMAGES.items():
        for idx, (url, caption, is_primary) in enumerate(images):
            cur.execute("""
                INSERT INTO area_images (area_id, image_url, image_title, image_description, is_primary, image_order)
                VALUES (?,?,?,?,?,?)
            """, (area_id, url, caption, caption, 1 if is_primary else 0, idx))
            img_rows += 1
    print(f"  Inserted {img_rows} images")

    # 3. Amenities
    print("Inserting amenities…")
    cur.execute("DELETE FROM area_amenities")
    for row in AMENITIES:
        cur.execute("""
            INSERT INTO area_amenities (area_id, amenity_type, name, distance_km, rating, description)
            VALUES (?,?,?,?,?,?)
        """, row)
    print(f"  Inserted {len(AMENITIES)} amenities")

    # 4. Properties
    print("Inserting properties…")
    cur.execute("DELETE FROM properties")
    for row in PROPERTIES:
        cur.execute("""
            INSERT INTO properties
              (area_id, name, developer, property_type, address, price, bedrooms,
               image_url, is_featured, description)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, row)
    print(f"  Inserted {len(PROPERTIES)} properties")

    # 5. Market trends (legacy table)
    print("Inserting market trends…")
    cur.execute("DELETE FROM market_trends")
    trend_rows = 0
    for area_id, (base_price, base_rental, base_vacancy) in AREA_BASES.items():
        rows = make_area_trends(area_id, base_price, base_rental, base_vacancy)
        for r in rows:
            cur.execute("""
                INSERT INTO market_trends (area_id, metric_type, metric_value, metric_date)
                VALUES (?,?,?,?)
            """, r)
        trend_rows += len(rows)
    print(f"  Inserted {trend_rows} market_trend rows")

    # 6. Extend area_metric_values with 36-month history
    print("Extending area_metric_values with historical series…")
    metric_map = {r[0]: r[1] for r in cur.execute("SELECT code, id FROM metrics").fetchall()}

    extra_metrics = {
        'avg_price':        {1: 4200000, 2: 3600000, 3: 5800000, 4: 3000000},
        'rental_yield':     {1: 7.0,     2: 6.5,     3: 5.8,     4: 7.2},
        'vacancy_rate':     {1: 4.8,     2: 5.2,     3: 6.5,     4: 3.9},
        'crime_index':      {1: 44,      2: 40,      3: 56,      4: 32},
        'days_on_market':   {1: 40,      2: 46,      3: 54,      4: 30},
        'sales_volume':     {1: 90,      2: 68,      3: 44,      4: 58},
        'population_growth':{1: 1.8,     2: 2.0,     3: 1.2,     4: 2.5},
        'planned_dev_count':{1: 12,      2: 7,       3: 5,       4: 9},
        'price_per_sqm':    {1: 42000,   2: 36000,   3: 68000,   4: 28000},
    }

    inserted_mv = 0
    for metric_code, area_bases in extra_metrics.items():
        metric_id = metric_map.get(metric_code)
        if not metric_id:
            continue
        for area_id, base_val in area_bases.items():
            series = trend_series(base_val, 0.5, 36, 0.04)
            for i, period in enumerate(PERIODS):
                cur.execute("""
                    INSERT OR IGNORE INTO area_metric_values
                      (area_id, metric_id, period_start, value_numeric, source)
                    VALUES (?,?,?,?,'historical_seed')
                """, (area_id, metric_id, period, round(series[i], 4)))
                inserted_mv += cur.rowcount
    print(f"  Inserted {inserted_mv} historical metric values")

    conn.commit()
    conn.close()
    print("\n✅ All done! Restart the backend to see data in the app.")


if __name__ == '__main__':
    main()
