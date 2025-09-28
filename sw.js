const CACHE_NAME = 'mayak-finder-v5';
const urlsToCache = [
  './',
  './index.html',
  './map.html',
  './offline.html',
  './style.css',
  './script.js',
  './settings.js',
  './history-manager.js',
  './manifest.json'
];

const externalResources = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        return caches.open(CACHE_NAME + '-external');
      })
      .then(function(cache) {
        return cache.addAll(externalResources);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME && cacheName !== CACHE_NAME + '-external') {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }

        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        return fetch(event.request).catch(function() {
          if (event.request.destination === 'image') {
            return new Response(
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          return new Response('', { status: 404 });
        });
      })
  );
});
