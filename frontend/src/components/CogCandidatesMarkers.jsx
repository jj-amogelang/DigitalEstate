/**
 * CogCandidatesMarkers.jsx
 * ├────────────────────────
 * Renders each parcel as a discrete, clickable marker on the map.
 * Each marker:
 *   - Colored by zoning type (Residential=blue, Commercial=green, Industrial=red, etc.)
 *   - Sized by parcel score (0-1)
 *   - Shows parcel ID and zoning abbreviation
 *   - Clickable to show details in a popup
 *
 * Props
 * ─────
 *   parcels : [{id, lat, lng, score, feasible, zoning}] – list of candidates
 *   onSelect : (parcel) => void – callback when a marker is clicked
 */

import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// ─ Zoning type → color mapping ────────────────────────────────────────────
const ZONING_COLORS = {
  residential: { rgb: '59,130,246', hex: '#3b82f6', label: 'Residential', abbr: 'R' },      // blue
  commercial: { rgb: '34,197,94', hex: '#22c55e', label: 'Commercial', abbr: 'C' },        // green
  industrial: { rgb: '239,68,68', hex: '#ef4444', label: 'Industrial', abbr: 'I' },        // red
  mixed:      { rgb: '168,85,247', hex: '#a855f7', label: 'Mixed-Use', abbr: 'M' },       // purple
  retail:     { rgb: '249,115,22', hex: '#f97316', label: 'Retail', abbr: 'RT' },         // orange
};

function getZoningColor(zoning) {
  return ZONING_COLORS[zoning?.toLowerCase()] || ZONING_COLORS.residential;
}

// ─ SVG marker icon with zoning-specific color and abbreviation ─────────────
function createMarkerIcon(score, parcelId, zoning) {
  const color = getZoningColor(zoning);
  const size = Math.max(28, Math.min(44, 28 + score * 16));
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer circle shadow -->
      <circle cx="16" cy="16" r="14" fill="rgba(0,0,0,0.15)"/>
      <!-- Main circle with zoning color -->
      <circle cx="16" cy="16" r="12" fill="rgb(${color.rgb})" stroke="#fff" stroke-width="2"/>
      <!-- Parcel ID label -->
      <text x="16" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">
        ${parcelId}
      </text>
    </svg>
  `;

  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 10],
    className: 'cog-candidate-marker',
  });
}

// ─ Main component ──────────────────────────────────────────────────────────
export default function CogCandidatesMarkers({ parcels = [], onSelect = () => {} }) {
  const map = useMap();

  if (!parcels || parcels.length === 0) {
    return null;
  }

  return (
    <>
      {parcels.map((parcel, idx) => {
        const color = getZoningColor(parcel.zoning);
        const icon = createMarkerIcon(parcel.score, idx + 1, parcel.zoning);

        return (
          <Marker
            key={`parcel-${parcel.id}`}
            position={[parcel.lat, parcel.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onSelect(parcel),
            }}
            title={`${color.label} - Score: ${(parcel.score * 100).toFixed(1)}%`}
          >
            <Popup>
              <div className="cog-marker-popup">
                <h4>
                  Parcel #{parcel.id}
                  <span className="popup-zoning-badge" style={{ backgroundColor: color.hex }}>
                    {color.label}
                  </span>
                </h4>
                <div className="popup-row">
                  <span className="popup-label">Score:</span>
                  <span className="popup-value">{(parcel.score * 100).toFixed(1)}%</span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Type:</span>
                  <span className="popup-value" style={{ color: color.hex, fontWeight: 'bold' }}>
                    {color.label}
                  </span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Coordinates:</span>
                  <span className="popup-value">{parcel.lat.toFixed(4)}, {parcel.lng.toFixed(4)}</span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Feasible:</span>
                  <span className={`popup-value ${parcel.feasible ? 'feasible-yes' : 'feasible-no'}`}>
                    {parcel.feasible ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
