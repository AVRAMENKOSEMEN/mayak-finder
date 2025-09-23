// Service Worker для PWA - исправленная версия
const CACHE_NAME = 'mayak-finder-v1.5';
const urlsToCache = [
  './',
  './index.html', 
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  console.log('[Service Worker] Установка начата');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[Service Worker] Кэшируем основные файлы');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('[Service Worker] Установка завершена');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.log('[Service Worker] Ошибка установки:', error);
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Активация');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Удаляем старый кэш:', cacheName);
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
  // Пропускаем не-HTTP/HTTPS запросы
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Пропускаем запросы к внешним ресурсам (иконки и т.д.)
  if (event.request.url.includes('chrome-extension') ||
      event.request.url.includes('extension') ||
      !event.request.url.includes(location.hostname)) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Возвращаем из кэша если есть
        if (response) {
          console.log('[Service Worker] Из кэша:', event.request.url);
          return response;
        }
        
        // Иначе загружаем из сети
        console.log('[Service Worker] Из сети:', event.request.url);
        return fetch(event.request)
          .then(function(response) {
            // Проверяем валидность ответа перед кэшированием
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Клонируем ответ для кэширования
            var responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                // Дополнительная проверка перед кэшированием
                if (event.request.url.startsWith('http') && 
                    !event.request.url.includes('chrome-extension')) {
                  cache.put(event.request, responseToCache);
                  console.log('[Service Worker] Закэширован:', event.request.url);
                }
              });
              
            return response;
          })
          .catch(function(error) {
            console.log('[Service Worker] Ошибка загрузки:', error);
            // Можно вернуть fallback страницу здесь
          });
      })
  );
});

// Простой обработчик сообщений (для отладки)
self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
