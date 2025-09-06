import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadData, saveData } from '../services/storage';
import { CONFIG } from '../config/env';

const RoutesContext = createContext();

export const useRoutes = () => {
  const context = useContext(RoutesContext);
  if (!context) {
    throw new Error('useRoutes must be used within a RoutesProvider');
  }
  return context;
};

export const RoutesProvider = ({ children }) => {
  const [routes, setRoutes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState(null);

  // Load data on mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [routesData, historyData] = await Promise.all([
          loadData(CONFIG.STORAGE_KEYS.ROUTES),
          loadData(CONFIG.STORAGE_KEYS.HISTORY)
        ]);

        if (routesData) setRoutes(routesData);
        if (historyData) setHistory(historyData);
      } catch (error) {
        console.warn('Error loading routes data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Save routes whenever routes change
  useEffect(() => {
    if (!loading) {
      saveData(CONFIG.STORAGE_KEYS.ROUTES, routes);
    }
  }, [routes, loading]);

  // Save history whenever history changes
  useEffect(() => {
    if (!loading) {
      saveData(CONFIG.STORAGE_KEYS.HISTORY, history);
    }
  }, [history, loading]);

  const addRoute = useCallback((route) => {
    setRoutes(prev => [...prev, { ...route, id: route.id || `route-${Date.now()}` }]);
  }, []);

  const removeRoute = useCallback((routeId) => {
    setRoutes(prev => prev.filter(route => route.id !== routeId));
  }, []);

  const updateRoute = useCallback((routeId, updates) => {
    setRoutes(prev => prev.map(route =>
      route.id === routeId ? { ...route, ...updates } : route
    ));
  }, []);

  const addToHistory = useCallback((routeEntry) => {
    const historyEntry = {
      ...routeEntry,
      completedAt: new Date().toISOString(),
      id: `history-${Date.now()}`
    };
    setHistory(prev => [historyEntry, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getRouteById = useCallback((routeId) => {
    return routes.find(route => route.id === routeId);
  }, [routes]);

  const getRoutesByDifficulty = useCallback((difficulty) => {
    return routes.filter(route => route.stats?.difficulty === difficulty);
  }, [routes]);

  const value = {
    // State
    routes,
    history,
    loading,
    currentRoute,

    // Actions
    addRoute,
    removeRoute,
    updateRoute,
    addToHistory,
    clearHistory,
    setCurrentRoute,

    // Getters
    getRouteById,
    getRoutesByDifficulty,

    // Computed
    totalRoutes: routes.length,
    totalHistory: history.length,
    routesByDifficulty: routes.reduce((acc, route) => {
      const diff = route.stats?.difficulty || 'unknown';
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {})
  };

  return (
    <RoutesContext.Provider value={value}>
      {children}
    </RoutesContext.Provider>
  );
};