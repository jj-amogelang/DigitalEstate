import React, { useEffect, useMemo, useRef, useState } from 'react';
import areaDataService from '../services/areaDataService';
import '../components/styles/DropdownFix.css';
import '../components/styles/PropertiesAWS.css';
import '../components/styles/AWSComponents.css';
import './styles/explore-page.css';
import './styles/insights-charts.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import AreaHeatmap from '../components/AreaHeatmap';
import CentreOfGravity from '../components/CentreOfGravity';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend);

// Property Insights page rebuilt to follow the global theme and reuse the Explore dropdown feature
export default function ResearchDashboard() {
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [allProvinces, setAllProvinces] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [allAreas, setAllAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [priceSeries, setPriceSeries] = useState({});
  const [cogModalOpen, setCogModalOpen] = useState(false);

  // Theme helpers: read CSS variables defined by the dashboard theme
  const getCssVar = (name, fallback) => {
    if (typeof window === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  };

  const hexToRgba = (hex, alpha = 1) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const theme = useMemo(() => ({
    orange: getCssVar('--aws-orange', '#ff9900'),
    blue: getCssVar('--aws-blue', '#0073bb'),
    navy: getCssVar('--aws-navy', '#0b1f3b'),
    white: getCssVar('--aws-white', '#ffffff'),
    darkGrey: getCssVar('--aws-dark-grey', '#111827'),
    textGrey: getCssVar('--aws-text-grey', '#6b7280'),
    borderGrey: getCssVar('--aws-border-grey', 'rgba(0,0,0,0.08)')
  }), []);

  // (Matrix heatmap helpers removed after switching to Leaflet-based map)

  // Memoized chart data to avoid undefined structures during renders
  const pieData = useMemo(() => {
    const labels = Array.isArray(typeDistribution)
      ? typeDistribution.map(d => (d?.type ? String(d.type).toUpperCase() : 'Unknown'))
      : [];
    const data = Array.isArray(typeDistribution)
      ? typeDistribution.map(d => Number(d?.count ?? d?.value ?? 0))
      : [];
    // Ensure Chart.js always gets minimally valid arrays
    return {
      labels: labels.length ? labels : ['N/A'],
      datasets: [{
        label: 'Count',
        data: data.length ? data : [0],
        backgroundColor: [
          theme.orange,
          theme.blue,
          hexToRgba(theme.navy, 0.8),
          hexToRgba(theme.darkGrey, 0.5)
        ],
        borderColor: theme.white,
        borderWidth: 1
      }]
    };
  }, [typeDistribution, theme]);

  const barData = useMemo(() => {
    const types = ['residential', 'commercial', 'industrial', 'retail'];
    const yearSet = new Set();
    types.forEach(t => {
      const arr = Array.isArray(priceSeries?.[t]) ? priceSeries[t] : [];
      arr.forEach(pt => {
        const y = (pt?.date || '').slice(0, 4);
        if (y) yearSet.add(y);
      });
    });
    const labels = Array.from(yearSet).sort();
    const palette = {
      residential: 'rgba(17,17,17,0.85)',
      commercial: 'rgba(0,0,0,0.65)',
      industrial: 'rgba(0,0,0,0.45)',
      retail: 'rgba(0,0,0,0.25)'
    };
    const datasets = types.map(t => {
      const arr = Array.isArray(priceSeries?.[t]) ? priceSeries[t] : [];
      return {
        label: t.toUpperCase(),
        backgroundColor: palette[t],
        borderRadius: 6,
        data: (labels.length ? labels : ['']).map(y => {
          const item = arr.find(pt => (pt?.date || '').startsWith(y));
          return item ? Number(item.value || 0) : 0;
        })
      };
    });
    // Ensure minimally valid structure
    return {
      labels: labels.length ? labels : [''],
      datasets
    };
  }, [priceSeries]);

  // Common year labels for per-type charts
  const yearsLabels = useMemo(() => {
    const types = ['residential', 'commercial', 'industrial', 'retail'];
    const yearSet = new Set();
    types.forEach(t => {
      const arr = Array.isArray(priceSeries?.[t]) ? priceSeries[t] : [];
      arr.forEach(pt => {
        const y = (pt?.date || '').slice(0, 4);
        if (y) yearSet.add(y);
      });
    });
    const labels = Array.from(yearSet).sort();
    return labels.length ? labels : [''];
  }, [priceSeries]);

  const buildTypeBarData = (type) => {
    const palette = {
      residential: 'rgba(17,17,17,0.85)',
      commercial: 'rgba(0,0,0,0.65)',
      industrial: 'rgba(0,0,0,0.45)',
      retail: 'rgba(0,0,0,0.25)'
    };
    const arr = Array.isArray(priceSeries?.[type]) ? priceSeries[type] : [];
    const data = yearsLabels.map(y => {
      const item = arr.find(pt => (pt?.date || '').startsWith(y));
      return item ? Number(item.value || 0) : 0;
    });
    return {
      labels: yearsLabels,
      datasets: [{
        label: type.toUpperCase(),
        backgroundColor: palette[type],
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 6,
        data
      }]
    };
  };

  // (Matrix heatmap dataset removed)

  // Line chart data for price trends over time
  const lineChartData = useMemo(() => {
    const types = ['residential', 'commercial', 'industrial', 'retail'];
    const yearSet = new Set();
    types.forEach(t => {
      const arr = Array.isArray(priceSeries?.[t]) ? priceSeries[t] : [];
      arr.forEach(pt => {
        const y = (pt?.date || '').slice(0, 4);
        if (y) yearSet.add(y);
      });
    });
    const years = Array.from(yearSet).sort();
    
    return years.map(year => {
      const dataPoint = { year };
      types.forEach(type => {
        const arr = Array.isArray(priceSeries?.[type]) ? priceSeries[type] : [];
        const item = arr.find(pt => (pt?.date || '').startsWith(year));
        dataPoint[type] = item ? Number(item.value || 0) : 0;
      });
      return dataPoint;
    });
  }, [priceSeries]);

  // Stacked bar data (years on X, stacked types per year)
  const stackedBarData = useMemo(() => {
    const order = ['residential', 'commercial', 'retail', 'industrial'];
    const palette = {
      residential: theme.orange,
      commercial: theme.blue,
      retail: hexToRgba(theme.navy, 0.8),
      industrial: hexToRgba(theme.darkGrey, 0.45)
    };
    const datasets = order.map(t => {
      const arr = Array.isArray(priceSeries?.[t]) ? priceSeries[t] : [];
      const data = yearsLabels.map(y => {
        const item = arr.find(pt => (pt?.date || '').startsWith(y));
        return item ? Number(item.value || 0) : 0;
      });
      return {
        label: t.charAt(0).toUpperCase() + t.slice(1),
        backgroundColor: palette[t],
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: false,
        data
      };
    });
    return { labels: yearsLabels, datasets };
  }, [priceSeries, yearsLabels, theme]);

  const prevCountryRef = useRef('');
  const prevProvinceRef = useRef('');
  const prevCityRef = useRef('');

  const [selected, setSelected] = useState({
    country: '',
    province: '',
    city: '',
    area: '',
    areaName: ''
  });
  const [selectedPropertyType, setSelectedPropertyType] = useState(() => {
    if (typeof window === 'undefined') return '';
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('type') || '';
  });

  const handleFindCentreOfGravity = () => {
    if (!selected.area || !selected.areaName) {
      alert('Please select an area first');
      return;
    }
    setCogModalOpen(true);
  };


  useEffect(() => {
    document.title = 'Property Insights - Digital Estate';
  }, []);

  // Initial loads
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [countriesData, plist, clist, alist] = await Promise.all([
          areaDataService.getCountries().catch(() => []),
          areaDataService.listAllProvinces().catch(() => []),
          areaDataService.listAllCities().catch(() => []),
          areaDataService.listAllAreas().catch(() => [])
        ]);
        setCountries(countriesData || []);
        setAllProvinces(plist || []);
        setAllCities(clist || []);
        setAllAreas(alist || []);
        
        // Auto-select South Africa
        const southAfrica = countriesData?.find(c => c.name === 'South Africa');
        if (southAfrica && !selected.country) {
          setSelected(prev => ({ ...prev, country: southAfrica.id }));
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Country -> Provinces
  useEffect(() => {
    if (!selected.country) return;
    const load = async () => {
      try {
        const provincesData = await areaDataService.getProvinces(selected.country);
        setProvinces(provincesData || []);
      } catch (e) {
        setProvinces([]);
      }
      if (prevCountryRef.current && prevCountryRef.current !== selected.country) {
        setSelected((p) => ({ ...p, province: '', city: '', area: '', areaName: '' }));
        setCities([]);
        setAreas([]);
      }
      prevCountryRef.current = selected.country;
    };
    load();
  }, [selected.country]);

  // Province -> Cities
  useEffect(() => {
    if (!selected.province) return;
    const load = async () => {
      try {
        const citiesData = await areaDataService.getCities(selected.province);
        setCities(citiesData || []);
      } catch (e) {
        setCities([]);
      }
      if (prevProvinceRef.current && prevProvinceRef.current !== selected.province) {
        setSelected((p) => ({ ...p, city: '', area: '', areaName: '' }));
        setAreas([]);
      }
      prevProvinceRef.current = selected.province;
    };
    load();
  }, [selected.province]);

  // City -> Areas
  useEffect(() => {
    if (!selected.city) return;
    const load = async () => {
      try {
        const areasData = await areaDataService.getAreas(selected.city);
        setAreas(areasData || []);
      } catch (e) {
        setAreas([]);
      }
      if (prevCityRef.current && prevCityRef.current !== selected.city) {
        setSelected((p) => ({ ...p, area: '', areaName: '' }));
      }
      prevCityRef.current = selected.city;
    };
    load();
  }, [selected.city]);

  // Load charts data when area selected
  useEffect(() => {
    if (!selected.area) return;
    const load = async () => {
      try {
        setChartsLoading(true);
        const [dist, series] = await Promise.all([
          areaDataService.getAreaTypeDistribution(selected.area),
          areaDataService.getAreaTypePriceSeries(selected.area, 10)
        ]);
        setTypeDistribution(dist || []);
        setPriceSeries(series || {});
      } finally {
        setChartsLoading(false);
      }
    };
    load();
  }, [selected.area]);

  return (
    <div className="properties-page-modern">
      {/* Hero Section */}
      <div className="hero-section-premium">
        <div className="hero-overlay"></div>
        <div className="hero-content-premium">
          <div className="hero-text-premium">
            <h1 className="hero-title-premium">
              Property <span className="hero-accent">Insights</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="properties-header-modern">
        <div className="header-content-modern">
          <div className="page-title-row">
            <h2 className="page-title-modern" style={{margin:0}}>Analyze Market Trends</h2>
          </div>
          <p className="page-subtitle-modern">
            Deep dive into property distributions, pricing trends, and strategic location analysis
          </p>
        </div>
      </div>

      <div className="filters-section-modern">
        <div className="filters-container-modern">
          <div className="filters-toolbar" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 className="filters-title-modern" style={{margin:0}}>Select Location</h2>
            <div className="toolbar-actions" style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
              {/* Moved Refresh Metrics here visually aligned */}
              <button className="toolbar-refresh" onClick={async()=>{
                try {
                  setChartsLoading(true);
                  const res = await areaDataService.refreshMaterializedViews();
                  // Optional lightweight notification through console or inline toast
                  console.log('Materialized views refreshed:', res);
                } catch (e) {
                  console.error('Refresh failed', e);
                } finally {
                  setChartsLoading(false);
                }
              }} title="Refresh metrics">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v-3l4 4-4 4V8a5 5 0 105 5h2a7 7 0 11-7-7z" fill="currentColor"/></svg>
                <span style={{marginLeft:6}}>{chartsLoading ? 'Refreshing…' : 'Refresh Metrics'}</span>
              </button>
            </div>
          </div>

          <div className="location-selectors-modern">
            <div className="selector-item-modern">
              <label className="selector-label-modern">Country</label>
              <div className="selector-wrapper-modern">
                <select
                  className="selector-input-modern"
                  value={selected.country}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                >
                  <option value="">South Africa</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="selector-item-modern">
              <label className="selector-label-modern">Province</label>
              <div className="selector-wrapper-modern">
                <select
                  className="selector-input-modern"
                  value={selected.province}
                  onChange={(e) => setSelected((p) => ({ ...p, province: e.target.value }))}
                  disabled={!selected.country}
                >
                  <option value="">Select Province</option>
                  {(selected.country ? provinces : allProvinces).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="selector-item-modern">
              <label className="selector-label-modern">City</label>
              <div className="selector-wrapper-modern">
                <select
                  className="selector-input-modern"
                  value={selected.city}
                  onChange={(e) => setSelected((p) => ({ ...p, city: e.target.value }))}
                  disabled={!selected.province}
                >
                  <option value="">Select City</option>
                  {(selected.province ? cities : allCities).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="selector-item-modern">
              <label className="selector-label-modern">Area</label>
              <div className="selector-wrapper-modern">
                <select
                  className="selector-input-modern"
                  value={selected.area}
                  onChange={(e) => {
                    const val = e.target.value;
                    const areaObj = areas.find((a) => String(a.id) === String(val))
                      || allAreas.find((a) => String(a.id) === String(val));
                    setSelected((p) => ({ ...p, area: val, areaName: areaObj?.name || '' }));
                  }}
                  disabled={!selected.city}
                >
                  <option value="">Select Area</option>
                  {(selected.city ? areas : allAreas).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="selector-item-modern">
              <label className="selector-label-modern">Property Type</label>
              <div className="property-type-buttons">
                <button
                  className={`property-type-btn ${selectedPropertyType === 'residential' ? 'active' : ''}`}
                  onClick={() => setSelectedPropertyType('residential')}
                >
                  Residential
                </button>
                <button
                  className={`property-type-btn ${selectedPropertyType === 'commercial' ? 'active' : ''}`}
                  onClick={() => setSelectedPropertyType('commercial')}
                >
                  Commercial
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {selected.area && (
        <div className="insights-charts-section aws-themed-charts">
          {/* Page Header with Centre of Gravity Button */}
          <div className="insights-header-row">
            <div className="insights-header-text">
              <h2 className="insights-page-title">Property Insights for {selected.areaName}</h2>
              <p className="insights-page-subtitle">Comprehensive analysis of property types, pricing, and trends</p>
            </div>
            <button 
              className="btn-professional btn-primary-professional gravity-button"
              onClick={handleFindCentreOfGravity}
              title="Calculate the geographic center weighted by property distribution"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Find Centre of Gravity
            </button>
          </div>

          {/* Row 1: Pie Chart (Property Type Distribution) */}
          <div className="insights-card">
            <h3 className="chart-title">Property Type Distribution</h3>
            <p className="chart-subtitle">Distribution of property types in {selected.areaName}</p>
            {chartsLoading ? (
              <div className="insights-loading"><div className="loading-spinner-modern"></div></div>
            ) : (
              <div className="chart-canvas-wrap chart-medium">
                <Doughnut 
                  data={pieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: { 
                          boxWidth: 12, 
                          boxHeight: 12, 
                          padding: 15, 
                          color: theme.darkGrey, 
                          font: { size: 12, family: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' },
                          usePointStyle: true
                        }
                      },
                      tooltip: {
                        backgroundColor: theme.darkGrey,
                        titleColor: theme.white,
                        bodyColor: theme.white,
                        callbacks: {
                          label: (ctx) => `${ctx.label}: ${ctx.raw} properties`
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Row 2: Bar Chart (Average Price by Property Type) */}
          <div className="insights-card">
            <h3 className="chart-title">Average Property Price by Type</h3>
            <p className="chart-subtitle">Compare average prices across different property categories</p>
            {chartsLoading ? (
              <div className="insights-loading"><div className="loading-spinner-modern"></div></div>
            ) : (
              <div className="chart-canvas-wrap bar-chart">
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: theme.borderGrey, borderDash: [3, 3] },
                        border: { display: false },
                        ticks: { 
                          color: theme.darkGrey, 
                          callback: (v) => `R${Number(v).toLocaleString()}`, 
                          font: { size: 11 } 
                        }
                      },
                      x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: theme.textGrey, font: { size: 11 } }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: { 
                          color: theme.darkGrey, 
                          usePointStyle: true, 
                          pointStyle: 'rectRounded', 
                          boxWidth: 10, 
                          boxHeight: 10, 
                          padding: 12 
                        }
                      },
                      tooltip: {
                        backgroundColor: theme.darkGrey,
                        titleColor: theme.white,
                        bodyColor: theme.white,
                        callbacks: {
                          label: (ctx) => `${ctx.dataset.label}: R${Number(ctx.raw || 0).toLocaleString()}`
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Row 3: Line Chart (Price Trends Over 5-10 Years) */}
          <div className="insights-card">
            <h3 className="chart-title">Price Trends Over Time</h3>
            <p className="chart-subtitle">Historical price trends across all property types (5-10 years)</p>
            {chartsLoading ? (
              <div className="insights-loading"><div className="loading-spinner-modern"></div></div>
            ) : (
              <div className="chart-canvas-wrap line-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.borderGrey} />
                    <XAxis 
                      dataKey="year" 
                      stroke={theme.textGrey}
                      style={{ fontSize: '11px', fill: theme.textGrey }}
                    />
                    <YAxis 
                      stroke={theme.darkGrey}
                      style={{ fontSize: '11px', fill: theme.darkGrey }}
                      tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme.darkGrey, 
                        border: 'none', 
                        borderRadius: '6px',
                        color: theme.white
                      }}
                      formatter={(value, name) => [`R${Number(value).toLocaleString()}`, name.toUpperCase()]}
                    />
                    <RechartsLegend 
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      formatter={(value) => value.toUpperCase()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="residential" 
                      stroke="rgba(17,17,17,0.85)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="commercial" 
                      stroke="rgba(0,0,0,0.65)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="industrial" 
                      stroke="rgba(0,0,0,0.45)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="retail" 
                      stroke="rgba(0,0,0,0.25)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-indicator-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading…</span>
        </div>
      )}

      {/* Centre of Gravity Modal */}
      <CentreOfGravity
        isOpen={cogModalOpen}
        onClose={() => setCogModalOpen(false)}
        areaId={selected.area}
        areaName={selected.areaName}
      />


    </div>
  );
}
