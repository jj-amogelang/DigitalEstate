/**
 * useProvinceDetect
 *
 * Automatically detects the user's approximate province via IP geolocation
 * (ipapi.co — no permission needed, no user prompt).
 *
 * Resolution order:
 *   1. sessionStorage cache  →  avoids repeat network calls on navigation
 *   2. ipapi.co/json/        →  returns `region` field matching SA province names
 *   3. Fuzzy match           →  normalise both strings for partial matches
 *   4. Fallback              →  first province in list (usually Gauteng alphabetically)
 *
 * @param {Array} allProvinces  - Array of { id, name } province objects
 * @returns {{ provinceId: number|null, provinceName: string|null, source: string, loading: boolean }}
 */
import { useState, useEffect } from 'react';

const CACHE_KEY = 'de_detected_province';

/** Normalise a province name for fuzzy comparison */
function normalise(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Find best province match for the region string returned by IP lookup */
function matchProvince(region, provinces) {
  if (!region || !provinces || !provinces.length) return null;
  const needle = normalise(region);

  // Exact match
  let match = provinces.find(p => normalise(p.name) === needle);
  if (match) return match;

  // Starts-with match (handles "KwaZulu-Natal" vs "KwaZulu Natal")
  match = provinces.find(p => needle.startsWith(normalise(p.name)) || normalise(p.name).startsWith(needle));
  if (match) return match;

  // Contains match
  match = provinces.find(p => needle.includes(normalise(p.name)) || normalise(p.name).includes(needle));
  return match || null;
}

export default function useProvinceDetect(allProvinces) {
  const [state, setState] = useState({
    provinceId: null,
    provinceName: null,
    source: 'loading',
    loading: true,
  });

  useEffect(() => {
    if (!allProvinces || allProvinces.length === 0) return; // wait for list

    // 1. Check session cache
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.provinceId) {
          setState({ ...parsed, source: 'cache', loading: false });
          return;
        }
      }
    } catch (_) {
      // ignore parse errors
    }

    // 2. IP geolocation
    let cancelled = false;

    async function detect() {
      let regionFromIp = null;
      try {
        const resp = await fetch('https://ipapi.co/json/', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        if (resp.ok) {
          const data = await resp.json();
          regionFromIp = data.region || null;
        }
      } catch (_) {
        // network error — fall through to fallback
      }

      if (cancelled) return;

      // 3. Match region name to province list
      let matched = regionFromIp ? matchProvince(regionFromIp, allProvinces) : null;
      let source = matched ? 'ip' : 'fallback';

      // 4. Fallback: prefer Gauteng if present, otherwise first in list
      if (!matched) {
        matched =
          allProvinces.find(p => normalise(p.name) === 'gauteng') ||
          allProvinces[0];
      }

      const result = {
        provinceId: matched ? matched.id : null,
        provinceName: matched ? matched.name : null,
        source,
        loading: false,
      };

      // Cache for this session
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
      } catch (_) {}

      if (!cancelled) setState(result);
    }

    detect();

    return () => {
      cancelled = true;
    };
  }, [allProvinces]);

  return state;
}
