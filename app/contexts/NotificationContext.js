
import { createContext, useContext, useEffect, useState } from 'react';

import {
  configureNotifications,
  showLocalNotification,
  showControlTimeNotification,
  showEmergencyNotification,
  showQueuedNotification,
  cancelNotification,
  cancelAllNotifications,
  checkNotificationPermissions,
  requestNotificationPermissions,
} from '../utils/notification';


const NotificationContext = createContext();


export function NotificationProvider({ children }) {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  
  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      
      configureNotifications();

      
      const permissions = await checkNotificationPermissions();
      setPermissionsGranted(permissions.alert && permissions.badge && permissions.sound);

      setIsInitialized(true);
    } catch (error) {
      console.warn('Error initializing notifications:', error);
      setIsInitialized(true); 
    }
  };

  const requestPermissions = async () => {
    try {
      const permissions = await requestNotificationPermissions();
      const granted = permissions.alert && permissions.badge && permissions.sound;
      setPermissionsGranted(granted);
      return granted;
    } catch (error) {
      console.warn('Error requesting notification permissions:', error);
      return false;
    }
  };

  const showControlTimeAlert = (controlId, eta, gracePeriod) => {
    if (!permissionsGranted) return null;

    return showControlTimeNotification(controlId, eta, gracePeriod);
  };

  const showEmergencyAlert = (alertData) => {
    if (!permissionsGranted) return null;

    return showEmergencyNotification(alertData);
  };

  const showQueuedAlert = (count) => {
    if (!permissionsGranted) return null;

    return showQueuedNotification(count);
  };

  const showCustomNotification = (title, message, data = {}, options = {}) => {
    if (!permissionsGranted) return null;

    return showLocalNotification(title, message, data, options);
  };

  return (
    <NotificationContext.Provider value={{
      permissionsGranted,
      isInitialized,
      requestPermissions,
      showControlTimeAlert,
      showEmergencyAlert,
      showQueuedAlert,
      showCustomNotification,
      cancelNotification,
      cancelAllNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);