
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { loadData, saveData } from '../services/storage';

import { CONFIG } from '../config/env';


const RoutesContext = createContext();


export function RoutesProvider({ children }) {
  const [records, setRecords] = useState([]);

  
  useEffect(() => {
    (async () => {
      const loaded = await loadData(CONFIG.STORAGE_KEYS.ROUTES);
      if (Array.isArray(loaded)) setRecords(loaded);
    })();
  }, []);

  
  useEffect(() => {
    saveData(CONFIG.STORAGE_KEYS.ROUTES, records);
  }, [records]);

  
  const addRoute = (route) => setRecords(prev => [...prev, route]);
  const replaceRoutes = (list) => setRecords(list);
  const clearRoutes = () => setRecords([]);

  
  const value = useMemo(() => ({ records, addRoute, replaceRoutes, clearRoutes }), [records]);

  return <RoutesContext.Provider value={value}>{children}</RoutesContext.Provider>;
}


export const useRoutes = () => useContext(RoutesContext);
