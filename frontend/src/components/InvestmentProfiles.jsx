/**
 * InvestmentProfiles.jsx
 * -----------------------
 * Horizontal preset bar for the CoG modal investor profiles.
 *
 * Data source: `profiles` prop (from /api/profiles). Falls back to a
 * complete local copy so the component works even before the fetch resolves.
 *
 * Props
 * -----
 *   profiles        array|null    – profile objects from /api/profiles (optional)
 *   activeProfile   string|null   – currently active scenario key
 *   onSelect        (key) => void – called when a chip is clicked
 *   compact         bool          – tighter layout for use inside modal
 */
import React from 'react';
import './styles/InvestmentProfiles.css';

// ── Local fallback data: 3 core presets for tight deadline release ───────────
const LOCAL_PROFILES = [
  {
    key:         'growth',
    label:       'Growth Potential',
    icon:        '🚀',
    risk:        'High',
    description: 'Higher prices later. Property values rise; yields lower today. Best for investors with long holding periods (5+ years) and appetite for development risk.',
  },
  {
    key:         'stable',
    label:       'Stable Returns',
    icon:        '💎',
    risk:        'Low',
    description: 'Steady income now. Low vacancy risk; lower capital gains. Best for cash-flow focused investors seeking predictable returns in established neighbourhoods.',
  },
  {
    key:         'balanced',
    label:       'Balanced',
    icon:        '⚖️',
    risk:        'Medium',
    description: 'Mix of both. Moderate everything; most flexibility. Ideal for newcomers or investors wanting balanced exposure across multiple success factors.',
  },
];

// ── Risk badge ────────────────────────────────────────────────────────────
function RiskBadge({ risk, inverted = false }) {
  if (!risk) return null;
  const slug = risk.toLowerCase();
  return (
    <span className={`ip-risk ip-risk--${slug}${inverted ? ' ip-risk--inv' : ''}`}>
      {risk}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────
export { LOCAL_PROFILES as INVESTMENT_PROFILES };

export default function InvestmentProfiles({
  profiles  = null,
  activeProfile,
  onSelect,
  compact   = false,
}) {
  const list   = (profiles && profiles.length > 0) ? profiles : LOCAL_PROFILES;
  const active = list.find(p => p.key === activeProfile) ?? null;

  return (
    <div
      className={`ip-root${compact ? ' ip-compact' : ''}`}
      role="radiogroup"
      aria-label="Investment profile presets"
    >
      {!compact && <p className="ip-heading">Investment Profile</p>}

      {/* ── Chip track ──────────────────────────────────────────── */}
      <div className="ip-track">
        {list.map(p => {
          const isActive = p.key === activeProfile;
          return (
            <button
              key={p.key}
              className={`ip-chip${isActive ? ' ip-chip--active' : ''}`}
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(p.key)}
              title={p.description}
            >
              <span className="ip-chip-label">{p.label}</span>
              <RiskBadge risk={p.risk} inverted={isActive} />
            </button>
          );
        })}
      </div>

      {/* ── Active profile panel ────────────────────────────────── */}
      {active && (
        <div className="ip-active-panel" key={active.key} aria-live="polite">
          <div className="ip-active-header">
            <span className="ip-active-name">{active.label}</span>
            <RiskBadge risk={active.risk} />
          </div>
          <p className="ip-active-copy">{active.description}</p>
        </div>
      )}
    </div>
  );
}

