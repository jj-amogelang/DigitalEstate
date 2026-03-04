/**
 * InsightDashboard
 *
 * Province-level landing experience for the Explore page.
 * Shows 6 insight category panels + hot-zone map + CoG CTA.
 *
 * Props:
 *   insights       – { rising_yield, falling_vacancy, best_value,
 *                      high_transit, low_crime, planned_dev }
 *   hot_zones      – Array of hot zone objects for HotZoneMap
 *   provinceName   – String
 *   detectionSource – 'ip' | 'cache' | 'fallback' | 'loading'
 *   loading        – Boolean
 *   onAreaClick    – (areaId, areaName) => void  (routes user into the area)
 *   onCogClick     – () => void
 */
import React from 'react';
import HotZoneMap from './HotZoneMap';
import './styles/InsightDashboard.css';

/* ---- Inline SVG icons per category ---- */
const Icons = {
  RisingYield: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  FallingVacancy: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 18 23 18 23 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  BestValue: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  HighTransit: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 19h8M12 16v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M4 9h16" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="8.5" cy="12" r="1" fill="currentColor"/>
      <circle cx="15.5" cy="12" r="1" fill="currentColor"/>
    </svg>
  ),
  LowCrime: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  PlannedDev: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  BullsEye: () => (
    <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      <circle cx="18" cy="18" r="5"  stroke="currentColor" strokeWidth="2"   fill="none"/>
      <line x1="18" y1="3"  x2="18" y2="10" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="18" y1="26" x2="18" y2="33" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="3"  y1="18" x2="10" y2="18" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="26" y1="18" x2="33" y2="18" stroke="currentColor" strokeWidth="2.5"/>
    </svg>
  ),
};

/* ---- Config for the 6 panels ---- */
const PANEL_CONFIG = [
  {
    key: 'rising_yield',
    title: 'Rising Yield',
    subtitle: 'highest rental return',
    Icon: Icons.RisingYield,
  },
  {
    key: 'falling_vacancy',
    title: 'Falling Vacancy',
    subtitle: 'lowest vacancy rate',
    Icon: Icons.FallingVacancy,
  },
  {
    key: 'best_value',
    title: 'Best Value',
    subtitle: 'yield per price ratio',
    Icon: Icons.BestValue,
  },
  {
    key: 'high_transit',
    title: 'High Transit',
    subtitle: 'transport score',
    Icon: Icons.HighTransit,
  },
  {
    key: 'low_crime',
    title: 'Low Crime',
    subtitle: 'safest premium areas',
    Icon: Icons.LowCrime,
  },
  {
    key: 'planned_dev',
    title: 'Planned Development',
    subtitle: 'development activity',
    Icon: Icons.PlannedDev,
  },
];

/* ---- Skeleton shimmer row ---- */
function SkeletonRow() {
  return (
    <li className="insight-panel__item" aria-hidden="true">
      <div className="insight-panel__item-left">
        <div className="insight-panel__area-name" style={{
          width: '120px', height: '12px',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '400px 100%',
          animation: 'ins-shimmer 1.4s infinite',
          borderRadius: '3px',
        }} />
        <div className="insight-panel__city-name" style={{
          width: '80px', height: '10px', marginTop: '4px',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '400px 100%',
          animation: 'ins-shimmer 1.4s infinite',
          borderRadius: '3px',
        }} />
      </div>
      <div className="insight-panel__metric" style={{
        width: '40px', height: '12px',
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '400px 100%',
        animation: 'ins-shimmer 1.4s infinite',
        borderRadius: '3px',
      }} />
    </li>
  );
}

/* ---- Single insight panel ---- */
function InsightPanel({ config, items, loading, onAreaClick }) {
  const { title, subtitle, Icon } = config;

  return (
    <div className="insight-panel">
      <div className="insight-panel__header">
        <div className="insight-panel__icon">
          <Icon />
        </div>
        <h5 className="insight-panel__title">{title}</h5>
        <span className="insight-panel__subtitle">{subtitle}</span>
      </div>

      {loading ? (
        <ul className="insight-panel__list">
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
        </ul>
      ) : items && items.length > 0 ? (
        <ul className="insight-panel__list">
          {items.map((item, idx) => (
            <li
              key={item.area_id}
              className="insight-panel__item"
              onClick={() => onAreaClick && onAreaClick(item.area_id, item.area_name)}
              title={`Explore ${item.area_name}`}
            >
              <span className="insight-panel__rank">#{idx + 1}</span>
              <div className="insight-panel__item-left">
                <span className="insight-panel__area-name">{item.area_name}</span>
                <span className="insight-panel__city-name">{item.city_name}</span>
              </div>
              <span className="insight-panel__metric">{item.metric_label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="insight-panel__empty">No data available for this category</div>
      )}
    </div>
  );
}

/* ---- Main component ---- */
export default function InsightDashboard({
  insights,
  hot_zones,
  provinceName,
  detectionSource,
  loading,
  onAreaClick,
  onCogClick,
  compact = false,
}) {
  const badgeClass = `insight-dashboard__source-badge${detectionSource === 'ip' ? ' insight-dashboard__source-badge--ip' : ''}`;
  const badgeLabel = detectionSource === 'ip'
    ? 'Location detected'
    : detectionSource === 'cache'
    ? 'Saved location'
    : 'Default region';

  return (
    <section className={`insight-dashboard${compact ? ' insight-dashboard--compact' : ''}`}>
      {/* Header */}
      <div className="insight-dashboard__header">
        <div className="insight-dashboard__header-left">
          <h3 className="insight-dashboard__title">
            {compact ? 'At a Glance' : 'Market Intelligence'}
            {provinceName ? <> — <strong>{provinceName}</strong></> : null}
          </h3>
          {compact && (
            <span className="insight-dashboard__header-sub">
              Province-level snapshot · scroll to explore
            </span>
          )}
        </div>
        {!loading && provinceName && (
          <span className={badgeClass}>{badgeLabel}</span>
        )}
      </div>

      {/* 6 insight panels — horizontal scroll in compact mode */}
      <div className={compact ? 'insight-panel-grid insight-panel-grid--scroll' : 'insight-panel-grid'}>
        {PANEL_CONFIG.map(cfg => (
          <InsightPanel
            key={cfg.key}
            config={cfg}
            items={insights ? insights[cfg.key] : null}
            loading={loading}
            onAreaClick={onAreaClick}
          />
        ))}
      </div>

      {/* Hot-zone map + CoG CTA — only in full (non-compact) mode */}
      {!compact && (
        <>
          <HotZoneMap
            hotzones={hot_zones || []}
            provinceName={provinceName}
            loading={loading}
            onAreaClick={onAreaClick}
          />

          <div className="insight-cta">
            <span className="insight-cta__eyebrow">Advanced Analysis</span>
            <h4 className="insight-cta__headline">
              Find your Investment <strong>Bull's-Eye</strong>
            </h4>
            <p className="insight-cta__desc">
              Use our Centre of Gravity solver to pinpoint the single best location
              in {provinceName || 'South Africa'} based on your weighted investment
              criteria — built for local and international investors.
            </p>
            <button className="insight-cta__button" onClick={onCogClick}>
              <Icons.BullsEye />
              Find My Investment Bull's-Eye (CoG)
            </button>
          </div>
        </>
      )}
    </section>
  );
}
