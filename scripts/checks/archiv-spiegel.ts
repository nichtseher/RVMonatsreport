import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { spiegleMonat, inhaltsFingerabdruck } from "../../src/utils/archivEintrag";
import type { HistoryRecord, ReportData, SectionsConfig } from "../../src/types";

/*
  Der Archiv-Spiegel brach bis 0.9.71 ab, sobald der laufende Monat keinen
  Inhalt hatte -- auch wenn es schon einen Eintrag gab. Wer den einzigen Zaehler
  wieder leerte oder die einzige Schicht loeschte, liess den alten Stand im
  Archiv stehen. Nachgestellt am 2026-10-02: Der Bericht zeigte 0, das Archiv
  weiter 2, und der naechste Abgleich holte die geloeschte Schicht zurueck.
*/

const felder: SectionsConfig = {
  s1: [{ id: "vf_schule", label: "Vorführungen Schule", step: 1 }],
  s2: [],
  s3: [],
  s4: [],
};
const andereFelder: SectionsConfig = {
  ...felder,
  s2: [{ id: "eigene", label: "Eigene", step: 1, isCustom: true }],
};

const T1 = "2026-10-05T10:00:00.000Z";
const T2 = "2026-10-05T10:05:00.000Z";
const T3 = "2026-10-05T10:10:00.000Z";

const mitZahl: ReportData = {
  month: "2026-10", name: "M", notes: "", values: { vf_schule: 2 },
  valuesUpdatedAt: { vf_schule: T1 }, timeLogs: [],
};
const geleert: ReportData = {
  ...mitZahl, values: { vf_schule: "" }, valuesUpdatedAt: { vf_schule: T2 },
};
const leer: ReportData = { month: "2026-10", name: "M", notes: "", values: {}, timeLogs: [] };

const schicht = {
  id: "l1", date: "2026-10-01", clockIn: "08:00", clockOut: "16:00", breakMinutes: 30,
  duration: 7.5, officeRatio: 0.5, officeHours: 3.75, fieldHours: 3.75,
};

gruppe("Archiv-Spiegel: neu anlegen oder aktualisieren");

pruefe("ein Monat mit Inhalt wird angelegt", () => {
  const neu = spiegleMonat({}, mitZahl, felder, T1);
  wahr(neu !== null, "kein Eintrag angelegt");
  gleich(neu?.["2026-10"].values, { vf_schule: 2 });
  gleich(neu?.["2026-10"].savedAt, T1);
});

pruefe("ein leerer Monat OHNE Eintrag wird nicht angelegt (Liste füllt sich nicht mit 'Zähler: 0')", () => {
  gleich(spiegleMonat({}, leer, felder, T1), null);
});

pruefe("ein geleerter Monat MIT Eintrag wird aktualisiert -- der alte Stand bleibt nicht stehen", () => {
  const archiv = spiegleMonat({}, mitZahl, felder, T1)!;
  const danach = spiegleMonat(archiv, geleert, felder, T3);
  wahr(danach !== null, "der Eintrag blieb auf dem alten Stand stehen");
  gleich(danach?.["2026-10"].values, { vf_schule: "" });
  gleich(danach?.["2026-10"].savedAt, T3);
});

pruefe("die einzige Schicht gelöscht: der Eintrag trägt Marke und leere Liste", () => {
  const mitSchicht: ReportData = { ...mitZahl, values: {}, valuesUpdatedAt: {}, timeLogs: [schicht] };
  const archiv = spiegleMonat({}, mitSchicht, felder, T1)!;
  const ohneSchicht: ReportData = {
    ...mitSchicht, timeLogs: [], geloeschteSchichten: { l1: T2 },
  };
  const danach = spiegleMonat(archiv, ohneSchicht, felder, T3);
  wahr(danach !== null, "die Löschung kam nicht ins Archiv");
  gleich(danach?.["2026-10"].timeLogs, []);
  gleich(danach?.["2026-10"].geloeschteSchichten, { l1: T2 });
});

pruefe("unveränderter Inhalt: nichts zu schreiben (sonst schriebe jeder Takt das ganze Archiv)", () => {
  const archiv = spiegleMonat({}, mitZahl, felder, T1)!;
  gleich(spiegleMonat(archiv, mitZahl, felder, T3), null);
});

pruefe("eine Änderung nur an Notiz-Zeitpunkt oder Name-Zeitpunkt wird erkannt", () => {
  const archiv = spiegleMonat({}, mitZahl, felder, T1)!;
  wahr(
    spiegleMonat(archiv, { ...mitZahl, notesUpdatedAt: T2 }, felder, T3) !== null,
    "notesUpdatedAt wird im Fingerabdruck nicht berücksichtigt",
  );
  wahr(
    spiegleMonat(archiv, { ...mitZahl, nameUpdatedAt: T2 }, felder, T3) !== null,
    "nameUpdatedAt wird im Fingerabdruck nicht berücksichtigt",
  );
});

pruefe("die Versand-Markierung bleibt beim Aktualisieren erhalten", () => {
  const archiv: Record<string, HistoryRecord> = {
    "2026-10": {
      month: "2026-10", name: "M", notes: "", values: { vf_schule: 2 }, savedAt: T1,
      sentAt: T2, sentUpdatedAt: T2,
    },
  };
  const danach = spiegleMonat(archiv, geleert, felder, T3);
  gleich(danach?.["2026-10"].sentAt, T2);
});

gruppe("Archiv-Spiegel: Feld-Aufbau");

pruefe("beim Spiegeln zählt ein geänderter Feld-Aufbau als Änderung", () => {
  const archiv = spiegleMonat({}, mitZahl, felder, T1)!;
  wahr(spiegleMonat(archiv, mitZahl, andereFelder, T3) !== null, "neuer Feld-Aufbau wurde nicht gespiegelt");
});

pruefe("beim Geräteabgleich zählt er NICHT (sonst wäre jedes Zusammenführen eine Änderung)", () => {
  const archiv = spiegleMonat({}, mitZahl, felder, T1)!;
  gleich(spiegleMonat(archiv, mitZahl, andereFelder, T3, false), null);
});

pruefe("der Fingerabdruck ignoriert savedAt und die Schlüsselreihenfolge", () => {
  const a = spiegleMonat({}, mitZahl, felder, T1)!["2026-10"];
  const b = { ...a, savedAt: T3 };
  gleich(inhaltsFingerabdruck(a), inhaltsFingerabdruck(b));
});
