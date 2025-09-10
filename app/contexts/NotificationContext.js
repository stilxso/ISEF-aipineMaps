// тут импортируем хуки для контекста уведомлений
import { createContext, useContext, useEffect, useState } from 'react';
// здесь подключаем функции для работы с уведомлениями
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

// создаем контекст для уведомлений
const NotificationContext = createContext();

// провайдер для управления уведомлениями
export function NotificationProvider({ children }) {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // тут инициализируем уведомления при старте
  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      // Configure push notifications
      configureNotifications();

      // Check permissions
      const permissions = await checkNotificationPermissions();
      setPermissionsGranted(permissions.alert && permissions.badge && permissions.sound);

      setIsInitialized(true);
    } catch (error) {
      console.warn('Error initializing notifications:', error);
      setIsInitialized(true); // Still mark as initialized even on error
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