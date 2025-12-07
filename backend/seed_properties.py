"""Seed sample EnhancedProperty records if table empty."""
from datetime import date
# Legacy property seeding script (archived)
from database_models import db, EnhancedProperty  # noqa: F401

SAMPLE_PROPERTIES = [
    dict(property_name="Luxury Sandton Apartment", suburb="Sandton", city="Johannesburg", province="Gauteng", property_type="residential", bedrooms=3, bathrooms=2, erf_size=120, building_size=95, status="available", description="Modern apartment in the heart of Sandton CBD with skyline views."),
    dict(property_name="Rosebank Mixed Use Development", suburb="Rosebank", city="Johannesburg", province="Gauteng", property_type="commercial", bedrooms=None, bathrooms=None, erf_size=1800, building_size=5600, status="available", description="Prime mixed-use commercial space near Gautrain station."),
    dict(property_name="Camps Bay Sea View Villa", suburb="Camps Bay", city="Cape Town", province="Western Cape", property_type="residential", bedrooms=5, bathrooms=4, erf_size=750, building_size=420, status="available", description="Luxury coastal villa with panoramic Atlantic Ocean views."),
    dict(property_name="Umhlanga Ridge Office Park", suburb="Umhlanga", city="Durban", province="KwaZulu-Natal", property_type="office", bedrooms=None, bathrooms=10, erf_size=3000, building_size=5000, status="available", description="Grade A office space in Umhlanga Ridge business district."),
]

def seed_properties(verbose: bool = True):
    if EnhancedProperty.query.first():
        if verbose:
            print("Property seeding skipped: enhanced_properties already populated")
        return
    if verbose:
        print("Seeding sample enhanced properties...")
    for data in SAMPLE_PROPERTIES:
        prop = EnhancedProperty(**data, listing_date=date.today())
        db.session.add(prop)
    db.session.commit()
    if verbose:
        print(f"✅ Seeded {len(SAMPLE_PROPERTIES)} enhanced properties")
