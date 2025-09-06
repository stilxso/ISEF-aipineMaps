import axios from 'axios';
import { CONFIG } from '../config/env';

export async function getWeather(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}`;
    const res = await axios.get(url, { timeout: 10000 });
    return res.data;
  } catch (e) {
    console.warn('weather api error', e);
    throw new Error(`Weather API error: ${e.message || 'Unknown error'}`);
  }
}
