// AutoTrack Service Worker · v1.0
const CACHE_NAME = 'autotrack-v1';

// Files to cache for offline use
const PRECACHE_URLS = [
  './autotrack-app.html',
  './manifest.json'
];

// ── Install: cache core files ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: serve from cache, fall back to network ─────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for Firebase, Google APIs, and CDNs
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('wa.me') ||
    url.hostname.includes('cdnjs')
  ) {
    return; // let browser handle it normally
  }

  // For same-origin requests: cache-first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache successful same-origin GET responses
        if (
          !response ||
          response.status !== 200 ||
          response.type !== 'basic' ||
          event.request.method !== 'GET'
        ) {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return response;
      }).catch(() => {
        // If both cache and network fail, show offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./autotrack-app.html');
        }
      });
    })
  );
});
