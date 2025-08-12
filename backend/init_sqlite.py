from models import db, Property, Owner, Valuation, Zoning
from datetime import datetime, date

def init_sample_data():
    """Initialize SQLite database with sample data"""
    # Create all tables
    db.create_all()
    
    # Check if data already exists
    if Property.query.first():
        print("Database already has data, skipping initialization")
        return
    
    # Create sample owners
    owner1 = Owner(
        id=1,
        full_name="John Smith",
        email="john.smith@example.com",
        phone="+27-11-123-4567",
        address="123 Main Street, Sandton, Johannesburg",
        acquisition_date=date(2020, 1, 15)
    )
    
    owner2 = Owner(
        id=2,
        full_name="Sarah Johnson",
        email="sarah.johnson@example.com",
        phone="+27-21-987-6543",
        address="456 Oak Avenue, Cape Town",
        acquisition_date=date(2019, 6, 20)
    )
    
    db.session.add_all([owner1, owner2])
    
    # Create sample properties
    property1 = Property(
        id=1,
        title="Modern Apartment in Sandton",
        description="Luxurious 3-bedroom apartment with city views",
        property_type="Apartment",
        address="123 Nelson Mandela Square, Sandton, Johannesburg",
        city="Johannesburg",
        province="Gauteng",
        postal_code="2196",
        price=2500000.00,
        bedrooms=3,
        bathrooms=2,
        area_sqm=120.5,
        status="For Sale",
        listing_date=datetime(2024, 1, 1),
        owner_id=1
    )
    
    property2 = Property(
        id=2,
        title="Luxury Villa in Cape Town",
        description="Beautiful 4-bedroom villa with ocean views",
        property_type="House",
        address="789 Clifton Beach Road, Cape Town",
        city="Cape Town",
        province="Western Cape",
        postal_code="8005",
        price=8500000.00,
        bedrooms=4,
        bathrooms=3,
        area_sqm=250.0,
        status="For Sale",
        listing_date=datetime(2024, 2, 15),
        owner_id=2
    )
    
    property3 = Property(
        id=3,
        title="Office Space in Rosebank",
        description="Prime commercial property in business district",
        property_type="Commercial",
        address="456 Oxford Road, Rosebank, Johannesburg",
        city="Johannesburg",
        province="Gauteng",
        postal_code="2196",
        price=5200000.00,
        bedrooms=0,
        bathrooms=2,
        area_sqm=180.0,
        status="For Rent",
        listing_date=datetime(2024, 3, 1),
        owner_id=1
    )
    
    db.session.add_all([property1, property2, property3])
    
    # Create sample valuations
    valuation1 = Valuation(
        id=1,
        property_id=1,
        valuation_date=date(2024, 1, 1),
        market_value=2500000.00,
        assessed_value=2300000.00,
        valuer_name="ABC Property Valuers",
        valuation_method="Comparative Market Analysis"
    )
    
    valuation2 = Valuation(
        id=2,
        property_id=2,
        valuation_date=date(2024, 2, 15),
        market_value=8500000.00,
        assessed_value=8200000.00,
        valuer_name="XYZ Valuations",
        valuation_method="Income Approach"
    )
    
    db.session.add_all([valuation1, valuation2])
    
    # Create sample zoning data
    zoning1 = Zoning(
        id=1,
        property_id=1,
        zoning_code="RES-3",
        zoning_description="High Density Residential",
        municipality="City of Johannesburg",
        permitted_uses="Residential apartments, retail ground floor",
        building_restrictions="Max 15 stories, 60% coverage"
    )
    
    zoning2 = Zoning(
        id=2,
        property_id=2,
        zoning_code="RES-1",
        zoning_description="Single Residential",
        municipality="City of Cape Town",
        permitted_uses="Single family dwellings",
        building_restrictions="Max 2 stories, 40% coverage"
    )
    
    zoning3 = Zoning(
        id=3,
        property_id=3,
        zoning_code="BUS-2",
        zoning_description="General Business",
        municipality="City of Johannesburg",
        permitted_uses="Offices, retail, services",
        building_restrictions="Max 20 stories, 80% coverage"
    )
    
    db.session.add_all([zoning1, zoning2, zoning3])
    
    # Commit all changes
    db.session.commit()
    print("✅ Sample data initialized successfully!")

if __name__ == "__main__":
    from app import app
    with app.app_context():
        init_sample_data()
