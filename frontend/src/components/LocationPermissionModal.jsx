import React from 'react';
import './styles/LocationPermissionModal.css';

/**
 * LocationPermissionModal
 * -----------------------
 * Shown once per browser session on first visit.
 * Asks the user to share their location so we can surface relevant area
 * metrics and properties automatically.
 *
 * Props:
 *   onAllow  — user clicked "Use My Location"
 *   onSkip   — user clicked "Not now"
 */
export default function LocationPermissionModal({ onAllow, onSkip }) {
  return (
    <div className="lpm-overlay" role="dialog" aria-modal="true" aria-labelledby="lpm-title">
      <div className="lpm-card">
        {/* Icon */}
        <div className="lpm-icon-wrap">
          <svg className="lpm-icon" width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        {/* Copy */}
        <h2 id="lpm-title" className="lpm-title">See Insights for Your Area</h2>
        <p className="lpm-body">
          Allow DigitalEstate to use your live location to instantly show
          property prices, rental yields, and investment trends for the area
          you're in right now.
        </p>

        {/* CTA buttons */}
        <div className="lpm-actions">
          <button className="lpm-btn-allow" onClick={onAllow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            Use My Location
          </button>

          <button className="lpm-btn-skip" onClick={onSkip}>
            Not now
          </button>
        </div>

        {/* Fine-print */}
        <p className="lpm-note">
          Your location is only used to find your nearest area — it is never
          stored on our servers. You can change this preference in&nbsp;Settings.
        </p>
      </div>
    </div>
  );
}
