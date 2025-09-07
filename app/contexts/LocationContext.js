import { createContext, useContext, useState, useCallback } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { CONFIG } from '../config/env';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState(null);

  // права на локацию запрашиваем
  const requestPermissions = useCallback(async () => {
    try {
      return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          () => {
            setLocationPermission('granted');
            resolve(true);
          },
          (err) => {
            console.warn('права на локацию нет:', err);
            setLocationPermission('denied');
            setError(err.message);
            resolve(false);
          },
          { enableHighAccuracy: false, timeout: 5000 }
        );
      });
    } catch (err) {
      console.warn('ошибка с правами:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // текущая локация получаем
  const getCurrentLocation = useCallback(async () => {
    try {
      setError(null);
      const hasPermission = locationPermission === 'granted' || await requestPermissions();

      if (!hasPermission) {
        throw new Error('права на локацию нет');
      }

      const location = await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => resolve(position),
          (err) => reject(err),
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
          }
        );
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      setCurrentLocation(newLocation);
      setHeading(location.coords.heading || 0);
      setSpeed(location.coords.speed || 0);
      setAccuracy(location.coords.accuracy || 0);

      return newLocation;
    } catch (err) {
      console.warn('ошибка с локацией:', err);
      setError(err.message);
      throw err;
    }
  }, [locationPermission, requestPermissions]);

  // слежка за локацией
  const startWatching = useCallback(async () => {
    try {
      setError(null);
      const hasPermission = locationPermission === 'granted' || await requestPermissions();

      if (!hasPermission) {
        throw new Error('права на локацию нет');
      }

      setWatching(true);

      const watchId = Geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          setCurrentLocation(newLocation);
          setHeading(position.coords.heading || 0);
          setSpeed(position.coords.speed || 0);
          setAccuracy(position.coords.accuracy || 0);
        },
        (err) => {
          console.warn('ошибка слежки:', err);
          setError(err.message);
          setWatching(false);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 1,
          interval: CONFIG.LOCATION_UPDATE_INTERVAL,
          fastestInterval: 1000
        }
      );

      return () => Geolocation.clearWatch(watchId);
    } catch (err) {
      console.warn('не смог запустить слежку:', err);
      setError(err.message);
      setWatching(false);
      throw err;
    }
  }, [locationPermission, requestPermissions]);

  // стоп слежка
  const stopWatching = useCallback(() => {
    setWatching(false);
  }, []);

  // расстояние между точками
  const calculateDistance = useCallback((point1, point2) => {
    if (!point1 || !point2) return 0;

    const R = 6371e3; // радиус земли в метрах
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  // адрес по координатам (просто заглушка)
  const reverseGeocode = useCallback(async (latitude, longitude) => {
    try {
      return {
        city: 'Неизвестно',
        region: 'Неизвестно',
        country: 'Неизвестно',
        street: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      };
    } catch (err) {
      console.warn('ошибка геокода:', err);
      return null;
    }
  }, []);

  // координаты форматируем
  const formatCoordinates = useCallback((latitude, longitude, precision = 6) => {
    return {
      latitude: parseFloat(latitude.toFixed(precision)),
      longitude: parseFloat(longitude.toFixed(precision)),
      display: `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`
    };
  }, []);

  const value = {
    currentLocation,
    locationPermission,
    heading,
    speed,
    accuracy,
    watching,
    error,
    requestPermissions,
    getCurrentLocation,
    startWatching,
    stopWatching,
    calculateDistance,
    reverseGeocode,
    formatCoordinates,
    hasPermission: locationPermission === 'granted',
    isLocationAvailable: currentLocation !== null,
    speedKmh: speed * 3.6, // м/с в км/ч
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};