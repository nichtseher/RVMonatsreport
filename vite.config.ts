import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {readFileSync} from 'fs';
import {createHash} from 'crypto';
import {defineConfig} from 'vite';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

/*
  Sicherheits-Kopfzeilen als <meta>, und zwar NUR im Build.

  Warum ueberhaupt: `server.ts` setzt sechs Header, aber `server.ts` ist nicht
  der Produktionsserver -- ausgeliefert wird von GitHub Pages, und Pages setzt
  keine eigenen Header. Gemessen am 2026-09-14 mit `curl -I` gegen die
  oeffentliche Adresse: Von den sechs kam genau EINER an
  (Strict-Transport-Security, und den setzt Pages selbst). Die uebrigen fuenf
  waren wirkungslos, seit es die Seite gibt. Stand seit 0.9.24 als "benannt,
  nicht geaendert" in der ROADMAP.

  Warum nur im Build: Ein <meta> direkt in `index.html` wuerde auch im
  Entwicklungsbetrieb greifen -- und Vite braucht dort Inline-Skripte und
  `eval`. Der Dev-Server (und damit `npm run check:ui`, das gegen ihn laeuft)
  waere sofort tot. `apply: "build"` ist deshalb keine Feinheit.

  Warum der Hash berechnet statt eingetragen wird: `index.html` enthaelt ein
  225-zeiliges Inline-Skript (den Update-Hinweis). Ein von Hand gepflegter
  Hash wuerde bei der naechsten Aenderung daran veralten, die App stillstehen
  lassen und nur in Produktion auffallen -- genau die Sorte handgepflegter
  Liste, die in diesem Projekt schon dreimal versagt hat. Hier wird er bei
  jedem Build aus dem tatsaechlichen Inhalt gebildet.

  WAS DIESER WEG NICHT LEISTET, und das ist keine Nachlaessigkeit, sondern
  eine Eigenschaft von <meta>-CSP:
  - `frame-ancestors` wird in einem <meta> laut Spezifikation IGNORIERT, und
    `X-Frame-Options` gibt es als <meta> gar nicht. Klickjacking-Schutz ist
    auf GitHub Pages damit NICHT herstellbar. Wer ihn braucht, braucht einen
    Server, der Header setzen kann.
  - `X-Content-Type-Options: nosniff` und `Permissions-Policy` haben ebenfalls
    keine <meta>-Entsprechung. Die Kamerafreigabe bleibt also ungeregelt;
    wirksam ist weiterhin die Nachfrage des Browsers.
  Von den fuenf fehlenden Kopfzeilen holt dieser Weg zwei zurueck: die CSP und
  Referrer-Policy.
*/
function sicherheitsKopfzeilen() {
  return {
    name: 'rv-sicherheits-kopfzeilen',
    apply: 'build' as const,
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        // Das eine Inline-Skript (ohne src) -- sein Hash muss in die CSP.
        const treffer = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)];
        if (treffer.length !== 1) {
          throw new Error(
            `CSP: erwartet genau EIN Inline-Skript in index.html, gefunden ${treffer.length}. ` +
            `Der Hash deckt sonst nicht alles ab und die App startet in Produktion nicht.`
          );
        }
        /*
          Zeilenenden VOR dem Hashen normalisieren -- das ist der Punkt, an
          dem dieser Weg beim ersten Versuch gescheitert ist.

          Der HTML-Parser normalisiert Zeilenenden im Textinhalt nach
          Vorschrift auf 
 (CRLF und einzelnes CR werden zu LF). Der Browser
          bildet den Hash also ueber den NORMALISIERTEN Text, waehrend hier
          die Rohbytes der Datei vorliegen -- und index.html ist CRLF.

          Gemessen am 2026-09-14 am gebauten Stand: roh ergab
          sha256-ZsPRt/rMrbBVzLD4Xr22q38XAzM0eyV0gVCmxNKNamM=, Chromium
          verlangte sha256-DPdrqS6lRd2ts5Ma52IQABnwq1ck8xrgJh/SRHXK4d8=;
          225 CR im Skript, eines je Zeile. Ohne diese Zeile wird das
          Inline-Skript blockiert -- und zwar NUR in Produktion, weil die
          Richtlinie im Entwicklungsbetrieb gar nicht greift.
        */
        const CR = String.fromCharCode(13);
        const LF = String.fromCharCode(10);
        const inhalt = treffer[0][1].split(CR + LF).join(LF).split(CR).join(LF);
        const hash = createHash('sha256').update(inhalt, 'utf8').digest('base64');

        const richtlinie = [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          `script-src 'self' 'sha256-${hash}'`,
          // Tailwind und React setzen Stile am Element -- ohne 'unsafe-inline'
          // waere die Oberflaeche unbrauchbar. Entspricht `server.ts`.
          "style-src 'self' 'unsafe-inline'",
          // blob: fuer den Kamera-Scanner (Canvas), data: fuer von Vite
          // eingebettete Kleinbilder.
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "worker-src 'self'",
          "manifest-src 'self'",
          "media-src 'self' blob:",
          // Die App hat kein einziges <form action>; alles laeuft ueber
          // Ereignisbehandlung. 'none' kostet nichts und schliesst einen Weg.
          "form-action 'none'",
          "frame-src 'none'",
        ].join('; ');

        return {
          html,
          tags: [
            {
              tag: 'meta',
              attrs: { 'http-equiv': 'Content-Security-Policy', content: richtlinie },
              injectTo: 'head-prepend' as const,
            },
            {
              tag: 'meta',
              attrs: { name: 'referrer', content: 'no-referrer' },
              injectTo: 'head-prepend' as const,
            },
          ],
        };
      },
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    // Versionsnummer aus package.json, damit sie nur an EINER Stelle gepflegt wird
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react(), tailwindcss(), sicherheitsKopfzeilen()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify -- file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // ExcelJS ist der groesste Brocken, wird aber dynamisch nachgeladen und
      // nicht mitgestartet. Der frueher hier stehende manuelle xlsx-Chunk ist
      // mit dem Ausbau von SheetJS (0.9.33) gegenstandslos geworden.
      chunkSizeWarningLimit: 1500
    }
  };
});
