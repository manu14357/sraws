importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD3CL4Z-baSWV8aYwcLbCVuMfFpHiPqrE4",
  authDomain: "smartdoc-fd636.firebaseapp.com",
  projectId: "smartdoc-fd636",
  storageBucket: "smartdoc-fd636.appspot.com",
  messagingSenderId: "838582007891",
  appId: "1:838582007891:web:7e8f311d8f6735cfcaaea6",
  measurementId: "G-9SVP27RYSS"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
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

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('notification-cache').then((cache) => {
      return cache.addAll([
        '/notification-icon.png',
        '/notification-badge.png'
      ]);
    })
  );
});

// Add notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    const urlToOpen = event.notification.data.url || '/notifications';
    
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
    );
  }
});