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
  
  // New PostgreSQL/FastAPI endpoints
  RESEARCH_PROPERTIES: `${API_BASE_URL}/properties`,
  RESEARCH_PROPERTY_BY_ID: (id) => `${API_BASE_URL}/properties/${id}`,
  MARKET_TRENDS: `${API_BASE_URL}/market_trends`,
  UPLOAD_EXCEL: `${API_BASE_URL}/upload_excel`,
};

export default API_BASE_URL;
