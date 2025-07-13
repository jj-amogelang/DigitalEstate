// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  COUNTRIES: `${API_BASE_URL}/locations/countries`,
  PROVINCES: (countryId) => `${API_BASE_URL}/locations/provinces/${countryId}`,
  CITIES: (provinceId) => `${API_BASE_URL}/locations/cities/${provinceId}`,
  AREAS: (cityId) => `${API_BASE_URL}/locations/areas/${cityId}`,
  PROPERTIES_ALL: `${API_BASE_URL}/properties/all`,
  PROPERTIES_BY_AREA: (areaId) => `${API_BASE_URL}/properties/${areaId}`,
  PROPERTY_TYPES: `${API_BASE_URL}/property-types`,
};

export default API_BASE_URL;
