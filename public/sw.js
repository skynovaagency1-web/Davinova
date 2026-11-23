/* eslint-env serviceworker */
/* global self, caches, fetch, URL, Response */
/* Davinova app service worker: makes the site installable and quick to reopen.
   Pages always come from the network first (so prices and stock stay live);
   built files, fonts and photos are kept on the phone for speed and offline use.
   Bump VERSION whenever this file changes, so old caches are cleared. */
const VERSION = 'v2';
const SHELL = `davinova-shell-${VERSION}`;
const STATIC = `davinova-static-${VERSION}`;
const MEDIA = `davinova-media-${VERSION}`;
const MEDIA_LIMIT = 250;

// Cloudflare Pages strips .html: it serves the file at /offline and 308s
// /offline.html to it. The Cache API refuses a redirected response, so caching
// only /offline.html would throw and leave no offline page at all. Both are
// listed so this works on Pages and on a plain static server; whichever is not
// there is skipped below.
const SHELL_FILES = ['/', '/offline', '/offline.html', '/site.webmanifest', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // One at a time on purpose: cache.addAll() rejects as a unit, so a single
    // missing file would stop the worker installing and the shop would quietly
    // stop being installable, with nothing logged anywhere.
    for (const file of SHELL_FILES) {
      try { await cache.add(file); } catch { /* skip what is not there; the rest still installs */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, STATIC, MEDIA]);
    for (const key of await caches.keys()) if (key.startsWith('davinova-') && !keep.has(key)) await caches.delete(key);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

const PRIVATE = /^\/(api|admin|approve-cj|account|checkout|order-confirmation)(\/|$)/;

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - limit; i += 1) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVATE.test(url.pathname) || url.pathname === '/sw.js') return;

  // Pages: network first, the offline page when there is no connection.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        const response = preload || await fetch(request);
        if (response.ok && url.pathname === '/') (await caches.open(SHELL)).put('/', response.clone());
        return response;
      } catch {
        // The home page only for the home page: falling back to it for every
        // route silently showed the shop front instead of the dress someone
        // had open.
        const cache = await caches.open(SHELL);
        if (url.pathname === '/') return (await cache.match('/')) || Response.error();
        return (await cache.match('/offline'))
          || (await cache.match('/offline.html'))
          || (await cache.match('/'))
          || Response.error();
      }
    })());
    return;
  }

  // Hashed build files and fonts never change: cache first.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/')) {
    event.respondWith((async () => {
      const hit = await caches.match(request, { cacheName: STATIC });
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) (await caches.open(STATIC)).put(request, response.clone());
      return response;
    })());
    return;
  }

  // Photos: show the saved copy at once and refresh it in the background.
  if (request.destination === 'image' || /^\/(images|cutouts|img|brand)\//.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(MEDIA);
      const hit = await cache.match(request);
      const fresh = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone()).then(() => trim(MEDIA, MEDIA_LIMIT));
        return response;
      }).catch(() => hit || Response.error());
      if (hit) { event.waitUntil(fresh); return hit; }
      return fresh;
    })());
  }
});
