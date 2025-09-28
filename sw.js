// Service Worker для полной оффлайн работы - ПОЛНАЯ ВЕРСИЯ
const CACHE_NAME = 'mayak-finder-offline-v4';
const urlsToCache = [
  './',
  './index.html',
  './map.html',
  './navigator.html',
  './offline.html',
  './style.css',
  './script.js',
  './manifest.json',
  
  // ВАЖНО: добавляем все наши скрипты
  './settings.js',
  './voice-guidance.js', 
  './history-manager.js',
  './notifications.js',
  './offline-maps.js'
];

const externalResources = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Кэширование всех файлов приложения...');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        return caches.open(CACHE_NAME + '-external');
      })
      .then(function(cache) {
        console.log('Кэширование внешних ресурсов...');
        return cache.addAll(externalResources);
      })
      .then(() => {
        console.log('✅ Все ресурсы закэшированы для оффлайн работы');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Ошибка кэширования:', error);
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME && cacheName !== CACHE_NAME + '-external') {
            console.log('Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker активирован');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Возвращаем из кэша если есть
        if (response) {
          return response;
        }

        // Для навигационных запросов
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        // Пробуем сеть
        return fetch(event.request)
          .then(function(networkResponse) {
            // Кэшируем успешные ответы
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME + '-external')
                .then(function(cache) {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch(function() {
            // Обработка оффлайн режима
            if (event.request.destination === 'style') {
              return new Response('', { 
                status: 200, 
                headers: { 'Content-Type': 'text/css' } 
              });
            }
            
            if (event.request.destination === 'script') {
              return new Response('console.log("Оффлайн режим");', { 
                status: 200, 
                headers: { 'Content-Type': 'application/javascript' } 
              });
            }
            
            if (event.request.destination === 'image') {
              return new Response(
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            
            return new Response('Оффлайн режим', { 
              status: 200, 
              statusText: 'Offline' 
            });
          });
      })
  );
});
