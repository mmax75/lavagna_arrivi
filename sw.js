const CACHE_NAME = 'marina-porto-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Fase di installazione: salvataggio dei file chiave in cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Fase di attivazione: pulizia vecchie cache
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Strategia di fetch: Network First (perché i dati cambiano velocemente), Fallback su Cache se offline
self.addEventListener('fetch', (e) => {
  // Ignora le richieste dirette a Supabase DB o Storage (devono viaggiare sempre live sulla rete)
  if (e.request.url.includes('supabase.co')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Se la rete risponde, aggiorna la cache con la nuova copia del file statico
        if (response.status === 200 && e.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se la rete è assente, prova a pescare il file statico dalla cache
        return caches.match(e.request);
      })
  );
});