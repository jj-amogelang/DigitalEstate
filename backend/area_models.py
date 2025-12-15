"""Area & legacy ancillary models.

Converted to use the shared Flask SQLAlchemy ``db`` instance so that
``db.create_all()`` in ``main.py`` actually creates these tables. The previous
version used an independent ``declarative_base`` which meant ``Country.query``
and friends were undefined and tables were never created – causing runtime
errors for hierarchy endpoints.

Only minimal fields kept; these can be further slimmed once the new metrics
schema fully replaces any legacy stats tables.
"""

import os
from sqlalchemy import DECIMAL, Float
from sqlalchemy.sql import func
from db_core import db

# Dialect-flexible decimal: SQLite struggles with high precision DECIMAL so
# downgrade to Float when using a SQLite DATABASE_URL (dev fallback).
DecimalType = Float if os.getenv('DATABASE_URL', '').startswith('sqlite') else DECIMAL

class Country(db.Model):
    __tablename__ = 'countries'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    code = db.Column(db.String(3), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    provinces = db.relationship("Province", back_populates="country", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Province(db.Model):
    __tablename__ = 'provinces'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    country_id = db.Column(db.Integer, db.ForeignKey('countries.id', ondelete='CASCADE'))
    created_at = db.Column(db.DateTime, default=func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    country = db.relationship("Country", back_populates="provinces")
    cities = db.relationship("City", back_populates="province", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'country_id': self.country_id,
            'country_name': self.country.name if self.country else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class City(db.Model):
    __tablename__ = 'cities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    province_id = db.Column(db.Integer, db.ForeignKey('provinces.id', ondelete='CASCADE'))
    created_at = db.Column(db.DateTime, default=func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    province = db.relationship("Province", back_populates="cities")
    areas = db.relationship("Area", back_populates="city", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'province_id': self.province_id,
            'province_name': self.province.name if self.province else None,
            'country_name': self.province.country.name if self.province and self.province.country else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Area(db.Model):
    __tablename__ = 'areas'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    city_id = db.Column(db.Integer, db.ForeignKey('cities.id', ondelete='CASCADE'))
    description = db.Column(db.Text)
    area_type = db.Column(db.String(50))  # residential, commercial, mixed, industrial
    postal_code = db.Column(db.String(20))
    coordinates = db.Column(db.String(100))  # Store as "lat,lng" string for compatibility
    created_at = db.Column(db.DateTime, default=func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    city = db.relationship("City", back_populates="areas")
    images = db.relationship("AreaImage", back_populates="area", cascade="all, delete-orphan")
    statistics = db.relationship("AreaStatistics", back_populates="area", cascade="all, delete-orphan")
    amenities = db.relationship("AreaAmenity", back_populates="area", cascade="all, delete-orphan")
    market_trends = db.relationship("MarketTrend", back_populates="area", cascade="all, delete-orphan")
    
    def to_dict(self):
        primary_image = next((img for img in self.images if img.is_primary), None)
        latest_stats = max(self.statistics, key=lambda x: x.created_at) if self.statistics else None
        
        return {
            'id': self.id,
            'name': self.name,
            'city_id': self.city_id,
            'city_name': self.city.name if self.city else None,
            'province_name': self.city.province.name if self.city and self.city.province else None,
            'country_name': self.city.province.country.name if self.city and self.city.province and self.city.province.country else None,
            'description': self.description,
            'area_type': self.area_type,
            'postal_code': self.postal_code,
            'primary_image_url': primary_image.image_url if primary_image else None,
            'statistics': latest_stats.to_dict() if latest_stats else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AreaImage(db.Model):
    __tablename__ = 'area_images'
    
    id = db.Column(db.Integer, primary_key=True)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='CASCADE'))
    image_url = db.Column(db.String(500), nullable=False)
    image_title = db.Column(db.String(200))
    image_description = db.Column(db.Text)
    is_primary = db.Column(db.Boolean, default=False)
    image_order = db.Column(db.Integer, default=0)
    uploaded_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=func.current_timestamp())
    
    area = db.relationship("Area", back_populates="images")
    
    def to_dict(self):
        return {
            'id': self.id,
            'area_id': self.area_id,
            'image_url': self.image_url,
            'image_title': self.image_title,
            'image_description': self.image_description,
            'is_primary': self.is_primary,
            'image_order': self.image_order,
            'uploaded_by': self.uploaded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AreaStatistics(db.Model):
    __tablename__ = 'area_statistics'
    
    id = db.Column(db.Integer, primary_key=True)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='CASCADE'))
    
    # Property Price Data
    average_property_price = db.Column(DecimalType(15, 2))
    median_property_price = db.Column(DecimalType(15, 2))
    price_per_sqm = db.Column(DecimalType(10, 2))
    price_growth_yoy = db.Column(DecimalType(5, 2))
    
    # Rental Data
    average_rental_price = db.Column(DecimalType(10, 2))
    rental_yield = db.Column(DecimalType(5, 2))
    rental_growth_yoy = db.Column(DecimalType(5, 2))
    vacancy_rate = db.Column(DecimalType(5, 2))
    
    # Market Metrics
    days_on_market = db.Column(db.Integer)
    total_properties_sold = db.Column(db.Integer)
    total_rental_properties = db.Column(db.Integer)
    
    # Area Quality Metrics
    crime_index_score = db.Column(db.Integer)  # 0-100 scale
    education_score = db.Column(db.Integer)  # 0-100 scale
    transport_score = db.Column(db.Integer)  # 0-100 scale
    amenities_score = db.Column(db.Integer)  # 0-100 scale
    
    # Data collection period
    data_period_start = db.Column(db.Date)
    data_period_end = db.Column(db.Date)
    
    created_at = db.Column(db.DateTime, default=func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    area = db.relationship("Area", back_populates="statistics")
    
    def to_dict(self):
        return {
            'id': self.id,
            'area_id': self.area_id,
            'average_property_price': float(self.average_property_price) if self.average_property_price else None,
            'median_property_price': float(self.median_property_price) if self.median_property_price else None,
            'price_per_sqm': float(self.price_per_sqm) if self.price_per_sqm else None,
            'price_growth_yoy': float(self.price_growth_yoy) if self.price_growth_yoy else None,
            'average_rental_price': float(self.average_rental_price) if self.average_rental_price else None,
            'rental_yield': float(self.rental_yield) if self.rental_yield else None,
            'rental_growth_yoy': float(self.rental_growth_yoy) if self.rental_growth_yoy else None,
            'vacancy_rate': float(self.vacancy_rate) if self.vacancy_rate else None,
            'days_on_market': self.days_on_market,
            'total_properties_sold': self.total_properties_sold,
            'total_rental_properties': self.total_rental_properties,
            'crime_index_score': self.crime_index_score,
            'education_score': self.education_score,
            'transport_score': self.transport_score,
            'amenities_score': self.amenities_score,
            'data_period_start': self.data_period_start.isoformat() if self.data_period_start else None,
            'data_period_end': self.data_period_end.isoformat() if self.data_period_end else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AreaAmenity(db.Model):
    __tablename__ = 'area_amenities'
    
    id = db.Column(db.Integer, primary_key=True)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='CASCADE'))
    amenity_type = db.Column(db.String(50), nullable=False)  # school, hospital, mall, transport, etc.
    name = db.Column(db.String(200), nullable=False)
    distance_km = db.Column(DecimalType(5, 2))  # Distance from area center
    rating = db.Column(DecimalType(3, 2))  # 1-5 star rating
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=func.current_timestamp())
    
    area = db.relationship("Area", back_populates="amenities")
    
    def to_dict(self):
        return {
            'id': self.id,
            'area_id': self.area_id,
            'amenity_type': self.amenity_type,
            'name': self.name,
            'distance_km': float(self.distance_km) if self.distance_km else None,
            'rating': float(self.rating) if self.rating else None,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class MarketTrend(db.Model):
    __tablename__ = 'market_trends'
    
    id = db.Column(db.Integer, primary_key=True)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='CASCADE'))
    metric_type = db.Column(db.String(50), nullable=False)  # price, rental, vacancy, etc.
    metric_value = db.Column(DecimalType(15, 2), nullable=False)
    metric_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=func.current_timestamp())
    
    area = db.relationship("Area", back_populates="market_trends")
    
    def to_dict(self):
        return {
            'id': self.id,
            'area_id': self.area_id,
            'metric_type': self.metric_type,
            'metric_value': float(self.metric_value) if self.metric_value else None,
            'metric_date': self.metric_date.isoformat() if self.metric_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Property(db.Model):
    __tablename__ = 'properties'
    id = db.Column(db.Integer, primary_key=True)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    developer = db.Column(db.String(120))
    property_type = db.Column(db.String(40), nullable=False)  # 'commercial' | 'residential'
    address = db.Column(db.String(240))
    price = db.Column(DecimalType(18, 2))
    bedrooms = db.Column(db.Integer)  # residential only
    image_url = db.Column(db.Text)
    is_featured = db.Column(db.Boolean, default=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=func.current_timestamp())

    area = db.relationship('Area')

    def to_dict(self):
        return {
            'id': self.id,
            'area_id': self.area_id,
            'name': self.name,
            'developer': self.developer,
            'property_type': self.property_type,
            'address': self.address,
            'price': float(self.price) if self.price else None,
            'bedrooms': self.bedrooms,
            'image_url': self.image_url,
            'is_featured': self.is_featured,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }