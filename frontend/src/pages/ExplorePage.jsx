import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { API_ENDPOINTS } from "../config/api";
import areaDataService from "../services/areaDataService";
import AWSAlert from "../components/AWSAlert";
import "../components/styles/DropdownFix.css";
import "../components/styles/PropertiesAWS.css";
import "../components/styles/AWSComponents.css";
import "./styles/explore-page.css";
import MetricTooltip from "../components/MetricTooltip";
import metricGlossary from "../components/metricGlossary";

export default function ExplorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [propertyList, setPropertyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRestoringFilters, setIsRestoringFilters] = useState(false);
  // Track previous selections to avoid clearing on initial load or same-value assignments
  const prevCountryRef = useRef("");
  const prevProvinceRef = useRef("");
  const autoSelectingRef = useRef(false); // guard against clearing when auto-selecting
  const prevCityRef = useRef(""); // track previous city to avoid unintended clears

  // New state for area data from API
  const [selectedAreaDetails, setSelectedAreaDetails] = useState(null);
  const [areaStatistics, setAreaStatistics] = useState(null);
  const [areaLatestMetrics, setAreaLatestMetrics] = useState(null);
  const [areaImages, setAreaImages] = useState([]);
  const [loadingAreaData, setLoadingAreaData] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isRefreshingMV, setIsRefreshingMV] = useState(false);

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
    
    console.log('🔄 Checking filter sources:', {
      urlParams: Object.fromEntries(urlParams),
      navigationState,
      savedFilters: savedFilters ? JSON.parse(savedFilters) : null
    });
    
    setIsRestoringFilters(true);
    
    // Priority: URL parameters > Navigation state > localStorage
    let filtersToRestore = {};
    
    // First check URL parameters (highest priority - browser navigation)
    if (urlParams.toString()) {
      console.log('🔄 Restoring filters from URL parameters');
      filtersToRestore = {
        country: urlParams.get('country') || '',
        province: urlParams.get('province') || '',
        city: urlParams.get('city') || '',
        area: urlParams.get('area') || '',
        // Don't assume the URL 'area' param is a name; let UI derive name later
        areaName: ''
      };
    }
    // Then check navigation state (back from property details)
    else if (navigationState) {
      console.log('🔄 Restoring filters from navigation state:', navigationState);
      filtersToRestore = {
        country: navigationState.country || '',
        province: navigationState.province || '',
        city: navigationState.city || '',
        area: navigationState.area || '',
        // Prefer explicit areaName if present; otherwise derive later
        areaName: navigationState.areaName || ''
      };
    }
    // Skip localStorage restoration to avoid conflicts with manual selections
    
    // Apply the restored filters only if they exist
    if (Object.keys(filtersToRestore).length > 0 && (filtersToRestore.country || filtersToRestore.province)) {
      console.log('🔄 Applying restored filters:', filtersToRestore);
      setSelected(filtersToRestore);
    }
    
    // Reset the restoration flag after a longer delay to ensure all effects complete
    setTimeout(() => {
      console.log('✅ Filter restoration complete, enabling manual selections');
      setIsRestoringFilters(false);
    }, 500);
  }, [location.search, location.state]);

  // Save filters to localStorage whenever they change (but not during restoration)
  useEffect(() => {
    if (!isRestoringFilters && selected.country) {
      localStorage.setItem('propertyFilters', JSON.stringify(selected));
      console.log('💾 Saved filters to localStorage:', selected);
    }
  }, [selected, isRestoringFilters]);

  // Update browser URL when filters change (for proper browser history)
  useEffect(() => {
    if (!isRestoringFilters && selected.country) { // Only update URL when user actively changes filters
      const searchParams = new URLSearchParams();
      
      if (selected.country) searchParams.set('country', selected.country);
      if (selected.province) searchParams.set('province', selected.province);
      if (selected.city) searchParams.set('city', selected.city);
      if (selected.area) searchParams.set('area', selected.area);
      
      const newUrl = `/properties${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      
      console.log('🔗 Considering URL update:', {
        currentUrl: window.location.pathname + window.location.search,
        newUrl,
        selected,
        isRestoringFilters
      });
      
      // Use replace instead of push to avoid creating too many history entries
      if (window.location.pathname + window.location.search !== newUrl) {
        navigate(newUrl, { replace: true });
        console.log('🔄 Updated browser URL:', newUrl);
      }
    } else {
      console.log('⏸️ Skipping URL update - restoring filters or no country selected');
    }
  }, [selected, isRestoringFilters, navigate]);

  // Debug: Test area API connection on mount
  useEffect(() => {
    console.log('🔧 Testing Area API connection...');
    // Test with a simple area API endpoint instead of properties
    areaDataService.getCountries()
      .then(countries => {
        console.log('✅ Area API Connection test successful');
        console.log('✅ Countries data:', countries);
      })
      .catch(err => {
        console.error('❌ Area API Connection test failed:', err);
      });
  }, []);

  // Load countries from area API on mount
  useEffect(() => {
    console.log('🌍 Loading countries from area API...');
    loadCountriesFromAPI();
  }, []);

  // Admin: trigger MV refresh
  const handleRefreshMetrics = async () => {
    try {
      setIsRefreshingMV(true);
      const res = await areaDataService.refreshMaterializedViews();
      // Clear selections so the user can choose afresh
      setSelected({ country: '', province: '', city: '', area: '', areaName: '' });
      setProvinces([]);
      setCities([]);
      setAreas([]);
      setSelectedAreaDetails(null);
      setAreaStatistics(null);
      setAreaImages([]);
      setAreaLatestMetrics(null);
      setAlert({ type: 'success', title: 'Metrics refreshed', message: (res && res.actions) ? res.actions.join(', ') : 'Refresh triggered' });
    } catch (e) {
      setAlert({ type: 'error', title: 'Refresh failed', message: e.message || 'Unable to refresh materialized views' });
    } finally {
      setIsRefreshingMV(false);
    }
  };

  // Load countries from area API
  const loadCountriesFromAPI = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching countries from area API...');
      const countriesData = await areaDataService.getCountries();
      
      console.log('✅ Countries loaded from API:', countriesData);
      setCountries(countriesData || []);
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Error loading countries from API:', err);
      setAlert({ type: 'error', title: 'Failed to load countries', message: err.message || 'Check backend API' });
      // Fallback to hardcoded South Africa if API fails
      setCountries([{ id: 1, name: "South Africa" }]);
      setLoading(false);
    }
  };

  // Load properties for display (separate from location filtering)
  const loadPropertiesForDisplay = async () => {
    try {
      console.log('🔍 Fetching properties for display...');
      const response = await axios.get(API_ENDPOINTS.API_PROPERTIES);
      const properties = response.data.properties || response.data;
      
      console.log('✅ Properties loaded for display:', properties.length);
      setPropertyList(properties);
    } catch (err) {
      console.error('❌ Error loading properties for display:', err);
      console.log('ℹ️ Note: Properties endpoint not available on area API server');
      console.log('🔄 Using mock property data for demonstration');
      
      // Create mock property data based on our premium areas for demonstration
      const mockProperties = [
        {
          id: 1,
          title: "Luxury Penthouse in Sandton",
          price: 2800000,
          suburb: "Sandton",
          city: "Johannesburg", 
          province: "Gauteng",
          bedrooms: 3,
          bathrooms: 2,
          area: 150
        },
        {
          id: 2,
          title: "Sea View Villa in Camps Bay",
          price: 8500000,
          suburb: "Camps Bay",
          city: "Cape Town",
          province: "Western Cape", 
          bedrooms: 4,
          bathrooms: 3,
          area: 200
        },
        {
          id: 3,
          title: "Beachfront Apartment in Umhlanga",
          price: 3200000,
          suburb: "Umhlanga",
          city: "Umhlanga",
          province: "KwaZulu-Natal",
          bedrooms: 2,
          bathrooms: 2,
          area: 120
        }
      ];
      
      setPropertyList(mockProperties);
    }
  };

  // Load provinces when country changes (using area API)
  useEffect(() => {
    if (selected.country) {
      console.log('🌍 Country changed to:', selected.country, 'Restoring filters:', isRestoringFilters);
      loadProvincesFromAPI(selected.country);
      
      // Only clear dependent selections when country changes manually (not during restoration)
      if (!isRestoringFilters) {
        const prevCountry = prevCountryRef.current;
        if (prevCountry && prevCountry !== selected.country) {
          console.log('🔄 Country actually changed from', prevCountry, 'to', selected.country, '- clearing dependent selections');
          setCities([]);
          setAreas([]);
          setSelected(prev => ({ ...prev, province: "", city: "", area: "", areaName: "" }));
        } else if (!prevCountry) {
          console.log('🆕 Initial country selection – not clearing existing (already empty)');
        } else {
          console.log('♻️ Country value re-applied without change – skipping clear');
        }
      } else {
        console.log('⏸️ Skipping clear during filter restoration');
      }
      prevCountryRef.current = selected.country;
    }
  }, [selected.country, isRestoringFilters]);

  // Load provinces from area API
  const loadProvincesFromAPI = async (countryId) => {
    try {
      console.log('🔍 Fetching provinces for country:', countryId);
      const provincesData = await areaDataService.getProvinces(countryId);
      
      console.log('✅ Provinces loaded from API:', provincesData);
      setProvinces(provincesData || []);
      // Auto-select if only one province and user hasn't chosen yet
      if (!isRestoringFilters && provincesData && provincesData.length === 1 && !selected.province) {
        autoSelectingRef.current = true;
        const only = provincesData[0];
        console.log('🤖 Auto-selecting sole province:', only.id);
        setSelected(prev => ({ ...prev, province: only.id }));
        setTimeout(() => { autoSelectingRef.current = false; }, 0);
      }
    } catch (err) {
      console.error('❌ Error loading provinces from API:', err);
      setAlert({ type: 'error', title: 'Failed to load provinces', message: err.message || 'Try a different country' });
      setProvinces([]);
    }
  };

  // Load cities when province changes (using area API)
  useEffect(() => {
    if (selected.province) {
      console.log('🏛️ Province changed to:', selected.province, 'Restoring filters:', isRestoringFilters);
      loadCitiesFromAPI(selected.province);
      
      // Only clear dependent selections when province changes manually (not during restoration)
      if (!isRestoringFilters && !autoSelectingRef.current) {
        const prevProvince = prevProvinceRef.current;
        if (prevProvince && prevProvince !== selected.province) {
          console.log('🔄 Province actually changed from', prevProvince, 'to', selected.province, '- clearing its dependents');
          setAreas([]);
          setSelected(prev => ({ ...prev, city: "", area: "", areaName: "" }));
        } else if (!prevProvince) {
          console.log('🆕 Initial province selection – not clearing (already empty dependents)');
        } else {
          console.log('♻️ Province value re-applied without change – skipping clear');
        }
      } else if (autoSelectingRef.current) {
        console.log('🤖 Auto-selected province – skipping dependent clearing');
      } else {
        console.log('⏸️ Skipping clear during filter restoration');
      }
      prevProvinceRef.current = selected.province;
    }
  }, [selected.province, isRestoringFilters]);

  // Load cities from area API
  const loadCitiesFromAPI = async (provinceId) => {
    try {
      console.log('🔍 Fetching cities for province:', provinceId);
      const citiesData = await areaDataService.getCities(provinceId);
      
      console.log('✅ Cities loaded from API:', citiesData);
      setCities(citiesData || []);
    } catch (err) {
      console.error('❌ Error loading cities from API:', err);
      setAlert({ type: 'error', title: 'Failed to load cities', message: err.message || 'Try a different province' });
      setCities([]);
    }
  };

  // Load areas when city changes (using area API), only clear if the city actually changed
  useEffect(() => {
    if (selected.city) {
      const previousCity = prevCityRef.current;
      const cityChanged = previousCity && previousCity !== selected.city;
      if (!previousCity) {
        console.log('🏙️ Initial city selection:', selected.city);
      } else if (cityChanged) {
        console.log('🏙️ City changed from', previousCity, 'to', selected.city);
      } else {
        console.log('♻️ City value re-applied (no change):', selected.city);
      }
      loadAreasFromAPI(selected.city);
      if (cityChanged && !isRestoringFilters) {
        console.log('🔄 Clearing area selection due to actual city change');
        setSelected(prev => ({ ...prev, area: "", areaName: "" }));
      } else if (isRestoringFilters) {
        console.log('⏸️ Skipping area clear during restoration');
      }
      prevCityRef.current = selected.city;
    }
  }, [selected.city, isRestoringFilters]);

  // Load areas from area API
  const loadAreasFromAPI = async (cityId) => {
    try {
      console.log('🔍 Fetching areas for city:', cityId);
      const areasData = await areaDataService.getAreas(cityId);
      
      console.log('✅ Areas loaded from API:', areasData);
      setAreas(areasData || []);
    } catch (err) {
      console.error('❌ Error loading areas from API:', err);
      setAlert({ type: 'error', title: 'Failed to load areas', message: err.message || 'Try a different city' });
      setAreas([]);
    }
  };

  // Normalize restored area value (e.g., 'SANDTON') to its numeric ID when the areas list is ready
  useEffect(() => {
    if (!selected.area) return;
    const areaStr = String(selected.area);
    // Case 1: if selected.area is a name string, map it to ID when list is ready
    if (!/^\d+$/.test(areaStr) && Array.isArray(areas) && areas.length > 0) {
      const needle = areaStr.trim().toLowerCase();
      const match = areas.find(a => String(a.name || '').trim().toLowerCase() === needle);
      if (match) {
        console.log('🔁 Normalizing area value to ID:', selected.area, '=>', match.id);
        setSelected(prev => ({ ...prev, area: String(match.id), areaName: match.name }));
        return;
      }
    }
    // Case 2: if selected.area looks like an ID (numeric or UUID), derive name from list when available
    if (Array.isArray(areas) && areas.length > 0) {
      const fromList = areas.find(a => String(a.id) === areaStr);
      if (fromList && fromList.name && selected.areaName !== fromList.name) {
        console.log('📝 Deriving areaName from list:', fromList.name);
        setSelected(prev => ({ ...prev, areaName: fromList.name }));
      }
    }
  }, [selected.area, areas, setSelected]);

  // Load area data from API when area is selected (supports both ID and name input)
  const loadAreaData = async (areaIdentifier) => {
    if (!areaIdentifier) {
      setSelectedAreaDetails(null);
      setAreaStatistics(null);
      setAreaImages([]);
      return;
    }

    setLoadingAreaData(true);
    console.log('🏘️ Loading area data for identifier:', areaIdentifier);

    try {
      let targetAreaId = null;
      let targetAreaName = '';

      // Determine if the identifier is a numeric ID
      if (/^\d+$/.test(String(areaIdentifier))) {
        targetAreaId = areaIdentifier;
        console.log('🔢 Treating identifier as area ID:', targetAreaId);
      } else {
        targetAreaName = areaIdentifier;
        console.log('🔤 Treating identifier as area name:', targetAreaName);
      }

      // If we only have a name, search for the area to get ID
      if (!targetAreaId && targetAreaName) {
        try {
          const searchResults = await areaDataService.searchAreas(targetAreaName);
            const exact = searchResults.find(a => a.name.toLowerCase() === targetAreaName.toLowerCase());
            const first = searchResults[0];
            if (exact || first) {
              const match = exact || first;
              targetAreaId = match.id;
              targetAreaName = match.name;
              console.log('✅ Found area via search:', targetAreaName, '(ID:', targetAreaId + ')');
            }
        } catch (e) {
          console.log('🔎 Search endpoint unavailable, attempting to match loaded areas');
          const localMatch = areas.find(a => a.name.toLowerCase() === targetAreaName.toLowerCase());
          if (localMatch) {
            targetAreaId = localMatch.id;
            targetAreaName = localMatch.name;
            console.log('✅ Matched area from loaded list:', targetAreaName, '(ID:', targetAreaId + ')');
          }
        }
      }

      if (targetAreaId) {
        // Allow UUID or name identifiers; backend supports flexible resolution
        const [areaDetails, images] = await Promise.all([
          areaDataService.getAreaDetails(targetAreaId),
          areaDataService.getAreaImages(targetAreaId)
        ]);

        setSelectedAreaDetails(areaDetails);
        setAreaImages(images);

        // If we don't yet have a friendly areaName, derive it from details
        if (areaDetails && areaDetails.name && (!selected.areaName || selected.areaName === String(targetAreaId))) {
          setSelected(prev => ({ ...prev, areaName: areaDetails.name }));
        }

        // Try legacy statistics endpoint, but don't fail the overall load if it errors
        try {
          const statistics = await areaDataService.getAreaStatistics(targetAreaId);
          setAreaStatistics(statistics);
        } catch (e) {
          console.warn('Statistics endpoint unavailable or failed:', e?.message || e);
          setAreaStatistics(null);
        }

        // Fetch latest key metrics for display (works for Sandton and any selected area)
        try {
          const latest = await areaDataService.api.get(`/api/areas/${targetAreaId}/metrics/latest`, {
            params: { metrics: 'avg_price,rental_yield,vacancy_rate,crime_index,population_growth,planned_dev_count' }
          });
          const arr = (latest && latest.metrics) ? latest.metrics : [];
          const map = Object.fromEntries(arr.map(m => [m.code, m]));
          setAreaLatestMetrics(map);
        } catch (e) {
          console.warn('Latest metrics unavailable for area', targetAreaId, e?.message || e);
          setAreaLatestMetrics(null);
        }

        console.log('✅ Area data loaded successfully:', {
          details: areaDetails?.name,
          images: images?.length
        });
      } else {
        console.log('❌ Could not resolve area from identifier:', areaIdentifier);
        setSelectedAreaDetails(null);
        setAreaStatistics(null);
        setAreaImages([]);
      }
    } catch (error) {
      console.error('❌ Error loading area data:', error);
      setAlert({ type: 'error', title: 'Failed to load area', message: error.message || 'Area data unavailable' });
      setSelectedAreaDetails(null);
      setAreaStatistics(null);
      setAreaImages([]);
    } finally {
      setLoadingAreaData(false);
    }
  };

  // Load area data when selected area changes
  useEffect(() => {
    // Trigger load whenever an area is selected; loadAreaData resolves names to IDs if needed
    if (selected.area) {
      loadAreaData(selected.area);
    }
  }, [selected.area]);

  return (
    <div className="properties-page-modern">
      {/* Hero Section */}
      <div className="hero-section-premium">
        <div className="hero-overlay"></div>
        <div className="hero-content-premium">
          <div className="hero-text-premium">
            <h1 className="hero-title-premium">
              Explore Market <span className="hero-accent">Intelligence</span>
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
          {/* Admin control: refresh metrics */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
            <button className="aws-button" onClick={handleRefreshMetrics} disabled={isRefreshingMV}>
              {isRefreshingMV ? 'Refreshing…' : 'Refresh Metrics'}
            </button>
            {alert && (
              <AWSAlert type={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(null)} />
            )}
          </div>
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
                  onChange={e => {
                    const newProvince = e.target.value;
                    console.log('🏛️ User selected province:', newProvince, 'Current restoring state:', isRestoringFilters);
                    setSelected(prev => ({ ...prev, province: newProvince }));
                  }}
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
                    // Ensure type-insensitive comparison (IDs may be numbers)
                    const selectedAreaObj = areas.find(a => String(a.id) === String(selectedAreaId));
                    const selectedAreaName = selectedAreaObj?.name || '';
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

          {/* Area Image Section */}
          <div className="area-image-section">
            <div className="area-image-container">
              <div className="area-image-placeholder">
                {loadingAreaData ? (
                  <div className="area-loading">
                    <svg className="loading-spinner" width="48" height="48" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="60" strokeDashoffset="60">
                        <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                    <p>Loading {selected.areaName} data...</p>
                  </div>
                ) : (
                  (() => {
                    const heroUrl = (areaImages && areaImages.length > 0 && areaImages[0]?.image_url)
                      || (selectedAreaDetails && selectedAreaDetails.primary_image_url)
                      || `/api/placeholder/800/400?text=${encodeURIComponent(selected.areaName || 'Select Area')}`;
                    return (
                      <img
                        src={heroUrl}
                        alt={`Beautiful view of ${selected.areaName}`}
                        className="area-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    );
                  })()
                )}
                <div className="area-image-fallback" style={{display: areaImages.length > 0 && !loadingAreaData ? 'none' : 'flex'}}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p>Discover {selected.areaName || 'Your Area'}</p>
                  <span>
                    {selectedAreaDetails ? 'Premium area data available' : 'Area visualization coming soon'}
                  </span>
                </div>
              </div>
              <div className="area-image-overlay">
                <h3 className="overlay-title">{selected.areaName || 'Select an Area'}</h3>
                <p className="overlay-subtitle">
                  {(() => {
                    // Prefer names from selectedAreaDetails; fallback to looked-up lists
                    const cityName = selectedAreaDetails?.city || (cities.find(c => String(c.id) === String(selected.city))?.name);
                    const provinceName = selectedAreaDetails?.province || (provinces.find(p => String(p.id) === String(selected.province))?.name);
                    if (cityName && provinceName) return `${cityName}, ${provinceName}`;
                    if (cityName) return cityName;
                    if (provinceName) return provinceName;
                    return 'Choose location above';
                  })()}
                </p>
                {selectedAreaDetails && (
                  <div className="overlay-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Premium Data
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Area Data Display */}
          <div className="area-data-grid">
            {(areaStatistics || areaLatestMetrics) ? (
              <>
                <div className="area-data-card">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">
                      <MetricTooltip label={metricGlossary.avg_price.title} definition={metricGlossary.avg_price.definition}>
                        <span className="metric-label">{metricGlossary.avg_price.title}</span>
                      </MetricTooltip>
                    </div>
                    <div className="data-value">
                      {areaDataService.formatPrice(
                        areaStatistics.average_price ||
                        areaStatistics.metrics?.average_price?.value ||
                        areaLatestMetrics?.avg_price?.value_numeric
                      )}
                    </div>
                    <div className={`data-trend ${areaDataService.getTrendClass(areaStatistics.price_trend ?? areaStatistics.metrics?.average_price?.pct_change)}`}>
                      {areaDataService.formatPercentage(areaStatistics.price_trend ?? areaStatistics.metrics?.average_price?.pct_change)} YoY
                    </div>
                  </div>
                </div>

                <div className="area-data-card">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">
                      <MetricTooltip label={metricGlossary.rental_yield.title} definition={metricGlossary.rental_yield.definition}>
                        <span className="metric-label">{metricGlossary.rental_yield.title}</span>
                      </MetricTooltip>
                    </div>
                    <div className="data-value">
                      {(areaStatistics.rental_yield ?? areaStatistics.metrics?.rental_yield?.value ?? areaLatestMetrics?.rental_yield?.value_numeric)
                        ? `${Number(areaStatistics.rental_yield ?? areaStatistics.metrics?.rental_yield?.value).toFixed(1)}%` 
                        : 'N/A'}
                    </div>
                    <div className={`data-trend ${areaDataService.getTrendClass(areaStatistics.rental_trend ?? areaStatistics.metrics?.rental_yield?.pct_change)}`}>
                      {areaDataService.formatPercentage(areaStatistics.rental_trend ?? areaStatistics.metrics?.rental_yield?.pct_change)} YoY
                    </div>
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
                    <div className="data-label">
                      <MetricTooltip label={metricGlossary.vacancy_rate.title} definition={metricGlossary.vacancy_rate.definition}>
                        <span className="metric-label">{metricGlossary.vacancy_rate.title}</span>
                      </MetricTooltip>
                    </div>
                    <div className="data-value">
                      {(areaStatistics.vacancy_rate ?? areaStatistics.metrics?.vacancy_rate?.value ?? areaLatestMetrics?.vacancy_rate?.value_numeric)
                        ? `${Number(areaStatistics.vacancy_rate ?? areaStatistics.metrics?.vacancy_rate?.value).toFixed(1)}%` 
                        : 'N/A'}
                    </div>
                    <div className={`data-trend ${areaDataService.getTrendClass(-( (areaStatistics.vacancy_trend ?? areaStatistics.metrics?.vacancy_rate?.pct_change) || 0))}`}>
                      {areaDataService.formatPercentage((areaStatistics.vacancy_trend ?? areaStatistics.metrics?.vacancy_rate?.pct_change))} YoY
                    </div>
                  </div>
                </div>

                {selectedAreaDetails && (
                  <div className="area-data-card">
                    <div className="data-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="data-content">
                      <div className="data-label">
                        <MetricTooltip label={metricGlossary.safety_rating.title} definition={metricGlossary.safety_rating.definition}>
                          <span className="metric-label">{metricGlossary.safety_rating.title}</span>
                        </MetricTooltip>
                      </div>
                      <div className="data-value">
                        {selectedAreaDetails.safety_rating 
                          ? `${selectedAreaDetails.safety_rating}/10` 
                          : 'N/A'}
                      </div>
                      <div className="data-trend positive">Premium Area</div>
                    </div>
                  </div>
                )}

                <div className="area-data-card">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">
                      <MetricTooltip label={metricGlossary.population_density.title} definition={metricGlossary.population_density.definition}>
                        <span className="metric-label">{metricGlossary.population_density.title}</span>
                      </MetricTooltip>
                    </div>
                    <div className="data-value">
                      {areaStatistics.population_density ?? areaStatistics.metrics?.population_density?.value
                        ? `${Number(areaStatistics.population_density ?? areaStatistics.metrics?.population_density?.value).toLocaleString()}/km²` 
                        : 'N/A'}
                    </div>
                    <div className="data-trend neutral">Premium Data</div>
                  </div>
                </div>

                {/* New metrics from latest telemetry */}
                <div className="area-data-card">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22s-8-5-8-12a8 8 0 1116 0c0 7-8 12-8 12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">
                      <MetricTooltip label={metricGlossary.crime_index.title} definition={metricGlossary.crime_index.definition}>
                        <span className="metric-label">{metricGlossary.crime_index.title}</span>
                      </MetricTooltip>
                    </div>
                    <div className="data-value">{areaLatestMetrics?.crime_index?.value_numeric ?? 'N/A'}</div>
                    <div className="data-trend neutral">Lower is better</div>
                  </div>
                </div>

                <div className="area-data-card">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 21v-2a4 4 0 014-4h3a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="7.5" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">
                      <MetricTooltip label={metricGlossary.population_growth.title} definition={metricGlossary.population_growth.definition}>
                        <span className="metric-label">{metricGlossary.population_growth.title}</span>
                      </MetricTooltip>
                    </div>
                    <div className="data-value">
                      {areaLatestMetrics?.population_growth?.value_numeric != null
                        ? `${Number(areaLatestMetrics.population_growth.value_numeric).toFixed(1)}%`
                        : 'N/A'}
                    </div>
                    <div className="data-trend positive">Higher is growth</div>
                  </div>
                </div>

                <div className="area-data-card">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 20h18M6 20V9l6-5 6 5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">
                      <MetricTooltip label={metricGlossary.planned_dev_count.title} definition={metricGlossary.planned_dev_count.definition}>
                        <span className="metric-label">{metricGlossary.planned_dev_count.title}</span>
                      </MetricTooltip>
                    </div>
                    <div className="data-value">{areaLatestMetrics?.planned_dev_count?.value_numeric ?? 'N/A'}</div>
                    <div className="data-trend neutral">Pipeline</div>
                  </div>
                </div>

                <div className="area-data-card">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">
                      <MetricTooltip label={metricGlossary.development_score.title} definition={metricGlossary.development_score.definition}>
                        <span className="metric-label">{metricGlossary.development_score.title}</span>
                      </MetricTooltip>
                    </div>
                    <div className="data-value">
                      {selectedAreaDetails?.development_score 
                        ? `${selectedAreaDetails.development_score}/100` 
                        : 'N/A'}
                    </div>
                    <div className="data-trend positive">Growing</div>
                  </div>
                </div>
              </>
            ) : selected.areaName ? (
              // Show placeholder cards while loading or when no premium data available
              <>
                <div className="area-data-card loading">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">Average Property Price</div>
                    <div className="data-value">
                      {loadingAreaData ? '...' : 'Data Unavailable'}
                    </div>
                    <div className="data-trend neutral">
                      {loadingAreaData ? 'Loading...' : 'Coming Soon'}
                    </div>
                  </div>
                </div>

                <div className="area-data-card loading">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">Average Rental Yield</div>
                    <div className="data-value">
                      {loadingAreaData ? '...' : 'Data Unavailable'}
                    </div>
                    <div className="data-trend neutral">
                      {loadingAreaData ? 'Loading...' : 'Coming Soon'}
                    </div>
                  </div>
                </div>

                <div className="area-data-card loading">
                  <div className="data-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="data-content">
                    <div className="data-label">Market Analysis</div>
                    <div className="data-value">
                      {loadingAreaData ? '...' : 'Select Premium Area'}
                    </div>
                    <div className="data-trend neutral">
                      {loadingAreaData ? 'Loading...' : 'Premium Only'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Show "select area" message when no area is selected
              <div className="area-data-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <h3>Select an Area to Explore</h3>
                <p>Choose a location above to view detailed market insights and area statistics.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-indicator-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading properties...</span>
        </div>
      )}
    </div>
  );
}
