#!/usr/bin/env python3
"""
Migrate Neon database: Add missing columns to areas table
"""
import os
from dotenv import load_dotenv
from main import app, db
from sqlalchemy import text, inspect

load_dotenv()

def migrate_areas_table():
    """Add missing columns to areas table if they don't exist"""
    with app.app_context():
        print("=" * 70)
        print("MIGRATION: FIXING AREAS TABLE")
        print("=" * 70)
        
        # Check connection
        try:
            result = db.session.execute(text('SELECT 1')).scalar()
            print("✓ Database connection successful\n")
        except Exception as e:
            print(f"✗ Database connection failed: {e}")
            return False
        
        # Check existing columns in areas table
        inspector = inspect(db.engine)
        areas_columns = [col['name'] for col in inspector.get_columns('areas')]
        print(f"Current areas columns: {areas_columns}\n")
        
        # Add missing columns
        missing_columns = [
            ('area_type', "VARCHAR(50)"),
            ('postal_code', "VARCHAR(20)"),
            ('coordinates', "VARCHAR(100)"),
            ('updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
        ]
        
        for col_name, col_type in missing_columns:
            if col_name not in areas_columns:
                print(f"Adding column '{col_name}'...")
                try:
                    sql = f"ALTER TABLE areas ADD COLUMN {col_name} {col_type}"
                    db.session.execute(text(sql))
                    db.session.commit()
                    print(f"✓ Added column {col_name}\n")
                except Exception as e:
                    if 'already exists' not in str(e):
                        print(f"✗ Error adding {col_name}: {e}\n")
                        db.session.rollback()
            else:
                print(f"✓ Column '{col_name}' already exists\n")
        
        print("=" * 70)
        print("✓ MIGRATION COMPLETE")
        print("=" * 70)
        return True

if __name__ == '__main__':
    success = migrate_areas_table()
    exit(0 if success else 1)
