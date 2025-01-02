// src/components/Notifications.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PUBLIC_VAPID_KEY = 'BP9wdWbVzvoYP4hDmxIKO-StWyrfg82AecbeCAp9-vaKWfvMEgyRIgwMqTlZFk9Ihwtuo-7In8sx-x-rspWvKZQ'; // Replace with your VAPID public key

const Notifications = ({ userId }) => {
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  const subscribeUser = async () => {
    if (permission !== 'granted') {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') {
        console.log('Permission not granted for notifications');
        return;
      }
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });

    // Send subscription to the backend
    await axios.post('/api/notifications/subscribe', {
      userId,
      subscription,
    });

    console.log('User is subscribed:', subscription);
  };

  return (
    <button onClick={subscribeUser}>
      {permission === 'granted' ? 'Enable Notifications' : 'Subscribe to Notifications'}
    </button>
  );
};

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default Notifications;