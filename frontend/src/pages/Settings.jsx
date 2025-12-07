import React, { useEffect, useMemo, useState } from 'react';
import './styles/settings.css';
import { useSettings } from '../context/SettingsContext';
// Subtle status pill
function StatusPill({ type, message }) {
  if (!type || !message) return null;
  return <span className={`status-pill ${type}`}>{message}</span>;
}

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();

  // Core preferences
  const [theme, setTheme] = useState(settings.theme || 'light');
  const [currency, setCurrency] = useState(settings.currency || 'ZAR');
  const [compactMode, setCompactMode] = useState(Boolean(settings.compactMode));
  const [defaultLanding, setDefaultLanding] = useState(settings.defaultLanding || '/');

  // Profile
  const [displayName, setDisplayName] = useState(settings.displayName || '');
  const [emailVisibility, setEmailVisibility] = useState(settings.emailVisibility || 'private');

  // Notifications (granular toggles)
  const [notifyMarketing, setNotifyMarketing] = useState(settings.notifications?.marketing || false);
  const [notifyProduct, setNotifyProduct] = useState(settings.notifications?.product !== false); // default true
  const [notifyMarketAlerts, setNotifyMarketAlerts] = useState(settings.notifications?.marketAlerts !== false); // default true

  // Privacy
  const [showLocation, setShowLocation] = useState(settings.privacy?.showLocation || false);
  const [shareAnalytics, setShareAnalytics] = useState(settings.privacy?.shareAnalytics || false);

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('theme-dark'); else root.classList.remove('theme-dark');
  }, [theme]);

  const pricePreview = useMemo(() => {
    const sample = 3250000;
    if (currency === 'ZAR') {
      return compactMode ? `R${(sample / 1_000_000).toFixed(1)}M` : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(sample);
    }
    try { return new Intl.NumberFormat('en', { style: 'currency', currency }).format(sample); } catch { return `${currency} ${sample.toLocaleString()}`; }
  }, [currency, compactMode]);

  const savePreferences = () => {
    setSaving(true);
    updateSettings({
      theme,
      currency,
      compactMode,
      defaultLanding,
      displayName,
      emailVisibility,
      notifications: {
        marketing: notifyMarketing,
        product: notifyProduct,
        marketAlerts: notifyMarketAlerts
      },
      privacy: {
        showLocation,
        shareAnalytics
      }
    });
    setTimeout(() => {
      setSaving(false);
      setStatus({ type: 'success', message: 'Preferences saved' });
      setTimeout(() => setStatus({ type: null, message: '' }), 1600);
    }, 300);
  };

  const resetAll = () => {
    resetSettings();
    setTheme('light'); setCurrency('ZAR'); setCompactMode(false); setDefaultLanding('/');
    setDisplayName(''); setEmailVisibility('private');
    setNotifyMarketing(false); setNotifyProduct(true); setNotifyMarketAlerts(true);
    setShowLocation(false); setShareAnalytics(false);
    setStatus({ type: 'neutral', message: 'Defaults restored' });
    setTimeout(() => setStatus({ type: null, message: '' }), 1400);
  };

  const clearLocalPrefs = () => {
    ['digitalEstateSettings','exploreFilters','selectedArea','selectedCity','selectedProvince','selectedCountry']
      .forEach(k => localStorage.removeItem(k));
    setStatus({ type: 'success', message: 'Local data cleared' });
    setTimeout(() => setStatus({ type: null, message: '' }), 1400);
  };

  return (
    <div className="settings-wrapper">
      <header className="settings-page-header">
        <div className="head-block">
          <h1 className="page-title">Your Settings</h1>
          <p className="page-subtitle">Control how DigitalEstate looks and communicates with you. All preferences are stored locally.</p>
        </div>
        <div className="status-line"><StatusPill type={status.type} message={status.message} /></div>
      </header>

      <div className="settings-layout">
        <main className="settings-panels" aria-label="User settings panels">
          {/* Profile */}
          <section className="settings-panel" aria-labelledby="panel-profile">
            <h2 id="panel-profile">Profile</h2>
            <div className="form-row stack">
              <label htmlFor="display-name">Display name</label>
              <input id="display-name" type="text" placeholder="Your name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              <div className="hint">Used in personalized greetings and saved preferences.</div>
            </div>
            <div className="form-row">
              <label htmlFor="email-visibility">Email visibility</label>
              <select id="email-visibility" value={emailVisibility} onChange={e => setEmailVisibility(e.target.value)}>
                <option value="private">Private</option>
                <option value="team">Team</option>
                <option value="public">Public</option>
              </select>
            </div>
          </section>

          {/* Appearance & Display */}
          <section className="settings-panel" aria-labelledby="panel-appearance">
            <h2 id="panel-appearance">Appearance & Display</h2>
            <div className="form-row">
              <label htmlFor="theme-select">Theme</label>
              <select id="theme-select" value={theme} onChange={e => setTheme(e.target.value)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="currency-select">Currency</label>
              <select id="currency-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="ZAR">ZAR (R)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
              <div className="hint">Preview: {pricePreview}</div>
            </div>
            <div className="form-row">
              <label htmlFor="landing-select">Default landing</label>
              <select id="landing-select" value={defaultLanding} onChange={e => setDefaultLanding(e.target.value)}>
                <option value="/">Dashboard</option>
                <option value="/explore">Explore</option>
                <option value="/insights">Insights</option>
              </select>
            </div>
            <div className="form-row inline-toggle">
              <label htmlFor="compact-toggle">Compact number format</label>
              <input id="compact-toggle" type="checkbox" checked={compactMode} onChange={e => setCompactMode(e.target.checked)} />
            </div>
          </section>

          {/* Notifications */}
          <section className="settings-panel" aria-labelledby="panel-notifications">
            <h2 id="panel-notifications">Notifications</h2>
            <div className="form-row inline-toggle">
              <label htmlFor="notify-product">Product updates</label>
              <input id="notify-product" type="checkbox" checked={notifyProduct} onChange={e => setNotifyProduct(e.target.checked)} />
            </div>
            <div className="form-row inline-toggle">
              <label htmlFor="notify-market-alerts">Market alerts</label>
              <input id="notify-market-alerts" type="checkbox" checked={notifyMarketAlerts} onChange={e => setNotifyMarketAlerts(e.target.checked)} />
            </div>
            <div className="form-row inline-toggle">
              <label htmlFor="notify-marketing">Marketing emails</label>
              <input id="notify-marketing" type="checkbox" checked={notifyMarketing} onChange={e => setNotifyMarketing(e.target.checked)} />
            </div>
            <div className="hint" style={{ paddingTop: 4 }}>You can opt out of marketing any time. Market alerts highlight significant area trends.</div>
          </section>

          {/* Privacy */}
          <section className="settings-panel" aria-labelledby="panel-privacy">
            <h2 id="panel-privacy">Privacy & Data</h2>
            <div className="form-row inline-toggle">
              <label htmlFor="show-location">Show approximate location</label>
              <input id="show-location" type="checkbox" checked={showLocation} onChange={e => setShowLocation(e.target.checked)} />
            </div>
            <div className="form-row inline-toggle">
              <label htmlFor="share-analytics">Share anonymous usage analytics</label>
              <input id="share-analytics" type="checkbox" checked={shareAnalytics} onChange={e => setShareAnalytics(e.target.checked)} />
            </div>
            <div className="form-row buttons-row">
              <button type="button" className="btn-outline" onClick={clearLocalPrefs}>Clear local data</button>
              <button type="button" className="btn-outline" onClick={resetAll}>Restore defaults</button>
            </div>
          </section>

          {/* Actions */}
          <div className="settings-actions-bar">
            <button type="button" className="btn-outline" onClick={resetAll}>Reset</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={savePreferences}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </main>

        <aside className="settings-aside" aria-label="Reference info">
          <div className="info-card">
            <h3>Summary</h3>
            <dl>
              <div className="meta-line"><dt>Name</dt><dd>{displayName || '—'}</dd></div>
              <div className="meta-line"><dt>Theme</dt><dd>{theme}</dd></div>
              <div className="meta-line"><dt>Landing</dt><dd>{defaultLanding.replace('/', '') || 'dashboard'}</dd></div>
              <div className="meta-line"><dt>Currency</dt><dd>{currency}</dd></div>
              <div className="meta-line"><dt>Compact</dt><dd>{compactMode ? 'Yes' : 'No'}</dd></div>
            </dl>
            <div className="hint" style={{ paddingTop: 6 }}>Preferences stay on this device.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
