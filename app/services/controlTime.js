import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_TIMERS = 'activeControlTimers';
let activeTimers = new Map();

// Load active timers on service initialization
export const initializeControlTimers = async () => {
  try {
    const storedTimers = await AsyncStorage.getItem(STORAGE_KEY_TIMERS);
    if (storedTimers) {
      const timersData = JSON.parse(storedTimers);
      const now = Date.now();

      // Restore timers that haven't expired yet
      for (const [id, timerData] of Object.entries(timersData)) {
        if (timerData.eta > now) {
          const delay = timerData.eta - now;
          scheduleTimer(id, delay, timerData.callback, timerData.gracePeriod);
        } else {
          // Timer already expired, trigger callback
          if (timerData.callback) {
            timerData.callback();
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error initializing control timers:', error);
  }
};

// Schedule a control time timer
export const scheduleControlTime = (id, eta, gracePeriod, callback) => {
  const now = Date.now();
  const delay = eta - now;

  if (delay <= 0) {
    // Already past the ETA, trigger immediately
    callback();
    return;
  }

  scheduleTimer(id, delay, callback, gracePeriod);
  saveActiveTimers();
};

// Internal timer scheduling
const scheduleTimer = (id, delay, callback, gracePeriod) => {
  // Clear any existing timer for this ID
  clearTimer(id);

  const timerId = BackgroundTimer.setTimeout(() => {
    // Control time reached - trigger callback
    callback();

    // Schedule grace period timer
    if (gracePeriod > 0) {
      const graceTimerId = BackgroundTimer.setTimeout(() => {
        // Grace period expired - auto-send SOS
        handleGracePeriodExpired(id);
      }, gracePeriod);

      activeTimers.set(`${id}_grace`, graceTimerId);
    }

    // Remove the main timer
    activeTimers.delete(id);
    saveActiveTimers();
  }, delay);

  activeTimers.set(id, { timerId, eta: Date.now() + delay, callback, gracePeriod });
};

// Handle grace period expiration
const handleGracePeriodExpired = async (controlId) => {
  // TODO: Integrate with SosContext to auto-send SOS
  console.log(`Grace period expired for control time ${controlId} - auto-SOS should be sent`);

  // Remove grace timer
  activeTimers.delete(`${controlId}_grace`);
  saveActiveTimers();
};

// Clear a specific control time timer
export const clearControlTime = (id) => {
  clearTimer(id);
  clearTimer(`${id}_grace`); // Also clear grace period timer
  saveActiveTimers();
};

// Internal timer clearing
const clearTimer = (id) => {
  const timerData = activeTimers.get(id);
  if (timerData) {
    if (typeof timerData === 'number') {
      BackgroundTimer.clearTimeout(timerData);
    } else if (timerData.timerId) {
      BackgroundTimer.clearTimeout(timerData.timerId);
    }
    activeTimers.delete(id);
  }
};

// Clear all active timers
export const clearAllControlTimers = () => {
  for (const [id, timerData] of activeTimers) {
    if (typeof timerData === 'number') {
      BackgroundTimer.clearTimeout(timerData);
    } else if (timerData.timerId) {
      BackgroundTimer.clearTimeout(timerData.timerId);
    }
  }
  activeTimers.clear();
  AsyncStorage.removeItem(STORAGE_KEY_TIMERS);
};

// Save active timers to storage for persistence
const saveActiveTimers = async () => {
  try {
    const timersData = {};
    for (const [id, timerData] of activeTimers) {
      if (typeof timerData === 'object' && timerData.eta) {
        timersData[id] = {
          eta: timerData.eta,
          callback: timerData.callback ? timerData.callback.toString() : null,
          gracePeriod: timerData.gracePeriod,
        };
      }
    }
    await AsyncStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify(timersData));
  } catch (error) {
    console.warn('Error saving active timers:', error);
  }
};

// Get active timers info (for debugging)
export const getActiveTimers = () => {
  const timers = [];
  for (const [id, timerData] of activeTimers) {
    timers.push({
      id,
      eta: typeof timerData === 'object' ? timerData.eta : null,
      hasCallback: typeof timerData === 'object' ? !!timerData.callback : false,
    });
  }
  return timers;
};

// Snooze control time (extend by specified minutes)
export const snoozeControlTime = (id, minutes = 15) => {
  const timerData = activeTimers.get(id);
  if (timerData && timerData.eta) {
    const newEta = timerData.eta + (minutes * 60 * 1000);
    clearTimer(id);
    scheduleTimer(id, newEta - Date.now(), timerData.callback, timerData.gracePeriod);
    saveActiveTimers();
    return newEta;
  }
  return null;
};