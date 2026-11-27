/* Service Worker: кэшируем три файла приложения для офлайн-работы.
   Стратегия: cache-first с обновлением в фоне (stale-while-revalidate).
   Данные (IndexedDB) SW не трогает — они и так локальные. */

const CACHE_NAME = 'fate-servants-db-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Кэшируем только same-origin
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // офлайн — отдать кэш
      return cached || network;
    })
  );
});
