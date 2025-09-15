import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';


export const configureNotifications = () => {
  PushNotification.configure({
    
    onRegister: function (token) {
      console.log('TOKEN:', token);
    },

    
    onNotification: function (notification) {
      console.log('NOTIFICATION:', notification);

      
      if (notification.userInteraction) {
        handleNotificationTap(notification);
      }
    },

    
    senderID: 'YOUR_FCM_SENDER_ID', 

    
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    
    popInitialNotification: true,

    
    requestPermissions: Platform.OS === 'ios',
  });

  
  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'emergency-channel',
        channelName: 'Emergency Alerts',
        channelDescription: 'Notifications for emergency alerts and control times',
        playSound: true,
        soundName: 'default',
        importance: 4, 
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
      ongoing: true, 
    }
  );
};


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


const handleNotificationTap = (notification) => {
  const { userInfo } = notification;

  switch (userInfo?.type) {
    case 'control_time':
      
      console.log('Control time notification tapped:', userInfo.controlId);
      
      break;

    case 'emergency_sent':
      
      console.log('Emergency sent notification tapped:', userInfo.alertId);
      
      break;

    case 'alert_queued':
      
      console.log('Queued alert notification tapped');
      
      break;

    default:
      console.log('Unknown notification type:', userInfo?.type);
  }
};


export const cancelNotification = (notificationId) => {
  PushNotification.cancelLocalNotification(notificationId);
};


export const cancelAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
};


export const checkNotificationPermissions = async () => {
  return new Promise((resolve) => {
    PushNotification.checkPermissions((permissions) => {
      resolve(permissions);
    });
  });
};


export const requestNotificationPermissions = async () => {
  return new Promise((resolve) => {
    PushNotification.requestPermissions().then((permissions) => {
      resolve(permissions);
    });
  });
};


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