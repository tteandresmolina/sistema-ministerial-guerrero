// Service Worker — Sistema Ministerial FGE Guerrero
// Estrategia: red primero. NUNCA cachea peticiones a Supabase (datos sensibles y en tiempo real).
const CACHE = 'sistema-ministerial-v1';
const ESTATICOS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/logo-fge.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Jamás interceptar Supabase ni peticiones que no sean GET
  if (e.request.method !== 'GET' || url.hostname.includes('supabase')) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        // Cachear copia de estáticos del mismo origen
        if (resp.ok && url.origin === self.location.origin) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/')))
  );
});
