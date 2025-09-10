import BackgroundTimer from 'react-native-background-timer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = 'https://api.aipinemaps.com'; // TODO: Configure this
const LOCATION_ENDPOINT = '/api/location-updates';

const STORAGE_KEY_LOCATION_QUEUE = 'locationQueue';
const LOCATION_SEND_INTERVAL = 5 * 60 * 1000; // 5 minutes

let locationTimer = null;
let isSendingActive = false;
let currentRouteId = null;

// Start automatic location sending
export const startLocationSending = (routeId) => {
  if (isSendingActive) {
    console.warn('Location sending already active');
    return;
  }

  currentRouteId = routeId;
  isSendingActive = true;

  console.log('Starting automatic location sending for route:', routeId);

  // Send initial location immediately
  sendCurrentLocation();

  // Set up recurring timer
  locationTimer = BackgroundTimer.setInterval(() => {
    sendCurrentLocation();
  }, LOCATION_SEND_INTERVAL);
};

// Stop automatic location sending
export const stopLocationSending = () => {
  if (locationTimer) {
    BackgroundTimer.clearInterval(locationTimer);
    locationTimer = null;
  }

  isSendingActive = false;
  currentRouteId = null;

  console.log('Stopped automatic location sending');
};

// Send current location to server
const sendCurrentLocation = async () => {
  try {
    // Get current location from global state or geolocation
    const location = await getCurrentLocation();

    if (!location) {
      console.warn('No location available for sending');
      return;
    }

    const locationData = {
      routeId: currentRouteId,
      userId: 'currentUser', // TODO: Get from auth context
      timestamp: Date.now(),
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed,
      batteryLevel: await getBatteryLevel(),
    };

    const state = await NetInfo.fetch();

    if (state.isConnected) {
      // Send immediately if online
      await axios.post(`${API_BASE_URL}${LOCATION_ENDPOINT}`, locationData, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth headers
        },
      });

      console.log('Location sent successfully');
    } else {
      // Queue for later if offline
      await queueLocation(locationData);
      console.log('Location queued (offline)');
    }
  } catch (error) {
    console.warn('Error sending location:', error.message);

    // If sending failed, queue the location
    try {
      const location = await getCurrentLocation();
      if (location) {
        const locationData = {
          routeId: currentRouteId,
          userId: 'currentUser',
          timestamp: Date.now(),
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: location.altitude,
          accuracy: location.accuracy,
          heading: location.heading,
          speed: location.speed,
          batteryLevel: await getBatteryLevel(),
        };
        await queueLocation(locationData);
      }
    } catch (queueError) {
      console.warn('Error queuing location:', queueError.message);
    }
  }
};

// Get current location (fallback to geolocation API)
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    } else {
      reject(new Error('Geolocation not available'));
    }
  });
};

// Get battery level (if available)
const getBatteryLevel = async () => {
  try {
    // This is a simplified implementation
    // In a real app, you'd use a battery library or native module
    return null; // Placeholder
  } catch (error) {
    return null;
  }
};

// Queue location for offline sending
const queueLocation = async (locationData) => {
  try {
    const existingQueue = await getLocationQueue();
    const updatedQueue = [...existingQueue, { ...locationData, queuedAt: Date.now() }];
    await AsyncStorage.setItem(STORAGE_KEY_LOCATION_QUEUE, JSON.stringify(updatedQueue));
  } catch (error) {
    console.warn('Error queuing location:', error);
  }
};

// Get queued locations
export const getLocationQueue = async () => {
  try {
    const queueData = await AsyncStorage.getItem(STORAGE_KEY_LOCATION_QUEUE);
    return queueData ? JSON.parse(queueData) : [];
  } catch (error) {
    console.warn('Error getting location queue:', error);
    return [];
  }
};

// Flush location queue when back online
export const flushLocationQueue = async () => {
  const queue = await getLocationQueue();
  if (queue.length === 0) return [];

  const results = [];

  for (const locationData of queue) {
    try {
      await axios.post(`${API_BASE_URL}${LOCATION_ENDPOINT}`, locationData, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      results.push({ success: true, timestamp: locationData.timestamp });
    } catch (error) {
      results.push({ success: false, timestamp: locationData.timestamp, error: error.message });
    }
  }

  // Remove successfully sent locations
  const failedLocations = queue.filter((location, index) => !results[index].success);
  await AsyncStorage.setItem(STORAGE_KEY_LOCATION_QUEUE, JSON.stringify(failedLocations));

  console.log(`Flushed location queue: ${results.filter(r => r.success).length} sent, ${results.filter(r => !r.success).length} failed`);

  return results;
};

// Clear location queue
export const clearLocationQueue = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_LOCATION_QUEUE);
  } catch (error) {
    console.warn('Error clearing location queue:', error);
  }
};

// Get location sending status
export const getLocationSendingStatus = () => {
  return {
    isActive: isSendingActive,
    routeId: currentRouteId,
    interval: LOCATION_SEND_INTERVAL,
  };
};

// Manual location send (for testing)
export const sendLocationNow = async (routeId = currentRouteId) => {
  const originalRouteId = currentRouteId;
  currentRouteId = routeId || currentRouteId;

  try {
    await sendCurrentLocation();
  } finally {
    currentRouteId = originalRouteId;
  }
};