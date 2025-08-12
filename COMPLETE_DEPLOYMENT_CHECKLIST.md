# Complete Deployment Checklist

## Phase 1: Database
- [ ] Go to dashboard.render.com
- [ ] Create PostgreSQL service
- [ ] Configure: digital-estate-db, digitalestate database
- [ ] Copy external database URL
- [ ] Wait for database to be ready

## Phase 2: Backend
- [ ] Create Web Service
- [ ] Connect jj-amogelang/DigitalEstate repo
- [ ] Set root directory to 'backend'
- [ ] Configure build/start commands
- [ ] Add environment variables (DATABASE_URL, FLASK_ENV, etc.)
- [ ] Deploy and wait for completion
- [ ] Test backend URL
- [ ] Save backend URL for frontend

## Phase 3: Frontend  
- [ ] Create Static Site
- [ ] Connect same GitHub repo
- [ ] Set root directory to 'frontend'
- [ ] Configure build command and publish directory
- [ ] Add REACT_APP_API_URL environment variable
- [ ] Deploy and wait for completion
- [ ] Test frontend URL

## Phase 4: Verification
- [ ] Backend health check works
- [ ] API endpoints return data
- [ ] Frontend loads without errors
- [ ] Dashboard displays property information
- [ ] No CORS errors in browser console

## Final URLs
Backend: ___________________________
Frontend: __________________________
Database: (internal use only)
