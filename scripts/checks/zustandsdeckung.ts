import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gruppe, pruefe, wahr } from "../helfer";

/*
  Zustandsdeckung: ein Zähler gegen den häufigsten Prüffehler dieses Projekts.

  ANLASS

  Zwischen 0.9.22 und 0.9.26 wurde sechsmal derselbe Fehler gefunden, und
  jedes Mal auf dieselbe Weise: Das Oberflächen-Prüfnetz zielt auf `activeTab`
  -- also auf das, was ein `?tab=` oder ein Menüpunkt erreicht. Die Defekte
  saßen in Zuständen DARUNTER, die ein Klick oder ein gespeicherter Schalter
  herstellt.

    manage                    5 Defekte, darunter eine Tastaturfalle
    Formulare der Stempeluhr  4 Fehlerklassen, 11 zu kleine Bedienelemente
    Zustände des Geräte-Syncs 3 Defekte, darunter die Ausstiegstaste mit 24 px
    Archiv mit Bestand        7 Namensverstöße; die Ansicht galt als geprüft,
                              gemessen wurde aber immer der leere Bildschirm
    Formularzustände          Trefferflächen 34-38 px in der meistgeprüften
                              Ansicht überhaupt
    Ersteinstieg              ohne Befund -- aber vorher nie gemessen

  Die Gegenmaßnahme war bis 0.9.26 eine Liste in `tests/oberflaeche.spec.ts`,
  die jemand pflegen muss. Das ist dieselbe Art von Zusage, die hier schon
  sechsmal versagt hat: Sie kostet nichts, wenn man sie vergisst, und die
  Prüfliste bleibt grün.

  WAS DIESE PRÜFUNG TUT

  Sie zählt in den Dateien, die Oberfläche zeichnen, die Zustandsschalter, an
  denen typischerweise ein Rendern hängt -- `useState` mit `true`, `false`
  oder einem Zeichenketten-Literal als Anfangswert. Weicht die Zahl von der
  hinterlegten ab, schlägt der Lauf fehl.

  Sie beweist NICHT, dass ein Zustand geprüft ist. Sie erzwingt eine
  Entscheidung: Wer einen Schalter hinzufügt, muss ihn entweder ins Prüfnetz
  aufnehmen oder die Zahl hier heraufsetzen und dazuschreiben, warum er keine
  Deckung braucht. Aus „daran denken" wird „nicht weiterkommen".

  Der Zähler ist bewusst grob. Ein genauerer Aufbau (welche Zustände welche
  Zweige zeichnen) wäre ein kleiner Übersetzer und hätte eigene Fehler; dieser
  hier hat keine, weil er nichts behauptet außer einer Zahl.
*/

const WURZEL = new URL("../../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * Nur Dateien, die Oberfläche zeichnen. Die Haken unter `src/hooks/` tragen
 * ebenfalls solche Schalter (Ladezustände, Sprachausgabe), zeichnen aber
 * nichts und können deshalb auch nichts verstecken.
 */
const GEZAEHLT = (pfad: string) =>
  pfad.endsWith("App.tsx") || pfad.includes(`${"components"}${"/"}`) || pfad.includes("components\\");

const MUSTER = /useState(?:<[^>]*>)?\(\s*(?:false|true|"[^"]*"|'[^']*')\s*\)/g;

/**
 * Stand vom 2026-09-07, Fassung 0.9.27.
 *
 * Ändert sich eine Zahl, ist das kein Fehler der Prüfung, sondern ihre
 * Aufgabe. Die Meldung sagt, was zu tun ist.
 */
const ERWARTET: Record<string, number> = {
  "App.tsx": 10,
  "A11yModal.tsx": 1,
  "ClockInWidget.tsx": 14,
  "DeviceSyncModal.tsx": 6,
  "HelpModal.tsx": 1,
  "HistoryModal.tsx": 1,
  "QuickEntryPanel.tsx": 1,
  "SecureBackupModal.tsx": 3,
  "StatsModal.tsx": 2,
  "TimeModal.tsx": 1,
};

function dateienSammeln(verzeichnis: string, treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) dateienSammeln(pfad, treffer);
    else if (pfad.endsWith(".tsx") && GEZAEHLT(pfad)) treffer.push(pfad);
  }
  return treffer;
}

gruppe("Zustandsdeckung der Oberfläche");

const dateien = dateienSammeln(WURZEL);

pruefe("es werden überhaupt Dateien geprüft", () => {
  wahr(dateien.length >= 10, `nur ${dateien.length} Dateien gefunden — Pfad falsch?`);
});

const gezaehlt: Record<string, number> = {};
for (const pfad of dateien) {
  const name = pfad.split(/[\\/]/).pop() as string;
  const inhalt = readFileSync(pfad, "utf8");
  const n = (inhalt.match(MUSTER) || []).length;
  if (n > 0) gezaehlt[name] = n;
}

pruefe("kein unbemerkt hinzugekommener Zustandsschalter", () => {
  const abweichungen: string[] = [];
  for (const name of new Set([...Object.keys(ERWARTET), ...Object.keys(gezaehlt)])) {
    const soll = ERWARTET[name] ?? 0;
    const ist = gezaehlt[name] ?? 0;
    if (soll !== ist) abweichungen.push(`${name}: erwartet ${soll}, gefunden ${ist}`);
  }
  wahr(
    abweichungen.length === 0,
    `Die Zahl der Zustandsschalter hat sich geändert:\n    ${abweichungen.join("\n    ")}\n\n` +
      `  Das ist kein Fehler dieser Prüfung, sondern ihr Zweck. Zu tun:\n` +
      `    1. Zeichnet der neue Zustand etwas, das ein Nutzer bedient?\n` +
      `       Dann in tests/oberflaeche.spec.ts aufnehmen -- je nach Ort in\n` +
      `       EINSTIEGE, ZEIT_FORMULARE, SYNC_ZUSTAENDE, ARCHIV_ZUSTAENDE,\n` +
      `       FORMULAR_ZUSTAENDE oder EINSTIEG_SCHRITTE -- UND in\n` +
      `       ZUSTAENDE_MIT_SCHRIFT am Dateiende.\n` +
      `    2. Zeichnet er nichts (reiner Eingabepuffer, Ladeflagge)?\n` +
      `       Dann hier die Zahl heraufsetzen und dazuschreiben, warum.\n` +
      `    Sechs Defektserien zwischen 0.9.22 und 0.9.26 entstanden dadurch,\n` +
      `    dass Schritt 1 vergessen wurde und niemand es merkte.`,
  );
});

pruefe("die hinterlegten Dateien gibt es noch", () => {
  const verschwunden = Object.keys(ERWARTET).filter((n) => !(n in gezaehlt));
  wahr(
    verschwunden.length === 0,
    `In ERWARTET stehen Dateien ohne Fund: ${verschwunden.join(", ")} — ` +
      `umbenannt oder gelöscht? Dann hier nachziehen.`,
  );
});
