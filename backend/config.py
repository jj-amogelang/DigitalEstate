import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

class Config:
    # Database configuration
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Use environment variable if available, otherwise use local PostgreSQL
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        # Vercel/Heroku compatibility - update deprecated postgres:// to postgresql://
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    if DATABASE_URL:
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
    else:
        # Fallback: use SQLite in /tmp for Vercel (writable directory)
        SQLALCHEMY_DATABASE_URI = 'sqlite:////tmp/property_dashboard.db'
    
    # Additional Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Enable CORS for development
    CORS_ENABLED = True
