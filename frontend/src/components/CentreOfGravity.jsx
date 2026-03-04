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

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCogSolver } from '../hooks/useCogSolver';
import CogWeightPanel from './CogWeightPanel';
import CogParcelHeatmap from './CogParcelHeatmap';
import CogAnimatedMarker from './CogAnimatedMarker';
import InvestmentProfiles from './InvestmentProfiles';
import CogMatchingProperties from './CogMatchingProperties';
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

  // Apply the investment profile whenever the modal opens or the profile changes
  useEffect(() => {
    if (isOpen && initialProfile) {
      cog.applyScenario(initialProfile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialProfile]);

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
            <button
              className={`cog-solve-button${cog.loading ? ' cog-solving' : ''}`}
              onClick={() => cog.solve()}
              disabled={cog.loading || !cog.weightsValid}
              title={!cog.weightsValid ? 'Weights must sum to 100' : 'Run full 200-iteration solve'}
            >
              {cog.loading
                ? <><span className="loading-spinner-small" style={{border:'2px solid rgba(0,0,0,0.15)',borderTopColor:'#0e1420'}}/> Solving…</>
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

          {/* Left: weight panel */}
          <CogWeightPanel
            weights={cog.weights}
            scenario={cog.scenario}
            totalWeight={cog.totalWeight}
            weightsValid={cog.weightsValid}
            onWeightChange={cog.setWeight}
            onAutoBalance={cog.autoBalance}
            onScenarioChange={cog.applyScenario}
            zoning={cog.zoning}
            onToggleZoning={cog.toggleZoning}
            onSetAll={cog.setAllZoning}
            onClearAll={cog.clearAllZoning}
            onDragStart={cog.onDragStart}
            onDragMove={cog.onDragMove}
            onDragEnd={cog.onDragEnd}
          />

          {/* Right: map + status + results */}
          <div className="cog-modal-right">

            {/* Status row */}
            {cog.loading && (
              <div className="cog-status">
                <div className="loading-spinner-small"/>
                <span>Running full solve…</span>
              </div>
            )}
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
            <div className="cog-map-container">
              <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ height: 420, width: '100%', borderRadius: 8 }}
                scrollWheelZoom={false}
              >
                <Recenter center={mapCenter} zoom={14}/>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />

                {/* Canvas heatmap layer */}
                <CogParcelHeatmap parcels={heatmapParcels}/>

                {/* 1-σ uncertainty ellipse */}
                {ellipsePolygon && (
                  <Polygon
                    positions={ellipsePolygon}
                    pathOptions={{
                      color: '#d4af37', weight: 1.5, opacity: 0.7,
                      fillColor: '#d4af37', fillOpacity: 0.07, dashArray: '5 4',
                    }}
                  />
                )}

                {/* Animated CoG marker — follows displayResult for live drag */}
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

            {/* Heatmap legend */}
            <div className="cog-heatmap-legend">
              <span className="cog-legend-item cog-legend-low">Low</span>
              <div className="cog-legend-gradient"/>
              <span className="cog-legend-item cog-legend-high">High</span>
              <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 11 }}>
                score potential
              </span>
            </div>

            {/* Results diagnostics ───────────────────────────────── */}
            {cog.result && !cog.loading && (
              <div className="cog-results">

                {/* Score + source badges */}
                <div className="cog-results-header">
                  <h3 className="cog-section-title">Optimal Zone</h3>
                  <div className="cog-badges">
                    <div className="cog-score-badge">
                      {(cog.result.potential * 100).toFixed(1)}% potential
                    </div>
                    <span
                      className="cog-custom-badge"
                      style={{ background: cog.result.data_source === 'real' ? 'rgba(22,101,52,0.7)' : 'rgba(146,64,14,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                      title={cog.result.data_source === 'real'
                        ? `${cog.result.parcel_count} real DB parcels`
                        : 'Synthesised from area statistics'}
                    >
                      {cog.result.data_source === 'real'
                        ? `● Real · ${cog.result.parcel_count}p`
                        : '○ Synthetic'}
                    </span>
                    {cog.result.feasible
                      ? <span className="cog-custom-badge" style={{ background: 'rgba(20,83,45,0.7)', border: '1px solid rgba(74,222,128,0.25)' }}>✓ Feasible</span>
                      : <span className="cog-custom-badge" style={{ background: 'rgba(127,29,29,0.7)', border: '1px solid rgba(248,113,113,0.25)' }}>⚠ Infeasible</span>}
                  </div>
                </div>

                {/* Solver diagnostics grid */}
                <div className="cog-metric-grid">
                  <div className="cog-metric-card">
                    <div className="cog-metric-label">Iterations</div>
                    <div className="cog-metric-value">{cog.result.convergence.iterations}</div>
                    <div className="cog-metric-sub">solver cycles</div>
                  </div>
                  <div className="cog-metric-card">
                    <div className="cog-metric-label">Converged</div>
                    <div className={`cog-metric-value ${cog.result.convergence.converged ? 'converged-yes' : 'converged-no'}`}>
                      {cog.result.convergence.converged ? 'Yes' : 'Max iter'}
                    </div>
                    <div className="cog-metric-sub">status</div>
                  </div>
                  <div className="cog-metric-card">
                    <div className="cog-metric-label">Final Δ</div>
                    <div className="cog-metric-value">{cog.result.convergence.delta_m?.toFixed(2)}<span style={{fontSize:'0.6em',color:'#64748b',marginLeft:2}}>m</span></div>
                    <div className="cog-metric-sub">positional drift</div>
                  </div>
                  <div className="cog-metric-card">
                    <div className="cog-metric-label">Jitter σ</div>
                    <div className="cog-metric-value">{cog.result.convergence.jitter_m?.toFixed(3)}<span style={{fontSize:'0.6em',color:'#64748b',marginLeft:2}}>m</span></div>
                    <div className="cog-metric-sub">stochastic noise</div>
                  </div>
                  <div className="cog-metric-card">
                    <div className="cog-metric-label">1-σ Radius</div>
                    <div className="cog-metric-value">{cog.result.uncertainty.radius_m?.toFixed(0)}<span style={{fontSize:'0.6em',color:'#64748b',marginLeft:2}}>m</span></div>
                    <div className="cog-metric-sub">uncertainty</div>
                  </div>
                  <div className="cog-metric-card">
                    <div className="cog-metric-label">Ellipse θ</div>
                    <div className="cog-metric-value">{cog.result.uncertainty.theta_deg?.toFixed(1)}<span style={{fontSize:'0.6em',color:'#64748b',marginLeft:1}}>°</span></div>
                    <div className="cog-metric-sub">{cog.result.uncertainty.ellipse_a_m?.toFixed(0)} × {cog.result.uncertainty.ellipse_b_m?.toFixed(0)} m</div>
                  </div>
                </div>

                {/* Strategic narrative */}
                <div className="cog-insights-panel">
                  <h4 className="cog-insights-panel-title">Strategic Summary</h4>
                  <div className="cog-strategic-rows">
                    <div className="cog-strategic-row">
                      <span className="cog-strategic-row-icon">◎</span>
                      <span>
                        Optimal locus at&nbsp;
                        <strong>({cog.result.lat.toFixed(5)}, {cog.result.lng.toFixed(5)})</strong>
                        &nbsp;— uncertainty radius&nbsp;
                        <strong>±{cog.result.uncertainty.radius_m?.toFixed(0)} m</strong>
                      </span>
                    </div>
                    <div className="cog-strategic-row">
                      <span className="cog-strategic-row-icon">⬭</span>
                      <span>
                        1-σ ellipse&nbsp;
                        <strong>{cog.result.uncertainty.ellipse_a_m?.toFixed(0)} × {cog.result.uncertainty.ellipse_b_m?.toFixed(0)} m</strong>
                        &nbsp;at <strong>{cog.result.uncertainty.theta_deg?.toFixed(1)}°</strong> from east
                      </span>
                    </div>
                    <div className="cog-strategic-row">
                      <span className="cog-strategic-row-icon">↻</span>
                      <span>
                        Converged in&nbsp;<strong>{cog.result.convergence.iterations}</strong> iterations
                        &nbsp;(Δ = {cog.result.convergence.delta_m?.toFixed(2)} m,
                        jitter σ = {cog.result.convergence.jitter_m?.toFixed(3)} m)
                      </span>
                    </div>
                    <div className="cog-strategic-row">
                      <span className="cog-strategic-row-icon">▤</span>
                      <span>
                        <strong>{cog.result.parcel_count}</strong>&nbsp;
                        parcel{cog.result.parcel_count !== 1 ? 's' : ''} evaluated —&nbsp;
                        {cog.result.data_source === 'real'
                          ? 'live database records'
                          : 'synthesised from area-level statistics'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Matching properties near CoG */}
                <CogMatchingProperties
                  cogResult={cog.result}
                  weights={cog.weights}
                />

              </div>
            )}

          </div>{/* /cog-modal-right */}
        </div>{/* /cog-modal-columns */}
      </div>
    </div>
  );
}
