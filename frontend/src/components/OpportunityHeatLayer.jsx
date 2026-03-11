/**
 * OpportunityHeatLayer
 *
 * A self-contained Leaflet map that renders opportunity areas as coloured
 * CircleMarkers.  Each marker size/colour reflects the item's `score` field.
 *
 * Props:
 *   items        {Array}     Array of opportunity items from the API
 *   activeType   {string}    'top-yield' | 'low-vacancy' | 'value' | 'emerging'
 *   onAreaClick  {Function}  Called with the clicked item object
 *   height       {string}    CSS height string (default '100%')
 */
import React, { useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ── Constants ────────────────────────────────────────────────────────────────

const SA_CENTER = [-28.4793, 24.6727];   // centre of South Africa
const DEFAULT_ZOOM = 6;

const CATEGORY_ACCENT = {
  'top-yield':    '#C9A96E',   // gold
  'low-vacancy':  '#5B8DB8',   // steel blue
  'value':        '#6EC9A9',   // teal
  'emerging':     '#B86E9A',   // mauve
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map a 0-100 score to a circle radius (px).
 * Minimum 8, maximum 28.
 */
function scoreToRadius(score) {
  if (score == null) return 8;
  const clamped = Math.max(0, Math.min(100, score));
  return Math.round(8 + (clamped / 100) * 20);
}

/**
 * Map a 0-100 score to a fill colour blending from light to the category accent.
 */
function scoreToColor(score, accent) {
  if (score == null) return '#BEBEBE';
  const t = Math.max(0, Math.min(1, score / 100));
  // Interpolate between a muted grey (#BEBEBE) and the accent colour.
  const hex = accent || '#C9A96E';
  const r0 = 190, g0 = 190, b0 = 190;
  const r1 = parseInt(hex.slice(1, 3), 16);
  const g1 = parseInt(hex.slice(3, 5), 16);
  const b1 = parseInt(hex.slice(5, 7), 16);
  const r = Math.round(r0 + t * (r1 - r0));
  const g = Math.round(g0 + t * (g1 - g0));
  const b = Math.round(b0 + t * (b1 - b0));
  return `rgb(${r},${g},${b})`;
}

/**
 * Build a human-readable tooltip snippet from item highlights.
 */
function buildTooltipLines(item) {
  const h = item.highlights || {};
  const lines = [];
  if (h.rental_yield    != null) lines.push(`Yield: ${h.rental_yield.toFixed(1)} %`);
  if (h.vacancy_rate    != null) lines.push(`Vacancy: ${h.vacancy_rate.toFixed(1)} %`);
  if (h.price_per_sqm   != null) lines.push(`R${Math.round(h.price_per_sqm).toLocaleString()}/m²`);
  if (h.price_growth_yoy!= null) lines.push(`Growth: ${h.price_growth_yoy.toFixed(1)} % p.a.`);
  if (h.transport_score  != null) lines.push(`Transport: ${h.transport_score}/100`);
  if (h.days_on_market   != null) lines.push(`${h.days_on_market} days on market`);
  return lines;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OpportunityHeatLayer({
  items       = [],
  activeType  = 'top-yield',
  onAreaClick ,
  height      = '100%',
}) {
  const accent = CATEGORY_ACCENT[activeType] || '#C9A96E';

  // Only render items that have valid coordinates
  const validItems = useMemo(
    () => items.filter(it => it.lat != null && it.lng != null),
    [items],
  );

  return (
    <MapContainer
      center={SA_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height, width: '100%', borderRadius: '4px' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      {validItems.map((item) => {
        const radius = scoreToRadius(item.score);
        const color  = scoreToColor(item.score, accent);
        const tipLines = buildTooltipLines(item);

        return (
          <CircleMarker
            key={item.area_id}
            center={[item.lat, item.lng]}
            radius={radius}
            pathOptions={{
              fillColor:   color,
              fillOpacity: 0.82,
              color:       '#FFFFFF',
              weight:      1.5,
            }}
            eventHandlers={{
              click: () => onAreaClick && onAreaClick(item),
            }}
          >
            <Tooltip>
              <div style={{ minWidth: 130 }}>
                <strong style={{ fontSize: '0.82rem' }}>{item.area_name}</strong>
                <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: 2 }}>
                  {item.city_name}, {item.province_name}
                </div>
                {tipLines.map((l, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>{l}</div>
                ))}
                {item.score != null && (
                  <div
                    style={{
                      marginTop: 4,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: accent,
                    }}
                  >
                    Score: {item.score.toFixed(0)}
                  </div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
