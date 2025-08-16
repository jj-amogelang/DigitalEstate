from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()

# Legacy models for backward compatibility
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

# Current Property model that matches your existing table structure
class Property(db.Model):
    __tablename__ = 'properties'
    
    # Only use existing columns from your current table
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    erf_size = db.Column(db.Text, nullable=True)  # Keep as text to match existing
    cost = db.Column(db.Integer, nullable=True)
    developer = db.Column(db.Text, nullable=True)
    type = db.Column(db.Text, nullable=True)
    area_id = db.Column(db.String(36), nullable=True)
    
    def get_valuations(self):
        """Get valuations for this property"""
        return Valuation.query.filter_by(property_id=self.id).all()
    
    def to_dict(self):
        """Convert property to dictionary using existing columns only"""
        # Get location from area if possible
        location = 'South Africa'
        area_name = None
        city_name = None
        province_name = None
        
        if self.area_id:
            try:
                area = Area.query.get(self.area_id)
                if area:
                    area_name = area.name
                    if area.city:
                        city_name = area.city.name
                        if area.city.province:
                            province_name = area.city.province.name
                            location = f"{area.name}, {area.city.name}, {area.city.province.name}"
            except:
                pass
        
        # Parse erf_size if it's text
        erf_size_value = None
        if self.erf_size:
            try:
                import re
                numeric_part = re.findall(r'\d+\.?\d*', str(self.erf_size))
                if numeric_part:
                    erf_size_value = float(numeric_part[0])
            except:
                pass
        
        # Get latest valuation
        valuations = self.get_valuations()
        latest_valuation = None
        price = self.cost or 0
        
        if valuations:
            latest_valuation = max(valuations, key=lambda v: v.valuation_date or date.min)
            price = float(latest_valuation.market_value) if latest_valuation.market_value else price
        
        return {
            'id': self.id,
            'name': self.name or f'Property {self.id}',
            'price': price,
            'property_type': self.type or 'residential',
            'location': location,
            'area': area_name,
            'city': city_name,
            'province': province_name,
            'erf_size': erf_size_value,
            'size': self.erf_size or 'Size not specified',
            'image_url': self.image_url or 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
            'developer': self.developer or 'Developer not specified',
            'description': f'{self.type} property developed by {self.developer}' if self.developer else 'Property description not available',
            'status': 'available',
            'bedrooms': None,
            'bathrooms': None,
            'area_id': self.area_id,
            'valuation_date': latest_valuation.valuation_date.isoformat() if latest_valuation and latest_valuation.valuation_date else None
        }

# New Enhanced Property model for Excel data (will use a different table)
class EnhancedProperty(db.Model):
    __tablename__ = 'enhanced_properties'
    
    id = db.Column(db.Integer, primary_key=True)
    property_name = db.Column(db.String(255), nullable=True)
    address = db.Column(db.Text, nullable=True)
    suburb = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    province = db.Column(db.String(100), nullable=True)
    postal_code = db.Column(db.String(10), nullable=True)
    property_type = db.Column(db.String(50), nullable=True)
    property_subtype = db.Column(db.String(50), nullable=True)
    bedrooms = db.Column(db.Integer, nullable=True)
    bathrooms = db.Column(db.Integer, nullable=True)
    parking_spaces = db.Column(db.Integer, nullable=True)
    erf_size = db.Column(db.Numeric(10, 2), nullable=True)
    building_size = db.Column(db.Numeric(10, 2), nullable=True)
    year_built = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(20), nullable=True, default='available')
    listing_date = db.Column(db.Date, nullable=True, default=date.today)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    owner_id = db.Column(db.Integer, nullable=True)  # Will link to owners table
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_owner(self):
        """Get owner for this property"""
        if self.owner_id:
            return Owner.query.get(self.owner_id)
        return None
    
    def get_valuations(self):
        """Get valuations for this enhanced property"""
        return Valuation.query.filter_by(property_id=self.id).all()
    
    def to_dict(self):
        """Convert enhanced property to dictionary"""
        valuations = self.get_valuations()
        latest_valuation = None
        if valuations:
            latest_valuation = max(valuations, key=lambda v: v.valuation_date or date.min)
        
        owner = self.get_owner()
        
        return {
            'id': self.id,
            'name': self.property_name or f'Property in {self.suburb or self.city}',
            'address': self.address,
            'suburb': self.suburb,
            'city': self.city,
            'province': self.province,
            'postal_code': self.postal_code,
            'location': f"{self.suburb}, {self.city}, {self.province}" if all([self.suburb, self.city, self.province]) else self.address,
            'property_type': self.property_type or 'residential',
            'property_subtype': self.property_subtype,
            'bedrooms': self.bedrooms,
            'bathrooms': self.bathrooms,
            'parking_spaces': self.parking_spaces,
            'erf_size': float(self.erf_size) if self.erf_size else None,
            'building_size': float(self.building_size) if self.building_size else None,
            'year_built': self.year_built,
            'status': self.status,
            'listing_date': self.listing_date.isoformat() if self.listing_date else None,
            'description': self.description,
            'image_url': self.image_url or 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
            'price': float(latest_valuation.market_value) if latest_valuation and latest_valuation.market_value else 0,
            'valuation_date': latest_valuation.valuation_date.isoformat() if latest_valuation and latest_valuation.valuation_date else None,
            'owner_name': owner.full_name if owner else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Owner(db.Model):
    __tablename__ = 'owners'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    full_name = db.Column(db.String(200), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    id_number = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    city = db.Column(db.String(100), nullable=True)
    province = db.Column(db.String(100), nullable=True)
    postal_code = db.Column(db.String(10), nullable=True)
    owner_type = db.Column(db.String(20), nullable=True, default='individual')  # individual, company, trust
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_properties(self):
        """Get properties owned by this owner"""
        # Check both property tables
        regular_properties = Property.query.filter_by(area_id=str(self.id)).all()  # If stored differently
        enhanced_properties = EnhancedProperty.query.filter_by(owner_id=self.id).all()
        return regular_properties + enhanced_properties
    
    def to_dict(self):
        properties = self.get_properties()
        
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name or f"{self.first_name} {self.last_name}".strip(),
            'email': self.email,
            'phone': self.phone,
            'id_number': self.id_number,
            'address': self.address,
            'city': self.city,
            'province': self.province,
            'postal_code': self.postal_code,
            'owner_type': self.owner_type,
            'property_count': len(properties)
        }

class Zoning(db.Model):
    __tablename__ = 'zoning'
    
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, nullable=False)  # Removed FK constraint for flexibility
    zoning_code = db.Column(db.String(20), nullable=True)
    zoning_description = db.Column(db.String(255), nullable=True)
    land_use = db.Column(db.String(100), nullable=True)
    density = db.Column(db.String(50), nullable=True)
    height_restrictions = db.Column(db.String(100), nullable=True)
    coverage_ratio = db.Column(db.Numeric(5, 2), nullable=True)
    setback_requirements = db.Column(db.Text, nullable=True)
    special_conditions = db.Column(db.Text, nullable=True)
    effective_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'zoning_code': self.zoning_code,
            'zoning_description': self.zoning_description,
            'land_use': self.land_use,
            'density': self.density,
            'height_restrictions': self.height_restrictions,
            'coverage_ratio': float(self.coverage_ratio) if self.coverage_ratio else None,
            'setback_requirements': self.setback_requirements,
            'special_conditions': self.special_conditions,
            'effective_date': self.effective_date.isoformat() if self.effective_date else None
        }

class Valuation(db.Model):
    __tablename__ = 'valuations'
    
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, nullable=False)  # Removed FK constraint for flexibility
    market_value = db.Column(db.Numeric(15, 2), nullable=True)
    municipal_value = db.Column(db.Numeric(15, 2), nullable=True)
    rental_value = db.Column(db.Numeric(15, 2), nullable=True)
    valuation_date = db.Column(db.Date, nullable=True)
    valuation_method = db.Column(db.String(50), nullable=True)
    valuer_name = db.Column(db.String(200), nullable=True)
    valuer_company = db.Column(db.String(200), nullable=True)
    valuation_report_url = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'market_value': float(self.market_value) if self.market_value else None,
            'municipal_value': float(self.municipal_value) if self.municipal_value else None,
            'rental_value': float(self.rental_value) if self.rental_value else None,
            'valuation_date': self.valuation_date.isoformat() if self.valuation_date else None,
            'valuation_method': self.valuation_method,
            'valuer_name': self.valuer_name,
            'valuer_company': self.valuer_company,
            'valuation_report_url': self.valuation_report_url,
            'notes': self.notes
        }

class MarketTrend(db.Model):
    __tablename__ = 'market_trends'
    
    id = db.Column(db.Integer, primary_key=True)
    area = db.Column(db.String(100), nullable=False)
    property_type = db.Column(db.String(50), nullable=False)
    avg_price = db.Column(db.Numeric(15, 2), nullable=True)
    median_price = db.Column(db.Numeric(15, 2), nullable=True)
    price_per_sqm = db.Column(db.Numeric(10, 2), nullable=True)
    rental_yield = db.Column(db.Numeric(5, 2), nullable=True)  # percentage
    vacancy_rate = db.Column(db.Numeric(5, 2), nullable=True)  # percentage
    growth_rate = db.Column(db.Numeric(5, 2), nullable=True)  # percentage
    sales_volume = db.Column(db.Integer, nullable=True)
    time_on_market = db.Column(db.Integer, nullable=True)  # days
    period_start = db.Column(db.Date, nullable=True)
    period_end = db.Column(db.Date, nullable=True)
    last_updated = db.Column(db.Date, nullable=True, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'area': self.area,
            'property_type': self.property_type,
            'avg_price': float(self.avg_price) if self.avg_price else None,
            'median_price': float(self.median_price) if self.median_price else None,
            'price_per_sqm': float(self.price_per_sqm) if self.price_per_sqm else None,
            'rental_yield': float(self.rental_yield) if self.rental_yield else None,
            'vacancy_rate': float(self.vacancy_rate) if self.vacancy_rate else None,
            'growth_rate': float(self.growth_rate) if self.growth_rate else None,
            'sales_volume': self.sales_volume,
            'time_on_market': self.time_on_market,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }

# Legacy Property model for backward compatibility
class LegacyProperty(db.Model):
    __tablename__ = 'legacy_properties'
    
    # Your old property table structure
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    erf_size = db.Column(db.Text, nullable=True)
    cost = db.Column(db.Integer, nullable=True)
    developer = db.Column(db.Text, nullable=True)
    type = db.Column(db.Text, nullable=True)  # This is your property_type field
    area_id = db.Column(db.String(36), nullable=True)  # UUID as string
    
    def to_dict(self):
        """Convert legacy property to dictionary"""
        return {
            'id': self.id,
            'name': self.name or f'Property {self.id}',
            'price': self.cost or 0,
            'property_type': self.type or 'residential',
            'size': self.erf_size or 'Size not specified',
            'image_url': self.image_url or 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
            'developer': self.developer or 'Developer not specified',
            'area_id': self.area_id
        }

