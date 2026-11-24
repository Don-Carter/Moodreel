/* Moodreel service worker: keeps every app file on the phone so it opens with no internet.
 * When you change any app file, bump VERSION so phones fetch the new files. */
var VERSION = 'moodreel-v6';
var FILES = [
  './',
  'index.html',
  'styles.css',
  'rules.js',
  'starter.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  // cache: 'reload' skips the browser's short-term copy, so a new version never stores old files.
  var fresh = FILES.map(function (f) { return new Request(f, { cache: 'reload' }); });
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(fresh); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request).catch(function () {
      if (e.request.mode === 'navigate') return caches.match('index.html');
    });
  }));
});
