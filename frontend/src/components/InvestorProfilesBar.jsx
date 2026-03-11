/**
 * InvestorProfilesBar.jsx
 * ------------------------
 * Compact, 2-column grid of investor profile chips placed
 * directly above the CoG weight sliders in the left panel.
 *
 * Each chip maps to a SCENARIOS key in useCogSolver.js.
 * Clicking a chip calls `onSelect(key)` → parent calls `cog.applyProfile(key)`.
 *
 * Props
 * -----
 *  activeProfile   string|null   currently active scenario/profile key
 *  onSelect        (key) => void called when a chip is clicked
 */
import React from 'react';
import './styles/InvestorProfilesBar.css';

export const INVESTOR_PROFILES = [
  {
    key:         'valueInvestor',
    label:       'Value Investor',
    icon:        '💎',
    description: 'High yield · low entry price · minimal transit bias',
  },
  {
    key:         'balanced',
    label:       'Balanced',
    icon:        '⚖️',
    description: 'Even spread across all five investment factors',
  },
  {
    key:         'highFootfall',
    label:       'Footfall-Driven',
    icon:        '🚶',
    description: 'Optimise for pedestrian activity and consumer footfall',
  },
  {
    key:         'transitFocused',
    label:       'Transit-Smart',
    icon:        '🚇',
    description: 'Prioritise public-transport proximity above all else',
  },
  {
    key:         'highYieldHunter',
    label:       'High-Yield Hunter',
    icon:        '🎯',
    description: 'Chase the absolute highest rental yield in any market',
  },
  {
    key:         'airbnbShortStay',
    label:       'AirBnB / Short-Stay',
    icon:        '🏡',
    description: 'Short-term rental focus: footfall, transit, low vacancy',
  },
  {
    key:         'developmentOpportunity',
    label:       'Developer',
    icon:        '🏗️',
    description: 'Low-cost parcels with high footfall for redevelopment plays',
  },
];

export default function InvestorProfilesBar({ activeProfile, onSelect }) {
  return (
    <div className="ipb-root" role="radiogroup" aria-label="Investor profile presets">
      <p className="ipb-heading">Investment Profile</p>
      <div className="ipb-grid">
        {INVESTOR_PROFILES.map(p => {
          const isActive = p.key === activeProfile;
          return (
            <button
              key={p.key}
              className={`ipb-chip${isActive ? ' ipb-chip--active' : ''}`}
              role="radio"
              aria-checked={isActive}
              title={p.description}
              onClick={() => onSelect(p.key)}
            >
              <span className="ipb-chip-icon" aria-hidden="true">{p.icon}</span>
              <span className="ipb-chip-label">{p.label}</span>
            </button>
          );
        })}
      </div>
      {activeProfile && (() => {
        const p = INVESTOR_PROFILES.find(x => x.key === activeProfile);
        return p ? (
          <p className="ipb-description" aria-live="polite">{p.description}</p>
        ) : null;
      })()}
    </div>
  );
}
