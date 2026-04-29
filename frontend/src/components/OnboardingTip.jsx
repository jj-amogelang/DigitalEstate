/**
 * OnboardingTip.jsx
 * ──────────────────
 * Helpful tip shown on first CoG modal for first-time users.
 * Auto-dismisses after 6 seconds or manual close.
 * 
 * Props:
 *   onDismiss: () => void
 */

import React, { useEffect, useState } from 'react';
import './OnboardingTip.css';

export default function OnboardingTip({ onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 6000); // 6-second auto-dismiss

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="onboarding-tip" role="alert" aria-live="polite">
      <div className="tip-icon">💡</div>
      <div className="tip-content">
        <p className="tip-text">
          <strong>Insight:</strong> Click any area marker for more details. Want to 
          explore other zones or investor profiles? Use the controls above.
        </p>
      </div>
      <button
        className="tip-close"
        onClick={() => {
          setIsVisible(false);
          onDismiss?.();
        }}
        aria-label="Dismiss tip"
      >
        ✕
      </button>
    </div>
  );
}
