#!/usr/bin/env python3
"""
Production Database Management Script
Manages database operations for the Render deployment
"""
import os
import sys
import requests
import json

def check_production_status():
    """Check the production API status and data"""
    print("🔍 Production Dashboard Status Check")
    print("=" * 50)
    
    # Your Render deployment URL
    base_url = "https://digital-estate-backend.onrender.com"
    
    try:
        # Check API health
        print("🏥 Checking API health...")
        health_response = requests.get(f"{base_url}/", timeout=30)
        print(f"Health Status: {health_response.status_code}")
        if health_response.status_code == 200:
            print("✅ API is responding")
        else:
            print("❌ API health check failed")
            return False
            
        # Check properties endpoint
        print("\n📊 Checking properties data...")
        properties_response = requests.get(f"{base_url}/api/properties", timeout=30)
        print(f"Properties API Status: {properties_response.status_code}")
        
        if properties_response.status_code == 200:
            properties_data = properties_response.json()
            print(f"✅ Properties API responding")
            print(f"📈 Total properties returned: {len(properties_data)}")
            
            if len(properties_data) > 0:
                print("\n📋 Sample property data:")
                sample = properties_data[0]
                print(f"  • ID: {sample.get('id')}")
                print(f"  • Address: {sample.get('address')}")
                print(f"  • City: {sample.get('city')}")
                print(f"  • Province: {sample.get('province')}")
                print(f"  • Type: {sample.get('property_type')}")
                print(f"  • Price: R{sample.get('market_value', 0):,.2f}")
            else:
                print("⚠️  No properties found in database!")
                print("💡 You need to populate the database with property data.")
                
        else:
            print("❌ Properties API failed")
            print(f"Response: {properties_response.text}")
            return False
            
        # Check locations endpoint
        print("\n🌍 Checking locations data...")
        locations_response = requests.get(f"{base_url}/api/locations", timeout=30)
        if locations_response.status_code == 200:
            locations_data = locations_response.json()
            print(f"✅ Locations API responding with {len(locations_data)} locations")
        else:
            print("⚠️  Locations API not responding properly")
            
        return True
        
    except requests.exceptions.Timeout:
        print("❌ Request timed out - Render service may be starting up")
        print("💡 Try again in a few minutes")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def get_render_database_url():
    """Get the Render database URL from environment or config"""
    # Check for environment variable first
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        print(f"✅ Found DATABASE_URL in environment")
        return db_url
    
    # Check config file
    try:
        from app_config import SQLALCHEMY_DATABASE_URI
        if 'postgresql' in SQLALCHEMY_DATABASE_URI:
            print(f"✅ Found PostgreSQL URL in config")
            return SQLALCHEMY_DATABASE_URI
    except ImportError:
        pass
    
    print("⚠️  No database URL found")
    return None

def main():
    """Main function to check production status"""
    print("🚀 Digital Estate Production Check")
    print("=" * 50)
    
    # Check database configuration
    db_url = get_render_database_url()
    if db_url:
        print(f"📊 Database configured: {'✅ PostgreSQL' if 'postgresql' in db_url else '❌ Not PostgreSQL'}")
    
    # Check production API
    success = check_production_status()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Production check completed!")
        print("💡 If properties count is 0, run the database initialization script")
    else:
        print("❌ Production check failed")
        print("💡 Check your Render deployment logs for issues")

if __name__ == '__main__':
    main()
