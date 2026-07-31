const CACHE_NAME = 'rv-report-v4';

// Nur eigene, lokale Assets vorab cachen (keine externen Dienste -> DSGVO).
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Robust: einzeln cachen, damit ein fehlendes Asset nicht die
      // gesamte Installation (und damit die Offline-Faehigkeit) verhindert.
      return Promise.allSettled(ASSETS.map((asset) => cache.add(asset)));
    })
  );
});

// Update erst aktivieren, wenn der Nutzer es bestaetigt (kein erzwungener
// Reload mitten in der Dateneingabe). Siehe Update-Toast in index.html.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

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

// Network-First mit Cache-Fallback (nur gleiche Herkunft, keine Drittserver).
self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith('http')) return;
  // Externe Anfragen nicht anfassen und nicht cachen (Datenschutz).
  if (new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});

// Lokale Benachrichtigungen (z. B. Monatsbericht-Erinnerung).
// Es gibt bewusst KEINEN Push-Server: Die Erinnerung wird von der App selbst
// ausgeloest, waehrend sie geoeffnet ist. Keine Daten verlassen das Geraet.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});