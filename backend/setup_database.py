"""
Database Setup Script for Digital Estate
Creates SQLite database with sample data for development
"""

import os
import sys
from datetime import datetime, date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from area_models import Base, Country, Province, City, Area, AreaImage, AreaStatistics, AreaAmenity, MarketTrend

# Load environment variables
load_dotenv()

def create_database():
    """Create database and tables"""
    
    # Use SQLite for development
    database_url = os.getenv('DATABASE_URL', 'sqlite:///digital_estate.db')
    print(f"Creating database: {database_url}")
    
    # Create engine
    engine = create_engine(database_url, echo=True)
    
    # Create all tables
    Base.metadata.create_all(engine)
    print("✅ Database tables created successfully!")
    
    return engine

def populate_sample_data(engine):
    """Populate database with sample data"""
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Check if data already exists
        existing_countries = session.query(Country).count()
        if existing_countries > 0:
            print("Sample data already exists. Skipping...")
            return
        
        print("Adding sample data...")
        
        # Add Countries
        south_africa = Country(name="South Africa", code="ZA")
        session.add(south_africa)
        session.flush()  # Get the ID
        
        # Add Provinces
        gauteng = Province(name="Gauteng", country_id=south_africa.id)
        western_cape = Province(name="Western Cape", country_id=south_africa.id)
        kwazulu_natal = Province(name="KwaZulu-Natal", country_id=south_africa.id)
        session.add_all([gauteng, western_cape, kwazulu_natal])
        session.flush()
        
        # Add Cities
        johannesburg = City(name="Johannesburg", province_id=gauteng.id)
        cape_town = City(name="Cape Town", province_id=western_cape.id)
        durban = City(name="Durban", province_id=kwazulu_natal.id)
        pretoria = City(name="Pretoria", province_id=gauteng.id)
        session.add_all([johannesburg, cape_town, durban, pretoria])
        session.flush()
        
        # Add Areas
        areas_data = [
            {
                'name': 'Sandton',
                'city_id': johannesburg.id,
                'description': 'Premier business and residential district known for luxury living',
                'area_type': 'mixed',
                'postal_code': '2196',
                'coordinates': '-26.1076,28.0567'
            },
            {
                'name': 'Camps Bay',
                'city_id': cape_town.id,
                'description': 'Stunning beachfront location with mountain views',
                'area_type': 'residential',
                'postal_code': '8005',
                'coordinates': '-33.9535,18.3776'
            },
            {
                'name': 'Umhlanga',
                'city_id': durban.id,
                'description': 'Upmarket coastal area with hotels and residences',
                'area_type': 'mixed',
                'postal_code': '4320',
                'coordinates': '-29.7202,31.0820'
            },
            {
                'name': 'Waterkloof',
                'city_id': pretoria.id,
                'description': 'Prestigious diplomatic area with embassies',
                'area_type': 'residential',
                'postal_code': '0181',
                'coordinates': '-25.7532,28.2295'
            },
            {
                'name': 'Constantia',
                'city_id': cape_town.id,
                'description': 'Wine-producing area with luxury estates',
                'area_type': 'residential',
                'postal_code': '7806',
                'coordinates': '-34.0264,18.4239'
            }
        ]
        
        areas = []
        for area_data in areas_data:
            area = Area(**area_data)
            areas.append(area)
            session.add(area)
        
        session.flush()
        
        # Add Area Images
        images_data = [
            {
                'area_name': 'Sandton',
                'image_url': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop',
                'image_title': 'Sandton City Skyline',
                'image_description': 'Modern skyscrapers and business district',
                'is_primary': True
            },
            {
                'area_name': 'Camps Bay',
                'image_url': 'https://images.unsplash.com/photo-1580670446435-2b3b82d9a7f7?w=800&h=400&fit=crop',
                'image_title': 'Camps Bay Beach',
                'image_description': 'Beautiful beachfront with mountain backdrop',
                'is_primary': True
            },
            {
                'area_name': 'Umhlanga',
                'image_url': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=400&fit=crop',
                'image_title': 'Umhlanga Coastline',
                'image_description': 'Pristine beaches and coastal development',
                'is_primary': True
            },
            {
                'area_name': 'Waterkloof',
                'image_url': 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=400&fit=crop',
                'image_title': 'Waterkloof Heights',
                'image_description': 'Elevated residential area with city views',
                'is_primary': True
            },
            {
                'area_name': 'Constantia',
                'image_url': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
                'image_title': 'Constantia Vineyards',
                'image_description': 'Wine estates and mountain views',
                'is_primary': True
            }
        ]
        
        for img_data in images_data:
            area = next((a for a in areas if a.name == img_data['area_name']), None)
            if area:
                image = AreaImage(
                    area_id=area.id,
                    image_url=img_data['image_url'],
                    image_title=img_data['image_title'],
                    image_description=img_data['image_description'],
                    is_primary=img_data['is_primary'],
                    image_order=1
                )
                session.add(image)
        
        # Add Area Statistics
        stats_data = [
            {
                'area_name': 'Sandton',
                'average_property_price': 2800000.00,
                'median_property_price': 2500000.00,
                'price_per_sqm': 28000.00,
                'price_growth_yoy': 12.5,
                'average_rental_price': 25000.00,
                'rental_yield': 8.2,
                'rental_growth_yoy': 10.1,
                'vacancy_rate': 4.1,
                'days_on_market': 45,
                'total_properties_sold': 156,
                'total_rental_properties': 89,
                'crime_index_score': 32,
                'education_score': 95,
                'transport_score': 90,
                'amenities_score': 98
            },
            {
                'area_name': 'Camps Bay',
                'average_property_price': 4500000.00,
                'median_property_price': 4200000.00,
                'price_per_sqm': 45000.00,
                'price_growth_yoy': 15.2,
                'average_rental_price': 35000.00,
                'rental_yield': 7.8,
                'rental_growth_yoy': 8.5,
                'vacancy_rate': 3.2,
                'days_on_market': 62,
                'total_properties_sold': 89,
                'total_rental_properties': 156,
                'crime_index_score': 25,
                'education_score': 92,
                'transport_score': 85,
                'amenities_score': 95
            },
            {
                'area_name': 'Umhlanga',
                'average_property_price': 2200000.00,
                'median_property_price': 2000000.00,
                'price_per_sqm': 22000.00,
                'price_growth_yoy': 9.8,
                'average_rental_price': 18000.00,
                'rental_yield': 8.5,
                'rental_growth_yoy': 7.2,
                'vacancy_rate': 5.1,
                'days_on_market': 38,
                'total_properties_sold': 134,
                'total_rental_properties': 78,
                'crime_index_score': 28,
                'education_score': 88,
                'transport_score': 82,
                'amenities_score': 90
            }
        ]
        
        for stat_data in stats_data:
            area = next((a for a in areas if a.name == stat_data['area_name']), None)
            if area:
                stat_data_copy = stat_data.copy()
                del stat_data_copy['area_name']
                stats = AreaStatistics(
                    area_id=area.id,
                    data_period_start=date(2024, 1, 1),
                    data_period_end=date(2024, 12, 31),
                    **stat_data_copy
                )
                session.add(stats)
        
        # Commit all changes
        session.commit()
        print("✅ Sample data added successfully!")
        
        # Print summary
        print(f"\n📊 Database Summary:")
        print(f"   Countries: {session.query(Country).count()}")
        print(f"   Provinces: {session.query(Province).count()}")
        print(f"   Cities: {session.query(City).count()}")
        print(f"   Areas: {session.query(Area).count()}")
        print(f"   Images: {session.query(AreaImage).count()}")
        print(f"   Statistics: {session.query(AreaStatistics).count()}")
        
    except Exception as e:
        print(f"❌ Error adding sample data: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def main():
    """Main setup function"""
    print("🚀 Setting up Digital Estate Database...")
    
    try:
        # Create database and tables
        engine = create_database()
        
        # Add sample data
        populate_sample_data(engine)
        
        print("\n✅ Database setup completed successfully!")
        print("📍 Database location: digital_estate.db")
        print("🔗 You can now start the API server with: python area_api.py")
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())