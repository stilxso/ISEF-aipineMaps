import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeather } from './weather';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import { useLocation } from '../contexts/LocationContext';


const TEMP_CHANGE_THRESHOLD = 5; 
const WIND_CHANGE_THRESHOLD = 5; 
const PRECIPITATION_START = ['rain', 'snow', 'drizzle'];

class WeatherNotificationService {
  constructor() {
    this.lastWeather = null;
    this.checkInterval = null;
    this.isActive = false;
  }

  async startMonitoring(initialLocation = null) {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Weather monitoring started');

    
    if (initialLocation) {
      await AsyncStorage.setItem('last_location', JSON.stringify(initialLocation));
      console.log('DEBUG WeatherNotifications: Initial location stored for monitoring');
    }

    
    await this.checkWeather();

    
    this.checkInterval = setInterval(async () => {
      await this.checkWeather();
    }, 60 * 60 * 1000); 
  }

  async stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isActive = false;
    console.log('Weather monitoring stopped');
  }

  async checkWeather() {
    try {
      
      
      console.log('DEBUG WeatherNotifications: Checking for cached location');
      const cachedLocation = await AsyncStorage.getItem('last_location');
      console.log('DEBUG WeatherNotifications: Cached location retrieved:', cachedLocation);

      if (!cachedLocation) {
        console.log('DEBUG WeatherNotifications: No cached location for weather check - will retry in next interval');
        return;
      }

      const location = JSON.parse(cachedLocation);
      console.log('DEBUG WeatherNotifications: Parsed location:', location);
      const currentWeather = await getWeather(location.latitude, location.longitude);

      if (this.lastWeather) {
        const changes = this.detectSignificantChanges(this.lastWeather, currentWeather);
        if (changes.length > 0) {
          this.sendNotification(changes, currentWeather);
        }
      }

      
      this.lastWeather = currentWeather;
      await AsyncStorage.setItem('last_weather', JSON.stringify(currentWeather));

    } catch (error) {
      console.warn('Weather monitoring error:', error);
    }
  }

  detectSignificantChanges(oldWeather, newWeather) {
    const changes = [];

    const oldTemp = oldWeather.main?.temp || 0;
    const newTemp = newWeather.main?.temp || 0;
    const tempDiff = Math.abs(newTemp - oldTemp);

    if (tempDiff >= TEMP_CHANGE_THRESHOLD) {
      changes.push({
        type: 'temperature',
        message: `Температура изменилась на ${tempDiff.toFixed(1)}°C (${oldTemp.toFixed(1)}°C → ${newTemp.toFixed(1)}°C)`,
        severity: tempDiff >= 10 ? 'high' : 'medium'
      });
    }

    const oldWind = oldWeather.wind?.speed || 0;
    const newWind = newWeather.wind?.speed || 0;
    const windDiff = Math.abs(newWind - oldWind);

    if (windDiff >= WIND_CHANGE_THRESHOLD) {
      changes.push({
        type: 'wind',
        message: `Ветер изменился на ${windDiff.toFixed(1)} м/с (${oldWind.toFixed(1)} м/с → ${newWind.toFixed(1)} м/с)`,
        severity: newWind >= 10 ? 'high' : 'medium'
      });
    }

    const oldCondition = oldWeather.weather?.[0]?.main?.toLowerCase() || '';
    const newCondition = newWeather.weather?.[0]?.main?.toLowerCase() || '';

    if (PRECIPITATION_START.includes(newCondition) && !PRECIPITATION_START.includes(oldCondition)) {
      changes.push({
        type: 'precipitation',
        message: `Начался ${newCondition === 'rain' ? 'дождь' : newCondition === 'snow' ? 'снег' : 'осадки'}`,
        severity: 'high'
      });
    }

    return changes;
  }

  async sendNotification(changes, weather) {
    
    
    console.log('Weather changes detected:', changes);

    changes.forEach(change => {
      
      
      console.log(`NOTIFICATION: ${change.message}`);
    });

    
    try {
      const cachedLocation = await AsyncStorage.getItem('last_location');
      if (cachedLocation) {
        const location = JSON.parse(cachedLocation);
        await axios.post(`${API_BASE_URL}/api/hike/weather-alert`, {
          location,
          changes,
          weather
        });
        console.log('Weather alert sent to backend');
      }
    } catch (error) {
      console.warn('Failed to send weather alert to backend:', error);
    }

    
    this.storeNotification(changes, weather);
  }

  async storeNotification(changes, weather) {
    try {
      const notification = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        changes,
        weather,
        location: await AsyncStorage.getItem('last_location')
      };

      const history = await AsyncStorage.getItem('weather_notifications');
      const notifications = history ? JSON.parse(history) : [];
      notifications.unshift(notification);

      
      if (notifications.length > 50) {
        notifications.splice(50);
      }

      await AsyncStorage.setItem('weather_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.warn('Failed to store weather notification:', error);
    }
  }

  async getNotificationHistory() {
    try {
      const history = await AsyncStorage.getItem('weather_notifications');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.warn('Failed to get notification history:', error);
      return [];
    }
  }
}

export const weatherNotificationService = new WeatherNotificationService();