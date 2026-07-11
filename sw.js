/* =========================================================
   Органайзър — Service Worker
   Кешира приложната обвивка (app shell), за да работи изцяло
   офлайн след първото зареждане. Без външни услуги, без CDN.
   ========================================================= */

const CACHE_NAME = 'organizer-cache-v2';

// Всичко, нужно за да проработи приложението без връзка с интернет.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// При инсталация: кешираме обвивката веднага.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

// При активация: чистим стари версии на кеша.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Стратегия: "cache first, refresh in background".
// Взимаме от кеша веднага (бързо и офлайн-safe), а паралелно
// опресняваме кеша от мрежата, ако има връзка.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Пропускаме заявки към други origin-и (напр. случайни external заявки),
  // за да не кешираме нещо, което не контролираме.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // офлайн -> връщаме кешираното, ако го има

      return cached || networkFetch;
    })
  );
});
