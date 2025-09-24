import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { API_ENDPOINTS } from "../config/api";
import "../components/DropdownFix.css";
import "../components/PropertiesAWS.css";
import "../components/AWSComponents.css";
import "./property-list-page.css";

export default function PropertyListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [propertyList, setPropertyList] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showLocationFilters, setShowLocationFilters] = useState(false);
  const [isRestoringFilters, setIsRestoringFilters] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'Explore Areas - Digital Estate';
  }, []);

  // Simplified filter state management
  const [selected, setSelected] = useState({
    country: "", 
    province: "", 
    city: "", 
    area: "", 
    areaName: ""
  });

  // Restore filters from URL parameters, navigation state, or localStorage on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const navigationState = location.state?.filters;
    const savedFilters = localStorage.getItem('propertyFilters');
    const savedPropertyType = localStorage.getItem('propertyType');
    
    console.log('🔄 Checking filter sources:', {
      urlParams: Object.fromEntries(urlParams),
      navigationState,
      savedFilters: savedFilters ? JSON.parse(savedFilters) : null
    });
    
    setIsRestoringFilters(true);
    
    // Priority: URL parameters > Navigation state > localStorage
    let filtersToRestore = {};
    let propertyTypeToRestore = 'all';
    
    // First check URL parameters (highest priority - browser navigation)
    if (urlParams.toString()) {
      console.log('🔄 Restoring filters from URL parameters');
      filtersToRestore = {
        country: urlParams.get('country') || '',
        province: urlParams.get('province') || '',
        city: urlParams.get('city') || '',
        area: urlParams.get('area') || '',
        areaName: urlParams.get('area') || ''
      };
      propertyTypeToRestore = urlParams.get('type') || 'all';
    }
    // Then check navigation state (back from property details)
    else if (navigationState) {
      console.log('🔄 Restoring filters from navigation state:', navigationState);
      filtersToRestore = {
        country: navigationState.country || '',
        province: navigationState.province || '',
        city: navigationState.city || '',
        area: navigationState.area || '',
        areaName: navigationState.areaName || navigationState.area || ''
      };
      propertyTypeToRestore = navigationState.propertyType || 'all';
    }
    // Finally fallback to localStorage
    else if (savedFilters) {
      console.log('🔄 Restoring filters from localStorage');
      filtersToRestore = JSON.parse(savedFilters);
      propertyTypeToRestore = savedPropertyType || 'all';
    }
    
    // Apply the restored filters
    if (Object.keys(filtersToRestore).length > 0) {
      setSelected(filtersToRestore);
    }
    setSelectedPropertyType(propertyTypeToRestore);
    
    // Reset the restoration flag after a short delay
    setTimeout(() => setIsRestoringFilters(false), 100);
  }, [location.search, location.state]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('propertyFilters', JSON.stringify(selected));
    localStorage.setItem('propertyType', selectedPropertyType);
    console.log('💾 Saved filters to localStorage:', selected, selectedPropertyType);
  }, [selected, selectedPropertyType]);

  // Update browser URL when filters change (for proper browser history)
  useEffect(() => {
    if (!isRestoringFilters) { // Only update URL when user actively changes filters
      const searchParams = new URLSearchParams();
      
      if (selected.country) searchParams.set('country', selected.country);
      if (selected.province) searchParams.set('province', selected.province);
      if (selected.city) searchParams.set('city', selected.city);
      if (selected.area) searchParams.set('area', selected.area);
      if (selectedPropertyType !== 'all') searchParams.set('type', selectedPropertyType);
      
      const newUrl = `/properties${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      
      // Use replace instead of push to avoid creating too many history entries
      if (window.location.pathname + window.location.search !== newUrl) {
        navigate(newUrl, { replace: true });
        console.log('🔄 Updated browser URL:', newUrl);
      }
    }
  }, [selected, selectedPropertyType, isRestoringFilters]);

  // Enhanced navigation function that preserves filters and browser history
  const navigateToProperty = (propertyId) => {
    console.log('🔍 Navigating to property ID:', propertyId);
    console.log('🔍 Current filters being saved:', { selected, selectedPropertyType });
    
    // Create the current state to preserve filters and location
    const currentFilters = {
      ...selected,
      propertyType: selectedPropertyType
    };
    
    // Build current URL with query parameters for browser history
    const searchParams = new URLSearchParams();
    if (selected.country) searchParams.set('country', selected.country);
    if (selected.province) searchParams.set('province', selected.province);
    if (selected.city) searchParams.set('city', selected.city);
    if (selected.area) searchParams.set('area', selected.area);
    if (selectedPropertyType !== 'all') searchParams.set('type', selectedPropertyType);
    
    const currentUrl = `/properties${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    
    // Navigate with state preservation for back navigation
    navigate(`/property/${propertyId}`, {
      state: {
        filters: currentFilters,
        returnUrl: currentUrl,
        fromPropertiesPage: true
      }
    });
  };

  // Debug: Test API connection on mount
  useEffect(() => {
    console.log('🔧 Testing API connection...');
    axios.get(API_ENDPOINTS.API_PROPERTIES)
      .then(res => {
        console.log('✅ API Connection test successful:', res.status);
        console.log('✅ Response data:', res.data);
      })
      .catch(err => {
        console.error('❌ API Connection test failed:', err);
        console.error('❌ Error details:', err.response?.data || err.message);
      });
  }, []);

  // Fetch all countries on mount
  useEffect(() => {
    console.log('🌍 Loading properties and basic location data...');
    setLoading(true);
    
    // For PostgreSQL setup, we'll skip the complex location hierarchy
    // and populate the dropdowns from the actual property data
    loadPropertiesAndPopulateFilters();
  }, []);

  // Load properties and populate filter dropdowns from actual data
  const loadPropertiesAndPopulateFilters = async () => {
    try {
      console.log('🔍 Fetching properties from PostgreSQL...');
      const response = await axios.get(API_ENDPOINTS.API_PROPERTIES);
      const properties = response.data.properties || response.data;
      
      console.log('✅ Properties loaded:', properties.length);
      setPropertyList(properties);
      setFilteredProperties(properties);
      
      // Extract unique values for filter dropdowns
      // Since all properties are in South Africa, set that as the only country
      const uniqueCountries = [{ id: "south-africa", name: "South Africa" }];
      const uniqueProvinces = [...new Set(properties.map(p => p.province).filter(Boolean))];
      const uniqueCities = [...new Set(properties.map(p => p.city).filter(Boolean))];
      const uniqueAreas = [...new Set(properties.map(p => p.suburb).filter(Boolean))];
      
      // Populate dropdown data with actual property data
      setCountries(uniqueCountries);
      setProvinces(uniqueProvinces.map((name, index) => ({ id: name, name })));
      setCities(uniqueCities.map((name, index) => ({ id: name, name })));
      setAreas(uniqueAreas.map((name, index) => ({ id: name, name })));
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Error loading properties:', err);
      setLoading(false);
    }
  };

  // Simplified location filtering using actual property data
  useEffect(() => {
    if (selected.country === "south-africa" && propertyList.length > 0) {
      // When South Africa is selected, show all available provinces from property data
      const uniqueProvinces = [...new Set(propertyList.map(p => p.province).filter(Boolean))];
      setProvinces(uniqueProvinces.map(name => ({ id: name, name })));
      
      // Only clear dependent selections when country changes (not when propertyList changes)
      // and only if we're not restoring filters and the current province is not valid
      if (!isRestoringFilters && selected.province && 
          !uniqueProvinces.includes(selected.province)) {
        console.log('🔄 Clearing invalid province selection');
        setCities([]);
        setAreas([]);
        setSelected(prev => ({ ...prev, province: "", city: "", area: "", areaName: "" }));
      }
    }
  }, [selected.country, propertyList, isRestoringFilters, selected.province]);

  // Filter cities when province changes
  useEffect(() => {
    if (selected.province && propertyList.length > 0) {
      // Filter cities based on the selected province (using property data)
      const relevantProperties = propertyList.filter(p => p.province === selected.province);
      const uniqueCities = [...new Set(relevantProperties.map(p => p.city).filter(Boolean))];
      setCities(uniqueCities.map(name => ({ id: name, name })));
      
      // Only clear city selection if it's invalid for the current province
      if (!isRestoringFilters && selected.city && 
          !uniqueCities.includes(selected.city)) {
        console.log('🔄 Clearing invalid city selection');
        setAreas([]);
        setSelected(prev => ({ ...prev, city: "", area: "", areaName: "" }));
      }
    }
  }, [selected.province, propertyList, isRestoringFilters, selected.city]);

  // Filter areas when city changes
  useEffect(() => {
    if (selected.city && propertyList.length > 0) {
      // Filter areas (suburbs) based on the selected city (using property data)
      const relevantProperties = propertyList.filter(p => p.city === selected.city);
      const uniqueAreas = [...new Set(relevantProperties.map(p => p.suburb).filter(Boolean))];
      setAreas(uniqueAreas.map(name => ({ id: name, name })));
      
      // Only clear area selection if it's invalid for the current city
      if (!isRestoringFilters && selected.area && 
          !uniqueAreas.includes(selected.area)) {
        console.log('🔄 Clearing invalid area selection');
        setSelected(prev => ({ ...prev, area: "", areaName: "" }));
      }
    }
  }, [selected.city, propertyList, isRestoringFilters, selected.area]);

  // Filter properties based on current selections
  useEffect(() => {
    let filtered = [...propertyList];
    
    console.log('🔍 Filtering properties. Total properties:', propertyList.length);
    console.log('🔍 Current filters:', { province: selected.province, city: selected.city, area: selected.area, type: selectedPropertyType });
    
    // Filter by province
    if (selected.province) {
      filtered = filtered.filter(p => p.province === selected.province);
      console.log('🔍 After province filter:', filtered.length);
    }
    
    // Filter by city
    if (selected.city) {
      filtered = filtered.filter(p => p.city === selected.city);
      console.log('🔍 After city filter:', filtered.length);
    }
    
    // Filter by area/suburb
    if (selected.area) {
      filtered = filtered.filter(p => p.suburb === selected.area);
      console.log('🔍 After area filter:', filtered.length);
    }
    
    // Filter by property type
    if (selectedPropertyType !== 'all') {
      filtered = filtered.filter(property => 
        property.type && property.type.toLowerCase().includes(selectedPropertyType.toLowerCase())
      );
      console.log('🔍 After type filter:', filtered.length);
    }
    
    console.log('🔍 Final filtered properties:', filtered.length);
    setFilteredProperties(filtered);
  }, [selected.province, selected.city, selected.area, selectedPropertyType, propertyList]);

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
      {/* Hero Section */}
      <div className="hero-section-premium">
        <div className="hero-overlay"></div>
        <div className="hero-content-premium">
          <div className="hero-text-premium">
            <h1 className="hero-title-premium">
              Find Your Perfect <span className="hero-accent">Investment</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="properties-header-modern">
        <div className="header-content-modern">
          <h2 className="page-title-modern">Discover Market Intelligence</h2>
          <p className="page-subtitle-modern">
            Explore neighborhoods, analyze market data, and uncover investment opportunities across South Africa
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section-modern">
        <div className="filters-container-modern">
          <h2 className="filters-title-modern">Explore Markets by Location</h2>
          
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

      {/* Area Insights Section */}
      {selected.area && selected.areaName && (
        <div className="area-insights-section">
          <div className="area-header">
            <div className="area-title-container">
              <h2 className="area-title">
                Exploring: <span className="area-name">{selected.areaName}</span>
              </h2>
              <button 
                className="market-insights-link"
                onClick={() => navigate('/research', { 
                  state: { 
                    area: selected.areaName,
                    province: selected.province,
                    city: selected.city
                  }
                })}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 12l3-3 2 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="18" cy="6" r="2" fill="currentColor"/>
                </svg>
                Market Insights
              </button>
            </div>
          </div>

          {/* Area Data Display */}
          <div className="area-data-grid">
            <div className="area-data-card">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="data-content">
                <div className="data-label">Average Property Price</div>
                <div className="data-value">R2.3M</div>
                <div className="data-trend positive">+12.5% YoY</div>
              </div>
            </div>

            <div className="area-data-card">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="data-content">
                <div className="data-label">Average Rental Yield</div>
                <div className="data-value">8.2%</div>
                <div className="data-trend positive">+0.3% YoY</div>
              </div>
            </div>

            <div className="area-data-card">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="data-content">
                <div className="data-label">Vacancy Rate</div>
                <div className="data-value">4.1%</div>
                <div className="data-trend negative">+1.2% YoY</div>
              </div>
            </div>

            <div className="area-data-card">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="data-content">
                <div className="data-label">Crime Index Score</div>
                <div className="data-value">32/100</div>
                <div className="data-trend positive">-5.2% YoY</div>
              </div>
            </div>

            <div className="area-data-card">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="data-content">
                <div className="data-label">Population Growth Rate</div>
                <div className="data-value">2.8%</div>
                <div className="data-trend positive">+0.4% YoY</div>
              </div>
            </div>

            <div className="area-data-card">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="data-content">
                <div className="data-label">Planned Development Count</div>
                <div className="data-value">12</div>
                <div className="data-trend positive">+3 projects</div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <div key={property.id} className="property-card-modern" onClick={() => navigateToProperty(property.id)}>
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
