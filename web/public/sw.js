self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline-cache').then((cache) => {
      // Basic assets to cache
      return cache.addAll([
        '/',
        '/dashboard',
        '/fleet',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Fallback for document requests
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/dashboard');
        }
      });
    })
  );
});
