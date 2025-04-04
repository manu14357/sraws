self.addEventListener('push', (event) => {
    const data = event.data.json();
  
    const options = {
      body: data.message,
      icon: '/icon.png', // Replace with your app's icon
      badge: '/badge.png', // Replace with your app's badge
      data: {
        url: data.url || '/', // Redirect URL on click
      },
    };
  
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  });
  
  // Handle Notification Click
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
  
    // Redirect to the specified URL
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  });