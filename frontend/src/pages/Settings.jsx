import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import './Settings.css';

const Settings = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  const handleThemeChange = (theme) => {
    updateSettings({ theme });
  };

  const handleLanguageChange = (e) => {
    updateSettings({ language: e.target.value });
  };

  const handleNotificationToggle = (type) => {
    updateSettings({
      notifications: {
        ...settings.notifications,
        [type]: !settings.notifications[type]
      }
    });
  };

  const handleDisplayToggle = (type) => {
    updateSettings({
      display: {
        ...settings.display,
        [type]: !settings.display[type]
      }
    });
  };

  const handlePrivacyToggle = (type) => {
    updateSettings({
      privacy: {
        ...settings.privacy,
        [type]: !settings.privacy[type]
      }
    });
  };

  const handleCurrencyChange = (e) => {
    updateSettings({ currency: e.target.value });
  };

  const handleReset = () => {
    resetSettings();
    setShowResetConfirm(false);
  };

  const sections = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'display', label: 'Display', icon: '🎨' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' }
  ];

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Customize your property dashboard experience</p>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-label">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-main">
          {activeSection === 'general' && (
            <div className="settings-section">
              <h2>General Settings</h2>
              
              <div className="setting-group">
                <label>Theme</label>
                <div className="theme-selector">
                  <button
                    className={`theme-option light ${settings.theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <div className="theme-preview light-preview"></div>
                    <span>Light</span>
                  </button>
                  <button
                    className={`theme-option dark ${settings.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div className="theme-preview dark-preview"></div>
                    <span>Dark</span>
                  </button>
                  <button
                    className={`theme-option auto ${settings.theme === 'auto' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('auto')}
                  >
                    <div className="theme-preview auto-preview"></div>
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <label htmlFor="language">Language</label>
                <select
                  id="language"
                  value={settings.language}
                  onChange={handleLanguageChange}
                  className="setting-select"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  value={settings.currency}
                  onChange={handleCurrencyChange}
                  className="setting-select"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="ZAR">ZAR (R)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'display' && (
            <div className="settings-section">
              <h2>Display Settings</h2>
              
              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Show Property Images</label>
                  <button
                    className={`toggle ${settings.display.showImages ? 'active' : ''}`}
                    onClick={() => handleDisplayToggle('showImages')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Display property images in listings</p>
              </div>

              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Compact View</label>
                  <button
                    className={`toggle ${settings.display.compactView ? 'active' : ''}`}
                    onClick={() => handleDisplayToggle('compactView')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Show more properties per page</p>
              </div>

              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Show Price Trends</label>
                  <button
                    className={`toggle ${settings.display.showPriceTrends ? 'active' : ''}`}
                    onClick={() => handleDisplayToggle('showPriceTrends')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Display price trend indicators</p>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Settings</h2>
              
              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Email Notifications</label>
                  <button
                    className={`toggle ${settings.notifications.email ? 'active' : ''}`}
                    onClick={() => handleNotificationToggle('email')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Receive email updates about new properties</p>
              </div>

              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Push Notifications</label>
                  <button
                    className={`toggle ${settings.notifications.push ? 'active' : ''}`}
                    onClick={() => handleNotificationToggle('push')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Get instant notifications in your browser</p>
              </div>

              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Price Alerts</label>
                  <button
                    className={`toggle ${settings.notifications.priceAlerts ? 'active' : ''}`}
                    onClick={() => handleNotificationToggle('priceAlerts')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Notify when property prices change</p>
              </div>

              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Weekly Summary</label>
                  <button
                    className={`toggle ${settings.notifications.weeklySummary ? 'active' : ''}`}
                    onClick={() => handleNotificationToggle('weeklySummary')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Receive weekly market updates</p>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy Settings</h2>
              
              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Analytics</label>
                  <button
                    className={`toggle ${settings.privacy.analytics ? 'active' : ''}`}
                    onClick={() => handlePrivacyToggle('analytics')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Help improve our service by sharing usage data</p>
              </div>

              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Location Tracking</label>
                  <button
                    className={`toggle ${settings.privacy.locationTracking ? 'active' : ''}`}
                    onClick={() => handlePrivacyToggle('locationTracking')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Use your location for better property recommendations</p>
              </div>

              <div className="setting-group">
                <div className="setting-toggle">
                  <label>Third-party Cookies</label>
                  <button
                    className={`toggle ${settings.privacy.thirdPartyCookies ? 'active' : ''}`}
                    onClick={() => handlePrivacyToggle('thirdPartyCookies')}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
                <p className="setting-description">Allow third-party services for enhanced features</p>
              </div>
            </div>
          )}

          {activeSection === 'advanced' && (
            <div className="settings-section">
              <h2>Advanced Settings</h2>
              
              <div className="setting-group">
                <label>Reset All Settings</label>
                <p className="setting-description">This will reset all settings to their default values</p>
                {showResetConfirm ? (
                  <div className="reset-confirm">
                    <p>Are you sure you want to reset all settings?</p>
                    <div className="reset-buttons">
                      <button
                        className="btn btn-danger"
                        onClick={handleReset}
                      >
                        Yes, Reset
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowResetConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-outline-danger"
                    onClick={() => setShowResetConfirm(true)}
                  >
                    Reset Settings
                  </button>
                )}
              </div>

              <div className="setting-group">
                <label>Export Settings</label>
                <p className="setting-description">Download your current settings as a backup</p>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    const dataStr = JSON.stringify(settings, null, 2);
                    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                    const exportFileDefaultName = 'settings.json';
                    const linkElement = document.createElement('a');
                    linkElement.setAttribute('href', dataUri);
                    linkElement.setAttribute('download', exportFileDefaultName);
                    linkElement.click();
                  }}
                >
                  Export Settings
                </button>
              </div>

              <div className="setting-group">
                <label>Debug Information</label>
                <div className="debug-info">
                  <p><strong>Version:</strong> 1.0.0</p>
                  <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
                  <p><strong>Settings Loaded:</strong> {Object.keys(settings).length} categories</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
