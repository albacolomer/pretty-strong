/* eslint-disable no-restricted-globals */
// Pretty Strong's service worker, for the web app only. A template:
// scripts/build-sw.mjs writes it to dist/sw.js after `expo export`, with
// VERSION (a fingerprint of the build) and PRECACHE (every file the app
// needs) filled in. Each deploy therefore makes a different sw.js, which
// is how the browser notices there's a new version.
//
// - Install: saves every file of this version, so the app opens with no
//   signal (the gym).
// - The page: from the network when it answers within a few seconds, so a
//   new deploy shows straight away; otherwise the saved one.
// - Everything else of ours: the saved copy (the names change with the
//   content, so a saved copy is never stale), or the network.
// - Supabase and other sites: never touched, straight to the network.
// - A new version waits until the app says it's a good moment (never in a
//   workout): see src/lib/appUpdates.web.ts.

const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `pretty-strong-${VERSION}`;
const PAGE_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // 'reload': past the browser's own cache, so these are this deploy's.
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('pretty-strong-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'VERSION' && event.ports[0]) event.ports[0].postMessage(VERSION);
  if (type === 'ACTIVATE') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? page(request) : saved(request));
});

// A rest alert from the send-rest-alerts function ({ title, body }, already
// translated). iOS requires every push to show a notification, even with
// the app open, or it stops sending them.
self.addEventListener('push', (event) => {
  let alert = {};
  try {
    alert = event.data ? event.data.json() : {};
  } catch {
    alert = { title: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(alert.title || 'Pretty Strong', {
      body: alert.body || '',
      icon: '/icon-192.png',
      // A newer alert replaces the last one instead of piling up.
      tag: 'rest',
      renotify: true,
    }),
  );
});

// Tapping it opens the app (at the workout, if it was closed).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows[0];
      return open ? open.focus() : self.clients.openWindow('/workout');
    }),
  );
});

async function page(request) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), PAGE_TIMEOUT_MS)),
    ]);
    if (response.ok) return response;
  } catch {
    // No signal, or too slow: the saved page below.
  }
  const cache = await caches.open(CACHE);
  return (await cache.match('/')) || fetch(request);
}

async function saved(request) {
  return (await caches.match(request, { ignoreSearch: true })) || fetch(request);
}
