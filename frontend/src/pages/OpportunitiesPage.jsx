/**
 * OpportunitiesPage
 *
 * Two-column layout:
 *   Left  → filter panel (province, category controls)
 *   Right → OpportunityHeatLayer map (top half) + ranked cards (bottom half)
 *
 * Category tabs in the header switch between the 4 opportunity types.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import areaDataService from '../services/areaDataService';
import OpportunityHeatLayer from '../components/OpportunityHeatLayer';
import './styles/opportunities-page.css';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    key:        'top-yield',
    label:      'Top Yield',
    accentClass:'active-yield',
    accentColor:'#C9A96E',
    description:'Highest rental yield areas',
  },
  {
    key:        'low-vacancy',
    label:      'Low Vacancy',
    accentClass:'active-vacancy',
    accentColor:'#5B8DB8',
    description:'Tightest rental markets',
  },
  {
    key:        'value',
    label:      'Best Value',
    accentClass:'active-value',
    accentColor:'#6EC9A9',
    description:'High yield / low price-per-m²',
  },
  {
    key:        'emerging',
    label:      'Emerging',
    accentClass:'active-emerging',
    accentColor:'#B86E9A',
    description:'Strong YoY price growth',
  },
];

const DEFAULT_LIMIT = 20;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatHighlight(key, value) {
  if (value == null) return null;
  switch (key) {
    case 'rental_yield':
    case 'vacancy_rate':
    case 'price_growth_yoy':
      return `${parseFloat(value).toFixed(1)} %`;
    case 'price_per_sqm':
    case 'median_price_per_sqm':
    case 'avg_property_price':
      return `R ${Math.round(value).toLocaleString()}`;
    case 'transport_score':
    case 'crime_index':
    case 'amenities_score':
      return `${value} / 100`;
    case 'days_on_market':
      return `${value} days`;
    default:
      return String(value);
  }
}

const HIGHLIGHT_LABELS = {
  rental_yield:         'Yield',
  vacancy_rate:         'Vacancy',
  price_per_sqm:        'Price/m²',
  median_price_per_sqm: 'Median/m²',
  price_growth_yoy:     'Growth YoY',
  avg_property_price:   'Avg Price',
  transport_score:      'Transport',
  crime_index:          'Crime Index',
  amenities_score:      'Amenities',
  days_on_market:       'Days on Market',
};

// ── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score, color }) {
  const pct = score != null ? Math.min(100, Math.max(0, score)) : 0;
  return (
    <div className="opp-score-row">
      <div className="opp-score-bar-bg">
        <div
          className="opp-score-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="opp-score-label" style={{ color }}>
        {score != null ? Math.round(score) : '–'}
      </span>
    </div>
  );
}

// ── OpportunityCard ───────────────────────────────────────────────────────────

function OpportunityCard({ item, accentColor, selected, onClick }) {
  const highlights = item.highlights || {};
  const primaryHlKey = Object.keys(highlights)[0];

  return (
    <div
      className={`opp-card${selected ? ' selected' : ''}`}
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(item)}
    >
      <span className="opp-card-rank">#{item.rank}</span>
      <div className="opp-card-name">{item.area_name}</div>
      <div className="opp-card-location">
        {item.city_name}, {item.province_name}
      </div>

      <div className="opp-card-metrics">
        {Object.entries(highlights).map(([k, v]) => {
          const formatted = formatHighlight(k, v);
          if (!formatted) return null;
          return (
            <span
              key={k}
              className={`opp-metric-pill${k === primaryHlKey ? ' primary' : ''}`}
            >
              {HIGHLIGHT_LABELS[k] || k}: {formatted}
            </span>
          );
        })}
      </div>

      <ScoreBar score={item.score} color={accentColor} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const [activeCategory, setActiveCategory] = useState('top-yield');
  const [items,          setItems]           = useState([]);
  const [loading,        setLoading]         = useState(false);
  const [error,          setError]           = useState(null);
  const [selectedItem,   setSelectedItem]    = useState(null);

  // Filter state
  const [provinces, setProvinces]   = useState([]);
  const [cities,    setCities]      = useState([]);
  const [filters,   setFilters]     = useState({
    provinceId: '',
    cityId:     '',
    limit:      DEFAULT_LIMIT,
  });
  const [pendingFilters, setPendingFilters] = useState({ ...filters });

  const activeCat = CATEGORIES.find(c => c.key === activeCategory) || CATEGORIES[0];

  // ── Load provinces once ────────────────────────────────────────────────

  useEffect(() => {
    areaDataService.getProvinces().then(data => {
      if (Array.isArray(data)) setProvinces(data);
    });
  }, []);

  // ── Load cities when province changes ─────────────────────────────────

  useEffect(() => {
    if (!pendingFilters.provinceId) {
      setCities([]);
      setPendingFilters(f => ({ ...f, cityId: '' }));
      return;
    }
    areaDataService.getCities(pendingFilters.provinceId).then(data => {
      if (Array.isArray(data)) setCities(data);
    });
  }, [pendingFilters.provinceId]);

  // ── Fetch opportunity items ────────────────────────────────────────────

  const fetchData = useCallback(async (category, currentFilters) => {
    setLoading(true);
    setError(null);
    setSelectedItem(null);
    try {
      const opts = {
        limit:      currentFilters.limit,
        provinceId: currentFilters.provinceId || undefined,
        cityId:     currentFilters.cityId     || undefined,
      };
      let result = null;
      switch (category) {
        case 'top-yield':   result = await areaDataService.getTopYieldOpportunities(opts);   break;
        case 'low-vacancy': result = await areaDataService.getLowVacancyOpportunities(opts); break;
        case 'value':       result = await areaDataService.getValueOpportunities(opts);      break;
        case 'emerging':    result = await areaDataService.getEmergingOpportunities(opts);   break;
        default:            result = await areaDataService.getTopYieldOpportunities(opts);
      }
      setItems(result?.items ?? []);
    } catch (err) {
      console.error('Opportunities fetch error', err);
      setError('Failed to load opportunities. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on category change (applying committed filters)
  useEffect(() => {
    fetchData(activeCategory, filters);
  }, [activeCategory, filters, fetchData]);

  // ── Handlers ──────────────────────────────────────────────────────────

  function handleTabChange(key) {
    setActiveCategory(key);
  }

  function handleFilterChange(field, value) {
    setPendingFilters(f => ({ ...f, [field]: value }));
  }

  function handleApply() {
    setFilters({ ...pendingFilters });
  }

  function handleReset() {
    const defaults = { provinceId: '', cityId: '', limit: DEFAULT_LIMIT };
    setPendingFilters(defaults);
    setFilters(defaults);
  }

  function handleCardClick(item) {
    setSelectedItem(prev => prev?.area_id === item.area_id ? null : item);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="opp-page">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="opp-header">
        <div className="opp-header-top">
          <h1 className="opp-header-title">Opportunities</h1>
          <span className="opp-header-subtitle">
            {activeCat.description}
            {items.length > 0 && ` · ${items.length} areas`}
          </span>
        </div>

        <nav className="opp-tabs" aria-label="Opportunity categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`opp-tab${activeCategory === cat.key ? ` active ${cat.accentClass}` : ''}`}
              onClick={() => handleTabChange(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="opp-body">
        {/* ── Filter Panel ──────────────────────────────────────────── */}
        <aside className="opp-filters" aria-label="Filters">
          <div className="opp-filter-section">
            <label className="opp-filter-label" htmlFor="opp-province-select">Province</label>
            <select
              id="opp-province-select"
              className="opp-filter-select"
              value={pendingFilters.provinceId}
              onChange={e => handleFilterChange('provinceId', e.target.value)}
            >
              <option value="">All provinces</option>
              {provinces.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {cities.length > 0 && (
            <div className="opp-filter-section">
              <label className="opp-filter-label" htmlFor="opp-city-select">City</label>
              <select
                id="opp-city-select"
                className="opp-filter-select"
                value={pendingFilters.cityId}
                onChange={e => handleFilterChange('cityId', e.target.value)}
              >
                <option value="">All cities</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="opp-filter-section">
            <label className="opp-filter-label" htmlFor="opp-limit-range">
              Results
            </label>
            <div className="opp-filter-range">
              <input
                id="opp-limit-range"
                type="range"
                min={5}
                max={50}
                step={5}
                className="opp-range-input"
                value={pendingFilters.limit}
                onChange={e => handleFilterChange('limit', Number(e.target.value))}
              />
              <span className="opp-range-value">Show {pendingFilters.limit} areas</span>
            </div>
          </div>

          <button className="opp-apply-btn" onClick={handleApply}>
            Apply filters
          </button>

          <button className="opp-reset-link" onClick={handleReset}>
            Reset
          </button>
        </aside>

        {/* ── Content (map + cards) ──────────────────────────────────── */}
        <section className="opp-content">
          {/* Map */}
          <div className="opp-map-wrapper">
            {loading ? (
              <div className="opp-loading">
                <div className="opp-spinner" />
                <span style={{ fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Loading
                </span>
              </div>
            ) : error ? (
              <div className="opp-empty">{error}</div>
            ) : (
              <OpportunityHeatLayer
                items={items}
                activeType={activeCategory}
                onAreaClick={handleCardClick}
                height="100%"
              />
            )}
          </div>

          {/* Cards */}
          <div className="opp-cards-wrapper">
            {!loading && !error && items.length === 0 ? (
              <div className="opp-empty">
                No areas found for the current filters.
                <br />Try broadening your selection.
              </div>
            ) : (
              <>
                <p className="opp-cards-heading">
                  Ranked areas — {activeCat.label}
                </p>
                <div className="opp-cards-grid">
                  {items.map(item => (
                    <OpportunityCard
                      key={item.area_id}
                      item={item}
                      accentColor={activeCat.accentColor}
                      selected={selectedItem?.area_id === item.area_id}
                      onClick={handleCardClick}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
