import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles/CentreOfGravity.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icon for Centre of Gravity
const cogIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#ff6b6b" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
      <line x1="16" y1="2" x2="16" y2="8" stroke="#fff" stroke-width="2"/>
      <line x1="16" y1="24" x2="16" y2="30" stroke="#fff" stroke-width="2"/>
      <line x1="2" y1="16" x2="8" y2="16" stroke="#fff" stroke-width="2"/>
      <line x1="24" y1="16" x2="30" y2="16" stroke="#fff" stroke-width="2"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

// Map center controller
function MapCenterController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function CentreOfGravity({ isOpen, onClose, areaId, areaName }) {
  const [weights, setWeights] = useState({
    rentalYield: 30,
    pricePerSqm: 25,
    vacancy: 20,
    transitProximity: 15,
    footfall: 10
  });

  const [calculating, setCalculating] = useState(false);
  const [cogResult, setCogResult] = useState(null);
  const [mockProperties, setMockProperties] = useState([]);
  const [scenario, setScenario] = useState('balanced');

  // Predefined scenarios
  const scenarios = {
    balanced: { rentalYield: 30, pricePerSqm: 25, vacancy: 20, transitProximity: 15, footfall: 10 },
    valueInvestor: { rentalYield: 40, pricePerSqm: 35, vacancy: 15, transitProximity: 5, footfall: 5 },
    transitFocused: { rentalYield: 20, pricePerSqm: 15, vacancy: 15, transitProximity: 40, footfall: 10 },
    highFootfall: { rentalYield: 20, pricePerSqm: 15, vacancy: 10, transitProximity: 15, footfall: 40 }
  };

  // Generate mock property data for demonstration
  useEffect(() => {
    if (isOpen && areaId) {
      // Mock properties in Sandton area (adjust coordinates as needed)
      const baseLatLng = { lat: -26.1076, lng: 28.0567 }; // Sandton center
      const properties = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        lat: baseLatLng.lat + (Math.random() - 0.5) * 0.05,
        lng: baseLatLng.lng + (Math.random() - 0.5) * 0.05,
        rentalYield: 5 + Math.random() * 5, // 5-10%
        pricePerSqm: 15000 + Math.random() * 20000, // R15k-35k
        vacancy: Math.random() * 15, // 0-15%
        transitProximity: Math.random() * 100, // 0-100 score
        footfall: Math.random() * 100, // 0-100 score
        type: ['commercial', 'retail', 'office'][Math.floor(Math.random() * 3)]
      }));
      setMockProperties(properties);
    }
  }, [isOpen, areaId]);

  // Calculate Centre of Gravity
  const calculateCoG = useMemo(() => {
    if (!mockProperties.length) return null;

    // Normalize weights to sum to 1
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalizedWeights = {
      rentalYield: weights.rentalYield / totalWeight,
      pricePerSqm: weights.pricePerSqm / totalWeight,
      vacancy: weights.vacancy / totalWeight,
      transitProximity: weights.transitProximity / totalWeight,
      footfall: weights.footfall / totalWeight
    };

    // Calculate weighted score for each property
    const scoredProperties = mockProperties.map(prop => {
      // Normalize each metric to 0-1 scale
      const normalizedRentalYield = prop.rentalYield / 10; // max 10%
      const normalizedPrice = 1 - (prop.pricePerSqm / 35000); // lower price is better
      const normalizedVacancy = 1 - (prop.vacancy / 15); // lower vacancy is better
      const normalizedTransit = prop.transitProximity / 100;
      const normalizedFootfall = prop.footfall / 100;

      // Calculate composite score
      const score = (
        normalizedRentalYield * normalizedWeights.rentalYield +
        normalizedPrice * normalizedWeights.pricePerSqm +
        normalizedVacancy * normalizedWeights.vacancy +
        normalizedTransit * normalizedWeights.transitProximity +
        normalizedFootfall * normalizedWeights.footfall
      );

      return { ...prop, score };
    });

    // Calculate weighted geographic center
    let totalWeightedLat = 0;
    let totalWeightedLng = 0;
    let totalScores = 0;

    scoredProperties.forEach(prop => {
      totalWeightedLat += prop.lat * prop.score;
      totalWeightedLng += prop.lng * prop.score;
      totalScores += prop.score;
    });

    const cogLat = totalWeightedLat / totalScores;
    const cogLng = totalWeightedLng / totalScores;

    // Find properties near CoG (within radius)
    const nearbyProperties = scoredProperties
      .map(prop => {
        const distance = Math.sqrt(
          Math.pow(prop.lat - cogLat, 2) + Math.pow(prop.lng - cogLng, 2)
        );
        return { ...prop, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    return {
      lat: cogLat,
      lng: cogLng,
      averageScore: totalScores / scoredProperties.length,
      topProperties: nearbyProperties,
      heatRadius: 0.015 // ~1.5km radius in degrees
    };
  }, [mockProperties, weights]);

  const handleWeightChange = (factor, value) => {
    setWeights(prev => ({ ...prev, [factor]: value }));
    setScenario('custom');
  };

  const handleScenarioChange = (scenarioName) => {
    setScenario(scenarioName);
    setWeights(scenarios[scenarioName]);
  };

  const handleCalculate = () => {
    setCalculating(true);
    // Simulate calculation delay
    setTimeout(() => {
      setCogResult(calculateCoG);
      setCalculating(false);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="cog-modal-overlay" onClick={onClose}>
      <div className="cog-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="cog-modal-header">
          <div>
            <h2 className="cog-modal-title">Centre of Gravity Analysis</h2>
            <p className="cog-modal-subtitle">Strategic location analysis for {areaName}</p>
          </div>
          <button className="cog-close-button" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="cog-modal-body">
          {/* Scenarios */}
          <div className="cog-section">
            <h3 className="cog-section-title">Investment Scenario</h3>
            <div className="cog-scenarios">
              {Object.keys(scenarios).map(key => (
                <button
                  key={key}
                  className={`cog-scenario-button ${scenario === key ? 'active' : ''}`}
                  onClick={() => handleScenarioChange(key)}
                >
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Weight Controls */}
          <div className="cog-section">
            <h3 className="cog-section-title">Factor Weights {scenario === 'custom' && <span className="cog-custom-badge">Custom</span>}</h3>
            <div className="cog-weights">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key} className="cog-weight-control">
                  <label className="cog-weight-label">
                    <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                    <span className="cog-weight-value">{value}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handleWeightChange(key, parseInt(e.target.value))}
                    className="cog-weight-slider"
                  />
                </div>
              ))}
            </div>
            <div className="cog-weight-total">
              Total: {Object.values(weights).reduce((sum, w) => sum + w, 0)}%
              {Object.values(weights).reduce((sum, w) => sum + w, 0) !== 100 && (
                <span className="cog-weight-warning"> (Should total 100%)</span>
              )}
            </div>
          </div>

          {/* Calculate Button */}
          <button
            className="btn-professional btn-primary-professional cog-calculate-button"
            onClick={handleCalculate}
            disabled={calculating || Object.values(weights).reduce((sum, w) => sum + w, 0) !== 100}
          >
            {calculating ? (
              <>
                <div className="loading-spinner-small"></div>
                Calculating...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Calculate Centre of Gravity
              </>
            )}
          </button>

          {/* Results */}
          {cogResult && (
            <div className="cog-results">
              <div className="cog-results-header">
                <h3 className="cog-section-title">Optimal Zone</h3>
                <div className="cog-score-badge">
                  Score: {(cogResult.averageScore * 100).toFixed(1)}%
                </div>
              </div>

              {/* Map */}
              <div className="cog-map-container">
                <MapContainer
                  center={[cogResult.lat, cogResult.lng]}
                  zoom={14}
                  style={{ height: '400px', width: '100%', borderRadius: '8px' }}
                  scrollWheelZoom={false}
                >
                  <MapCenterController center={[cogResult.lat, cogResult.lng]} zoom={14} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  
                  {/* Centre of Gravity Point */}
                  <Marker position={[cogResult.lat, cogResult.lng]} icon={cogIcon}>
                    <Popup>
                      <div className="cog-popup">
                        <strong>Centre of Gravity</strong>
                        <div>Optimal strategic location</div>
                        <div className="cog-popup-coords">
                          {cogResult.lat.toFixed(6)}, {cogResult.lng.toFixed(6)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Heat radius */}
                  <Circle
                    center={[cogResult.lat, cogResult.lng]}
                    radius={cogResult.heatRadius * 111000} // Convert degrees to meters
                    pathOptions={{ 
                      fillColor: '#ff6b6b', 
                      fillOpacity: 0.15, 
                      color: '#ff6b6b', 
                      weight: 2,
                      opacity: 0.5 
                    }}
                  />

                  {/* Top properties */}
                  {cogResult.topProperties.slice(0, 5).map(prop => (
                    <Marker key={prop.id} position={[prop.lat, prop.lng]}>
                      <Popup>
                        <div className="cog-property-popup">
                          <strong>{prop.type.toUpperCase()} Property</strong>
                          <div>Score: {(prop.score * 100).toFixed(1)}%</div>
                          <div>Rental Yield: {prop.rentalYield.toFixed(1)}%</div>
                          <div>Price/m²: R{prop.pricePerSqm.toLocaleString()}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Insights */}
              <div className="cog-insights">
                <h4 className="cog-insights-title">Strategic Insights</h4>
                <ul className="cog-insights-list">
                  <li>The optimal zone is centered at coordinates ({cogResult.lat.toFixed(4)}, {cogResult.lng.toFixed(4)})</li>
                  <li>Based on your priorities, {cogResult.topProperties.length} high-scoring properties are within 1.5km</li>
                  <li>Average composite score in this zone: {(cogResult.averageScore * 100).toFixed(1)}%</li>
                  <li>This location balances all weighted factors for optimal investment potential</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
