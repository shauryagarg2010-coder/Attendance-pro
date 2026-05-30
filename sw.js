// ─────────────────────────────────────────────
//  SERVICE WORKER — Attendance Manager
//  HOW TO UPDATE: change CACHE_NAME version
//  e.g. 'attendance-v2' → 'attendance-v3'
//  Then push to GitHub. Users auto-update.
// ─────────────────────────────────────────────
const CACHE_NAME = 'attendance-v1';
const FILES = ['./index.html', './manifest.json'];

// Install: cache the app files
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches, claim clients
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Tell all open tabs: new version is live
        self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// Fetch: serve cache instantly, update in background
self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(evt.request).then(cached => {
        const network = fetch(evt.request)
          .then(res => {
            if (res && res.status === 200 && res.type !== 'opaque') {
              cache.put(evt.request, res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
