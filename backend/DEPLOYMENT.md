# Digital Estate Backend Deployment Guide

## Prerequisites
1. Install Vercel CLI: `npm install -g vercel`
2. Login to Vercel: `vercel login`

## Deployment Steps

### First Time Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - **Set up and deploy "backend"?** → Yes
   - **Which scope?** → Choose your account/team
   - **Link to existing project?** → No (for first deployment)
   - **What's your project's name?** → digital-estate-backend
   - **In which directory is your code located?** → ./ (current directory)

### Environment Variables
After deployment, add these environment variables in Vercel dashboard:
1. Go to your project dashboard on vercel.com
2. Navigate to Settings → Environment Variables
3. Add:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `FLASK_ENV`: production

### Subsequent Deployments
For future deployments, simply run:
```bash
vercel --prod
```

## API Endpoints
Once deployed, your backend will be available at:
- Countries: `https://your-backend-url.vercel.app/locations/countries`
- Properties: `https://your-backend-url.vercel.app/properties`
- Health check: `https://your-backend-url.vercel.app/`

## Local Development
To run locally:
```bash
python app.py
```
Or:
```bash
python wsgi.py
```

## Troubleshooting
- Check logs: `vercel logs`
- Redeploy: `vercel --prod`
- Check function logs in Vercel dashboard
