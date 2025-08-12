# Render Backend Service Configuration

Service Type: Web Service
Name: digital-estate-backend
Environment: Python 3
Region: US-East (or your preferred region)
Branch: master
Root Directory: backend

Build Command: chmod +x build.sh && ./build.sh
Start Command: gunicorn --bind 0.0.0.0:$PORT wsgi:app

Auto-Deploy: Yes (recommended)

# IMPORTANT: Use these exact values
