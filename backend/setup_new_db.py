#!/usr/bin/env python3
"""
Database setup script for PostgreSQL digitalestate2 database
This script creates the new database tables and can import data from Excel
"""

import os
import sys
from datetime import datetime, date
from decimal import Decimal
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config import Config
from models import db, Property, Owner, Valuation, Zoning, MarketTrend

def create_database_tables(app):
    """Create all database tables"""
    print("🔄 Creating database tables...")
    
    try:
        with app.app_context():
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Check which tables were created
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"📊 Created tables: {', '.join(tables)}")
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False
    
    return True

def test_database_connection():
    """Test the database connection"""
    print("🔄 Testing database connection...")
    
    try:
        from flask import Flask
        from config import Config
        
        app = Flask(__name__)
        app.config.from_object(Config)
        db.init_app(app)
        
        with app.app_context():
            # Test connection
            with db.engine.connect() as connection:
                result = connection.execute(text('SELECT version();'))
                version = result.fetchone()[0]
                print(f"✅ PostgreSQL version: {version}")
            
            return app
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n💡 Troubleshooting tips:")
        print("1. Make sure PostgreSQL is running")
        print("2. Check if 'digitalestate2' database exists")
        print("3. Verify your database credentials in config.py")
        print("4. Create database if needed: CREATE DATABASE digitalestate2;")
        return None

def create_sample_data(app):
    """Create sample data for testing"""
    print("🔄 Creating sample data...")
    
    try:
        with app.app_context():
            # Check if data already exists
            if Property.query.count() > 0:
                print("📊 Data already exists, skipping sample data creation")
                return True
            
            # Create sample owner
            owner = Owner(
                first_name="John",
                last_name="Smith",
                full_name="John Smith",
                email="john.smith@example.com",
                phone="+27 11 123 4567",
                address="123 Main Street",
                city="Johannesburg",
                province="Gauteng",
                postal_code="2000",
                owner_type="individual"
            )
            db.session.add(owner)
            db.session.flush()  # Get the ID
            
            # Create sample property
            property1 = Property(
                property_name="Modern Family Home in Sandton",
                address="45 Rivonia Road, Sandton",
                suburb="Sandton",
                city="Johannesburg",
                province="Gauteng",
                postal_code="2196",
                property_type="residential",
                property_subtype="house",
                bedrooms=4,
                bathrooms=3,
                parking_spaces=2,
                erf_size=Decimal('800.00'),
                building_size=Decimal('350.00'),
                year_built=2018,
                status="available",
                listing_date=date.today(),
                description="Beautiful modern family home with stunning views and premium finishes",
                image_url="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop",
                owner_id=owner.id
            )
            db.session.add(property1)
            db.session.flush()
            
            # Create sample valuation
            valuation = Valuation(
                property_id=property1.id,
                market_value=Decimal('2500000.00'),
                municipal_value=Decimal('2200000.00'),
                rental_value=Decimal('18000.00'),
                valuation_date=date.today(),
                valuation_method="market_comparison",
                valuer_name="Jane Doe",
                valuer_company="Professional Valuers Inc"
            )
            db.session.add(valuation)
            
            # Create sample zoning
            zoning = Zoning(
                property_id=property1.id,
                zoning_code="RES-1",
                zoning_description="Single Residential",
                land_use="Residential",
                density="Low Density",
                height_restrictions="2 storeys maximum",
                coverage_ratio=Decimal('50.00')
            )
            db.session.add(zoning)
            
            # Create sample market trend
            market_trend = MarketTrend(
                area="Sandton",
                property_type="residential",
                avg_price=Decimal('2800000.00'),
                median_price=Decimal('2500000.00'),
                price_per_sqm=Decimal('7500.00'),
                rental_yield=Decimal('8.64'),
                vacancy_rate=Decimal('5.2'),
                growth_rate=Decimal('12.5'),
                sales_volume=145,
                time_on_market=65,
                period_start=date(2024, 1, 1),
                period_end=date(2024, 12, 31)
            )
            db.session.add(market_trend)
            
            # Commit all changes
            db.session.commit()
            print("✅ Sample data created successfully!")
            
            # Show summary
            print(f"📊 Created:")
            print(f"   - {Owner.query.count()} owners")
            print(f"   - {Property.query.count()} properties")
            print(f"   - {Valuation.query.count()} valuations")
            print(f"   - {Zoning.query.count()} zoning records")
            print(f"   - {MarketTrend.query.count()} market trends")
            
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating sample data: {e}")
        return False
    
    return True

def import_excel_data(app, excel_file_path):
    """Import data from Excel file"""
    print(f"🔄 Importing data from {excel_file_path}...")
    
    if not os.path.exists(excel_file_path):
        print(f"❌ Excel file not found: {excel_file_path}")
        return False
    
    try:
        with app.app_context():
            # Read Excel file
            df = pd.read_excel(excel_file_path)
            print(f"📊 Found {len(df)} rows in Excel file")
            print(f"📋 Columns: {', '.join(df.columns.tolist())}")
            
            # Process each row
            properties_created = 0
            for index, row in df.iterrows():
                try:
                    # Create property from Excel row
                    # You'll need to map your Excel columns to the Property model fields
                    property_data = Property(
                        property_name=row.get('Name', f'Property {index + 1}'),
                        address=row.get('Address', ''),
                        suburb=row.get('Suburb', ''),
                        city=row.get('City', ''),
                        province=row.get('Province', 'Gauteng'),
                        property_type=row.get('Type', 'residential'),
                        bedrooms=row.get('Bedrooms', None),
                        bathrooms=row.get('Bathrooms', None),
                        erf_size=Decimal(str(row.get('ERF_Size', 0))) if pd.notna(row.get('ERF_Size')) else None,
                        status='available',
                        listing_date=date.today()
                    )
                    
                    db.session.add(property_data)
                    properties_created += 1
                    
                    if properties_created % 100 == 0:
                        print(f"✅ Processed {properties_created} properties...")
                        
                except Exception as row_error:
                    print(f"⚠️ Error processing row {index}: {row_error}")
                    continue
            
            # Commit all changes
            db.session.commit()
            print(f"✅ Successfully imported {properties_created} properties!")
            
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error importing Excel data: {e}")
        return False
    
    return True

def main():
    """Main setup function"""
    print("🏠 Digital Estate Database Setup")
    print("=" * 40)
    
    # Test database connection
    app = test_database_connection()
    if not app:
        sys.exit(1)
    
    # Create tables
    if not create_database_tables(app):
        sys.exit(1)
    
    # Check if user wants to create sample data
    create_sample = input("\n🤔 Create sample data for testing? (y/n): ").lower().strip()
    if create_sample == 'y':
        create_sample_data(app)
    
    # Check if user wants to import Excel data
    import_excel = input("\n🤔 Import data from Excel file? (y/n): ").lower().strip()
    if import_excel == 'y':
        excel_path = input("📁 Enter path to Excel file: ").strip()
        if excel_path:
            import_excel_data(app, excel_path)
    
    print("\n🎉 Database setup complete!")
    print(f"🌐 Test your API at: http://localhost:5000/test-db")

if __name__ == "__main__":
    main()
