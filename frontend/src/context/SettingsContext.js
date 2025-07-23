import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    // Display Settings
    theme: 'light',
    sidebarCollapsed: false,
    showMetrics: true,
    showCharts: true,
    compactMode: false,
    
    // Property Settings
    defaultPropertyType: 'all',
    defaultLocation: '',
    showPriceInZAR: true,
    showHighQualityImages: true,
    autoRefreshData: true,
    refreshInterval: 30,
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: false,
    priceAlerts: true,
    newPropertyAlerts: false,
    marketUpdateAlerts: true,
    
    // Data Settings
    cacheData: true,
    offlineMode: false,
    dataRetention: 30,
    exportFormat: 'csv',
    
    // Privacy Settings
    analyticsOptIn: true,
    shareUsageData: false,
    cookiesEnabled: true
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('digitalEstateSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (settings.theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }

    // Apply compact mode
    if (settings.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
  }, [settings.theme, settings.compactMode]);

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem('digitalEstateSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      localStorage.setItem('digitalEstateSettings', JSON.stringify(updatedSettings));
      return updatedSettings;
    });
  };

  const resetSettings = () => {
    const defaultSettings = {
      theme: 'light',
      sidebarCollapsed: false,
      showMetrics: true,
      showCharts: true,
      compactMode: false,
      defaultPropertyType: 'all',
      defaultLocation: '',
      showPriceInZAR: true,
      showHighQualityImages: true,
      autoRefreshData: true,
      refreshInterval: 30,
      emailNotifications: true,
      pushNotifications: false,
      priceAlerts: true,
      newPropertyAlerts: false,
      marketUpdateAlerts: true,
      cacheData: true,
      offlineMode: false,
      dataRetention: 30,
      exportFormat: 'csv',
      analyticsOptIn: true,
      shareUsageData: false,
      cookiesEnabled: true
    };
    setSettings(defaultSettings);
    localStorage.setItem('digitalEstateSettings', JSON.stringify(defaultSettings));
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

export default SettingsContext;
