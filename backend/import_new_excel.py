#!/usr/bin/env python3
"""
Comprehensive Excel Import Script for Updated Property Data
Handles the new property_research_sample.xlsx with images and rich data
"""

import pandas as pd
import uuid
from flask import Flask
from sqlalchemy import text
from models import db, Country, Province, City, Area, Property
from config import Config
import os

def create_app():
    """Create Flask app for database operations"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app

def ensure_location_hierarchy(country_name="South Africa", province_name=None, city_name=None, suburb_name=None):
    """
    Ensure the location hierarchy exists in the database
    Returns the area_id to link properties to
    """
    
    # 1. Ensure country exists
    country = Country.query.filter_by(name=country_name).first()
    if not country:
        country = Country(
            id=str(uuid.uuid4()),
            name=country_name
        )
        db.session.add(country)
        db.session.flush()
        print(f"✅ Created country: {country_name}")
    
    if not province_name:
        return None
    
    # 2. Ensure province exists
    province = Province.query.filter_by(name=province_name, country_id=country.id).first()
    if not province:
        province = Province(
            id=str(uuid.uuid4()),
            name=province_name,
            country_id=country.id
        )
        db.session.add(province)
        db.session.flush()
        print(f"✅ Created province: {province_name}")
    
    if not city_name:
        return None
    
    # 3. Ensure city exists
    city = City.query.filter_by(name=city_name, province_id=province.id).first()
    if not city:
        city = City(
            id=str(uuid.uuid4()),
            name=city_name,
            province_id=province.id
        )
        db.session.add(city)
        db.session.flush()
        print(f"✅ Created city: {city_name}")
    
    if not suburb_name:
        return None
    
    # 4. Ensure area/suburb exists
    area = Area.query.filter_by(name=suburb_name, city_id=city.id).first()
    if not area:
        area = Area(
            id=str(uuid.uuid4()),
            name=suburb_name,
            city_id=city.id
        )
        db.session.add(area)
        db.session.flush()
        print(f"✅ Created area: {suburb_name}")
    
    return area.id

def clean_and_convert_value(value, target_type=str):
    """Clean and convert values from Excel"""
    if pd.isna(value) or str(value).strip().lower() in ['null', 'none', '']:
        return None
    
    if target_type == int:
        try:
            return int(float(str(value)))
        except:
            return None
    elif target_type == float:
        try:
            return float(str(value))
        except:
            return None
    else:
        return str(value).strip()

def process_images(images_value):
    """Process the images column to get the primary image URL"""
    if pd.isna(images_value) or str(images_value).strip() == '':
        # Return a default property image from Unsplash
        return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop'
    
    # If multiple images are comma-separated, take the first one
    images_list = str(images_value).split(',')
    primary_image = images_list[0].strip()
    
    # If it's a placeholder URL, replace with a real Unsplash image
    if 'example.com' in primary_image:
        # Generate different property images based on property ID
        property_id = primary_image.split('property')[1].split('_')[0] if 'property' in primary_image else '1'
        image_options = [
            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1515263487990-61b07816b924?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1581977012607-4091712d36f9?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop'
        ]
        return image_options[int(property_id) % len(image_options)]
    
    return primary_image

def import_properties():
    """Import properties from the Excel file"""
    
    excel_file = "property_research_sample.xlsx"
    
    if not os.path.exists(excel_file):
        print(f"❌ Excel file '{excel_file}' not found!")
        return
    
    print(f"📊 Starting import from {excel_file}")
    print("=" * 60)
    
    try:
        # Read the properties sheet
        df = pd.read_excel(excel_file, sheet_name='properties')
        print(f"📈 Found {len(df)} properties to import")
        
        # Clear existing properties (keep only the location hierarchy)
        existing_count = Property.query.count()
        if existing_count > 0:
            print(f"🗑️ Clearing {existing_count} existing properties...")
            db.session.execute(text('DELETE FROM properties'))
            db.session.commit()
        
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # Ensure location hierarchy exists
                area_id = ensure_location_hierarchy(
                    country_name="South Africa",
                    province_name=clean_and_convert_value(row['province']),
                    city_name=clean_and_convert_value(row['city']),
                    suburb_name=clean_and_convert_value(row['suburb'])
                )
                
                # Process images
                image_url = process_images(row.get('images'))
                
                # Create property name from address
                street_address = clean_and_convert_value(row['street_address'])
                suburb = clean_and_convert_value(row['suburb'])
                property_name = f"{street_address}, {suburb}" if street_address and suburb else f"Property {row['property_id']}"
                
                # Create the property
                property_obj = Property(
                    name=property_name,
                    image_url=image_url,
                    erf_size=f"{clean_and_convert_value(row['erf_size_sqm'], int)} sqm" if clean_and_convert_value(row['erf_size_sqm'], int) else None,
                    cost=None,  # No cost data in this sheet
                    developer=clean_and_convert_value(row.get('developer', 'Unknown')),
                    type=clean_and_convert_value(row['property_type']),
                    area_id=area_id
                )
                
                db.session.add(property_obj)
                success_count += 1
                
                print(f"✅ Imported: {property_name} ({row['property_type']}) in {suburb}")
                
            except Exception as e:
                error_count += 1
                print(f"❌ Error importing property {row.get('property_id', index+1)}: {str(e)}")
                continue
        
        # Commit all changes
        db.session.commit()
        
        print("\n" + "=" * 60)
        print(f"🎉 Import Complete!")
        print(f"✅ Successfully imported: {success_count} properties")
        if error_count > 0:
            print(f"❌ Errors: {error_count} properties")
        
        # Show summary
        total_properties = Property.query.count()
        total_countries = Country.query.count()
        total_provinces = Province.query.count()
        total_cities = City.query.count()
        total_areas = Area.query.count()
        
        print(f"\n📊 Database Summary:")
        print(f"   Properties: {total_properties}")
        print(f"   Countries: {total_countries}")
        print(f"   Provinces: {total_provinces}")
        print(f"   Cities: {total_cities}")
        print(f"   Areas: {total_areas}")
        
        return True
        
    except Exception as e:
        print(f"❌ Fatal error during import: {str(e)}")
        db.session.rollback()
        return False

def main():
    """Main execution function"""
    print("🏠 Digital Estate - Excel Import Tool")
    print("=" * 60)
    
    app = create_app()
    
    with app.app_context():
        # Test database connection
        try:
            result = db.session.execute(text('SELECT 1'))
            print("✅ Database connection successful!")
        except Exception as e:
            print(f"❌ Database connection failed: {str(e)}")
            return
        
        # Run the import
        if import_properties():
            print("\n🎉 All done! Your property data has been imported successfully.")
        else:
            print("\n❌ Import failed. Please check the errors above.")

if __name__ == "__main__":
    main()
