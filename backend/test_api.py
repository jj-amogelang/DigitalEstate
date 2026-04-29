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

_INVESTOR_PROFILES = [
    {
        'key': 'balanced',
        'label': 'Balanced',
        'icon': '⚖️',
        'risk': 'Low',
        'description': 'An even spread across all five investment factors — yield, price, '
                       'vacancy, transit and footfall. A sensible starting point for first-time '
                       'investors or diversified portfolios seeking stable, moderate returns.',
        'weights': {'rentalYield': 25, 'pricePerSqm': 25, 'vacancy': 20, 'transitProximity': 15, 'footfall': 15},
    },
    {
        'key': 'valueInvestor',
        'label': 'Value Investor',
        'icon': '💎',
        'risk': 'Medium',
        'description': 'Maximise rental yield while minimising entry price per m². Transit and '
                       'footfall carry minimal weight, making this profile best suited to '
                       'residential buy-to-let in emerging or under-valued suburbs.',
        'weights': {'rentalYield': 40, 'pricePerSqm': 35, 'vacancy': 15, 'transitProximity': 5, 'footfall': 5},
    },
    {
        'key': 'transitFocused',
        'label': 'Transit-Smart',
        'icon': '🚇',
        'risk': 'Low',
        'description': 'Prioritises strong public-transport proximity above all other factors. '
                       'Ideal for urban mixed-use or residential assets where connectivity '
                       'directly drives tenant demand and long-term capital growth.',
        'weights': {'rentalYield': 20, 'pricePerSqm': 15, 'vacancy': 15, 'transitProximity': 40, 'footfall': 10},
    },
    {
        'key': 'highFootfall',
        'label': 'Footfall-Driven',
        'icon': '🚶',
        'risk': 'Medium',
        'description': 'Optimises for maximum pedestrian and consumer activity. Best applied to '
                       'retail, street-facing commercial or mixed-use nodes where passing trade '
                       'is the primary income driver.',
        'weights': {'rentalYield': 15, 'pricePerSqm': 15, 'vacancy': 10, 'transitProximity': 20, 'footfall': 40},
    },
    {
        'key': 'highYieldHunter',
        'label': 'High-Yield Hunter',
        'icon': '🎯',
        'risk': 'High',
        'description': 'Aggressively targets the highest rental yield with minimal regard for '
                       'transit or footfall proximity. Suits experienced investors comfortable '
                       'with higher vacancy risk in exchange for above-market income returns.',
        'weights': {'rentalYield': 55, 'pricePerSqm': 20, 'vacancy': 15, 'transitProximity': 5, 'footfall': 5},
    },
    {
        'key': 'airbnbShortStay',
        'label': 'AirBnB / Short-Stay',
        'icon': '🏡',
        'risk': 'High',
        'description': 'Tuned for short-term rental operations: balances yield, low vacancy and '
                       'strong footfall/transit scores. Performs best near tourism corridors, '
                       'CBDs or event centres where nightly rates substantially exceed long-term rents.',
        'weights': {'rentalYield': 25, 'pricePerSqm': 10, 'vacancy': 25, 'transitProximity': 20, 'footfall': 20},
    },
    {
        'key': 'developmentOpportunity',
        'label': 'Developer',
        'icon': '🏗️',
        'risk': 'High',
        'description': 'Targets low-cost parcels with strong footfall potential for value-add '
                       'or ground-up redevelopment. Vacancy tolerance is high; transit and '
                       'amenity exposure are secondary to price and pedestrian demand.',
        'weights': {'rentalYield': 15, 'pricePerSqm': 20, 'vacancy': 20, 'transitProximity': 15, 'footfall': 30},
    },
]

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


@app.route('/api/profiles')
def get_investor_profiles():
    return jsonify({'success': True, 'profiles': _INVESTOR_PROFILES})

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
