import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWeather } from '../services/weather';
import { useLocation } from './LocationContext';

const WeatherContext = createContext();

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};

export const WeatherProvider = ({ children }) => {
  const { currentLocation } = useLocation();
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [cache, setCache] = useState(new Map());

  // Cache weather data for 30 minutes
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Fetch weather for current location
  const fetchWeather = useCallback(async (latitude, longitude) => {
    if (!latitude || !longitude) return;

    const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const cached = cache.get(cacheKey);

    // Check if we have valid cached data
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      setWeatherData(cached.data);
      setLastFetch(cached.timestamp);
      return cached.data;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getWeather(latitude, longitude);

      const weatherInfo = {
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        visibility: data.visibility,
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg,
        weather: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        location: data.name,
        country: data.sys.country,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
        timestamp: Date.now(),
      };

      // Update cache
      setCache(prev => new Map(prev).set(cacheKey, {
        data: weatherInfo,
        timestamp: Date.now()
      }));

      setWeatherData(weatherInfo);
      setLastFetch(Date.now());

      return weatherInfo;
    } catch (err) {
      console.warn('Error fetching weather:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cache, CACHE_DURATION]);

  // Auto-fetch weather when location changes
  useEffect(() => {
    if (currentLocation) {
      fetchWeather(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation, fetchWeather]);

  // Get weather icon URL
  const getWeatherIconUrl = useCallback((icon) => {
    return icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : null;
  }, []);

  // Format temperature
  const formatTemperature = useCallback((temp, unit = 'celsius') => {
    if (unit === 'fahrenheit') {
      return `${Math.round((temp * 9/5) + 32)}°F`;
    }
    return `${Math.round(temp)}°C`;
  }, []);

  // Format wind speed
  const formatWindSpeed = useCallback((speed, unit = 'metric') => {
    if (unit === 'imperial') {
      return `${(speed * 2.237).toFixed(1)} mph`;
    }
    return `${(speed * 3.6).toFixed(1)} km/h`;
  }, []);

  // Get wind direction
  const getWindDirection = useCallback((degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }, []);

  // Check if weather data is stale
  const isStale = useCallback(() => {
    return !lastFetch || (Date.now() - lastFetch) > CACHE_DURATION;
  }, [lastFetch, CACHE_DURATION]);

  // Clear cache
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  // Get cached weather for a location
  const getCachedWeather = useCallback((latitude, longitude) => {
    const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const cached = cache.get(cacheKey);
    return cached && (Date.now() - cached.timestamp) < CACHE_DURATION ? cached.data : null;
  }, [cache, CACHE_DURATION]);

  const value = {
    // State
    weatherData,
    loading,
    error,
    lastFetch,

    // Actions
    fetchWeather,

    // Utilities
    getWeatherIconUrl,
    formatTemperature,
    formatWindSpeed,
    getWindDirection,

    // Cache management
    isStale,
    clearCache,
    getCachedWeather,

    // Computed
    hasWeatherData: weatherData !== null,
    isCacheValid: !isStale(),
    cacheSize: cache.size,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};