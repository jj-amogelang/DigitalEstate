# Digital Estate - Separate Backend Deployment

This guide will help you deploy your Flask backend separately from your React frontend on Vercel.

## 🚀 Quick Start

### Option 1: Using PowerShell Script (Recommended for Windows)
```powershell
.\deploy-backend.ps1
```

### Option 2: Using Batch Script
```cmd
deploy-backend.bat
```

### Option 3: Manual Deployment
```bash
cd backend
vercel --prod
```

## 📋 Prerequisites

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

## 🔧 Configuration

### Backend Configuration
Your backend is already configured with:
- ✅ `vercel.json` - Vercel deployment configuration
- ✅ `wsgi.py` - WSGI entry point
- ✅ `requirements.txt` - Python dependencies
- ✅ `.vercelignore` - Files to exclude from deployment

### Frontend Configuration
Your frontend will need to be updated to use the separate backend URL:

1. After deploying the backend, you'll get a URL like: `https://digital-estate-backend-xxx.vercel.app`

2. Update `frontend/.env.production`:
   ```bash
   REACT_APP_API_URL=https://your-backend-url.vercel.app
   ```

3. Redeploy your frontend:
   ```bash
   cd frontend
   vercel --prod
   ```

## 🌍 Environment Variables

Set these in your Vercel dashboard for the backend project:

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Your PostgreSQL URL | Database connection string |
| `FLASK_ENV` | `production` | Flask environment |

### Setting Environment Variables:
1. Go to [vercel.com](https://vercel.com)
2. Navigate to your backend project
3. Go to Settings → Environment Variables
4. Add the variables listed above

## 🏗️ Project Structure

```
Digital Estate/
├── backend/                 # Flask API (separate deployment)
│   ├── app.py              # Main Flask application
│   ├── wsgi.py             # WSGI entry point
│   ├── vercel.json         # Vercel configuration
│   ├── requirements.txt    # Python dependencies
│   └── .vercelignore       # Deployment exclusions
├── frontend/               # React app (separate deployment)
│   ├── src/
│   ├── .env.local          # Local development
│   ├── .env.production     # Production environment
│   └── vercel.json         # Frontend Vercel config
└── deploy-backend.ps1      # Backend deployment script
```

## 🔗 API Endpoints

Once deployed, your backend will provide these endpoints:

- **Countries**: `GET /locations/countries`
- **Provinces**: `GET /locations/provinces/{country_id}`
- **Cities**: `GET /locations/cities/{province_id}`
- **Areas**: `GET /locations/areas/{city_id}`
- **Properties**: `GET /properties/all`
- **Property by Area**: `GET /properties/{area_id}`
- **Property Types**: `GET /property-types`

## 🐛 Troubleshooting

### Check Deployment Logs
```bash
vercel logs
```

### Redeploy
```bash
cd backend
vercel --prod
```

### Local Development
```bash
cd backend
python app.py
```

### Common Issues

1. **Database Connection Error**:
   - Ensure `DATABASE_URL` is set in Vercel environment variables
   - Check that your database is accessible from Vercel

2. **CORS Issues**:
   - Make sure your frontend URL is allowed in CORS settings
   - Check that the backend URL is correctly set in frontend environment

3. **Import Errors**:
   - Ensure all dependencies are listed in `requirements.txt`
   - Check Python version compatibility

## 📈 Benefits of Separate Deployment

1. **Independent Scaling**: Scale frontend and backend separately
2. **Technology Flexibility**: Use different hosting optimizations
3. **Development Workflow**: Deploy backend and frontend independently
4. **Cost Optimization**: Different pricing tiers for different services
5. **Team Collaboration**: Different teams can work on different parts

## 🔄 Deployment Workflow

1. **Deploy Backend**:
   ```bash
   .\deploy-backend.ps1
   ```

2. **Update Frontend Environment**:
   - Copy the backend URL from deployment output
   - Update `frontend/.env.production`

3. **Deploy Frontend**:
   ```bash
   cd frontend
   vercel --prod
   ```

## 🎯 Next Steps

After successful deployment:

1. Test all API endpoints
2. Update any hardcoded URLs in your frontend
3. Set up monitoring and logging
4. Configure custom domains if needed
5. Set up CI/CD pipelines for automatic deployments
