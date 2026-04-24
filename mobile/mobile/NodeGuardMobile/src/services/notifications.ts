import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NOTIFICATION_CONFIG } from '../constants/config';
import { AlertNotification } from '../types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: NOTIFICATION_CONFIG.CRITICAL_ALERT_SOUND,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return;
      }

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('security-alerts', {
      name: 'Security Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: NOTIFICATION_CONFIG.VIBRATION_PATTERN,
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync('incidents', {
      name: 'Incident Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('system', {
      name: 'System Notifications',
      importance: Notifications.AndroidImportance.LOW,
    });
  }

  async scheduleSecurityAlert(notification: AlertNotification): Promise<string | null> {
    try {
      await this.initialize();

      const channelId = this.getChannelForSeverity(notification.severity);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🚨 ${notification.title}`,
          body: notification.message,
          data: {
            incidentId: notification.incidentId,
            alertId: notification.id,
            severity: notification.severity,
          },
          sound: notification.severity === 'critical',
          priority: notification.severity === 'critical' 
            ? Notifications.AndroidNotificationPriority.HIGH 
            : Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Show immediately
        identifier: notification.id,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule security alert:', error);
      return null;
    }
  }

  async scheduleIncidentUpdate(
    incidentId: string,
    title: string,
    message: string,
    severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string | null> {
    try {
      await this.initialize();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📋 ${title}`,
          body: message,
          data: {
            incidentId,
            type: 'incident_update',
            severity,
          },
        },
        trigger: null,
        identifier: `incident_${incidentId}_${Date.now()}`,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule incident update:', error);
      return null;
    }
  }

  async scheduleSystemNotification(
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<string | null> {
    try {
      await this.initialize();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚙️ ${title}`,
          body: message,
          data: {
            type: 'system',
            ...data,
          },
        },
        trigger: null,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule system notification:', error);
      return null;
    }
  }

  private getChannelForSeverity(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'security-alerts';
      case 'medium':
      case 'low':
        return 'incidents';
      default:
        return 'system';
    }
  }

  async clearNotification(identifier: string): Promise<void> {
    try {
      await Notifications.dismissNotificationAsync(identifier);
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  }

  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  async getPushToken(): Promise<string | null> {
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  // Set up notification listeners
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}

export const notificationService = new NotificationService();
export default notificationService;