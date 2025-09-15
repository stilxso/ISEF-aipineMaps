import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const STORAGE_KEY_TIMERS = 'activeControlTimers';
let activeTimers = new Map();
let sosCallback = null;
let appStateSubscription = null;


export const setSosCallback = (callback) => {
  sosCallback = callback;
};


const initializeAppStateListener = () => {
  if (appStateSubscription) {
    appStateSubscription.remove();
  }

  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      
      checkExpiredTimers();
    }
  });
};


const checkExpiredTimers = () => {
  const now = Date.now();
  for (const [id, timerData] of activeTimers) {
    if (timerData.eta <= now && !timerData.expired) {
      timerData.expired = true;
      if (timerData.callback) {
        timerData.callback();
      }

      
      if (timerData.gracePeriod > 0) {
        const graceTimer = setTimeout(() => {
          handleGracePeriodExpired(id);
        }, timerData.gracePeriod);

        activeTimers.set(`${id}_grace`, {
          timerId: graceTimer,
          eta: now + timerData.gracePeriod,
          callback: null,
          gracePeriod: 0,
          expired: false
        });
      }
    }
  }
  saveActiveTimers();
};


export const initializeControlTimers = async () => {
  try {
    initializeAppStateListener();

    const storedTimers = await AsyncStorage.getItem(STORAGE_KEY_TIMERS);
    if (storedTimers) {
      const timersData = JSON.parse(storedTimers);
      const now = Date.now();

      
      for (const [id, timerData] of Object.entries(timersData)) {
        if (timerData.eta > now) {
          const delay = timerData.eta - now;
          scheduleTimer(id, delay, timerData.callback, timerData.gracePeriod);
        } else {
          
          if (timerData.callback) {
            
            setTimeout(() => timerData.callback(), 100);
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error initializing control timers:', error);
  }
};


export const scheduleControlTime = (id, eta, gracePeriod, callback) => {
  const now = Date.now();
  const delay = eta - now;

  if (delay <= 0) {
    
    callback();
    return;
  }

  scheduleTimer(id, delay, callback, gracePeriod);
  saveActiveTimers();
};


const scheduleTimer = (id, delay, callback, gracePeriod) => {
  
  clearTimer(id);

  const timerId = setTimeout(() => {
    
    callback();

    
    if (gracePeriod > 0) {
      const graceTimerId = setTimeout(() => {
        
        handleGracePeriodExpired(id);
      }, gracePeriod);

      activeTimers.set(`${id}_grace`, {
        timerId: graceTimerId,
        eta: Date.now() + gracePeriod,
        callback: null,
        gracePeriod: 0,
        expired: false
      });
    }

    
    activeTimers.delete(id);
    saveActiveTimers();
  }, delay);

  activeTimers.set(id, {
    timerId,
    eta: Date.now() + delay,
    callback,
    gracePeriod,
    expired: false
  });
};


const handleGracePeriodExpired = async (controlId) => {
  console.log(`[CONTROL] Grace period expired for control time ${controlId} - auto-SOS should be sent`);

  
  try {
    if (sosCallback) {
      console.log(`[CONTROL] Triggering auto-SOS for control time ${controlId}`);
      await sosCallback({
        autoSOS: true,
        controlTimeId: controlId,
        reason: 'grace_period_expired'
      });
      console.log(`[CONTROL] Auto-SOS triggered successfully for control time ${controlId}`);
    } else {
      console.warn(`[CONTROL] No SOS callback set for auto-SOS on control time ${controlId}`);
    }
  } catch (error) {
    console.error(`[CONTROL] Error auto-sending SOS for control time ${controlId}:`, error);
  }

  
  activeTimers.delete(`${controlId}_grace`);
  saveActiveTimers();
};


export const clearControlTime = (id) => {
  clearTimer(id);
  clearTimer(`${id}_grace`); 
  saveActiveTimers();
};


const clearTimer = (id) => {
  const timerData = activeTimers.get(id);
  if (timerData) {
    if (typeof timerData === 'number') {
      clearTimeout(timerData);
    } else if (timerData.timerId) {
      clearTimeout(timerData.timerId);
    }
    activeTimers.delete(id);
  }
};


export const clearAllControlTimers = () => {
  for (const [id, timerData] of activeTimers) {
    if (typeof timerData === 'number') {
      clearTimeout(timerData);
    } else if (timerData.timerId) {
      clearTimeout(timerData.timerId);
    }
  }
  activeTimers.clear();
  AsyncStorage.removeItem(STORAGE_KEY_TIMERS);

  
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};


const saveActiveTimers = async () => {
  try {
    const timersData = {};
    for (const [id, timerData] of activeTimers) {
      if (typeof timerData === 'object' && timerData.eta && !timerData.expired) {
        timersData[id] = {
          eta: timerData.eta,
          gracePeriod: timerData.gracePeriod || 0,
          
          
        };
      }
    }
    await AsyncStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify(timersData));
  } catch (error) {
    console.warn('Error saving active timers:', error);
  }
};


export const getActiveTimers = () => {
  const timers = [];
  for (const [id, timerData] of activeTimers) {
    timers.push({
      id,
      eta: typeof timerData === 'object' ? timerData.eta : null,
      hasCallback: typeof timerData === 'object' ? !!timerData.callback : false,
      expired: typeof timerData === 'object' ? timerData.expired : false,
      gracePeriod: typeof timerData === 'object' ? timerData.gracePeriod : 0,
    });
  }
  return timers;
};


export const snoozeControlTime = (id, minutes = 15) => {
  const timerData = activeTimers.get(id);
  if (timerData && timerData.eta && timerData.callback) {
    const newEta = timerData.eta + (minutes * 60 * 1000);
    clearTimer(id);
    scheduleTimer(id, newEta - Date.now(), timerData.callback, timerData.gracePeriod);
    saveActiveTimers();
    return newEta;
  }
  return null;
};