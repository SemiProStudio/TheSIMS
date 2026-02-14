// =============================================================================
// Service Worker for SIMS PWA
// =============================================================================
//
// Caching strategy rationale:
//
//   /assets/*.js, /assets/*.css  → CACHE FIRST (immutable, content-hashed by Vite)
//   /assets/*.woff2, images      → CACHE FIRST (static, rarely change)
//   /index.html, navigations     → NETWORK FIRST (must pick up new bundle refs on deploy)
//   /sw.js                       → Controlled by browser + Vercel headers (max-age=0)
//   Supabase / external API      → NETWORK ONLY (real-time data, never cache)
//
// On new deploys, Vite produces new hashed filenames. The browser fetches a
// fresh sw.js (max-age=0 in vercel.json), sees the new BUILD_ID, installs the
// new SW which creates new caches and purges old ones on activate.
// =============================================================================

// Build-time cache version — injected by vite.config.js, falls back to 'dev'
const BUILD_ID = 'mlmspgo5' !== '__SIMS_' + 'BUILD_ID__' ? 'mlmspgo5' : 'dev';
const CACHE_NAME = `sims-v${BUILD_ID}`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// =============================================================================
// Install — Pre-cache shell assets, activate immediately
// =============================================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// =============================================================================
// Activate — Purge all caches from previous builds, claim clients
// =============================================================================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// =============================================================================
// Fetch — Route requests to the correct caching strategy
// =============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests over HTTP(S)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Never cache Supabase API calls or external requests — always go to network
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // Hashed build assets: cache first (immutable — filename changes on every build)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation and index.html: network first (must pick up new <script> tags on deploy)
  if (request.mode === 'navigate' || url.pathname === '/index.html') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Static files in public/ (favicon, manifest, etc.): network first with cache fallback
  // These aren't hashed, so we need to check for fresh versions
  event.respondWith(networkFirst(request));
});

// =============================================================================
// Strategies
// =============================================================================

/**
 * Cache First — for immutable, content-hashed assets.
 * If in cache, return immediately. Otherwise fetch, cache, and return.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network First (Navigation) — for HTML pages.
 * Always try network. On success, update cache. On failure, serve cached
 * index.html (SPA fallback).
 */
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline: serve cached index.html for SPA routing
    const cached = await caches.match('/index.html');
    return cached || new Response('Offline', { status: 503 });
  }
}

/**
 * Network First — for non-hashed static assets (manifest, favicon).
 * Try network, fall back to cache.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// =============================================================================
// Messages from the app
// =============================================================================

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// =============================================================================
// Push Notifications
// =============================================================================

self.addEventListener('push', (event) => {
  let data = { title: 'SIMS', body: 'New notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: data.url || '/' },
      tag: data.tag || 'default',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow?.(url);
    })
  );
});
