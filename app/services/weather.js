import axios from 'axios';
import { CONFIG } from '../config/env';
// тут логируем загрузку конфига для погоды
console.log('Weather service: CONFIG loaded =', CONFIG);

// Constants
const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const REQUEST_TIMEOUT = 10000;

/**
 * Fetch weather data for given coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Weather data from OpenWeatherMap API
 * @throws {Error} If API request fails
 */
export async function getWeather(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error('Invalid coordinates: lat and lon must be numbers');
  }

  try {
    const url = `${WEATHER_API_BASE_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}`;
    const response = await axios.get(url, { timeout: REQUEST_TIMEOUT });
    return response.data;
  } catch (error) {
    console.warn('Weather API error:', error.message);
    if (error.response) {
      throw new Error(`Weather API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Weather API error: No response from server');
    } else {
      throw new Error(`Weather API error: ${error.message}`);
    }
  }
}
