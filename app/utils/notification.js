import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

// Configure push notifications
export const configureNotifications = () => {
  PushNotification.configure({
    // Called when token is generated
    onRegister: function (token) {
      console.log('TOKEN:', token);
    },

    // Called when a remote or local notification is opened or received
    onNotification: function (notification) {
      console.log('NOTIFICATION:', notification);

      // Handle notification tap
      if (notification.userInteraction) {
        handleNotificationTap(notification);
      }
    },

    // Android only: GCM or FCM Sender ID
    senderID: 'YOUR_FCM_SENDER_ID', // TODO: Configure this

    // iOS only
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    // Should the initial notification be popped automatically
    popInitialNotification: true,

    // Default notification properties
    requestPermissions: Platform.OS === 'ios',
  });

  // Create notification channel for Android
  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'emergency-channel',
        channelName: 'Emergency Alerts',
        channelDescription: 'Notifications for emergency alerts and control times',
        playSound: true,
        soundName: 'default',
        importance: 4, // High importance
        vibrate: true,
      },
      (created) => console.log(`Emergency channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'control-time-channel',
        channelName: 'Control Time Alerts',
        channelDescription: 'Notifications for control time reminders',
        playSound: true,
        soundName: 'default',
        importance: 3,
        vibrate: true,
      },
      (created) => console.log(`Control time channel created: ${created}`)
    );
  }
};

// Show local notification
export const showLocalNotification = (
  title,
  message,
  data = {},
  options = {}
) => {
  const notificationId = data.id || Date.now().toString();

  PushNotification.localNotification({
    id: notificationId,
    title,
    message,
    playSound: options.playSound !== false,
    soundName: options.soundName || 'default',
    vibrate: options.vibrate !== false,
    vibration: 1000,
    channelId: options.channelId || 'emergency-channel',
    userInfo: data,
    ...options,
  });

  return notificationId;
};

// Show control time notification
export const showControlTimeNotification = (controlId, eta, gracePeriod) => {
  const etaDate = new Date(eta);
  const message = `Control time reached at ${etaDate.toLocaleTimeString()}. Please confirm you are safe.`;

  return showLocalNotification(
    'Control Time Alert',
    message,
    {
      type: 'control_time',
      controlId,
      eta,
      gracePeriod,
    },
    {
      channelId: 'control-time-channel',
      ongoing: true, // Can't be dismissed until acknowledged
    }
  );
};

// Show emergency alert notification
export const showEmergencyNotification = (alertData) => {
  const message = alertData.location
    ? `Emergency alert sent from location: ${alertData.location.latitude.toFixed(4)}, ${alertData.location.longitude.toFixed(4)}`
    : 'Emergency alert sent';

  return showLocalNotification(
    'Emergency Alert Sent',
    message,
    {
      type: 'emergency_sent',
      alertId: alertData.id,
      timestamp: alertData.timestamp,
    },
    {
      channelId: 'emergency-channel',
      autoCancel: true,
    }
  );
};

// Show queued alert notification
export const showQueuedNotification = (alertCount) => {
  const message = `${alertCount} emergency alert${alertCount > 1 ? 's' : ''} queued for sending when online.`;

  return showLocalNotification(
    'Alert Queued',
    message,
    {
      type: 'alert_queued',
      count: alertCount,
    },
    {
      channelId: 'emergency-channel',
      autoCancel: true,
    }
  );
};

// Handle notification tap
const handleNotificationTap = (notification) => {
  const { userInfo } = notification;

  switch (userInfo?.type) {
    case 'control_time':
      // Navigate to emergency screen or show modal
      console.log('Control time notification tapped:', userInfo.controlId);
      // TODO: Navigate to appropriate screen
      break;

    case 'emergency_sent':
      // Navigate to alerts history
      console.log('Emergency sent notification tapped:', userInfo.alertId);
      // TODO: Navigate to alerts screen
      break;

    case 'alert_queued':
      // Navigate to queue status
      console.log('Queued alert notification tapped');
      // TODO: Navigate to queue screen
      break;

    default:
      console.log('Unknown notification type:', userInfo?.type);
  }
};

// Cancel specific notification
export const cancelNotification = (notificationId) => {
  PushNotification.cancelLocalNotification(notificationId);
};

// Cancel all notifications
export const cancelAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
};

// Get notification permissions status
export const checkNotificationPermissions = async () => {
  return new Promise((resolve) => {
    PushNotification.checkPermissions((permissions) => {
      resolve(permissions);
    });
  });
};

// Request notification permissions
export const requestNotificationPermissions = async () => {
  return new Promise((resolve) => {
    PushNotification.requestPermissions().then((permissions) => {
      resolve(permissions);
    });
  });
};

// Schedule a delayed notification
export const scheduleNotification = (
  title,
  message,
  date,
  data = {},
  options = {}
) => {
  const notificationId = data.id || Date.now().toString();

  PushNotification.localNotificationSchedule({
    id: notificationId,
    title,
    message,
    date,
    playSound: options.playSound !== false,
    soundName: options.soundName || 'default',
    vibrate: options.vibrate !== false,
    vibration: 1000,
    channelId: options.channelId || 'emergency-channel',
    userInfo: data,
    ...options,
  });

  return notificationId;
};