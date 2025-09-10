import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.aipinemaps.com'; // TODO: Configure this
const ALERTS_ENDPOINT = '/api/alerts';

const STORAGE_KEY_QUEUE = 'emergencyQueue';

// Send alert to server
export const sendAlert = async (alertData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}${ALERTS_ENDPOINT}`, alertData, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add auth headers if needed
      },
    });

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

// Add alert to offline queue
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

// Get current offline queue
export const getQueue = async () => {
  try {
    const queueData = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
    return queueData ? JSON.parse(queueData) : [];
  } catch (error) {
    console.warn('getQueue error:', error);
    return [];
  }
};

// Flush queue - try to send all queued alerts
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

  // Remove successfully sent alerts from queue
  const failedAlerts = queue.filter((alert, index) => !results[index].success);
  await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(failedAlerts));

  return results;
};

// Clear the queue (for testing or manual cleanup)
export const clearQueue = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_QUEUE);
  } catch (error) {
    console.warn('clearQueue error:', error);
  }
};

// Get queue status
export const getQueueStatus = async () => {
  const queue = await getQueue();
  return {
    count: queue.length,
    oldest: queue.length > 0 ? Math.min(...queue.map(a => a.queuedAt)) : null,
    newest: queue.length > 0 ? Math.max(...queue.map(a => a.queuedAt)) : null,
  };
};

// Retry failed alerts with exponential backoff
export const retryFailedAlerts = async (maxRetries = 3) => {
  const queue = await getQueue();
  const failedAlerts = queue.filter(alert => (alert.retryCount || 0) < maxRetries);

  const results = [];

  for (const alert of failedAlerts) {
    const retryCount = (alert.retryCount || 0) + 1;
    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await sendAlert(alert);
      results.push({ success: true, id: alert.id });
    } catch (error) {
      // Update retry count
      alert.retryCount = retryCount;
      results.push({ success: false, id: alert.id, error: error.message, retryCount });
    }
  }

  // Update queue with new retry counts
  const updatedQueue = queue.map(alert => {
    const result = results.find(r => r.id === alert.id);
    return result ? { ...alert, retryCount: result.retryCount || alert.retryCount } : alert;
  });

  await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updatedQueue));

  return results;
};