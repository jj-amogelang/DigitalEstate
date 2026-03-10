import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppLocation } from "../context/LocationContext";
import "./styles/dashboard-page.css";
import areaDataService from "../services/areaDataService";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { effectiveArea, isLocationBased, source: locationSource, loading: locationLoading } = useAppLocation();

  // Dynamic area metrics (driven by LocationContext instead of hardcoded Sandton)
  const [areaMetrics, setAreaMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState(null);

  // Fetch metrics whenever the effective area changes
  useEffect(() => {
    if (locationLoading) return;       // wait until location resolves
    if (!effectiveArea?.id) return;    // no area yet
    let cancelled = false;
    const fetchMetrics = async () => {
      try {
        setLoadingMetrics(true);
        setMetricsError(null);
        const resp = await areaDataService.api.get(`/api/areas/${effectiveArea.id}/metrics/latest`, {
          params: { metrics: 'avg_price,rental_yield,vacancy_rate,crime_index,population_growth,planned_dev_count' }
        });
        if (cancelled) return;
        const metricsArr = resp.metrics || [];
        const map = Object.fromEntries(metricsArr.map(m => [m.code, m]));
        setAreaMetrics({ areaId: effectiveArea.id, areaName: effectiveArea.name, map });
      } catch (err) {
        if (!cancelled) setMetricsError(err?.message || 'Failed to load metrics');
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    };
    fetchMetrics();
    return () => { cancelled = true; };
  }, [effectiveArea?.id, locationLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const areaDisplay = useMemo(() => {
    if (!areaMetrics) return null;
    const m = areaMetrics.map;
    const fmtPrice = (v) => {
      if (v == null) return "—";
      const n = Number(v);
      if (n >= 1_000_000) return `R${(n/1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `R${(n/1_000).toFixed(0)}K`;
      return `R${n.toLocaleString()}`;
    };
    const fmtPct = (v) => (v == null ? "—" : `${Number(v).toFixed(1)}%`);
    const fmtNum = (v) => (v == null ? "—" : Number(v).toLocaleString());
    return [
      { key: "avg_price", label: "Avg Price", value: fmtPrice(m.avg_price?.value_numeric) },
      { key: "rental_yield", label: "Rental Yield", value: fmtPct(m.rental_yield?.value_numeric) },
      { key: "vacancy_rate", label: "Vacancy", value: fmtPct(m.vacancy_rate?.value_numeric) },
      { key: "crime_index", label: "Crime Index", value: fmtNum(m.crime_index?.value_numeric) },
      { key: "population_growth", label: "Population Growth", value: fmtPct(m.population_growth?.value_numeric) },
      { key: "planned_dev_count", label: "Planned Dev.", value: fmtNum(m.planned_dev_count?.value_numeric) },
    ];
  }, [areaMetrics]);

  return (
    <div className="dashboard">
      {/* Welcome Message for Authenticated Users */}
      {isAuthenticated && (
        <div className="welcome-banner">
          <div className="welcome-content">
            <h2 className="welcome-title">
              Welcome back, {user.firstName}! 👋
            </h2>
            <p className="welcome-subtitle">
              Ready to find the Centre of Gravity for your next property decision? Head to Explore Areas to get started.
            </p>
          </div>
        </div>
      )}

      {/* Hero Section with Background Image */}
      <div className="dashboard-hero">
        <div className="hero-overlay">
            <div className="hero-content">
            <h1 className="dashboard-title">
              Find the
              <span className="title-highlight"> Centre of Gravity</span>
            </h1>
            <p className="dashboard-subtitle">
              DigitalEstate helps you discover the <strong>Centre of Gravity (CoG)</strong> — the optimal hotspot
              in any area where property demand, investment potential, and market momentum converge.
              Explore South African areas, compare live metrics, and let data guide your next property decision.
            </p>
            <div className="hero-cta">
              <button
                onClick={() => navigate('/explore')}
                className="btn btn-primary"
              >
                Explore Areas &amp; Find CoG
                <svg className="cta-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button 
                onClick={() => navigate('/settings')} 
                className="btn btn-secondary"
              >
                Settings
              </button>
            </div>
            {/* hero metrics moved to Explore page */}
          </div>
        </div>
        <div className="hero-scroll-indicator">
          <div className="scroll-text">Scroll to explore</div>
          <div className="scroll-arrow"></div>
        </div>
      </div>
      
      <div className="dashboard-content">
        {/* Dynamic Area Key Metrics (Live — driven by user location or popular area) */}
        <div className="container-professional" style={{marginTop: '24px'}}>
          <div className="sandton-strip">
            <div className="sandton-strip-header">
              <div className="sandton-chip">
                {isLocationBased ? 'Near You' : 'Popular'}
              </div>
              <h3>
                {areaMetrics?.areaName
                  ? `${areaMetrics.areaName} Key Metrics`
                  : locationLoading
                    ? 'Detecting your area…'
                    : 'Key Metrics'}
              </h3>
              {!isLocationBased && areaMetrics?.areaName && (
                <span className="sandton-area-note" title="Showing a popular area — share your location for personalised data">
                  Popular area
                </span>
              )}
              {loadingMetrics && <span className="sandton-loading">Loading…</span>}
              {metricsError && <span className="sandton-error">{metricsError}</span>}
            </div>
            {areaDisplay && (
              <div className="sandton-metrics-grid">
                {areaDisplay.map(item => (
                  <div className="sandton-metric" key={item.key}>
                    <div className="sandton-metric-label">{item.label}</div>
                    <div className="sandton-metric-value">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
            {/* Prompt to enable location when we're showing a popular area */}
            {!isLocationBased && locationSource !== 'loading' && (
              <div className="sandton-location-nudge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z"
                    stroke="currentColor" strokeWidth="1.8" fill="none"/>
                  <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" fill="none"/>
                </svg>
                <span>
                  Showing data for a popular area.{' '}
                  <button
                    className="sandton-location-link"
                    onClick={() => {
                      try { localStorage.removeItem('de_location_perm'); } catch {}
                      window.location.reload();
                    }}
                  >
                    Enable location
                  </button>{' '}
                  to see your area's metrics.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Professional Platform Overview */}
        <div className="platform-overview-section">
          <div className="container-professional">
            <div className="overview-header">
              <h2 className="section-title-professional">What is the Centre of Gravity (CoG)?</h2>
              <p className="section-subtitle-professional">
                The CoG is the weighted hotspot within an area where property value, demand, and opportunity converge — helping you invest with confidence.
              </p>
            </div>
            
            <div className="capabilities-grid">
              <div className="capability-card">
                <div className="capability-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>Pinpoint the CoG</h4>
                <p>The CoG algorithm scores parcels across multiple weighted metrics to surface the single optimal location in any area.</p>
              </div>
              
              <div className="capability-card">
                <div className="capability-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 12l3-3 2 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="18" cy="6" r="2" fill="currentColor"/>
                  </svg>
                </div>
                <h4>Live Area Metrics</h4>
                <p>Real-time data feeds — pricing trends, rental yields, vacancy rates, crime indices, and population growth — power every CoG calculation.</p>
              </div>
              
              <div className="capability-card">
                <div className="capability-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M2 20h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M7 20V9l5-5 5 5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <h4>Adjust Your Weights</h4>
                <p>Customise which metrics matter most to you — safety, yield, growth, or price — and watch the CoG update in real time on the map.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Target Audience & Market Research Combined */}
        <div className="value-proposition-section">
          <div className="container-professional">
            <div className="value-grid">
              {/* Who We Serve */}
              <div className="value-column">
                <h3 className="value-column-title">Built for Professionals</h3>
                <div className="professional-targets">
                  <div className="target-item">
                    <div className="target-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 21v-5a2 2 0 012-2h4a2 2 0 012 2v5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 7h8M8 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <h5>Property Investors</h5>
                      <p>Data-driven investment decisions</p>
                    </div>
                  </div>
                  <div className="target-item">
                    <div className="target-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M6 21V7l6-4 6 4v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 21v-6h4v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="8" y="9" width="2" height="2" stroke="currentColor" strokeWidth="1.5"/>
                        <rect x="14" y="9" width="2" height="2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <div>
                      <h5>Facilities Managers</h5>
                      <p>Portfolio optimization tools</p>
                    </div>
                  </div>
                  <div className="target-item">
                    <div className="target-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M6 10h12M6 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <h5>Developers</h5>
                      <p>Market insights for development</p>
                    </div>
                  </div>
                  <div className="target-item">
                    <div className="target-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 12l3-3 2 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="18" cy="6" r="1" fill="currentColor"/>
                        <circle cx="9" cy="17" r="1" fill="currentColor"/>
                      </svg>
                    </div>
                    <div>
                      <h5>Market Researchers</h5>
                      <p>Comprehensive trend analysis</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Excellence */}
        <div className="excellence-section">
          <div className="container-professional">
            <div className="excellence-content">
              <div className="excellence-text">
                <h3 className="excellence-title">How to Use DigitalEstate</h3>
                <p className="excellence-description">
                  Open <strong>Explore Areas</strong> from the sidebar, select a province, city, and area,
                  then click <em>Find Centre of Gravity</em>. Adjust the metric weights to match your investment
                  strategy and the map will highlight the optimal parcel — your CoG.
                </p>
                <div className="excellence-features">
                  <div className="feature-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    </svg>
                    Select an Area
                  </div>
                  <div className="feature-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Run CoG Solver
                  </div>
                  <div className="feature-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 17.2l-6.4 4L8 13.2 2 8.4h7.6L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Invest with Confidence
                  </div>
                </div>
              </div>
              <div className="excellence-cta">
                <button 
                  onClick={() => navigate('/explore')} 
                  className="btn-professional btn-primary-professional"
                >
                  <span>Start Exploring Areas &amp; CoG</span>
                  <svg className="cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
