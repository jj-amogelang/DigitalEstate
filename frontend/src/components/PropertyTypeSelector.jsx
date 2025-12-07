import React, { useEffect, useMemo, useState } from 'react';
import './styles/PropertyTypeSelector.css';

const DEFAULT_TYPES = [
  { key: 'residential', label: 'Residential' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'industrial', label: 'Industrial' },
  { key: 'retail', label: 'Retail' }
];

export default function PropertyTypeSelector({
  value,
  onChange,
  className = '',
  types = DEFAULT_TYPES,
  size = 'md',
  align = 'right',
  storageKey = 'selectedPropertyType'
}) {
  const [open, setOpen] = useState(false);
  const current = useMemo(() => {
    return types.find(t => t.key === value) || types[0];
  }, [types, value]);

  // Initialize from localStorage if no value provided
  useEffect(() => {
    if (!value) {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) onChange?.(saved);
      } catch {}
    }
  }, [value, onChange, storageKey]);

  const setAndPersist = (key) => {
    onChange?.(key);
    try { window.localStorage.setItem(storageKey, key); } catch {}
    setOpen(false);
  };

  return (
    <div className={`property-type-selector ${className} ${open ? 'open' : ''} size-${size} align-${align}`}> 
      <button className="pts-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <span className="pts-label">Property Type</span>
        <span className="pts-value">{current.label}</span>
        <svg className="pts-caret" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div className="pts-menu" role="listbox">
          {types.map(t => (
            <button key={t.key} role="option" aria-selected={t.key === current.key}
              className={`pts-option ${t.key === current.key ? 'selected' : ''}`}
              onClick={() => setAndPersist(t.key)}>
              <span className="pts-option-label">{t.label}</span>
              {t.key === current.key && (
                <svg width="16" height="16" viewBox="0 0 24 24" className="pts-check">
                  <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
