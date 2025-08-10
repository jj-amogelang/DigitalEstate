#!/usr/bin/env python3
"""
Inspect current database structure
"""

import psycopg2
from psycopg2.extras import DictCursor

def inspect_database():
    """Inspect current database structure"""
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host="localhost",
            database="digitalestate2",
            user="postgres",
            password="postgres"  # Update with your password
        )
        
        cursor = conn.cursor(cursor_factory=DictCursor)
        
        print("🔍 Inspecting digitalestate2 database...")
        print("=" * 50)
        
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"📊 Found {len(tables)} tables:")
        for table in tables:
            print(f"   - {table[0]}")
        
        print("\n" + "=" * 50)
        
        # Check properties table structure
        if any(table[0] == 'properties' for table in tables):
            print("📋 Properties table structure:")
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'properties' 
                ORDER BY ordinal_position;
            """)
            
            columns = cursor.fetchall()
            for col in columns:
                nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                default = f"DEFAULT {col[3]}" if col[3] else ""
                print(f"   {col[0]:20} {col[1]:15} {nullable:8} {default}")
            
            # Check sample data
            cursor.execute("SELECT COUNT(*) FROM properties;")
            count = cursor.fetchone()[0]
            print(f"\n📊 Properties table has {count} records")
            
            if count > 0:
                cursor.execute("SELECT * FROM properties LIMIT 3;")
                sample_data = cursor.fetchall()
                print("\n📋 Sample data (first 3 rows):")
                for i, row in enumerate(sample_data, 1):
                    print(f"   Row {i}: {dict(row)}")
        
        # Check other tables
        for table_name in ['owners', 'valuations', 'zoning', 'market_trends']:
            if any(table[0] == table_name for table in tables):
                cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                count = cursor.fetchone()[0]
                print(f"📊 {table_name} table has {count} records")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error inspecting database: {e}")

def suggest_migration():
    """Suggest migration strategy"""
    print("\n" + "=" * 50)
    print("💡 MIGRATION SUGGESTIONS:")
    print("=" * 50)
    print("1. If the current 'properties' table has your Excel data:")
    print("   - We can migrate the data to the new structure")
    print("   - Back up current data first")
    print("   - Map old columns to new structure")
    print()
    print("2. If the current 'properties' table is empty or test data:")
    print("   - We can drop and recreate with new structure")
    print("   - Import your Excel data fresh")
    print()
    print("3. Safe approach:")
    print("   - Keep current table as 'legacy_properties'")
    print("   - Create new 'properties' table with correct structure")
    print("   - Import Excel data to new table")

if __name__ == "__main__":
    inspect_database()
    suggest_migration()
