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

// ── Local fallback data (mirrors backend _INVESTOR_PROFILES) ──────────────
const LOCAL_PROFILES = [
  {
    key:         'balanced',
    label:       'Balanced',
    icon:        '⚖️',
    risk:        'Low',
    description: 'An even spread across all five investment factors — yield, price, '
               + 'vacancy, transit and footfall. A sensible starting point for first-time '
               + 'investors or diversified portfolios seeking stable, moderate returns.',
  },
  {
    key:         'valueInvestor',
    label:       'Value Investor',
    icon:        '💎',
    risk:        'Medium',
    description: 'Maximise rental yield while minimising entry price per m². Transit and '
               + 'footfall carry minimal weight, making this profile best suited to '
               + 'residential buy-to-let in emerging or under-valued suburbs.',
  },
  {
    key:         'transitFocused',
    label:       'Transit-Smart',
    icon:        '🚇',
    risk:        'Low',
    description: 'Prioritises strong public-transport proximity above all other factors. '
               + 'Ideal for urban mixed-use or residential assets where connectivity '
               + 'directly drives tenant demand and long-term capital growth.',
  },
  {
    key:         'highFootfall',
    label:       'Footfall-Driven',
    icon:        '🚶',
    risk:        'Medium',
    description: 'Optimises for maximum pedestrian and consumer activity. Best applied to '
               + 'retail, street-facing commercial or mixed-use nodes where passing trade '
               + 'is the primary income driver.',
  },
  {
    key:         'highYieldHunter',
    label:       'High-Yield Hunter',
    icon:        '🎯',
    risk:        'High',
    description: 'Aggressively targets the highest rental yield with minimal regard for '
               + 'transit or footfall proximity. Suits experienced investors comfortable '
               + 'with higher vacancy risk in exchange for above-market income returns.',
  },
  {
    key:         'airbnbShortStay',
    label:       'AirBnB / Short-Stay',
    icon:        '🏡',
    risk:        'High',
    description: 'Tuned for short-term rental operations: balances yield, low vacancy and '
               + 'strong footfall/transit scores. Performs best near tourism corridors, '
               + 'CBDs or event centres where nightly rates substantially exceed long-term rents.',
  },
  {
    key:         'developmentOpportunity',
    label:       'Developer',
    icon:        '🏗️',
    risk:        'High',
    description: 'Targets low-cost parcels with strong footfall potential for value-add '
               + 'or ground-up redevelopment. Vacancy tolerance is high; transit and '
               + 'amenity exposure are secondary to price and pedestrian demand.',
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

