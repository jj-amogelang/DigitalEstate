# Quick Reference for Render Deployment

## Service Configurations

### Database Service
Name: digital-estate-db
Type: PostgreSQL
Database: digitalestate
Plan: Free

### Backend Service  
Name: digital-estate-backend
Type: Web Service
Environment: Python 3
Root Directory: backend
Build Command: chmod +x build.sh && ./build.sh
Start Command: gunicorn --bind 0.0.0.0:$PORT wsgi:app

### Frontend Service
Name: digital-estate-frontend  
Type: Static Site
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: build

## Environment Variables

### Backend
DATABASE_URL = [from database service]
FLASK_ENV = production
SECRET_KEY = digital-estate-secret-key-2025
PYTHON_VERSION = 3.11.0

### Frontend
NODE_VERSION = 18
REACT_APP_API_URL = [from backend service]

## Testing URLs
Backend Health: https://[backend-url]/
Backend API: https://[backend-url]/api/properties
Frontend App: https://[frontend-url]/
