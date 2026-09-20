import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gruppe, pruefe, wahr, nurCode } from "../helfer";

/*
  Die Inhaltsrichtlinie (CSP) wirkt NUR in der ausgelieferten Fassung — und
  genau deshalb braucht sie eine Prüfung am Quelltext.

  ANLASS (gemessen am 2026-09-19 im Browser gegen ein gebautes `dist/`)

  `decryptData` in `src/utils/crypto.ts` las den Chiffretext über einen
  Netzabruf auf eine `data:`-URL. Ein solcher Abruf wird gegen `connect-src`
  geprüft; die ausgelieferte Richtlinie lautet `connect-src 'self'`, und eine
  `data:`-URL hat eine opake Herkunft. Chromium:

      Refused to connect because it violates the document's Content Security
      Policy.

  Folge in der Produktion, von 0.9.34 (Einführung der Richtlinie) bis 0.9.47:
  Eine verschlüsselte Sicherung liess sich ERZEUGEN, aber nicht mehr
  zurückspielen — `encryptData` nutzt `FileReader`, ist also nicht betroffen.
  Dasselbe galt für verschlüsselte Textcodes (`RVC2:`). Der Nutzer bekam
  „Falsches Passwort oder beschädigte Datei." für ein richtiges Passwort.

  WARUM KEIN BESTEHENDES TOR DAS FINDEN KONNTE

  - `npm run check` ruft `encryptData`/`decryptData` im Umlauf auf
    (`scripts/checks/backup.ts`) — unter Node, wo der Netzabruf global ist und
    keine CSP kennt. Der Umlauf belegt die Kryptografie und kann über die
    Auslieferung nichts sagen.
  - `npm run check:ui` läuft gegen den Dev-Server. Die Richtlinie wird mit
    `apply: "build"` eingehängt (`vite.config.ts`) und ist dort nicht
    vorhanden — sie muss es auch nicht sein, Vite braucht in der Entwicklung
    inline Skripte und `eval`.
  - `scripts/csp-pruefen.ts` prüft die Richtlinie selbst, nicht den Quelltext,
    der sich an sie halten muss.

  Diese Prüfung schliesst die Lücke von der anderen Seite: Sie verlangt nichts
  Neues, sie verhindert den Rückschritt. Der Weg ohne Netzabruf steht in
  `src/utils/base64.ts` und ist in derselben Messung als funktionierend
  belegt.

  KOMMENTARE ZÄHLEN NICHT — und das ist keine Feinheit.

  Beim ersten Lauf meldete diese Prüfung drei Verstösse, und alle drei waren
  die Kommentare, die erklären, warum die Zeile entfallen ist. Wer den
  „Verstoss" wegräumt, löscht die Begründung. Dieselbe Falle steht in
  CLAUDE.md für `scripts/checks/typografie.ts`; sie schnappt offenbar
  zuverlässig zu. Deshalb wird hier vor der Suche der Kommentartext entfernt,
  und `imBlock` muss am Dateiende wieder falsch sein — sonst hat die
  Entfernung selbst versagt und die Prüfung sagt das, statt stillzuschweigen.

  WAS SIE NICHT LEISTET

  Erkannt wird die URL nur, wenn sie als Zeichenkette am Aufruf steht. Wer sie
  vorher in eine Variable legt (`const u = "data:…"; fetch(u)`), läuft daran
  vorbei. Ebenso endet die Betrachtung einer Zeile an einem doppelten
  Schrägstrich, auch wenn er in einer Zeichenkette steht. Das ist die
  ehrliche Reichweite einer Quelltextsuche; die vollständige Antwort gäbe nur
  ein Lauf gegen ein gebautes `dist/`.

  KEINE AUSNAHMELISTE, mit Absicht: Unter `connect-src 'self'` gibt es keinen
  Fall, in dem ein Netzabruf auf `data:` funktioniert. Eine Ausnahme ohne Fall
  ist eine offene Tür.
*/

const WURZEL = new URL("../../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ENDUNGEN = [".ts", ".tsx"];

const MUSTER = /\b(?:fetch|new\s+Request)\s*\(\s*['"`]data:/;

function dateienSammeln(verzeichnis: string, treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) dateienSammeln(pfad, treffer);
    else if (ENDUNGEN.some((e) => pfad.endsWith(e))) treffer.push(pfad);
  }
  return treffer;
}

// nurCode() steht seit 0.9.60 in ../helfer -- ansichtsfokus.ts braucht sie
// fuer denselben Fehler in derselben Form, zwei Kopien waeren die falsche
// Antwort darauf.

gruppe("Inhaltsrichtlinie (CSP)");

const dateien = dateienSammeln(WURZEL);

pruefe("es werden überhaupt Dateien geprüft", () => {
  wahr(dateien.length > 10, `nur ${dateien.length} Dateien gefunden — Pfad falsch?`);
});

pruefe("die Suche könnte überhaupt anschlagen", () => {
  const beispiel = [
    "/* Hier stand frueher ein fetch(\"data:...\") — der Kommentar zaehlt nicht. */",
    'const r = await fetch("data:application/octet-stream;base64," + x);',
  ];
  const { code, offen } = nurCode(beispiel);
  wahr(!offen, "Der Blockkommentar der Probe wurde nicht geschlossen.");
  wahr(!MUSTER.test(code[0]), "Der Kommentar der Probe wird faelschlich als Verstoss gelesen.");
  wahr(MUSTER.test(code[1]), "Der echte Fall der Probe wird NICHT gefunden — die Suche ist blind.");
});

pruefe("kein Netzabruf auf eine data:-URL — die CSP blockiert ihn in Produktion", () => {
  const befunde: string[] = [];
  const unklar: string[] = [];
  for (const datei of dateien) {
    const kurz = datei.replace(/\\/g, "/").replace(WURZEL.replace(/\\/g, "/"), "src");
    const { code, offen } = nurCode(readFileSync(datei, "utf8").split(/\r?\n/));
    if (offen) unklar.push(kurz);
    code.forEach((zeile, i) => {
      if (MUSTER.test(zeile)) befunde.push(`${kurz}:${i + 1}`);
    });
  }
  wahr(
    unklar.length === 0,
    `Diese Dateien enden innerhalb eines Blockkommentars: ${unklar.join(", ")}. ` +
      `Dann hat die Kommentarentfernung versagt, und das Ergebnis dieser Prüfung ` +
      `ist nicht belastbar.`,
  );
  wahr(
    befunde.length === 0,
    `Netzabruf auf eine data:-URL gefunden: ${befunde.join(", ")}. ` +
      `Die ausgelieferte Richtlinie sagt connect-src 'self'; eine data:-URL ` +
      `hat eine opake Herkunft und wird abgewiesen — nur in der Produktion, ` +
      `nie im Dev-Server und nie unter Node. Nimm base64ToBytes aus ` +
      `src/utils/base64.ts.`,
  );
});
