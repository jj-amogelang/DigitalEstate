#!/usr/bin/env python3
"""
Production readiness check for Digital Estate Backend
"""
import os
import sys
from flask import Flask
from app_config import Config

def check_environment():
    """Check if all required environment variables are set for production"""
    required_vars = [
        'DATABASE_URL'
    ]
    
    optional_vars = [
        'SECRET_KEY',
        'FLASK_DEBUG'
    ]
    
    print("🔍 Checking environment variables...")
    
    missing_required = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_required.append(var)
        else:
            print(f"✅ {var}: {'*' * 20}")  # Hide actual values for security
    
    for var in optional_vars:
        value = os.environ.get(var)
        if value:
            if var == 'SECRET_KEY':
                print(f"✅ {var}: {'*' * 20}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"⚠️  {var}: Not set (will use default)")
    
    if missing_required:
        print(f"\n❌ Missing required environment variables: {missing_required}")
        print("Please set these before deploying to production.")
        return False
    
    print("\n✅ Environment check passed!")
    return True

def check_database_config():
    """Check database configuration"""
    print("\n🔍 Checking database configuration...")
    
    config = Config()
    db_uri = config.SQLALCHEMY_DATABASE_URI
    
    if db_uri:
        if db_uri.startswith('postgresql://'):
            print("✅ PostgreSQL database configured")
            # Don't print the full URI for security
            print(f"✅ Database URI: {db_uri.split('@')[1] if '@' in db_uri else 'configured'}")
            return True
        elif db_uri.startswith('sqlite://'):
            print("⚠️  SQLite database configured (development mode)")
            return True
        else:
            print(f"⚠️  Unknown database type: {db_uri.split('://')[0]}")
            return False
    else:
        print("❌ No database configured!")
        return False

def check_app_config():
    """Check Flask app configuration"""
    print("\n🔍 Checking Flask configuration...")
    
    app = Flask(__name__)
    app.config.from_object(Config)
    
    print(f"✅ Debug mode: {app.config.get('DEBUG', False)}")
    print(f"✅ Secret key configured: {'Yes' if app.config.get('SECRET_KEY') else 'No'}")
    print(f"✅ CORS enabled: {app.config.get('CORS_ENABLED', False)}")
    
    return True

def main():
    print("🚀 Digital Estate Backend - Production Readiness Check")
    print("=" * 60)
    
    checks = [
        check_environment(),
        check_database_config(),
        check_app_config()
    ]
    
    if all(checks):
        print("\n🎉 Production readiness check PASSED!")
        print("Your backend is ready for deployment to Render.")
        return 0
    else:
        print("\n❌ Production readiness check FAILED!")
        print("Please fix the issues above before deploying.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
