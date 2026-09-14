import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gruppe, pruefe, wahr } from "../helfer";

/*
  Prüfung auf doppelt kodierte Zeichen.

  Anlass: Ein Bulk-Edit über PowerShell las die UTF-8-Quelle als CP1252 und
  schrieb sie als UTF-8 zurück. Dabei wurden alle Umlaute in
  Nutzertexten und 72 Emojis zerstört -- `tsc` und `vite build` liefen
  fehlerfrei durch, im Browser sah alles richtig aus (der Testbrowser hatte
  die alten, korrekten Beschriftungen noch im Speicher), und der Schaden ging
  live. Nur ein Nutzer mit leerem Speicher hätte ihn gesehen.

  Genau diese Prüfung hätte ihn gefunden.
*/

const PROJEKT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ENDUNGEN = [".ts", ".tsx", ".css", ".html"];
const UEBERSPRINGEN = new Set([
  "node_modules",
  "dist",
  ".git",
  ".claude",
  "test-results",
  "playwright-report",
  // Diese Datei selbst: Sie MUSS die gesuchten Zeichen enthalten, sonst
  // koennte sie nicht nach ihnen suchen.
  "kodierung.ts",
]);

/** Absichtliche Vorkommen: Der Changelog erklärt den Fehler von damals. */
const ERLAUBT: Array<{ datei: string; text: string }> = [
  { datei: "ChangelogModal.tsx", text: "Anzahl VorfÃ¼hrungen" },
];

/*
  Warum hier mehr steht als die klassische CP1252-Signatur: Der Fund vom
  2026-09-14 in vite.config.ts war ein Gedankenstrich, dessen drei UTF-8-Bytes
  (E2 80 94) EINZELN als Latin-1 gelesen wurden -- also U+00E2, U+0080,
  U+0094. Die alte Fassung suchte nach "â€" mit dem Euro-Zeichen U+20AC;
  das entsteht nur beim Lesen als CP1252. Deshalb lief sie daran vorbei.

  Neu sind deshalb das einzelne "â"/"Â" und der C1-Bereich U+0080-U+009F.
  Letzterer sind Steuerzeichen: In Quelltext haben sie NIE etwas zu suchen,
  ein Treffer ist immer ein Schaden.
*/
const MUSTER = /Ã[¤¶¼ŸœÄÖ„]|Ã|Â|â|[\u0080-\u009f]|�|ðŸ/;

function dateienSammeln(verzeichnis: string, treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(verzeichnis)) {
    if (UEBERSPRINGEN.has(eintrag)) continue;
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) dateienSammeln(pfad, treffer);
    else if (ENDUNGEN.some((e) => pfad.endsWith(e))) treffer.push(pfad);
  }
  return treffer;
}

gruppe("Textkodierung der Quelldateien");

const dateien = dateienSammeln(PROJEKT);

pruefe("es werden überhaupt Dateien geprüft", () => {
  wahr(dateien.length > 10, `nur ${dateien.length} Dateien gefunden — Pfad falsch?`);
});

pruefe("keine doppelt kodierten Zeichen", () => {
  const befunde: string[] = [];
  for (const datei of dateien) {
    let inhalt = readFileSync(datei, "utf8");
    for (const a of ERLAUBT) {
      if (datei.endsWith(a.datei)) inhalt = inhalt.split(a.text).join("");
    }
    inhalt.split("\n").forEach((zeile, i) => {
      if (MUSTER.test(zeile)) {
        befunde.push(`${datei.replace(PROJEKT, "")}:${i + 1}  ${zeile.trim().slice(0, 80)}`);
      }
    });
  }
  wahr(befunde.length === 0, "Doppelt kodierte Zeichen:\n       " + befunde.join("\n       "));
});

pruefe("keine Datei beginnt mit einem BOM", () => {
  // Das fehlerhafte Schreiben setzte zusätzlich ein BOM an den Dateianfang.
  const mitBom = dateien.filter((d) => readFileSync(d, "utf8").charCodeAt(0) === 0xfeff);
  wahr(mitBom.length === 0, "BOM gefunden in:\n       " + mitBom.join("\n       "));
});

pruefe("die Standardfelder haben ihre Beschriftungen und Symbole", () => {
  // Genau das, was der Encoding-Schaden zerstört hat.
  const app = readFileSync(join(PROJEKT, "src", "App.tsx"), "utf8");
  const block = app.slice(app.indexOf("DEFAULT_FIELDS_CONFIG"), app.indexOf("export default function App"));
  const umlaute = (block.match(/[äöüßÄÖÜ]/g) || []).length;
  const symbole = (block.match(/icon:\s*"[^"]+"/g) || []).length;
  wahr(umlaute > 5, `nur ${umlaute} Umlaute in den Standardfeldern gefunden`);
  wahr(symbole >= 18, `nur ${symbole} Symbole in den Standardfeldern gefunden`);
});
