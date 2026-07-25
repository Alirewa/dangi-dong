/* eslint-disable */
/**
 * Hand-rolled service worker.
 *
 * Not @serwist/next: this app has zero runtime network dependencies, so the
 * whole worker is "precache the static export, serve cache-first, fall back to
 * the shell for navigations". Workbox's runtime buys strategies never called
 * here, and serwist has open issues with Next `basePath` (the convention this
 * project uses) plus a build-plugin coupling that would need re-validating on
 * every Next minor.
 *
 * Tokens below are substituted by scripts/build-sw.mjs.
 */

const VERSION = '%%VERSION%%';
const BASE = '%%BASE%%';
const PRECACHE = %%PRECACHE%%;

const CACHE = 'dong-precache-' + VERSION;
const RUNTIME = 'dong-runtime-' + VERSION;
const SHELL = BASE + '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll is atomic: one 404 rejects the whole install, which is what we
      // want — a partial precache is worse than no service worker.
      cache.addAll(PRECACHE.map((entry) => entry.url))
    )
  );
  // Deliberately NOT skipWaiting(): an update landing mid-edit would discard a
  // half-filled expense form. The app shows a toast and the user chooses.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: cache → network → app shell. The shell fallback is what makes
  // a cold offline launch work on a deep route.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches
        .match(request)
        .then((hit) => hit || fetch(request))
        .catch(() => caches.match(SHELL))
        .then((res) => res || caches.match(SHELL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((response) => {
          // Only cache real, complete responses; an opaque or error response
          // cached here would be served forever.
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(SHELL));
    })
  );
});
