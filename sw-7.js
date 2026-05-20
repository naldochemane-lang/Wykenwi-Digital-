// LerBem Service Worker v1
var CACHE = 'lerbem-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js'
];

// Instalar: guarda todos os assets em cache
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Tenta guardar cada asset individualmente para não falhar tudo se um falhar
      return Promise.allSettled(
        ASSETS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('SW: falhou cache de ' + url, err);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activar: limpa caches antigos
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first para assets locais, network-first para Firebase
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Firebase e APIs externas: sempre vai à rede, sem cache
  if (url.includes('firebaseio.com') ||
      url.includes('firebase') ||
      url.includes('googleapis.com/identitytoolkit')) {
    return; // deixa o browser tratar normalmente
  }

  // Tudo o resto: cache-first com fallback à rede
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Guarda em cache se for um recurso válido
        if (response && response.status === 200 && response.type !== 'opaque') {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline e não está em cache: retorna a página principal
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
