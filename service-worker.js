// Service worker with offline support.
// - Static app files (html/css/js/icons) are cached so the form still opens
//   with no signal (e.g. inside a substation).
// - Firebase / Google Auth requests always go to the network (never cached),
//   so login and data stay live and accurate.
// - Bump CACHE_NAME whenever index.html changes, so users get the new
//   version instead of a stale cached one.

const CACHE_NAME = 'asset-inspection-v5';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Hosts that must NEVER be served from cache (auth/data must stay live).
const NETWORK_ONLY_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'accounts.google.com',
  'apis.google.com',
  'www.googleapis.com',
  'firebasestorage.googleapis.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests for our own origin; everything else (Firebase,
  // Google Fonts CDN calls that aren't in our static list, etc.) passes
  // straight through to the network untouched.
  if (event.request.method !== 'GET') return;
  if (NETWORK_ONLY_HOSTS.includes(url.hostname)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          // Only cache same-origin, successful responses.
          if (response && response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline: fall back to cache if network fails

      // Stale-while-revalidate: serve cached copy immediately if present,
      // update the cache in the background for next time.
      return cached || networkFetch;
    })
  );
});
