"""
Script to inspect the existing PostgreSQL properties table structure
"""
import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

def inspect_properties_table():
    # You'll need to update this connection string with your actual credentials
    # Format: postgresql://username:password@localhost:5432/digitalestate
    conn_string = "postgresql://username:password@localhost:5432/digitalestate"
    
    print("🔍 Inspecting PostgreSQL database structure...")
    print("📝 Please update the connection string above with your actual credentials")
    print()
    
    print("💡 To use this script:")
    print("1. Update the conn_string with your PostgreSQL credentials")
    print("2. Uncomment the database connection code below")
    print("3. Run: python inspect_db.py")
    print()
    
    # Uncomment and update the connection when you have the right credentials
    """
    try:
        conn = psycopg2.connect(conn_string)
        cursor = conn.cursor()
        
        # Get table structure
        cursor.execute(
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'properties' 
            ORDER BY ordinal_position;
        )
        
        columns = cursor.fetchall()
        print("Properties table structure:")
        print("-" * 60)
        for col in columns:
            print(f"Column: {col[0]:<20} Type: {col[1]:<15} Nullable: {col[2]}")
        
        # Get sample data
        cursor.execute("SELECT * FROM properties LIMIT 3;")
        sample_data = cursor.fetchall()
        print("\\nSample data:")
        print("-" * 60)
        for row in sample_data:
            print(row)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\\n💡 Common issues:")
        print("- Check if PostgreSQL is running")
        print("- Verify database name, username, and password")
        print("- Ensure the 'digitalestate' database exists")
        print("- Check if the 'properties' table exists")
    """

if __name__ == "__main__":
    inspect_properties_table()
