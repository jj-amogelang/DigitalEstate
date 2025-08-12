#!/usr/bin/env bash
# Backend build script for Render

# Install dependencies
pip install -r requirements.txt

# Set up the database
python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('Database tables created successfully!')
"
