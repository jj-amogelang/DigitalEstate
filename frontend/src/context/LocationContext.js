/**
 * LocationContext
 * ---------------
 * Single source of truth for user location across the app.
 *
 * Flow:
 *  1. On first visit (no permission stored): show LocationPermissionModal.
 *  2. If user clicks "Allow":  browser prompts → GPS coords → nearest area API.
 *  3. If user clicks "Skip" / browser denies: fall back to a random popular area.
 *  4. On subsequent visits the decision is remembered via localStorage.
 *
 * Consumers call `useAppLocation()` to get:
 *  {
 *    area,            // GPS-detected { id, name, province_id, … } or null
 *    popularArea,     // random popular area (used when location is unavailable)
 *    effectiveArea,   // area ?? popularArea  — the best area to show now
 *    loading,         // true while GPS / API in progress
 *    source,          // 'loading' | 'gps' | 'cache' | 'popular' | 'denied' | 'error'
 *    permissionState, // 'idle' | 'asking' | 'granted' | 'denied' | 'error'
 *    isLocationBased, // true when source is 'gps' or 'cache'
 *    showModal,       // true → render <LocationPermissionModal>
 *    requestPermission, dismissModal,
 *  }
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import areaDataService from '../services/areaDataService';

// --------------------------------------------------------------------------- //
// Well-known popular areas in South Africa used as fallback
// --------------------------------------------------------------------------- //
const POPULAR_AREA_NAMES = [
  'Sandton',
  'Rosebank',
  'Fourways',
  'Midrand',
  'Centurion',
  'Umhlanga',
  'Waterfront',
  'Claremont',
  'Stellenbosch',
  'Durban North',
];

// Storage keys
const PERM_KEY  = 'de_location_perm';   // 'granted' | 'denied' | 'error'
const AREA_KEY  = 'de_detected_area';   // sessionStorage – shared with useAreaDetect

// --------------------------------------------------------------------------- //

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [showModal,       setShowModal]       = useState(false);
  const [permissionState, setPermissionState] = useState('idle');
  const [area,            setArea]            = useState(null);
  const [popularArea,     setPopularArea]     = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [source,          setSource]          = useState('loading');

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Pick a truly random popular area name (different on each call). */
  const pickRandomName = () =>
    POPULAR_AREA_NAMES[Math.floor(Math.random() * POPULAR_AREA_NAMES.length)];

  /** Fetch a popular area from the backend (random choice). */
  const fetchPopularArea = useCallback(async () => {
    const name = pickRandomName();
    try {
      const results = await areaDataService.searchAreas(name, { limit: 5 });
      if (results && results.length > 0) {
        // prefer an exact match, fall back to first result
        const exact = results.find(a => a.name?.toLowerCase() === name.toLowerCase());
        const chosen = exact || results[0];
        setPopularArea(chosen);
        return chosen;
      }
    } catch (e) {
      console.warn('[LocationContext] popular area fetch failed:', e?.message || e);
    }
    return null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Reverse-geocode GPS coords to the nearest area in the DB. */
  const resolveFromCoords = useCallback(async (lat, lng) => {
    try {
      const result = await areaDataService.getNearestArea(lat, lng);
      if (result) {
        try { sessionStorage.setItem(AREA_KEY, JSON.stringify(result)); } catch {}
        setArea(result);
        setSource('gps');
        setPermissionState('granted');
        try { localStorage.setItem(PERM_KEY, 'granted'); } catch {}
      } else {
        setSource('error');
      }
    } catch (e) {
      console.warn('[LocationContext] getNearestArea failed:', e?.message || e);
      setSource('error');
    } finally {
      setLoading(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Public actions
  // -----------------------------------------------------------------------

  /** Called when the user clicks "Use My Location" in the modal. */
  const requestPermission = useCallback(() => {
    setShowModal(false);
    if (!navigator?.geolocation) {
      setPermissionState('error');
      setSource('error');
      setLoading(false);
      return;
    }
    setPermissionState('asking');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolveFromCoords(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        const newState = denied ? 'denied' : 'error';
        setPermissionState(newState);
        setSource(denied ? 'denied' : 'error');
        try { localStorage.setItem(PERM_KEY, newState); } catch {}
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, [resolveFromCoords]);

  /** Called when the user clicks "Not now" in the modal. */
  const dismissModal = useCallback(() => {
    setShowModal(false);
    setPermissionState('denied');
    setSource('popular');
    try { localStorage.setItem(PERM_KEY, 'denied'); } catch {}
    setLoading(false);
  }, []);

  // -----------------------------------------------------------------------
  // Initialisation — runs once on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const stored = (() => { try { return localStorage.getItem(PERM_KEY); } catch { return null; } })();

      // ── Already granted: try session cache, else silently re-request GPS ──
      if (stored === 'granted') {
        try {
          const cached = sessionStorage.getItem(AREA_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.id) {
              if (!cancelled) {
                setArea(parsed);
                setPermissionState('granted');
                setSource('cache');
                setLoading(false);
              }
              return;
            }
          }
        } catch {}

        // Session cache missing — silently re-request GPS (browser won't re-prompt)
        if (!cancelled) {
          setPermissionState('asking');
          setLoading(true);
        }
        if (navigator?.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => { if (!cancelled) resolveFromCoords(pos.coords.latitude, pos.coords.longitude); },
            () => { if (!cancelled) { setPermissionState('error'); setSource('error'); setLoading(false); } },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
          );
        } else {
          if (!cancelled) { setPermissionState('error'); setSource('error'); setLoading(false); }
        }
        return;
      }

      // ── Already denied / error: skip modal, head straight to popular area ──
      if (stored === 'denied' || stored === 'error') {
        if (!cancelled) {
          setPermissionState(stored === 'denied' ? 'denied' : 'error');
          setSource('popular');
          setLoading(false);
        }
        return;
      }

      // ── First visit: show the permission modal ──
      if (!cancelled) {
        setShowModal(true);
        setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------------------------------------------------
  // Trigger popular area fetch whenever we determine location isn't available
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (loading) return;
    const needsFallback =
      permissionState === 'denied' ||
      permissionState === 'error'  ||
      source === 'popular';
    if (needsFallback && !popularArea) {
      fetchPopularArea();
    }
  }, [loading, permissionState, source, popularArea, fetchPopularArea]);

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------
  const isLocationBased  = source === 'gps' || source === 'cache';
  const effectiveArea    = area ?? popularArea;

  const value = {
    area,
    popularArea,
    effectiveArea,
    loading,
    source,
    permissionState,
    isLocationBased,
    showModal,
    requestPermission,
    dismissModal,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

/** Hook to consume location context anywhere in the tree. */
export function useAppLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useAppLocation must be used inside <LocationProvider>');
  return ctx;
}

export default LocationContext;
