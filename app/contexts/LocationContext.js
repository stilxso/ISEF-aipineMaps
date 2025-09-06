import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
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

  // Request location permissions
  const requestPermissions = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      return status === 'granted';
    } catch (err) {
      console.warn('Error requesting location permissions:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // Get current location once
  const getCurrentLocation = useCallback(async () => {
    try {
      setError(null);
      const hasPermission = locationPermission === 'granted' || await requestPermissions();

      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
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
      console.warn('Error getting current location:', err);
      setError(err.message);
      throw err;
    }
  }, [locationPermission, requestPermissions]);

  // Start watching location
  const startWatching = useCallback(async () => {
    try {
      setError(null);
      const hasPermission = locationPermission === 'granted' || await requestPermissions();

      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      setWatching(true);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: CONFIG.LOCATION_UPDATE_INTERVAL,
          distanceInterval: 1,
        },
        (location) => {
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
        }
      );

      return () => subscription.remove();
    } catch (err) {
      console.warn('Error starting location watch:', err);
      setError(err.message);
      setWatching(false);
      throw err;
    }
  }, [locationPermission, requestPermissions]);

  // Stop watching location
  const stopWatching = useCallback(() => {
    setWatching(false);
  }, []);

  // Calculate distance between two points
  const calculateDistance = useCallback((point1, point2) => {
    if (!point1 || !point2) return 0;

    const R = 6371e3; // Earth's radius in meters
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

  // Get address from coordinates
  const reverseGeocode = useCallback(async (latitude, longitude) => {
    try {
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      return address[0];
    } catch (err) {
      console.warn('Error reverse geocoding:', err);
      return null;
    }
  }, []);

  // Format coordinates for display
  const formatCoordinates = useCallback((latitude, longitude, precision = 6) => {
    return {
      latitude: parseFloat(latitude.toFixed(precision)),
      longitude: parseFloat(longitude.toFixed(precision)),
      display: `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`
    };
  }, []);

  const value = {
    // State
    currentLocation,
    locationPermission,
    heading,
    speed,
    accuracy,
    watching,
    error,

    // Actions
    requestPermissions,
    getCurrentLocation,
    startWatching,
    stopWatching,

    // Utilities
    calculateDistance,
    reverseGeocode,
    formatCoordinates,

    // Computed
    hasPermission: locationPermission === 'granted',
    isLocationAvailable: currentLocation !== null,
    speedKmh: speed * 3.6, // Convert m/s to km/h
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};