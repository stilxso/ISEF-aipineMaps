import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const ALERTS_ENDPOINT = '/alerts';

const STORAGE_KEY_QUEUE = 'emergencyQueue';


export const sendAlert = async (alertData) => {
  try {
    const response = await apiClient.post(`${ALERTS_ENDPOINT}/sos`, alertData, { timeout: 10000 });

    return {
      success: true,
      data: response.data,
      id: alertData.id,
    };
  } catch (error) {
    console.warn('sendAlert error:', error.message);
    throw error;
  }
};


export const queueAlert = async (alertData) => {
  try {
    const existingQueue = await getQueue();
    const updatedQueue = [...existingQueue, { ...alertData, queuedAt: Date.now() }];
    await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updatedQueue));
    return updatedQueue;
  } catch (error) {
    console.warn('queueAlert error:', error);
    throw error;
  }
};


export const getQueue = async () => {
  try {
    const queueData = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
    return queueData ? JSON.parse(queueData) : [];
  } catch (error) {
    console.warn('getQueue error:', error);
    return [];
  }
};


export const flushQueue = async (pendingAlerts = null) => {
  const queue = pendingAlerts || await getQueue();
  if (queue.length === 0) return [];

  const results = [];

  for (const alert of queue) {
    try {
      await sendAlert(alert);
      results.push({ success: true, id: alert.id });
    } catch (error) {
      results.push({ success: false, id: alert.id, error: error.message });
    }
  }

  
  const failedAlerts = queue.filter((alert, index) => !results[index].success);
  await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(failedAlerts));

  return results;
};


export const clearQueue = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_QUEUE);
  } catch (error) {
    console.warn('clearQueue error:', error);
  }
};


export const getQueueStatus = async () => {
  const queue = await getQueue();
  return {
    count: queue.length,
    oldest: queue.length > 0 ? Math.min(...queue.map(a => a.queuedAt)) : null,
    newest: queue.length > 0 ? Math.max(...queue.map(a => a.queuedAt)) : null,
  };
};


export const retryFailedAlerts = async (maxRetries = 3) => {
  const queue = await getQueue();
  const failedAlerts = queue.filter(alert => (alert.retryCount || 0) < maxRetries);

  const results = [];

  for (const alert of failedAlerts) {
    const retryCount = (alert.retryCount || 0) + 1;
    const delay = Math.pow(2, retryCount) * 1000; 

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await sendAlert(alert);
      results.push({ success: true, id: alert.id });
    } catch (error) {
      
      alert.retryCount = retryCount;
      results.push({ success: false, id: alert.id, error: error.message, retryCount });
    }
  }

  
  const updatedQueue = queue.map(alert => {
    const result = results.find(r => r.id === alert.id);
    return result ? { ...alert, retryCount: result.retryCount || alert.retryCount } : alert;
  });

  await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updatedQueue));

  return results;
};