/**
 * CogMatchingProperties
 * Shows properties near the Centre of Gravity result, sorted by distance.
 */
import React, { useState, useEffect, useCallback } from 'react';
import areaDataService from '../services/areaDataService';
import './styles/CogMatchingProperties.css';

const TYPE_LABELS = {
  residential: { label: 'Residential', color: '#4f46e5' },
  commercial:  { label: 'Commercial',  color: '#0891b2' },
  industrial:  { label: 'Industrial',  color: '#d97706' },
  retail:      { label: 'Retail',      color: '#16a34a' },
};

function PropertyCard({ property }) {
  const tinfo = TYPE_LABELS[property.property_type?.toLowerCase()] ?? { label: property.property_type, color: '#6b7280' };
  const priceStr = property.price
    ? `R ${Number(property.price).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`
    : 'POA';
  return (
    <div className="cmp-card">
      <div className="cmp-card-img-wrap">
        {property.image_url
          ? <img src={property.image_url} alt={property.name} className="cmp-card-img" loading="lazy" />
          : <div className="cmp-card-img-placeholder" />}
        {property.is_featured && <span className="cmp-card-badge-featured">Featured</span>}
        <span className="cmp-card-badge-type" style={{ background: tinfo.color }}>{tinfo.label}</span>
      </div>
      <div className="cmp-card-body">
        <p className="cmp-card-area">{property.area_name} · {property.distance_km != null ? `${property.distance_km} km` : ''}</p>
        <h3 className="cmp-card-name">{property.name}</h3>
        {property.developer && <p className="cmp-card-developer">{property.developer}</p>}
        {property.address   && <p className="cmp-card-address">{property.address}</p>}
        {property.bedrooms  != null && <p className="cmp-card-beds">{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</p>}
        <p className="cmp-card-price">{priceStr}</p>
        {property.description && <p className="cmp-card-desc">{property.description}</p>}
      </div>
    </div>
  );
}

const TYPES = ['all', 'residential', 'commercial', 'industrial', 'retail'];

export default function CogMatchingProperties({ cogResult, weights }) {
  const [properties,   setProperties]   = useState([]);
  const [loading,      setLoading]       = useState(false);
  const [error,        setError]         = useState(null);
  const [radius,       setRadius]        = useState(15);
  const [typeFilter,   setTypeFilter]    = useState('all');
  const [maxPrice,     setMaxPrice]      = useState('');
  const [minBeds,      setMinBeds]       = useState('');
  const [fetched,      setFetched]       = useState(false);

  const fetchProperties = useCallback(async () => {
    if (!cogResult?.lat || !cogResult?.lng) return;
    setLoading(true);
    setError(null);
    try {
      const base = areaDataService.getApiBase ? areaDataService.getApiBase() : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');
      const body = {
        lat:       cogResult.lat,
        lng:       cogResult.lng,
        radius_km: radius,
        limit:     20,
      };
      if (typeFilter !== 'all') body.property_type = typeFilter;
      if (maxPrice)  body.max_price     = Number(maxPrice);
      if (minBeds)   body.min_bedrooms  = Number(minBeds);
      if (weights)   body.weights       = weights;

      const resp = await fetch(`${base}/api/cog/matching-properties`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      setProperties(data.properties || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [cogResult, radius, typeFilter, maxPrice, minBeds, weights]);

  // Auto-fetch when cog result changes
  useEffect(() => {
    if (cogResult?.lat && cogResult?.lng) {
      fetchProperties();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cogResult?.lat, cogResult?.lng]);

  if (!cogResult?.lat) return null;

  return (
    <div className="cmp-root">
      <div className="cmp-header">
        <h3 className="cmp-title">
          <span className="cmp-title-icon">🏘</span>
          Properties Near Your CoG
        </h3>
        <p className="cmp-subtitle">
          Properties within <strong>{radius} km</strong> of your optimal location
          {properties.length > 0 && ` · ${properties.length} found`}
        </p>
      </div>

      {/* Filters */}
      <div className="cmp-filters">
        <div className="cmp-filter-group">
          <label className="cmp-filter-label">Radius</label>
          <select className="cmp-select" value={radius} onChange={e => setRadius(Number(e.target.value))}>
            {[5, 10, 15, 20, 30, 50].map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
        </div>

        <div className="cmp-filter-group">
          <label className="cmp-filter-label">Type</label>
          <select className="cmp-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : TYPE_LABELS[t]?.label ?? t}</option>)}
          </select>
        </div>

        <div className="cmp-filter-group">
          <label className="cmp-filter-label">Max Price (R)</label>
          <input
            className="cmp-input"
            type="number"
            placeholder="e.g. 5000000"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
          />
        </div>

        <div className="cmp-filter-group">
          <label className="cmp-filter-label">Min Beds</label>
          <input
            className="cmp-input cmp-input-sm"
            type="number"
            min="0"
            max="10"
            placeholder="Any"
            value={minBeds}
            onChange={e => setMinBeds(e.target.value)}
          />
        </div>

        <button className="cmp-search-btn" onClick={fetchProperties} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="cmp-loading">
          <span className="cmp-spinner" />
          Finding properties near your optimal location…
        </div>
      )}

      {error && !loading && (
        <div className="cmp-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {!loading && fetched && properties.length === 0 && !error && (
        <div className="cmp-empty">
          No properties found within {radius} km. Try increasing the radius or adjusting filters.
        </div>
      )}

      {!loading && properties.length > 0 && (
        <div className="cmp-grid">
          {properties.map(p => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  );
}
