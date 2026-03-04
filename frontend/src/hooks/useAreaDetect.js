/**
 * useAreaDetect
 * -------------
 * Detects the user's current area using the browser Geolocation API.
 *
 * Flow:
 *   1. Request `navigator.geolocation.getCurrentPosition` (precise GPS)
 *   2. POST the coords to `/api/areas/nearest` — returns closest area in DB
 *   3. On permission denied / timeout / error → returns null (caller falls back
 *      to province-level or manual selection)
 *
 * The result is cached in sessionStorage so navigation between pages doesn't
 * re-prompt the user.
 *
 * @returns {{
 *   area: {id, name, city, province, province_id, lat, lng, dist_km} | null,
 *   loading: boolean,
 *   permissionDenied: boolean,
 *   source: 'gps' | 'cache' | 'denied' | 'error' | 'loading'
 * }}
 */
import { useState, useEffect } from 'react';
import areaDataService from '../services/areaDataService';

const CACHE_KEY = 'de_detected_area';
const GEO_TIMEOUT_MS = 8000;

export default function useAreaDetect() {
  const [state, setState] = useState({
    area: null,
    loading: true,
    permissionDenied: false,
    source: 'loading',
  });

  useEffect(() => {
    // 1. Check session cache first — avoids re-prompting on every navigation
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) {
          setState({ area: parsed, loading: false, permissionDenied: false, source: 'cache' });
          return;
        }
      }
    } catch (_) {}

    // 2. Browser Geolocation API not available (SSR / old browser)
    if (!navigator || !navigator.geolocation) {
      setState({ area: null, loading: false, permissionDenied: false, source: 'error' });
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelled) return;
        const { latitude, longitude } = position.coords;
        try {
          const result = await areaDataService.getNearestArea(latitude, longitude);
          if (cancelled) return;
          if (result) {
            // Cache so we don't re-prompt this session
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch (_) {}
            setState({ area: result, loading: false, permissionDenied: false, source: 'gps' });
          } else {
            setState({ area: null, loading: false, permissionDenied: false, source: 'error' });
          }
        } catch {
          if (!cancelled) setState({ area: null, loading: false, permissionDenied: false, source: 'error' });
        }
      },
      (err) => {
        if (cancelled) return;
        const denied = err.code === err.PERMISSION_DENIED;
        setState({ area: null, loading: false, permissionDenied: denied, source: denied ? 'denied' : 'error' });
      },
      {
        enableHighAccuracy: false,   // coarse accuracy is fine — just need the area
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 5 * 60 * 1000,  // reuse a cached fix up to 5 minutes old
      }
    );

    return () => { cancelled = true; };
  }, []);

  return state;
}
