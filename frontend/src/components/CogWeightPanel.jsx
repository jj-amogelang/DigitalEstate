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

import React from 'react';
import { SCENARIOS, FACTOR_LABELS, ALL_ZONINGS } from '../hooks/useCogSolver';
import './styles/CentreOfGravity.css';

const ZONING_LABELS = {
  residential: 'Residential',
  commercial:  'Commercial',
  mixed:       'Mixed-Use',
  industrial:  'Industrial',
  retail:      'Retail',
};

const SCENARIO_OPTIONS = [
  { key: 'balanced',       label: 'Balanced' },
  { key: 'valueInvestor',  label: 'Value Investor' },
  { key: 'transitFocused', label: 'Transit-Focused' },
  { key: 'highFootfall',   label: 'High Footfall' },
];

export default function CogWeightPanel({
  weights,
  scenario,
  totalWeight,
  weightsValid,
  onWeightChange,    // used by auto-balance (not by sliders during drag)
  onAutoBalance,
  onScenarioChange,
  zoning,
  onToggleZoning,
  onSetAll,
  onClearAll,
  // Drag lifecycle
  onDragStart  = () => {},
  onDragMove   = () => {},
  onDragEnd    = () => {},
}) {
  const factors = Object.keys(FACTOR_LABELS);

  return (
    <aside className="cog-weight-panel">
      {/* ── Scenario presets ──────────────────────────────────────── */}
      <div className="cog-section">
        <p className="cog-section-title">Scenario Presets</p>
        <div className="cog-scenario-grid">
          {SCENARIO_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              className={`cog-scenario-button${scenario === key ? ' active' : ''}`}
              onClick={() => onScenarioChange(key)}
            >
              {label}
            </button>
          ))}
          {scenario === 'custom' && (
            <span className="cog-custom-badge">Custom</span>
          )}
        </div>
      </div>

      {/* ── Factor weight sliders ─────────────────────────────────── */}
      <div className="cog-section">
        <p className="cog-section-title">Investment Weights</p>

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
                  style={{ width: `${pct}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pct}
                  className="cog-weight-slider"
                  // Drag lifecycle: preview fires on every pixel of movement;
                  // full solve fires on pointer release.
                  onPointerDown={() => onDragStart()}
                  onInput={e  => onDragMove(factor, e.target.value)}
                  onPointerUp={e => onDragEnd(factor, e.target.value)}
                  // Keyboard fallback: treat arrow-key release as drag end
                  onKeyUp={e  => onDragEnd(factor, e.target.value)}
                  // onBlur catch-all (e.g. mouse leaves window while pressed)
                  onBlur={e   => onDragEnd(factor, e.target.value)}
                  // onChange kept so React's controlled input stays in sync
                  // without fighting the drag callbacks
                  onChange={e => onDragMove(factor, e.target.value)}
                />
              </div>
            </div>
          );
        })}

        {/* Weight total + auto-balance ─────────────────────────── */}
        <div className={`cog-weight-total${!weightsValid ? ' invalid' : ''}`}>
          Total: <strong>{totalWeight}%</strong>
          {!weightsValid && (
            <span className="cog-weight-warning"> ≠ 100</span>
          )}
          <button
            className="cog-autobalance-btn"
            title="Distribute remaining % evenly across other factors"
            onClick={() => {
              // Balance relative to the heaviest factor
              const top = factors.reduce((a, b) =>
                weights[a] >= weights[b] ? a : b
              );
              onAutoBalance(top, weights[top]);
            }}
          >
            Auto-balance
          </button>
        </div>
      </div>

      {/* ── Zoning constraints ───────────────────────────────────── */}
      <div className="cog-section">
        <div className="cog-zoning-header">
          <p className="cog-section-title" style={{ marginBottom: 0 }}>Zoning Filter</p>
          <div className="cog-zoning-actions">
            <button className="cog-zoning-link" onClick={onSetAll}>All</button>
            <span>·</span>
            <button className="cog-zoning-link" onClick={onClearAll}>None</button>
          </div>
        </div>
        <div className="cog-zoning-grid">
          {ALL_ZONINGS.map(z => (
            <label key={z} className="cog-zoning-chip">
              <input
                type="checkbox"
                checked={zoning.includes(z)}
                onChange={() => onToggleZoning(z)}
              />
              <span>{ZONING_LABELS[z] ?? z}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
