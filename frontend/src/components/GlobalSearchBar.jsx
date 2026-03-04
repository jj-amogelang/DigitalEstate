/**
 * GlobalSearchBar.jsx
 * --------------------
 * Debounced autocomplete search field that lives in the top nav (App.js)
 * and optionally as a hero overlay.
 *
 * On selection → navigates to /explore?areaId=X&areaName=Y so ExplorePage
 * picks up the selection from the URL.
 *
 * Props
 * -----
 *   placeholder   string           – input placeholder text
 *   provinceId    number|null      – bias results toward detected province
 *   onSelect      (area) => void   – optional additional callback
 *   variant       'header' | 'hero' – style variant
 *   className     string
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import areaDataService from '../services/areaDataService';
import './GlobalSearchBar.css';

const DEBOUNCE_MS = 280;

// ── Search icon SVG ────────────────────────────────────────────────────────
function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="gsb-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
        strokeDasharray="50" strokeDashoffset="50" strokeLinecap="round"/>
    </svg>
  );
}

// Format one-line subtitle for a result row
function subtitle(area) {
  const parts = [area.city, area.province].filter(Boolean);
  if (area.postal_code) parts.push(area.postal_code);
  return parts.join(' · ');
}

export default function GlobalSearchBar({
  placeholder = 'Search suburb, city or postal code…',
  provinceId  = null,
  onSelect,
  variant     = 'header',
  className   = '',
}) {
  const navigate = useNavigate();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [active,   setActive]   = useState(-1);   // keyboard-highlighted index

  const inputRef   = useRef(null);
  const dropRef    = useRef(null);
  const debounceT  = useRef(null);
  const abortRef   = useRef(null);

  // ── Fetch suggestions ───────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q) => {
    if (q.trim().length < 1) { setResults([]); setOpen(false); return; }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const areas = await areaDataService.searchAreas(q, { provinceId, limit: 20 });
      setResults(areas);
      setOpen(areas.length > 0);
      setActive(-1);
    } catch {
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [provinceId]);

  // ── Debounced input handler ─────────────────────────────────────────────
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceT.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    debounceT.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
  };

  // ── Selection ────────────────────────────────────────────────────────────
  const handleSelect = useCallback((area) => {
    setQuery(area.name);
    setOpen(false);
    setResults([]);
    onSelect && onSelect(area);
    // Navigate to explore page with this area pre-selected
    const params = new URLSearchParams({
      areaId:   area.id,
      areaName: area.name,
    });
    navigate(`/explore?${params.toString()}`);
  }, [navigate, onSelect]);

  // ── Keyboard navigation ─────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(a => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && results[active]) handleSelect(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (active < 0 || !dropRef.current) return;
    const item = dropRef.current.querySelector(`[data-idx="${active}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e) {
      if (!inputRef.current?.closest('.gsb-root')?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => () => {
    clearTimeout(debounceT.current);
    abortRef.current?.abort();
  }, []);

  return (
    <div className={`gsb-root gsb-${variant} ${className}`} role="search">
      <div className="gsb-input-row">
        <span className="gsb-icon-left">
          {loading ? <SpinnerIcon /> : <SearchIcon size={variant === 'hero' ? 20 : 16} />}
        </span>
        <input
          ref={inputRef}
          type="search"
          className="gsb-input"
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          spellCheck="false"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length) setOpen(true); }}
          aria-label="Search areas"
          aria-autocomplete="list"
          aria-controls="gsb-dropdown"
          aria-activedescendant={active >= 0 ? `gsb-opt-${active}` : undefined}
          aria-expanded={open}
          role="combobox"
        />
        {query && (
          <button
            className="gsb-clear"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            aria-label="Clear search"
            tabIndex={-1}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          id="gsb-dropdown"
          ref={dropRef}
          className="gsb-dropdown"
          role="listbox"
          aria-label="Area suggestions"
        >
          {results.map((area, i) => (
            <li
              key={area.id}
              id={`gsb-opt-${i}`}
              data-idx={i}
              className={`gsb-option${i === active ? ' gsb-option--active' : ''}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => { e.preventDefault(); handleSelect(area); }}
            >
              <span className="gsb-option-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.7"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.7"/>
                </svg>
              </span>
              <span className="gsb-option-body">
                <span className="gsb-option-name">{area.name}</span>
                {subtitle(area) && (
                  <span className="gsb-option-sub">{subtitle(area)}</span>
                )}
              </span>
              <span className="gsb-option-arrow" aria-hidden="true">›</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
