/**
 * MarketIntelligencePanel.jsx
 * ----------------------------
 * Compact Market Intelligence panel displayed in the CoG modal's left sidebar
 * (below the weight sliders, above the CoG result section).
 *
 * Also rendered on the ExplorePage whenever an area is selected and updates
 * whenever the CoG recalculates.
 *
 * Props
 * -----
 *  areaId      string | number  – area to load data for
 *  cogResult   object | null    – latest CoG result; used as a re-fetch trigger
 *  compact     bool             – use condensed layout (default: false)
 */

import React, { useEffect, useRef, useState } from 'react';
import areaDataService from '../services/areaDataService';
import './styles/MarketIntelligencePanel.css';

// ── Direction indicator helpers ────────────────────────────────────────────
const ARROW_UP   = '▲';
const ARROW_DOWN = '▼';
const ARROW_FLAT = '●';

function directionArrow(direction) {
  if (direction === 'up' || direction === 'improving') return ARROW_UP;
  if (direction === 'down' || direction === 'worsening') return ARROW_DOWN;
  return ARROW_FLAT;
}

function directionClass(direction) {
  if (direction === 'up' || direction === 'improving') return 'mip-dir--up';
  if (direction === 'down' || direction === 'worsening') return 'mip-dir--down';
  return 'mip-dir--flat';
}

/**
 * For crime the "good" direction is down (lower score = safer).
 * For vacancy the "good" direction is also down.
 * This helper returns which CSS class to apply for the positive/negative colouring.
 */
function directionColor(direction, inverted = false) {
  const isPositive =
    inverted
      ? direction === 'improving' || direction === 'down'
      : direction === 'up' || direction === 'improving';
  if (isPositive) return 'mip-c--positive';
  if (direction === 'stable') return 'mip-c--neutral';
  return 'mip-c--negative';
}

// ── Score bar ──────────────────────────────────────────────────────────────
function ScoreBar({ score, max = 100 }) {
  const pct = score != null ? Math.min(100, Math.max(0, (score / max) * 100)) : 0;
  return (
    <div className="mip-score-bar-track" title={score != null ? `${score.toFixed(1)} / ${max}` : 'N/A'}>
      <div className="mip-score-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Trend pill row (3m / 6m / 12m) ────────────────────────────────────────
function TrendPills({ t3m, t6m, t12m, unit, current }) {
  const fmt = (v) => {
    if (v == null) return '—';
    if (unit === 'ZAR/m²' || unit === 'ZAR') {
      if (v >= 1_000_000) return `R${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000)     return `R${(v / 1_000).toFixed(0)}K`;
      return `R${Math.round(v).toLocaleString()}`;
    }
    return `${Number(v).toFixed(1)}${unit ? ` ${unit}` : ''}`;
  };

  const delta = (avg) => {
    if (avg == null || current == null || avg === 0) return null;
    return ((current - avg) / Math.abs(avg)) * 100;
  };

  const pills = [
    { label: '3m', avg: t3m },
    { label: '6m', avg: t6m },
    { label: '12m', avg: t12m },
  ];

  return (
    <div className="mip-trend-pills">
      {pills.map(({ label, avg }) => {
        const d = delta(avg);
        const isUp   = d !== null && d > 1;
        const isDown = d !== null && d < -1;
        return (
          <div key={label} className="mip-trend-pill">
            <span className="mip-pill-label">{label}</span>
            <span className="mip-pill-val">{fmt(avg)}</span>
            {d !== null && (
              <span className={`mip-pill-delta ${isUp ? 'mip-c--positive' : isDown ? 'mip-c--negative' : 'mip-c--neutral'}`}>
                {isUp ? ARROW_UP : isDown ? ARROW_DOWN : ARROW_FLAT}
                {Math.abs(d).toFixed(1)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────
function Skeleton({ rows = 4 }) {
  return (
    <div className="mip-skeleton" aria-busy="true" aria-label="Loading market intelligence">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="mip-skeleton-row">
          <div className="mip-skeleton-label" />
          <div className="mip-skeleton-bar" />
        </div>
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function Empty() {
  return (
    <div className="mip-empty">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 16l4-4 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span>No market data available for this area yet.</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function MarketIntelligencePanel({ areaId, cogResult, compact = false }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!areaId) {
      setData(null);
      setError(null);
      return;
    }

    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current();
    let cancelled = false;
    abortRef.current = () => { cancelled = true; };

    setLoading(true);
    setError(null);

    areaDataService.getAreaMarketIntel(areaId)
      .then((res) => {
        if (cancelled) return;
        if (res && res.success) {
          setData(res);
        } else {
          setData(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('MarketIntelligencePanel fetch error:', err);
        setError('Could not load market data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [areaId, cogResult]); // re-fetch when CoG recalculates

  const fmtPrice = (v) => {
    if (v == null) return '—';
    if (v >= 1_000_000) return `R${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `R${(v / 1_000).toFixed(0)}K`;
    return `R${Math.round(v).toLocaleString()}`;
  };
  const fmtPct = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
  const fmtScore = (v) => (v == null ? '—' : `${Number(v).toFixed(0)}`);

  return (
    <section className={`mip-panel${compact ? ' mip-panel--compact' : ''}`}>
      {/* Header */}
      <div className="mip-header">
        <svg className="mip-header-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 16l4-4 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="mip-header-title">Market Intelligence</span>
        {loading && (
          <span className="mip-header-loader" aria-label="Loading">
            <span className="mip-spinner" />
          </span>
        )}
      </div>

      {/* States */}
      {loading && !data && <Skeleton rows={compact ? 3 : 5} />}
      {!loading && error && <div className="mip-error">{error}</div>}
      {!loading && !error && !data && areaId && <Empty />}

      {/* Content */}
      {data && (
        <div className="mip-content">

          {/* ── Yield ──────────────────────────────────────────── */}
          <div className="mip-row">
            <div className="mip-row-head">
              <span className="mip-row-label">Rental Yield</span>
              <span className={`mip-row-value ${directionColor(data.yield.direction)}`}>
                {fmtPct(data.yield.current)}
                <span className={`mip-dir ${directionClass(data.yield.direction)}`}>
                  {directionArrow(data.yield.direction)}
                </span>
              </span>
            </div>
            {!compact && (
              <TrendPills
                t3m={data.yield.trend_3m}
                t6m={data.yield.trend_6m}
                t12m={data.yield.trend_12m}
                unit="%"
                current={data.yield.current}
              />
            )}
          </div>

          {/* ── Vacancy ────────────────────────────────────────── */}
          <div className="mip-row">
            <div className="mip-row-head">
              <span className="mip-row-label">Vacancy Rate</span>
              <span className={`mip-row-value ${directionColor(data.vacancy.direction, true)}`}>
                {fmtPct(data.vacancy.current)}
                <span className={`mip-dir ${directionClass(data.vacancy.direction)}`}>
                  {directionArrow(data.vacancy.direction)}
                </span>
              </span>
            </div>
            {!compact && (
              <TrendPills
                t3m={data.vacancy.trend_3m}
                t6m={data.vacancy.trend_6m}
                t12m={data.vacancy.trend_12m}
                unit="%"
                current={data.vacancy.current}
              />
            )}
          </div>

          {/* ── Price / m² ─────────────────────────────────────── */}
          <div className="mip-row">
            <div className="mip-row-head">
              <span className="mip-row-label">Price / m²</span>
              <span className={`mip-row-value ${directionColor(data.price_per_m2.direction)}`}>
                {fmtPrice(data.price_per_m2.current)}
                <span className={`mip-dir ${directionClass(data.price_per_m2.direction)}`}>
                  {directionArrow(data.price_per_m2.direction)}
                </span>
              </span>
            </div>
            {!compact && (
              <TrendPills
                t3m={data.price_per_m2.trend_3m}
                t6m={data.price_per_m2.trend_6m}
                t12m={data.price_per_m2.trend_12m}
                unit="ZAR/m²"
                current={data.price_per_m2.current}
              />
            )}
          </div>

          {/* ── Footfall & Transit ─────────────────────────────── */}
          <div className="mip-row mip-row--scores">
            <div className="mip-score-item">
              <span className="mip-row-label">Footfall</span>
              <span className="mip-score-badge">{data.footfall.label}</span>
              <ScoreBar score={data.footfall.score} />
            </div>
            <div className="mip-score-item">
              <span className="mip-row-label">Transit Access</span>
              <span className="mip-score-badge">{data.transit.label}</span>
              <ScoreBar score={data.transit.score} />
            </div>
          </div>

          {/* ── Crime ──────────────────────────────────────────── */}
          <div className="mip-row">
            <div className="mip-row-head">
              <span className="mip-row-label">Safety Index</span>
              <span className={`mip-row-value ${directionColor(data.crime.direction, true)}`}>
                <span className="mip-crime-label">{data.crime.label}</span>
                {data.crime.score != null && (
                  <span className="mip-crime-score">({fmtScore(data.crime.score)})</span>
                )}
                <span className={`mip-dir ${directionClass(data.crime.direction)}`}>
                  {directionArrow(data.crime.direction)}
                </span>
              </span>
            </div>
            {!compact && data.crime.direction !== 'stable' && (
              <p className="mip-crime-note">
                Crime trend is{' '}
                <strong className={data.crime.direction === 'improving' ? 'mip-c--positive' : 'mip-c--negative'}>
                  {data.crime.direction}
                </strong>
                {' '}over the last 6 months.
              </p>
            )}
          </div>

        </div>
      )}
    </section>
  );
}
