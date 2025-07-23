import React, { useState, useEffect } from "react";
import axios from "axios";
import PropertyModal from "../components/PropertyModal";
import { API_ENDPOINTS } from "../config/api";
import "../components/DropdownFix.css";
import "../components/PropertiesModern.css";

export default function Properties() {
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [propertyList, setPropertyList] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

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
      const typeParam = selectedPropertyType !== 'all' ? `?type=${selectedPropertyType}` : '';
      
      axios.get(`${API_ENDPOINTS.PROPERTIES_ALL}${typeParam}`)
        .then(res => {
          console.log('Fetched all properties from database:', res.data);
          setPropertyList(res.data);
          setFilteredProperties(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching properties:', err);
          setLoading(false);
        });
    }
  }, [selectedPropertyType, selected.area]);

  // Property types for filter
  const propertyTypesFilter = [
    { value: 'all', label: 'All Properties', icon: '🏠' },
    { value: 'residential', label: 'Residential', icon: '🏡' },
    { value: 'commercial', label: 'Commercial', icon: '🏢' },
    { value: 'retail', label: 'Retail', icon: '🏪' },
    { value: 'industrial', label: 'Industrial', icon: '🏭' }
  ];

  // Fetch provinces for selected country
  useEffect(() => {
    if (selected.country) {
      console.log('Fetching provinces for country:', selected.country);
      setLoading(true);
      
      axios.get(API_ENDPOINTS.PROVINCES(selected.country))
        .then(res => {
          console.log('Provinces fetched:', res.data);
          setProvinces(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching provinces:', err);
          setLoading(false);
        });
    } else {
      setProvinces([]);
    }
  }, [selected.country]);

  // Fetch cities for selected province
  useEffect(() => {
    if (selected.province) {
      setLoading(true);
      
      axios.get(API_ENDPOINTS.CITIES(selected.province))
        .then(res => {
          setCities(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching cities:', err);
          setLoading(false);
        });
    } else {
      setCities([]);
    }
  }, [selected.province]);

  // Fetch areas for selected city
  useEffect(() => {
    if (selected.city) {
      setLoading(true);
      
      axios.get(API_ENDPOINTS.AREAS(selected.city))
        .then(res => {
          setAreas(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching areas:', err);
          setLoading(false);
        });
    } else {
      setAreas([]);
    }
  }, [selected.city]);

  // Fetch properties for selected area
  useEffect(() => {
    if (selected.area) {
      setLoading(true);
      const typeParam = selectedPropertyType !== 'all' ? `&type=${selectedPropertyType}` : '';
      
      axios.get(`${API_ENDPOINTS.PROPERTIES_BY_AREA(selected.area)}${typeParam}`)
        .then(res => {
          console.log('Properties fetched for area:', res.data);
          setPropertyList(res.data);
          setFilteredProperties(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching properties for area:', err);
          setLoading(false);
          setPropertyList([]);
          setFilteredProperties([]);
        });
    }
  }, [selected.area, selectedPropertyType]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getBadgeColor = (priceRange) => {
    if (priceRange >= 5000000) return 'badge-luxury';
    if (priceRange >= 2000000) return 'badge-premium';
    if (priceRange >= 1000000) return 'badge-mid';
    return 'badge-affordable';
  };

  const getBadgeText = (priceRange) => {
    if (priceRange >= 5000000) return 'Luxury';
    if (priceRange >= 2000000) return 'Premium';
    if (priceRange >= 1000000) return 'Executive';
    return 'Affordable';
  };

  return (
    <div className="properties-page-sleek">
      {/* Hero Section - Keep as is */}
      <div className="properties-hero-sleek">
        <div className="hero-neural-network"></div>
        <div className="hero-content-sleek">
          <div className="hero-text-sleek">
            <h1 className="properties-title-sleek">
              Find Your Perfect
              <span className="title-highlight-sleek"> Investment</span>
            </h1>
            <p className="properties-subtitle-sleek">
              Discover exceptional properties across South Africa's most prestigious locations
            </p>
            <div className="hero-stats-sleek">
              <div className="hero-stat-sleek">
                <div className="stat-content-sleek">
                  <div className="stat-number-sleek">{propertyList.length}+</div>
                  <div className="stat-label-sleek">Properties</div>
                </div>
              </div>
              <div className="hero-stat-sleek">
                <div className="stat-content-sleek">
                  <div className="stat-number-sleek">{areas.length || 25}+</div>
                  <div className="stat-label-sleek">Locations</div>
                </div>
              </div>
              <div className="hero-stat-sleek">
                <div className="stat-content-sleek">
                  <div className="stat-number-sleek">R2.5M</div>
                  <div className="stat-label-sleek">Avg. Value</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Classic Location Selector */}
      <div className="location-selector-classic">
        <div className="selector-container-classic">
          <div className="selector-header-classic">
            <h2 className="selector-title-classic">Property Location Search</h2>
            <p className="selector-subtitle-classic">Refine your search by selecting your preferred location</p>
          </div>
          
          <div className="selector-grid-classic">
            <div className="selector-item-classic">
              <label className="selector-label-classic">Country</label>
              <div className="selector-input-wrapper-classic">
                <select
                  className="selector-input-classic"
                  value={selected.country}
                  onChange={e => {
                    setSelected({ country: e.target.value, province: "", city: "", area: "", areaName: "" });
                    setProvinces([]);
                    setCities([]);
                    setAreas([]);
                    setPropertyList([]);
                    setFilteredProperties([]);
                  }}
                >
                  <option value="">Select Country</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="selector-item-classic">
              <label className="selector-label-classic">Province</label>
              <div className="selector-input-wrapper-classic">
                <select
                  className="selector-input-classic"
                  value={selected.province}
                  onChange={e => {
                    setSelected(prev => ({ ...prev, province: e.target.value, city: "", area: "", areaName: "" }));
                    setCities([]);
                    setAreas([]);
                    setPropertyList([]);
                    setFilteredProperties([]);
                  }}
                  disabled={!selected.country}
                >
                  <option value="">Select Province</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="selector-item-classic">
              <label className="selector-label-classic">City</label>
              <div className="selector-input-wrapper-classic">
                <select
                  className="selector-input-classic"
                  value={selected.city}
                  onChange={e => {
                    setSelected(prev => ({ ...prev, city: e.target.value, area: "", areaName: "" }));
                    setAreas([]);
                    setPropertyList([]);
                    setFilteredProperties([]);
                  }}
                  disabled={!selected.province}
                >
                  <option value="">Select City</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="selector-item-classic">
              <label className="selector-label-classic">Area</label>
              <div className="selector-input-wrapper-classic">
                <select
                  className="selector-input-classic"
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

      {/* Classic Property Type Filter */}
      {selected.area && (
        <div className="property-type-filter-classic">
          <div className="filter-container-classic">
            <div className="filter-header-classic">
              <h3 className="filter-title-classic">Property Categories</h3>
              <p className="filter-subtitle-classic">Filter by property type</p>
            </div>
            
            <div className="filter-options-classic">
              {propertyTypesFilter.map(type => (
                <button
                  key={type.value}
                  className={`filter-option-classic ${selectedPropertyType === type.value ? 'active' : ''}`}
                  onClick={() => setSelectedPropertyType(type.value)}
                >
                  <span className="filter-option-icon-classic">{type.icon}</span>
                  <span className="filter-option-label-classic">{type.label}</span>
                  {selectedPropertyType === type.value && (
                    <span className="filter-option-check-classic">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      )}

      {/* Properties Results - Classic Design */}
      <div className="properties-results-classic">
        {selected.area ? (
          <div className="properties-section-classic">
            <div className="results-header-classic">
              <div className="results-breadcrumb-classic">
                <span>{countries.find(c => c.id === selected.country)?.name}</span>
                {selected.province && <><span> • </span><span>{provinces.find(p => p.id === selected.province)?.name}</span></>}
                {selected.city && <><span> • </span><span>{cities.find(c => c.id === selected.city)?.name}</span></>}
                {selected.area && <><span> • </span><span className="active">{selected.areaName}</span></>}
              </div>
              <h2 className="results-title-classic">
                Properties in {selected.areaName}
              </h2>
              <div className="results-count-classic">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} available
              </div>
            </div>

            {filteredProperties.length > 0 ? (
              <div className="properties-grid-classic">
                {filteredProperties.map(property => (
                  <div key={property.id} className="property-card-classic" onClick={() => setSelectedProperty(property)}>
                    <div className="property-image-classic">
                      <img 
                        src={property.image_url} 
                        alt={property.name}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop';
                        }}
                      />
                      <div className="property-badge-classic">
                        <span className={`badge-classic ${getBadgeColor(property.cost)}`}>
                          {getBadgeText(property.cost)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="property-content-classic">
                      <h3 className="property-title-classic">{property.name}</h3>
                      <div className="property-price-classic">{formatPrice(property.cost)}</div>
                      
                      <div className="property-details-classic">
                        <div className="property-detail-classic">
                          <span className="detail-label-classic">Plot Size:</span>
                          <span className="detail-value-classic">{property.erf_size}</span>
                        </div>
                        <div className="property-detail-classic">
                          <span className="detail-label-classic">Developer:</span>
                          <span className="detail-value-classic">{property.developer || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="property-actions-classic">
                        <button className="btn-classic btn-primary-classic">
                          View Details
                        </button>
                        <button className="btn-classic btn-secondary-classic">
                          Contact Agent
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-properties-classic">
                <div className="no-properties-icon-classic">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9.5L12 4L21 9.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h3 className="no-properties-title-classic">No Properties Available</h3>
                <p className="no-properties-text-classic">
                  We're working on adding more properties to this area. Please check back soon or try a different location.
                </p>
                <button 
                  className="btn-classic btn-outline-classic"
                  onClick={() => setSelected({country: "", province: "", city: "", area: "", areaName: ""})}
                >
                  Reset Search
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="welcome-section-classic">
            <div className="welcome-content-classic">
              <div className="welcome-icon-classic">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <h2 className="welcome-title-classic">Discover Your Perfect Property</h2>
              <p className="welcome-subtitle-classic">
                Start by selecting your preferred location using the search filters above. 
                Our comprehensive database will help you find the ideal investment opportunity.
              </p>
              
              <div className="welcome-features-classic">
                <div className="welcome-feature-classic">
                  <div className="feature-icon-classic">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="feature-text-classic">
                    <h4>Premium Properties</h4>
                    <p>Curated selection of high-quality properties</p>
                  </div>
                </div>
                
                <div className="welcome-feature-classic">
                  <div className="feature-icon-classic">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="feature-text-classic">
                    <h4>Prime Locations</h4>
                    <p>Properties in South Africa's most sought-after areas</p>
                  </div>
                </div>
                
                <div className="welcome-feature-classic">
                  <div className="feature-icon-classic">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="feature-text-classic">
                    <h4>Expert Support</h4>
                    <p>Professional guidance throughout your journey</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
