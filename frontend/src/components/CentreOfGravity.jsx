/**
 * CentreOfGravity.jsx
 * --------------------
 * Investor-weighted geospatial optimizer.
 *
 * Architecture (refactored)
 * -------------------------
 *  - useCogSolver   — owns all solver state + API logic
 *  - CogWeightPanel — slider panel + scenario presets + zoning filter
 *  - CogParcelHeatmap — canvas heatmap of per-parcel scores
 *  - CogAnimatedMarker — smooth marker position transitions
 *
 * Displays:
 *   - CoG marker with animated position
 *   - 1-σ uncertainty ellipse (rendered as a polygon)
 *   - Canvas heatmap layer for parcel scores
 *   - Convergence diagnostics (iterations, delta_m, jitter_m, converged)
 *   - Data source badge (real DB parcels vs. synthetic from area stats)
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCogSolver } from '../hooks/useCogSolver';
import CogWeightPanel from './CogWeightPanel';
import CogParcelHeatmap from './CogParcelHeatmap';
import CogAnimatedMarker from './CogAnimatedMarker';
import InvestmentProfiles from './InvestmentProfiles';
import FeasibilityTab from './FeasibilityTab';
import areaDataService from '../services/areaDataService';
import './styles/CentreOfGravity.css';

// ── Fix default Leaflet marker icons ──────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── CoG icon (SVG crosshair) ───────────────────────────────────────────────
const cogIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#d4af37" stroke="#fff" stroke-width="2"/>
      <circle cx="18" cy="18" r="6" fill="#0e1420"/>
      <circle cx="18" cy="18" r="2.5" fill="#d4af37"/>
      <line x1="18" y1="2"  x2="18" y2="9"  stroke="#fff" stroke-width="2"/>
      <line x1="18" y1="27" x2="18" y2="34" stroke="#fff" stroke-width="2"/>
      <line x1="2"  y1="18" x2="9"  y2="18" stroke="#fff" stroke-width="2"/>
      <line x1="27" y1="18" x2="34" y2="18" stroke="#fff" stroke-width="2"/>
    </svg>
  `),
  iconSize:    [36, 36],
  iconAnchor:  [18, 18],
  popupAnchor: [0, -18],
});

// ── Build 1-σ uncertainty ellipse as a Leaflet polygon ────────────────────
function buildEllipsePolygon(centerLat, centerLng, a_m, b_m, theta_deg, steps = 72) {
  const M_LAT = 111320.0;
  const M_LNG = 111320.0 * Math.cos((centerLat * Math.PI) / 180);
  const theta = (theta_deg * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const ex = a_m * Math.cos(angle) * Math.cos(theta) - b_m * Math.sin(angle) * Math.sin(theta);
    const ey = a_m * Math.cos(angle) * Math.sin(theta) + b_m * Math.sin(angle) * Math.cos(theta);
    pts.push([centerLat + ey / M_LAT, centerLng + ex / M_LNG]);
  }
  return pts;
}

// ── Map re-centering helper ────────────────────────────────────────────────
function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function CentreOfGravity({ isOpen, onClose, areaId, areaName, initialProfile = 'balanced' }) {
  // previewActive = true as soon as an area is selected, even before the modal
  // is opened. This warms the backend cache and gives the map an instant first
  // result the moment the modal renders (animated marker + heatmap).
  const cog = useCogSolver({ areaId, isActive: isOpen, previewActive: !!areaId });

  // Track whether the user has run a solve at least once in this session
  const [hasSolved, setHasSolved] = useState(false);
  const prevLoadingRef = useRef(false);

  // Result pane active tab: 'overview' | 'feasibility'
  const [resultTab, setResultTab] = useState('overview');
  useEffect(() => {
    if (cog.loading && !prevLoadingRef.current) setHasSolved(true);
    prevLoadingRef.current = cog.loading;
  }, [cog.loading]);
  // Also mark solved if result arrives (e.g. cached instant response)
  useEffect(() => { if (cog.result) setHasSolved(true); }, [cog.result]);
  // Reset when modal reopens with a different area
  const prevAreaRef = useRef(areaId);
  useEffect(() => {
    if (areaId !== prevAreaRef.current) { setHasSolved(false); prevAreaRef.current = areaId; }
  }, [areaId]);

  // Apply the investment profile whenever the modal opens or the profile changes
  useEffect(() => {
    if (isOpen && initialProfile) {
      cog.applyScenario(initialProfile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialProfile]);

  // Reset: restore balanced weights, all zonings, hide the map
  const handleReset = () => {
    cog.applyScenario('balanced');
    cog.setAllZoning();
    setHasSolved(false);
  };

  if (!isOpen) return null;

  // displayResult = previewResult during drag, full result otherwise
  const display = cog.displayResult;

  // ── Derived map data ──────────────────────────────────────────────────
  const mapCenter = display ? [display.lat, display.lng] : [-26.1076, 28.0567];

  // Ellipse only from full result (preview doesn't compute it)
  const ellipsePolygon = cog.result?.uncertainty
    ? buildEllipsePolygon(
        cog.result.lat, cog.result.lng,
        cog.result.uncertainty.ellipse_a_m,
        cog.result.uncertainty.ellipse_b_m,
        cog.result.uncertainty.theta_deg,
      )
    : null;

  const heatmapParcels = display?.parcels ?? [];

  // Preview mode covers three cases:
  //   1. User is actively dragging a slider
  //   2. A preview request is in-flight
  //   3. Warmup preview is displayed but the full solve hasn't finished yet
  const isPreviewMode = cog.isDragging || cog.previewLoading || (!cog.result && !!cog.previewResult);

  // Marker animation speed:
  //   • During drag  → 80 ms  (snappy, keeps up with the thumb)
  //   • Initial fly-in (warmup / first open) → 700 ms  (cinematic entrance)
  //   • Full-solve update → 500 ms  (smooth but not sluggish)
  const markerDuration = cog.isDragging ? 80 : (isPreviewMode ? 700 : 500);

  return (
    <div className="cog-modal-overlay" onClick={onClose}>
      <div className="cog-modal-content cog-modal-wide" onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="cog-modal-header">
          <div className="cog-modal-header-left">
            <div className="cog-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="cog-modal-title">Centre of Gravity</h2>
              <p className="cog-modal-subtitle">k-NN Optimizer · {areaName}</p>
            </div>
          </div>
          <div className="cog-modal-header-actions">
            {hasSolved && (
              <button
                className="cog-reset-button"
                onClick={handleReset}
                title="Reset all filters and weights to defaults"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Reset
              </button>
            )}
            <button
              className={`cog-solve-button${cog.loading ? ' cog-solving' : ''}`}
              onClick={() => cog.solve()}
              disabled={cog.loading || !cog.weightsValid}
              title={!cog.weightsValid ? 'Weights must sum to 100' : 'Run full 200-iteration solve'}
            >
              {cog.loading
                ? <><span className="loading-spinner-small" style={{border:'2px solid rgba(0,0,0,0.12)',borderTopColor:'#c9a030'}}/> Solving…</>
                : <>&#x25B6; Solve</>}
            </button>
            <button className="cog-close-button" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Investment Profile presets ───────────────────────────────── */}
        <div className="cog-profile-strip">
          <InvestmentProfiles
            activeProfile={cog.scenario}
            onSelect={cog.applyScenario}
            compact
          />
        </div>

        {/* ── Two-column body ─────────────────────────────────────────── */}
        <div className="cog-modal-columns">

          {/* Left: weight panel + market intelligence */}
          <div className="cog-modal-left">
            <CogWeightPanel
              weights={cog.weights}
              totalWeight={cog.totalWeight}
              weightsValid={cog.weightsValid}
              onWeightChange={cog.setWeight}
              onAutoBalance={cog.autoBalance}
              zoning={cog.zoning}
              onToggleZoning={cog.toggleZoning}
              onSetAll={cog.setAllZoning}
              onClearAll={cog.clearAllZoning}
              activeProfile={cog.scenario}
              onApplyProfile={cog.applyProfile}
              onDragStart={cog.onDragStart}
              onDragMove={cog.onDragMove}
              onDragEnd={cog.onDragEnd}
            />
          </div>

          {/* Right: map + status + results */}
          <div className="cog-modal-right">

            {/* Preview-loading: spinner before the first result arrives */}
            {cog.previewLoading && !cog.previewResult && !cog.loading && (
              <div className="cog-status">
                <div className="loading-spinner-small"/>
                <span>Scanning area…</span>
              </div>
            )}
            {isPreviewMode && !cog.loading && !cog.previewLoading && (
              <div className="cog-preview-indicator">
                <span className="cog-preview-dot"/>
                {cog.isDragging
                  ? 'Live preview'
                  : 'Quick preview — computing full solve…'}
              </div>
            )}
            {cog.error && !cog.loading && (
              <div className="cog-error">
                <strong>Solver error:</strong> {cog.error}
              </div>
            )}

            {/* Map ─────────────────────────────────────────────────── */}
            {!hasSolved ? (
              /* Pre-solve placeholder — shown until user clicks Solve */
              <div className="cog-map-placeholder">
                <div className="cog-map-placeholder-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2"/>
                    <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
                    <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="cog-map-placeholder-title">Configure your filters, then run the solver</p>
                <p className="cog-map-placeholder-sub">
                  Set your investment weights and zoning preferences in the panel on the left,
                  then click <strong>▶ Solve</strong> to find your optimal location.
                </p>
              </div>
            ) : (
              <div className="cog-map-wrapper">
                <div className="cog-map-container">
                  <MapContainer
                    center={mapCenter}
                    zoom={14}
                    style={{ height: 420, width: '100%', borderRadius: 8 }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                    doubleClickZoom={true}
                    dragging={true}
                    touchZoom={true}
                  >
                    <Recenter center={mapCenter} zoom={14}/>
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      maxZoom={19}
                    />

                    {/* Canvas heatmap layer */}
                    <CogParcelHeatmap parcels={heatmapParcels}/>

                    {/* 1-σ uncertainty ellipse */}
                    {ellipsePolygon && (
                      <Polygon
                        positions={ellipsePolygon}
                        pathOptions={{
                          color: '#c9a030', weight: 1.5, opacity: 0.7,
                          fillColor: '#c9a030', fillOpacity: 0.08, dashArray: '5 4',
                        }}
                      />
                    )}

                    {/* Animated CoG marker */}
                    {display && (
                      <CogAnimatedMarker
                        position={[display.lat, display.lng]}
                        icon={cogIcon}
                        duration={markerDuration}
                      >
                        <Popup>
                          <div className="cog-popup">
                            <strong>
                              {cog.isDragging
                                ? 'Live Preview'
                                : isPreviewMode
                                ? 'Quick Preview — Equal Weights'
                                : 'Optimal Investment Locus'}
                            </strong><br/>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>
                              {display.lat.toFixed(6)}, {display.lng.toFixed(6)}
                            </span><br/>
                            Potential: {(display.potential * 100).toFixed(1)}%
                            {cog.result?.uncertainty && !isPreviewMode && (
                              <><br/>Uncertainty: ±{cog.result.uncertainty.radius_m?.toFixed(0)} m</>
                            )}
                          </div>
                        </Popup>
                      </CogAnimatedMarker>
                    )}
                  </MapContainer>
                </div>

                {/* Calculating overlay — shown while solver is running */}
                {cog.loading && (
                  <div className="cog-solving-overlay">
                    <div className="cog-solving-overlay-inner">
                      <div className="cog-solving-spinner"/>
                      <p className="cog-solving-label">Calculating…</p>
                      <p className="cog-solving-sub">Running 200-iteration k-NN solver</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Heatmap legend — only visible once map is shown */}
            {hasSolved && (
              <div className="cog-heatmap-legend">
                <span className="cog-legend-item cog-legend-low">Low</span>
                <div className="cog-legend-gradient"/>
                <span className="cog-legend-item cog-legend-high">High</span>
                <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 11 }}>
                  score potential
                </span>
              </div>
            )}

            {/* Human-readable location summary ──────────────────── */}
            {cog.result && !cog.loading && (
              <div className="cog-area-summary">
                <span className="cog-area-summary-icon">📍</span>
                <p className="cog-area-summary-text">
                  Based on your search, the optimal investment location is within&nbsp;
                  <strong>{areaName}</strong> — centred approximately&nbsp;
                  <strong>{cog.result.uncertainty?.radius_m?.toFixed(0) ?? '—'} m</strong> from the
                  highest-scoring zone, with a potential score of&nbsp;
                  <strong>{(cog.result.potential * 100).toFixed(1)}%</strong>.
                </p>
              </div>
            )}

            {/* Results diagnostics ───────────────────────────────── */}
            {cog.result && !cog.loading && (
              <div className="cog-results">

                {/* ── Result pane tab bar ──────────────────────────── */}
                <div className="cog-result-tabs" role="tablist">
                  <button
                    role="tab"
                    className={`cog-result-tab${resultTab === 'overview' ? ' cog-result-tab--active' : ''}`}
                    aria-selected={resultTab === 'overview'}
                    onClick={() => setResultTab('overview')}
                  >
                    Overview
                  </button>
                  <button
                    role="tab"
                    className={`cog-result-tab${resultTab === 'feasibility' ? ' cog-result-tab--active' : ''}`}
                    aria-selected={resultTab === 'feasibility'}
                    onClick={() => setResultTab('feasibility')}
                  >
                    Feasibility
                  </button>
                </div>

                {/* ── Overview tab ────────────────────────────────── */}
                {resultTab === 'overview' && (<>

                {/* Score + badges row */}
                <div className="cog-results-header">
                  <h3 className="cog-section-title">Optimal Zone</h3>
                  <div className="cog-badges">
                    <div className="cog-score-badge">
                      {(cog.result.potential * 100).toFixed(1)}% potential
                    </div>
                    <span className="cog-custom-badge">
                      {cog.result.data_source === 'real'
                        ? `● ${cog.result.parcel_count} parcels`
                        : '○ Synthetic'}
                    </span>
                    {cog.result.feasible
                      ? <span className="cog-custom-badge cog-badge-ok">✓ Feasible</span>
                      : <span className="cog-custom-badge cog-badge-warn">⚠ Infeasible</span>}
                  </div>
                </div>

                {/* Key metrics — compact 3-up */}
                <div className="cog-kpi-row">
                  <div className="cog-kpi">
                    <span className="cog-kpi-value">
                      {cog.result.convergence.converged
                        ? <span className="converged-yes">Converged</span>
                        : <span className="converged-no">Max iter</span>}
                    </span>
                    <span className="cog-kpi-label">in {cog.result.convergence.iterations} cycles</span>
                  </div>
                  <div className="cog-kpi-divider"/>
                  <div className="cog-kpi">
                    <span className="cog-kpi-value">±{cog.result.uncertainty.radius_m?.toFixed(0)} m</span>
                    <span className="cog-kpi-label">uncertainty radius</span>
                  </div>
                  <div className="cog-kpi-divider"/>
                  <div className="cog-kpi">
                    <span className="cog-kpi-value">{cog.result.convergence.delta_m?.toFixed(1)} m</span>
                    <span className="cog-kpi-label">final positional drift</span>
                  </div>
                </div>

                {/* Coordinate row */}
                <div className="cog-coord-row">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
                  </svg>
                  <span className="cog-coord-text">
                    {cog.result.lat.toFixed(6)},&nbsp;{cog.result.lng.toFixed(6)}
                  </span>
                  <span className="cog-coord-sep">·</span>
                  <span className="cog-coord-ellipse">
                    Ellipse {cog.result.uncertainty.ellipse_a_m?.toFixed(0)} × {cog.result.uncertainty.ellipse_b_m?.toFixed(0)} m
                    &nbsp;at {cog.result.uncertainty.theta_deg?.toFixed(1)}°
                  </span>
                </div>

                </>)}{/* /overview tab */}

                {/* ── Feasibility tab ──────────────────────────────── */}
                {resultTab === 'feasibility' && (
                  <FeasibilityTab
                    cogResult={cog.result}
                    areaStats={null}
                    apiBase={areaDataService.getApiBase ? areaDataService.getApiBase() : undefined}
                  />
                )}

              </div>
            )}

          </div>{/* /cog-modal-right */}
        </div>{/* /cog-modal-columns */}
      </div>
    </div>
  );
}
