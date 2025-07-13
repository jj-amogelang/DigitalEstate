import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const [selected, setSelected] = useState({
    country: "", province: "", city: "", area: "", areaName: ""
  });

  const navigate = useNavigate();

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

  // Fetch property types on mount
  useEffect(() => {
    axios.get(API_ENDPOINTS.PROPERTY_TYPES)
      .then(res => setPropertyTypes(res.data))
      .catch(err => console.error('Error fetching property types:', err));
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
    { value: 'residential', label: 'Residential', icon: '�' },
    { value: 'commercial', label: 'Commercial', icon: '�' },
    { value: 'retail', label: 'Retail', icon: '�' },
    { value: 'industrial', label: 'Industrial', icon: '�' }
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
      console.log('🏠 Fetching properties for area:', selected.area);
      setLoading(true);
      
      const typeParam = selectedPropertyType !== 'all' ? `?type=${selectedPropertyType}` : '';
      
      axios.get(`${API_ENDPOINTS.PROPERTIES_BY_AREA(selected.area)}${typeParam}`)
        .then(res => {
          console.log('✅ Properties fetched successfully:', res.data);
          setPropertyList(res.data);
          setFilteredProperties(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('❌ Error fetching properties:', err);
          setLoading(false);
        });
    } else {
      // If no area selected, fetch all properties
      if (!selected.area && !selected.city && !selected.province && !selected.country) {
        const typeParam = selectedPropertyType !== 'all' ? `?type=${selectedPropertyType}` : '';
        
        axios.get(`${API_ENDPOINTS.PROPERTIES_ALL}${typeParam}`)
          .then(res => {
            console.log('✅ All properties fetched:', res.data);
            setPropertyList(res.data);
            setFilteredProperties(res.data);
          })
          .catch(err => {
            console.error('❌ Error fetching all properties:', err);
          });
      } else {
        setPropertyList([]);
        setFilteredProperties([]);
      }
    }
  }, [selected.area, selectedPropertyType]);

  // Update filtered properties when propertyList changes (no additional filtering needed since API handles area filtering)
  useEffect(() => {
    console.log('Updating filtered properties. PropertyList length:', propertyList.length);
    setFilteredProperties(propertyList);
  }, [propertyList]);

  // Format price function
  const formatPrice = (price) => {
    if (!price) return 'Price on request';
    return `R ${parseInt(price).toLocaleString()}`;
  };

  const handlePropertyTypeChange = (type) => {
    setSelectedPropertyType(type);
  };

  return (
    <div className="properties-page-sleek">
      {/* Ultra-Sleek Hero Section */}
      <div className="properties-hero-sleek">
        <div className="hero-neural-network"></div>
        <div className="hero-gradient-mesh"></div>
        <div className="hero-overlay-sleek">
          <div className="hero-content-sleek">
            <div className="properties-badge-sleek">
              <div className="badge-shimmer"></div>
              <div className="badge-icon-sleek">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                </svg>
              </div>
              <span>Premium Property Collection</span>
            </div>
            <h1 className="properties-title-sleek">
              Find Your Perfect
              <span className="title-highlight-sleek"> Investment</span>
            </h1>
            <p className="properties-subtitle-sleek">
              Discover exceptional properties across South Africa's most prestigious locations 
              with our advanced search and filtering technology
            </p>
            <div className="hero-actions-sleek">
              <button className="btn-explore-sleek">
                <div className="btn-content">
                  <span>Start Exploring</span>
                  <div className="btn-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                </div>
                <div className="btn-glow"></div>
              </button>
            </div>
            <div className="hero-stats-sleek">
              <div className="hero-stat-sleek">
                <div className="stat-icon-sleek">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9.5L12 4L21 9.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="stat-content-sleek">
                  <div className="stat-number-sleek">{propertyList.length}+</div>
                  <div className="stat-label-sleek">Premium Properties</div>
                </div>
                <div className="stat-glow"></div>
              </div>
              <div className="hero-stat-sleek">
                <div className="stat-icon-sleek">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="stat-content-sleek">
                  <div className="stat-number-sleek">{areas.length || 25}+</div>
                  <div className="stat-label-sleek">Prime Locations</div>
                </div>
                <div className="stat-glow"></div>
              </div>
              <div className="hero-stat-sleek">
                <div className="stat-icon-sleek">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="stat-content-sleek">
                  <div className="stat-number-sleek">R2.5M</div>
                  <div className="stat-label-sleek">Avg. Property Value</div>
                </div>
                <div className="stat-glow"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-scroll-sleek">
          <div className="scroll-text-sleek">Explore Properties Below</div>
          <div className="scroll-indicator-sleek">
            <div className="scroll-line"></div>
            <div className="scroll-dot"></div>
          </div>
        </div>
      </div>

      {/* Ultra-Sleek Location Selector */}
      <div className="location-selector-sleek">
        <div className="selector-container-sleek">
          <div className="selector-header-sleek">
            <div className="selector-icon-sleek">
              <div className="icon-container">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <div className="icon-pulse"></div>
              </div>
            </div>
            <div className="selector-text-sleek">
              <h2 className="selector-title-sleek">Explore by Location</h2>
              <p className="selector-subtitle-sleek">Use our intelligent location finder to discover properties in your preferred area</p>
              <div className="selector-progress-sleek">
                <div className={`progress-step-sleek ${selected.country ? 'active completed' : 'active'}`}>
                  <div className="step-dot"></div>
                  <span>Country</span>
                </div>
                <div className={`progress-step-sleek ${selected.province ? 'active' : ''}`}>
                  <div className="step-dot"></div>
                  <span>Province</span>
                </div>
                <div className={`progress-step-sleek ${selected.city ? 'active' : ''}`}>
                  <div className="step-dot"></div>
                  <span>City</span>
                </div>
                <div className={`progress-step-sleek ${selected.area ? 'active' : ''}`}>
                  <div className="step-dot"></div>
                  <span>Area</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="selector-grid-sleek">
            <div className="selector-item-sleek">
              <div className="selector-card">
                <label className="selector-label-sleek">
                  <div className="label-icon-sleek">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <span>Country</span>
                </label>
                <div className="selector-input-wrapper">
                  <select
                    className="selector-input-sleek debug"
                    value={selected.country}
                    onChange={e => {
                      console.log('🏁 Country dropdown changed:', e.target.value);
                      setSelected({ country: e.target.value, province: "", city: "", area: "", areaName: "" });
                      // Reset dependent arrays
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
                  <div className="selector-arrow-sleek">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                </div>
                <div className="card-glow"></div>
              </div>
            </div>

            <div className="selector-item-sleek">
              <div className="selector-card">
                <label className="selector-label-sleek">
                  <div className="label-icon-sleek">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 9.5L12 4L21 9.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <span>Province</span>
                </label>
                <div className="selector-input-wrapper">
                  <select
                    className="selector-input-sleek"
                    value={selected.province}
                    onChange={e => {
                      console.log('Province selected:', e.target.value);
                      setSelected(prev => ({ ...prev, province: e.target.value, city: "", area: "", areaName: "" }));
                      // Reset dependent arrays
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
                  <div className="selector-arrow-sleek">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                </div>
                <div className="card-glow"></div>
              </div>
            </div>

            <div className="selector-item-sleek">
              <div className="selector-card">
                <label className="selector-label-sleek">
                  <div className="label-icon-sleek">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <span>City</span>
                </label>
                <div className="selector-input-wrapper">
                  <select
                    className="selector-input-sleek"
                    value={selected.city}
                    onChange={e => {
                      console.log('City selected:', e.target.value);
                      setSelected(prev => ({ ...prev, city: e.target.value, area: "", areaName: "" }));
                      // Reset dependent arrays
                      setAreas([]);
                      setPropertyList([]);
                      setFilteredProperties([]);
                    }}
                    disabled={!selected.province}
                  >
                    <option value="">Select City</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="selector-arrow-sleek">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                </div>
                <div className="card-glow"></div>
              </div>
            </div>

            <div className="selector-item-sleek">
              <div className="selector-card">
                <label className="selector-label-sleek">
                  <div className="label-icon-sleek">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <span>Area</span>
                </label>
                <div className="selector-input-wrapper">
                  <select
                    className="selector-input-sleek"
                    value={selected.area}
                    onChange={e => {
                      const selectedAreaId = e.target.value;
                      const selectedAreaName = areas.find(a => a.id == selectedAreaId)?.name || '';
                      console.log('Area selected:', selectedAreaId, selectedAreaName);
                      setSelected(prev => ({ ...prev, area: selectedAreaId, areaName: selectedAreaName }));
                      // Reset properties to fetch fresh data
                      setPropertyList([]);
                      setFilteredProperties([]);
                    }}
                    disabled={!selected.city}
                  >
                    <option value="">Select Area</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <div className="selector-arrow-sleek">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                </div>
                <div className="card-glow"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remove debug component for production */}

      {/* Modern Property Type Filter */}
      {selected.area && (
        <div className="property-type-filter-modern">
          <div className="filter-container-modern">
            <div className="filter-header-modern">
              <div className="filter-icon-modern">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 21v-4a2 2 0 012-2h2a2 2 0 012 2v4" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="filter-text-modern">
                <h3 className="filter-title-modern">Filter by Property Type</h3>
                <p className="filter-subtitle-modern">Refine your search by selecting a specific property category</p>
              </div>
            </div>
            
            <div className="filter-options-modern">
              {propertyTypesFilter.map(type => (
                <button
                  key={type.value}
                  className={`filter-option-modern ${selectedPropertyType === type.value ? 'active' : ''}`}
                  onClick={() => setSelectedPropertyType(type.value)}
                >
                  <div className="filter-option-content">
                    <div className="filter-option-icon">{type.icon}</div>
                    <span className="filter-option-label">{type.label}</span>
                    {selectedPropertyType === type.value && (
                      <div className="filter-option-check">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </div>
                    )}
                  </div>
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

      {/* Properties Results */}
      <div className="properties-results-container">
        {selected.area ? (
          <div className="properties-section">
            <div className="results-header-modern">
              <div className="results-header-content">
                <div className="results-breadcrumb">
                  <span className="breadcrumb-item">{selected.country && countries.find(c => c.id === selected.country)?.name}</span>
                  {selected.province && <><span className="breadcrumb-separator">•</span><span className="breadcrumb-item">{provinces.find(p => p.id === selected.province)?.name}</span></>}
                  {selected.city && <><span className="breadcrumb-separator">•</span><span className="breadcrumb-item">{cities.find(c => c.id === selected.city)?.name}</span></>}
                  {selected.area && <><span className="breadcrumb-separator">•</span><span className="breadcrumb-item active">{selected.areaName}</span></>}
                </div>
                <h2 className="results-title-modern">
                  Premium Properties in <span className="area-highlight-modern">{selected.areaName}</span>
                </h2>
                <div className="results-meta">
                  <div className="results-count-modern">
                    <span className="count-number">{filteredProperties.length}</span>
                    <span className="count-text">{filteredProperties.length === 1 ? 'property' : 'properties'} available</span>
                  </div>
                  <div className="results-sorting">
                    <button className="sort-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M7 12h10m-7 6h4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Sort by Price
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {filteredProperties.length > 0 ? (
              <div className="properties-grid-modern">
                {filteredProperties.map(property => (
                  <div
                    key={property.id}
                    onClick={() => setSelectedProperty(property)}
                    className="property-card-modern"
                    data-property-type={property.property_type}
                  >
                    <div className="property-image-container">
                      <img 
                        src={property.image_url} 
                        alt={property.name} 
                        className="property-image-modern"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop&crop=center';
                        }}
                      />
                      <div className="property-badges">
                        <div className="property-type-badge">
                          {property.property_type || 'Premium'}
                        </div>
                        <div className="property-status-badge">
                          Available
                        </div>
                      </div>
                      <div className="property-favorite-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.8"/>
                        </svg>
                      </div>
                      <div className="property-hover-overlay">
                        <button className="quick-view-btn">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Quick View
                        </button>
                      </div>
                    </div>
                    
                    <div className="property-content-modern">
                      <div className="property-price-modern">
                        <span className="price-amount">{formatPrice(property.cost)}</span>
                        <span className="price-label">Total Price</span>
                      </div>
                      
                      <h3 className="property-title-modern">{property.name}</h3>
                      
                      <div className="property-location-modern">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                        <span>{property.location || `${selected.areaName}, ${cities.find(c => c.id === selected.city)?.name}`}</span>
                      </div>
                      
                      <div className="property-features-modern">
                        <div className="feature-item-modern">
                          <div className="feature-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                          </div>
                          <div className="feature-text">
                            <span className="feature-label">Size</span>
                            <span className="feature-value">{property.size || property.erf_size || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="feature-item-modern">
                          <div className="feature-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M3 9.5L12 4L21 9.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                          </div>
                          <div className="feature-text">
                            <span className="feature-label">Developer</span>
                            <span className="feature-value">{property.developer || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="property-actions-modern">
                        <button className="action-btn primary">
                          <span>View Details</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                        <button className="action-btn secondary">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                          Contact
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-properties-modern">
                <div className="no-properties-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9.5L12 4L21 9.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h3 className="no-properties-title">No properties available</h3>
                <p className="no-properties-text">We're working on adding more properties to this area. Check back soon or try a different location.</p>
                <button className="reset-search-btn" onClick={() => setSelected({country: "", province: "", city: "", area: "", areaName: ""})}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Reset Search
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="welcome-section">
            <div className="welcome-content">
              <div className="welcome-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <h2 className="welcome-title">Discover Your Perfect Property</h2>
              <p className="welcome-subtitle">Start by selecting your preferred location using the filters above. Our advanced search system will help you find the ideal investment opportunity.</p>
              <div className="welcome-features">
                <div className="welcome-feature">
                  <div className="feature-icon-welcome">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="feature-content-welcome">
                    <h4>Premium Properties</h4>
                    <p>Curated selection of high-quality properties</p>
                  </div>
                </div>
                <div className="welcome-feature">
                  <div className="feature-icon-welcome">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="feature-content-welcome">
                    <h4>Prime Locations</h4>
                    <p>Properties in South Africa's most sought-after areas</p>
                  </div>
                </div>
                <div className="welcome-feature">
                  <div className="feature-icon-welcome">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="feature-content-welcome">
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
