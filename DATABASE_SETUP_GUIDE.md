# Digital Estate Database Setup Instructions

## Step-by-Step Database Implementation

### 1. Database Setup (PostgreSQL)

#### Option A: Local PostgreSQL Installation
```bash
# Install PostgreSQL (Windows)
# Download from https://www.postgresql.org/download/windows/

# Create database
psql -U postgres
CREATE DATABASE digital_estate;
CREATE USER digital_estate_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE digital_estate TO digital_estate_user;
\q
```

#### Option B: Cloud Database (Recommended)
- **Render PostgreSQL**: Free tier available
- **Supabase**: Free tier with 500MB
- **ElephantSQL**: Free tier with 20MB
- **AWS RDS**: Pay-as-you-go

### 2. Environment Variables Setup

Create `.env` file in your backend folder:
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# For local development
DATABASE_URL=postgresql://digital_estate_user:your_secure_password@localhost:5432/digital_estate

# For Render PostgreSQL (example)
DATABASE_URL=postgresql://user:password@hostname.render.com:5432/database_name

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your_secret_key_here
```

### 3. Install Python Dependencies

Add to your `requirements.txt`:
```
Flask==2.3.3
Flask-SQLAlchemy==3.0.5
psycopg2-binary==2.9.7
flask-cors==4.0.0
python-dotenv==1.0.0
pillow==10.0.0
```

Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### 4. Database Initialization

Run the database schema setup:
```bash
# Connect to your database and run the schema
psql -d digital_estate -f database_schema.sql

# Insert sample data
psql -d digital_estate -f sample_data.sql
```

Or programmatically with Python:
```python
from sqlalchemy import create_engine
from area_models import Base
import os

# Create engine
engine = create_engine(os.getenv('DATABASE_URL'))

# Create all tables
Base.metadata.create_all(engine)
print("Database tables created successfully!")
```

### 5. Update Your Main Flask App

Modify your existing `main.py` or create a new one:

```python
from flask import Flask
from flask_cors import CORS
from area_api import app as area_app
import os

# Create main Flask app
app = Flask(__name__)
CORS(app)

# Register area blueprint
app.register_blueprint(area_app, url_prefix='/api')

# Your existing routes...

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### 6. Frontend Integration

Update your existing ExplorePage.jsx to use real data:

```javascript
import areaDataService from '../services/areaDataService';

// In your ExplorePage component
useEffect(() => {
  const loadAreaData = async () => {
    if (selected.area) {
      setLoading(true);
      try {
        // Get area details including images and statistics
        const areaData = await areaDataService.getAreaDetails(selected.area);
        if (areaData) {
          setAreaData(areaData);
          // Update your UI with real data instead of hardcoded values
        }
      } catch (error) {
        console.error('Error loading area data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  loadAreaData();
}, [selected.area]);
```

### 7. Image Storage Options

#### Option A: Cloud Storage (Recommended)
- **Cloudinary**: Free tier with 25GB
- **AWS S3**: Pay-as-you-use
- **Google Cloud Storage**: Free tier available

#### Option B: Local Storage
Store images in `backend/static/images/areas/` and serve them via Flask

### 8. Data Management Dashboard (Optional)

Create an admin interface for managing area data:

```bash
# Install Flask-Admin
pip install Flask-Admin

# Add to your Flask app
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView

admin = Admin(app, name='Digital Estate Admin')
admin.add_view(ModelView(Area, db.session))
admin.add_view(ModelView(AreaImage, db.session))
admin.add_view(ModelView(AreaStatistics, db.session))
```

### 9. Testing Your Setup

Create a test script:

```python
# test_database.py
from area_models import *
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Test database connection
engine = create_engine(os.getenv('DATABASE_URL'))
Session = sessionmaker(bind=engine)
session = Session()

# Test queries
countries = session.query(Country).all()
print(f"Found {len(countries)} countries")

areas_with_images = session.query(Area).join(AreaImage).all()
print(f"Found {len(areas_with_images)} areas with images")

session.close()
```

### 10. Production Deployment

For production deployment:

1. **Environment Variables**: Set secure production values
2. **Database**: Use managed database service
3. **Images**: Use cloud storage with CDN
4. **Monitoring**: Set up logging and monitoring
5. **Backup**: Configure automated database backups

## Quick Start Commands

```bash
# 1. Setup database
createdb digital_estate
psql digital_estate < database_schema.sql
psql digital_estate < sample_data.sql

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost/digital_estate"

# 4. Run the application
python area_api.py

# 5. Test the API
curl http://localhost:5000/api/countries
curl http://localhost:5000/api/area/1
```

## API Endpoints Reference

- `GET /api/countries` - List all countries
- `GET /api/provinces/{country_id}` - Get provinces by country
- `GET /api/cities/{province_id}` - Get cities by province
- `GET /api/areas/{city_id}` - Get areas by city
- `GET /api/area/{area_id}` - Get area details with images and stats
- `GET /api/area/{area_id}/images` - Get area images
- `GET /api/area/{area_id}/statistics` - Get area statistics
- `GET /api/area/{area_id}/amenities` - Get area amenities
- `GET /api/area/{area_id}/trends` - Get market trends
- `POST /api/area` - Create new area
- `POST /api/area/{area_id}/image` - Add area image
- `POST /api/area/{area_id}/statistics` - Add area statistics

This comprehensive database setup will give you a professional foundation for managing all your area data, images, and statistics!