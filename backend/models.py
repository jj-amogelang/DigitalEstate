from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Country(db.Model):
    __tablename__ = 'countries'
    id = db.Column(db.String(36), primary_key=True)  # UUID as string
    name = db.Column(db.String(50), nullable=False)
    provinces = db.relationship('Province', backref='country', lazy=True)

class Province(db.Model):
    __tablename__ = 'provinces'
    id = db.Column(db.String(36), primary_key=True)  # UUID as string
    name = db.Column(db.String(50), nullable=False)
    country_id = db.Column(db.String(36), db.ForeignKey('countries.id'), nullable=False)
    cities = db.relationship('City', backref='province', lazy=True)

class City(db.Model):
    __tablename__ = 'cities'
    id = db.Column(db.String(36), primary_key=True)  # UUID as string
    name = db.Column(db.String(50), nullable=False)
    province_id = db.Column(db.String(36), db.ForeignKey('provinces.id'), nullable=False)
    areas = db.relationship('Area', backref='city', lazy=True)

class Area(db.Model):
    __tablename__ = 'areas'
    id = db.Column(db.String(36), primary_key=True)  # UUID as string
    name = db.Column(db.String(50), nullable=False)
    city_id = db.Column(db.String(36), db.ForeignKey('cities.id'), nullable=False)

# Flexible Property model that matches your PostgreSQL table structure
class Property(db.Model):
    __tablename__ = 'properties'
    
    # Your actual PostgreSQL table structure
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    erf_size = db.Column(db.Text, nullable=True)
    cost = db.Column(db.Integer, nullable=True)
    developer = db.Column(db.Text, nullable=True)
    type = db.Column(db.Text, nullable=True)  # This is your property_type field
    area_id = db.Column(db.String(36), nullable=True)  # UUID as string
    
    def to_dict(self):
        """Convert property to dictionary with fallback values and location info"""
        # Get location information from area_id
        location_info = {'area': None, 'city': None, 'province': None, 'location': 'South Africa'}
        
        if self.area_id:
            try:
                area = Area.query.get(self.area_id)
                if area:
                    location_info['area'] = area.name
                    if area.city:
                        location_info['city'] = area.city.name
                        if area.city.province:
                            location_info['province'] = area.city.province.name
                            location_info['location'] = f"{area.name}, {area.city.name}, {area.city.province.name}"
                        else:
                            location_info['location'] = f"{area.name}, {area.city.name}"
                    else:
                        location_info['location'] = area.name
            except:
                # If there's any error getting location info, use defaults
                pass
        
        return {
            'id': self.id,
            'name': self.name or f'Property {self.id}',
            'price': self.cost or 0,
            'property_type': self.type or 'residential',
            'location': location_info['location'],
            'area': location_info['area'],
            'city': location_info['city'],
            'province': location_info['province'],
            'size': self.erf_size or 'Size not specified',
            'image_url': self.image_url or 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
            'developer': self.developer or 'Developer not specified',
            'bedrooms': None,
            'bathrooms': None,
            'status': 'available',
            'description': f'{self.type} property developed by {self.developer}' if self.developer else 'Property description not available',
            'area_id': self.area_id  # Include the area_id for debugging
        }

