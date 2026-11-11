// Offline cache for the Maker Market POS. Bump VERSION when files change.
const VERSION = 'mmpos-v4';
const FILES = ['./', 'index.html', 'manifest.json', 'img/tiger.png', 'img/egg.png', 'img/candy.png', 'img/flamingo.png', 'img/venmo-qr.png',
  'img/icon-192.png', 'img/icon-512.png', 'fonts/nunito-latin-700-normal.woff2', 'fonts/nunito-latin-800-normal.woff2', 'fonts/nunito-latin-900-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function networkFirst(req, c) {
  // Online: get the newest page (gives up after 4 s). Offline: use the saved copy.
  const timeout = new Promise(res => setTimeout(() => res(null), 4000));
  const net = fetch(req, { cache: 'no-store' }).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
  return Promise.race([net, timeout]).then(res => res || c.match(req, { ignoreSearch: true }).then(hit => hit || net));
}
function staleWhileRevalidate(req, c) {
  return c.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // never touch the Google sync
  const isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname) || req.url.endsWith('sw.js');
  e.respondWith(caches.open(VERSION).then(c => isPage ? networkFirst(req, c) : staleWhileRevalidate(req, c)));
});
