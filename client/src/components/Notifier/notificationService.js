import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase-config';
import axios from 'axios';

class NotificationService {
  constructor() {
    if (!NotificationService.instance) {
      this.vapidKey = 'BLsM4lm3Cz1OksEhwXvMR-NJMfvG_AV5oFL2eYy-S2sUfntzxDDHzYo4vDX3j1tzjqqRdEkRMMvxtqYueidE1v4';
      this.baseURL = process.env.REACT_APP_API_URL || 'https://api.sraws.com';
      NotificationService.instance = this;

      this.initialize();
    }
    return NotificationService.instance;
  }
  async initialize() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.setupToken();
        this.setupForegroundListener();
      }
    }
  }
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.setupToken();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  async setupToken() {
    try {
      if (!messaging) {
        console.error('Messaging is not initialized');
        return null;
      }

      const currentToken = await getToken(messaging, {
        vapidKey: this.vapidKey
      });

      if (currentToken) {
        const userId = localStorage.getItem('userId');
        if (userId) {
          await this.sendTokenToServer(currentToken);
          localStorage.setItem('fcmToken', currentToken);
        }
        return currentToken;
      }
      
      console.warn('No FCM token available');
      return null;
    } catch (error) {
      console.error('Token setup error:', error);
      return null;
    }
  }
  async sendTokenToServer(token) {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      await axios.post(`${this.baseURL}/api/notifications/register-device`, {
        userId,
        token,
        deviceType: 'web',
        platform: navigator.userAgent
      });
    } catch (error) {
      console.error('Token registration error:', error);
    }
  }

  async subscribeToTopic(token, topic) {
    try {
      await axios.post(`${this.baseURL}/api/notifications/subscribe-topic`, {
        token,
        topic
      });
    } catch (error) {
      console.error('Topic subscription error:', error);
    }
  }

  setupForegroundListener(callback) {
    if (!messaging) {
      console.error('Messaging is not initialized');
      return;
    }

    onMessage(messaging, (payload) => {
      this.showNotification(payload);
      if (callback) callback(payload);
    });
  }

  showNotification(payload) {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      return;
    }

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      data: payload.data,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(notificationTitle, notificationOptions);
      });
    } else {
      new Notification(notificationTitle, notificationOptions);
    }
  }
}


export default NotificationService;