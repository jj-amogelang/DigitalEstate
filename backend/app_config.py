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
        # Render/Heroku compatibility - update deprecated postgres:// to postgresql://
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    if DATABASE_URL and DATABASE_URL.startswith('postgresql'):
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
        # Robust engine config for Render/Neon Postgres:
        # - pool_pre_ping: test connection before checkout (avoids SSL-closed errors)
        # - pool_recycle: recycle connections every 5 min (prevents stale SSL sessions)
        # - connect_args sslmode=require: explicit SSL enforcement (only for Postgres)
        _connect_args = {}
        # Only inject sslmode if the URL doesn't already carry it as a query param
        if 'sslmode' not in DATABASE_URL:
            _connect_args['sslmode'] = 'require'
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_pre_ping': True,
            'pool_recycle': 300,
            'pool_timeout': 30,
            'pool_size': 5,
            'max_overflow': 2,
            'connect_args': _connect_args,
        }
    else:
        # Fallback: use local SQLite for development
        # (covers both unset DATABASE_URL and sqlite:// URLs from .env)
        SQLALCHEMY_DATABASE_URI = DATABASE_URL if (DATABASE_URL and DATABASE_URL.startswith('sqlite')) \
            else 'sqlite:///instance/property_dashboard.db'
        SQLALCHEMY_ENGINE_OPTIONS = {}
    
    # Additional Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Enable CORS for development
    CORS_ENABLED = True
