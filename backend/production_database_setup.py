#!/usr/bin/env python3
"""
Complete Render Database Setup
Sets up the database with tables and populates with property data from Excel
"""
import os
import sys
import pandas as pd

def setup_production_database():
    """Complete setup of production database on Render"""
    print("🚀 Digital Estate Production Database Setup")
    print("=" * 60)
    
    try:
        # Import after setting up path
        from main import app, db
        from database_models import EnhancedProperty
        
        with app.app_context():
            # 1. Create all tables
            print("📋 Creating database tables...")
            db.create_all()
            print("✅ Database tables created successfully")
            
            # 2. Check current state
            existing_count = EnhancedProperty.query.count()
            print(f"📊 Current properties in database: {existing_count}")
            
            if existing_count > 0:
                print("✅ Database already contains properties")
                return True
            
            # 3. Load and process Excel data
            excel_path = '../property_research_sample.xlsx'
            if not os.path.exists(excel_path):
                print(f"⚠️  Excel file not found: {excel_path}")
                print("💡 Database created but no data imported")
                return True
            
            print(f"📖 Reading Excel data...")
            df = pd.read_excel(excel_path)
            print(f"📊 Found {len(df)} rows in Excel file")
            
            # 4. Import properties
            imported_count = 0
            for index, row in df.iterrows():
                try:
                    # Clean and prepare data
                    property_data = {
                        'address': str(row.get('Address', '')).strip()[:200],
                        'suburb': str(row.get('Suburb', '')).strip()[:100],
                        'city': str(row.get('City', '')).strip()[:100],
                        'province': str(row.get('Province', '')).strip()[:100],
                        'property_type': str(row.get('Property Type', '')).strip()[:100],
                        'description': str(row.get('Description', '')).strip()[:500],
                        'amenities': str(row.get('Amenities', '')).strip()[:500],
                        'listing_status': 'active',
                    }
                    
                    # Handle numeric fields safely
                    for field, excel_col in [
                        ('bedrooms', 'Bedrooms'),
                        ('bathrooms', 'Bathrooms'),
                        ('parking', 'Parking'),
                        ('year_built', 'Year Built')
                    ]:
                        val = row.get(excel_col)
                        if pd.notna(val) and str(val).strip():
                            try:
                                property_data[field] = int(float(val))
                            except (ValueError, TypeError):
                                property_data[field] = None
                        else:
                            property_data[field] = None
                    
                    # Handle price/value fields
                    for field, excel_col in [
                        ('market_value', 'Market Value'),
                        ('rental_income', 'Rental Income'),
                        ('size', 'Size (sqm)')
                    ]:
                        val = row.get(excel_col)
                        if pd.notna(val) and str(val).strip():
                            try:
                                property_data[field] = float(val)
                            except (ValueError, TypeError):
                                property_data[field] = None
                        else:
                            property_data[field] = None
                    
                    # Set price field for compatibility
                    property_data['price'] = property_data['market_value'] or 0
                    property_data['type'] = property_data['property_type']
                    
                    # Create property object
                    property_obj = EnhancedProperty(**property_data)
                    db.session.add(property_obj)
                    imported_count += 1
                    
                    if imported_count % 5 == 0:
                        print(f"📝 Imported {imported_count} properties...")
                        
                except Exception as row_error:
                    print(f"⚠️  Row {index} error: {str(row_error)[:100]}")
                    continue
            
            # 5. Commit all changes
            db.session.commit()
            print(f"✅ Successfully imported {imported_count} properties!")
            
            # 6. Verify final state
            final_count = EnhancedProperty.query.count()
            print(f"📊 Total properties now in database: {final_count}")
            
            # 7. Show sample data
            if final_count > 0:
                sample_properties = EnhancedProperty.query.limit(3).all()
                print(f"\n📋 Sample imported properties:")
                for prop in sample_properties:
                    print(f"  • [{prop.id}] {prop.address}, {prop.city} - R{prop.market_value or 0:,.0f}")
            
            print(f"\n🎉 Production database setup completed successfully!")
            print(f"🌐 Your dashboard should now display {final_count} properties")
            return True
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure you're running this in the correct environment")
        return False
    except Exception as e:
        print(f"❌ Setup error: {e}")
        try:
            db.session.rollback()
        except:
            pass
        return False

if __name__ == '__main__':
    success = setup_production_database()
    if success:
        print("\n✅ Database setup completed successfully")
        sys.exit(0)
    else:
        print("\n❌ Database setup failed")
        sys.exit(1)
