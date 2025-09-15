import axios from 'axios';
import { CONFIG } from '../config/env';

console.log('Weather service: CONFIG loaded =', CONFIG);


const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const REQUEST_TIMEOUT = 10000;

export async function getWeather(lat, lon) {
  console.log('DEBUG Weather: getWeather called with:', { lat, lon });

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error('Invalid coordinates: lat and lon must be numbers');
  }

  try {
    const url = `${WEATHER_API_BASE_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}`;
    console.log('DEBUG Weather: Making API request to:', url);

    const response = await axios.get(url, { timeout: REQUEST_TIMEOUT });
    console.log('DEBUG Weather: API response received:', response.data);
    return response.data;
  } catch (error) {
    console.warn('DEBUG Weather: API error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });

    if (error.response) {
      throw new Error(`Weather API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Weather API error: No response from server');
    } else {
      throw new Error(`Weather API error: ${error.message}`);
    }
  }
}
