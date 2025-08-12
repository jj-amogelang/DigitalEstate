#!/usr/bin/env bash
# Backend build script for Render

# Install dependencies
pip install -r requirements.txt

# Set up the database with sample data and Excel import
python -c "
from app import app, db
from models import EnhancedProperty, Owner, Valuation, Zoning
from datetime import datetime, date

with app.app_context():
    print('🔧 Creating database tables...')
    db.create_all()
    print('✅ Database tables created successfully!')
    
    # Check if we need to add sample data
    if EnhancedProperty.query.count() == 0:
        print('📝 Adding sample data with Excel import...')
        from init_sqlite import init_sample_data
        init_sample_data()
        print('✅ Sample data added successfully!')
    else:
        print('✅ Database already contains data')
        
    print(f'📊 Total properties in database: {EnhancedProperty.query.count()}')
"
