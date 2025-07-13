#!/usr/bin/env python3
"""
Script to test PostgreSQL connection with different credentials
"""
import psycopg2
from psycopg2 import sql
import sys

def test_connection(host, port, database, username, password):
    """Test PostgreSQL connection with given parameters"""
    try:
        # Connection parameters
        conn_string = f"host='{host}' port='{port}' dbname='{database}' user='{username}' password='{password}'"
        
        print(f"🔍 Testing connection to: {username}@{host}:{port}/{database}")
        
        # Try to connect
        conn = psycopg2.connect(conn_string)
        cursor = conn.cursor()
        
        # Test basic query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ Connection successful!")
        print(f"📊 PostgreSQL version: {version[0]}")
        
        # Check if digitalestate database exists and has properties table
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = cursor.fetchall()
        print(f"📋 Tables found: {[table[0] for table in tables]}")
        
        # Check if properties table exists and count records
        if any('properties' in table for table in tables):
            cursor.execute("SELECT COUNT(*) FROM properties;")
            count = cursor.fetchone()[0]
            print(f"🏠 Properties table found with {count} records")
            
            # Show sample property if any exist
            if count > 0:
                cursor.execute("SELECT * FROM properties LIMIT 1;")
                columns = [desc[0] for desc in cursor.description]
                sample = cursor.fetchone()
                print(f"📝 Sample property columns: {columns}")
                if sample:
                    print(f"📝 Sample property data: {dict(zip(columns, sample))}")
        else:
            print("⚠️  No 'properties' table found")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🔍 PostgreSQL Connection Tester")
    print("=" * 50)
    
    # Common default combinations to try
    combinations = [
        ("localhost", "5432", "digitalestate", "postgres", "password"),
        ("localhost", "5432", "digitalestate", "postgres", ""),
        ("localhost", "5432", "digitalestate", "postgres", "postgres"),
        ("localhost", "5432", "digitalestate", "postgres", "admin"),
        ("localhost", "5432", "digitalestate", "postgres", "123456"),
    ]
    
    print("\n🧪 Trying common credential combinations...")
    
    for host, port, db, user, pwd in combinations:
        print(f"\n--- Testing: {user}@{host}:{port}/{db} (password: {'<empty>' if not pwd else '***'}) ---")
        if test_connection(host, port, db, user, pwd):
            print(f"\n🎉 SUCCESS! Your connection string should be:")
            print(f"DATABASE_URL=postgresql://{user}:{pwd}@{host}:{port}/{db}")
            break
        print("❌ This combination didn't work")
    else:
        print("\n⚠️  None of the common combinations worked.")
        print("Please check:")
        print("1. PostgreSQL is running (check Task Manager or Services)")
        print("2. The 'digitalestate' database exists")
        print("3. Your PostgreSQL password")
        print("\nTo find your PostgreSQL password, you might need to:")
        print("- Check your PostgreSQL installation notes")
        print("- Use pgAdmin to connect")
        print("- Reset the postgres user password")
