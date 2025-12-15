#!/usr/bin/env python3
"""
Database Setup & Cleanup Script for Neon PostgreSQL
- Drops and recreates the properties table
- Seeds with featured properties data
- Ensures proper structure and relationships
"""
import os
from dotenv import load_dotenv
from main import app, db
from area_models import Property, Area
from sqlalchemy import text, inspect

load_dotenv()

def setup_database():
    """Complete database setup: create tables and seed data"""
    with app.app_context():
        print("=" * 70)
        print("DATABASE SETUP FOR NEON POSTGRESQL")
        print("=" * 70)
        
        # Check connection
        try:
            result = db.session.execute(text('SELECT 1')).scalar()
            print("✓ Database connection successful")
            db_url = str(db.engine.url).replace(str(db.engine.url).split('@')[0], 'postgresql://***')
            print(f"  Connected to: {db_url}\n")
        except Exception as e:
            print(f"✗ Database connection failed: {e}")
            return False
        
        # Check existing tables
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        print(f"Existing tables: {', '.join(existing_tables)}")
        
        # Drop properties table if exists
        if 'properties' in existing_tables:
            print("\nDropping existing 'properties' table...")
            try:
                db.session.execute(text('DROP TABLE IF EXISTS properties CASCADE'))
                db.session.commit()
                print("✓ Dropped 'properties' table")
            except Exception as e:
                print(f"✗ Error dropping table: {e}")
                db.session.rollback()
                return False
        
        # Create properties table
        print("\nCreating 'properties' table...")
        try:
            create_table_sql = '''
            CREATE TABLE properties (
                id SERIAL PRIMARY KEY,
                area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
                name VARCHAR(200) NOT NULL,
                developer VARCHAR(120),
                property_type VARCHAR(40) NOT NULL,
                address VARCHAR(240),
                price NUMERIC(18, 2),
                bedrooms INTEGER,
                image_url TEXT,
                is_featured BOOLEAN DEFAULT FALSE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            '''
            db.session.execute(text(create_table_sql))
            db.session.commit()
            print("✓ Created 'properties' table")
            
            # Create indices
            print("\nCreating indices...")
            indices = [
                'CREATE INDEX idx_properties_area_id ON properties(area_id)',
                'CREATE INDEX idx_properties_type ON properties(property_type)',
                'CREATE INDEX idx_properties_featured ON properties(is_featured)'
            ]
            for idx_sql in indices:
                try:
                    db.session.execute(text(idx_sql))
                    db.session.commit()
                    print(f"✓ {idx_sql.split('ON')[0].strip()}")
                except Exception as e:
                    if 'already exists' not in str(e):
                        print(f"  Note: {e}")
        except Exception as e:
            print(f"✗ Error creating table: {e}")
            db.session.rollback()
            return False
        
        # Seed featured properties for Sandton (area_id = 1)
        print("\nSeeding featured properties...")
        try:
            # Get Sandton area
            sandton = db.session.query(Area).filter(Area.id == 1).first()
            if not sandton:
                print("✗ Sandton area (id=1) not found. Seeding aborted.")
                return False
            
            properties_data = [
                {
                    'name': 'Sandton Gate - Office Tower',
                    'developer': 'Eris Property Group',
                    'property_type': 'commercial',
                    'address': '5 Rudd Road, Sandton, Johannesburg',
                    'price': None,  # POA
                    'bedrooms': None,
                    'image_url': 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=500&h=300&fit=crop',
                    'is_featured': True,
                    'description': 'Premium commercial office tower in the heart of Sandton with state-of-the-art facilities.'
                },
                {
                    'name': 'The Marc Retail',
                    'developer': 'Eris Property Group',
                    'property_type': 'commercial',
                    'address': '129 Rivonia Road, Sandton, Johannesburg',
                    'price': None,  # POA
                    'bedrooms': None,
                    'image_url': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&h=300&fit=crop',
                    'is_featured': True,
                    'description': 'Iconic retail and office complex with premium tenant mix and high foot traffic.'
                },
                {
                    'name': 'Munro Luxury Apartments',
                    'developer': 'Balwin Properties',
                    'property_type': 'residential',
                    'address': '60 Alice Lane, Sandton, Johannesburg',
                    'price': 3250000,
                    'bedrooms': 2,
                    'image_url': 'https://images.unsplash.com/photo-1512917774080-9e6fc297a7ba?w=500&h=300&fit=crop',
                    'is_featured': True,
                    'description': 'Luxury 2-bedroom apartment in the most sought-after Sandton address with premium finishes.'
                },
                {
                    'name': 'The Blyde Sandton',
                    'developer': 'Balwin Properties',
                    'property_type': 'residential',
                    'address': '11 Benmore Road, Sandton, Johannesburg',
                    'price': 2850000,
                    'bedrooms': 2,
                    'image_url': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=300&fit=crop',
                    'is_featured': True,
                    'description': 'Contemporary 2-bedroom residential unit in a secure gated community with world-class amenities.'
                }
            ]
            
            inserted_count = 0
            for prop_data in properties_data:
                try:
                    prop = Property(
                        area_id=1,  # Sandton
                        **prop_data
                    )
                    db.session.add(prop)
                    db.session.commit()
                    inserted_count += 1
                    print(f"  ✓ Inserted: {prop_data['name']} ({prop_data['property_type']})")
                except Exception as e:
                    print(f"  ✗ Error inserting {prop_data['name']}: {e}")
                    db.session.rollback()
            
            print(f"\n✓ Successfully seeded {inserted_count}/{len(properties_data)} properties")
        except Exception as e:
            print(f"✗ Error seeding properties: {e}")
            return False
        
        # Verify the data
        print("\n" + "=" * 70)
        print("VERIFICATION")
        print("=" * 70)
        try:
            total_props = db.session.query(Property).count()
            commercial = db.session.query(Property).filter(Property.property_type == 'commercial').count()
            residential = db.session.query(Property).filter(Property.property_type == 'residential').count()
            featured = db.session.query(Property).filter(Property.is_featured == True).count()
            
            print(f"Total properties: {total_props}")
            print(f"Commercial: {commercial}")
            print(f"Residential: {residential}")
            print(f"Featured: {featured}")
            
            print("\nSample data:")
            for prop in db.session.query(Property).limit(3).all():
                print(f"  - {prop.name} by {prop.developer} ({prop.property_type})")
                print(f"    Area ID: {prop.area_id} | Featured: {prop.is_featured}")
                if prop.price:
                    print(f"    Price: R{prop.price:,.0f}")
                else:
                    print(f"    Price: POA")
        except Exception as e:
            print(f"Error verifying: {e}")
        
        print("\n" + "=" * 70)
        print("✓ DATABASE SETUP COMPLETE")
        print("=" * 70)
        return True

if __name__ == '__main__':
    success = setup_database()
    exit(0 if success else 1)
