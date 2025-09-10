// тут импортируем нужные хуки и функции для контекста
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
// здесь подключаем функции для работы с хранилищем
import { loadData, saveData } from '../services/storage';
// импортируем конфиг с ключами
import { CONFIG } from '../config/env';

// создаем контекст для маршрутов
const RoutesContext = createContext();

// провайдер для управления маршрутами
export function RoutesProvider({ children }) {
  const [records, setRecords] = useState([]);

  // тут загружаем маршруты из хранилища при старте
  useEffect(() => {
    (async () => {
      const loaded = await loadData(CONFIG.STORAGE_KEYS.ROUTES);
      if (Array.isArray(loaded)) setRecords(loaded);
    })();
  }, []);

  // здесь сохраняем маршруты в хранилище при изменении
  useEffect(() => {
    saveData(CONFIG.STORAGE_KEYS.ROUTES, records);
  }, [records]);

  // функции для управления маршрутами
  const addRoute = (route) => setRecords(prev => [...prev, route]);
  const replaceRoutes = (list) => setRecords(list);
  const clearRoutes = () => setRecords([]);

  // тут мемоизируем значение контекста
  const value = useMemo(() => ({ records, addRoute, replaceRoutes, clearRoutes }), [records]);

  return <RoutesContext.Provider value={value}>{children}</RoutesContext.Provider>;
}

// хук для использования контекста маршрутов
export const useRoutes = () => useContext(RoutesContext);
