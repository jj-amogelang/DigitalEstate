/**
 * Area Data Service
 * Frontend service for fetching area data from the API
 */

import axios from 'axios';

const DEFAULTS = {
  primary: process.env.REACT_APP_API_URL || 'http://localhost:5002',
  candidates: []
};

// Build candidate list with sensible dev fallbacks (deduped, in order)
DEFAULTS.candidates = Array.from(new Set([
  DEFAULTS.primary,
  'http://localhost:5002',
  'http://localhost:5001',
  'http://localhost:5000'
].filter(Boolean)));

let resolvedBaseURL = null;

async function probeBase(url) {
  try {
    const r = await axios.get(`${url}/api/health`, { timeout: 2000 });
    const ct = (r.headers && (r.headers['content-type'] || r.headers['Content-Type'])) || '';
    const isJson = ct.toLowerCase().includes('application/json');
    const data = r && r.data;
    const looksBackend = data && typeof data === 'object' && data.success === true && (data.service === 'backend' || !!data.driver);
    return Boolean(isJson && looksBackend);
  } catch (e) {
    return false;
  }
}

async function detectApiBase() {
  if (resolvedBaseURL) return resolvedBaseURL;
  for (const url of DEFAULTS.candidates) {
    if (await probeBase(url)) {
      resolvedBaseURL = url;
      return resolvedBaseURL;
    }
  }
  // Last resort, return primary even if probe failed
  resolvedBaseURL = DEFAULTS.primary;
  return resolvedBaseURL;
}

class AreaDataService {
  constructor() {
    this.ready = this._init();
  }

  async _init() {
    const baseURL = await detectApiBase();
    try { console.log(`[AreaDataService] Using API base: ${baseURL}`); } catch {}
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('API Error:', error);
        throw new Error(error.response?.data?.error || 'Network error');
      }
    );
    return true;
  }

  // Admin: refresh materialized views (Postgres only). Requires backend token if set.
  async refreshMaterializedViews(options = {}) {
    await this.ready;
    const { recreate = false, concurrent = true, authToken } = options;
    const token = authToken || process.env.REACT_APP_MV_REFRESH_TOKEN;
    const body = { recreate, concurrent };
    if (token) body.auth_token = token;
    try {
      const response = await this.api.post('/api/metrics/materialized/refresh', body);
      return response; // { success: boolean, actions: [...]} or error
    } catch (error) {
      console.error('Error refreshing materialized views:', error);
      throw error;
    }
  }

  // Location hierarchy methods
  async getCountries() {
    await this.ready;
    try {
      const response = await this.api.get('/api/countries');
      return response.countries || [];
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  }

  async getProvinces(countryId) {
    await this.ready;
    try {
      const response = await this.api.get(`/api/provinces/${countryId}`);
      return response.provinces || [];
    } catch (error) {
      console.error('Error fetching provinces:', error);
      return [];
    }
  }

  async getCities(provinceId) {
    await this.ready;
    try {
      const response = await this.api.get(`/api/cities/${provinceId}`);
      return response.cities || [];
    } catch (error) {
      console.error('Error fetching cities:', error);
      return [];
    }
  }

  async getAreas(cityId) {
    await this.ready;
    try {
      const response = await this.api.get(`/api/areas/${cityId}`);
      return response.areas || [];
    } catch (error) {
      console.error('Error fetching areas:', error);
      return [];
    }
  }

  // Area detail methods
  async getAreaDetails(areaId) {
    await this.ready;
    try {
      const response = await this.api.get(`/api/area/${areaId}`);
      return response.area || null;
    } catch (error) {
      console.error('Error fetching area details:', error);
      return null;
    }
  }

  async getAreaImages(areaId) {
    await this.ready;
    try {
      const response = await this.api.get(`/api/area/${areaId}/images`);
      return response.images || [];
    } catch (error) {
      console.error('Error fetching area images:', error);
      return [];
    }
  }

  async getAreaStatistics(areaId) {
    await this.ready;
    try {
      const response = await this.api.get(`/api/area/${areaId}/statistics`);
      return response.statistics || null;
    } catch (error) {
      console.error('Error fetching area statistics:', error);
      return null;
    }
  }

  async getAreaAmenities(areaId) {
    await this.ready;
    try {
      const response = await this.api.get(`/api/area/${areaId}/amenities`);
      return response.amenities || {};
    } catch (error) {
      console.error('Error fetching area amenities:', error);
      return {};
    }
  }

  async getAreaTrends(areaId, metricType = 'average_price', months = 12) {
    await this.ready;
    try {
      const response = await this.api.get(`/api/area/${areaId}/trends`, {
        params: { metric_type: metricType, months }
      });
      return response.trends || [];
    } catch (error) {
      console.error('Error fetching area trends:', error);
      return [];
    }
  }

  // Data creation methods
  async createArea(areaData) {
    await this.ready;
    try {
      const response = await this.api.post('/api/area', areaData);
      return response;
    } catch (error) {
      console.error('Error creating area:', error);
      throw error;
    }
  }

  async addAreaImage(areaId, imageData) {
    await this.ready;
    try {
      const response = await this.api.post(`/api/area/${areaId}/image`, imageData);
      return response;
    } catch (error) {
      console.error('Error adding area image:', error);
      throw error;
    }
  }

  async addAreaStatistics(areaId, statisticsData) {
    await this.ready;
    try {
      const response = await this.api.post(`/api/area/${areaId}/statistics`, statisticsData);
      return response;
    } catch (error) {
      console.error('Error adding area statistics:', error);
      throw error;
    }
  }

  // Utility methods
  formatPrice(price) {
    if (!price) return 'N/A';
    
    if (price >= 1000000) {
      return `R${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `R${(price / 1000).toFixed(0)}K`;
    }
    return `R${price.toLocaleString()}`;
  }

  formatPercentage(value) {
    if (value === null || value === undefined) return 'N/A';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  getTrendClass(value) {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  // Get area image with fallback
  getAreaImageUrl(area, size = 'large') {
    if (!area) return null;
    
    // Use primary image if available
    if (area.primary_image_url) {
      return area.primary_image_url;
    }
    
    // Fallback to placeholder
    const dimensions = size === 'large' ? '800x400' : '400x200';
    return `/api/placeholder/${dimensions}?text=${encodeURIComponent(area.name)}`;
  }

  // Search areas by name
  async searchAreas(query) {
    await this.ready;
    try {
      // This would be implemented on the backend
      const response = await this.api.get('/api/areas/search', {
        params: { q: query }
      });
      return response.areas || [];
    } catch (error) {
      console.error('Error searching areas:', error);
      return [];
    }
  }
}

// Create and export a singleton instance
const areaDataService = new AreaDataService();
export default areaDataService;