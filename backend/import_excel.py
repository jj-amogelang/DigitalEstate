#!/usr/bin/env python3
"""
Simple Excel Data Import Script for Digital Estate
This script helps import property data from Excel files into the PostgreSQL database
"""

import os
import sys
import pandas as pd
from datetime import datetime, date
from decimal import Decimal
from flask import Flask
from models import db, Property, Owner, Valuation
from config import Config

def setup_app():
    """Setup Flask app and database connection"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app

def import_excel_properties(excel_file_path, sheet_name=None):
    """Import properties from Excel file"""
    
    if not os.path.exists(excel_file_path):
        print(f"❌ Excel file not found: {excel_file_path}")
        return False
    
    print(f"📂 Reading Excel file: {excel_file_path}")
    
    try:
        # Read Excel file
        if sheet_name:
            df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
        else:
            df = pd.read_excel(excel_file_path)
        
        print(f"📊 Found {len(df)} rows in Excel file")
        print(f"📋 Columns: {', '.join(df.columns.tolist())}")
        
        app = setup_app()
        
        with app.app_context():
            properties_added = 0
            properties_updated = 0
            
            for index, row in df.iterrows():
                try:
                    # Map Excel columns to database fields
                    # Adjust these mappings based on your Excel structure
                    property_data = {
                        'name': row.get('Name') or row.get('Property Name') or f'Property {index + 1}',
                        'type': row.get('Type') or row.get('Property Type') or 'Residential',
                        'cost': parse_numeric(row.get('Price') or row.get('Cost') or row.get('Value')),
                        'erf_size': str(row.get('ERF Size') or row.get('Size') or ''),
                        'developer': row.get('Developer') or 'Unknown Developer',
                        'image_url': row.get('Image URL') or generate_image_url(row.get('Type', 'Residential')),
                        'area_id': row.get('Area ID') or 'feb325e4-16ab-4954-9523-e9b5b211bb8b'  # Default Sandton
                    }
                    
                    # Check if property already exists
                    existing_property = Property.query.filter_by(name=property_data['name']).first()
                    
                    if existing_property:
                        # Update existing property
                        for key, value in property_data.items():
                            if value:  # Only update non-empty values
                                setattr(existing_property, key, value)
                        properties_updated += 1
                        print(f"✏️  Updated property: {property_data['name']}")
                    else:
                        # Create new property
                        new_property = Property(**property_data)
                        db.session.add(new_property)
                        properties_added += 1
                        print(f"➕ Added property: {property_data['name']}")
                    
                    # Commit every 50 records
                    if (properties_added + properties_updated) % 50 == 0:
                        db.session.commit()
                        print(f"💾 Saved {properties_added + properties_updated} properties...")
                        
                except Exception as row_error:
                    print(f"⚠️  Error processing row {index + 1}: {row_error}")
                    continue
            
            # Final commit
            db.session.commit()
            
            print(f"\n🎉 Import completed successfully!")
            print(f"➕ Properties added: {properties_added}")
            print(f"✏️  Properties updated: {properties_updated}")
            print(f"📊 Total properties in database: {Property.query.count()}")
            
    except Exception as e:
        print(f"❌ Error importing Excel data: {e}")
        return False
    
    return True

def parse_numeric(value):
    """Parse numeric value from Excel"""
    if pd.isna(value) or value is None:
        return 0
    
    if isinstance(value, (int, float)):
        return int(value)
    
    # Try to extract number from string
    import re
    try:
        # Remove common currency symbols and spaces
        clean_value = str(value).replace('R', '').replace(',', '').replace(' ', '')
        numeric_part = re.findall(r'\d+\.?\d*', clean_value)
        if numeric_part:
            return int(float(numeric_part[0]))
    except:
        pass
    
    return 0

def generate_image_url(property_type):
    """Generate appropriate image URL based on property type"""
    image_map = {
        'Residential': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
        'Commercial': 'https://images.unsplash.com/photo-1590490360183-694b7e71b254?w=800&h=600&fit=crop',
        'Industrial': 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
        'Retail': 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop'
    }
    
    return image_map.get(property_type, image_map['Residential'])

def main():
    """Main import function"""
    print("🏠 Digital Estate Excel Import Tool")
    print("=" * 50)
    
    # Get Excel file path from user
    excel_path = input("📁 Enter path to Excel file: ").strip().replace('"', '')
    
    if not excel_path:
        print("❌ No file path provided")
        return
    
    # Check if sheet name is needed
    sheet_name = input("📋 Enter sheet name (press Enter for default): ").strip()
    if not sheet_name:
        sheet_name = None
    
    # Preview first few rows
    preview = input("👀 Preview data before import? (y/n): ").lower().strip()
    if preview == 'y':
        try:
            df = pd.read_excel(excel_path, sheet_name=sheet_name, nrows=5)
            print("\n📋 Preview of Excel data:")
            print(df.to_string())
            print(f"\n📊 Columns found: {', '.join(df.columns.tolist())}")
            
            confirm = input("\n✅ Continue with import? (y/n): ").lower().strip()
            if confirm != 'y':
                print("❌ Import cancelled")
                return
        except Exception as e:
            print(f"❌ Error previewing file: {e}")
            return
    
    # Run import
    success = import_excel_properties(excel_path, sheet_name)
    
    if success:
        print("\n🌐 Test your imported data at: http://localhost:3000/properties")
        print("🔍 Use the search feature to find specific properties")
    else:
        print("❌ Import failed")

if __name__ == "__main__":
    main()
