// Service Worker для оффлайн работы - ИСПРАВЛЕННАЯ ВЕРСИЯ
const CACHE_NAME = 'mayak-finder-offline-v2';
const urlsToCache = [
  './',
  './index.html',
  './map.html',
  './navigator.html',
  './offline.html',
  './style.css',
  './script.js',
  './manifest.json',
  './voice-guidance.js',
  './history-manager.js',
  './settings.js',
  './notifications.js',
  './offline-maps.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Кэширование файлов для оффлайн работы');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Все файлы закэшированы');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Ошибка кэширования:', error);
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker активирован');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Пропускаем не-GET запросы и chrome-extension
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Возвращаем из кэша если есть
        if (response) {
          return response;
        }

        // Для навигационных запросов (HTML страницы) всегда возвращаем index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        // Для остальных запросов пробуем сеть, а если нет интернета - показываем ошибку
        return fetch(event.request).catch(error => {
          // Для API запросов возвращаем ошибку
          if (event.request.url.includes('/api/')) {
            return new Response(JSON.stringify({ error: 'Оффлайн режим' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Для изображений и других ресурсов возвращаем пустой ответ
          if (event.request.destination === 'image') {
            return new Response('', { status: 404 });
          }
          
          // Для скриптов и стилей возвращаем пустой ответ
          return new Response('', { 
            status: 404,
            statusText: 'Оффлайн режим'
          });
        });
      })
  );
});

// Фоновая синхронизация (если нужна)
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('Фоновая синхронизация...');
  }
});

