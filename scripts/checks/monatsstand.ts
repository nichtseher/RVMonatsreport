import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { baueMonatsstand } from "../../src/utils/monatsstand";
import type { HistoryRecord, ReportData } from "../../src/types";

/*
  Beim Monatswechsel wird aus einem Archiv-Datensatz der laufende Stand gebaut.
  Wie in der Gegenrichtung (archiv-eintrag.ts) ist ein vergessenes optionales
  Feld typkorrekt und geht trotzdem still verloren -- hier waeren es die
  Zeitstempel (Abgleich verliert gegen den anderen Geraet) oder die
  Loeschmarken (eine geloeschte Schicht kaeme zurueck).
*/

const T = "2026-08-20T10:00:00.000Z";

const laufend: ReportData = {
  month: "2026-09",
  name: "Marc Petry",
  notes: "laufende Notiz",
  values: { a: 1 },
  nameUpdatedAt: "2026-09-01T08:00:00.000Z",
};

const archiv: HistoryRecord = {
  month: "2026-08",
  name: "Archiv-Name",
  notes: "Archiv-Notiz",
  values: { a: 4, b: 2 },
  valuesUpdatedAt: { a: T },
  nameUpdatedAt: "2026-08-19T09:00:00.000Z",
  notesUpdatedAt: "2026-08-20T11:00:00.000Z",
  savedAt: "2026-08-31T12:00:00.000Z",
  timeLogs: [],
  geloeschteSchichten: { alt1: "2026-08-21T08:00:00.000Z" },
};

gruppe("Monatsstand bauen");

pruefe("aus dem Archiv: alle Felder samt Zeitstempeln und Loeschmarken", () => {
  const s = baueMonatsstand("2026-08", laufend, archiv);
  gleich(s.month, "2026-08");
  gleich(s.name, "Archiv-Name");
  gleich(s.notes, "Archiv-Notiz");
  gleich(s.values, { a: 4, b: 2 });
  gleich(s.nameUpdatedAt, "2026-08-19T09:00:00.000Z");
  gleich(s.notesUpdatedAt, "2026-08-20T11:00:00.000Z");
  gleich(s.geloeschteSchichten, { alt1: "2026-08-21T08:00:00.000Z" });
  gleich(s.timeLogs, []);
});

pruefe("fehlende Wert-Zeitstempel werden mit savedAt nachgetragen", () => {
  const s = baueMonatsstand("2026-08", laufend, archiv);
  gleich(s.valuesUpdatedAt, { a: T, b: archiv.savedAt });
});

pruefe("ohne Namen im Archiv bleibt der mitgenommene, samt Zeitpunkt", () => {
  const s = baueMonatsstand("2026-08", laufend, { ...archiv, name: "", nameUpdatedAt: undefined });
  gleich(s.name, "Marc Petry");
  gleich(s.nameUpdatedAt, laufend.nameUpdatedAt);
});

pruefe("Archivstand ohne optionale Felder erfindet keine", () => {
  const knapp: HistoryRecord = { month: "2026-08", name: "X", notes: "", values: {}, savedAt: T };
  const s = baueMonatsstand("2026-08", laufend, knapp);
  wahr(!("notesUpdatedAt" in s), "notesUpdatedAt erfunden");
  wahr(!("geloeschteSchichten" in s), "geloeschteSchichten erfunden");
  gleich(s.timeLogs, []);
});

pruefe("neuer Monat: leer, Name samt Zeitpunkt bleibt", () => {
  const s = baueMonatsstand("2026-10", laufend, undefined);
  gleich(s, {
    month: "2026-10",
    name: "Marc Petry",
    notes: "",
    values: {},
    timeLogs: [],
    nameUpdatedAt: "2026-09-01T08:00:00.000Z",
  });
});

pruefe("neuer Monat ohne Namen: kein Zeitpunkt aus dem Nichts", () => {
  const s = baueMonatsstand("2026-10", { ...laufend, name: "" }, undefined);
  wahr(!("nameUpdatedAt" in s), "nameUpdatedAt erfunden");
  const o = baueMonatsstand("2026-10", null, undefined);
  gleich(o.name, "");
});
