#!/usr/bin/env python3
"""
Quick Excel Import - Direct execution
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

app = create_app()

with app.app_context():
    # Your Excel file path
    excel_path = r"C:\Users\amoge\Digital Estate\property_research_sample.xlsx"
    
    print(f"🏠 Digital Estate Quick Import")
    print(f"📁 Importing from: {excel_path}")
    print(f"📋 Sheet: properties")
    
    try:
        # Read the Excel file
        df = pd.read_excel(excel_path, sheet_name='properties')
        print(f"📊 Loaded {len(df)} rows")
        print(f"📋 Columns: {list(df.columns)}")
        
        properties_created = 0
        
        for index, row in df.iterrows():
            try:
                # Extract data using your exact column names
                street_address = row.get('street_address', f'Address {index + 1}')
                suburb = row.get('suburb', f'Suburb {index + 1}')
                city = row.get('city', 'Johannesburg')
                province = row.get('province', 'Gauteng')
                property_type = row.get('property_type', 'Residential')
                erf_size = row.get('erf_size_sqm', '')
                building_size = row.get('building_size_sqm', '')
                
                print(f"\n🏘️ Processing: {street_address} in {suburb}, {city}")
                
                # Create location hierarchy
                area_id = ensure_location_hierarchy(
                    country_name="South Africa",
                    province_name=str(province).strip(),
                    city_name=str(city).strip(),
                    area_name=str(suburb).strip()
                )
                
                # Create property
                property_record = Property(
                    name=str(street_address).strip(),
                    image_url='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
                    erf_size=f"ERF: {erf_size} sqm, Building: {building_size} sqm",
                    cost=0,  # No price in your data
                    developer='Unknown Developer',
                    type=str(property_type).strip(),
                    area_id=area_id
                )
                
                db.session.add(property_record)
                db.session.flush()
                
                print(f"✅ Created property ID: {property_record.id}")
                properties_created += 1
                
            except Exception as row_error:
                print(f"❌ Row {index + 1} error: {row_error}")
                db.session.rollback()
                continue
        
        # Commit all changes
        db.session.commit()
        
        print(f"\n🎉 Import completed!")
        print(f"✅ Successfully imported {properties_created} properties")
        
        # Show final counts
        total_properties = Property.query.count()
        print(f"📊 Total properties in database: {total_properties}")
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        db.session.rollback()
