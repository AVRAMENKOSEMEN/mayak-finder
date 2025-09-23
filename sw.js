// Service Worker для PWA
const CACHE_NAME = 'mayak-finder-v1.4';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  console.log('[Service Worker] Установлен');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[Service Worker] Кэширование файлов');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('[Service Worker] Все файлы закэшированы');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Активирован');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Удаляем старый кэш', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('[Service Worker] Активация завершена');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Пропускаем запросы к иконкам с внешних сайтов
  if (event.request.url.includes('icons8.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Возвращаем из кэша если есть
        if (response) {
          return response;
        }
        
        // Иначе загружаем из сети
        return fetch(event.request)
          .then(function(response) {
            // Кэшируем только успешные ответы
            if (response && response.status === 200 && response.type === 'basic') {
              var responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(function(error) {
            console.log('[Service Worker] Ошибка загрузки:', error);
          });
      })
  );
});
