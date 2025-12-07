import os

# Ensure production defaults for serverless environment
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('FLASK_DEBUG', 'false')

# Import the Flask WSGI app
from wsgi import app  # Vercel Python will use `app` as the WSGI handler
