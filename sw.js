// Service Worker для оффлайн работы
const CACHE_NAME = 'mayak-finder-offline-v1';
const urlsToCache = [
  './',
  './index.html',
  './navigator.html',
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
 self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Всегда возвращаем из кэша если есть
        if (response) {
          return response;
        }
        
        // Если нет в кэше и нет интернета - показываем оффлайн страницу
        if (!navigator.onLine) {
          return caches.match('./offline.html');
        }
        
        // Если есть интернет - загружаем из сети
        return fetch(event.request);
      })
  );
});

