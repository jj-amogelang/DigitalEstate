"""
Update PostgreSQL Database with New Excel Data
"""

import os
import sys
import pandas as pd
from datetime import datetime, date

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import EnhancedProperty

def _safe_int(value, default=0):
    """Safely convert value to int"""
    try:
        if pd.isna(value) or value == '':
            return default
        return int(float(value))
    except (ValueError, TypeError):
        return default

def _safe_float(value, default=0.0):
    """Safely convert value to float"""
    try:
        if pd.isna(value) or value == '':
            return default
        return float(value)
    except (ValueError, TypeError):
        return default

def _safe_str(value, default=''):
    """Safely convert value to string"""
    try:
        if pd.isna(value) or value == '':
            return default
        return str(value).strip()
    except:
        return default

def update_properties_from_excel():
    """Update properties from Excel file"""
    print("📊 Updating properties from Excel data...")
    
    excel_file = 'property_research_sample.xlsx'
    if not os.path.exists(excel_file):
        print(f"❌ Excel file not found: {excel_file}")
        return 0
    
    try:
        # Read the Excel file
        df = pd.read_excel(excel_file, sheet_name=0)
        print(f"📋 Excel sheet has {len(df)} rows")
        print(f"📋 Columns: {list(df.columns)}")
        
        # Clean data - remove completely empty rows
        df = df.dropna(how='all')
        print(f"📋 After cleaning: {len(df)} rows")
        
        with app.app_context():
            # First, let's see what we currently have
            current_count = EnhancedProperty.query.count()
            print(f"📈 Current properties in database: {current_count}")
            
            # Option 1: Clear existing and re-import all
            print("\n🔄 Clearing existing properties and importing fresh data...")
            EnhancedProperty.query.delete()
            db.session.commit()
            print("✅ Cleared existing properties")
            
            imported_count = 0
            
            for idx, row in df.iterrows():
                try:
                    # Map Excel columns to property fields based on actual Excel structure
                    prop = EnhancedProperty(
                        property_name=_safe_str(row.get('property_id', f'Property {_safe_int(row.get("property_id", idx + 1))}')),
                        address=_safe_str(row.get('street_address', f'{100 + idx} Sample Street')),
                        suburb=_safe_str(row.get('suburb', 'Sandton')),
                        city=_safe_str(row.get('city', 'Johannesburg')),
                        province=_safe_str(row.get('province', 'Gauteng')),
                        postal_code=_safe_str(row.get('postal_code', '2196')),
                        property_type=_safe_str(row.get('property_type', 'Commercial')),
                        bedrooms=_safe_int(row.get('bedrooms', 0)),  # Some may not have bedrooms for commercial
                        bathrooms=_safe_int(row.get('bathrooms', 2)),
                        erf_size=_safe_float(row.get('erf_size_sqm', 500.0)),
                        building_size=_safe_float(row.get('building_size_sqm', 200.0)),
                        year_built=_safe_int(row.get('year_built', 2010)),
                        description=f'{_safe_str(row.get("property_type", "Commercial"))} property at {_safe_str(row.get("street_address", ""))} in {_safe_str(row.get("suburb", ""))}, {_safe_str(row.get("city", ""))}. Built in {_safe_int(row.get("year_built", 2010))}, condition: {_safe_str(row.get("condition", "Good"))}.',
                        image_url=_safe_str(row.get('images', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop')),
                        status='available',
                        listing_date=date.today()
                    )
                    
                    db.session.add(prop)
                    imported_count += 1
                    
                    if imported_count % 5 == 0:
                        print(f"📝 Imported {imported_count} properties...")
                        db.session.commit()  # Commit in batches
                        
                except Exception as e:
                    print(f"⚠️ Error importing row {idx + 1}: {e}")
                    print(f"   Row data preview: {dict(row.head()) if hasattr(row, 'head') else 'N/A'}")
                    continue
            
            # Final commit
            db.session.commit()
            print(f"✅ Successfully imported {imported_count} properties")
            
            # Verify the update
            new_count = EnhancedProperty.query.count()
            print(f"📊 Database now has {new_count} properties")
            
            return imported_count
            
    except Exception as e:
        print(f"❌ Error reading Excel file: {e}")
        print(f"❌ Make sure the Excel file is not open in another program")
        return 0

if __name__ == "__main__":
    print("🚀 Starting Excel to PostgreSQL import...")
    
    with app.app_context():
        try:
            # Test database connection
            db.create_all()
            print("✅ Database connection successful")
            
            # Update properties from Excel
            count = update_properties_from_excel()
            
            if count > 0:
                print(f"\n🎉 Successfully updated {count} properties!")
                print("📱 Your dashboard should now show the updated information")
                print("🌐 Check your frontend at: http://localhost:3000")
            else:
                print("\n❌ No properties were imported. Please check your Excel file.")
                
        except Exception as e:
            print(f"❌ Database error: {e}")
