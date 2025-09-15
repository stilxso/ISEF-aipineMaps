import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from './LocationContext';
import { useRoutes } from './RoutesContext';

const RecorderContext = createContext();

export function RecorderProvider({ children }) {
  const { currentLocation, startWatching, stopWatching } = useLocation();
  const { addRoute } = useRoutes();

  const [recording, setRecording] = useState(false);
  const [current, setCurrent] = useState({ points: [] });

  useEffect(() => {
    if (recording && currentLocation) {
      setCurrent(prev => {
        const { latitude, longitude, altitude } = currentLocation;
        if (!latitude || !longitude) return prev;
        const next = { ...prev, points: [...prev.points, { latitude, longitude, altitude, ts: Date.now() }] };
        return next;
      });
    }
  }, [currentLocation, recording]);

  const start = useCallback(async () => {
    await startWatching();
    setCurrent({ points: [] });
    setRecording(true);
  }, [startWatching]);

  const stop = useCallback(() => {
    setRecording(false);
    stopWatching();
  }, [stopWatching]);

  const discard = useCallback(() => {
    setCurrent({ points: [] });
    setRecording(false);
  }, []);

  const save = useCallback(async () => {
    if (!current.points.length) return null;
    
    const coords = current.points.map(p => [p.longitude ?? p.longitude, p.latitude ?? p.latitude, p.altitude ?? null]);
    const entry = {
      id: `rec_${Date.now()}`,
      name: `Track ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      stats: { length_km: ((coords.length * 0.01) || 0).toFixed(1) }, 
      geojson: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }],
      },
    };
    
    addRoute(entry);
    setCurrent({ points: [] });
    return entry;
  }, [current, addRoute]);

  const value = useMemo(() => ({ recording, current, start, stop, discard, save }), [recording, current, start, stop, discard, save]);

  return <RecorderContext.Provider value={value}>{children}</RecorderContext.Provider>;
}

export const useRecorder = () => useContext(RecorderContext);
