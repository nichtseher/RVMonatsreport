import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gruppe, pruefe, wahr, gleich } from "../helfer";

/*
  Die Wache über den Fokus beim Ansichtswechsel.

  ANLASS (gemessen am 2026-09-15 auf 0.9.40)

  Keine der zwölf Ansichten setzte den Fokus dorthin, wo er hingehört:

    untere Leiste -> alle fünf Ansichten   Fokus blieb auf der Navigationstaste
    Optionen -> Changelog, Datensicherung  `document.body`, also gar kein Fokus
    Optionen -> fünf weitere Ansichten     auf „Zurück zu den Optionen"
    „Zurück" aus der Hilfe                 `document.body`

  Seit 0.9.41 setzt `useAnsichtsFokus` den Fokus zentral auf die Überschrift
  der neuen Ansicht. Damit das trägt, braucht **jede** Ansicht genau eine
  markierte Überschrift -- und genau das prüft diese Datei.

  WARUM ALS ZÄHLPRÜFUNG UND NICHT IM OBERFLÄCHEN-GATE

  Das Gate misst, was in seiner Liste steht; es kann per Bauart nicht
  bemerken, dass eine Ansicht fehlt. Dieselbe Lücke hat in diesem Projekt
  schon dreimal zugeschlagen (`EINSTIEGE` 0.9.21, `ZUSTAENDE_MIT_SCHRIFT`
  0.9.27, `RUECKFRAGEN` 0.9.32). Hier wird deshalb der Quelltext gegen die
  Liste gezählt: Wer einen Wert zu `activeTab` hinzufügt, kommt ohne Eintrag
  in ANSICHT_DATEI nicht weiter.
*/

const WURZEL = new URL("../../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** Die Markierung an der Überschrift -- muss zu `useAnsichtsFokus.ts` passen. */
const MARKE = "data-ansicht-titel";

/*
  Gezählt wird die ATTRIBUT-Form, nicht der blosse Name: Die Fokusfalle in
  `DeviceSyncModal` sucht mit `querySelector("[data-ansicht-titel]")` nach
  derselben Markierung, und beim ersten Lauf dieser Prüfung galt das als
  zweite Überschrift in derselben Datei. Der Befund war falsch, die Prüfung
  zu grob -- im Dokument steht nachweislich genau eine Markierung.
*/
const MARKE_ATTR = 'data-ansicht-titel="';

/**
 * Welche Datei die Überschrift welcher Ansicht trägt.
 *
 * Die Zuordnung steht hier als Liste und nicht als Heuristik: Wer sie ändert,
 * sieht, was er ändert.
 */
const ANSICHT_DATEI: Record<string, string> = {
  form: "App.tsx",
  time: "components/TimeModal.tsx",
  stats: "components/StatsModal.tsx",
  history: "components/HistoryModal.tsx",
  options: "components/A11yModal.tsx",
  help: "components/HelpModal.tsx",
  backup: "components/SecureBackupModal.tsx",
  manage: "components/ManageModal.tsx",
  carryover: "components/CarryoverModal.tsx",
  bestand: "components/BestandModal.tsx",
  sync: "components/DeviceSyncModal.tsx",
  changelog: "components/ChangelogModal.tsx",
  erklaerung: "components/BarrierefreiheitModal.tsx",
};

/** Die `activeTab`-Werte, wie sie in App.tsx wirklich deklariert sind. */
function ansichtenAusQuelltext(): string[] {
  const app = readFileSync(join(WURZEL, "App.tsx"), "utf8");
  const zeile = app.match(/const \[activeTab, setActiveTab\] = useState<([^>]+)>/);
  if (!zeile) return [];
  return [...zeile[1].matchAll(/"([a-z]+)"/g)].map((t) => t[1]);
}

/** Alle Dateien unter `src/`, die die Markierung tragen. */
function dateienMitMarke(): string[] {
  const treffer: string[] = [];
  const gehe = (verzeichnis: string) => {
    for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
      const pfad = join(verzeichnis, eintrag.name);
      if (eintrag.isDirectory()) {
        gehe(pfad);
        continue;
      }
      if (!/\.tsx$/.test(eintrag.name)) continue;
      const inhalt = readFileSync(pfad, "utf8");
      const n = inhalt.split(MARKE_ATTR).length - 1;
      for (let i = 0; i < n; i++) treffer.push(pfad.slice(WURZEL.length + 1).replace(/\\/g, "/"));
    }
  };
  gehe(WURZEL);
  return treffer;
}

gruppe("Fokus beim Ansichtswechsel");

pruefe("jede Ansicht aus activeTab hat eine zugeordnete Datei", () => {
  const ansichten = ansichtenAusQuelltext();

  // Die Suche muss überhaupt etwas finden können -- ein leeres Ergebnis wäre
  // sonst stillschweigend grün.
  wahr(
    ansichten.length >= 10,
    `Nur ${ansichten.length} Ansicht(en) in der activeTab-Deklaration gefunden. ` +
      `Das Muster trifft nicht mehr; die Prüfung wäre ab hier wirkungslos.`,
  );

  const ohne = ansichten.filter((a) => !(a in ANSICHT_DATEI));
  wahr(
    ohne.length === 0,
    `Diese Ansichten stehen in activeTab, aber nicht in ANSICHT_DATEI: ` +
      `${ohne.join(", ")}. Wer eine Ansicht hinzufügt, markiert ihre ` +
      `Überschrift mit ${MARKE} und trägt sie hier ein -- sonst landet der ` +
      `Fokus dort beim Wechsel nirgends.`,
  );

  const zuviel = Object.keys(ANSICHT_DATEI).filter((a) => !ansichten.includes(a));
  wahr(
    zuviel.length === 0,
    `Diese Einträge in ANSICHT_DATEI gibt es als Ansicht nicht mehr: ${zuviel.join(", ")}.`,
  );
});

pruefe("jede Ansicht trägt genau eine markierte Überschrift", () => {
  for (const [ansicht, datei] of Object.entries(ANSICHT_DATEI)) {
    const inhalt = readFileSync(join(WURZEL, datei), "utf8");
    const n = inhalt.split(MARKE_ATTR).length - 1;
    gleich(
      n,
      1,
      `${datei} (Ansicht „${ansicht}") trägt ${n} Markierungen ${MARKE}, ` +
        `erwartet genau eine. Der Haken sucht mit querySelector, nimmt also ` +
        `die erste im Dokument -- bei zweien landet der Fokus irgendwo.`,
    );
  }
});

pruefe("die Markierung sitzt nirgends sonst", () => {
  const gefunden = dateienMitMarke();
  const erwartet = Object.values(ANSICHT_DATEI).sort();
  gleich(
    gefunden.sort().join(", "),
    erwartet.join(", "),
    `Die Markierung ${MARKE} steht in anderen Dateien als den zwölf ` +
      `Ansichten. Zur Laufzeit ist immer nur eine Ansicht im Dokument; eine ` +
      `zweite Markierung anderswo macht daraus ein Ratespiel.`,
  );
});

pruefe("die markierte Überschrift ist fokussierbar", () => {
  for (const [ansicht, datei] of Object.entries(ANSICHT_DATEI)) {
    const inhalt = readFileSync(join(WURZEL, datei), "utf8");
    const stelle = inhalt.indexOf(MARKE_ATTR);
    // Das Element-Tag um die Markierung herum: von "<" davor bis ">" danach.
    const anfang = inhalt.lastIndexOf("<", stelle);
    const ende = inhalt.indexOf(">", stelle);
    const tag = inhalt.slice(anfang, ende);
    wahr(
      tag.includes("tabIndex={-1}"),
      `${datei} (Ansicht „${ansicht}"): Die markierte Überschrift hat kein ` +
        `tabIndex={-1}. Ohne das tut focus() auf einer Überschrift nichts, ` +
        `und der Wechsel landet wieder beim Dokumentanfang.`,
    );
    wahr(
      /^<h[1-6]/.test(tag),
      `${datei} (Ansicht „${ansicht}"): Die Markierung sitzt an „${tag.slice(0, 24)}…", ` +
        `nicht an einer Überschrift. Der Fokus soll dorthin, wo der ` +
        `Screenreader „Überschrift" vorliest.`,
    );
  }
});

pruefe("der Haken wird in App.tsx auch aufgerufen", () => {
  const app = readFileSync(join(WURZEL, "App.tsx"), "utf8");
  // Das zweite Argument (die Rückkehr-Kennung, 0.9.43) ist freigestellt --
  // geprüft wird, DASS der Haken mit der aktuellen Ansicht aufgerufen wird.
  wahr(
    /useAnsichtsFokus\(activeTab[,)]/.test(app),
    "App.tsx ruft useAnsichtsFokus(activeTab) nicht mehr auf. Damit sind alle " +
      "Markierungen wirkungslos und der Fokus bleibt beim Wechsel stehen.",
  );
  const haken = readFileSync(join(WURZEL, "hooks", "useAnsichtsFokus.ts"), "utf8");
  wahr(
    haken.includes(MARKE),
    `useAnsichtsFokus.ts sucht nicht mehr nach ${MARKE}.`,
  );
});

/*
  Und die Kehrseite: kein halbes Reiter-Muster mehr.

  Bis 0.9.40 trug die untere Navigationsleiste `role="tablist"` mit
  `role="tab"` und `aria-selected` -- ohne `role="tabpanel"`, ohne
  Pfeiltastenbedienung und ohne gemeinsamen Tabulatorhalt. Der Screenreader
  sagte „Registerkarte", die Pfeiltasten taten nichts. axe-core meldet das
  nicht: Ein tablist mit tab-Kindern ist strukturell vollständig, das fehlende
  Panel ist keine seiner Regeln.
*/
pruefe("kein Reiter-Muster ohne Reiter-Bedienung", () => {
  let mitTab = 0;
  let mitPanel = 0;
  const gehe = (verzeichnis: string) => {
    for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
      const pfad = join(verzeichnis, eintrag.name);
      if (eintrag.isDirectory()) {
        gehe(pfad);
        continue;
      }
      if (!/\.tsx$/.test(eintrag.name)) continue;
      const inhalt = readFileSync(pfad, "utf8");
      if (/role=\{?"tab"/.test(inhalt) || /role=\{?"tablist"/.test(inhalt)) mitTab++;
      if (/role=\{?"tabpanel"/.test(inhalt)) mitPanel++;
    }
  };
  gehe(WURZEL);

  wahr(
    mitTab === 0 || mitPanel > 0,
    `${mitTab} Datei(en) setzen role="tab"/"tablist", aber keine setzt ` +
      `role="tabpanel". Ein Reitersatz ist ein Bedienmuster, kein Aussehen: ` +
      `Er verlangt Pfeiltasten, einen Tabulatorhalt für die Gruppe und ein ` +
      `Panel, auf das die Reiter zeigen. Wer nur die Rolle setzt, verspricht ` +
      `dem Screenreader etwas, das die Tastatur nicht einlöst.`,
  );
});
