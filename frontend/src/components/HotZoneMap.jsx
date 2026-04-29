/**
 * HotZoneMap
 *
 * Displays a Leaflet map for a SA province showing top-scoring areas
 * as colour-graded circle markers (composite investment score).
 *
 * Props:
 *   hotzones     – Array from /api/insights/province/:id/dashboard
 *   provinceName – String, used to pick a sensible map centre
 *   loading      – Boolean
 *   onAreaClick  – (areaId, areaName) => void  (optional)
 */
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/* Approximate province centroids for initial map view */
const PROVINCE_CENTROIDS = {
  'gauteng':            { lat: -26.2708, lng: 28.1123, zoom: 9 },
  'western cape':       { lat: -33.9330, lng: 18.8600, zoom: 8 },
  'kwazulu-natal':      { lat: -29.0000, lng: 30.5595, zoom: 8 },
  'kwazulu natal':      { lat: -29.0000, lng: 30.5595, zoom: 8 },
  'eastern cape':       { lat: -32.2968, lng: 26.4194, zoom: 7 },
  'limpopo':            { lat: -23.9050, lng: 29.4590, zoom: 7 },
  'mpumalanga':         { lat: -25.5653, lng: 30.5272, zoom: 8 },
  'north west':         { lat: -26.6638, lng: 25.5670, zoom: 7 },
  'northern cape':      { lat: -29.0467, lng: 21.8569, zoom: 6 },
  'free state':         { lat: -28.4541, lng: 26.7968, zoom: 7 },
};

function getProvinceCentroid(provinceName) {
  if (!provinceName) return { lat: -28.5, lng: 24.8, zoom: 6 };
  const key = provinceName.toLowerCase();
  return PROVINCE_CENTROIDS[key] || { lat: -28.5, lng: 24.8, zoom: 6 };
}

/** Map composite score [0..1] → colour */
function scoreToColor(score) {
  if (score >= 0.65) return { color: '#C9A96E', fillColor: '#C9A96E', opacity: 0.9, fillOpacity: 0.5 };
  if (score >= 0.45) return { color: '#888',    fillColor: '#aaa',    opacity: 0.8, fillOpacity: 0.4 };
  return                     { color: '#bbb',    fillColor: '#ddd',    opacity: 0.7, fillOpacity: 0.3 };
}

/** Map composite score [0..1] → circle radius (px) */
function scoreToRadius(score) {
  return 6 + Math.round(score * 14); // 6..20
}

export default function HotZoneMap({ hotzones = [], provinceName, loading, onAreaClick }) {
  const centroid = useMemo(() => getProvinceCentroid(provinceName), [provinceName]);

  // Only render circles that have valid coordinates
  const validZones = useMemo(
    () => hotzones.filter(z => z.lat != null && z.lng != null),
    [hotzones]
  );

  if (loading) {
    return (
      <div className="hotzone-map-wrapper">
        <div className="hotzone-map-header">
          <h4 className="hotzone-map-title">Hot Investment Zones</h4>
        </div>
        <div className="hotzone-map-loading">Loading map…</div>
      </div>
    );
  }

  if (validZones.length === 0) {
    return (
      <div className="hotzone-map-wrapper">
        <div className="hotzone-map-header">
          <h4 className="hotzone-map-title">Hot Investment Zones</h4>
        </div>
        <div className="hotzone-map-empty">No geo-referenced areas in this province yet</div>
      </div>
    );
  }

  return (
    <div className="hotzone-map-wrapper">
      <div className="hotzone-map-header">
        <h4 className="hotzone-map-title">Hot Investment Zones — {provinceName || 'Province'}</h4>
        <div className="hotzone-map-legend">
          <span>
            <span className="hotzone-legend-dot hotzone-legend-dot--high" />
            High
          </span>
          <span>
            <span className="hotzone-legend-dot hotzone-legend-dot--medium" />
            Medium
          </span>
          <span>
            <span className="hotzone-legend-dot hotzone-legend-dot--low" />
            Low
          </span>
        </div>
      </div>

      <div className="hotzone-map-container">
        <MapContainer
          center={[centroid.lat, centroid.lng]}
          zoom={centroid.zoom}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {validZones.map(zone => {
            const style = scoreToColor(zone.composite_score);
            const radius = scoreToRadius(zone.composite_score);
            const yieldLabel = zone.rental_yield != null
              ? `${Number(zone.rental_yield).toFixed(1)}% yield`
              : '';

            return (
              <CircleMarker
                key={zone.area_id}
                center={[zone.lat, zone.lng]}
                radius={radius}
                pathOptions={style}
                eventHandlers={
                  onAreaClick
                    ? { click: () => onAreaClick(zone.area_id, zone.area_name) }
                    : {}
                }
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={0.92}>
                  <div style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.78rem' }}>
                    <strong>{zone.area_name}</strong>
                    <br />
                    <span style={{ color: '#666' }}>{zone.city_name}</span>
                    {yieldLabel && (
                      <>
                        <br />
                        <span style={{ color: '#C9A96E', fontWeight: 600 }}>{yieldLabel}</span>
                      </>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
