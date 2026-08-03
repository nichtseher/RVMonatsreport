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

const WURZEL = new URL("../../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ENDUNGEN = [".ts", ".tsx", ".css"];

/** Absichtliche Vorkommen: Der Changelog erklärt den Fehler von damals. */
const ERLAUBT: Array<{ datei: string; text: string }> = [
  { datei: "ChangelogModal.tsx", text: "Anzahl VorfÃ¼hrungen" },
];

const MUSTER = /Ã[¤¶¼ŸœÄÖ„]|Ã|â€[žœ“”]|ï¿½|ðŸ/;

function dateienSammeln(verzeichnis: string, treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) dateienSammeln(pfad, treffer);
    else if (ENDUNGEN.some((e) => pfad.endsWith(e))) treffer.push(pfad);
  }
  return treffer;
}

gruppe("Textkodierung der Quelldateien");

const dateien = dateienSammeln(WURZEL);

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
        befunde.push(`${datei.replace(WURZEL, "src")}:${i + 1}  ${zeile.trim().slice(0, 80)}`);
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
  const app = readFileSync(join(WURZEL, "App.tsx"), "utf8");
  const block = app.slice(app.indexOf("DEFAULT_FIELDS_CONFIG"), app.indexOf("export default function App"));
  const umlaute = (block.match(/[äöüßÄÖÜ]/g) || []).length;
  const symbole = (block.match(/icon:\s*"[^"]+"/g) || []).length;
  wahr(umlaute > 5, `nur ${umlaute} Umlaute in den Standardfeldern gefunden`);
  wahr(symbole >= 18, `nur ${symbole} Symbole in den Standardfeldern gefunden`);
});
