/**
 * FirstTimeHero.jsx
 * ──────────────────
 * First-time user landing page with minimal friction.
 * 
 * Flow:
 * 1. User sees city selector
 * 2. User clicks city (or keeps Johannesburg)
 * 3. User clicks "Analyze [City]"
 * 4. Opens CoG modal with Balanced preset + residential-only zones
 * 
 * Props:
 *   onAnalyze: (areaId, areaName) => void
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './styles/FirstTimeHero.css';

const SOUTH_AFRICAN_CITIES = [
  { id: 1, label: 'Johannesburg', area_name: 'Johannesburg' },
  { id: 2, label: 'Cape Town', area_name: 'Cape Town' },
  { id: 3, label: 'Durban', area_name: 'Durban' },
  { id: 4, label: 'Pretoria', area_name: 'Pretoria' },
];

export default function FirstTimeHero({ onAnalyze }) {
  const [selectedCity, setSelectedCity] = useState(SOUTH_AFRICAN_CITIES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setIsOpen(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Give visual feedback for 300ms, then call parent
    setTimeout(() => {
      onAnalyze(selectedCity.id, selectedCity.area_name);
      setIsAnalyzing(false);
    }, 300);
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !isAnalyzing) {
        handleAnalyze();
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnalyzing, isOpen, selectedCity]);

  return (
    <div className="first-time-hero">
      {/* Background gradient */}
      <div className="hero-background" />

      <div className="hero-container">
        {/* Header */}
        <div className="hero-header">
          <h1 className="hero-title">Find Investment Opportunity</h1>
          <p className="hero-subtitle">
            Geospatial analysis to guide your property research.
          </p>
        </div>

        {/* City Selector */}
        <div className="hero-content">
          <div className="hero-section-label">Select a city:</div>

          <div className="city-selector-wrapper">
            <div className="city-selector">
              <button
                className="city-selector-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
              >
                <span className="city-selector-value">{selectedCity.label}</span>
                <ChevronDown
                  size={18}
                  className={`city-selector-icon${isOpen ? ' open' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div className="city-selector-dropdown" role="listbox">
                  {SOUTH_AFRICAN_CITIES.map((city) => (
                    <button
                      key={city.id}
                      className={`city-selector-option${
                        city.id === selectedCity.id ? ' active' : ''
                      }`}
                      onClick={() => handleCitySelect(city)}
                      role="option"
                      aria-selected={city.id === selectedCity.id}
                    >
                      {city.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Primary CTA */}
          <button
            className={`hero-cta${isAnalyzing ? ' analyzing' : ''}`}
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            aria-busy={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <span className="hero-cta-spinner" aria-hidden="true" />
                Analysing gravity…
              </>
            ) : (
              <>
                Analyse {selectedCity.label}
                <span className="hero-cta-arrow" aria-hidden="true">→</span>
              </>
            )}
          </button>

          {/* Secondary action */}
          <div className="hero-secondary">
            <a href="/explore" className="hero-secondary-link">
              or explore all areas
            </a>
          </div>
        </div>

        {/* Footer hint */}
        <div className="hero-footer">
          <p className="hero-footer-text">
            New here? We'll show you investment patterns in
            {' '}
            <strong>{selectedCity.label}</strong>
            {' '}
            in seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
