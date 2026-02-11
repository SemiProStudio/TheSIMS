// =============================================================================
// Service Worker for SIMS PWA
// Enables offline support, caching, and background sync
// =============================================================================

// Cache version — replaced at build time by vite.config.js, falls back to 'dev' for local dev
const BUILD_ID = 'mlhn4x5b' !== '__SIMS_' + 'BUILD_ID__' ? 'mlhn4x5b' : 'dev';
const CACHE_NAME = `sims-cache-${BUILD_ID}`;
const STATIC_CACHE = `sims-static-${BUILD_ID}`;
const DYNAMIC_CACHE = `sims-dynamic-${BUILD_ID}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/inventory',
  '/api/packages',
  '/api/clients',
];

// =============================================================================
// Install Event - Cache static assets
// =============================================================================

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Install failed:', error);
      })
  );
});

// =============================================================================
// Activate Event - Clean up old caches
// =============================================================================

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old caches
              return name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE &&
                     name.startsWith('sims-');
            })
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activate complete');
        return self.clients.claim();
      })
  );
});

// =============================================================================
// Fetch Event - Handle requests with appropriate caching strategy
// =============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests: Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Hashed build assets (/assets/*.js, /assets/*.css): stale-while-revalidate
  // These change hash on every deploy, so SWR ensures fresh code reaches users
  if (url.pathname.startsWith('/assets/') && isCodeAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Truly static assets (fonts, images, favicon): cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests: Network first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Default: Stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// =============================================================================
// Caching Strategies
// =============================================================================

/**
 * Cache First - Best for static assets that don't change often
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network First - Best for API data that needs to be fresh
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({ error: 'Offline', cached: false }), 
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Network First with Offline Fallback - Best for HTML pages
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback to index.html for SPA routing
    const indexPage = await caches.match('/index.html');
    if (indexPage) {
      return indexPage;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale While Revalidate - Good balance of speed and freshness
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then((c) => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// =============================================================================
// Helper Functions
// =============================================================================

function isCodeAsset(pathname) {
  return pathname.endsWith('.js') || pathname.endsWith('.css');
}

function isStaticAsset(pathname) {
  const staticExtensions = [
    '.woff', '.woff2', '.ttf', 
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  ];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// =============================================================================
// Background Sync - Queue failed requests to retry when online
// =============================================================================

self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event:', event.tag);
  
  if (event.tag === 'sync-inventory') {
    event.waitUntil(syncInventory());
  }
  
  if (event.tag === 'sync-checkout') {
    event.waitUntil(syncCheckouts());
  }
});

async function syncInventory() {
  const queue = await getQueuedRequests('inventory');
  
  for (const request of queue) {
    try {
      await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      await removeFromQueue('inventory', request.id);
    } catch (error) {
      console.error('[ServiceWorker] Sync failed:', error);
    }
  }
}

async function syncCheckouts() {
  const queue = await getQueuedRequests('checkout');
  
  for (const request of queue) {
    try {
      await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      await removeFromQueue('checkout', request.id);
    } catch (error) {
      console.error('[ServiceWorker] Sync failed:', error);
    }
  }
}

// IndexedDB helpers for offline queue
async function getQueuedRequests(type) {
  // Implementation would use IndexedDB
  return [];
}

async function removeFromQueue(type, id) {
  // Implementation would use IndexedDB
}

// =============================================================================
// Push Notifications
// =============================================================================

self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  let data = { title: 'SIMS', body: 'New notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    tag: data.tag || 'default',
    renotify: data.renotify || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// =============================================================================
// Message Handling
// =============================================================================

self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    caches.open(DYNAMIC_CACHE)
      .then((cache) => cache.addAll(event.data.urls));
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))));
  }
});

console.log('[ServiceWorker] Loaded');
