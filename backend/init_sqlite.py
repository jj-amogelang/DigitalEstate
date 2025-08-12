from models import db, Property, EnhancedProperty, Owner, Valuation, Zoning
from datetime import datetime, date

def init_sample_data():
    """Initialize SQLite database with sample data"""
    # Create all tables
    db.create_all()
    
    # Check if data already exists
    if EnhancedProperty.query.first():
        print("Database already has data, skipping initialization")
        return
    
    # Create sample owners
    owner1 = Owner(
        id=1,
        full_name="John Smith",
        email="john.smith@example.com",
        phone="+27-11-123-4567",
        address="123 Main Street, Sandton, Johannesburg",
        city="Johannesburg",
        province="Gauteng",
        owner_type="individual"
    )
    
    owner2 = Owner(
        id=2,
        full_name="Sarah Johnson",
        email="sarah.johnson@example.com",
        phone="+27-21-987-6543",
        address="456 Oak Avenue, Cape Town",
        city="Cape Town",
        province="Western Cape",
        owner_type="individual"
    )
    
    db.session.add_all([owner1, owner2])
    
    # Create sample enhanced properties
    property1 = EnhancedProperty(
        id=1,
        property_name="Modern Apartment in Sandton",
        description="Luxurious 3-bedroom apartment with city views",
        property_type="Apartment",
        address="123 Nelson Mandela Square, Sandton, Johannesburg",
        city="Johannesburg",
        province="Gauteng",
        postal_code="2196",
        bedrooms=3,
        bathrooms=2,
        erf_size=120.5,
        status="available",
        listing_date=date(2024, 1, 1),
        owner_id=1
    )
    
    property2 = EnhancedProperty(
        id=2,
        property_name="Luxury Villa in Cape Town",
        description="Beautiful 4-bedroom villa with ocean views",
        property_type="House",
        address="789 Clifton Beach Road, Cape Town",
        city="Cape Town",
        province="Western Cape",
        postal_code="8005",
        bedrooms=4,
        bathrooms=3,
        erf_size=250.0,
        status="available",
        listing_date=date(2024, 2, 15),
        owner_id=2
    )
    
    property3 = EnhancedProperty(
        id=3,
        property_name="Office Space in Rosebank",
        description="Prime commercial property in business district",
        property_type="Commercial",
        address="456 Oxford Road, Rosebank, Johannesburg",
        city="Johannesburg",
        province="Gauteng",
        postal_code="2196",
        bedrooms=0,
        bathrooms=2,
        erf_size=180.0,
        status="available",
        listing_date=date(2024, 3, 1),
        owner_id=1
    )
    
    property4 = EnhancedProperty(
        id=4,
        property_name="Townhouse in Durban",
        description="Family-friendly townhouse near the beach",
        property_type="Townhouse",
        address="321 Marine Parade, Durban",
        city="Durban",
        province="KwaZulu-Natal",
        postal_code="4001",
        bedrooms=3,
        bathrooms=2,
        erf_size=150.0,
        status="available",
        listing_date=date(2024, 1, 20),
        owner_id=2
    )
    
    property5 = EnhancedProperty(
        id=5,
        property_name="Penthouse in Johannesburg",
        description="Exclusive penthouse with panoramic city views",
        property_type="Penthouse",
        address="100 Commissioner Street, Johannesburg CBD",
        city="Johannesburg",
        province="Gauteng",
        postal_code="2001",
        bedrooms=4,
        bathrooms=4,
        erf_size=300.0,
        status="available",
        listing_date=date(2024, 2, 1),
        owner_id=1
    )
    
    db.session.add_all([property1, property2, property3, property4, property5])
    
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
    
    valuation3 = Valuation(
        id=3,
        property_id=3,
        valuation_date=date(2024, 3, 1),
        market_value=5200000.00,
        assessed_value=5000000.00,
        valuer_name="Commercial Property Valuers",
        valuation_method="Income Capitalization"
    )
    
    valuation4 = Valuation(
        id=4,
        property_id=4,
        valuation_date=date(2024, 1, 20),
        market_value=3200000.00,
        assessed_value=3100000.00,
        valuer_name="Coastal Valuations",
        valuation_method="Comparative Market Analysis"
    )
    
    valuation5 = Valuation(
        id=5,
        property_id=5,
        valuation_date=date(2024, 2, 1),
        market_value=12000000.00,
        assessed_value=11500000.00,
        valuer_name="Luxury Property Valuers",
        valuation_method="Cost Approach"
    )
    
    db.session.add_all([valuation1, valuation2, valuation3, valuation4, valuation5])
    
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
    
    zoning4 = Zoning(
        id=4,
        property_id=4,
        zoning_code="RES-2",
        zoning_description="Medium Density Residential",
        municipality="eThekwini Municipality",
        permitted_uses="Townhouses, small apartment blocks",
        building_restrictions="Max 4 stories, 50% coverage"
    )
    
    zoning5 = Zoning(
        id=5,
        property_id=5,
        zoning_code="RES-4",
        zoning_description="Very High Density Residential",
        municipality="City of Johannesburg",
        permitted_uses="High-rise residential, commercial ground floor",
        building_restrictions="Max 30 stories, 70% coverage"
    )
    
    db.session.add_all([zoning1, zoning2, zoning3, zoning4, zoning5])
    
    # Commit all changes
    db.session.commit()
    print("✅ Sample data initialized successfully!")

if __name__ == "__main__":
    from app import app
    with app.app_context():
        init_sample_data()
