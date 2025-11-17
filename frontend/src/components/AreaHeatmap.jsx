import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import areaDataService from '../services/areaDataService';

function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function AreaHeatmap({ areaId, height = 340 }) {
  const [center, setCenter] = useState([ -26.1076, 28.0567 ]); // default Sandton approx
  const [points, setPoints] = useState([]);

  // Fetch area center when selection changes
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const detail = await areaDataService.getAreaDetails(areaId);
        if (active) {
          const lat = detail?.lat;
          const lng = detail?.lng;
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setCenter([lat, lng]);
          }
        }
      } catch {}
    };
    if (areaId) load();
    return () => { active = false; };
  }, [areaId]);

  // Synthesize points whenever center changes (until we have real property coords)
  useEffect(() => {
    const [lat, lng] = center;
    const mock = Array.from({ length: 40 }, () => ({
      lat: lat + (Math.random() - 0.5) * 0.02,
      lng: lng + (Math.random() - 0.5) * 0.02,
      value: Math.random()
    }));
    setPoints(mock);
  }, [center]);

  const gradient = useMemo(() => ({
    // Cool-to-warm similar to provided example
    low: 'rgba(59, 130, 246, 0.4)',   // blue-500
    mid: 'rgba(234, 179, 8, 0.6)',    // amber-500
    high: 'rgba(239, 68, 68, 0.7)'    // red-500
  }), []);

  return (
    <div style={{ height }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', borderRadius: 8 }} preferCanvas>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <Recenter center={center} zoom={13} />
        {points.map((p, idx) => (
          <CircleMarker
            key={idx}
            center={[p.lat, p.lng]}
            radius={6}
            pathOptions={{ color: 'transparent', fillColor: p.value > 0.66 ? gradient.high : (p.value > 0.33 ? gradient.mid : gradient.low), fillOpacity: 0.85 }}
          >
            <Tooltip direction='top' offset={[0, -6]} opacity={1} permanent={false}>
              Intensity: {(p.value * 100).toFixed(0)}%
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
