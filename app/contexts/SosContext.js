import { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useLocation } from './LocationContext';
import { sendAlert, flushQueue } from '../services/emergency';
import { scheduleControlTime, clearControlTime } from '../services/controlTime';
import { showLocalNotification } from '../utils/notification';

const SosContext = createContext();

const STORAGE_KEYS = {
  CONTROL_TIMES: 'controlTimes',
  ALERTS_HISTORY: 'alertsHistory',
  PENDING_ALERTS: 'pendingAlerts',
};

export function SosProvider({ children }) {
  const [controlTimes, setControlTimes] = useState([]);
  const [pendingAlerts, setPendingAlerts] = useState([]);
  const [alertsHistory, setAlertsHistory] = useState([]);
  const { currentLocation, heading, speed, accuracy } = useLocation();
  const isOnlineRef = useRef(true);

  // тут загружаем данные из хранилища при старте
  useEffect(() => {
    loadStoredData();
  }, []);

  // здесь отслеживаем подключение к сети
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = isOnlineRef.current;
      isOnlineRef.current = state.isConnected;

      // если вернулось подключение, отправляем отложенные алерты
      if (!wasOnline && state.isConnected) {
        queueFlush();
      }
    });

    return unsubscribe;
  }, []);

  const loadStoredData = async () => {
    try {
      const [controlTimesData, historyData, pendingData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CONTROL_TIMES),
        AsyncStorage.getItem(STORAGE_KEYS.ALERTS_HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.PENDING_ALERTS),
      ]);

      if (controlTimesData) setControlTimes(JSON.parse(controlTimesData));
      if (historyData) setAlertsHistory(JSON.parse(historyData));
      if (pendingData) setPendingAlerts(JSON.parse(pendingData));
    } catch (error) {
      console.warn('Error loading SOS data:', error);
    }
  };

  const saveControlTimes = async (times) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONTROL_TIMES, JSON.stringify(times));
    } catch (error) {
      console.warn('Error saving control times:', error);
    }
  };

  const saveAlertsHistory = async (history) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ALERTS_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.warn('Error saving alerts history:', error);
    }
  };

  const savePendingAlerts = async (pending) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ALERTS, JSON.stringify(pending));
    } catch (error) {
      console.warn('Error saving pending alerts:', error);
    }
  };

  const scheduleControl = async (routeId, eta, options = {}) => {
    const controlTime = {
      id: Date.now().toString(),
      routeId,
      eta: new Date(eta).getTime(),
      gracePeriod: options.gracePeriod || 5 * 60 * 1000, // 5 minutes default
      contacts: options.contacts || [],
      createdAt: Date.now(),
      acknowledged: false,
    };

    const newControlTimes = [...controlTimes, controlTime];
    setControlTimes(newControlTimes);
    await saveControlTimes(newControlTimes);

    // Schedule the timer
    scheduleControlTime(controlTime.id, controlTime.eta, controlTime.gracePeriod, () => {
      handleControlTimeReached(controlTime);
    });

    return controlTime;
  };

  const acknowledgeControl = async (controlId) => {
    const updatedTimes = controlTimes.map(ct =>
      ct.id === controlId ? { ...ct, acknowledged: true } : ct
    );
    setControlTimes(updatedTimes);
    await saveControlTimes(updatedTimes);

    // Clear the timer
    clearControlTime(controlId);
  };

  const handleControlTimeReached = (controlTime) => {
    // тут показываем локальное уведомление
    showLocalNotification(
      'Control Time Reached',
      'Your control time has been reached. Please confirm you are safe.',
      { controlId: controlTime.id }
    );

    // EmergencyToast покажется при тапе на уведомление
  };

  const sendSOS = async (payload = {}) => {
    const alertData = {
      id: Date.now().toString(),
      userId: 'currentUser', // тут потом взять из контекста авторизации
      routeId: payload.routeId,
      timestamp: Date.now(),
      location: {
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        altitude: currentLocation?.altitude,
        accuracy,
        heading,
        speed,
      },
      routeExcerpt: payload.routeExcerpt || [],
      plannedRoute: payload.plannedRoute || {},
      contacts: payload.contacts || [],
      batteryLevel: payload.batteryLevel,
      ...payload,
    };

    // Add to pending alerts
    const newPending = [...pendingAlerts, alertData];
    setPendingAlerts(newPending);
    await savePendingAlerts(newPending);

    // Try to send immediately if online
    if (isOnlineRef.current) {
      try {
        await sendAlert(alertData);
        // Success: move to history
        const newHistory = [alertData, ...alertsHistory];
        setAlertsHistory(newHistory);
        await saveAlertsHistory(newHistory);

        // Remove from pending
        const updatedPending = pendingAlerts.filter(a => a.id !== alertData.id);
        setPendingAlerts(updatedPending);
        await savePendingAlerts(updatedPending);

        return { success: true, message: 'Alert sent successfully' };
      } catch (error) {
        console.warn('Failed to send alert:', error);
        return { success: false, message: 'Failed to send, queued for later' };
      }
    } else {
      return { success: false, message: 'Offline, alert queued' };
    }
  };

  const queueFlush = async () => {
    if (!isOnlineRef.current || pendingAlerts.length === 0) return;

    const results = await flushQueue(pendingAlerts);

    // Move successfully sent alerts to history
    const sentIds = results.filter(r => r.success).map(r => r.id);
    const sentAlerts = pendingAlerts.filter(a => sentIds.includes(a.id));

    if (sentAlerts.length > 0) {
      const newHistory = [...sentAlerts, ...alertsHistory];
      setAlertsHistory(newHistory);
      await saveAlertsHistory(newHistory);

      const remainingPending = pendingAlerts.filter(a => !sentIds.includes(a.id));
      setPendingAlerts(remainingPending);
      await savePendingAlerts(remainingPending);
    }
  };

  const clearHistory = async () => {
    setAlertsHistory([]);
    await saveAlertsHistory([]);
  };

  const clearPending = async () => {
    setPendingAlerts([]);
    await savePendingAlerts([]);
  };

  return (
    <SosContext.Provider value={{
      controlTimes,
      pendingAlerts,
      alertsHistory,
      scheduleControl,
      acknowledgeControl,
      sendSOS,
      queueFlush,
      clearHistory,
      clearPending,
    }}>
      {children}
    </SosContext.Provider>
  );
}

export const useSos = () => useContext(SosContext);