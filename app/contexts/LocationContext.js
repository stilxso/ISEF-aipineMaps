import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

const LocationContext = createContext();

export function LocationProvider({ children }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, []);

  async function requestPermission() {
    if (Platform.OS === 'android') {
      const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return res === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  async function startWatching() {
    const ok = await requestPermission();
    if (!ok) return;
    if (watchId.current) return;

    const geo = navigator.geolocation || global.navigator?.geolocation;
    if (!geo || !geo.watchPosition) return;

    watchId.current = geo.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude, heading: hdg, speed: spd, accuracy: acc } = pos.coords;
        setCurrentLocation({ latitude, longitude, altitude });
        if (typeof hdg === 'number' && hdg >= 0) setHeading(hdg);
        setSpeed(spd || 0);
        setAccuracy(acc || null);
      },
      (err) => console.warn('watchPosition err', err),
      { enableHighAccuracy: true, distanceFilter: 1, interval: 1000, fastestInterval: 500 }
    );
  }

  function stopWatching() {
    const geo = navigator.geolocation || global.navigator?.geolocation;
    if (watchId.current && geo?.clearWatch) {
      geo.clearWatch(watchId.current);
      watchId.current = null;
    }
  }

  return (
    <LocationContext.Provider value={{ currentLocation, heading, speed, accuracy, startWatching, stopWatching }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);
