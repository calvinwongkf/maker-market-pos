// Offline cache for the Maker Market POS. Bump VERSION when files change.
const VERSION = 'mmpos-v1';
const FILES = ['./', 'index.html', 'manifest.json', 'img/tiger.png', 'img/egg.png', 'img/candy.png', 'img/flamingo.png',
  'img/icon-192.png', 'img/icon-512.png', 'fonts/nunito-latin-700-normal.woff2', 'fonts/nunito-latin-800-normal.woff2', 'fonts/nunito-latin-900-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // never touch the Google sync
  // Stale-while-revalidate: open instantly from cache, refresh in the background when online.
  e.respondWith(caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
