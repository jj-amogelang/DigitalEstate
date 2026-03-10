/**
 * InvestmentProfiles.jsx
 * -----------------------
 * Horizontal preset bar that maps 5 investment archetypes to
 * CoG solver scenario keys. Selecting a preset calls
 * `onSelect(scenarioKey)` which the parent passes to
 * `cog.applyScenario(key)`.
 *
 * The 5th preset ("Development") uses custom weights injected
 * via a special string key "developmentOpportunity" that
 * ExplorePage / CentreOfGravity resolves before calling
 * `cog.applyScenario`.
 *
 * Props
 * -----
 *   activeProfile   string|null   – currently active scenario key
 *   onSelect        (key) => void – called when preset is clicked
 *   compact         bool          – tighter layout for use inside modal
 */
import React from 'react';
import './styles/InvestmentProfiles.css';

export const INVESTMENT_PROFILES = [
  {
    key:         'balanced',
    label:       'Balanced',
    description: 'Equal weight across all metrics',
  },
  {
    key:         'valueInvestor',
    label:       'Value Investor',
    description: 'High yield · low vacancy · affordable price',
  },
  {
    key:         'transitFocused',
    label:       'Transit-Focused',
    description: 'Strong transport accessibility',
  },
  {
    key:         'highFootfall',
    label:       'High Footfall',
    description: 'Maximum pedestrian & consumer activity',
  },
  {
    key:         'developmentOpportunity',
    label:       'Development Opp.',
    description: 'Low price/sqm · high footfall · vacancy',
  },
];

export default function InvestmentProfiles({ activeProfile, onSelect, compact = false }) {
  return (
    <div
      className={`ip-root${compact ? ' ip-compact' : ''}`}
      role="radiogroup"
      aria-label="Investment profile presets"
    >
      {!compact && (
        <p className="ip-heading">Investment Profile</p>
      )}
      <div className="ip-track">
        {INVESTMENT_PROFILES.map(p => {
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
              {isActive && <span className="ip-chip-check" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
      {activeProfile && (() => {
        const profile = INVESTMENT_PROFILES.find(p => p.key === activeProfile);
        return profile ? (
          <p className="ip-description" aria-live="polite">{profile.description}</p>
        ) : null;
      })()}
    </div>
  );
}
