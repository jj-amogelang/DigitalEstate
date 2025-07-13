# DigitalEstate Dashboard - Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)
3. **PostgreSQL Database**: Set up a PostgreSQL database (recommended: Railway, Supabase, or Neon)

## Step 1: Database Setup

### Option A: Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Create a new PostgreSQL database
3. Copy the DATABASE_URL connection string

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database and copy the URI

### Option C: Neon
1. Go to [neon.tech](https://neon.tech)
2. Create a new database
3. Copy the connection string

## Step 2: Vercel Deployment

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**:
   ```bash
   cd "C:\Users\amoge\Digital Estate"
   vercel
   ```

4. **Set environment variables**:
   ```bash
   vercel env add DATABASE_URL production
   ```
   Paste your PostgreSQL DATABASE_URL when prompted.

5. **Deploy**:
   ```bash
   vercel --prod
   ```

### Method 2: Vercel Dashboard

1. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**:
   - Framework Preset: Other
   - Root Directory: Leave empty
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/build`

3. **Environment Variables**:
   - Add `DATABASE_URL` with your PostgreSQL connection string
   - Add `FLASK_ENV` with value `production`

4. **Deploy**: Click "Deploy"

## Step 3: Database Migration

After deployment, you may need to run database migrations. You can do this by:

1. **Accessing your database directly** and running the SQL commands from your seed files
2. **Using a database management tool** like pgAdmin or DBeaver
3. **Creating a one-time migration endpoint** in your Flask app

## Step 4: Testing

1. Visit your Vercel deployment URL
2. Test the following:
   - ✅ Dashboard loads
   - ✅ Sidebar navigation works
   - ✅ Location dropdowns populate
   - ✅ Properties display correctly
   - ✅ Property filtering works
   - ✅ Property modal opens

## Troubleshooting

### Common Issues:

1. **Database Connection Error**:
   - Verify DATABASE_URL is correct
   - Ensure database allows external connections
   - Check if database tables exist

2. **Build Errors**:
   - Check Vercel build logs
   - Ensure all dependencies are in package.json
   - Verify Python requirements.txt

3. **API Routes Not Working**:
   - Check that API calls use `/api/` prefix in production
   - Verify vercel.json routing configuration

4. **Environment Variables**:
   - Redeploy after adding environment variables
   - Use `vercel env pull` to verify variables locally

## Configuration Files Created:

- `vercel.json` - Vercel deployment configuration
- `frontend/.env.production` - Production environment variables
- `frontend/src/config/api.js` - API endpoint configuration
- `requirements.txt` - Python dependencies for Vercel
- `.gitignore` - Git ignore patterns

## Post-Deployment:

1. **Custom Domain**: Add your custom domain in Vercel dashboard
2. **SSL Certificate**: Automatically provided by Vercel
3. **Analytics**: Enable Vercel Analytics if desired
4. **Monitoring**: Set up error tracking (Sentry recommended)

## Support:

- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Flask on Vercel: [vercel.com/guides/using-flask-with-vercel](https://vercel.com/guides/using-flask-with-vercel)
