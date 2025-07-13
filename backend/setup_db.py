from app import app, db
from models import Property
from sqlalchemy import text
import traceback

def inspect_database():
    """Inspect the existing database structure"""
    with app.app_context():
        try:
            # Try to connect and inspect
            with db.engine.connect() as connection:
                print("✅ Database connection successful!")
                
                # Check if properties table exists
                result = connection.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'properties';
                """))
                
                if result.fetchone():
                    print("✅ Properties table exists!")
                    
                    # Get table structure
                    result = connection.execute(text("""
                        SELECT column_name, data_type, is_nullable 
                        FROM information_schema.columns 
                        WHERE table_name = 'properties' 
                        ORDER BY ordinal_position;
                    """))
                    
                    columns = result.fetchall()
                    print("📋 Properties table structure:")
                    for col_name, data_type, nullable in columns:
                        print(f"  - {col_name}: {data_type} ({'NULL' if nullable == 'YES' else 'NOT NULL'})")
                    
                    # Count existing records
                    result = connection.execute(text("SELECT COUNT(*) FROM properties;"))
                    count = result.fetchone()[0]
                    print(f"📊 Found {count} existing properties")
                    
                    # Show sample data
                    if count > 0:
                        result = connection.execute(text("SELECT * FROM properties LIMIT 3;"))
                        samples = result.fetchall()
                        print("\n📝 Sample properties:")
                        for i, sample in enumerate(samples, 1):
                            print(f"  Property {i}: {dict(zip([col[0] for col in columns], sample))}")
                    
                    return True
                    
                else:
                    print("❌ Properties table does not exist")
                    return False
                    
        except Exception as e:
            print(f"❌ Database inspection failed: {e}")
            traceback.print_exc()
            return False

def create_simple_properties_table():
    """Create a simple properties table if none exists"""
    with app.app_context():
        try:
            # Create a minimal properties table
            with db.engine.connect() as connection:
                connection.execute(text("""
                    CREATE TABLE IF NOT EXISTS properties (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(200),
                        price DECIMAL(15,2),
                        property_type VARCHAR(50) DEFAULT 'residential',
                        location VARCHAR(200),
                        city VARCHAR(100),
                        province VARCHAR(100),
                        size VARCHAR(50),
                        image_url VARCHAR(500),
                        developer VARCHAR(100),
                        bedrooms INTEGER,
                        bathrooms INTEGER,
                        description TEXT,
                        status VARCHAR(50) DEFAULT 'available',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                connection.commit()
                print("✅ Properties table created successfully!")
                
                # Insert sample data
                sample_properties = [
                    ("Luxury Apartment in Sandton", 2500000, "residential", "Sandton, Johannesburg", "Johannesburg", "Gauteng", "120 sqm", "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400", "Elite Developments", 3, 2, "Modern luxury apartment with stunning city views"),
                    ("Office Space in Cape Town CBD", 4200000, "commercial", "Cape Town CBD", "Cape Town", "Western Cape", "200 sqm", "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=400", "Business Properties", None, None, "Prime office space in the heart of Cape Town"),
                    ("Industrial Warehouse Durban", 3800000, "industrial", "Pinetown, Durban", "Durban", "KwaZulu-Natal", "500 sqm", "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=400", "Industrial Holdings", None, None, "Modern warehouse facility with loading bays"),
                    ("Retail Space Menlyn", 1800000, "retail", "Menlyn, Pretoria", "Pretoria", "Gauteng", "80 sqm", "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", "Retail Ventures", None, None, "Prime retail location in busy shopping center"),
                    ("Family Home Umhlanga", 3200000, "residential", "Umhlanga, Durban", "Durban", "KwaZulu-Natal", "180 sqm", "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400", "Coastal Living", 4, 3, "Beautiful family home near the beach")
                ]
                
                for prop in sample_properties:
                    connection.execute(text("""
                        INSERT INTO properties (name, price, property_type, location, city, province, size, image_url, developer, bedrooms, bathrooms, description)
                        VALUES (:name, :price, :type, :location, :city, :province, :size, :image, :developer, :bedrooms, :bathrooms, :description)
                    """), {
                        "name": prop[0], "price": prop[1], "type": prop[2], "location": prop[3],
                        "city": prop[4], "province": prop[5], "size": prop[6], "image": prop[7],
                        "developer": prop[8], "bedrooms": prop[9], "bathrooms": prop[10], "description": prop[11]
                    })
                
                connection.commit()
                print("✅ Sample properties inserted successfully!")
                return True
                
        except Exception as e:
            print(f"❌ Failed to create properties table: {e}")
            traceback.print_exc()
            return False

if __name__ == "__main__":
    print("🔍 Database Inspector and Setup Tool")
    print("=" * 50)
    
    # First, try to inspect existing structure
    if inspect_database():
        print("\n🎉 Your existing properties table is ready to use!")
        print("Your frontend should now be able to fetch data from: http://localhost:5000/properties/all")
    else:
        print("\n⚠️  No properties table found. Creating a new one...")
        if create_simple_properties_table():
            print("\n🎉 New properties table created with sample data!")
            print("Your frontend should now be able to fetch data from: http://localhost:5000/properties/all")
        else:
            print("\n❌ Failed to set up properties table.")
            print("Please check your PostgreSQL credentials and try again.")
