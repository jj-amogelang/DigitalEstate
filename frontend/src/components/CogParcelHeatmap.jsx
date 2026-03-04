/**
 * CogParcelHeatmap.jsx
 * ---------------------
 * Renders a canvas-based heatmap overlay on top of a react-leaflet map.
 * Each parcel is drawn as a radial gradient circle sized by its score.
 * Requires react-leaflet v3+.
 *
 * Props
 * -----
 *  parcels  [{ lat, lng, score }]   – scored parcel list from solver result
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// ── Color scale: blue → amber → red ────────────────────────────────────────
function scoreToRgb(score) {
  // score: 0→1
  const s = Math.max(0, Math.min(1, score));
  if (s < 0.5) {
    // blue (40,100,220) → amber (255,190,50)
    const t = s / 0.5;
    return [
      Math.round(40  + t * (255 - 40)),
      Math.round(100 + t * (190 - 100)),
      Math.round(220 + t * (50  - 220)),
    ];
  } else {
    // amber (255,190,50) → red (255,60,60)
    const t = (s - 0.5) / 0.5;
    return [
      255,
      Math.round(190 + t * (60  - 190)),
      Math.round(50  + t * (60  - 50)),
    ];
  }
}

// ── Custom Leaflet layer ─────────────────────────────────────────────────────
const HeatmapLayer = L.Layer.extend({
  initialize(parcels) {
    this._parcels = parcels || [];
  },

  onAdd(map) {
    this._map = map;
    const canvas = L.DomUtil.create('canvas', 'cog-heatmap-canvas');
    this._canvas = canvas;
    const pane = map.getPane('overlayPane');
    pane.appendChild(canvas);
    map.on('moveend zoomend resize', this._draw, this);
    this._draw();
  },

  onRemove(map) {
    map.off('moveend zoomend resize', this._draw, this);
    L.DomUtil.remove(this._canvas);
  },

  setData(parcels) {
    this._parcels = parcels || [];
    if (this._map) this._draw();
  },

  _draw() {
    const map     = this._map;
    const canvas  = this._canvas;
    const size    = map.getSize();
    canvas.width  = size.x;
    canvas.height = size.y;

    // Position canvas to cover the whole tile pane
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of this._parcels) {
      const score = typeof p.score === 'number' ? p.score : 0.5;
      const [r, g, b] = scoreToRgb(score);
      // Radius scaled with zoom (30px at zoom 14)
      const zoom   = map.getZoom();
      const radius = Math.max(8, 30 * Math.pow(2, zoom - 14));

      const point = map.latLngToContainerPoint([p.lat, p.lng]);

      const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      grad.addColorStop(0,   `rgba(${r},${g},${b},0.75)`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},0.35)`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  },
});

// ── React wrapper ────────────────────────────────────────────────────────────
export default function CogParcelHeatmap({ parcels = [] }) {
  const map       = useMap();
  const layerRef  = useRef(null);

  // Create layer once on mount
  useEffect(() => {
    const layer = new HeatmapLayer(parcels);
    layer.addTo(map);
    layerRef.current = layer;
    return () => { layer.remove(); };
  }, [map]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Update data when parcels change
  useEffect(() => {
    if (layerRef.current) layerRef.current.setData(parcels);
  }, [parcels]);

  return null;
}
