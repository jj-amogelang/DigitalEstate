# Troubleshooting Guide for Property Data

## Step 1: Test Backend API Endpoints

1. Open your backend URL in a new browser tab:
   https://[your-backend-name].onrender.com

2. Test the health check endpoint:
   https://[your-backend-name].onrender.com/

3. Test the properties API:
   https://[your-backend-name].onrender.com/api/properties

4. Check browser developer console for errors:
   - Press F12 in your browser
   - Go to Console tab
   - Look for any red error messages

## Expected Responses:

### Health Check (/) should return:
```json
{
  "status": "healthy",
  "message": "Digital Estate Backend API is running",
  "version": "2.0.0",
  "database": "PostgreSQL digitalestate2",
  "endpoints": [...]
}
```

### Properties API (/api/properties) should return:
```json
[
  {
    "id": 1,
    "title": "Modern Apartment in Sandton",
    "description": "Luxurious 3-bedroom apartment with city views",
    "property_type": "Apartment",
    "price": 2500000.00,
    ...
  }
]
```

## What to check if these don't work:
- Database connection string is correct
- Environment variables are properly set
- Build completed successfully
- No errors in Render logs
