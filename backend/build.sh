#!/usr/bin/env bash
# Backend build script for Render

# Install dependencies
pip install -r requirements.txt

# Set up the database with sample data and Excel import
python -c "
from main import app, db
# Legacy script (property system archived) - imports disabled
# from database_models import EnhancedProperty, Owner, Valuation, Zoning
from datetime import datetime, date

with app.app_context():
    print('🔧 Creating database tables...')
    db.create_all()
    print('✅ Database tables created successfully!')
    
    # Check if we need to add sample data
    if EnhancedProperty.query.count() == 0:
        print('📝 Database initialized with empty tables')
        print('💡 Use render_database_init.py to populate with Excel data')
    else:
        print('✅ Database already contains data')
        
    print(f'📊 Total properties in database: {EnhancedProperty.query.count()}')
"
