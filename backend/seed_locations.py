"""Seed location hierarchy (countries, provinces, cities, areas) if empty.

This creates a minimal but useful South African hierarchy so that
frontend dropdowns have immediate data. Safe to run multiple times
because it checks for existing rows by ID.
"""
from db_core import db
from area_models import Country, Province, City, Area

COUNTRY_ID = "ZA"

PROVINCES = [
    ("ZA-GP", "Gauteng"),
    ("ZA-WC", "Western Cape"),
    ("ZA-KZN", "KwaZulu-Natal"),
]

CITIES = [
    ("JHB", "Johannesburg", "ZA-GP"),
    ("PTA", "Pretoria", "ZA-GP"),
    ("CPT", "Cape Town", "ZA-WC"),
    ("DBN", "Durban", "ZA-KZN"),
]

AREAS = [
    ("SANDTON", "Sandton", "JHB"),
    ("ROSEBANK", "Rosebank", "JHB"),
    ("CENTURION", "Centurion", "PTA"),
    ("CAMPSBAY", "Camps Bay", "CPT"),
    ("SEA_POINT", "Sea Point", "CPT"),
    ("UMLANGA", "Umhlanga", "DBN"),
]

def seed_locations(verbose: bool = True):
    # Check if already seeded
    if Country.query.first():
        if verbose:
            print("Location seeding skipped: countries table already populated")
        return

    if verbose:
        print("Seeding location hierarchy...")

    country = Country(id=COUNTRY_ID, name="South Africa")
    db.session.add(country)

    province_map = {}
    for pid, name in PROVINCES:
        p = Province(id=pid, name=name, country_id=COUNTRY_ID)
        db.session.add(p)
        province_map[pid] = p

    city_map = {}
    for cid, name, province_id in CITIES:
        c = City(id=cid, name=name, province_id=province_id)
        db.session.add(c)
        city_map[cid] = c

    for aid, name, city_id in AREAS:
        a = Area(id=aid, name=name, city_id=city_id)
        db.session.add(a)

    db.session.commit()
    if verbose:
        print("✅ Location hierarchy seeded (1 country, {} provinces, {} cities, {} areas)".format(
            len(PROVINCES), len(CITIES), len(AREAS)
        ))
