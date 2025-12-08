import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const baseDefaults = {
      // Visual
      theme: 'light',
      compactMode: false,
      currency: 'ZAR',
      defaultLanding: '/',
      // Profile
      displayName: '',
      emailVisibility: 'private', // private | team | public
      // Notifications (granular)
      notifications: {
        marketing: false,
        product: true,
        marketAlerts: true
      },
      // Privacy & data sharing
      privacy: {
        showLocation: false,
        shareAnalytics: false
      },
      // Legacy keys retained for backward compatibility
      autoSave: true,
      language: 'english',
      showMetrics: true
    };

    const saved = localStorage.getItem('digitalEstateSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge shallow defaults with saved (nested objects merged individually)
        return {
          ...baseDefaults,
          ...parsed,
          notifications: {
            ...baseDefaults.notifications,
            ...(parsed.notifications || {})
          },
            privacy: {
            ...baseDefaults.privacy,
            ...(parsed.privacy || {})
          }
        };
      } catch (e) {
        console.error('Error parsing saved settings, using defaults', e);
      }
    }
    return baseDefaults;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('digitalEstateSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateSettings = (newSettings) => {
    // Allow partial nested updates (notifications/privacy) if provided
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      notifications: newSettings.notifications
        ? { ...prev.notifications, ...newSettings.notifications }
        : prev.notifications,
      privacy: newSettings.privacy
        ? { ...prev.privacy, ...newSettings.privacy }
        : prev.privacy
    }));
  };

  const resetSettings = () => {
    const defaultSettings = {
      theme: 'light',
      compactMode: false,
      currency: 'ZAR',
      defaultLanding: '/',
      displayName: '',
      emailVisibility: 'private',
      notifications: { marketing: false, product: true, marketAlerts: true },
      privacy: { showLocation: false, shareAnalytics: false },
      autoSave: true,
      language: 'english',
      showMetrics: true
    };
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      updateSettings,
      resetSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;
