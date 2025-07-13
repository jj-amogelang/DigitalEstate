from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from models import db, Country, Province, City, Area, Property
import os

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
CORS(app)

@app.route('/locations/countries', methods=['GET'])
def get_countries():
    try:
        countries = Country.query.all()
        return jsonify([{'id': c.id, 'name': c.name} for c in countries])
    except Exception as e:
        # If location tables don't exist, return South Africa as default
        return jsonify([{'id': 1, 'name': 'South Africa'}])

@app.route('/locations/provinces/<string:country_id>', methods=['GET'])
def get_provinces(country_id):
    try:
        provinces = Province.query.filter_by(country_id=country_id).all()
        return jsonify([{'id': p.id, 'name': p.name} for p in provinces])
    except Exception as e:
        # Default provinces if table doesn't exist
        return jsonify([
            {'id': '1', 'name': 'Gauteng'},
            {'id': '2', 'name': 'Western Cape'},
            {'id': '3', 'name': 'KwaZulu-Natal'}
        ])

@app.route('/locations/cities/<string:province_id>', methods=['GET'])
def get_cities(province_id):
    try:
        cities = City.query.filter_by(province_id=province_id).all()
        return jsonify([{'id': c.id, 'name': c.name} for c in cities])
    except Exception as e:
        # Default cities
        return jsonify([
            {'id': '1', 'name': 'Johannesburg'},
            {'id': '2', 'name': 'Cape Town'},
            {'id': '3', 'name': 'Durban'}
        ])

@app.route('/locations/areas/<string:city_id>', methods=['GET'])
def get_areas(city_id):
    try:
        areas = Area.query.filter_by(city_id=city_id).all()
        return jsonify([{'id': a.id, 'name': a.name} for a in areas])
    except Exception as e:
        # Default areas
        return jsonify([
            {'id': '1', 'name': 'All Areas'}
        ])

# Updated route to get all properties from your PostgreSQL table
@app.route('/properties/all', methods=['GET'])
def get_all_properties():
    try:
        property_type = request.args.get('type', None)
        
        query = Property.query
        
        # Filter by property type if specified (using 'type' field from your table)
        if property_type and property_type != 'all':
            # Map frontend filter values to your database values
            type_mapping = {
                'residential': 'Residential',
                'commercial': 'Commercial', 
                'industrial': 'Industrial',
                'retail': 'Retail'
            }
            db_type = type_mapping.get(property_type.lower(), property_type)
            query = query.filter(Property.type == db_type)
        
        props = query.all()
        
        # Use the to_dict method for consistent output
        return jsonify([prop.to_dict() for prop in props])
        
    except Exception as e:
        print(f"Error fetching properties: {e}")
        return jsonify({'error': str(e)}), 500

# Keep the original route for compatibility, but make it work with PostgreSQL
@app.route('/properties/<string:area_identifier>', methods=['GET'])
def get_properties_by_area(area_identifier):
    try:
        property_type = request.args.get('type', None)
        
        query = Property.query
        
        # Filter by area_id if it's not 'all' or '1'
        if area_identifier not in ['all', '1']:
            # First, try to match directly by area_id (if it's a UUID)
            query = query.filter(Property.area_id == area_identifier)
        
        # Filter by property type if specified
        if property_type and property_type != 'all':
            query = query.filter(Property.type.ilike(f'%{property_type}%'))
        
        props = query.all()
        
        return jsonify([prop.to_dict() for prop in props])
        
    except Exception as e:
        print(f"Error fetching properties by area: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/property-types', methods=['GET'])
def get_property_types():
    return jsonify([
        {'value': 'all', 'label': 'All Properties', 'icon': '🏢'},
        {'value': 'residential', 'label': 'Residential', 'icon': '🏠'},
        {'value': 'commercial', 'label': 'Commercial', 'icon': '🏢'},
        {'value': 'industrial', 'label': 'Industrial', 'icon': '🏭'},
        {'value': 'retail', 'label': 'Retail', 'icon': '🛍️'}
    ])

@app.route('/property/<int:property_id>', methods=['GET'])
def get_property_detail(property_id):
    try:
        p = Property.query.get_or_404(property_id)
        return jsonify(p.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 404

# Test route to check database connection
@app.route('/test-db', methods=['GET'])
def test_database():
    try:
        # Try to query the properties table
        count = Property.query.count()
        sample = Property.query.first()
        
        result = {
            'status': 'success',
            'total_properties': count,
            'sample_property': sample.to_dict() if sample else None,
            'database_connected': True
        }
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'database_connected': False
        }), 500

if __name__ == '__main__':
    with app.app_context():
        try:
            # Test database connection using SQLAlchemy 2.0 syntax
            from sqlalchemy import text
            with db.engine.connect() as connection:
                connection.execute(text('SELECT 1'))
            print("✅ Database connection successful!")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            print("💡 Please check your DATABASE_URL in .env file")
    
    # For local development
    app.run(debug=os.getenv('FLASK_ENV') != 'production')

# Vercel serverless function handler
def handler(event, context):
    return app
