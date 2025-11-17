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
  // Try health endpoint first
  try {
    const r = await axios.get(`${url}/api/health`, { timeout: 1500 });
    const ct = (r.headers && (r.headers['content-type'] || r.headers['Content-Type'])) || '';
    const isJson = ct.toLowerCase().includes('application/json');
    const data = r && r.data;
    const looksBackend = data && typeof data === 'object' && (data.success === true || data.ok === true);
    if (isJson && looksBackend) return true;
  } catch {}
  // Fallback: try countries endpoints
  try {
    const rc = await axios.get(`${url}/api/countries`, { timeout: 1500 });
    const data = rc && rc.data;
    if (Array.isArray(data)) return true;
    if (data && Array.isArray(data.countries)) return true;
  } catch {}
  try {
    const rl = await axios.get(`${url}/locations/countries`, { timeout: 1500 });
    const data = rl && rl.data;
    if (Array.isArray(data)) return true;
    if (data && Array.isArray(data.countries)) return true;
  } catch {}
  return false;
}

async function detectApiBase() {
  if (resolvedBaseURL) return resolvedBaseURL;
  // 1) Prefer a candidate that responds to health or countries
  for (const url of DEFAULTS.candidates) {
    try {
      if (await probeBase(url)) {
        resolvedBaseURL = url;
        return resolvedBaseURL;
      }
    } catch {}
  }
  // 2) If none passed probe, take the first candidate that returns 200 on /api/countries even without shape
  for (const url of DEFAULTS.candidates) {
    try {
      const r = await axios.get(`${url}/api/countries`, { timeout: 1500 });
      if (r && r.status >= 200 && r.status < 300) {
        resolvedBaseURL = url;
        return resolvedBaseURL;
      }
    } catch {}
  }
  // 3) As a final fallback, choose the last candidate (often :5000 dev server) if present
  if (DEFAULTS.candidates.includes('http://localhost:5000')) {
    resolvedBaseURL = 'http://localhost:5000';
    return resolvedBaseURL;
  }
  // 4) Last resort: default primary
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
        try {
          const status = error?.response?.status;
          const statusText = error?.response?.statusText;
          const url = error?.config?.url || error?.request?.responseURL;
          console.error('API Error:', { status, statusText, url, message: error?.message });
          const msg = error?.response?.data?.error
            || (status ? `${status} ${statusText || ''}`.trim() : null)
            || 'Network error';
          const enriched = new Error(msg);
          enriched.status = status;
          enriched.url = url;
          throw enriched;
        } catch (e) {
          // Fallback in case building enriched error fails
          throw new Error('Network error');
        }
      }
    );
    return true;
  }

  // Expose resolved API base URL for building absolute links from the frontend (e.g., image placeholders)
  getApiBase() {
    return (this.api && this.api.defaults && this.api.defaults.baseURL) || DEFAULTS.primary;
  }

  // Build absolute URL against API base
  buildUrl(path) {
    const p = String(path || '');
    if (!p) return this.getApiBase();
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    const lead = p.startsWith('/') ? p : `/${p}`;
    return `${this.getApiBase()}${lead}`;
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
      if (Array.isArray(response)) return response; // legacy servers that return array directly
      const countries = response.countries || [];
      return countries;
    } catch (error) {
      // Fallback to legacy endpoint shape
      try {
        const legacy = await this.api.get('/locations/countries');
        return Array.isArray(legacy) ? legacy : (legacy.countries || []);
      } catch (e2) {
        console.error('Error fetching countries (all attempts failed):', e2);
        throw e2;
      }
    }
  }

  async getProvinces(countryId) {
    await this.ready;
    try {
      const response = countryId ? await this.api.get(`/api/provinces/${countryId}`) : await this.api.get('/api/provinces');
      if (Array.isArray(response)) return response;
      return response.provinces || [];
    } catch (error) {
      try {
        const legacy = countryId ? await this.api.get(`/locations/provinces/${countryId}`) : await this.api.get('/locations/provinces');
        return Array.isArray(legacy) ? legacy : (legacy.provinces || []);
      } catch (e2) {
        console.error('Error fetching provinces (all attempts failed):', e2);
        throw e2;
      }
    }
  }

  async getCities(provinceId) {
    await this.ready;
    try {
      const response = provinceId ? await this.api.get(`/api/cities/${provinceId}`) : await this.api.get('/api/cities');
      if (Array.isArray(response)) return response;
      return response.cities || [];
    } catch (error) {
      try {
        const legacy = provinceId ? await this.api.get(`/locations/cities/${provinceId}`) : await this.api.get('/locations/cities');
        return Array.isArray(legacy) ? legacy : (legacy.cities || []);
      } catch (e2) {
        console.error('Error fetching cities (all attempts failed):', e2);
        throw e2;
      }
    }
  }

  async getAreas(cityId) {
    await this.ready;
    try {
      const response = cityId ? await this.api.get(`/api/areas/${cityId}`) : await this.api.get('/api/areas/list');
      if (Array.isArray(response)) return response;
      return response.areas || [];
    } catch (error) {
      try {
        const legacy = cityId ? await this.api.get(`/locations/areas/${cityId}`) : await this.api.get('/locations/areas');
        return Array.isArray(legacy) ? legacy : (legacy.areas || []);
      } catch (e2) {
        console.error('Error fetching areas (all attempts failed):', e2);
        throw e2;
      }
    }
  }

  // List-all helpers (explicit)
  async listAllProvinces() {
    await this.ready;
    const r = await this.api.get('/api/provinces');
    return r.provinces || [];
  }
  async listAllCities() {
    await this.ready;
    const r = await this.api.get('/api/cities');
    return r.cities || [];
  }
  async listAllAreas() {
    await this.ready;
    const r = await this.api.get('/api/areas/list');
    return r.areas || [];
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

  // Attempt to fetch property type distribution for an area
  async getAreaTypeDistribution(areaId) {
    await this.ready;
    try {
      const response = await this.api.get(`/api/area/${areaId}/types/distribution`);
      // expected: { distribution: [ { type: 'residential', count: 123 }, ... ] }
      return response.distribution || response.types || [];
    } catch (error) {
      console.warn('Type distribution endpoint unavailable, falling back to mock:', error?.message || error);
      // Fallback: light mock to keep UI functional
      return [
        { type: 'residential', count: 50 },
        { type: 'commercial', count: 25 },
        { type: 'industrial', count: 15 },
        { type: 'retail', count: 10 }
      ];
    }
  }

  // Fetch average price series per property type for the past N years
  async getAreaTypePriceSeries(areaId, years = 10) {
    await this.ready;
    const months = Math.max(12, years * 12);
    const types = ['residential', 'commercial', 'industrial', 'retail'];
    // First try a consolidated endpoint
    try {
      const response = await this.api.get(`/api/area/${areaId}/price-series`, {
        params: { types: types.join(','), years }
      });
      // expected: { series: { residential: [{date, value}], commercial: [...], ... } }
      if (response && response.series) return response.series;
    } catch (e) {
      // ignore and try per-type trends fallback
    }

    // Fallback: request per-type metricType where backend supports custom metric types
    const out = {};
    try {
      for (const t of types) {
        const metricKey = `avg_price_${t}`; // e.g., avg_price_residential
        const trends = await this.getAreaTrends(areaId, metricKey, months);
        if (Array.isArray(trends) && trends.length) {
          out[t] = trends.map((d) => ({ date: d.metric_date, value: d.metric_value }));
        }
      }
    } catch (e) {
      // continue to mock if needed
    }

    // If still empty, generate a simple synthetic series for display
    if (!Object.keys(out).length) {
      const currentYear = new Date().getFullYear();
      const yearsArr = Array.from({ length: years }, (_, i) => currentYear - (years - 1) + i);
      const base = {
        residential: 2500000,
        commercial: 4200000,
        industrial: 3200000,
        retail: 3600000,
      };
      for (const t of types) {
        let v = base[t];
        out[t] = yearsArr.map((y) => {
          // simple synthetic trend with slight growth and noise
          v = Math.max(200000, v * (1 + 0.02) + (Math.random() - 0.5) * 80000);
          return { date: `${y}-01-01`, value: Math.round(v) };
        });
      }
    }
    return out;
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
    const dimensions = size === 'large' ? '800/400' : '400/200';
    return this.buildUrl(`/api/placeholder/${dimensions}?text=${encodeURIComponent(area.name)}`);
  }

  // Build placeholder URL directly
  getPlaceholderUrl(width = 800, height = 400, text = 'Placeholder') {
    return this.buildUrl(`/api/placeholder/${width}/${height}?text=${encodeURIComponent(text)}`);
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