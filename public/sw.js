/* global self, caches, URL, fetch */
/**
 * Carbon Field Sales Tracker — App-Shell Service Worker (Stage 3D)
 *
 * Security & Governance Policy (ADR 0012 / PRD §9):
 * 1. Caches ONLY same-origin GET static app-shell assets (HTML, JS, CSS, brand icons).
 * 2. Strictly bypasses all cross-origin requests and all Supabase REST, Auth, Storage,
 *    and Realtime API endpoints so sensitive operational or multi-tenant data is NEVER
 *    cached in Service Worker CacheStorage.
 * 3. Uses Network-First with Cache-Fallback so online sessions always receive fresh
 *    application code while offline refreshes / restarts load the cached SPA shell.
 */

const CACHE_NAME = 'carbon-app-shell-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/brand/carbon_logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Strictly ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Strictly ignore cross-origin requests (including *.supabase.co) and API paths
  if (
    url.origin !== self.location.origin ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/storage/') ||
    url.pathname.startsWith('/realtime/')
  ) {
    return;
  }

  // Network-First with Cache-Fallback for same-origin App Shell & Vite assets
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'default')
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(() => undefined);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // For SPA navigation requests while offline, fall back to cached root shell
        if (request.mode === 'navigate') {
          const rootShell = (await caches.match('/')) || (await caches.match('/index.html'));
          if (rootShell) {
            return rootShell;
          }
        }
        throw new Error('Offline and resource not present in app-shell cache');
      })
  );
});
