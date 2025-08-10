// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Legacy endpoints (keep for backward compatibility)
  COUNTRIES: `${API_BASE_URL}/locations/countries`,
  PROVINCES: (countryId) => `${API_BASE_URL}/locations/provinces/${countryId}`,
  CITIES: (provinceId) => `${API_BASE_URL}/locations/cities/${provinceId}`,
  AREAS: (cityId) => `${API_BASE_URL}/locations/areas/${cityId}`,
  PROPERTIES_ALL: `${API_BASE_URL}/properties/all`,
  PROPERTIES_BY_AREA: (areaId) => `${API_BASE_URL}/properties/${areaId}`,
  PROPERTY_TYPES: `${API_BASE_URL}/property-types`,
  
  // New PostgreSQL database endpoints
  API_PROPERTIES: `${API_BASE_URL}/api/properties`,
  API_PROPERTY_BY_ID: (id) => `${API_BASE_URL}/api/properties/${id}`,
  API_SEARCH_PROPERTIES: `${API_BASE_URL}/api/search/properties`,
  API_OWNERS: `${API_BASE_URL}/api/owners`,
  API_OWNER_BY_ID: (id) => `${API_BASE_URL}/api/owners/${id}`,
  API_MARKET_TRENDS: `${API_BASE_URL}/api/market-trends`,
  API_DASHBOARD_STATS: `${API_BASE_URL}/api/dashboard/stats`,
  API_DASHBOARD_CHARTS: `${API_BASE_URL}/api/dashboard/charts`,
  API_ZONING: `${API_BASE_URL}/api/zoning`,
  API_VALUATIONS: `${API_BASE_URL}/api/valuations`,
  
  // Research Dashboard endpoints (for Market Research page)
  RESEARCH_PROPERTIES: `${API_BASE_URL}/api/properties`,
  RESEARCH_PROPERTY_BY_ID: (id) => `${API_BASE_URL}/api/properties/${id}`,
  MARKET_TRENDS: `${API_BASE_URL}/api/market-trends`,
  UPLOAD_EXCEL: `${API_BASE_URL}/upload_excel`,
  
  // Test endpoints
  TEST_DB: `${API_BASE_URL}/test-db`,
  HEALTH_CHECK: `${API_BASE_URL}/`,
};

// Helper functions for API calls
export const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Specific API functions
export const getProperties = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  
  const url = `${API_ENDPOINTS.API_PROPERTIES}?${params.toString()}`;
  return apiCall(url);
};

export const getPropertyById = async (id) => {
  return apiCall(API_ENDPOINTS.API_PROPERTY_BY_ID(id));
};

export const searchProperties = async (query) => {
  const params = new URLSearchParams({ q: query });
  const url = `${API_ENDPOINTS.API_SEARCH_PROPERTIES}?${params.toString()}`;
  return apiCall(url);
};

export const getDashboardStats = async () => {
  return apiCall(API_ENDPOINTS.API_DASHBOARD_STATS);
};

export const getMarketTrends = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  
  const url = `${API_ENDPOINTS.API_MARKET_TRENDS}?${params.toString()}`;
  return apiCall(url);
};

export default API_BASE_URL;
