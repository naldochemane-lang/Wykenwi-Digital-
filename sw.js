const CACHE = 'lerbem-v3';

// Recursos locais
const LOCAL_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

// Scripts externos que a app precisa para funcionar offline
const EXTERNAL_SHELL = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

const ALL_SHELL = [...LOCAL_SHELL, ...EXTERNAL_SHELL];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      // Cache local files (falham se não existirem — normal)
      await c.addAll(LOCAL_SHELL).catch(() => {});
      // Cache externos: um a um para não falhar tudo se um falhar
      for (const url of EXTERNAL_SHELL) {
        try {
          const req = new Request(url, { mode: 'cors' });
          const res = await fetch(req);
          if (res.ok) await c.put(req, res);
        } catch (_) { /* offline durante install — será cacheado na próxima visita */ }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Ignorar pedidos não-GET e chamadas Firebase Firestore/Auth (sempre precisam de rede)
  if (e.request.method !== 'GET') return;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('firebase.googleapis.com')) {
    return; // deixar passar normalmente
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      // Não está em cache — tentar rede e guardar para a próxima
      return fetch(e.request).then(res => {
        if (res && res.ok && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline e não em cache — devolver index.html para rotas da app
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
