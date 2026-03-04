/**
 * CogAnimatedMarker.jsx
 * ----------------------
 * A react-leaflet Marker that smoothly interpolates from its previous
 * position to a new position using requestAnimationFrame (no extra deps).
 *
 * Props
 * -----
 *  position   [lat, lng]    – target position
 *  icon       L.Icon        – Leaflet icon to use
 *  children   ReactNode     – e.g. <Tooltip> / <Popup>
 *  duration   number        – animation duration in ms (default 500)
 */

import { useEffect, useRef, useMemo } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// ── easing (ease-out cubic) ────────────────────────────────────────────────
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ── lerp ──────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

// ── default icon ──────────────────────────────────────────────────────────
const DEFAULT_ICON = new L.DivIcon({
  className: 'cog-animated-marker',
  html: `
    <div class="cog-marker-pin">
      <div class="cog-marker-pulse"></div>
    </div>
  `,
  iconAnchor: [14, 14],
  iconSize:   [28, 28],
});

// ─────────────────────────────────────────────────────────────────────────────

export default function CogAnimatedMarker({
  position,
  icon,
  children,
  duration = 500,
}) {
  const markerRef = useRef(null);
  const prevPos   = useRef(position);
  const rafRef    = useRef(null);
  const startRef  = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const map       = useMap();

  const resolvedIcon = useMemo(() => icon || DEFAULT_ICON, [icon]);

  useEffect(() => {
    if (!position || !markerRef.current) return;

    const from = prevPos.current;
    const to   = position;

    // If positions are the same, skip animation
    if (from[0] === to[0] && from[1] === to[1]) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    function animate(ts) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const e = easeOut(t);

      const lat = lerp(from[0], to[0], e);
      const lng = lerp(from[1], to[1], e);

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevPos.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [position, duration]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!position) return null;

  return (
    <Marker
      ref={markerRef}
      position={prevPos.current}
      icon={resolvedIcon}
    >
      {children}
    </Marker>
  );
}
