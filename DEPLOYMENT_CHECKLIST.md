# Render Deployment Checklist

## Backend Deployment
- [ ] Create PostgreSQL database on Render
- [ ] Copy database connection string
- [ ] Deploy backend web service
- [ ] Add environment variables (DATABASE_URL, FLASK_ENV, etc.)
- [ ] Wait for deployment to complete
- [ ] Test backend URL in browser
- [ ] Note down backend URL for frontend

## Frontend Deployment  
- [ ] Deploy frontend as static site
- [ ] Set REACT_APP_API_URL to backend URL
- [ ] Wait for deployment to complete
- [ ] Test frontend URL in browser

## Verification
- [ ] Backend health check responds
- [ ] API endpoints return data
- [ ] Frontend loads without errors
- [ ] Frontend can communicate with backend
- [ ] Dashboard displays property data

## URLs to Save
Backend: https://[your-backend].onrender.com
Frontend: https://[your-frontend].onrender.com
Database: [internal-connection-string]
