// Minimal service worker — enables "Add to Home Screen" / install prompts.
// Intentionally does NOT cache app files, so the form always loads the
// latest version from the network (important since Firebase auth/data
// must always be fresh).
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass-through: always fetch from network.
  event.respondWith(fetch(event.request));
});
