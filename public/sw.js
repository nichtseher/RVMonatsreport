// v6 (0.9.72): Der Name war seit v5 fest, und der Cache wuchs mit jeder
// veroeffentlichten Fassung -- siehe `raeumeAlteFassungen`. Ein neuer Name
// loescht beim Aktivieren (`activate`) zugleich die bis dahin angesammelten
// alten Dateien.
const CACHE_NAME = 'rv-report-v6';

// Nur eigene, lokale Assets vorab cachen (keine externen Dienste -> DSGVO).
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// WARUM HIER MEHR ALS DIE SCHALE GECACHT WIRD
//
// Gemessen am 2026-09-07: Wer ein Update OFFLINE anwendet, hatte danach eine
// weisse Seite. Ablauf: 'activate' loescht jeden Cache ausser CACHE_NAME, der
// neue Cache enthielt aber nur die ASSETS-Liste oben. Die frisch aktivierte
// index.html verweist auf gehashte Build-Dateien (assets/index-<hash>.js/.css),
// die weder im Netz (offline) noch im Cache (geloescht) erreichbar sind ->
// #root blieb mit 0 Zeichen leer, zwei Anfragen schlugen fehl. Die Gegenprobe
// offline OHNE Update rendert einwandfrei; es liegt also am Update, nicht am
// Offline-Betrieb.
//
// Deshalb holt die Installation zusaetzlich alles, worauf die neue index.html
// unter assets/ verweist. Sie laeuft immer online (ein Update wird ueber das
// Netz entdeckt), der Cache ist also vollstaendig, BEVOR aktiviert wird.
//
// Was das bewusst NICHT abdeckt: die nachgeladenen Bildschirme (Geraete-Sync,
// Datensicherung, Excel). Sie stehen als dynamische Importe nicht in der
// index.html. Nach einem Update im Funkloch fehlt also nicht mehr die App,
// aber diese drei brauchen einmalig Netz.
async function cacheBuildDateien(cache) {
  const antwort = await fetch('./index.html', { cache: 'no-cache' });
  const html = await antwort.text();
  const treffer = [...html.matchAll(/(?:src|href)="((?:\.\/|\/)?assets\/[^"]+)"/g)].map((m) => m[1]);
  await Promise.allSettled([...new Set(treffer)].map((url) => cache.add(url)));
}

// WARUM ALTE FASSUNGEN AUFGERAEUMT WERDEN
//
// Der Fetch-Handler unten legt jede Datei, die er vom Netz holt, im Cache ab --
// auch die gehashten Build-Dateien (assets/index-<hash>.js usw.). Der Cache-Name
// aenderte sich aber nur mit sw.js selbst, und die aendert sich fast nie. Jede
// veroeffentlichte Fassung brachte so neue Dateien dazu, und keine ging je
// wieder weg: gemessen 28 Eintraege nach einer einzigen Sitzung; ein
// vollstaendiger Satz Build-Dateien sind gut 2 MB, und jede Fassung bringt
// mindestens das Startbuendel und die geaenderten Ansichten neu dazu.
//
// Gerauemt wird erst, NACHDEM die neue Datei im Cache liegt -- sonst gaebe es
// einen Moment ohne jede Fassung. Eine alte Datei wird nur bei Netzfehler
// ueberhaupt aus dem Cache ausgeliefert; ein Netz, das antwortet (auch mit 404),
// geht vor. Wer eine alte Fassung im offenen Fenster hat, verliert also nichts,
// was er online haette laden koennen.
const HASH_DATEI = /\/assets\/(.+)-[A-Za-z0-9_-]{8}\.(js|css)$/;

function basisName(url) {
  try {
    const treffer = HASH_DATEI.exec(new URL(url).pathname);
    return treffer ? treffer[1] + '.' + treffer[2] : null;
  } catch (fehler) {
    return null;
  }
}

function raeumeAlteFassungen(cache, url) {
  const basis = basisName(url);
  if (!basis) return Promise.resolve();
  return cache.keys().then((anfragen) =>
    Promise.all(
      anfragen
        .filter((a) => a.url !== url && basisName(a.url) === basis)
        .map((a) => cache.delete(a))
    )
  );
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Robust: einzeln cachen, damit ein fehlendes Asset nicht die
      // gesamte Installation (und damit die Offline-Faehigkeit) verhindert.
      await Promise.allSettled(ASSETS.map((asset) => cache.add(asset)));
      // Ebenso robust: Schlaegt das fehl, bleibt es beim Schalenumfang --
      // das ist der Stand vor dieser Aenderung, kein Rueckschritt.
      try {
        await cacheBuildDateien(cache);
      } catch (fehler) {
        console.warn('Build-Dateien konnten nicht vorgeladen werden:', fehler);
      }
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
          caches.open(CACHE_NAME).then((cache) =>
            cache
              .put(e.request, responseToCache)
              .then(() => raeumeAlteFassungen(cache, e.request.url))
          );
        }
        return response;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (e.request.mode === 'navigate') {
            // `caches.match` liefert ein Versprechen -- das `||` davor war immer
            // wahr, die zweite Alternative lief nie.
            return caches.match('./index.html').then((index) => index || caches.match('./'));
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