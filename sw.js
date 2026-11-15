// Service worker: the game works offline once it has been opened.
// Strategy: network first (online you always get the latest version, and the copy is refreshed),
// the cached copy when offline. Google Fonts are cache-first.
const CACHE = 'slovo-zakon-v1';
const CORE = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-64.png',
  'src/main.js',
  'src/engine.js',
  'src/render.js',
  'src/sound.js',
  'src/levels.js',
  'src/levels/ch1.js',
  'src/levels/ch2.js',
  'src/levels/ch3.js',
  'src/levels/ch4.js',
  'src/levels/ch5.js',
  'src/levels/ch6.js',
  'src/levels/ch7.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Navigations are matched to the cached start page ("./?foo" → "./").
    const key = req.mode === 'navigate' ? './' : req;
    const fromCache = () => cache.match(key, { ignoreSearch: req.mode === 'navigate' });
    if (isFont) {
      // Fonts never change: cache first.
      const hit = await fromCache();
      if (hit) return hit;
    }
    try {
      // 'no-cache' revalidates with the server, so the browser's HTTP cache can't hand us a stale file.
      const res = await fetch(req, sameOrigin ? { cache: 'no-cache' } : {});
      if (res.ok || res.type === 'opaque') cache.put(key, res.clone());
      return res;
    } catch {
      return (await fromCache()) || new Response('Офлайн: цей файл ще не збережено.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
  })());
});
