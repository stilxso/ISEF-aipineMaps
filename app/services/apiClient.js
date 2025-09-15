import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';


const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});


apiClient.interceptors.request.use(async (config) => {
  try {
    
    config.metadata = config.metadata || {};
    config.metadata.startTime = Date.now();
    const method = (config.method || 'get').toUpperCase();
    const url = config.baseURL ? `${config.baseURL}${config.url || ''}` : (config.url || '');
    console.log('HTTP ▶️', method, url);
    if (config.params) {
      console.log('HTTP Params:', JSON.stringify(config.params));
    }
    if (config.data) {
      const preview = typeof config.data === 'string' ? config.data.slice(0, 200) : JSON.stringify(config.data).slice(0, 200);
      console.log('HTTP Body:', preview, preview.length > 199 ? '…' : '');
    }

    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    
  }
  return config;
});


apiClient.interceptors.response.use(
  (response) => {
    try {
      const start = response.config?.metadata?.startTime;
      const durationMs = start ? Date.now() - start : null;
      const method = (response.config?.method || 'get').toUpperCase();
      const url = response.config?.baseURL ? `${response.config.baseURL}${response.config.url || ''}` : (response.config?.url || '');
      console.log('HTTP ✅', method, url, '—', response.status, durationMs != null ? `${durationMs}ms` : '');
      const size = typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data || {}).length;
      console.log('HTTP Size:', size, 'bytes');
    } catch {}
    return response;
  },
  (error) => {
    try {
      const start = error.config?.metadata?.startTime;
      const durationMs = start ? Date.now() - start : null;
      const method = (error.config?.method || 'get').toUpperCase();
      const url = error.config?.baseURL ? `${error.config.baseURL}${error.config.url || ''}` : (error.config?.url || '');
      console.log('HTTP ❌', method, url, '—', error?.response?.status || error.code || 'ERR', durationMs != null ? `${durationMs}ms` : '');
      if (error.response?.data) {
        const preview = typeof error.response.data === 'string' ? error.response.data.slice(0, 400) : JSON.stringify(error.response.data).slice(0, 400);
        console.log('HTTP Error Body:', preview, preview.length > 399 ? '…' : '');
      }
    } catch {}

    const normalized = new Error(
      error?.response?.data?.message ||
        error?.response?.statusText ||
        error?.message ||
        'Network error'
    );
    normalized.status = error?.response?.status;
    normalized.data = error?.response?.data;
    return Promise.reject(normalized);
  }
);

export default apiClient;


