/**
 * CogWeightPanel.jsx
 * -------------------
 * Slider panel for the five CoG investment-factor weights.
 *
 * Props
 * -----
 *  weights          {rentalYield, pricePerSqm, vacancy, transitProximity, footfall}
 *  scenario         string  – active scenario key or "custom"
 *  totalWeight      number  – sum of all weights (should equal 100)
 *  weightsValid     bool
 *  onWeightChange   (factor, value) => void   – used by scenario presets
 *  onAutoBalance    (changedFactor, value) => void
 *  onScenarioChange (key) => void
 *  zoning           string[]
 *  onToggleZoning   (z) => void
 *  onSetAll         () => void
 *  onClearAll       () => void
 *  -- Drag lifecycle (connect to useCogSolver) --
 *  onDragStart      () => void           – fires on pointerdown
 *  onDragMove       (factor, value) => void  – fires on input (during drag)
 *  onDragEnd        (factor, value) => void  – fires on pointerup/blur
 */

import React, { useState } from 'react';
import { FACTOR_LABELS, ALL_ZONINGS } from '../hooks/useCogSolver';
import './styles/CentreOfGravity.css';

const ZONING_LABELS = {
  residential: 'Residential',
  commercial:  'Commercial',
  mixed:       'Mixed-Use',
  industrial:  'Industrial',
  retail:      'Retail',
};

const ZONING_ICONS = {
  residential: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 22V13h6v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  commercial: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  mixed: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M2 17h20M2 12h20M2 7h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  industrial: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M2 20h20M4 20V10l5-3v3l5-3v3l5-3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  retail: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

export default function CogWeightPanel({
  weights,
  totalWeight,
  weightsValid,
  onWeightChange,
  onAutoBalance,
  zoning,
  onToggleZoning,
  onSetAll,
  onClearAll,
  // Investor profile bar
  activeProfile  = null,
  onApplyProfile = () => {},
  // Slider animation gate — true briefly after a profile chip is selected
  animatingProfile = false,
  // Drag lifecycle
  onDragStart  = () => {},
  onDragMove   = () => {},
  onDragEnd    = () => {},
}) {
  const factors = Object.keys(FACTOR_LABELS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const zoningCount = zoning.length;
  const zoningSummary = zoningCount === ALL_ZONINGS.length
    ? 'All property types active'
    : `${zoningCount} of ${ALL_ZONINGS.length} property types active`;
  const weightSummary = weightsValid
    ? `Weights balanced at ${totalWeight}%`
    : `Weights need ${100 - totalWeight}% adjustment`;

  return (
    <aside className="cog-weight-panel">

      <div className="cog-panel-hero">
        <div className="cog-panel-hero-top">
          <div>
            <p className="cog-panel-hero-eyebrow">Investment filters</p>
            <h3 className="cog-panel-hero-title">Shape the map before you analyse</h3>
          </div>
          <div className="cog-panel-hero-badge">Research lens</div>
        </div>

        <p className="cog-panel-hero-copy">
          Refine what the map considers, then let the gravity model surface the best-fit areas.
        </p>

        <div className="cog-panel-hero-metrics" aria-hidden="true">
          <div className="cog-panel-hero-metric">
            <span className="cog-panel-hero-metric-label">Property types</span>
            <span className="cog-panel-hero-metric-value">{zoningCount}/{ALL_ZONINGS.length}</span>
          </div>
          <div className="cog-panel-hero-metric">
            <span className="cog-panel-hero-metric-label">Weights</span>
            <span className={`cog-panel-hero-metric-value ${weightsValid ? 'is-valid' : 'is-warning'}`}>
              {totalWeight}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Zone filter (always visible) ────────────────────────────── */}
      <div className="cog-section cog-section--zoning">
        <div className="cog-zoning-header">
          <div className="cog-zoning-header-left">
            <p className="cog-panel-section-label" style={{ marginBottom: 0 }}>Property lens</p>
            <span className="cog-zoning-count">{zoning.length} / {ALL_ZONINGS.length}</span>
          </div>
          <div className="cog-zoning-actions">
            <button className="cog-zoning-link" onClick={onSetAll}>All</button>
            <span className="cog-zoning-sep"/>
            <button className="cog-zoning-link" onClick={onClearAll}>None</button>
          </div>
        </div>

        <div className="cog-zoning-explanation">
          Property filters limit the market lens; they do not change the final score logic.
        </div>

        <div className="cog-zoning-list">
          {ALL_ZONINGS.map(z => {
            const checked = zoning.includes(z);
            return (
              <button
                key={z}
                type="button"
                role="checkbox"
                aria-checked={checked}
                className={`cog-zone-row${checked ? ' cog-zone-row--on' : ''}`}
                onClick={() => onToggleZoning(z)}
              >
                <span className="cog-zone-icon">{ZONING_ICONS[z]}</span>
                <span className="cog-zone-label">{ZONING_LABELS[z] ?? z}</span>
                <span className="cog-zone-check">
                  {checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Advanced: Factor weight sliders ─────────────────────────── */}
      <div className="cog-section cog-section--advanced">
        <button
          className="cog-advanced-toggle"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          aria-expanded={advancedOpen}
          title="Advanced users: customise investment weights"
        >
          <span className="cog-advanced-toggle-icon">{advancedOpen ? '▼' : '▶'}</span>
          <span>Weight studio</span>
          <span className="cog-advanced-badge">optional</span>
        </button>

        {advancedOpen && (
          <div className="cog-advanced-content">
            <p className="cog-advanced-description">
              Fine-tune the gravity model only when you want full control.
              Most investors will stay with one of the profile presets above.
            </p>

            {/* Weight sliders – only visible when Advanced is open */}
            <div className="cog-weight-sliders">
              {factors.map(factor => {
                const pct = weights[factor];
                return (
                  <div key={factor} className="cog-weight-control">
                    <div className="cog-weight-header">
                      <span className="cog-weight-label">{FACTOR_LABELS[factor]}</span>
                      <span className="cog-weight-value">{pct}%</span>
                    </div>
                    <div className="cog-slider-track">
                      <div
                        className="cog-slider-fill"
                        style={{
                          width: `${pct}%`,
                          transition: animatingProfile
                            ? 'width 420ms cubic-bezier(0.4, 0, 0.2, 1)'
                            : 'width 80ms ease',
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={pct}
                        className="cog-weight-slider"
                        onPointerDown={() => onDragStart()}
                        onInput={e  => onDragMove(factor, e.target.value)}
                        onPointerUp={e => onDragEnd(factor, e.target.value)}
                        onKeyUp={e  => onDragEnd(factor, e.target.value)}
                        onBlur={e   => onDragEnd(factor, e.target.value)}
                        onChange={e => onDragMove(factor, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Weight total + auto-balance */}
              <div className={`cog-weight-total${!weightsValid ? ' invalid' : ''}`}>
                <span>Total: <strong>{totalWeight}%</strong></span>
                {!weightsValid && (
                  <span className="cog-weight-warning">≠ 100</span>
                )}
                <button
                  className="cog-autobalance-btn"
                  title="Distribute remaining % evenly across other factors"
                  onClick={() => {
                    const top = factors.reduce((a, b) =>
                      weights[a] >= weights[b] ? a : b
                    );
                    onAutoBalance(top, weights[top]);
                  }}
                >
                  Auto-balance
                </button>
              </div>

              <div className="cog-weight-note" aria-live="polite">
                {weightSummary}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="cog-panel-footnote">
        <span className="cog-panel-footnote-dot" aria-hidden="true" />
        <span>{zoningSummary}</span>
      </div>
    </aside>
  );
}
