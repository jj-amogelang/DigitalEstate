from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from models import db, Property, Owner, Valuation, Zoning, MarketTrend, LegacyProperty, Country, Province, City, Area
from sqlalchemy import func, desc, and_, or_
from datetime import datetime, date
import os

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
CORS(app, origins=['*'], allow_headers=['Content-Type', 'Authorization'], methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint that doesn't require database"""
    return jsonify({
        'status': 'healthy',
        'message': 'Digital Estate Backend API is running',
        'version': '2.0.0',
        'database': 'PostgreSQL digitalestate2',
        'endpoints': [
            '/api/properties',
            '/api/properties/<id>',
            '/api/owners',
            '/api/valuations',
            '/api/zoning',
            '/api/market-trends',
            '/api/search/properties',
            '/api/dashboard/stats',
            '/api/dashboard/charts'
        ]
    })

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'message': 'OK'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response

# ============ PROPERTY ENDPOINTS ============

@app.route('/api/properties', methods=['GET'])
def get_properties():
    """Get all properties with filtering and pagination - adapted for current table structure"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        property_type = request.args.get('type')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        
        # Start with base query
        query = Property.query
        
        # Apply filters that exist in our current table
        if property_type and property_type != 'all':
            # Map common types to what might be in our database
            type_mapping = {
                'residential': 'Residential',
                'commercial': 'Commercial',
                'industrial': 'Industrial', 
                'retail': 'Retail'
            }
            db_type = type_mapping.get(property_type.lower(), property_type)
            query = query.filter(Property.type.ilike(f'%{db_type}%'))
        
        # Filter by price range using cost field
        if min_price:
            query = query.filter(Property.cost >= min_price)
        if max_price:
            query = query.filter(Property.cost <= max_price)
        
        # Order by id (since we don't have listing_date in current table)
        query = query.order_by(desc(Property.id))
        
        # Get total count for pagination
        total = query.count()
        
        # Apply pagination manually
        offset = (page - 1) * per_page
        properties = query.offset(offset).limit(per_page).all()
        
        # Calculate pagination info
        total_pages = (total + per_page - 1) // per_page
        has_next = page < total_pages
        has_prev = page > 1
        
        return jsonify({
            'properties': [prop.to_dict() for prop in properties],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': total_pages,
                'has_next': has_next,
                'has_prev': has_prev
            }
        })
        
    except Exception as e:
        print(f"Error fetching properties: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/properties/<int:property_id>', methods=['GET'])
def get_property_detail(property_id):
    """Get detailed property information"""
    try:
        prop = Property.query.get_or_404(property_id)
        
        # Get property details with related data
        property_data = prop.to_dict()
        
        # Add zoning information
        zoning = Zoning.query.filter_by(property_id=property_id).first()
        if zoning:
            property_data['zoning'] = zoning.to_dict()
        
        # Add all valuations for this property
        valuations = Valuation.query.filter_by(property_id=property_id).order_by(desc(Valuation.valuation_date)).all()
        property_data['valuations'] = [val.to_dict() for val in valuations]
        
        return jsonify(property_data)
        
    except Exception as e:
        print(f"Error fetching property {property_id}: {e}")
        return jsonify({'error': str(e)}), 404

@app.route('/api/search/properties', methods=['GET'])
def search_properties():
    """Search properties by text query - adapted for current table structure"""
    try:
        query_text = request.args.get('q', '').strip()
        if not query_text:
            return jsonify({'properties': []})
        
        # Search in available fields from current table structure
        search = f'%{query_text}%'
        properties = Property.query.filter(
            or_(
                Property.name.ilike(search),
                Property.type.ilike(search),
                Property.developer.ilike(search)
            )
        ).limit(20).all()
        
        return jsonify({
            'properties': [prop.to_dict() for prop in properties],
            'count': len(properties)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ OWNER ENDPOINTS ============

@app.route('/api/owners', methods=['GET'])
def get_owners():
    """Get all property owners"""
    try:
        owners = Owner.query.all()
        return jsonify([owner.to_dict() for owner in owners])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/owners/<int:owner_id>', methods=['GET'])
def get_owner_detail(owner_id):
    """Get owner details with their properties"""
    try:
        owner = Owner.query.get_or_404(owner_id)
        owner_data = owner.to_dict()
        
        # Add owner's properties
        properties = Property.query.filter_by(owner_id=owner_id).all()
        owner_data['properties'] = [prop.to_dict() for prop in properties]
        
        return jsonify(owner_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

# ============ MARKET TRENDS ENDPOINTS ============

@app.route('/api/market-trends', methods=['GET'])
def get_market_trends():
    """Get market trends data"""
    try:
        area = request.args.get('area')
        property_type = request.args.get('type')
        
        query = MarketTrend.query
        
        if area:
            query = query.filter(MarketTrend.area.ilike(f'%{area}%'))
        if property_type:
            query = query.filter(MarketTrend.property_type == property_type)
        
        trends = query.order_by(desc(MarketTrend.last_updated)).all()
        return jsonify([trend.to_dict() for trend in trends])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ DASHBOARD ENDPOINTS ============

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Get basic counts
        total_properties = Property.query.count()
        total_owners = Owner.query.count()
        
        # Available vs sold properties
        available_properties = Property.query.filter_by(status='available').count()
        sold_properties = Property.query.filter_by(status='sold').count()
        
        # Property types breakdown
        property_types = db.session.query(
            Property.property_type,
            func.count(Property.id).label('count')
        ).group_by(Property.property_type).all()
        
        # Recent valuations
        recent_valuations = db.session.query(func.avg(Valuation.market_value)).scalar() or 0
        
        # Cities with most properties
        cities = db.session.query(
            Property.city,
            func.count(Property.id).label('count')
        ).group_by(Property.city).order_by(desc('count')).limit(5).all()
        
        return jsonify({
            'total_properties': total_properties,
            'total_owners': total_owners,
            'available_properties': available_properties,
            'sold_properties': sold_properties,
            'average_value': float(recent_valuations),
            'property_types': [{'type': pt[0], 'count': pt[1]} for pt in property_types],
            'top_cities': [{'city': city[0], 'count': city[1]} for city in cities]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/charts', methods=['GET'])
def get_chart_data():
    """Get data for dashboard charts"""
    try:
        # Price trends over time
        price_trends = db.session.query(
            func.date_trunc('month', Valuation.valuation_date).label('month'),
            func.avg(Valuation.market_value).label('avg_price')
        ).group_by('month').order_by('month').limit(12).all()
        
        # Property distribution by type
        type_distribution = db.session.query(
            Property.property_type,
            func.count(Property.id).label('count')
        ).group_by(Property.property_type).all()
        
        # Geographic distribution
        geographic_data = db.session.query(
            Property.province,
            func.count(Property.id).label('count'),
            func.avg(Valuation.market_value).label('avg_value')
        ).join(Valuation).group_by(Property.province).all()
        
        return jsonify({
            'price_trends': [
                {
                    'month': trend[0].isoformat() if trend[0] else None,
                    'avg_price': float(trend[1]) if trend[1] else 0
                } for trend in price_trends
            ],
            'type_distribution': [
                {'type': item[0], 'count': item[1]}
                for item in type_distribution
            ],
            'geographic_data': [
                {
                    'province': item[0],
                    'count': item[1],
                    'avg_value': float(item[2]) if item[2] else 0
                } for item in geographic_data
            ]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ LEGACY COMPATIBILITY ENDPOINTS ============

# Keep the old endpoints for backward compatibility
@app.route('/properties/all', methods=['GET'])
def get_all_properties_legacy():
    """Legacy endpoint - redirect to new API"""
    try:
        property_type = request.args.get('type', None)
        
        query = Property.query
        
        if property_type and property_type != 'all':
            query = query.filter(Property.property_type == property_type)
        
        props = query.limit(50).all()  # Limit for performance
        return jsonify([prop.to_dict() for prop in props])
        
    except Exception as e:
        print(f"Error fetching legacy properties: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/property-types', methods=['GET'])
def get_property_types():
    """Get available property types"""
    return jsonify([
        {'value': 'all', 'label': 'All Properties', 'icon': '🏢'},
        {'value': 'residential', 'label': 'Residential', 'icon': '🏠'},
        {'value': 'commercial', 'label': 'Commercial', 'icon': '🏢'},
        {'value': 'industrial', 'label': 'Industrial', 'icon': '🏭'},
        {'value': 'retail', 'label': 'Retail', 'icon': '🛍️'},
        {'value': 'office', 'label': 'Office', 'icon': '🏢'},
        {'value': 'warehouse', 'label': 'Warehouse', 'icon': '🏭'}
    ])

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

# ============ LOCATION HIERARCHY ENDPOINTS ============

@app.route('/locations/countries', methods=['GET'])
def get_countries():
    """Get all countries for dropdown"""
    try:
        countries = Country.query.all()
        return jsonify([{
            'id': country.id,
            'name': country.name
        } for country in countries])
    except Exception as e:
        print(f"❌ Error fetching countries: {e}")
        return jsonify({'error': 'Failed to fetch countries'}), 500

@app.route('/locations/provinces/<country_id>', methods=['GET'])
def get_provinces(country_id):
    """Get provinces for a specific country"""
    try:
        provinces = Province.query.filter_by(country_id=country_id).all()
        return jsonify([{
            'id': province.id,
            'name': province.name,
            'country_id': province.country_id
        } for province in provinces])
    except Exception as e:
        print(f"❌ Error fetching provinces: {e}")
        return jsonify({'error': 'Failed to fetch provinces'}), 500

@app.route('/locations/cities/<province_id>', methods=['GET'])
def get_cities(province_id):
    """Get cities for a specific province"""
    try:
        cities = City.query.filter_by(province_id=province_id).all()
        return jsonify([{
            'id': city.id,
            'name': city.name,
            'province_id': city.province_id
        } for city in cities])
    except Exception as e:
        print(f"❌ Error fetching cities: {e}")
        return jsonify({'error': 'Failed to fetch cities'}), 500

@app.route('/locations/areas/<city_id>', methods=['GET'])
def get_areas(city_id):
    """Get areas for a specific city"""
    try:
        areas = Area.query.filter_by(city_id=city_id).all()
        return jsonify([{
            'id': area.id,
            'name': area.name,
            'city_id': area.city_id
        } for area in areas])
    except Exception as e:
        print(f"❌ Error fetching areas: {e}")
        return jsonify({'error': 'Failed to fetch areas'}), 500

@app.route('/properties/<area_id>', methods=['GET'])
def get_properties_by_area(area_id):
    """Get properties for a specific area (legacy endpoint compatibility)"""
    try:
        properties = Property.query.filter_by(area_id=area_id).all()
        
        # Enhanced property data with location info
        properties_data = []
        for property in properties:
            # Get location hierarchy
            area = Area.query.filter_by(id=property.area_id).first()
            city = City.query.filter_by(id=area.city_id).first() if area else None
            province = Province.query.filter_by(id=city.province_id).first() if city else None
            country = Country.query.filter_by(id=province.country_id).first() if province else None
            
            prop_data = {
                'id': property.id,
                'name': property.name or f'Property {property.id}',
                'image_url': property.image_url or 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
                'erf_size': property.erf_size or '',
                'cost': property.cost or 0,
                'developer': property.developer or 'Unknown Developer',
                'type': property.type or 'Residential',
                'area_id': property.area_id,
                'area': area.name if area else 'Unknown Area',
                'city': city.name if city else 'Unknown City',
                'province': province.name if province else 'Unknown Province',
                'country': country.name if country else 'Unknown Country',
                'location': f"{area.name if area else 'Unknown'}, {city.name if city else 'Unknown'}",
                'description': f"{property.type or 'Property'} developed by {property.developer or 'Unknown Developer'}",
                'bedrooms': '',  # Not in current schema
                'bathrooms': '',  # Not in current schema
                'price_range': 'Contact for Price' if not property.cost or property.cost == 0 else f'R{property.cost:,.0f}'
            }
            properties_data.append(prop_data)
        
        return jsonify(properties_data)
    except Exception as e:
        print(f"❌ Error fetching properties by area: {e}")
        return jsonify({'error': 'Failed to fetch properties'}), 500

if __name__ == '__main__':
    with app.app_context():
        try:
            # Create database tables
            db.create_all()
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

# Ensure database tables are created on import (for Vercel)
with app.app_context():
    try:
        db.create_all()
        # If using SQLite, initialize with sample data
        if 'sqlite' in app.config['SQLALCHEMY_DATABASE_URI']:
            # Import and run initialization without circular dependency
            if Property.query.first() is None:
                from init_sqlite import init_sample_data
                init_sample_data()
    except Exception as e:
        print(f"Database initialization error: {e}")

# Export app for Vercel
app = app
