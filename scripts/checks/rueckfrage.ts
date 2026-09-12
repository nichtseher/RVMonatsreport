import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gruppe, pruefe, wahr, gleich } from "../helfer";
import { rueckfrageOffen } from "../../src/utils/rueckfrage";

/*
  Die Wache, die verhindert, dass ein Escape zwei Dinge zugleich schliesst.

  ANLASS (gemessen am 2026-09-12)

  Die Rückfrage (`ConfirmDialog`) und die Ansicht dahinter hören beide auf
  `keydown` am `window`. Ein Escape, das die Rückfrage abbrechen sollte, hat
  deshalb beides geschlossen:

    Feldverwaltung  „Kategorie löschen?" → Escape → zurück in den Optionen
    Geräte-Sync     „Alles ersetzen?"    → Escape → Sync-Fenster zu, und das
                    bereits EMPFANGENE Paket verfallen

  Behoben über `rueckfrageOffen()` in jedem Tastatur-Zuhörer, der im
  Hintergrund liegen kann.

  WAS DIESE PRÜFUNG TUT

  Drei Dinge, und das dritte ist das eigentliche:

  1. Die Funktion selbst, gegen ein gestelltes `document`.
  2. Die Kopplung an die Rolle: Der Selektor hier und das `role` in
     `ConfirmDialog.tsx` müssen dasselbe sein. Wer die Rolle ändert, ohne den
     Selektor nachzuziehen, legt die Wache still.
  3. **Vollzähligkeit.** Jede Datei, die einen `keydown`-Zuhörer anmeldet,
     muss ihn entweder haben oder ausdrücklich in der Ausnahmeliste unten
     stehen. Aus „daran denken" wird „nicht weiterkommen" -- dieselbe Bauart
     wie `zustandsdeckung.ts`, und aus demselben Grund: Eine Zusage, die
     nichts kostet, wenn man sie vergisst, ist in diesem Projekt schon
     mehrfach vergessen worden.
*/

const WURZEL = new URL("../../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * Ausnahmen, je mit Grund. Wer eine hinzufügt, schreibt den Grund dazu.
 */
const OHNE_WACHE: Record<string, string> = {
  "ConfirmDialog.tsx":
    "Die Rückfrage selbst. Sie ist der modale Vordergrund -- ihr Escape ist " +
    "genau das, was greifen soll.",
  "OnboardingModal.tsx":
    "Der Ersteinstieg liegt als Overlay über allem und kann keine Rückfrage " +
    "hinter sich haben: Er wird beendet, bevor irgendetwas Zerstörendes " +
    "erreichbar ist. Sein Zuhörer behandelt ausserdem nur Tab, nicht Escape.",
};

/** Alle Dateien unter `src/`, die einen `keydown`-Zuhörer anmelden. */
function dateienMitTastaturZuhoerer(): { name: string; inhalt: string }[] {
  const treffer: { name: string; inhalt: string }[] = [];
  const gehe = (verzeichnis: string) => {
    for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
      const pfad = join(verzeichnis, eintrag.name);
      if (eintrag.isDirectory()) {
        gehe(pfad);
        continue;
      }
      if (!eintrag.name.endsWith(".tsx") && !eintrag.name.endsWith(".ts")) continue;
      const inhalt = readFileSync(pfad, "utf8");
      if (/addEventListener\(\s*["']keydown["']/.test(inhalt)) treffer.push({ name: eintrag.name, inhalt });
    }
  };
  gehe(WURZEL);
  return treffer.sort((a, b) => a.name.localeCompare(b.name));
}

gruppe("Rückfrage-Wache");

pruefe("ohne Rückfrage im Dokument meldet sie 'zu'", () => {
  (globalThis as { document?: unknown }).document = {
    querySelector: () => null,
  };
  gleich(rueckfrageOffen(), false);
  delete (globalThis as { document?: unknown }).document;
});

pruefe("mit Rückfrage im Dokument meldet sie 'offen'", () => {
  let gefragt = "";
  (globalThis as { document?: unknown }).document = {
    querySelector: (s: string) => {
      gefragt = s;
      return {};
    },
  };
  gleich(rueckfrageOffen(), true);
  gleich(gefragt, '[role="alertdialog"]', "Es wird nach der falschen Rolle gesucht");
  delete (globalThis as { document?: unknown }).document;
});

pruefe("der Selektor passt zur Rolle, die ConfirmDialog wirklich setzt", () => {
  const dialog = readFileSync(join(WURZEL, "components", "ConfirmDialog.tsx"), "utf8");
  const wache = readFileSync(join(WURZEL, "utils", "rueckfrage.ts"), "utf8");

  const rolleImDialog = dialog.match(/role=\{?"(\w+)"/g)?.filter((t) => t.includes("dialog")) ?? [];
  wahr(
    rolleImDialog.some((t) => t.includes("alertdialog")),
    "ConfirmDialog setzt kein role=\"alertdialog\" mehr. Entweder die Rolle " +
      "zurücksetzen oder den Selektor in utils/rueckfrage.ts nachziehen -- " +
      "sonst greift die Wache gegen den doppelten Abbruch ins Leere.",
  );
  wahr(
    wache.includes('[role="alertdialog"]'),
    "utils/rueckfrage.ts sucht nicht mehr nach role=\"alertdialog\".",
  );
});

pruefe("jeder Tastatur-Zuhörer hat die Wache oder eine begründete Ausnahme", () => {
  const dateien = dateienMitTastaturZuhoerer();

  // Die Suche muss überhaupt etwas finden können: Ein leeres Ergebnis wäre
  // sonst stillschweigend grün -- genau die Art Messung, die dieses Projekt
  // schon einmal in einen falschen Befund laufen liess.
  wahr(
    dateien.length >= 3,
    `Nur ${dateien.length} Datei(en) mit keydown-Zuhörer gefunden. Das Muster ` +
      `trifft nicht mehr; die Prüfung wäre ab hier wirkungslos.`,
  );

  const fehlend = dateien
    .filter((d) => !(d.name in OHNE_WACHE))
    .filter((d) => !d.inhalt.includes("rueckfrageOffen()"))
    .map((d) => d.name);

  wahr(
    fehlend.length === 0,
    `Diese Dateien melden einen keydown-Zuhörer an, fragen aber nicht ` +
      `rueckfrageOffen() ab: ${fehlend.join(", ")}. Entweder die Wache ` +
      `einsetzen oder in OHNE_WACHE eintragen -- mit Grund. Ohne sie schließt ` +
      `ein Escape, das nur die Rückfrage abbrechen soll, auch die Ansicht ` +
      `dahinter; im Geräte-Sync kostet das das bereits empfangene Paket.`,
  );
});

/*
  ANLASS FÜR DIE NÄCHSTE PRÜFUNG (2026-09-12, nach 0.9.32)

  Der erste Entwurf von 0.9.32 führte „alle sechs Rückfragen" auf -- in
  DEVLOG, ROADMAP, Konformitätsbericht und Changelog. Es sind **sieben**. Die
  siebte (`useExport.ts`, „Monatsabschluss-Check") steht vor dem Senden an die
  Vertriebsleitung und war in keiner Messung.

  Gefunden hat sie kein Prüflauf, sondern das Nachzählen der eigenen Zusage.
  Genau das macht diese Prüfung jetzt bei jedem Lauf: Sie zählt die
  `setConfirmRequest`-Aufrufe im Quelltext gegen die Einträge in `RUECKFRAGEN`
  in `tests/oberflaeche.spec.ts`.

  Warum hier und nicht im Oberflächen-Gate: Das Gate misst, was in seiner
  Liste steht -- es kann per Bauart nicht bemerken, dass etwas fehlt. Eine
  Liste, die jemand pflegen muss, hat in diesem Projekt schon dreimal versagt
  (`EINSTIEGE` 0.9.21, `ZUSTAENDE_MIT_SCHRIFT` 0.9.27, `RUECKFRAGEN` jetzt).
*/
pruefe("jede Rückfrage im Quelltext steht auch im Oberflächen-Prüfnetz", () => {
  const gefunden: string[] = [];
  const gehe = (verzeichnis: string) => {
    for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
      const pfad = join(verzeichnis, eintrag.name);
      if (eintrag.isDirectory()) {
        gehe(pfad);
        continue;
      }
      if (!/\.tsx?$/.test(eintrag.name)) continue;
      const inhalt = readFileSync(pfad, "utf8");
      // setConfirmRequest({ ... title: "..." }) -- der Titel steht in den
      // ersten Zeilen des Objekts.
      const muster = /setConfirmRequest\(\{[\s\S]{0,140}?title:\s*(`[^`]*`|"[^"]*")/g;
      let treffer: RegExpExecArray | null;
      while ((treffer = muster.exec(inhalt))) {
        gefunden.push(`${eintrag.name}: ${treffer[1].replace(/[`"]/g, "").trim()}`);
      }
    }
  };
  gehe(WURZEL);

  wahr(
    gefunden.length >= 5,
    `Nur ${gefunden.length} Rückfrage(n) im Quelltext gefunden — das Muster ` +
      `trifft nicht mehr, die Prüfung wäre ab hier wirkungslos.`,
  );

  const spec = readFileSync(
    new URL("../../tests/oberflaeche.spec.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    "utf8",
  );
  const ab = spec.indexOf("const RUECKFRAGEN");
  wahr(ab >= 0, "In tests/oberflaeche.spec.ts gibt es keine Liste RUECKFRAGEN mehr.");
  const block = spec.slice(ab, spec.indexOf("] as const;", ab));
  const imNetz = (block.match(/name:\s*"Rückfrage: /g) || []).length;

  wahr(
    imNetz === gefunden.length,
    `Im Quelltext stehen ${gefunden.length} Rückfragen, im Prüfnetz ${imNetz}.\n` +
      `       Gefunden: ${gefunden.join(" | ")}\n` +
      `       Wer eine Rückfrage hinzufügt, trägt sie in RUECKFRAGEN ein — ` +
      `sonst wird sie nie gerendert und nie gemessen. Genau so ist die ` +
      `siebte (Monatsabschluss-Check) bis 0.9.32 durchgerutscht.`,
  );
});
