/**
 * RecentAndSaved.jsx
 * ------------------
 * Shows two horizontal scrollers:
 *   1. Recently Viewed  – last 6 visit cards (most-recent first)
 *   2. Saved Areas      – bookmarked areas
 *
 * Props
 * -----
 *   recent        Array<{id, name, city, province, timestamp}>
 *   saved         Array<{id, name, city, province, timestamp}>
 *   onAreaClick   (id, name) => void  – fires when a card is clicked
 *   onUnsave      (id) => void        – fires on bookmark press in saved section
 */
import React from 'react';
import './styles/RecentAndSaved.css';

function formatRelative(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 2)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path
        d="M5 3h14a1 1 0 011 1v17l-8-4.5L4 21V4a1 1 0 011-1z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
      />
    </svg>
  );
}

function AreaCard({ area, onClick, onUnsave, showUnsave }) {
  return (
    <button
      className="ras-card"
      onClick={() => onClick(area.id, area.name)}
      aria-label={`View ${area.name}`}
    >
      <span className="ras-card-pin"><PinIcon /></span>
      <span className="ras-card-name">{area.name}</span>
      {area.city && (
        <span className="ras-card-meta">{area.city}{area.province ? `, ${area.province}` : ''}</span>
      )}
      {showUnsave ? (
        <button
          className="ras-unsave"
          onClick={(e) => { e.stopPropagation(); onUnsave(area.id); }}
          aria-label={`Unsave ${area.name}`}
          title="Remove bookmark"
        >
          <BookmarkIcon filled />
        </button>
      ) : (
        <span className="ras-card-time">{formatRelative(area.timestamp)}</span>
      )}
    </button>
  );
}

export default function RecentAndSaved({ recent = [], saved = [], onAreaClick, onUnsave }) {
  const hasRecent = recent.length > 0;
  const hasSaved  = saved.length > 0;

  if (!hasRecent && !hasSaved) return null;

  return (
    <section className="ras-root" aria-label="Your areas">
      {hasRecent && (
        <div className="ras-section">
          <h4 className="ras-title">Recently Viewed</h4>
          <div className="ras-scroller">
            {[...recent].reverse().map(area => (
              <AreaCard
                key={area.id}
                area={area}
                onClick={onAreaClick}
                showUnsave={false}
              />
            ))}
          </div>
        </div>
      )}

      {hasSaved && (
        <div className="ras-section">
          <h4 className="ras-title">Saved Areas</h4>
          <div className="ras-scroller">
            {saved.map(area => (
              <AreaCard
                key={area.id}
                area={area}
                onClick={onAreaClick}
                onUnsave={onUnsave}
                showUnsave
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
