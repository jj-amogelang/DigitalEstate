#!/usr/bin/env bash
# Database initialization script for Render

# This script initializes the database with sample data
# Run this if your database is empty

python -c "
import os
from app import app, db
from models import Property, Owner, Valuation, Zoning
from datetime import datetime, date

with app.app_context():
    print('🔍 Checking database status...')
    
    # Check if tables exist and have data
    try:
        property_count = Property.query.count()
        print(f'📊 Found {property_count} properties in database')
        
        if property_count == 0:
            print('📝 Database is empty, initializing with sample data...')
            
            # Import and run the initialization
            from init_sqlite import init_sample_data
            init_sample_data()
            
            print('✅ Sample data initialized successfully!')
        else:
            print('✅ Database already contains data')
            
        # Verify the data
        properties = Property.query.all()
        for prop in properties:
            print(f'🏠 Property: {prop.title} - ${prop.price:,.2f}')
            
    except Exception as e:
        print(f'❌ Database error: {e}')
        print('🔧 Creating tables...')
        db.create_all()
        print('✅ Tables created')
"
