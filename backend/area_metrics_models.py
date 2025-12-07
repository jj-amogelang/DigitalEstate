"""SQLAlchemy models for the new flexible Area Metrics system.

These coexist with legacy models; you can gradually migrate endpoints to use them.
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
from db_core import db  # unified db instance (legacy models removed)

class Metric(db.Model):
    __tablename__ = 'metrics'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(60), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    unit = db.Column(db.String(40))
    category = db.Column(db.String(60))
    data_type = db.Column(db.String(20), default='numeric')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'description': self.description,
            'unit': self.unit,
            'category': self.category,
            'data_type': self.data_type,
            'is_active': self.is_active
        }

class AreaMetricValue(db.Model):
    __tablename__ = 'area_metric_values'
    id = db.Column(db.BigInteger, primary_key=True)
    area_id = db.Column(db.Integer, nullable=False)  # link to areas.id existing numeric PK (if migrated to ints)
    metric_id = db.Column(db.Integer, db.ForeignKey('metrics.id', ondelete='CASCADE'), nullable=False)
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date)
    value_numeric = db.Column(db.Numeric(18,4))
    value_text = db.Column(db.Text)
    value_json = db.Column(JSONB) if JSONB else db.Column(db.Text)
    source = db.Column(db.String(120))
    source_reference = db.Column(db.Text)
    quality_score = db.Column(db.SmallInteger)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    metric = db.relationship('Metric')

    def to_dict(self):
        return {
            'id': self.id,
            'area_id': self.area_id,
            'metric_id': self.metric_id,
            'metric_code': self.metric.code if self.metric else None,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'value_numeric': float(self.value_numeric) if self.value_numeric is not None else None,
            'value_text': self.value_text,
            'value_json': self.value_json,
            'source': self.source,
            'quality_score': self.quality_score,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
