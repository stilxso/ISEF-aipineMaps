import { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useLocation } from './LocationContext';
import { sendAlert, flushQueue } from '../services/emergency';
import { scheduleControlTime, clearControlTime, setSosCallback } from '../services/controlTime';
import { showLocalNotification } from '../utils/notification';

const API_BASE_URL = 'https://api.aipinemaps.com'; 

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

  
  useEffect(() => {
    loadStoredData();
    
    console.log('[SOS] Setting up SOS callback for auto-SOS functionality');
    setSosCallback(async (payload) => {
      console.log('[SOS] Auto-SOS callback triggered:', payload);
      const result = await sendSOS(payload);
      console.log('[SOS] Auto-SOS result:', result);
      return result;
    });
  }, [sendSOS]);

  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = isOnlineRef.current;
      isOnlineRef.current = state.isConnected;

      
      if (!wasOnline && state.isConnected) {
        queueFlush();
      }
    });

    return unsubscribe;
  }, [queueFlush]);

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
      gracePeriod: options.gracePeriod || 5 * 60 * 1000, 
      contacts: options.contacts || [],
      createdAt: Date.now(),
      acknowledged: false,
    };

    const newControlTimes = [...controlTimes, controlTime];
    setControlTimes(newControlTimes);
    await saveControlTimes(newControlTimes);

    
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

    
    clearControlTime(controlId);
  };

  const handleControlTimeReached = async (controlTime) => {
    console.log('[SOS] Control time reached for:', controlTime.id);

    
    showLocalNotification(
      'Control Time Reached',
      'Your control time has been reached. Please confirm you are safe.',
      { controlId: controlTime.id }
    );

    
    try {
      const alertData = {
        controlTimeId: controlTime.id,
        routeId: controlTime.routeId,
        batteryLevel: 50, 
        terrainDifficulty: 2 
      };

      
      console.log('[SOS] Creating checkin missed alert with data:', alertData);

      const response = await fetch(`${API_BASE_URL}/api/alerts/checkin-missed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify(alertData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[SOS] Checkin missed alert created successfully:', {
          alertId: result._id,
          riskAssessment: result.riskAssessment,
          predictedLocation: result.predictedLocation
        });
      } else {
        const errorText = await response.text();
        console.error('[SOS] Failed to create checkin missed alert:', response.status, errorText);
      }
    } catch (error) {
      console.warn('Error creating checkin missed alert:', error);
    }

    
  };

  const sendSOS = async (payload = {}) => {
    const alertData = {
      location: {
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        altitude: currentLocation?.altitude,
        accuracy,
        heading,
        speed,
      },
      routeId: payload.routeId,
      batteryLevel: payload.batteryLevel || 50,
      terrainDifficulty: payload.terrainDifficulty || 2,
      ...payload,
    };

    console.log('[SOS] Sending SOS alert with data:', {
      location: alertData.location,
      batteryLevel: alertData.batteryLevel,
      terrainDifficulty: alertData.terrainDifficulty,
      routeId: alertData.routeId
    });

    
    const newPending = [...pendingAlerts, { ...alertData, id: Date.now().toString(), timestamp: Date.now() }];
    setPendingAlerts(newPending);
    await savePendingAlerts(newPending);

    
    if (isOnlineRef.current) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/alerts/sos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            
          },
          body: JSON.stringify(alertData)
        });

        if (response.ok) {
          const result = await response.json();

          console.log('[SOS] SOS alert sent successfully:', {
            alertId: result._id,
            riskAssessment: result.riskAssessment,
            predictedLocation: result.predictedLocation
          });

          
          const newHistory = [{ ...alertData, id: result.id, serverId: result._id }, ...alertsHistory];
          setAlertsHistory(newHistory);
          await saveAlertsHistory(newHistory);

          
          const updatedPending = pendingAlerts.filter(a => a.id !== alertData.id);
          setPendingAlerts(updatedPending);
          await savePendingAlerts(updatedPending);

          return { success: true, message: 'Alert sent successfully with ML predictions' };
        } else {
          const errorText = await response.text();
          console.error('[SOS] Failed to send SOS alert:', response.status, errorText);
          throw new Error('Failed to send alert');
        }
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