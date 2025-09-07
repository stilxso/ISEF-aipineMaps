import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadData, saveData } from '../services/storage';
import { CONFIG } from '../config/env';

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
    theme: 'light', // 'light' | 'dark'
    language: 'ru', // 'ru' | 'en'
    units: 'metric', // 'metric' | 'imperial'
    mapProvider: 'default', // 'default' | 'google' | 'osm'
    locationEnabled: true,
    notificationsEnabled: true,
    autoSave: true,
    cacheSize: 50, // MB
    downloadQuality: 'high', // 'low' | 'medium' | 'high'
    defaultSpeed: CONFIG.DEFAULT_AVG_SPEED_KMH,
    defaultAscent: CONFIG.DEFAULT_ASCENT_METERS_PER_HOUR,
  });
  const [loading, setLoading] = useState(true);

  // загружаем настройки при монтировании
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const savedSettings = await loadData(CONFIG.STORAGE_KEYS.SETTINGS);
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...savedSettings }));
        }
      } catch (error) {
        console.warn('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // сохраняем настройки при изменении
  useEffect(() => {
    if (!loading) {
      saveData(CONFIG.STORAGE_KEYS.SETTINGS, settings);
    }
  }, [settings, loading]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({
      theme: 'light',
      language: 'ru',
      units: 'metric',
      mapProvider: 'default',
      locationEnabled: true,
      notificationsEnabled: true,
      autoSave: true,
      cacheSize: 50,
      downloadQuality: 'high',
      defaultSpeed: CONFIG.DEFAULT_AVG_SPEED_KMH,
      defaultAscent: CONFIG.DEFAULT_ASCENT_METERS_PER_HOUR,
    });
  }, []);

  const getThemeColors = useCallback(() => {
    const isDark = settings.theme === 'dark';
    return {
      background: isDark ? '#1e293b' : '#f0f9ff',
      surface: isDark ? '#334155' : '#ffffff',
      text: isDark ? '#f1f5f9' : '#1e293b',
      textSecondary: isDark ? '#94a3b8' : '#6b7280',
      primary: isDark ? '#3b82f6' : '#0f172a',
      accent: isDark ? '#ef4444' : '#ef4444',
    };
  }, [settings.theme]);

  const value = {
    // состояние
    settings,
    loading,

    // действия
    updateSetting,
    updateSettings,
    resetSettings,

    // вычисляемые
    isDarkMode: settings.theme === 'dark',
    isMetric: settings.units === 'metric',
    themeColors: getThemeColors(),

    // геттеры
    getSetting: (key) => settings[key],
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};