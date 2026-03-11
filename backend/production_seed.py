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

# ─────────────────────────────────────────────────────────────────────────────
# Extended area metadata (new areas added via expand_hierarchy.sql)
# ─────────────────────────────────────────────────────────────────────────────
AREA_META_EXTENDED = {
    'Midrand':            ('Midrand is a fast-growing technology and business hub midway between Johannesburg and Pretoria, home to Gallagher Convention Centre, Waterfall City, and the Mall of Africa.', 'mixed', '1682', '-25.9940,28.1281'),
    'Fourways':           ('Fourways is a sought-after northern Johannesburg node known for Montecasino, Fourways Mall, and the Broadacres lifestyle village.', 'mixed', '2055', '-26.0069,28.0069'),
    'Hyde Park':          ("Hyde Park is one of Johannesburg's most affluent suburbs, adjacent to Sandhurst and Dunkeld, anchored by the Hyde Park Shopping Centre.", 'residential', '2196', '-26.1253,28.0430'),
    'Hatfield':           ('Hatfield is a vibrant Pretoria suburb anchored by the University of Pretoria and the U.S. Embassy precinct, with strong student rental demand.', 'mixed', '0083', '-25.7479,28.2378'),
    'Menlyn':             ("Menlyn is Pretoria's primary retail hub, anchored by Menlyn Park Shopping Centre and the Menlyn Maine mixed-use development.", 'commercial', '0181', '-25.7836,28.2768'),
    'V&A Waterfront':     ("The V&A Waterfront is Cape Town's premier mixed-use precinct on the working harbour, with luxury apartments and Table Mountain views.", 'mixed', '8001', '-33.9022,18.4197'),
    'Green Point':        ('Green Point is an urban coastal suburb adjacent to the V&A Waterfront and Cape Town Stadium, known for cosmopolitan restaurants.', 'residential', '8005', '-33.9198,18.4088'),
    'Camps Bay':          ("Camps Bay is Cape Town's prestigious Atlantic Seaboard suburb with the Twelve Apostles backdrop and upscale beachfront strip.", 'residential', '8005', '-33.9503,18.3769'),
    'Umhlanga':           ("Umhlanga is KwaZulu-Natal's premier coastal node, home to Gateway Theatre of Shopping and the Umhlanga Arch development.", 'mixed', '4320', '-29.7276,31.0745'),
    'Ballito':            ('Ballito is a rapidly growing lifestyle town 40 km north of Durban, popular for gated estates and Ballito Junction mall.', 'mixed', '4420', '-29.5386,31.2116'),
    'Morningside Durban': ("Morningside is Durban's upscale Berea Ridge suburb, known for Florida Road restaurants, Musgrave Centre, and UKZN campus.", 'residential', '4001', '-29.8379,30.9972'),
}

# ─────────────────────────────────────────────────────────────────────────────
# Area statistics seed (KPIs per area, name-keyed)
# ─────────────────────────────────────────────────────────────────────────────
AREA_STATS_SEED = {
    'Sandton':            dict(avg_price=4500000, median_price=3800000, ppsqm=48000, growth=5.2, avg_rent=28000, yield_=7.0, vac=4.8, dom=40, crime=44, edu=82, trans=88, amen=90),
    'Rosebank':           dict(avg_price=3800000, median_price=3200000, ppsqm=40000, growth=4.8, avg_rent=22000, yield_=6.5, vac=5.2, dom=46, crime=40, edu=80, trans=92, amen=85),
    'Sea Point':          dict(avg_price=5900000, median_price=4800000, ppsqm=67000, growth=6.8, avg_rent=28000, yield_=5.8, vac=6.5, dom=54, crime=56, edu=78, trans=78, amen=88),
    'Claremont':          dict(avg_price=3200000, median_price=2750000, ppsqm=29000, growth=7.2, avg_rent=18000, yield_=7.2, vac=3.9, dom=30, crime=32, edu=92, trans=72, amen=85),
    'Midrand':            dict(avg_price=3200000, median_price=2800000, ppsqm=32000, growth=6.2, avg_rent=18500, yield_=7.8, vac=5.2, dom=38, crime=48, edu=75, trans=72, amen=70),
    'Fourways':           dict(avg_price=3800000, median_price=3100000, ppsqm=36000, growth=5.8, avg_rent=20000, yield_=7.1, vac=4.5, dom=35, crime=42, edu=80, trans=65, amen=78),
    'Hyde Park':          dict(avg_price=8500000, median_price=7200000, ppsqm=72000, growth=4.0, avg_rent=38000, yield_=5.2, vac=3.8, dom=55, crime=28, edu=88, trans=58, amen=82),
    'Hatfield':           dict(avg_price=1950000, median_price=1600000, ppsqm=19000, growth=4.5, avg_rent=12500, yield_=9.2, vac=6.8, dom=33, crime=55, edu=88, trans=68, amen=72),
    'Menlyn':             dict(avg_price=2800000, median_price=2300000, ppsqm=28000, growth=5.0, avg_rent=16000, yield_=8.5, vac=5.5, dom=36, crime=45, edu=78, trans=70, amen=82),
    'V&A Waterfront':     dict(avg_price=7200000, median_price=6100000, ppsqm=82000, growth=7.5, avg_rent=38000, yield_=6.2, vac=3.5, dom=28, crime=22, edu=80, trans=72, amen=96),
    'Green Point':        dict(avg_price=4800000, median_price=3900000, ppsqm=58000, growth=6.8, avg_rent=26000, yield_=6.8, vac=4.2, dom=32, crime=30, edu=78, trans=75, amen=85),
    'Camps Bay':          dict(avg_price=9800000, median_price=7800000, ppsqm=98000, growth=8.2, avg_rent=48000, yield_=5.8, vac=4.0, dom=45, crime=25, edu=80, trans=55, amen=80),
    'Umhlanga':           dict(avg_price=4200000, median_price=3600000, ppsqm=42000, growth=5.5, avg_rent=24000, yield_=7.5, vac=5.8, dom=42, crime=38, edu=78, trans=62, amen=80),
    'Ballito':            dict(avg_price=3600000, median_price=3000000, ppsqm=36000, growth=6.5, avg_rent=20000, yield_=7.8, vac=6.5, dom=38, crime=32, edu=72, trans=48, amen=68),
    'Morningside Durban': dict(avg_price=2800000, median_price=2300000, ppsqm=26000, growth=3.8, avg_rent=16000, yield_=8.0, vac=5.2, dom=48, crime=42, edu=80, trans=65, amen=75),
}

PROPERTIES_EXTRA = []  # removed – platform no longer shows individual properties
if False:  # kept for reference only, never executed
  _disabled = [
    # --- Existing areas gap-fills ---
    ('Sandton',  'Longmeadow Business Estate Unit', 'Redefine', _I, 'Longmeadow Business Estate, Sandton', 22000000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '1000m2 warehouse/logistics unit in premier Longmeadow park.'),
    ('Sandton',  'Sandton Drive Retail Pavilion',   'Atterbury', _T, 'Sandton Dr, Sandton', 12500000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', False, 'Street-facing retail unit 280m2 in high-footfall Sandton corridor.'),
    ('Rosebank', 'The Point Industrial Park',        'BPROP', _I, 'Bram Fischer Dr, Rosebank', 15000000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, 'Light industrial/storage 600m2 with roller shutter and 3-phase power.'),
    ('Rosebank', 'Oxford Arch Retail',               'Hyprop', _T, 'Oxford Rd, Rosebank', 9800000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', True,  'Ground-floor retail 180m2 on the Rosebank strip, prime footfall.'),
    ('Sea Point', 'Regent Road Retail Strip',        'Private', _T, 'Regent Rd, Sea Point', 7200000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', False, '90m2 retail on busy Regent Road, ideal for cafe or boutique.'),
    ('Claremont', 'Kenilworth Road Retail',          'Growthpoint', _T, 'Kenilworth Rd, Claremont', 8500000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', False, '200m2 retail near Cavendish Square with secure parking.'),
    # --- Midrand ---
    ('Midrand', 'Waterfall Crest Apartments', 'Balwin', _R, 'Waterfall City, Midrand', 2950000, 2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', True,  '2-bed in the sought-after Waterfall City node.'),
    ('Midrand', 'The Pines Midrand',           'Tricolt', _R, 'Grand Central, Midrand', 2400000, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', False, 'Compact 1-bed, ideal for young professional.'),
    ('Midrand', 'Kyalami Estates Villa',       'Private', _R, 'Kyalami Rd, Midrand', 5800000, 4, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', True,  'Spacious 4-bed family home in Kyalami estate.'),
    ('Midrand', '25 Central',                  'Amdec', _R, '25 New Rd, Midrand', 3400000, 2, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', False, 'Modern lock-up-and-go 2-bed with gym and pool.'),
    ('Midrand', 'Midrand Loft Studios',        'Private', _R, 'Midrand Metro, Midrand', 1750000, 1, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', False, 'Entry-level studio, ideal for buy-to-let investor.'),
    ('Midrand', 'Midrand Boulevard Offices',   'Eris', _C, 'Boulders Office Park, Midrand', 18500000, None, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', True, 'Modern 800m2 A-grade office in landmark park.'),
    ('Midrand', 'Grand Central Commercial Hub','Redefine', _C, 'Grand Central, Midrand', 11500000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '450m2 open-plan commercial, ideal for tech/fintech.'),
    ('Midrand', 'Longmeadow Logistics Unit',   'Redefine', _I, 'Longmeadow East, Midrand', 19500000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '900m2 logistics unit with 12m eave and dock levellers.'),
    ('Midrand', 'Waterfall Retail Strip',      'Atterbury', _T, 'Waterfall City Mall, Midrand', 9200000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', False, '240m2 high-footfall retail in Waterfall City.'),
    # --- Fourways ---
    ('Fourways', 'Broadacres Views',           'Ellerine', _R, 'Broadacres Dr, Fourways', 3200000, 2, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800', True,  'Contemporary 2-bed with rooftop pool in Broadacres.'),
    ('Fourways', 'Montecasino Residences',     'Tsogo', _R, 'Montecasino Blvd, Fourways', 4500000, 2, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', True,  'Elegant 2-bed in the Montecasino precinct.'),
    ('Fourways', 'William Nicol Estate',       'Private', _R, 'William Nicol Dr, Fourways', 5900000, 3, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', False, 'Family 3-bed home in full-title estate with security.'),
    ('Fourways', 'The Buzz Shopping Quarter Apt', 'Balwin', _R, 'Fourways Mall, Fourways', 2700000, 1, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', False, 'Compact 1-bed steps from Fourways Mall, good yields.'),
    ('Fourways', 'Cedar Square Studios',       'Tricolt', _R, 'Cedar Rd, Fourways', 2100000, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', False, 'Studio in secure Cedar Square complex.'),
    ('Fourways', 'Fourways Business Park',     'Eris', _C, 'Fourways Business Park', 16000000, None, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', True, 'P-grade 700m2 office with conferencing and fibre.'),
    ('Fourways', 'William Nicol Offices',      'Vicus', _C, 'William Nicol Dr, Fourways', 10500000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '400m2 flexible commercial in high-visibility corridor.'),
    ('Fourways', 'Witkoppen Industrial Park',  'BPROP', _I, 'Witkoppen Rd, Fourways', 17000000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '750m2 industrial unit, 3-phase power, large yard.'),
    ('Fourways', 'Montecasino Retail Concourse', 'Tsogo', _T, 'Montecasino Blvd, Fourways', 11200000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', False, '320m2 ground-floor retail in high-footfall Montecasino.'),
    # --- Hyde Park ---
    ('Hyde Park', 'Hyde Park Villa',             'Private', _R, 'Jan Smuts Ave, Hyde Park', 12500000, 4, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', True,  '4-bed heritage villa with pool in prestigious Hyde Park.'),
    ('Hyde Park', 'Dunkeld Manor Estate',        'Legacy', _R, 'Dunkeld West, Hyde Park', 18500000, 5, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', True,  'Ultra-luxury 5-bed estate on 2000m2 with staff quarters.'),
    ('Hyde Park', 'Hyde Park Corner Apartments', 'Amdec', _R, 'Hyde Park Corner, Johannesburg', 7200000, 3, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', False, 'Elegant 3-bed penthouse with Johannesburg skyline views.'),
    ('Hyde Park', 'Sandhurst Apartments',        'Private', _R, 'Sandhurst, Hyde Park', 9800000, 3, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800', False, 'Boutique 3-bed in Sandhurst with concierge.'),
    ('Hyde Park', 'Melrose Arch Pied-a-Terre',  'Atterbury', _R, 'Melrose Arch, Hyde Park', 6500000, 2, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', True,  'Lock-up-and-go 2-bed in award-winning Melrose Arch.'),
    ('Hyde Park', 'Fricker Road Office Park',   'Growthpoint', _C, 'Fricker Rd, Hyde Park', 25000000, None, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', False, 'Premium 1100m2 A-grade office with EV charging.'),
    ('Hyde Park', 'Hyde Park Lane Commercial',  'Eris', _C, 'Hyde Park Ln, Johannesburg', 16000000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '600m2 boutique commercial in exclusive low-rise park.'),
    ('Hyde Park', 'Melrose Arch Retail Unit',   'Atterbury', _T, 'Melrose Arch Piazza, Hyde Park', 14000000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', True,  '250m2 flagship retail in Melrose Arch piazza.'),
    ('Hyde Park', 'Northcliff Light Industrial','BPROP', _I, 'Northcliff, Hyde Park', 12500000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '560m2 light industrial adjacent to N1 western bypass.'),
    # --- Hatfield ---
    ('Hatfield', 'Brooklyn Square Apartments',  'Tricolt', _R, 'Hilda St, Hatfield', 1850000, 2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', True,  'Investor-grade 2-bed near University of Pretoria.'),
    ('Hatfield', 'The Yard Hatfield',           'Private', _R, 'Festival St, Hatfield', 1350000, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', False, 'Compact 1-bed, ideal for student or diplomatic tenant.'),
    ('Hatfield', 'Embassy Quarter Townhouse',   'Redefine', _R, 'Atterbury Rd, Hatfield', 2800000, 3, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', False, '3-bed townhouse near the embassy precinct.'),
    ('Hatfield', 'UP Village Studios',          'Balwin', _R, 'University Rd, Hatfield', 950000, 1, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', True,  'Student-facing studio with fibre, excellent ROI.'),
    ('Hatfield', 'Hilda Street Apartments',     'Private', _R, 'Hilda St, Hatfield', 2200000, 2, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800', False, 'Neat 2-bed near Embassygate.'),
    ('Hatfield', 'Hatfield Corporate Hub',      'Eris', _C, 'Burnett St, Hatfield', 9500000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '350m2 B-grade office, affordable for NGOs and startups.'),
    ('Hatfield', 'Embassygate Commercial',      'Legacy', _C, 'Church St, Hatfield', 7200000, None, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', False, '280m2 commercial space opposite SA embassies cluster.'),
    ('Hatfield', 'Hatfield Logistics Park',     'Redefine', _I, 'Lynnwood Rd, Hatfield', 8500000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '400m2 mini-warehouse with 24hr access.'),
    ('Hatfield', 'Arcadia Retail Strip',        'Growthpoint', _T, 'Skinner St, Hatfield', 5800000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', False, '140m2 retail, high passing trade from university.'),
    # --- Menlyn ---
    ('Menlyn', 'Menlyn Maine Residences',       'Atterbury', _R, 'Aramist Ave, Menlyn', 3400000, 2, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', True,  'Contemporary 2-bed in Menlyn Maine live-work-play.'),
    ('Menlyn', 'Glenfair Studios',              'Balwin', _R, 'Glenfair Blvd, Menlyn', 1600000, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', False, 'Smart studio, strong short-term rental returns.'),
    ('Menlyn', 'Menlyn Penthouse',              'Private', _R, 'Menlyn Maine, Menlyn', 5200000, 3, 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800', True,  'Top-floor 3-bed penthouse with wrap-around balcony.'),
    ('Menlyn', 'Pontiac Estate Townhouse',      'Vicus', _R, 'Pontiac Rd, Menlyn', 2800000, 3, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', False, 'Freestanding 3-bed townhouse with fibre and monitoring.'),
    ('Menlyn', 'Soutpansberg Apartments',       'Private', _R, 'Soutpansberg Rd, Menlyn', 2100000, 2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', False, 'Neat 2-bed close to Menlyn Park, ideal for families.'),
    ('Menlyn', 'Menlyn Maine Office Tower',     'Atterbury', _C, 'Lois Ave, Menlyn', 32000000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', True,  'A-grade 1400m2 in Menlyn Maine iconic towers.'),
    ('Menlyn', 'Southdowns Business Park',      'Eris', _C, 'Southdowns Dr, Menlyn', 14500000, None, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', False, '580m2 P-grade office with green certification.'),
    ('Menlyn', 'N1 Industrial Gateway',         'Redefine', _I, 'N1 Dr, Menlyn', 16500000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '720m2 industrial/distribution unit on the N1 eastern bypass.'),
    ('Menlyn', 'Menlyn Park Retail Unit',       'Atterbury', _T, 'Menlyn Park Centre, Menlyn', 18000000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', True,  "450m2 premium retail in one of SA's largest malls."),
    # --- V&A Waterfront ---
    ('V&A Waterfront', 'Harbour Bridge Suites',     'Portside', _R, 'Harbour Bridge, V&A Waterfront', 9800000, 2, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', True,  'Hotel-style 2-bed with marina views and luxury finishes.'),
    ('V&A Waterfront', 'The Knsna Penthouse',       'Private', _R, 'Knsna Quays, V&A Waterfront', 16500000, 3, 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800', True,  'Spectacular 3-bed penthouse with Table Mountain panorama.'),
    ('V&A Waterfront', 'Canal Walk Marina Apartment','Rabie', _R, 'Marina Dr, V&A Waterfront', 7200000, 2, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', False, 'Contemporary 2-bed with direct marina access.'),
    ('V&A Waterfront', 'One and Only Residences',   'Kerzner', _R, 'One and Only Cape Town, V&A Waterfront', 28000000, 3, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800', True, 'Ultra-luxury branded residence at the iconic One and Only.'),
    ('V&A Waterfront', 'Breakwater Loft Studio',    'Private', _R, 'Breakwater Blvd, V&A Waterfront', 4200000, 1, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', False, 'Stylish 1-bed lock-up-and-go, popular short-term rental.'),
    ('V&A Waterfront', 'Quayside House Office',     'Growthpoint', _C, 'Quayside House, V&A Waterfront', 48000000, None, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', True,  'Iconic 2000m2 P-grade office on the waterfront promenade.'),
    ('V&A Waterfront', 'Breakwater Lodge Commercial','Redefine', _C, 'Portswood Rd, V&A Waterfront', 22000000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '800m2 boutique commercial in the historic Breakwater Lodge.'),
    ('V&A Waterfront', 'Clock Tower Retail',        'CBRE', _T, 'Clock Tower Piazza, V&A Waterfront', 32000000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', True, '600m2 flagship retail at the Clock Tower with tourist flow.'),
    ('V&A Waterfront', 'West Quay Warehouse',       'Transnet', _I, 'West Quay Rd, V&A Waterfront', 14000000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, 'Historic 1200m2 warehouse for light industrial/creative use.'),
    # --- Green Point ---
    ('Green Point', 'Stadium Precinct Apartments', 'Amdec', _R, 'Fritz Sonnenberg Rd, Green Point', 5200000, 2, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800', True,  '2-bed overlooking the Cape Town Stadium precinct.'),
    ('Green Point', 'Somerset Park Studio',        'Tricolt', _R, 'Somerset Rd, Green Point', 2800000, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', False, 'Contemporary 1-bed on Somerset Road restaurant strip.'),
    ('Green Point', 'The Met Apartments',          'Legacy', _R, 'Metropolitan Golf, Green Point', 7500000, 3, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800', True,  'Luxury 3-bed with golf course and mountain views.'),
    ('Green Point', 'Waterkant Mews',              'Private', _R, 'Waterkant St, Green Point', 4100000, 2, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', False, 'Renovated 2-bed in converted warehouse on De Waterkant strip.'),
    ('Green Point', 'Beach Road Penthouse',        'Rabie', _R, 'Beach Rd, Green Point', 9200000, 3, 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800', True, 'Top-floor 3-bed with unobstructed Atlantic Ocean views.'),
    ('Green Point', 'Somerset House Offices',      'Eris', _C, 'Somerset Rd, Green Point', 19000000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '780m2 A-grade office beside Cape Town Stadium.'),
    ('Green Point', 'Metropolitan Business Centre','Growthpoint', _C, 'Fritz Sonnenberg Rd, Green Point', 12500000, None, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', False, '480m2 boutique commercial in a heritage building.'),
    ('Green Point', 'Loader Street Industrial',    'BPROP', _I, 'Loader St, Green Point', 8500000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '380m2 light industrial unit for creative or film production.'),
    ('Green Point', 'Somerset Road Retail',        'Private', _T, 'Somerset Rd, Green Point', 7800000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', False, '160m2 retail on Somerset Road food and retail strip.'),
    # --- Camps Bay ---
    ('Camps Bay', 'Geneva Drive Villa',            'Private', _R, 'Geneva Dr, Camps Bay', 22000000, 5, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', True, '5-bed iconic villa with infinity pool and Atlantic views.'),
    ('Camps Bay', 'Bulkhead Villa',                'Atlantic Properties', _R, 'Bulkhead Rd, Camps Bay', 16500000, 4, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', True, '4-bed cliff-hugging villa with panoramic Atlantic panorama.'),
    ('Camps Bay', 'The Strip Penthouse',           'Rabie', _R, 'Victoria Rd, Camps Bay', 12000000, 3, 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800', True,  'Penthouse above the Camps Bay Strip with private pool.'),
    ('Camps Bay', 'Horseshoe Walk Apartments',     'Private', _R, 'Horseshoe Crescent, Camps Bay', 7800000, 2, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', False, 'Elegant 2-bed with sea glimpses, steps from the beach.'),
    ('Camps Bay', 'Bakoven Seaside Cottage',       'Private', _R, 'Bakoven Rd, Camps Bay', 5500000, 2, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', False, 'Charming 2-bed beachside cottage in peaceful Bakoven cove.'),
    ('Camps Bay', 'Victoria Road Commercial',      'Redefine', _C, 'Victoria Rd, Camps Bay', 14000000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '500m2 mixed commercial space above the Camps Bay Strip.'),
    ('Camps Bay', "Camps Bay Restaurant Suite",    'Private', _T, 'Victoria Rd, Camps Bay', 11500000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', True, 'Prestigious 200m2 restaurant unit on the Camps Bay Strip.'),
    ('Camps Bay', 'Bakoven Light Industrial',      'BPROP', _I, 'Houghton Rd, Camps Bay', 6800000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '280m2 creative/light industrial for film or design studio.'),
    ('Camps Bay', 'The Glen Boutique Studio',      'Private', _R, 'Glen Beach, Camps Bay', 4200000, 1, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', False, 'Contemporary 1-bed with sea views, excellent Airbnb returns.'),
    # --- Umhlanga ---
    ('Umhlanga', 'Umhlanga Arch Residences',       'Corevest', _R, 'Umhlanga Arch, Umhlanga', 5500000, 2, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', True,  'Luxury 2-bed in the transformative Umhlanga Arch precinct.'),
    ('Umhlanga', 'Pearls of Umhlanga',             'Rabie', _R, 'Lighthouse Rd, Umhlanga', 8500000, 3, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', True,  'Premier beachfront 3-bed in landmark Pearls development.'),
    ('Umhlanga', 'Gateway Manor Apartment',        'Tricolt', _R, 'Gateway Dr, Umhlanga', 3400000, 2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', False, '2-bed near Gateway Theatre, consistent rental demand.'),
    ('Umhlanga', 'Ridgeside Studio',               'Balwin', _R, 'Ridgeside Dr, Umhlanga', 2400000, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', False, 'Smart 1-bed in the emerging Ridgeside node.'),
    ('Umhlanga', 'La Lucia Ridge Townhouse',       'Private', _R, 'La Lucia Rd, Umhlanga', 4800000, 3, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', True,  'Spacious 3-bed with sea views in La Lucia Ridge estate.'),
    ('Umhlanga', 'Gateway Business Park',          'Growthpoint', _C, 'Ridgeside Campus, Umhlanga', 28000000, None, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', True, 'A-grade 1200m2 office in Ridgeside Campus above Gateway.'),
    ('Umhlanga', 'Lighthouse Road Commercial',     'Eris', _C, 'Lighthouse Rd, Umhlanga', 14000000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '560m2 boutique commercial in the Lighthouse Road strip.'),
    ('Umhlanga', 'Riverhorse Logistics Unit',      'Redefine', _I, 'Riverhorse Valley, Umhlanga', 18000000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, "900m2 warehousing in SA's most sought-after KZN industrial park."),
    ('Umhlanga', 'Gateway Retail Pavilion',        'Corevest', _T, 'Gateway Theatre Blvd, Umhlanga', 21000000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', True,  '480m2 flagship retail in Gateway Theatre of Shopping.'),
    # --- Ballito ---
    ('Ballito', 'Seaward Estates Villa',           'Devmark', _R, 'Seaward Estates, Ballito', 6200000, 4, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', True,  'Upmarket 4-bed in exclusive Seaward Estates gated village.'),
    ('Ballito', 'Ballito Bay Apartments',          'Private', _R, 'Compensation Beach Rd, Ballito', 3200000, 2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', False, '2-bed beachfront apartment, strong holiday rental.'),
    ('Ballito', 'Salt Rock Townhouse',             'Tricolt', _R, 'Salt Rock Dr, Ballito', 2900000, 3, 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800', False, 'Family 3-bed townhouse in popular Salt Rock enclave.'),
    ('Ballito', 'Simbithi Eco-Estate Home',        'Simbithi Eco', _R, 'Simbithi, Ballito', 8800000, 4, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', True,  '4-bed eco-mansion on Simbithi Golf Estate.'),
    ('Ballito', 'Tinley Manor Studio',             'Balwin', _R, 'Tinley Manor, Ballito', 1850000, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', False, 'Entry-level 1-bed studio, ideal for semigrant investor.'),
    ('Ballito', 'Ballito Junction Tower Offices',  'Hyprop', _C, 'Ballito Junction Mall, Ballito', 9500000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '360m2 B-grade office in the Ballito Junction commercial tower.'),
    ('Ballito', 'KwaDukuza Commercial Park',       'Eris', _C, 'R102, Ballito', 7200000, None, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', False, '280m2 commercial unit in growing park near N2.'),
    ('Ballito', 'Canelands Logistics Hub',         'BPROP', _I, 'Canelands, Ballito', 12000000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '600m2 logistics unit alongside N2/N3 interchange.'),
    ('Ballito', 'Ballito Junction Retail',         'Hyprop', _T, 'Ballito Junction Regional Mall, Ballito', 14500000, None, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', True,  '340m2 flagship retail in fastest-growing KZN mall.'),
    # --- Morningside Durban ---
    ('Morningside Durban', 'Florida Road Apartments', 'Private', _R, 'Florida Rd, Morningside Durban', 3200000, 2, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800', True,  '2-bed apartment above the vibrant Florida Road strip.'),
    ('Morningside Durban', 'Musgrave Terrace',        'Tricolt', _R, 'Musgrave Rd, Morningside Durban', 2600000, 2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', False, 'Contemporary 2-bed in well-managed Musgrave complex.'),
    ('Morningside Durban', 'The Ridge View Mansion',  'Private', _R, 'Berea Rd, Morningside Durban', 9500000, 5, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', True,  'Elegant 5-bed Berea Ridge mansion with Indian Ocean views.'),
    ('Morningside Durban', 'Cowey Park Studios',      'Balwin', _R, 'Cowey Rd, Morningside Durban', 1650000, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', False, 'Entry-level studio near UKZN, professional demand.'),
    ('Morningside Durban', 'Morningside Gardens',     'Vicus', _R, 'Marriott Rd, Morningside Durban', 3800000, 3, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', False, '3-bed garden apartment in pet-friendly estate.'),
    ('Morningside Durban', 'Florida Road Office Park', 'Eris', _C, 'Florida Rd, Morningside Durban', 8500000, None, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', False, '320m2 B-grade office in Florida Road lifestyle corridor.'),
    ('Morningside Durban', 'Inanda Rd Commercial',    'Growthpoint', _C, 'Inanda Rd, Morningside Durban', 6200000, None, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', False, '240m2 commercial on the prestigious Inanda Road corridor.'),
    ('Morningside Durban', 'Brickfield Industrial',   'BPROP', _I, 'Brickfield Rd, Morningside Durban', 7800000, None, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', False, '370m2 light industrial with truck access.'),
# ─────────────────────────────────────────────────────────────────────────────
# Province snapshot base data (6 months x 3 provinces)
# ─────────────────────────────────────────────────────────────────────────────
_PROVINCE_SNAP_BASE = {
    'Gauteng':       dict(avg_price=3800000, median_price=2400000, ppsqm=38000, base_growth=4.2, yield_=7.0, vac=5.1, avg_rent=18500, q_sales=8500, listings=32000, dom=42, transport=68, crime=55, amenities=72, planned_dev=180, pop_growth=2.1, pop_est=16000000, income=420000, grade='A',  sentiment='rising'),
    'Western Cape':  dict(avg_price=4200000, median_price=2950000, ppsqm=58000, base_growth=6.5, yield_=6.2, vac=4.8, avg_rent=21000, q_sales=4200, listings=18500, dom=35, transport=62, crime=42, amenities=76, planned_dev=120, pop_growth=3.2, pop_est=7200000,  income=485000, grade='A+', sentiment='hot'),
    'KwaZulu-Natal': dict(avg_price=2800000, median_price=1850000, ppsqm=28500, base_growth=3.8, yield_=7.8, vac=5.7, avg_rent=15200, q_sales=3800, listings=22000, dom=52, transport=55, crime=58, amenities=65, planned_dev=95,  pop_growth=1.5, pop_est=11900000, income=320000, grade='B+', sentiment='stable'),
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

        # 6b. Run additional SQL migration files (parcel snapshots, search indices)
        print("Applying SQL migrations…")
        _sql_dir = os.path.join(os.path.dirname(__file__), 'sql')
        for _migration in (
            'expand_hierarchy.sql',
            'province_snapshots_schema.sql',
            'parcel_snapshots_migration.sql',
            'search_indices.sql',
        ):
            _migration_path = os.path.join(_sql_dir, _migration)
            if os.path.exists(_migration_path):
                with open(_migration_path, 'r') as _f:
                    _sql = _f.read()
                cur.execute(_sql)
                conn.commit()
                print(f"  ✅ Applied {_migration}")
            else:
                print(f"  ⚠️  Migration not found: {_migration_path}")

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

        # 14. Update extended area metadata (new areas from expand_hierarchy.sql)
        print("Seeding extended area metadata...")
        cur.execute("SELECT name, id FROM areas")
        area_name_map = {r[0]: r[1] for r in cur.fetchall()}
        meta_count = 0
        for area_name, (desc, atype, postal, coords) in AREA_META_EXTENDED.items():
            aid = area_name_map.get(area_name)
            if not aid:
                continue
            cur.execute("""
                UPDATE areas
                SET description=%s, area_type=%s, postal_code=%s, coordinates=%s
                WHERE id=%s
            """, (desc, atype, postal, coords, aid))
            meta_count += cur.rowcount
        conn.commit()
        print(f"  \u2705 {meta_count} area metadata rows updated")

        # 15. Seed area_statistics for all 15 areas
        print("Seeding area statistics...")
        import datetime
        stat_count = 0
        period_start = datetime.date(2024, 1, 1)
        period_end   = datetime.date(2024, 12, 31)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS area_statistics (
                id SERIAL PRIMARY KEY,
                area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
                average_property_price NUMERIC,
                median_property_price  NUMERIC,
                price_per_sqm          NUMERIC,
                price_growth_yoy       NUMERIC,
                average_rental_price   NUMERIC,
                rental_yield           NUMERIC,
                rental_growth_yoy      NUMERIC,
                vacancy_rate           NUMERIC,
                days_on_market         INTEGER,
                total_properties_sold  INTEGER,
                total_rental_properties INTEGER,
                crime_index_score      NUMERIC,
                education_score        NUMERIC,
                transport_score        NUMERIC,
                amenities_score        NUMERIC,
                data_period_start      DATE,
                data_period_end        DATE,
                UNIQUE(area_id, data_period_start)
            )
        """)
        for area_name, kpi in AREA_STATS_SEED.items():
            aid = area_name_map.get(area_name)
            if not aid:
                continue
            cur.execute("""
                INSERT INTO area_statistics
                    (area_id, average_property_price, median_property_price, price_per_sqm,
                     price_growth_yoy, average_rental_price, rental_yield,
                     vacancy_rate, days_on_market,
                     crime_index_score, education_score, transport_score, amenities_score,
                     data_period_start, data_period_end)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (area_id, data_period_start) DO UPDATE SET
                    average_property_price = EXCLUDED.average_property_price,
                    median_property_price  = EXCLUDED.median_property_price,
                    price_per_sqm          = EXCLUDED.price_per_sqm,
                    price_growth_yoy       = EXCLUDED.price_growth_yoy,
                    average_rental_price   = EXCLUDED.average_rental_price,
                    rental_yield           = EXCLUDED.rental_yield,
                    vacancy_rate           = EXCLUDED.vacancy_rate,
                    days_on_market         = EXCLUDED.days_on_market,
                    crime_index_score      = EXCLUDED.crime_index_score,
                    education_score        = EXCLUDED.education_score,
                    transport_score        = EXCLUDED.transport_score,
                    amenities_score        = EXCLUDED.amenities_score
            """, (aid,
                  kpi['avg_price'], kpi['median_price'], kpi['ppsqm'],
                  kpi['growth'], kpi['avg_rent'], kpi['yield_'],
                  kpi['vac'], kpi['dom'],
                  kpi['crime'], kpi['edu'], kpi['trans'], kpi['amen'],
                  period_start, period_end))
            stat_count += cur.rowcount
        conn.commit()
        print(f"  \u2705 {stat_count} area_statistics rows upserted")

        # 16. Seed extra properties
        print("Seeding extra properties...")
        cur.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_area_name
            ON properties(area_id, name)
        """)
        prop_count = 0
        for (aname, name, dev, ptype, addr, price, beds, img, featured, desc) in PROPERTIES_EXTRA:
            aid = area_name_map.get(aname)
            if not aid:
                continue
            cur.execute("""
                INSERT INTO properties
                    (area_id, name, developer, property_type, address, price,
                     bedrooms, image_url, is_featured, description)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (area_id, name) DO NOTHING
            """, (aid, name, dev, ptype, addr, price, beds, img, featured, desc))
            prop_count += cur.rowcount
        conn.commit()
        print(f"  \u2705 {prop_count} extra properties inserted")

        # 17. Seed province_snapshots (6 months x 3 provinces)
        print("Seeding province snapshots...")
        import datetime as _dt
        cur.execute("SELECT name, id FROM provinces")
        prov_map = {r[0]: r[1] for r in cur.fetchall()}
        snap_count = 0
        months = [_dt.date(2024, m, 1) for m in range(1, 7)]
        for prov_name, base in _PROVINCE_SNAP_BASE.items():
            pid = prov_map.get(prov_name)
            if not pid:
                continue
            for i, snap_date in enumerate(months):
                drift = 1.0 + (i * base['base_growth'] / 100 / 6)
                cur.execute("""
                    INSERT INTO province_snapshots
                        (province_id, snapshot_date,
                         avg_sale_price, median_sale_price, price_per_sqm, price_growth_yoy,
                         avg_rental_yield, avg_vacancy_rate, avg_rental_price,
                         quarterly_sales_volume, active_listings, avg_days_on_market,
                         avg_transport_score, avg_crime_index, avg_amenities_score,
                         total_planned_dev, population_estimate, population_growth_rate,
                         household_income_median, investment_grade, market_sentiment, source)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (province_id, snapshot_date) DO NOTHING
                """, (
                    pid, snap_date,
                    round(base['avg_price'] * drift),
                    round(base['median_price'] * drift),
                    round(base['ppsqm'] * drift),
                    round(base['base_growth'] + i * 0.1, 2),
                    round(base['yield_'] - i * 0.05, 2),
                    round(base['vac'] + i * 0.03, 2),
                    round(base['avg_rent'] * drift),
                    base['q_sales'],
                    base['listings'],
                    base['dom'],
                    base['transport'],
                    base['crime'],
                    base['amenities'],
                    base['planned_dev'],
                    base['pop_est'],
                    base['pop_growth'],
                    base['income'],
                    base['grade'],
                    base['sentiment'],
                    'seed_data_v1'
                ))
                snap_count += cur.rowcount
        conn.commit()
        print(f"  \u2705 {snap_count} province snapshot rows inserted")

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
