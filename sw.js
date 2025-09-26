// Простой Service Worker для PWA
const CACHE_NAME = 'mayak-finder-map-v1';

self.addEventListener('install', function(event) {
  self.skipWaiting();
  console.log('Service Worker установлен');
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
  console.log('Service Worker активирован');
});

self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
