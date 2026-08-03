import { readFileSync } from "node:fs";
import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { ICON_KARTE, getIconForString } from "../../src/utils/iconMap";

/*
  Zwei Regeln, die nach dem Aufräumen in 0.9.6 gelten sollen:

  1. Jedes Symbol, das die App einer Kategorie zuweisen kann, muss in der
     ICON_KARTE stehen. Fehlt ein Eintrag, zeichnet CounterField das Emoji roh
     -- es sieht dann auf jedem Gerät anders aus und folgt keinem Farbschema.

  2. In Meldungen (triggerToast / announceToAriaAndSpeech) haben Emojis nichts
     zu suchen: Screenreader lesen sie mit vor.
*/

const quelle = (p: string) =>
  readFileSync(new URL("../../src/" + p, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "utf8");

const app = quelle("App.tsx");
const optionen = quelle("components/A11yModal.tsx");

gruppe("Symbole der Kategorien");

pruefe("jedes Standard-Symbol hat ein Icon", () => {
  const symbole = [...app.matchAll(/icon:\s*"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((s) => !s.includes("/") && !s.includes(".png"));
  wahr(symbole.length > 10, `nur ${symbole.length} Standard-Symbole gefunden — Suchmuster falsch?`);
  const ohne = [...new Set(symbole)].filter((s) => !getIconForString(s));
  gleich(ohne, [], "diese Standard-Symbole haben kein Icon");
});

pruefe("jedes wählbare Symbol hat ein Icon", () => {
  // Nur die Symbol-Auswahl, nicht die anderen Auswahllisten der Optionen
  const ab = optionen.indexOf('id="new-field-icon"');
  wahr(ab > -1, "Symbol-Auswahlliste nicht gefunden — wurde sie umbenannt?");
  const bis = optionen.indexOf("</select>", ab);
  const symbole = [...optionen.slice(ab, bis).matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  wahr(symbole.length > 10, `nur ${symbole.length} wählbare Symbole gefunden — Suchmuster falsch?`);
  const ohne = [...new Set(symbole)].filter((s) => !getIconForString(s));
  gleich(ohne, [], "diese wählbaren Symbole haben kein Icon");
});

pruefe("die Ersatzsymbole aus dem Altbestand sind weiterhin abgedeckt", () => {
  // Kategorien aus früheren Fassungen dürfen nicht plötzlich ohne Symbol dastehen
  for (const alt of ["⭐", "🏠", "🔧", "☎️"]) {
    wahr(!!getIconForString(alt), `Altbestand-Symbol ${alt} fehlt in der Karte`);
  }
});

pruefe("unbekannte Zeichen liefern null statt zu werfen", () => {
  gleich(getIconForString("🦄"), null);
  gleich(getIconForString(""), null);
  gleich(getIconForString(undefined), null);
});

pruefe("die Karte enthält keine leeren Einträge", () => {
  const leer = Object.entries(ICON_KARTE).filter(([, v]) => !v).map(([k]) => k);
  gleich(leer, []);
});

gruppe("Meldungen ohne Emoji");

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

pruefe("Toasts und Ansagen enthalten keine Emojis", () => {
  const befunde: string[] = [];
  for (const [datei, inhalt] of [
    ["App.tsx", app],
    ["components/ClockInWidget.tsx", quelle("components/ClockInWidget.tsx")],
    ["components/HistoryModal.tsx", quelle("components/HistoryModal.tsx")],
    ["components/DeviceSyncModal.tsx", quelle("components/DeviceSyncModal.tsx")],
  ] as const) {
    for (const m of inhalt.matchAll(/(triggerToast|announceToAriaAndSpeech)\(\s*(["'`])((?:\\.|(?!\2)[^\\])*)\2/g)) {
      if (EMOJI.test(m[3])) befunde.push(`${datei}: ${m[3].slice(0, 60)}`);
    }
  }
  gleich(befunde, [], "Emojis in Meldungen gefunden");
});
