import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { saveData, loadData } from '../services/storage';
import { CONFIG } from '../config/env';

// Simple and fast haversine (meters)
function haversine(p1, p2) {
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(p1.latitude);
  const φ2 = toRad(p2.latitude);
  const Δφ = toRad(p2.latitude - p1.latitude);
  const Δλ = toRad(p2.longitude - p1.longitude);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const RecorderContext = createContext();

export const useRecorder = () => {
  const ctx = useContext(RecorderContext);
  if (!ctx) throw new Error('useRecorder must be used within a RecorderProvider');
  return ctx;
};

export const RecorderProvider = ({ children }) => {
  const [recording, setRecording] = useState(false);
  const [track, setTrack] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [records, setRecords] = useState([]);
  const watchIdRef = useRef(null);
  const lastPointRef = useRef(null);

  useEffect(() => {
    (async () => {
      const saved = await loadData(CONFIG.STORAGE_KEYS.ROUTES);
      setRecords(saved || []);
    })();
  }, []);

  // старт записи трека
  const start = useCallback(() => {
    if (recording) return;
    setTrack([]);
    setStartedAt(Date.now());
    setRecording(true);
    lastPointRef.current = null;
    const id = Geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude, accuracy, heading, speed } = pos.coords || {};
        const pt = { latitude, longitude, altitude, accuracy, heading, speed, timestamp: pos.timestamp };

        // Validate basic numbers
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        // Drop low quality fixes
        const maxAcc = Number(CONFIG.MAX_GPS_ACCURACY_METERS || 25);
        if (Number.isFinite(accuracy) && accuracy > maxAcc) return;

        // Drop unrealistic jumps
        const prev = lastPointRef.current;
        if (prev) {
          const dist = haversine(prev, pt); // meters
          const dt = Math.max((pt.timestamp - prev.timestamp) / 1000, 0.001); // seconds
          const speedMps = dist / dt;
          const maxJump = Number(CONFIG.MAX_GPS_JUMP_METERS || 50);

          // if jump is large and implied speed too high (e.g. > 8 m/s ~ 28.8 km/h) — likely spike
          if (dist > maxJump && speedMps > 8) {
            return;
          }
        }

        setTrack((prevArr) => {
          const next = [...prevArr, pt];
          lastPointRef.current = pt;
          return next;
        });
      },
      (err) => {
        console.warn('ошибка рекордера:', err);
      },
      { enableHighAccuracy: true, distanceFilter: 1, interval: CONFIG.LOCATION_UPDATE_INTERVAL, fastestInterval: 1000 }
    );
    watchIdRef.current = id;
  }, [recording]);

  // стоп запись
  const stop = useCallback(() => {
    if (!recording) return;
    setRecording(false);
    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastPointRef.current = null;
  }, [recording]);

  // отменить трек
  const discard = useCallback(() => {
    setTrack([]);
    setStartedAt(null);
    setRecording(false);
    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastPointRef.current = null;
  }, []);

  // сохранить трек
  const save = useCallback(async (name) => {
    if (track.length < 2) return null;
    const id = `rec_${Date.now()}`;
    const coordinates = track.map((p) => [p.longitude, p.latitude, p.altitude ?? null]);
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: name || id, recorded_at: new Date(startedAt || Date.now()).toISOString() },
          geometry: { type: 'LineString', coordinates }
        }
      ]
    };
    const entry = { id, name: name || id, localFile: null, geojson, stats: {} };
    const updated = [...records, entry];
    setRecords(updated);
    await saveData(CONFIG.STORAGE_KEYS.ROUTES, updated);
    setTrack([]);
    setStartedAt(null);
    setRecording(false);
    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    return entry;
  }, [track, startedAt, records]);

  const current = useMemo(() => ({ recording, points: track, startedAt }), [recording, track, startedAt]);

  const value = {
    recording,
    current,
    records,
    start,
    stop,
    discard,
    save
  };

  return <RecorderContext.Provider value={value}>{children}</RecorderContext.Provider>;
};