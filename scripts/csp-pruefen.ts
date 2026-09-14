import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

/**
 * Prueft die ausgelieferte Sicherheitsrichtlinie -- nach dem Build, gegen
 * `dist/index.html`.
 *
 * WARUM ES DIESE PRUEFUNG GIBT: Die CSP steht als <meta> in der gebauten
 * Seite, weil GitHub Pages keine Kopfzeilen setzt. Sie greift damit NUR in
 * Produktion -- der Entwicklungsbetrieb und `npm run check:ui`, das gegen den
 * Dev-Server laeuft, sehen sie nie. Ein Fehler darin faellt also an keiner
 * Stelle auf, ausser bei den Nutzern.
 *
 * Genau das ist am 2026-09-14 beim ersten Versuch passiert: Der Hash wurde
 * ueber die Rohbytes der Datei gebildet, der Browser bildet ihn aber ueber
 * den Textinhalt NACH der Zeilenende-Normalisierung des HTML-Parsers. Da
 * `index.html` CRLF verwendet, wichen beide ab -- der Update-Hinweis waere in
 * Produktion stillschweigend blockiert gewesen, und die App haette lokal wie
 * im Prueftor tadellos ausgesehen.
 *
 * Laeuft als Teil von `npm run build`, damit ein falscher Stand gar nicht
 * erst entstehen kann.
 */

const DATEI = "dist/index.html";
const fehler: string[] = [];

if (!existsSync(DATEI)) {
  console.error(`FEHLER: ${DATEI} fehlt -- diese Pruefung gehoert hinter den Build.`);
  process.exit(1);
}

const html = readFileSync(DATEI, "utf8");

const csp = html.match(
  /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i,
);
if (!csp) {
  fehler.push("Kein <meta http-equiv=\"Content-Security-Policy\"> in der gebauten Seite.");
} else {
  // Attributwerte kommen HTML-kodiert an ("&#39;" statt "'").
  const richtlinie = csp[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

  for (const pflicht of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "script-src 'self'",
  ]) {
    if (!richtlinie.includes(pflicht)) fehler.push(`Die Richtlinie enthaelt "${pflicht}" nicht mehr.`);
  }

  // 'unsafe-inline'/'unsafe-eval' im script-src waeren die stille Ruecknahme
  // der ganzen Massnahme.
  const skriptTeil = richtlinie.split(";").find((t) => t.trim().startsWith("script-src")) || "";
  for (const verboten of ["'unsafe-inline'", "'unsafe-eval'"]) {
    if (skriptTeil.includes(verboten)) {
      fehler.push(`script-src enthaelt ${verboten} -- damit ist die Richtlinie wirkungslos.`);
    }
  }

  // Der Hash muss zum Inline-Skript passen, und zwar ueber den
  // zeilenende-normalisierten Inhalt (so rechnet der HTML-Parser).
  const skripte = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  if (skripte.length !== 1) {
    fehler.push(`Erwartet genau EIN Inline-Skript, gefunden ${skripte.length}.`);
  } else {
    const CR = String.fromCharCode(13);
    const LF = String.fromCharCode(10);
    const inhalt = skripte[0][1].split(CR + LF).join(LF).split(CR).join(LF);
    const erwartet = "sha256-" + createHash("sha256").update(inhalt, "utf8").digest("base64");
    if (!skriptTeil.includes(`'${erwartet}'`)) {
      fehler.push(
        `Der Hash in der Richtlinie passt nicht zum Inline-Skript.\n` +
          `       erwartet: ${erwartet}\n` +
          `       in der CSP: ${(skriptTeil.match(/'sha256-[^']+'/) || ["keiner"])[0]}\n` +
          `       Folge: Der Update-Hinweis wird in Produktion blockiert -- und NUR dort.`,
      );
    }
  }
}

if (!/<meta\s+name="referrer"\s+content="no-referrer"/i.test(html)) {
  fehler.push('Die Kopfzeile <meta name="referrer" content="no-referrer"> fehlt.');
}

if (fehler.length > 0) {
  console.error("Sicherheitsrichtlinie der gebauten Seite: FEHLER\n");
  for (const f of fehler) console.error("  - " + f);
  process.exit(1);
}

console.log("Sicherheitsrichtlinie der gebauten Seite: in Ordnung (CSP, Hash, Referrer-Policy).");
