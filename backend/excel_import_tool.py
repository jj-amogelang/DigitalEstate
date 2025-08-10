#!/usr/bin/env python3
"""
Excel Data Import Script for Digital Estate
This script imports property data from Excel and maps it to the existing location hierarchy
"""

import pandas as pd
import uuid
from flask import Flask
from sqlalchemy import text
from models import db, Country, Province, City, Area, Property
from config import Config
import os
from datetime import datetime

def create_app():
    """Create Flask app for database operations"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app

def ensure_location_hierarchy(country_name="South Africa", province_name=None, city_name=None, area_name=None):
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
    
    if not area_name:
        return None
    
    # 4. Ensure area exists
    area = Area.query.filter_by(name=area_name, city_id=city.id).first()
    if not area:
        area = Area(
            id=str(uuid.uuid4()),
            name=area_name,
            city_id=city.id
        )
        db.session.add(area)
        db.session.flush()
        print(f"✅ Created area: {area_name}")
    
    return area.id

def clean_numeric_value(value):
    """Clean and convert numeric values from Excel"""
    if pd.isna(value) or value == '' or value is None:
        return None
    
    # Convert to string and clean
    str_value = str(value).strip()
    
    # Remove common non-numeric characters
    str_value = str_value.replace(',', '').replace('R', '').replace(' ', '')
    str_value = str_value.replace('$', '').replace('€', '').replace('£', '')
    
    try:
        # Try to convert to float first, then int if it's a whole number
        float_value = float(str_value)
        if float_value.is_integer():
            return int(float_value)
        return float_value
    except (ValueError, TypeError):
        return None

def import_excel_properties(excel_file_path, sheet_name=None):
    """
    Import properties from Excel file
    Expected columns (flexible mapping):
    - Name/Property Name/Title
    - Province/State
    - City/Town
    - Area/Suburb/Location
    - Price/Cost/Value
    - Type/Property Type/Category
    - Size/ERF Size/Area
    - Developer/Builder
    - Image URL (optional)
    """
    
    if not os.path.exists(excel_file_path):
        print(f"❌ Excel file not found: {excel_file_path}")
        return False
    
    try:
        # Read Excel file
        if sheet_name:
            df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
        else:
            df = pd.read_excel(excel_file_path)
        
        print(f"📊 Loaded Excel file with {len(df)} rows")
        print(f"📋 Available columns: {list(df.columns)}")
        
        # Column mapping - flexible to handle different Excel structures
        column_mapping = {}
        
        # Map columns (case-insensitive)
        for col in df.columns:
            col_lower = col.lower().strip()
            
            # Property name/address
            if any(keyword in col_lower for keyword in ['street_address', 'address', 'name', 'property', 'title']):
                column_mapping['name'] = col
            
            # Location fields
            elif any(keyword in col_lower for keyword in ['province', 'state']):
                column_mapping['province'] = col
            elif any(keyword in col_lower for keyword in ['city', 'town']):
                column_mapping['city'] = col
            elif any(keyword in col_lower for keyword in ['suburb', 'area', 'neighbourhood', 'location']):
                column_mapping['area'] = col
            
            # Property details
            elif any(keyword in col_lower for keyword in ['price', 'cost', 'value', 'amount']):
                column_mapping['price'] = col
            elif any(keyword in col_lower for keyword in ['property_type', 'type', 'category', 'classification']):
                column_mapping['type'] = col
            elif any(keyword in col_lower for keyword in ['building_size', 'erf_size', 'size', 'sqm', 'square']):
                column_mapping['size'] = col
            elif any(keyword in col_lower for keyword in ['developer', 'builder', 'company']):
                column_mapping['developer'] = col
            elif any(keyword in col_lower for keyword in ['image', 'photo', 'picture', 'url']):
                column_mapping['image_url'] = col
        
        print(f"🗺️ Column mapping: {column_mapping}")
        
        # Import properties
        properties_created = 0
        errors = []
        
        # Process in batches to avoid memory issues
        batch_size = 5
        
        for index, row in df.iterrows():
            try:
                # Extract data from row
                property_name = row.get(column_mapping.get('name', ''), f'Property {index + 1}')
                province_name = row.get(column_mapping.get('province', ''), 'Gauteng')  # Default to Gauteng
                city_name = row.get(column_mapping.get('city', ''), 'Johannesburg')  # Default to Johannesburg
                area_name = row.get(column_mapping.get('area', ''), f'Area {index + 1}')
                
                # Clean and validate required fields
                if pd.isna(property_name) or str(property_name).strip() == '':
                    property_name = f'Property {index + 1}'
                
                if pd.isna(province_name) or str(province_name).strip() == '':
                    province_name = 'Gauteng'
                
                if pd.isna(city_name) or str(city_name).strip() == '':
                    city_name = 'Johannesburg'
                
                if pd.isna(area_name) or str(area_name).strip() == '':
                    area_name = f'Area {index + 1}'
                
                # Ensure location hierarchy exists and get area_id
                area_id = ensure_location_hierarchy(
                    country_name="South Africa",
                    province_name=str(province_name).strip(),
                    city_name=str(city_name).strip(),
                    area_name=str(area_name).strip()
                )
                
                # Extract other property details
                price = clean_numeric_value(row.get(column_mapping.get('price', ''), 0))
                property_type = row.get(column_mapping.get('type', ''), 'Residential')
                erf_size = row.get(column_mapping.get('size', ''), '')
                developer = row.get(column_mapping.get('developer', ''), 'Unknown Developer')
                image_url = row.get(column_mapping.get('image_url', ''), '')
                
                # Default image URLs based on property type
                if not image_url or pd.isna(image_url):
                    type_lower = str(property_type).lower()
                    if 'commercial' in type_lower:
                        image_url = 'https://images.unsplash.com/photo-1590490360183-694b7e71b254?w=400&h=300&fit=crop'
                    elif 'industrial' in type_lower:
                        image_url = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop'
                    elif 'retail' in type_lower:
                        image_url = 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&h=300&fit=crop'
                    else:  # Residential
                        image_url = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'
                
                # Create property record (let PostgreSQL auto-generate the ID)
                property_record = Property(
                    name=str(property_name).strip(),
                    image_url=str(image_url).strip(),
                    erf_size=str(erf_size).strip() if erf_size else '',
                    cost=price if price else 0,
                    developer=str(developer).strip(),
                    type=str(property_type).strip(),
                    area_id=area_id
                )
                
                db.session.add(property_record)
                # Flush to get the auto-generated ID without committing
                db.session.flush()
                properties_created += 1
                
                print(f"✅ Created property: {property_name} (ID: {property_record.id})")
                
                # Commit in batches
                if properties_created % batch_size == 0:
                    db.session.commit()
                    print(f"✅ Committed batch of {batch_size} properties (Total: {properties_created})")
                    
            except Exception as row_error:
                db.session.rollback()  # Rollback on error
                error_msg = f"Row {index + 1}: {str(row_error)}"
                errors.append(error_msg)
                print(f"⚠️ {error_msg}")
                continue
        
        # Commit any remaining changes
        if properties_created % batch_size != 0:
            db.session.commit()
            print(f"✅ Committed final batch")
        
        print(f"\n🎉 Import completed!")
        print(f"✅ Successfully imported {properties_created} properties")
        
        if errors:
            print(f"⚠️ {len(errors)} errors occurred:")
            for error in errors[:5]:  # Show first 5 errors
                print(f"   - {error}")
            if len(errors) > 5:
                print(f"   ... and {len(errors) - 5} more errors")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error importing Excel data: {e}")
        return False

def show_import_summary():
    """Show summary of imported data"""
    try:
        # Count records
        countries = Country.query.count()
        provinces = Province.query.count()
        cities = City.query.count()
        areas = Area.query.count()
        properties = Property.query.count()
        
        print(f"\n📊 DATABASE SUMMARY:")
        print(f"   Countries: {countries}")
        print(f"   Provinces: {provinces}")
        print(f"   Cities: {cities}")
        print(f"   Areas: {areas}")
        print(f"   Properties: {properties}")
        
        # Show location hierarchy
        print(f"\n🌍 LOCATION HIERARCHY:")
        for country in Country.query.all():
            print(f"🏳️ {country.name}")
            for province in Province.query.filter_by(country_id=country.id).all():
                print(f"   📍 {province.name}")
                for city in City.query.filter_by(province_id=province.id).all():
                    print(f"      🏙️ {city.name}")
                    area_count = Area.query.filter_by(city_id=city.id).count()
                    # Fixed query to properly join tables
                    property_count = db.session.query(Property).join(Area, Property.area_id == Area.id).filter(Area.city_id == city.id).count()
                    print(f"         📋 {area_count} areas, {property_count} properties")
        
    except Exception as e:
        print(f"❌ Error showing summary: {e}")

def main():
    """Main import function"""
    print("🏠 Digital Estate Excel Import Tool")
    print("=" * 50)
    
    app = create_app()
    
    with app.app_context():
        # Get Excel file path from user
        excel_path = input("📁 Enter the full path to your Excel file: ").strip().strip('"\'')
        
        if not excel_path:
            print("❌ No file path provided")
            return
        
        # Check if file exists
        if not os.path.exists(excel_path):
            print(f"❌ File not found: {excel_path}")
            return
        
        # Ask about sheet name
        sheet_name = input("📋 Enter sheet name (leave blank for first sheet): ").strip()
        if not sheet_name:
            sheet_name = None
        
        # Show current data
        print(f"\n📊 Current database state:")
        show_import_summary()
        
        # Confirm import
        confirm = input(f"\n🤔 Import data from {excel_path}? (y/n): ").lower().strip()
        if confirm != 'y':
            print("❌ Import cancelled")
            return
        
        # Import data
        success = import_excel_properties(excel_path, sheet_name)
        
        if success:
            print(f"\n📊 Updated database state:")
            show_import_summary()
            print(f"\n✅ Excel import completed successfully!")
            print(f"🌐 Test your dropdowns at: http://localhost:3000/properties")
        else:
            print(f"\n❌ Import failed")

if __name__ == "__main__":
    main()
