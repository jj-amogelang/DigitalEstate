import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import areaDataService from "../services/areaDataService";
import AWSAlert from "../components/AWSAlert";
import CentreOfGravity from "../components/CentreOfGravity";
import GlobalSearchBar from "../components/GlobalSearchBar";
import RecentAndSaved from "../components/RecentAndSaved";
import InsightCard from "../components/InsightCard";
import useProvinceDetect from "../hooks/useProvinceDetect";
import useRecentlyViewed from "../hooks/useRecentlyViewed";
import { useAppLocation } from "../context/LocationContext";
import "../components/styles/DropdownFix.css";
import "../components/styles/PropertiesAWS.css";
import "../components/styles/AWSComponents.css";
import "./styles/explore-page.css";
import MetricTooltip from "../components/MetricTooltip";
import metricGlossary from "../components/metricGlossary";

// ── Enrichment helpers (pure, defined outside component) ──────────────────
const HIGHER_IS_BETTER = {
  rental_yield:       true,
  vacancy_rate:       false,
  avg_price:          null,
  crime_index:        false,
  population_growth:  true,
  planned_dev_count:  true,
  transport_score:    true,
  amenities_score:    true,
  development_score:  true,
  safety_rating:      true,
  population_density: null,
};

function getTrendDisplay(code, direction) {
  const hib = HIGHER_IS_BETTER[code];
  if (!direction || direction === 'stable') return { arrow: '→', cls: 'neutral', label: 'Stable' };
  if (direction === 'up') {
    if (hib === true)  return { arrow: '↑', cls: 'positive', label: 'Rising' };
    if (hib === false) return { arrow: '↑', cls: 'negative', label: 'Rising' };
    return { arrow: '↑', cls: 'neutral', label: 'Rising' };
  }
  if (direction === 'down') {
    if (hib === true)  return { arrow: '↓', cls: 'negative', label: 'Falling' };
    if (hib === false) return { arrow: '↓', cls: 'positive', label: 'Falling' };
    return { arrow: '↓', cls: 'neutral', label: 'Falling' };
  }
  return { arrow: '→', cls: 'neutral', label: '' };
}

function getPercentileLabel(code, percentile) {
  if (percentile == null) return null;
  const hib = HIGHER_IS_BETTER[code];
  // Convert to "rank from top" so 100 = best
  const eff = hib === false ? (100 - percentile) : percentile;
  const top = Math.round(100 - eff);
  if (top <= 10) return 'Top 10%';
  if (top <= 25) return 'Top 25%';
  if (top <= 50) return 'Top 50%';
  return `Bottom ${Math.round(100 - top)}%`;
}

function MetricEnrichmentRow({ code, enriched }) {
  if (!enriched) return <div className="data-trend neutral">—</div>;
  const td = getTrendDisplay(code, enriched.trend_direction);
  const pctLabel = getPercentileLabel(code, enriched.percentile);
  return (
    <div className="data-enrichment">
      <div className={`data-trend ${td.cls}`}>
        <span className="data-trend-arrow">{td.arrow}</span>
        <span>{td.label}</span>
        {pctLabel && <span className="data-percentile-badge">{pctLabel}</span>}
      </div>
      {enriched.insight && (
        <p className="data-insight-text">{enriched.insight}</p>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  // eslint-disable-next-line no-unused-vars
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  // Master lists for showing all options when parent is not selected
  const [allProvinces, setAllProvinces] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [allCities, setAllCities] = useState([]);
  const [allAreas, setAllAreas] = useState([]);
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
  const [areaEnrichedMetrics, setAreaEnrichedMetrics] = useState(null);
  const [areaImages, setAreaImages] = useState([]);
  const [loadingAreaData, setLoadingAreaData] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isRefreshingMV, setIsRefreshingMV] = useState(false);
  const [cogOpen, setCogOpen] = useState(false);

  // Province auto-detection (used for search bias + recently-viewed province label)
  const detected = useProvinceDetect(allProvinces);

  // Recently viewed + saved areas (localStorage-backed)
  // eslint-disable-next-line no-unused-vars
  const { recent, saved, pushRecent, toggleSave, isSaved, unsaveArea } = useRecentlyViewed();

  // Location-aware area detection — GPS when permitted, popular area as fallback
  const {
    effectiveArea: locationArea,
    isLocationBased,
    loading: locationLoading,
    source: locationSource, // eslint-disable-line no-unused-vars
    permissionState: locationPermState,
    requestPermission: requestLocationPermission,
  } = useAppLocation();

  // Investment profile selected from the page (applied when CoG modal opens)
  // eslint-disable-next-line no-unused-vars
  const [selectedProfile, setSelectedProfile] = useState('balanced');

  // Set page title
  useEffect(() => {
    document.title = 'Explore Areas - Digital Estate';
  }, []);

  // Hero metrics strip — areaLatestMetrics is stored as a CODE→OBJECT map.
  // (Previous code wrongly checked Array.isArray; it's always an object map.)
  // eslint-disable-next-line no-unused-vars
  const heroMetrics = React.useMemo(() => {
    if (!areaLatestMetrics || typeof areaLatestMetrics !== 'object') return null;
    // Support both array-of-objects and code-keyed-map shapes
    const map = Array.isArray(areaLatestMetrics)
      ? Object.fromEntries(areaLatestMetrics.map(m => [m.code, m]))
      : areaLatestMetrics;
    const fmtPrice = (v) => {
      if (v == null) return '—';
      const n = Number(v);
      if (n >= 1_000_000) return `R${(n/1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `R${(n/1_000).toFixed(0)}K`;
      return `R${n.toLocaleString()}`;
    };
    const fmtPct = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
    const fmtNum = (v) => (v == null ? '—' : Number(v).toLocaleString());
    return [
      { key: 'avg_price', label: 'Avg Price', value: fmtPrice(map.avg_price?.value_numeric) },
      { key: 'rental_yield', label: 'Yield', value: fmtPct(map.rental_yield?.value_numeric) },
      { key: 'vacancy_rate', label: 'Vacancy', value: fmtPct(map.vacancy_rate?.value_numeric) },
      { key: 'planned_dev_count', label: 'Planned Dev.', value: fmtNum(map.planned_dev_count?.value_numeric) },
    ];
  }, [areaLatestMetrics]);

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
    
    // Support new-style GlobalSearchBar navigation: ?areaId=X&areaName=Y
    const urlAreaId   = urlParams.get('areaId');
    const urlAreaName = urlParams.get('areaName');
    if (urlAreaId) {
      // Preserve country/province/city from URL so that the URL-tracking effect
      // doesn't write country=1 back, triggering an infinite restoration loop.
      filtersToRestore = {
        country:  urlParams.get('country')  || '',
        province: urlParams.get('province') || '',
        city:     urlParams.get('city')     || '',
        area:     urlAreaId,
        areaName: decodeURIComponent(urlAreaName || ''),
      };
      setSelected(filtersToRestore);
      setTimeout(() => setIsRestoringFilters(false), 300);
      return;
    }

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

  // Update browser URL when filters change (for proper browser history).
  // IMPORTANT: when an area is selected, always write it as ?areaId=X&areaName=Y
  // so that the restoration effect can re-read it correctly without losing areaName.
  useEffect(() => {
    if (!isRestoringFilters && selected.country) {
      const searchParams = new URLSearchParams();
      if (selected.country)  searchParams.set('country',  selected.country);
      if (selected.province) searchParams.set('province', selected.province);
      if (selected.city)     searchParams.set('city',     selected.city);
      // ↓ Use areaId/areaName format — matches what the restoration useEffect
      //   expects so it does an early-return and never clears the selection.
      if (selected.area) {
        searchParams.set('areaId', selected.area);
        const nameForUrl = selected.areaName || selectedAreaDetails?.name || '';
        if (nameForUrl) searchParams.set('areaName', nameForUrl);
      }
      const newUrl = `/explore?${searchParams.toString()}`;
      if (window.location.pathname + window.location.search !== newUrl) {
        navigate(newUrl, { replace: true });
      }
    }
  }, [selected, isRestoringFilters, navigate, selectedAreaDetails]);

  // Debug: Test area API connection on mount
  useEffect(() => {
    console.log('🔧 Testing Area API connection...');
    // Test with a simple area API endpoint instead of properties
    areaDataService.getCountries()
      .then(countries => {
        if (Array.isArray(countries) && countries.length > 0) {
          console.log('✅ Area API connection OK — countries loaded:', countries.length);
        } else {
          console.warn('⚠️ Area API reachable but returned no countries');
        }
      })
      .catch(err => {
        console.error('❌ Area API connection test failed:', err?.message || err);
      });
  }, []);

  // Load countries from area API on mount
  useEffect(() => {
    console.log('🌍 Loading countries from area API...');
    loadCountriesFromAPI();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load all provinces, cities, and areas for unrestricted dropdowns
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [plist, clist, alist] = await Promise.all([
          areaDataService.listAllProvinces().catch(() => []),
          areaDataService.listAllCities().catch(() => []),
          areaDataService.listAllAreas().catch(() => [])
        ]);
        setAllProvinces(plist || []);
        setAllCities(clist || []);
        setAllAreas(alist || []);
        console.log('📚 Loaded full location lists:', {
          provinces: (plist || []).length,
          cities: (clist || []).length,
          areas: (alist || []).length
        });
      } catch (e) {
        console.warn('Failed to load full lists; dropdowns will filter by parent only.', e?.message || e);
      }
    };
    loadAll();
  }, []);

  // Admin: trigger MV refresh
  const handleRefreshMetrics = async () => {
    try {
      setIsRefreshingMV(true);
      const res = await areaDataService.refreshMaterializedViews();
      if (res && res.success === false) {
        // Backend returned { success: false, error: '...' } — not a real crash
        setAlert({ type: 'error', title: 'Refresh not available', message: res.error || 'Materialized views not supported in this environment' });
        return;
      }
      // Clear selections so the user can choose afresh
      setSelected({ country: '', province: '', city: '', area: '', areaName: '' });
      setProvinces([]);
      setCities([]);
      setAreas([]);
      setSelectedAreaDetails(null);
      setAreaStatistics(null);
      setAreaImages([]);
      setAreaLatestMetrics(null);
      setAreaEnrichedMetrics(null);
      setAlert({ type: 'success', title: 'Metrics refreshed', message: (res && res.actions) ? res.actions.join(', ') : 'Refresh triggered' });
    } catch (e) {
      setAlert({ type: 'error', title: 'Refresh failed', message: e.message || 'Unable to refresh materialized views' });
    } finally {
      setIsRefreshingMV(false);
    }
  };

  // Auto-select area from location context when no area is already selected.
  // Fires for both GPS-detected areas AND popular-area fallbacks.
  useEffect(() => {
    if (locationLoading) return;         // still waiting for location to resolve
    if (!locationArea) return;           // no area resolved yet
    if (selected.area) return;           // user or URL already chose an area
    const { id, name, province_id } = locationArea;
    setSelected(prev => ({
      ...prev,
      province: province_id ? String(province_id) : prev.province,
      city: '',
      area: String(id),
      areaName: name || '',
    }));
  }, [locationLoading, locationArea]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load countries from area API
  const loadCountriesFromAPI = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching countries from area API...');
      const countriesData = await areaDataService.getCountries();
      
      console.log('✅ Countries loaded from API:', countriesData);
      setCountries(countriesData || []);
      
      // Auto-select South Africa
      const southAfrica = countriesData?.find(c => c.name === 'South Africa');
      if (southAfrica && !selected.country) {
        setSelected(prev => ({ ...prev, country: southAfrica.id }));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Error loading countries from API:', err);
      setAlert({ type: 'error', title: 'Failed to load countries', message: err.message || 'Check backend API' });
      // Fallback to hardcoded South Africa if API fails
      setCountries([{ id: 1, name: "South Africa" }]);
      if (!selected.country) {
        setSelected(prev => ({ ...prev, country: 1 }));
      }
      setLoading(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const pool = [...areas, ...allAreas];
    // Case 1: if selected.area is a name string, map it to ID when list is ready
    if (!/^\d+$/.test(areaStr) && pool.length > 0) {
      const needle = areaStr.trim().toLowerCase();
      const match = pool.find(a => String(a.name || '').trim().toLowerCase() === needle);
      if (match) {
        console.log('🔁 Normalizing area value to ID:', selected.area, '=>', match.id);
        setSelected(prev => ({ ...prev, area: String(match.id), areaName: match.name }));
        return;
      }
    }
    // Case 2: if selected.area looks like an ID (numeric or UUID), derive name from list when available
    if (pool.length > 0) {
      const fromList = pool.find(a => String(a.id) === areaStr);
      if (fromList && fromList.name && selected.areaName !== fromList.name) {
        console.log('📝 Deriving areaName from list:', fromList.name);
        setSelected(prev => ({ ...prev, areaName: fromList.name }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.area, areas, allAreas, setSelected]);

  // Load area data from API when area is selected (supports both ID and name input)
  const loadAreaData = async (areaIdentifier) => {
    if (!areaIdentifier) {
      setSelectedAreaDetails(null);
      setAreaStatistics(null);
      setAreaImages([]);
      setAreaLatestMetrics(null);
      setAreaEnrichedMetrics(null);
      return;
    }

    // Clear previous area's data immediately so stale info never shows for a new selection
    setSelectedAreaDetails(null);
    setAreaStatistics(null);
    setAreaImages([]);
    setAreaLatestMetrics(null);
    setAreaEnrichedMetrics(null);
    setLoadingAreaData(true);

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

        // Always sync areaName from the API response — guards against the name
        // being blanked out by a URL-tracking cycle while data was in-flight.
        if (areaDetails && areaDetails.name) {
          setSelected(prev => ({
            ...prev,
            areaName: areaDetails.name,
            // Also backfill city / province into selected so downstream cascades work
            ...(areaDetails.city     && !prev.city     ? {} : {}),
          }));
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

        // Fetch enrichment data: trend direction, provincial percentile, insight sentences
        try {
          const enriched = await areaDataService.api.get(`/api/areas/${targetAreaId}/metrics/enriched`, {
            params: { metrics: 'avg_price,rental_yield,vacancy_rate,crime_index,population_growth,planned_dev_count' }
          });
          setAreaEnrichedMetrics(enriched?.metrics ?? null);
        } catch (e) {
          console.warn('Enriched metrics unavailable for area', targetAreaId, e?.message || e);
          setAreaEnrichedMetrics(null);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.area]);

  // Push to recently-viewed whenever a new area is selected
  useEffect(() => {
    if (!selected.area || !selected.areaName) return;
    pushRecent({
      id:       String(selected.area),
      name:     selected.areaName,
      city:     cities.find(c => String(c.id) === String(selected.city))?.name
             || selectedAreaDetails?.city || '',
      province: provinces.find(p => String(p.id) === String(selected.province))?.name
             || selectedAreaDetails?.province || detected.provinceName || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {/* Admin control moved into Location selectors toolbar */}
        </div>
      </div>

      {/* ── Centre of Gravity CTA ─────────────────────────────────────────────
           Placed above search so international investors see it immediately.
           They may not know which area to look for — CoG solves that. */}
      <div className="explore-cog-banner">
        <div className="explore-cog-banner-inner">
          <div className="explore-cog-icon-wrap" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="18" cy="18" r="5" stroke="currentColor" strokeWidth="1.8" fill="none"/>
              <line x1="18" y1="3" x2="18" y2="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="18" y1="26" x2="18" y2="33" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="18" x2="10" y2="18" stroke="currentColor" strokeWidth="2"/>
              <line x1="26" y1="18" x2="33" y2="18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="explore-cog-text">
            <span className="explore-cog-heading">Not sure which area to invest in?</span>
            <span className="explore-cog-sub">Your Centre of Gravity pinpoints the optimal South&nbsp;African location based on your investor profile — built for local and international investors alike.</span>
          </div>
          <button className="explore-cog-cta-btn" onClick={() => setCogOpen(true)}>
            Find My Centre of Gravity
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search + Actions bar */}
      <div className="filters-section-modern">
        <div className="filters-container-modern">
          <div className="filters-toolbar" style={{display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
            {/* Hero search */}
            <GlobalSearchBar
              variant="hero"
              provinceId={detected.provinceId}
              className="explore-hero-search"
            />

            {/* Admin: refresh metrics */}
            <button className="toolbar-refresh" onClick={handleRefreshMetrics} disabled={isRefreshingMV} title="Refresh metrics">
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v-3l4 4-4 4V8a5 5 0 105 5h2a7 7 0 11-7-7z" fill="currentColor"/></svg>
              <span style={{marginLeft:5}}>{isRefreshingMV ? 'Refreshing…' : 'Refresh'}</span>
            </button>

            {alert && (
              <AWSAlert type={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(null)} />
            )}
          </div>
        </div>
      </div>

      {/* Empty state — location resolved but no area matched (edge case) */}
      {!selected.area && !locationLoading && !locationArea && (
        <div className="explore-no-area-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <h3>Choose an area to get started</h3>
          <p>Use the search bar above to explore market insights, property prices, and investment data for any South African area.</p>
        </div>
      )}

      {/* Recently Viewed + Saved — shown when no area is currently selected */}
      {!selected.area && (
        <div style={{ padding: '0 24px' }}>
          <RecentAndSaved
            recent={recent}
            saved={saved}
            onAreaClick={(id, name) => setSelected(prev => ({ ...prev, area: String(id), areaName: name }))}
            onUnsave={unsaveArea}
          />
        </div>
      )}


      {/* Area Insights Section — visible as long as an area ID is set.
           areaName may briefly be empty while the detail API is in-flight;
           we show it anyway (with a derived/loading name) so there's no flash. */}
      {selected.area && (selected.areaName || selectedAreaDetails || loadingAreaData) && (
        <div className="area-insights-section">

          {/* ── Location context notice ─────────────────────────────── */}
          {isLocationBased ? (
            <div className="area-location-notice area-location-notice--gps">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              Showing insights for your current location
            </div>
          ) : (
            <div className="area-location-notice area-location-notice--popular">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Showing a popular area —{' '}
              {locationPermState === 'idle' || locationPermState === 'denied' ? (
                <><button className="area-location-notice-link" onClick={requestLocationPermission}>enable location</button>{' '}or search above for your&nbsp;area</>
              ) : (
                <>search above to explore a specific area</>
              )}
            </div>
          )}

          <div className="area-header">
            <div className="area-title-container">
              <h2 className="area-title">
                Exploring: <span className="area-name">
                  {selected.areaName || selectedAreaDetails?.name || (
                    loadingAreaData ? '…' : 'Unknown Area'
                  )}
                </span>
                {isLocationBased && String(locationArea?.id) === String(selected.area) && (
                  <span className="area-near-you" title="Detected from your GPS location"> • Near You</span>
                )}
              </h2>

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
                      || areaDataService.getPlaceholderUrl(800, 400, selected.areaName || 'Select Area');
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

          {/* ── Market Intelligence — area-specific data ─────────────────── */}
          <div className="area-market-intelligence">
            <div className="area-mi-header">
              <h3 className="area-mi-title">
                Market Intelligence
                {(selected.areaName || selectedAreaDetails?.name) && (
                  <span className="area-mi-location"> — {selected.areaName || selectedAreaDetails?.name}</span>
                )}
              </h3>
              {loadingAreaData && (
                <span className="area-mi-loading">
                  <svg className="loading-spinner" width="14" height="14" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"
                      strokeDasharray="60" strokeDashoffset="60">
                      <animateTransform attributeName="transform" type="rotate"
                        values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                </span>
              )}
            </div>
            <div className="area-data-grid">
              {areaStatistics || areaLatestMetrics ? (
                <>
                  <div className="area-data-card">
                    <div className="data-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
                      <div className="data-def">{metricGlossary.avg_price.definition}</div>
                      <div className="data-value">
                        {(areaStatistics?.average_price ?? areaLatestMetrics?.avg_price?.value_numeric)
                          ? `R ${Number(areaStatistics?.average_price ?? areaLatestMetrics?.avg_price?.value_numeric).toLocaleString()}`
                          : 'N/A'}
                      </div>
                      <MetricEnrichmentRow code="avg_price" enriched={areaEnrichedMetrics?.avg_price} />
                    </div>
                  </div>

                  <div className="area-data-card">
                    <div className="data-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="data-content">
                      <div className="data-label">
                        <MetricTooltip label={metricGlossary.rental_yield.title} definition={metricGlossary.rental_yield.definition}>
                          <span className="metric-label">{metricGlossary.rental_yield.title}</span>
                        </MetricTooltip>
                      </div>
                      <div className="data-def">{metricGlossary.rental_yield.definition}</div>
                      <div className="data-value">
                        {(areaStatistics?.rental_yield ?? areaLatestMetrics?.rental_yield?.value_numeric) != null
                          ? `${Number(areaStatistics?.rental_yield ?? areaLatestMetrics?.rental_yield?.value_numeric).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                      <MetricEnrichmentRow code="rental_yield" enriched={areaEnrichedMetrics?.rental_yield} />
                    </div>
                  </div>

                  <div className="area-data-card">
                    <div className="data-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="data-content">
                      <div className="data-label">
                        <MetricTooltip label={metricGlossary.vacancy_rate.title} definition={metricGlossary.vacancy_rate.definition}>
                          <span className="metric-label">{metricGlossary.vacancy_rate.title}</span>
                        </MetricTooltip>
                      </div>
                      <div className="data-def">{metricGlossary.vacancy_rate.definition}</div>
                      <div className="data-value">
                        {(areaStatistics?.vacancy_rate ?? areaLatestMetrics?.vacancy_rate?.value_numeric) != null
                          ? `${Number(areaStatistics?.vacancy_rate ?? areaLatestMetrics?.vacancy_rate?.value_numeric).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                      <MetricEnrichmentRow code="vacancy_rate" enriched={areaEnrichedMetrics?.vacancy_rate} />
                    </div>
                  </div>

                  {selectedAreaDetails?.safety_rating && (
                    <div className="area-data-card">
                      <div className="data-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="data-content">
                        <div className="data-label">
                          <MetricTooltip label={metricGlossary.safety_rating.title} definition={metricGlossary.safety_rating.definition}>
                            <span className="metric-label">{metricGlossary.safety_rating.title}</span>
                          </MetricTooltip>
                        </div>
                        <div className="data-def">{metricGlossary.safety_rating.definition}</div>
                        <div className="data-value">{selectedAreaDetails.safety_rating}/100</div>
                        <MetricEnrichmentRow code="safety_rating" enriched={areaEnrichedMetrics?.safety_rating} />
                      </div>
                    </div>
                  )}

                  <div className="area-data-card">
                    <div className="data-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="data-content">
                      <div className="data-label">
                        <MetricTooltip label={metricGlossary.population_density.title} definition={metricGlossary.population_density.definition}>
                          <span className="metric-label">{metricGlossary.population_density.title}</span>
                        </MetricTooltip>
                      </div>
                      <div className="data-def">{metricGlossary.population_density.definition}</div>
                      <div className="data-value">
                        {(areaStatistics?.population_density ?? areaStatistics?.metrics?.population_density?.value)
                          ? `${Number(areaStatistics?.population_density ?? areaStatistics?.metrics?.population_density?.value).toLocaleString()}/km²`
                          : 'N/A'}
                      </div>
                      <MetricEnrichmentRow code="population_density" enriched={areaEnrichedMetrics?.population_density} />
                    </div>
                  </div>

                  <div className="area-data-card">
                    <div className="data-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
                      <div className="data-def">{metricGlossary.crime_index.definition}</div>
                      <div className="data-value">{areaLatestMetrics?.crime_index?.value_numeric ?? 'N/A'}</div>
                      <MetricEnrichmentRow code="crime_index" enriched={areaEnrichedMetrics?.crime_index} />
                    </div>
                  </div>

                  <div className="area-data-card">
                    <div className="data-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
                      <div className="data-def">{metricGlossary.population_growth.definition}</div>
                      <div className="data-value">
                        {areaLatestMetrics?.population_growth?.value_numeric != null
                          ? `${Number(areaLatestMetrics.population_growth.value_numeric).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                      <MetricEnrichmentRow code="population_growth" enriched={areaEnrichedMetrics?.population_growth} />
                    </div>
                  </div>

                  <div className="area-data-card">
                    <div className="data-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
                      <div className="data-def">{metricGlossary.planned_dev_count.definition}</div>
                      <div className="data-value">{areaLatestMetrics?.planned_dev_count?.value_numeric ?? 'N/A'}</div>
                      <MetricEnrichmentRow code="planned_dev_count" enriched={areaEnrichedMetrics?.planned_dev_count} />
                    </div>
                  </div>

                  <div className="area-data-card">
                    <div className="data-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="data-content">
                      <div className="data-label">
                        <MetricTooltip label={metricGlossary.development_score.title} definition={metricGlossary.development_score.definition}>
                          <span className="metric-label">{metricGlossary.development_score.title}</span>
                        </MetricTooltip>
                      </div>
                      <div className="data-def">{metricGlossary.development_score.definition}</div>
                      <div className="data-value">
                        {selectedAreaDetails?.development_score
                          ? `${selectedAreaDetails.development_score}/100`
                          : 'N/A'}
                      </div>
                      <MetricEnrichmentRow code="development_score" enriched={areaEnrichedMetrics?.development_score} />
                    </div>
                  </div>
                </>
              ) : loadingAreaData ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="area-data-card loading">
                      <div className="data-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div className="data-content">
                        <div className="data-label">Loading…</div>
                        <div className="data-value">…</div>
                        <div className="data-trend neutral">Loading…</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="area-data-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <h3>No market data yet for {selected.areaName || 'this area'}</h3>
                  <p>Data for this area will appear here once available.</p>
                </div>
              )}
            </div>
          </div>

          {/* "Why This Location" insight card */}
          <div style={{ padding: '16px 0 0' }}>
            <InsightCard areaId={selected.area} areaName={selected.areaName} />
          </div>
        </div>
      )}
      {loading && (
        <div className="loading-indicator-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading...</span>
        </div>
      )}

      <CentreOfGravity
        isOpen={cogOpen}
        onClose={() => setCogOpen(false)}
        areaId={selected.area}
        areaName={selected.areaName}
        initialProfile={selectedProfile}
      />
    </div>
  );
}
