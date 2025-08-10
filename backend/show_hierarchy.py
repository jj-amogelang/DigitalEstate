#!/usr/bin/env python3
"""
Show complete location hierarchy and verify dropdown structure
"""

from flask import Flask
from models import db, Country, Province, City, Area, Property
from config import Config

def create_app():
    """Create Flask app for database operations"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app

app = create_app()

with app.app_context():
    print("🌍 COMPLETE LOCATION HIERARCHY FOR DROPDOWNS")
    print("=" * 60)
    
    # Get all countries
    countries = Country.query.all()
    total_properties = 0
    
    for country in countries:
        print(f"\n🏳️ {country.name}")
        
        # Get provinces for this country
        provinces = Province.query.filter_by(country_id=country.id).all()
        
        for province in provinces:
            print(f"   📍 {province.name}")
            
            # Get cities for this province
            cities = City.query.filter_by(province_id=province.id).all()
            
            for city in cities:
                # Count properties in this city
                city_properties = db.session.query(Property)\
                    .join(Area, Property.area_id == Area.id)\
                    .filter(Area.city_id == city.id).count()
                
                print(f"      🏙️ {city.name} ({city_properties} properties)")
                
                # Get areas for this city
                areas = Area.query.filter_by(city_id=city.id).all()
                
                for area in areas:
                    # Count properties in this area
                    area_properties = Property.query.filter_by(area_id=area.id).count()
                    total_properties += area_properties
                    
                    print(f"         📋 {area.name} - {area_properties} properties")
    
    print(f"\n🎯 SUMMARY:")
    print(f"   Total Countries: {Country.query.count()}")
    print(f"   Total Provinces: {Province.query.count()}")
    print(f"   Total Cities: {City.query.count()}")
    print(f"   Total Areas: {Area.query.count()}")
    print(f"   Total Properties: {Property.query.count()}")
    
    print(f"\n✅ Your dropdown navigation structure is ready!")
    print(f"   Country → Province → City → Area → Properties")
    print(f"   🌐 Test at: http://localhost:3000/properties")
