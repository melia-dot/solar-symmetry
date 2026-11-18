/**
 * Service worker
 *
 * - Cache is named after the app version (src/version.js), so every version
 *   bump installs a fresh copy of the app files and deletes the old cache.
 * - Serves the app's own files cache-first (works offline).
 * - Does not touch API requests (sunrise-sunset.org, Nominatim, CDNs).
 * - A new version waits until the page says it's safe to switch
 *   (SKIP_WAITING message from src/scripts/sw-update.js), so the page can
 *   finish loading data before it reloads.
 *
 * All paths are relative to this file, so it works at / (localhost) and at
 * /solar-symmetry/ (GitHub Pages).
 */

importScripts('src/version.js');
const CACHE_NAME = `solar-symmetry-${self.APP_VERSION}`;

const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'icon.svg',
  'src/version.js',
  'src/styles/main.css',
  'src/scripts/app.js',
  'src/scripts/pull-to-refresh.js',
  'src/scripts/sw-update.js',
  'src/clients/geocoding.js',
  'src/clients/twilight.js',
  'src/utils/date-calculations.js'
];

// Install: download fresh copies (bypassing the browser's HTTP cache) into the new cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(urlsToCache.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

// Activate: delete caches from older versions, then take control of open pages
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name.startsWith('solar-symmetry') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// The page tells a waiting new version to take over once it's safe to reload
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: app files cache-first; everything else goes straight to the network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        });
      })
    )
  );
});
