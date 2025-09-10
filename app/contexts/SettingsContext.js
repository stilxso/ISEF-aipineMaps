// тут импортируем хуки для контекста настроек
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
// здесь подключаем функции хранилища
import { loadData, saveData } from '../services/storage';
// импортируем конфиг
import { CONFIG } from '../config/env';

// создаем контекст для настроек
const SettingsContext = createContext();

// провайдер настроек приложения
export function SettingsProvider({ children }) {
  // тут задаем дефолтные настройки
  const [settings, setSettings] = useState({
    language: 'ru',
    theme: 'dark',
    units: 'metric',
    mapProvider: 'default',
    locationEnabled: true,
    notificationsEnabled: false,
    autoSave: true,
  });

  // здесь загружаем сохраненные настройки
  useEffect(() => {
    (async () => {
      const saved = await loadData(CONFIG.STORAGE_KEYS.SETTINGS);
      if (saved) setSettings(prev => ({ ...prev, ...saved }));
    })();
  }, []);

  // тут сохраняем настройки при изменении
  useEffect(() => {
    saveData(CONFIG.STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  // функция для обновления конкретной настройки
  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  // мемоизируем значение контекста
  const value = useMemo(() => ({ settings, updateSetting }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// хук для использования настроек
export const useSettings = () => useContext(SettingsContext);
