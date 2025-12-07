"""
Digital Estate Area API Endpoints
Flask API routes for areas, area data, and area images
"""

from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy.orm import joinedload
from sqlalchemy import func, desc
from area_models import Base, Country, Province, City, Area, AreaImage, AreaStatistics, AreaAmenity, MarketTrend
import os

# Initialize Flask app and database
app = Flask(__name__)

# Enable CORS for frontend integration
CORS(app)

# Use SQLite for development (same as setup_database.py)
database_path = os.path.join(os.path.dirname(__file__), 'digital_estate.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{database_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
db.Model = Base

# API Routes for Areas Management

@app.route('/api/countries', methods=['GET'])
def get_countries():
    """Get all countries"""
    try:
        countries = db.session.query(Country).all()
        return jsonify({
            'success': True,
            'countries': [country.to_dict() for country in countries]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/provinces/<int:country_id>', methods=['GET'])
def get_provinces(country_id):
    """Get provinces by country"""
    try:
        provinces = db.session.query(Province).filter_by(country_id=country_id).all()
        return jsonify({
            'success': True,
            'provinces': [province.to_dict() for province in provinces]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/cities/<int:province_id>', methods=['GET'])
def get_cities(province_id):
    """Get cities by province"""
    try:
        cities = db.session.query(City).filter_by(province_id=province_id).all()
        return jsonify({
            'success': True,
            'cities': [city.to_dict() for city in cities]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/areas/<int:city_id>', methods=['GET'])
def get_areas(city_id):
    """Get areas by city"""
    try:
        areas = db.session.query(Area).options(
            joinedload(Area.city).joinedload(City.province).joinedload(Province.country),
            joinedload(Area.images),
            joinedload(Area.statistics)
        ).filter_by(city_id=city_id).all()
        
        return jsonify({
            'success': True,
            'areas': [area.to_dict() for area in areas]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<int:area_id>', methods=['GET'])
def get_area_details(area_id):
    """Get detailed area information including images, statistics, and amenities"""
    try:
        area = db.session.query(Area).options(
            joinedload(Area.city).joinedload(City.province).joinedload(Province.country),
            joinedload(Area.images),
            joinedload(Area.statistics),
            joinedload(Area.amenities),
            joinedload(Area.market_trends)
        ).filter_by(id=area_id).first()
        
        if not area:
            return jsonify({'success': False, 'error': 'Area not found'}), 404
        
        # Get latest statistics
        latest_stats = max(area.statistics, key=lambda x: x.created_at) if area.statistics else None
        
        # Get market trends for the last 12 months
        recent_trends = db.session.query(MarketTrend).filter(
            MarketTrend.area_id == area_id,
            MarketTrend.metric_date >= func.current_date() - func.interval('12 months')
        ).order_by(MarketTrend.metric_date.desc()).all()
        
        # Group trends by metric type
        trends_by_type = {}
        for trend in recent_trends:
            if trend.metric_type not in trends_by_type:
                trends_by_type[trend.metric_type] = []
            trends_by_type[trend.metric_type].append(trend.to_dict())
        
        return jsonify({
            'success': True,
            'area': {
                **area.to_dict(),
                'full_location': f"{area.name}, {area.city.name}, {area.city.province.name}, {area.city.province.country.name}",
                'images': [image.to_dict() for image in sorted(area.images, key=lambda x: (not x.is_primary, x.image_order))],
                'latest_statistics': latest_stats.to_dict() if latest_stats else None,
                'amenities': [amenity.to_dict() for amenity in area.amenities],
                'market_trends': trends_by_type
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<int:area_id>/images', methods=['GET'])
def get_area_images(area_id):
    """Get all images for a specific area"""
    try:
        images = db.session.query(AreaImage).filter_by(area_id=area_id).order_by(
            desc(AreaImage.is_primary), AreaImage.image_order
        ).all()
        
        return jsonify({
            'success': True,
            'images': [image.to_dict() for image in images]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<int:area_id>/statistics', methods=['GET'])
def get_area_statistics(area_id):
    """Get statistics for a specific area"""
    try:
        # Get the latest statistics
        latest_stats = db.session.query(AreaStatistics).filter_by(area_id=area_id).order_by(
            desc(AreaStatistics.created_at)
        ).first()
        
        if not latest_stats:
            return jsonify({'success': False, 'error': 'No statistics found for this area'}), 404
        
        return jsonify({
            'success': True,
            'statistics': latest_stats.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<int:area_id>/amenities', methods=['GET'])
def get_area_amenities(area_id):
    """Get amenities for a specific area"""
    try:
        amenities = db.session.query(AreaAmenity).filter_by(area_id=area_id).order_by(
            AreaAmenity.amenity_type, AreaAmenity.distance_km
        ).all()
        
        # Group amenities by type
        amenities_by_type = {}
        for amenity in amenities:
            if amenity.amenity_type not in amenities_by_type:
                amenities_by_type[amenity.amenity_type] = []
            amenities_by_type[amenity.amenity_type].append(amenity.to_dict())
        
        return jsonify({
            'success': True,
            'amenities': amenities_by_type
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<int:area_id>/trends', methods=['GET'])
def get_area_trends(area_id):
    """Get market trends for a specific area"""
    try:
        metric_type = request.args.get('metric_type', 'average_price')
        months = int(request.args.get('months', 12))
        
        trends = db.session.query(MarketTrend).filter(
            MarketTrend.area_id == area_id,
            MarketTrend.metric_type == metric_type,
            MarketTrend.metric_date >= func.current_date() - func.text(f"INTERVAL '{months} months'")
        ).order_by(MarketTrend.metric_date).all()
        
        return jsonify({
            'success': True,
            'trends': [trend.to_dict() for trend in trends],
            'metric_type': metric_type,
            'months': months
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# POST endpoints for adding new data

@app.route('/api/area', methods=['POST'])
def create_area():
    """Create a new area"""
    try:
        data = request.json
        
        new_area = Area(
            name=data['name'],
            city_id=data['city_id'],
            description=data.get('description'),
            area_type=data.get('area_type', 'residential'),
            postal_code=data.get('postal_code')
        )
        
        db.session.add(new_area)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Area created successfully',
            'area_id': new_area.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<int:area_id>/image', methods=['POST'])
def add_area_image():
    """Add an image to an area"""
    try:
        data = request.json
        area_id = int(request.view_args['area_id'])
        
        new_image = AreaImage(
            area_id=area_id,
            image_url=data['image_url'],
            image_title=data.get('image_title'),
            image_description=data.get('image_description'),
            is_primary=data.get('is_primary', False),
            image_order=data.get('image_order', 0),
            uploaded_by=data.get('uploaded_by')
        )
        
        # If this is set as primary, remove primary status from other images
        if new_image.is_primary:
            db.session.query(AreaImage).filter_by(area_id=area_id).update({'is_primary': False})
        
        db.session.add(new_image)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Image added successfully',
            'image_id': new_image.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/area/<int:area_id>/statistics', methods=['POST'])
def add_area_statistics():
    """Add statistics to an area"""
    try:
        data = request.json
        area_id = int(request.view_args['area_id'])
        
        new_stats = AreaStatistics(
            area_id=area_id,
            average_property_price=data.get('average_property_price'),
            median_property_price=data.get('median_property_price'),
            price_per_sqm=data.get('price_per_sqm'),
            price_growth_yoy=data.get('price_growth_yoy'),
            average_rental_price=data.get('average_rental_price'),
            rental_yield=data.get('rental_yield'),
            rental_growth_yoy=data.get('rental_growth_yoy'),
            vacancy_rate=data.get('vacancy_rate'),
            days_on_market=data.get('days_on_market'),
            total_properties_sold=data.get('total_properties_sold'),
            total_rental_properties=data.get('total_rental_properties'),
            crime_index_score=data.get('crime_index_score'),
            education_score=data.get('education_score'),
            transport_score=data.get('transport_score'),
            amenities_score=data.get('amenities_score'),
            data_period_start=data.get('data_period_start'),
            data_period_end=data.get('data_period_end')
        )
        
        db.session.add(new_stats)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Statistics added successfully',
            'statistics_id': new_stats.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Create tables
    with app.app_context():
        db.create_all()
    
    app.run(debug=True, host='0.0.0.0', port=5000)