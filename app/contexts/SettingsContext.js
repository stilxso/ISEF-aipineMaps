
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { loadData, saveData } from '../services/storage';

import { CONFIG } from '../config/env';


const SettingsContext = createContext();


export function SettingsProvider({ children }) {
  
  const [settings, setSettings] = useState({
    language: 'ru',
    theme: 'dark',
    units: 'metric',
    mapProvider: 'default',
    locationEnabled: true,
    notificationsEnabled: false,
    autoSave: true,
  });

  
  useEffect(() => {
    (async () => {
      const saved = await loadData(CONFIG.STORAGE_KEYS.SETTINGS);
      if (saved) setSettings(prev => ({ ...prev, ...saved }));
    })();
  }, []);

  
  useEffect(() => {
    saveData(CONFIG.STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  
  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  
  const value = useMemo(() => ({ settings, updateSetting }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}


export const useSettings = () => useContext(SettingsContext);
