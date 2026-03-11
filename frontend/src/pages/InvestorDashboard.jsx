import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import {
  BookmarkCheck,
  Target,
  Bell,
  BellRing,
  Trash2,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  LayoutDashboard,
  Loader,
} from 'lucide-react';
import areaDataService from '../services/areaDataService';
import './investor-dashboard.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const METRIC_LABELS = {
  yield_pct:     'Rental Yield %',
  vacancy_rate:  'Vacancy Rate %',
  crime_index:   'Crime Index',
  price_per_sqm: 'Price / m²',
};

const METRIC_ICONS = {
  yield_pct:     <TrendingUp  size={14} />,
  vacancy_rate:  <TrendingDown size={14} />,
  crime_index:   <AlertTriangle size={14} />,
  price_per_sqm: <TrendingUp  size={14} />,
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

function ScoreBadge({ score }) {
  if (score == null) return null;
  const cls =
    score >= 75 ? 'badge-green' :
    score >= 50 ? 'badge-gold'  : 'badge-red';
  return <span className={`score-badge ${cls}`}>{score.toFixed(1)}</span>;
}

// ---------------------------------------------------------------------------
// Widget: Saved CoG Runs
// ---------------------------------------------------------------------------
function SavedRunsWidget({ runs, onDelete, onRefresh }) {
  return (
    <section className="dash-widget">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <Target size={18} />
          <span>Saved CoG Targets</span>
          <span className="dash-count">{runs.length}</span>
        </div>
        <button className="dash-icon-btn" onClick={onRefresh} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="dash-empty">
          <Target size={32} className="dash-empty-icon" />
          <p>No saved targets yet.</p>
          <p className="dash-empty-sub">Solve a CoG model and click Save.</p>
        </div>
      ) : (
        <ul className="dash-card-list">
          {runs.map(run => (
            <SavedRunCard key={run.run_id} run={run} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SavedRunCard({ run, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const r   = run.result || {};
  const lat  = r.lat  ?? r.latitude  ?? null;
  const lng  = r.lng  ?? r.longitude ?? r.lon ?? null;
  const hasCoords = lat != null && lng != null;

  return (
    <li className="dash-card" onClick={() => setExpanded(e => !e)}>
      <div className="dash-card-top">
        <div className="dash-card-info">
          <span className="dash-card-name">{run.name}</span>
          <span className="dash-card-sub">{run.area_name} · {fmtDate(run.saved_at)}</span>
        </div>
        {r.composite_score != null && <ScoreBadge score={r.composite_score} />}
        <button
          className="dash-icon-btn dash-delete-btn"
          onClick={e => { e.stopPropagation(); onDelete(run.run_id); }}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="dash-card-body">
          {hasCoords && (
            <div className="dash-mini-map-wrap">
              <MapContainer
                center={[lat, lng]}
                zoom={13}
                style={{ height: '130px', width: '100%', borderRadius: '6px' }}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <CircleMarker
                  center={[lat, lng]}
                  radius={10}
                  pathOptions={{ color: '#C9A96E', fillColor: '#C9A96E', fillOpacity: 0.7 }}
                >
                  <Tooltip permanent direction="top" offset={[0, -12]}>
                    {run.area_name}
                  </Tooltip>
                </CircleMarker>
              </MapContainer>
            </div>
          )}
          <div className="dash-result-grid">
            {r.composite_score  != null && <StatCell label="Composite score"  value={r.composite_score?.toFixed(1)} />}
            {r.rental_yield     != null && <StatCell label="Rental yield"      value={`${r.rental_yield?.toFixed(2)}%`} />}
            {r.vacancy_rate     != null && <StatCell label="Vacancy rate"      value={`${r.vacancy_rate?.toFixed(1)}%`} />}
            {r.price_per_sqm    != null && <StatCell label="Price / m²"        value={`R${r.price_per_sqm?.toLocaleString()}`} />}
          </div>
        </div>
      )}
    </li>
  );
}

function StatCell({ label, value }) {
  return (
    <div className="stat-cell">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? '—'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget: Bookmarked Areas
// ---------------------------------------------------------------------------
function BookmarksWidget({ bookmarks, onRemove, onRefresh }) {
  return (
    <section className="dash-widget">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <BookmarkCheck size={18} />
          <span>Bookmarked Areas</span>
          <span className="dash-count">{bookmarks.length}</span>
        </div>
        <button className="dash-icon-btn" onClick={onRefresh} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="dash-empty">
          <BookmarkCheck size={32} className="dash-empty-icon" />
          <p>No bookmarks yet.</p>
          <p className="dash-empty-sub">Use the map to bookmark an area of interest.</p>
        </div>
      ) : (
        <ul className="dash-card-list">
          {bookmarks.map(bm => (
            <li key={bm.area_id} className="dash-card dash-card--row">
              <div className="dash-card-info">
                <span className="dash-card-name">{bm.area_name}</span>
                <span className="dash-card-sub">{bm.city || 'Unknown city'} · {fmtDate(bm.bookmarked_at)}</span>
              </div>
              <button
                className="dash-icon-btn dash-delete-btn"
                onClick={() => onRemove(bm.area_id)}
                title="Remove bookmark"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Widget: Alerts
// ---------------------------------------------------------------------------
const DEFAULT_ALERT_FORM = {
  area_id:   '',
  area_name: '',
  metric:    'yield_pct',
  condition: 'below',
  threshold: '',
};

function AlertsWidget({ alerts, onDelete, onRefresh, onAdd, onCheck }) {
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(DEFAULT_ALERT_FORM);
  const [saving,   setSaving]   = useState(false);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.threshold) return;
    setSaving(true);
    await onAdd({ ...form, threshold: parseFloat(form.threshold) });
    setForm(DEFAULT_ALERT_FORM);
    setShowForm(false);
    setSaving(false);
  };

  const handleCheck = async () => {
    setChecking(true);
    await onCheck();
    setChecking(false);
  };

  const triggered = alerts.filter(a => a.triggered);

  return (
    <section className="dash-widget">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <Bell size={18} />
          <span>Alerts</span>
          {triggered.length > 0 && (
            <span className="dash-count dash-count--alert">{triggered.length} fired</span>
          )}
        </div>
        <div className="dash-widget-actions">
          <button className="dash-icon-btn" onClick={handleCheck} title="Run check now" disabled={checking}>
            {checking ? <Loader size={15} className="spin" /> : <RefreshCw size={15} />}
          </button>
          <button className="dash-icon-btn dash-add-btn" onClick={() => setShowForm(s => !s)} title="Add alert">
            <Plus size={15} />
          </button>
        </div>
      </div>

      {showForm && (
        <form className="alert-form" onSubmit={handleSubmit}>
          <div className="alert-form-row">
            <input
              className="dash-input"
              placeholder="Area name"
              value={form.area_name}
              onChange={e => setForm(f => ({ ...f, area_name: e.target.value }))}
              required
            />
            <input
              className="dash-input"
              placeholder="Area ID (optional)"
              value={form.area_id}
              onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}
            />
          </div>
          <div className="alert-form-row">
            <select
              className="dash-select"
              value={form.metric}
              onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
            >
              {Object.entries(METRIC_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              className="dash-select"
              value={form.condition}
              onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
            >
              <option value="above">rises above</option>
              <option value="below">falls below</option>
            </select>
            <input
              className="dash-input dash-input--narrow"
              type="number"
              step="any"
              placeholder="Threshold"
              value={form.threshold}
              onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
              required
            />
          </div>
          <div className="alert-form-footer">
            <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create Alert'}
            </button>
            <button type="button" className="dash-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {alerts.length === 0 ? (
        <div className="dash-empty">
          <Bell size={32} className="dash-empty-icon" />
          <p>No alerts configured.</p>
          <p className="dash-empty-sub">Click + to watch a metric.</p>
        </div>
      ) : (
        <ul className="dash-card-list">
          {alerts.map(alert => (
            <li key={alert.alert_id} className={`dash-card dash-card--row ${alert.triggered ? 'dash-card--triggered' : ''}`}>
              <div className="alert-icon-col">
                {alert.triggered
                  ? <BellRing size={16} className="alert-icon alert-icon--fired" />
                  : <Bell     size={16} className="alert-icon" />
                }
              </div>
              <div className="dash-card-info">
                <span className="dash-card-name">
                  {alert.area_name}
                  {' · '}
                  <span className="alert-metric-tag">
                    {METRIC_ICONS[alert.metric]}
                    {METRIC_LABELS[alert.metric]}
                  </span>
                  <span className="alert-cond">
                    {' '}{alert.condition === 'above' ? '↑ above' : '↓ below'}{' '}
                    <strong>{alert.threshold}</strong>
                  </span>
                </span>
                <span className="dash-card-sub">
                  {alert.triggered
                    ? <><CheckCircle size={11} />{' '}Fired {fmtDate(alert.triggered_at)}</>
                    : <>Watching · checked {fmtDate(alert.last_checked)}</>
                  }
                </span>
              </div>
              <button
                className="dash-icon-btn dash-delete-btn"
                onClick={() => onDelete(alert.alert_id)}
                title="Delete alert"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------
function SummaryBar({ summary, loading }) {
  if (loading) return null;
  const cards = [
    { label: 'Saved runs',      value: summary.saved_runs_count       ?? 0, icon: <Target       size={20} /> },
    { label: 'Bookmarked areas',value: summary.bookmarked_areas_count ?? 0, icon: <BookmarkCheck size={20} /> },
    { label: 'Active alerts',   value: summary.alerts_count           ?? 0, icon: <Bell          size={20} /> },
    { label: 'Triggered',       value: summary.triggered_alerts       ?? 0, icon: <BellRing      size={20} />, warn: (summary.triggered_alerts ?? 0) > 0 },
  ];

  return (
    <div className="dash-summary-bar">
      {cards.map(c => (
        <div key={c.label} className={`dash-summary-card ${c.warn ? 'dash-summary-card--warn' : ''}`}>
          <div className="dash-summary-icon">{c.icon}</div>
          <div className="dash-summary-info">
            <span className="dash-summary-value">{c.value}</span>
            <span className="dash-summary-label">{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function InvestorDashboard() {
  const [summary,   setSummary]   = useState({});
  const [runs,      setRuns]      = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await areaDataService.getDashboardSummary();
      if (data) {
        setSummary(data.summary   || {});
        setRuns(data.saved_runs   || []);
        setBookmarks(data.bookmarked_areas || []);
        setAlerts(data.alerts     || []);
      } else {
        setError('Could not load dashboard data.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeleteRun = async id => {
    await areaDataService.deleteSavedRun(id);
    setRuns(prev => prev.filter(r => r.run_id !== id));
    setSummary(s => ({ ...s, saved_runs_count: (s.saved_runs_count || 1) - 1 }));
  };

  const handleRemoveBookmark = async id => {
    await areaDataService.removeBookmark(id);
    setBookmarks(prev => prev.filter(b => b.area_id !== id));
    setSummary(s => ({ ...s, bookmarked_areas_count: (s.bookmarked_areas_count || 1) - 1 }));
  };

  const handleAddAlert = async form => {
    const res = await areaDataService.createAlert(form);
    if (res?.entry) {
      setAlerts(prev => [...prev, res.entry]);
      setSummary(s => ({ ...s, alerts_count: (s.alerts_count || 0) + 1 }));
    }
  };

  const handleDeleteAlert = async id => {
    await areaDataService.deleteAlert(id);
    setAlerts(prev => prev.filter(a => a.alert_id !== id));
    setSummary(s => ({ ...s, alerts_count: (s.alerts_count || 1) - 1 }));
  };

  const handleCheckAlerts = async () => {
    const res = await areaDataService.checkAlerts();
    if (res?.alerts) {
      setAlerts(res.alerts);
      const triggered = res.alerts.filter(a => a.triggered).length;
      setSummary(s => ({ ...s, triggered_alerts: triggered }));
    }
  };

  return (
    <div className="investor-dashboard">
      {/* Page header */}
      <div className="dash-page-header">
        <div className="dash-page-title">
          <LayoutDashboard size={24} />
          <h1>Investor Dashboard</h1>
        </div>
        <button className="dash-btn dash-btn--outline" onClick={load} disabled={loading}>
          {loading ? <Loader size={15} className="spin" /> : <RefreshCw size={15} />}
          {loading ? 'Loading…' : 'Refresh all'}
        </button>
      </div>

      {error && (
        <div className="dash-error-banner">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="dash-loading">
          <Loader size={32} className="spin" />
          <p>Loading dashboard…</p>
        </div>
      ) : (
        <>
          <SummaryBar summary={summary} loading={loading} />

          <div className="dash-grid">
            <SavedRunsWidget
              runs={runs}
              onDelete={handleDeleteRun}
              onRefresh={load}
            />
            <BookmarksWidget
              bookmarks={bookmarks}
              onRemove={handleRemoveBookmark}
              onRefresh={load}
            />
            <AlertsWidget
              alerts={alerts}
              onDelete={handleDeleteAlert}
              onRefresh={load}
              onAdd={handleAddAlert}
              onCheck={handleCheckAlerts}
            />
          </div>
        </>
      )}
    </div>
  );
}
