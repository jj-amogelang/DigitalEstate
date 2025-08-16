#!/usr/bin/env python3
"""
Excel Data Import Module
Imports property data from Excel files into the database
"""

import pandas as pd
import os
from datetime import datetime, date
from models import db, EnhancedProperty, Owner, Valuation, Zoning


def import_excel_properties(excel_file_path="property_research_sample.xlsx"):
    """Import properties from Excel file into EnhancedProperty model"""
    
    if not os.path.exists(excel_file_path):
        print(f"❌ Excel file not found: {excel_file_path}")
        return False
    
    try:
        print(f"📊 Reading Excel file: {excel_file_path}")
        
        # Read properties sheet
        df_properties = pd.read_excel(excel_file_path, sheet_name='properties')
        print(f"Found {len(df_properties)} properties in Excel")
        
        # Read owners sheet if exists
        try:
            df_owners = pd.read_excel(excel_file_path, sheet_name='owners')
            print(f"Found {len(df_owners)} owners in Excel")
        except:
            df_owners = None
            print("No owners sheet found, will create default owners")
        
        # Import owners first
        owner_mapping = {}
        if df_owners is not None:
            for _, row in df_owners.iterrows():
                existing_owner = Owner.query.filter_by(email=row.get('email', f'owner{row["owner_id"]}@example.com')).first()
                if not existing_owner:
                    owner = Owner(
                        full_name=row.get('full_name', f'Owner {row["owner_id"]}'),
                        email=row.get('email', f'owner{row["owner_id"]}@example.com'),
                        phone=row.get('phone', '+27-11-000-0000'),
                        address=row.get('address', 'Not specified'),
                        city=row.get('city', 'Unknown'),
                        province=row.get('province', 'Unknown'),
                        owner_type=row.get('owner_type', 'individual')
                    )
                    db.session.add(owner)
                    db.session.flush()  # Get the ID
                    owner_mapping[row['owner_id']] = owner.id
                else:
                    owner_mapping[row['owner_id']] = existing_owner.id
        else:
            # Create default owners
            default_owner = Owner.query.filter_by(email='excel.import@digitalestate.com').first()
            if not default_owner:
                default_owner = Owner(
                    full_name='Excel Import Owner',
                    email='excel.import@digitalestate.com',
                    phone='+27-11-000-0000',
                    address='Imported from Excel',
                    city='Various',
                    province='Various',
                    owner_type='individual'
                )
                db.session.add(default_owner)
                db.session.flush()
            owner_mapping['default'] = default_owner.id
        
        # Import properties
        imported_count = 0
        for _, row in df_properties.iterrows():
            # Check if property already exists
            existing_property = EnhancedProperty.query.filter_by(
                address=row['street_address'],
                city=row['city']
            ).first()
            
            if existing_property:
                print(f"⚠️ Property already exists: {row['street_address']}")
                continue
            
            # Map owner
            owner_id = owner_mapping.get(row.get('owner_id'), owner_mapping.get('default'))
            
            # Create enhanced property
            property_obj = EnhancedProperty(
                property_name=f"{row['property_type']} at {row['suburb']}",
                description=f"{row['property_type']} property in {row['suburb']}, {row['city']}. Built in {row['year_built']}, condition: {row['condition']}.",
                property_type=row['property_type'],
                address=row['street_address'],
                suburb=row['suburb'],
                city=row['city'],
                province=row['province'],
                postal_code=str(row['postal_code']),
                bedrooms=_estimate_bedrooms(row['building_size_sqm'], row['property_type']),
                bathrooms=_estimate_bathrooms(row['building_size_sqm'], row['property_type']),
                erf_size=float(row['erf_size_sqm']),
                building_size=float(row['building_size_sqm']) if pd.notna(row['building_size_sqm']) else None,
                year_built=int(row['year_built']) if pd.notna(row['year_built']) else None,
                status='available',
                listing_date=date.today(),
                owner_id=owner_id
            )
            
            db.session.add(property_obj)
            imported_count += 1
        
        # Import valuations if sheet exists
        try:
            df_valuations = pd.read_excel(excel_file_path, sheet_name='valuations')
            print(f"Found {len(df_valuations)} valuations in Excel")
            
            for _, row in df_valuations.iterrows():
                # Find property by matching criteria
                property_obj = EnhancedProperty.query.filter_by(id=row['property_id']).first()
                if property_obj:
                    valuation = Valuation(
                        property_id=property_obj.id,
                        valuation_date=pd.to_datetime(row['valuation_date']).date(),
                        market_value=float(row['market_value']),
                        municipal_value=float(row.get('assessed_value', row['market_value'] * 0.9)),
                        valuer_name=row.get('valuer_name', 'Excel Import Valuer'),
                        valuation_method=row.get('valuation_method', 'Comparative Market Analysis')
                    )
                    db.session.add(valuation)
        except Exception as e:
            print(f"⚠️ Could not import valuations: {e}")
        
        # Import zoning if sheet exists
        try:
            df_zoning = pd.read_excel(excel_file_path, sheet_name='zoning')
            print(f"Found {len(df_zoning)} zoning records in Excel")
            
            for _, row in df_zoning.iterrows():
                property_obj = EnhancedProperty.query.filter_by(id=row['property_id']).first()
                if property_obj:
                    zoning = Zoning(
                        property_id=property_obj.id,
                        zoning_code=row.get('zoning_code', 'UNKNOWN'),
                        zoning_description=row.get('zoning_description', 'Unknown zoning'),
                        municipality=row.get('municipality', f'{property_obj.city} Municipality'),
                        permitted_uses=row.get('permitted_uses', 'Standard permitted uses'),
                        building_restrictions=row.get('building_restrictions', 'Standard restrictions')
                    )
                    db.session.add(zoning)
        except Exception as e:
            print(f"⚠️ Could not import zoning: {e}")
        
        # Commit all changes
        db.session.commit()
        print(f"✅ Successfully imported {imported_count} properties from Excel")
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error importing Excel data: {e}")
        return False


def _estimate_bedrooms(building_size, property_type):
    """Estimate bedrooms based on building size and type"""
    if property_type.lower() in ['commercial', 'industrial', 'office']:
        return 0
    
    if building_size < 50:
        return 1
    elif building_size < 100:
        return 2
    elif building_size < 150:
        return 3
    elif building_size < 200:
        return 4
    else:
        return 5


def _estimate_bathrooms(building_size, property_type):
    """Estimate bathrooms based on building size and type"""
    if property_type.lower() in ['commercial', 'industrial', 'office']:
        return max(1, int(building_size / 100))  # Commercial bathrooms
    
    bedrooms = _estimate_bedrooms(building_size, property_type)
    return max(1, min(bedrooms, 3))  # Usually 1-3 bathrooms for residential


def get_excel_data_summary(excel_file_path="property_research_sample.xlsx"):
    """Get summary of Excel data without importing"""
    if not os.path.exists(excel_file_path):
        return {"error": f"Excel file not found: {excel_file_path}"}
    
    try:
        summary = {}
        excel_file = pd.ExcelFile(excel_file_path)
        
        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
            summary[sheet_name] = {
                "rows": len(df),
                "columns": list(df.columns),
                "sample_data": df.head(2).to_dict('records')
            }
        
        return summary
    except Exception as e:
        return {"error": f"Error reading Excel file: {e}"}


if __name__ == "__main__":
    # Test the import function
    from app import app
    with app.app_context():
        print("🔄 Testing Excel import...")
        success = import_excel_properties()
        if success:
            count = EnhancedProperty.query.count()
            print(f"✅ Total properties in database: {count}")
        else:
            print("❌ Import failed")
