"""
Simple Area API Test
Quick test API to verify our database and endpoints work
"""

from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from area_models import Base, Country, Province, City, Area, AreaImage, AreaStatistics

app = Flask(__name__)
CORS(app)

# Use SQLite database
DATABASE_URL = 'sqlite:///digital_estate.db'
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

@app.route('/')
def home():
    return jsonify({
        'message': 'Digital Estate Area API',
        'status': 'running',
        'database': 'SQLite'
    })

@app.route('/test-db')
def test_db():
    """Test database connection"""
    try:
        session = SessionLocal()
        
        # Test basic counts
        countries = session.query(Country).count()
        provinces = session.query(Province).count()
        cities = session.query(City).count()
        areas = session.query(Area).count()
        images = session.query(AreaImage).count()
        stats = session.query(AreaStatistics).count()
        
        session.close()
        
        return jsonify({
            'success': True,
            'message': 'Database connection successful',
            'data': {
                'countries': countries,
                'provinces': provinces,
                'cities': cities,
                'areas': areas,
                'images': images,
                'statistics': stats
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/countries')
def get_countries():
    """Get all countries"""
    try:
        session = SessionLocal()
        countries = session.query(Country).all()
        session.close()
        
        return jsonify({
            'success': True,
            'countries': [country.to_dict() for country in countries]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/areas')
def get_all_areas():
    """Get all areas with their details"""
    try:
        session = SessionLocal()
        areas = session.query(Area).all()
        areas_data = []
        
        for area in areas:
            area_dict = area.to_dict()
            # Get primary image
            primary_image = session.query(AreaImage).filter_by(
                area_id=area.id, 
                is_primary=True
            ).first()
            
            if primary_image:
                area_dict['primary_image_url'] = primary_image.image_url
            
            # Get latest statistics
            latest_stats = session.query(AreaStatistics).filter_by(
                area_id=area.id
            ).order_by(AreaStatistics.created_at.desc()).first()
            
            if latest_stats:
                area_dict['statistics'] = latest_stats.to_dict()
            
            areas_data.append(area_dict)
        
        session.close()
        
        return jsonify({
            'success': True,
            'areas': areas_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<int:area_id>')
def get_area_detail(area_id):
    """Get detailed area information"""
    try:
        session = SessionLocal()
        
        # Get area with related data
        area = session.query(Area).filter_by(id=area_id).first()
        if not area:
            return jsonify({'success': False, 'error': 'Area not found'}), 404
        
        # Get area data
        area_data = area.to_dict()
        
        # Get images
        images = session.query(AreaImage).filter_by(area_id=area_id).all()
        area_data['images'] = [img.to_dict() for img in images]
        
        # Get statistics
        stats = session.query(AreaStatistics).filter_by(area_id=area_id).first()
        if stats:
            area_data['statistics'] = stats.to_dict()
        
        session.close()
        
        return jsonify({
            'success': True,
            'area': area_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Digital Estate Area API...")
    print(f"📊 Database: {DATABASE_URL}")
    print("🌐 Server running on http://localhost:5000")
    print("🔗 Test endpoints:")
    print("   - GET / (API info)")
    print("   - GET /test-db (database test)")
    print("   - GET /api/countries (all countries)")
    print("   - GET /api/areas (all areas)")
    print("   - GET /api/area/<id> (area details)")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
