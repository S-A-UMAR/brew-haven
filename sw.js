/* =======================================================
   BREW HAVEN — Service Worker (sw.js)
   Strategy:
   - HTML pages         → Network-first  (always fresh content)
   - CSS / JS / Fonts   → Cache-first    (static, versioned)
   - Local images       → Cache-first    (won't change often)
   - External images    → Stale-while-revalidate (Unsplash etc.)
   - Offline fallback   → /offline.html
   ======================================================= */

const CACHE_NAME = 'brew-haven-v1';
const STATIC_CACHE = 'brew-haven-static-v1';
const IMAGE_CACHE  = 'brew-haven-images-v1';

/* ── Assets to pre-cache on install ── */
const PRECACHE_ASSETS = [
  '/index.html',
  '/menu.html',
  '/gallery.html',
  '/about.html',
  '/contact.html',
  '/offline.html',
  '/css/style.css',
  '/css/responsive.css',
  '/css/animations.css',
  '/js/main.js',
  '/js/menu.js',
  '/js/gallery.js',
  '/js/slider.js',
  '/manifest.json',
  '/images/icons/icon-192.jpg',
  '/images/icons/icon-512.jpg',
  '/images/hero/hero_background.jpg',
  '/images/menu/espresso.jpg',
  '/images/menu/cappuccino.jpg',
  '/images/menu/latte.jpg',
  '/images/menu/mocha.jpg',
  '/images/menu/tea.jpg',
];

/* ─────────────────────────────────────
   INSTALL — pre-cache shell assets
───────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      // addAll fails silently if any URL 404s in dev — use individual adds
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn(`[SW] Failed to cache ${url}:`, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ─────────────────────────────────────
   ACTIVATE — clean up old caches
───────────────────────────────────── */
self.addEventListener('activate', (event) => {
  const allowedCaches = [STATIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !allowedCaches.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ─────────────────────────────────────
   FETCH — routing strategies
───────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin + http(s) requests
  if (request.method !== 'GET') return;
  if (!['http:', 'https:'].includes(url.protocol)) return;

  /* 1. External images (Unsplash etc.) → Stale-While-Revalidate */
  if (url.hostname !== self.location.hostname && request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  /* 2. HTML navigation → Network-First with offline fallback */
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  /* 3. Static assets (CSS, JS, local images, fonts) → Cache-First */
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  /* 4. Everything else → Network with cache fallback */
  event.respondWith(networkFirst(request));
});

/* ─────────────────────────────────────
   STRATEGY HELPERS
───────────────────────────────────── */

/** Network-first: try network, fall back to cache, then offline page */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline fallback for navigation requests
    if (request.destination === 'document' || request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    return new Response('Network error', { status: 503 });
  }
}

/** Cache-first: serve from cache, fall back to network + update cache */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Resource unavailable offline', { status: 503 });
  }
}

/** Stale-While-Revalidate: serve cache instantly, update in background */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || networkFetch || new Response('', { status: 503 });
}

/* ─────────────────────────────────────
   BACKGROUND SYNC — form submissions
   Queues failed contact/reservation
   form POSTs to retry when back online
───────────────────────────────────── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'contact-form-sync') {
    event.waitUntil(retrySyncedForms());
  }
});

async function retrySyncedForms() {
  // In a real implementation this would read from IndexedDB
  // and replay any queued form submissions
  console.log('[SW] Background sync: retrying queued form submissions');
}

/* ─────────────────────────────────────
   PUSH NOTIFICATIONS (ready to wire)
───────────────────────────────────── */
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {
    title: 'Brew Haven ☕',
    body: 'Something fresh is brewing for you!',
  };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/images/icons/icon-192.jpg',
      badge: '/images/icons/icon-192.jpg',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
