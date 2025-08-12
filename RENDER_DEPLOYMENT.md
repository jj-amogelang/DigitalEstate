# Digital Estate Dashboard - Render Deployment Guide

This guide explains how to deploy the Digital Estate Dashboard using Render for both frontend and backend services.

## 🏗️ Architecture Overview

- **Frontend**: React.js dashboard deployed as a static site on Render
- **Backend**: Flask API deployed as a web service on Render  
- **Database**: PostgreSQL database hosted on Render

## 📋 Prerequisites

1. **Render Account**: Create a free account at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Git**: Ensure your latest changes are committed and pushed

## 🚀 Deployment Steps

### 1. Database Setup

1. **Create PostgreSQL Database**:
   - Go to Render Dashboard → New → PostgreSQL
   - Name: `digital-estate-db`
   - Plan: Free (for development)
   - Region: Choose closest to your users
   - Create Database

2. **Save Database Credentials**:
   - Copy the `Internal Database URL` (starts with `postgresql://`)
   - Keep this for backend configuration

### 2. Backend Deployment

1. **Create Web Service**:
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Name: `digital-estate-backend`
   - Branch: `master`
   - Runtime: `Python 3`
   - Build Command: `cd backend && ./build.sh`
   - Start Command: `cd backend && gunicorn --bind 0.0.0.0:$PORT wsgi:app`

2. **Environment Variables**:
   Set these in the Render service settings:
   ```
   DATABASE_URL=<your-postgresql-internal-url>
   FLASK_ENV=production
   SECRET_KEY=<generate-random-secret-key>
   ```

3. **Deploy**: 
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - Note the service URL (e.g., `https://digital-estate-backend.onrender.com`)

### 3. Frontend Deployment

1. **Create Static Site**:
   - Go to Render Dashboard → New → Static Site
   - Connect your GitHub repository
   - Name: `digital-estate-dashboard`
   - Branch: `master`
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/build`

2. **Environment Variables**:
   Set in the static site settings:
   ```
   REACT_APP_API_URL=https://digital-estate-backend.onrender.com
   ```

3. **Deploy**:
   - Click "Create Static Site"
   - Render will build and deploy your React app
   - Note the site URL (e.g., `https://digital-estate-dashboard.onrender.com`)

## 🔧 Configuration Files

The following files are already configured for Render deployment:

### Backend Configuration
- `backend/render.yaml` - Render service configuration
- `backend/build.sh` - Database setup and dependency installation
- `backend/wsgi.py` - WSGI application entry point
- `backend/requirements.txt` - Python dependencies

### Frontend Configuration  
- `frontend/.env.production` - Production API URL configuration
- `frontend/package.json` - Build scripts and dependencies

## 🔄 Auto-Deployment

Both services are configured for automatic deployment:
- **Trigger**: Push to `master` branch
- **Backend**: Rebuilds and redeploys Flask API
- **Frontend**: Rebuilds and redeploys React app
- **Database**: Automatically initializes with sample data on first deploy

## 🌐 URLs

After deployment, your services will be available at:
- **Dashboard**: https://digital-estate-dashboard.onrender.com
- **API Backend**: https://digital-estate-backend.onrender.com
- **Database**: Internal URL (not publicly accessible)

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check logs in Render dashboard
   - Ensure all dependencies are in requirements.txt/package.json

2. **Database Connection Issues**:
   - Verify DATABASE_URL environment variable
   - Check PostgreSQL service is running

3. **API Connection Issues**:
   - Verify REACT_APP_API_URL points to correct backend URL
   - Check CORS configuration in Flask app

### Logs and Monitoring

- **Backend Logs**: Render Dashboard → digital-estate-backend → Logs
- **Frontend Logs**: Render Dashboard → digital-estate-dashboard → Logs  
- **Database Metrics**: Render Dashboard → digital-estate-db → Metrics

## 📊 Features Deployed

✅ **Professional Dashboard**: Zara-inspired minimalist design
✅ **Property Management**: Full CRUD operations for properties
✅ **Advanced Search**: Multi-criteria property filtering
✅ **Owner Management**: Complete owner profiles and property relationships
✅ **Valuations**: Property valuation tracking and history
✅ **Zoning Information**: Detailed zoning data and restrictions
✅ **Dashboard Analytics**: Charts and statistics
✅ **Responsive Design**: Mobile and desktop optimized

## 🔐 Security

- Database credentials stored as environment variables
- CORS properly configured for frontend domain
- PostgreSQL database with secure connections
- No sensitive data in source code

---

**Deploy Command Summary**:
```bash
# Ensure all changes are committed
git add .
git commit -m "Deploy to Render"
git push origin master

# Render will automatically deploy both services
```
