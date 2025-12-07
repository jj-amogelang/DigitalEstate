#!/usr/bin/env python3
"""
Render Database Initialization Script
Populates the Render PostgreSQL database with property data from Excel
"""
import sys
import os
import pandas as pd
from main import app, db
# Legacy import retained only for reference
from database_models import EnhancedProperty  # noqa: F401

def populate_render_database():
    """Initialize the Render database with property data"""
    print("🚀 Render Database Initialization")
    print("=" * 50)
    
    with app.app_context():
        try:
            # Create all tables
            print("📋 Creating database tables...")
            db.create_all()
            print("✅ Tables created successfully")
            
            # Check if properties already exist
            existing_count = EnhancedProperty.query.count()
            print(f"📊 Existing properties in database: {existing_count}")
            
            if existing_count > 0:
                print("⚠️  Database already contains properties. Skipping import.")
                print("💡 If you want to refresh data, delete existing properties first.")
                return
            
            # Load Excel data
            excel_path = os.path.join(os.path.dirname(__file__), '..', 'property_research_sample.xlsx')
            if not os.path.exists(excel_path):
                print(f"❌ Excel file not found at: {excel_path}")
                return
                
            print(f"📖 Reading Excel data from: {excel_path}")
            df = pd.read_excel(excel_path)
            print(f"✅ Loaded {len(df)} rows from Excel")
            
            # Import properties
            imported_count = 0
            for index, row in df.iterrows():
                try:
                    # Create property with cleaned data
                    property_obj = EnhancedProperty(
                        address=str(row.get('Address', '')).strip(),
                        suburb=str(row.get('Suburb', '')).strip(),
                        city=str(row.get('City', '')).strip(),
                        province=str(row.get('Province', '')).strip(),
                        property_type=str(row.get('Property Type', '')).strip(),
                        bedrooms=int(row.get('Bedrooms', 0)) if pd.notna(row.get('Bedrooms')) else None,
                        bathrooms=int(row.get('Bathrooms', 0)) if pd.notna(row.get('Bathrooms')) else None,
                        parking=int(row.get('Parking', 0)) if pd.notna(row.get('Parking')) else None,
                        market_value=float(row.get('Market Value', 0)) if pd.notna(row.get('Market Value')) else None,
                        rental_income=float(row.get('Rental Income', 0)) if pd.notna(row.get('Rental Income')) else None,
                        description=str(row.get('Description', '')).strip(),
                        amenities=str(row.get('Amenities', '')).strip(),
                        
                        # Standard fields for compatibility
                        type=str(row.get('Property Type', '')).strip(),
                        price=float(row.get('Market Value', 0)) if pd.notna(row.get('Market Value')) else 0,
                        
                        # Additional fields
                        size=float(row.get('Size (sqm)', 0)) if pd.notna(row.get('Size (sqm)')) else None,
                        year_built=int(row.get('Year Built', 0)) if pd.notna(row.get('Year Built')) else None,
                        
                        # Status fields
                        listing_status='active',
                        created_date=db.func.now(),
                        updated_date=db.func.now()
                    )
                    
                    db.session.add(property_obj)
                    imported_count += 1
                    
                    if imported_count % 5 == 0:
                        print(f"📝 Imported {imported_count} properties...")
                        
                except Exception as row_error:
                    print(f"⚠️  Error importing row {index}: {row_error}")
                    continue
            
            # Commit all changes
            db.session.commit()
            print(f"✅ Successfully imported {imported_count} properties!")
            
            # Verify import
            final_count = EnhancedProperty.query.count()
            print(f"📊 Total properties in database: {final_count}")
            
            # Show sample data
            sample_properties = EnhancedProperty.query.limit(3).all()
            print("\n📋 Sample properties imported:")
            for prop in sample_properties:
                print(f"  • ID {prop.id}: {prop.address}, {prop.suburb}, {prop.city}")
            
            print("\n🎉 Database initialization completed successfully!")
            print("🌐 Your Render dashboard should now display properties.")
            
        except Exception as e:
            print(f"❌ Error during database initialization: {e}")
            db.session.rollback()
            return False
            
    return True

if __name__ == '__main__':
    success = populate_render_database()
    sys.exit(0 if success else 1)
