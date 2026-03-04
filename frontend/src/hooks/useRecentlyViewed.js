/**
 * useRecentlyViewed.js
 * --------------------
 * Manages two localStorage lists:
 *   de_recent_areas  – last 6 areas the user navigated to (LIFO, auto-dedup)
 *   de_saved_areas   – areas the user explicitly saved/bookmarked
 *
 * Each entry shape:
 *   { id, name, city, province, timestamp }
 *
 * Usage:
 *   const { recent, saved, pushRecent, saveArea, unsaveArea, isSaved } = useRecentlyViewed();
 */
import { useState, useCallback, useEffect } from 'react';

const RECENT_KEY  = 'de_recent_areas';
const SAVED_KEY   = 'de_saved_areas';
const MAX_RECENT  = 6;
const MAX_SAVED   = 20;

function readLS(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export default function useRecentlyViewed() {
  const [recent, setRecent] = useState(() => readLS(RECENT_KEY, []));
  const [saved,  setSaved]  = useState(() => readLS(SAVED_KEY,  []));

  // Keep state in sync if another tab changes localStorage
  useEffect(() => {
    function onStorage(e) {
      if (e.key === RECENT_KEY) setRecent(readLS(RECENT_KEY, []));
      if (e.key === SAVED_KEY)  setSaved(readLS(SAVED_KEY,  []));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** Add an area to recently-viewed (deduplicates; most-recent at front). */
  const pushRecent = useCallback((area) => {
    if (!area?.id) return;
    setRecent(prev => {
      const entry = {
        id:        area.id,
        name:      area.name      || '',
        city:      area.city      || '',
        province:  area.province  || '',
        timestamp: Date.now(),
      };
      const filtered = prev.filter(r => String(r.id) !== String(area.id));
      const next = [entry, ...filtered].slice(0, MAX_RECENT);
      writeLS(RECENT_KEY, next);
      return next;
    });
  }, []);

  /** Persist an area as explicitly saved. */
  const saveArea = useCallback((area) => {
    if (!area?.id) return;
    setSaved(prev => {
      if (prev.some(s => String(s.id) === String(area.id))) return prev;
      const entry = {
        id:       area.id,
        name:     area.name     || '',
        city:     area.city     || '',
        province: area.province || '',
        savedAt:  Date.now(),
      };
      const next = [entry, ...prev].slice(0, MAX_SAVED);
      writeLS(SAVED_KEY, next);
      return next;
    });
  }, []);

  /** Remove an area from saved list. */
  const unsaveArea = useCallback((areaId) => {
    setSaved(prev => {
      const next = prev.filter(s => String(s.id) !== String(areaId));
      writeLS(SAVED_KEY, next);
      return next;
    });
  }, []);

  /** Toggle saved status. Returns new saved state (boolean). */
  const toggleSave = useCallback((area) => {
    const alreadySaved = saved.some(s => String(s.id) === String(area?.id));
    if (alreadySaved) {
      unsaveArea(area.id);
      return false;
    } else {
      saveArea(area);
      return true;
    }
  }, [saved, saveArea, unsaveArea]);

  const isSaved = useCallback((areaId) =>
    saved.some(s => String(s.id) === String(areaId)),
  [saved]);

  /** IDs of recently viewed areas (for backend recommended exclusion list). */
  const recentIds = recent.map(r => r.id);

  return { recent, saved, recentIds, pushRecent, saveArea, unsaveArea, toggleSave, isSaved };
}
