const CACHE_NAME = 'marina-porto-v2';
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/12.14.0/firebase-storage-compat.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
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

// Endpoint che devono SEMPRE viaggiare live sulla rete (mai intercettati/cachati).
// Includono Firestore, Storage, Auth e i canali real-time di Firebase/Google.
function isLiveRequest(url) {
  return (
    url.includes('firestore.googleapis.com') ||      // database Firestore (read/write/realtime)
    url.includes('firebasestorage.googleapis.com') || // upload/download foto
    url.includes('storage.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') || // eventuale Auth futura
    url.includes('securetoken.googleapis.com') ||
    url.includes('googleapis.com/google.firestore') ||
    url.includes('firebaseio.com')
  );
}

// Strategia di fetch: Network First per i file statici, con bypass totale per Firebase.
self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // 1) Lascia passare senza toccare nulla le richieste live verso Firebase/Google.
  if (isLiveRequest(url)) {
    return; // il browser gestisce la richiesta normalmente
  }

  // 2) Intercetta SOLO le GET http/https (evita schemi come chrome-extension che non si cachano).
  if (e.request.method !== 'GET' || !url.startsWith('http')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Aggiorna la cache con la nuova copia del file statico
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone).catch(() => {});
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
