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
    // Load settings from localStorage or use defaults
    const savedSettings = localStorage.getItem('digitalEstateSettings');
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
    
    return {
      theme: 'light',
      notifications: true,
      autoSave: true,
      language: 'english',
      compactMode: false,
      showMetrics: true
    };
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
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const resetSettings = () => {
    const defaultSettings = {
      theme: 'light',
      notifications: true,
      autoSave: true,
      language: 'english',
      compactMode: false,
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
