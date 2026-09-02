import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gruppe, pruefe, wahr } from "../helfer";

/*
  WCAG 2.5.2 Zeigerabbruch (Stufe A).

  Das Kriterium verlangt, dass eine Funktion nicht schon beim Drücken
  ausgelöst wird. Mindestens eines muss gelten: Die Funktion läuft erst beim
  Loslassen, oder sie lässt sich vor dem Loslassen abbrechen, oder sie ist
  rückgängig zu machen.

  Warum das hier zählt: Wer die Bedienelemente nicht genau sieht, tippt
  häufiger daneben und zieht den Finger dann weg, statt loszulassen. Löst die
  Taste schon beim Aufsetzen aus, ist der Zähler falsch -- und in dieser App
  wandert ein falscher Zähler in den Monatsbericht.

  Geprüft wird am Quelltext statt im Browser, weil die Bedingung eine
  Eigenschaft des Codes ist: React löst über `onClick` beim Loslassen aus,
  über `onMouseDown` / `onPointerDown` / `onTouchStart` beim Drücken. Ein
  Browsertest müsste jede einzelne Taste antippen, um dasselbe zu zeigen.

  Stand 2026-09-02: kein einziger Treffer im gesamten `src`-Baum. Diese
  Prüfung hält es so -- sie fordert nichts Neues, sie verhindert den
  Rückschritt.
*/

const WURZEL = new URL("../../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ENDUNGEN = [".ts", ".tsx"];

/**
 * `onTouchStart` ist bewusst mit in der Liste, obwohl es auch für harmlose
 * Zwecke taugt (etwa das Vorbereiten einer Animation). Wer es braucht, trägt
 * die Stelle hier mit Begründung ein -- das ist die Sorte Entscheidung, die
 * jemand bewusst treffen soll.
 */
const ERLAUBT: Array<{ datei: string; grund: string }> = [];

const MUSTER = /\bon(MouseDown|PointerDown|TouchStart)\s*=/;

function dateienSammeln(verzeichnis: string, treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) dateienSammeln(pfad, treffer);
    else if (ENDUNGEN.some((e) => pfad.endsWith(e))) treffer.push(pfad);
  }
  return treffer;
}

gruppe("Zeigerabbruch (WCAG 2.5.2)");

const dateien = dateienSammeln(WURZEL);

pruefe("es werden überhaupt Dateien geprüft", () => {
  wahr(dateien.length > 10, `nur ${dateien.length} Dateien gefunden — Pfad falsch?`);
});

pruefe("keine Aktion hängt am Drücken statt am Loslassen", () => {
  const befunde: string[] = [];
  for (const datei of dateien) {
    if (ERLAUBT.some((a) => datei.endsWith(a.datei))) continue;
    readFileSync(datei, "utf8")
      .split("\n")
      .forEach((zeile, i) => {
        if (MUSTER.test(zeile)) {
          befunde.push(`${datei.replace(WURZEL, "src")}:${i + 1}  ${zeile.trim().slice(0, 80)}`);
        }
      });
  }
  wahr(
    befunde.length === 0,
    "Auslöser auf dem Drücken-Ereignis:\n       " + befunde.join("\n       "),
  );
});
