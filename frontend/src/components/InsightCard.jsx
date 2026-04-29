/**
 * InsightCard.jsx
 * ---------------
 * "Why this location was chosen" insight panel.
 * Fetches /api/areas/:id/why-chosen and renders bullet reasons
 * with gold (positive) or grey (neutral/negative) indicators.
 *
 * Props
 * -----
 *   areaId    number|string   – required, triggers fetch
 *   areaName  string          – displayed in header
 */
import React, { useEffect, useState, useRef } from 'react';
import areaDataService from '../services/areaDataService';
import './styles/InsightCard.css';

const ICON_TO_METRIC_KEY = {
  yield: 'rental_yield',
  vacancy: 'vacancy_rate',
  price: 'price_per_sqm',
  transit: 'transit_score',
  amenities: 'amenity_score',
  crime: 'crime_index',
};

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fallbackReasonsFromSummary(summary) {
  if (!summary || typeof summary !== 'object') return [];
  const reasons = [];

  const rentalYield = toNumber(summary.rental_yield);
  if (rentalYield != null) {
    reasons.push({
      metric_key: 'rental_yield',
      text: `Rental yield ${rentalYield.toFixed(1)}%`,
      positive: rentalYield >= 7,
      value: rentalYield,
      formatted_value: `${rentalYield.toFixed(1)}%`,
    });
  }

  const vacancyRate = toNumber(summary.vacancy_rate);
  if (vacancyRate != null) {
    reasons.push({
      metric_key: 'vacancy_rate',
      text: `Vacancy rate ${vacancyRate.toFixed(1)}%`,
      positive: vacancyRate <= 8,
      value: vacancyRate,
      formatted_value: `${vacancyRate.toFixed(1)}%`,
    });
  }

  const pricePerSqm = toNumber(summary.price_per_sqm);
  if (pricePerSqm != null) {
    reasons.push({
      metric_key: 'price_per_sqm',
      text: `Price R${pricePerSqm.toLocaleString(undefined, { maximumFractionDigits: 0 })}/m²`,
      positive: true,
      value: pricePerSqm,
      formatted_value: `R${pricePerSqm.toLocaleString(undefined, { maximumFractionDigits: 0 })}/m²`,
    });
  }

  const transportScore = toNumber(summary.transport_score);
  if (transportScore != null) {
    reasons.push({
      metric_key: 'transit_score',
      text: `Transit score ${transportScore.toFixed(0)}/100`,
      positive: transportScore >= 50,
      value: transportScore,
      formatted_value: `${transportScore.toFixed(0)}/100`,
    });
  }

  return reasons.slice(0, 4);
}

function normalizeReason(reason) {
  const metricKey = reason?.metric_key || ICON_TO_METRIC_KEY[reason?.icon] || 'info';
  return {
    ...reason,
    metric_key: metricKey,
    text: reason?.text || 'Market signal available for this location.',
  };
}

// Icon map: metric_key → SVG
function MetricIcon({ type }) {
  const icons = {
    rental_yield: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    vacancy_rate: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    price_per_sqm: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/>
      </svg>
    ),
    transit_score: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="14" rx="2"/>
        <path d="M8 4v16M16 4v16M3 9h18M3 14h18"/>
      </svg>
    ),
    footfall_index: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    crime_index: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    amenity_score: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  };
  return icons[type] || (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4M12 16h.01"/>
    </svg>
  );
}

function SkeletonRow() {
  return (
    <li className="ic-skeleton-row" aria-hidden="true">
      <span className="ic-skeleton ic-skeleton-icon"/>
      <span className="ic-skeleton ic-skeleton-text"/>
    </li>
  );
}

export default function InsightCard({ areaId, areaName }) {
  const [reasons, setReasons]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState(null);
  const prevIdRef               = useRef(null);

  useEffect(() => {
    if (!areaId || areaId === prevIdRef.current) return;
    prevIdRef.current = areaId;

    let cancelled = false;
    setLoading(true);
    setError(null);

    areaDataService.getAreaWhyChosen(areaId)
      .then(async data => {
        if (cancelled) return;
        const apiReasons = Array.isArray(data?.reasons) ? data.reasons.map(normalizeReason) : [];
        if (apiReasons.length > 0) {
          setReasons(apiReasons);
          return;
        }

        const summary = await areaDataService.getAreaSummary(areaId);
        if (cancelled) return;
        setReasons(fallbackReasonsFromSummary(summary));
      })
      .catch(() => {
        if (!cancelled) setError('Could not load insights');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [areaId]);

  if (!areaId) return null;

  return (
    <div className="ic-root" role="region" aria-label="Why this area was chosen">
      <header className="ic-header">
        <span className="ic-header-label">Why This Location</span>
        {areaName && <span className="ic-header-area">{areaName}</span>}
      </header>

      {error && <p className="ic-error">{error}</p>}

      <ul className="ic-list" aria-live="polite">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <SkeletonRow key={i} />)
          : reasons.map((r, i) => (
              <li key={i} className={`ic-row${r.positive ? ' ic-row--pos' : ' ic-row--neu'}`}>
                <span className="ic-dot" aria-hidden="true"/>
                <span className="ic-icon" aria-hidden="true">
                  <MetricIcon type={r.metric_key} />
                </span>
                <span className="ic-text">{r.text}</span>
                {r.value !== undefined && (
                  <span className="ic-value">{r.formatted_value || r.value}</span>
                )}
              </li>
            ))
        }
      </ul>

      {!loading && reasons.length === 0 && !error && (
        <p className="ic-empty">No insights available for this area yet.</p>
      )}
    </div>
  );
}
