// Attendance Manager — Service Worker
// Increment CACHE_VER any time you deploy a new version
var CACHE_VER = 'am-v17';

var STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.svg',
  './favicon.ico',
  './favicon-96x96.png',
  './apple-touch-icon.png'
];

// ─── Install: cache app shell ───────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_VER).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      // Take control immediately without waiting for old SW to die
      return self.skipWaiting();
    })
  );
});

// ─── Activate: clean up old caches ──────────────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_VER;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ─── Fetch: cache-first for app shell, network-first for CDN/API ────────────
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Always go to network for Firebase/Google CDN — no caching of auth/api calls
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('wa.me') ||
    url.hostname.includes('razorpay') ||
    e.request.method !== 'GET'
  ) {
    return;
  }

  // For CDN fonts — cache after first fetch
  if (url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')) {
    e.respondWith(
      caches.open(CACHE_VER + '-fonts').then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(res) {
            cache.put(e.request, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // App shell: cache-first, fall back to network
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        // Cache successful same-origin responses
        if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
          var resClone = res.clone();
          caches.open(CACHE_VER).then(function(cache) {
            cache.put(e.request, resClone);
          });
        }
        return res;
      }).catch(function() {
        // Offline fallback: return cached index.html for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ─── Message from app (e.g. forceUpdate sends SKIP_WAITING) ─────────────────
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
