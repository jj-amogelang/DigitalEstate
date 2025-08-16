#!/usr/bin/env python3
"""
WSGI Entry Point for Render Deployment
This file is the entry point for the Flask application on Render
"""

from main import app

if __name__ == "__main__":
    app.run()

# Export the app for gunicorn
application = app
