// public/service-worker.js

self.addEventListener('push', (event) => {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/srawslogo.png',
      badge: '/srawslogo.png',
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };
  
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  });
  
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
  
    if (event.action === 'view') {
      event.waitUntil(
        clients.openWindow(data.url)
      );
    }
  });