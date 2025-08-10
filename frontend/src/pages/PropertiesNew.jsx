import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../config/api";
import "../components/DropdownFix.css";
import "./PropertiesModern.css";

export default function Properties() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [propertyList, setPropertyList] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState({
    country: "", province: "", city: "", area: "", areaName: ""
  });

  // Fetch all countries on mount
  useEffect(() => {
    console.log('🌍 Fetching countries from API...');
    setLoading(true);
    
    axios.get(API_ENDPOINTS.COUNTRIES)
      .then(res => {
        console.log('✅ Countries fetched successfully:', res.data);
        setCountries(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error fetching countries:', err);
        console.error('Error details:', err.response?.data || err.message);
        setLoading(false);
      });
  }, []);

  // Fetch all properties from PostgreSQL database on mount (only if no area selected)
  useEffect(() => {
    if (!selected.area) {
      setLoading(true);
      
      // Use new enhanced API endpoint with better filtering
      const filters = {};
      if (selectedPropertyType !== 'all') {
        filters.type = selectedPropertyType;
      }

      const params = new URLSearchParams(filters);
      const url = `${API_ENDPOINTS.API_PROPERTIES}?${params.toString()}`;
      
      console.log('🔍 Fetching properties from:', url);
      
      axios.get(url)
        .then(res => {
          console.log('✅ Properties fetched successfully:', res.data);
          const properties = res.data.properties || res.data;
          setPropertyList(properties);
          setFilteredProperties(properties);
          setLoading(false);
        })
        .catch(err => {
          console.error('❌ Error fetching properties:', err);
          console.error('Error details:', err.response?.data || err.message);
          setLoading(false);
        });
    }
  }, [selectedPropertyType, selected.area]);

  // Fetch provinces when country changes
  useEffect(() => {
    if (selected.country) {
      axios.get(API_ENDPOINTS.PROVINCES(selected.country))
        .then(res => {
          setProvinces(res.data);
          setCities([]);
          setAreas([]);
          setSelected(prev => ({ ...prev, province: "", city: "", area: "", areaName: "" }));
        })
        .catch(err => console.error('Error fetching provinces:', err));
    }
  }, [selected.country]);

  // Fetch cities when province changes
  useEffect(() => {
    if (selected.province) {
      axios.get(API_ENDPOINTS.CITIES(selected.province))
        .then(res => {
          setCities(res.data);
          setAreas([]);
          setSelected(prev => ({ ...prev, city: "", area: "", areaName: "" }));
        })
        .catch(err => console.error('Error fetching cities:', err));
    }
  }, [selected.province]);

  // Fetch areas when city changes
  useEffect(() => {
    if (selected.city) {
      axios.get(API_ENDPOINTS.AREAS(selected.city))
        .then(res => {
          setAreas(res.data);
          setSelected(prev => ({ ...prev, area: "", areaName: "" }));
        })
        .catch(err => console.error('Error fetching areas:', err));
    }
  }, [selected.city]);

  // Fetch properties when area changes
  useEffect(() => {
    if (selected.area) {
      setLoading(true);
      axios.get(API_ENDPOINTS.PROPERTIES_BY_AREA(selected.area))
        .then(res => {
          console.log('✅ Area properties fetched:', res.data);
          let properties = res.data;
          
          // Apply property type filter
          if (selectedPropertyType !== 'all') {
            properties = properties.filter(property => 
              property.type && property.type.toLowerCase().includes(selectedPropertyType.toLowerCase())
            );
          }
          
          setFilteredProperties(properties);
          setPropertyList(properties);
          setLoading(false);
        })
        .catch(err => {
          console.error('❌ Error fetching area properties:', err);
          setLoading(false);
        });
    }
  }, [selected.area, selectedPropertyType]);

  const propertyTypesFilter = [
    { value: 'all', label: 'All Properties', icon: '🏠' },
    { value: 'residential', label: 'Residential', icon: '🏡' },
    { value: 'commercial', label: 'Commercial', icon: '🏢' },
    { value: 'industrial', label: 'Industrial', icon: '🏭' },
    { value: 'mixed', label: 'Mixed Use', icon: '🏘️' }
  ];

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for Price';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getBadgeColor = (priceRange) => {
    if (!priceRange || priceRange === 0) return 'contact';
    if (priceRange < 1000000) return 'affordable';
    if (priceRange < 5000000) return 'moderate';
    return 'premium';
  };

  const getBadgeText = (cost) => {
    if (!cost || cost === 0) return 'Contact for Price';
    return formatPrice(cost);
  };

  return (
    <div className="properties-page-modern">
      {/* Header Section */}
      <div className="properties-header-modern">
        <div className="header-content-modern">
          <h1 className="page-title-modern">Premium Properties</h1>
          <p className="page-subtitle-modern">
            Discover exceptional real estate opportunities across South Africa's most sought-after locations
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section-modern">
        <div className="filters-container-modern">
          <h2 className="filters-title-modern">Find Your Perfect Property</h2>
          
          <div className="location-selectors-modern">
            <div className="selector-item-modern">
              <label className="selector-label-modern">Country</label>
              <div className="selector-wrapper-modern">
                <select
                  className="selector-input-modern"
                  value={selected.country}
                  onChange={e => setSelected(prev => ({ ...prev, country: e.target.value }))}
                >
                  <option value="">Select Country</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="selector-item-modern">
              <label className="selector-label-modern">Province</label>
              <div className="selector-wrapper-modern">
                <select
                  className="selector-input-modern"
                  value={selected.province}
                  onChange={e => setSelected(prev => ({ ...prev, province: e.target.value }))}
                  disabled={!selected.country}
                >
                  <option value="">Select Province</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="selector-item-modern">
              <label className="selector-label-modern">City</label>
              <div className="selector-wrapper-modern">
                <select
                  className="selector-input-modern"
                  value={selected.city}
                  onChange={e => setSelected(prev => ({ ...prev, city: e.target.value }))}
                  disabled={!selected.province}
                >
                  <option value="">Select City</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="selector-item-modern">
              <label className="selector-label-modern">Area</label>
              <div className="selector-wrapper-modern">
                <select
                  className="selector-input-modern"
                  value={selected.area}
                  onChange={e => {
                    const selectedAreaId = e.target.value;
                    const selectedAreaName = areas.find(a => a.id === selectedAreaId)?.name || '';
                    setSelected(prev => ({ ...prev, area: selectedAreaId, areaName: selectedAreaName }));
                    setPropertyList([]);
                    setFilteredProperties([]);
                  }}
                  disabled={!selected.city}
                >
                  <option value="">Select Area</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Property Type Filter */}
      {selected.area && (
        <div className="property-type-filter-modern">
          <div className="filter-container-modern">
            <h3 className="filter-title-modern">Property Categories</h3>
            
            <div className="filter-options-modern">
              {propertyTypesFilter.map(type => (
                <button
                  key={type.value}
                  className={`filter-option-modern ${selectedPropertyType === type.value ? 'active' : ''}`}
                  onClick={() => setSelectedPropertyType(type.value)}
                >
                  <span className="filter-option-icon-modern">{type.icon}</span>
                  <span className="filter-option-label-modern">{type.label}</span>
                  {selectedPropertyType === type.value && (
                    <span className="filter-option-check-modern">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-indicator-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading properties...</span>
        </div>
      )}

      {/* Properties Results */}
      <div className="properties-results-modern">
        {selected.area ? (
          <div className="properties-section-modern">
            <div className="results-header-modern">
              <div className="results-breadcrumb-modern">
                <span>{countries.find(c => c.id === selected.country)?.name}</span>
                {selected.province && <><span> • </span><span>{provinces.find(p => p.id === selected.province)?.name}</span></>}
                {selected.city && <><span> • </span><span>{cities.find(c => c.id === selected.city)?.name}</span></>}
                {selected.area && <><span> • </span><span className="active">{selected.areaName}</span></>}
              </div>
              <h2 className="results-title-modern">
                Properties in {selected.areaName}
              </h2>
              <div className="results-count-modern">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} available
              </div>
            </div>

            {filteredProperties.length > 0 ? (
              <div className="properties-grid-modern">
                {filteredProperties.map(property => (
                  <div key={property.id} className="property-card-modern" onClick={() => navigate(`/property/${property.id}`)}>
                    <div className="property-image-modern">
                      <img 
                        src={property.image_url} 
                        alt={property.name}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop';
                        }}
                      />
                      <div className="property-overlay-modern">
                        <div className="property-type-badge-modern">
                          {property.type}
                        </div>
                        <button className="view-details-btn-modern">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          View Details
                        </button>
                      </div>
                    </div>
                    
                    <div className="property-content-modern">
                      <div className="property-header-modern">
                        <h3 className="property-title-modern">{property.name}</h3>
                        <div className="property-location-modern">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                          {property.location}
                        </div>
                      </div>
                      
                      <div className="property-price-modern">
                        <span className="price-modern">
                          {property.cost && property.cost > 0 
                            ? formatPrice(property.cost)
                            : 'Contact for Price'
                          }
                        </span>
                      </div>
                      
                      <div className="property-details-modern">
                        <div className="property-stats-modern">
                          <div className="stat-modern">
                            <span className="stat-icon-modern">📐</span>
                            <span className="stat-text-modern">{property.erf_size || 'Size available'}</span>
                          </div>
                          <div className="stat-modern">
                            <span className="stat-icon-modern">🏗️</span>
                            <span className="stat-text-modern">{property.developer}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="property-actions-modern">
                        <button className="btn-primary-modern" onClick={(e) => {
                          e.stopPropagation();
                          // Handle contact action
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Contact
                        </button>
                        <button className="btn-secondary-modern" onClick={(e) => {
                          e.stopPropagation();
                          // Handle save action
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-properties-modern">
                <div className="no-properties-icon-modern">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9.5L12 4L21 9.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h3 className="no-properties-title-modern">No Properties Available</h3>
                <p className="no-properties-text-modern">
                  We're working on adding more properties to this area. Please check back soon or try a different location.
                </p>
                <button 
                  className="btn-modern btn-outline-modern"
                  onClick={() => setSelected({country: "", province: "", city: "", area: "", areaName: ""})}
                >
                  Reset Search
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="welcome-section-modern">
            <div className="welcome-content-modern">
              <div className="welcome-icon-modern">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <h2 className="welcome-title-modern">Discover Your Perfect Property</h2>
              <p className="welcome-subtitle-modern">
                Start by selecting your preferred location using the search filters above. 
                Our comprehensive database will help you find the ideal investment opportunity.
              </p>
              
              <div className="welcome-features-modern">
                <div className="welcome-feature-modern">
                  <div className="feature-icon-modern">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="feature-text-modern">
                    <h4>Premium Properties</h4>
                    <p>Curated selection of high-quality properties</p>
                  </div>
                </div>
                
                <div className="welcome-feature-modern">
                  <div className="feature-icon-modern">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="feature-text-modern">
                    <h4>Prime Locations</h4>
                    <p>Properties in South Africa's most sought-after areas</p>
                  </div>
                </div>
                
                <div className="welcome-feature-modern">
                  <div className="feature-icon-modern">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="feature-text-modern">
                    <h4>Expert Support</h4>
                    <p>Professional guidance throughout your journey</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
