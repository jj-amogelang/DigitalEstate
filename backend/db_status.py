#!/usr/bin/env python3
"""
Database Status Check Script
Quick overview of your Digital Estate database
"""

from flask import Flask
from models import db, Property, Owner, Valuation, Zoning, MarketTrend
from config import Config
from sqlalchemy import text

def setup_app():
    """Setup Flask app"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app

def check_database_status():
    """Check database connection and current data"""
    
    app = setup_app()
    
    print("🏠 Digital Estate Database Status")
    print("=" * 50)
    
    try:
        with app.app_context():
            # Test connection
            with db.engine.connect() as connection:
                result = connection.execute(text('SELECT version();'))
                version = result.fetchone()[0]
                print(f"✅ PostgreSQL Connected: {version.split(',')[0]}")
            
            # Check table counts
            print(f"\n📊 Current Database Contents:")
            print(f"   Properties: {Property.query.count()}")
            print(f"   Owners: {Owner.query.count()}")
            print(f"   Valuations: {Valuation.query.count()}")
            print(f"   Zoning Records: {Zoning.query.count()}")
            print(f"   Market Trends: {MarketTrend.query.count()}")
            
            # Show sample properties
            properties = Property.query.limit(5).all()
            if properties:
                print(f"\n🏢 Sample Properties:")
                for prop in properties:
                    print(f"   • {prop.name} - {prop.type} - R{prop.cost:,}")
            
            # Show property types breakdown
            print(f"\n📋 Property Types:")
            types = db.session.execute(text("""
                SELECT type, COUNT(*) as count 
                FROM properties 
                GROUP BY type 
                ORDER BY count DESC
            """)).fetchall()
            
            for prop_type, count in types:
                print(f"   • {prop_type}: {count} properties")
            
            # Show price ranges
            print(f"\n💰 Price Ranges:")
            price_ranges = db.session.execute(text("""
                SELECT 
                    CASE 
                        WHEN cost < 1000000 THEN 'Under R1M'
                        WHEN cost < 5000000 THEN 'R1M - R5M' 
                        WHEN cost < 10000000 THEN 'R5M - R10M'
                        WHEN cost < 20000000 THEN 'R10M - R20M'
                        ELSE 'Above R20M'
                    END as price_range,
                    COUNT(*) as count
                FROM properties 
                WHERE cost > 0
                GROUP BY 
                    CASE 
                        WHEN cost < 1000000 THEN 'Under R1M'
                        WHEN cost < 5000000 THEN 'R1M - R5M' 
                        WHEN cost < 10000000 THEN 'R5M - R10M'
                        WHEN cost < 20000000 THEN 'R10M - R20M'
                        ELSE 'Above R20M'
                    END
                ORDER BY count DESC
            """)).fetchall()
            
            for price_range, count in price_ranges:
                print(f"   • {price_range}: {count} properties")
            
            print(f"\n🌐 API Endpoints Available:")
            print(f"   • http://localhost:5000/properties/all")
            print(f"   • http://localhost:5000/api/properties")
            print(f"   • http://localhost:5000/api/search/properties?q=search_term")
            print(f"   • http://localhost:5000/test-db")
            
            print(f"\n🎯 Frontend URLs:")
            print(f"   • http://localhost:3000/properties (or http://localhost:3001/properties)")
            print(f"   • http://localhost:3000/research")
            
            return True
            
    except Exception as e:
        print(f"❌ Database Error: {e}")
        print(f"\n💡 Troubleshooting:")
        print(f"   1. Make sure PostgreSQL is running")
        print(f"   2. Check database credentials in config.py")
        print(f"   3. Verify 'digitalestate2' database exists")
        return False

if __name__ == "__main__":
    check_database_status()
