import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { baueArchivEintrag } from "../../src/utils/archivEintrag";
import type { SectionsConfig, HistoryRecord, ReportData } from "../../src/types";

/*
  Zweimal ist derselbe Fehler passiert: Der Archiv-Datensatz wurde von Hand
  zusammengesetzt, jemand vergass ein optionales Feld, und es fiel still heraus.
  In 0.9.12 beim automatischen Speichern, in 0.9.13 beim Monatswechsel -- dort
  loeschte ein Wechsel in den Folgemonat die Markierung "an die Vertriebs-
  leitung gesendet" des abgeschlossenen Monats.

  Der Typpruefer faengt das nicht: Ein fehlendes optionales Feld ist typkorrekt.
  Deshalb hier.
*/

const felder: SectionsConfig = {
  s1: [{ id: "vf_schule", label: "Vorführungen Schule", step: 1 }],
  s2: [],
  s3: [],
  s4: [],
};

const laufend: ReportData = {
  month: "2026-08",
  name: "Marc Petry",
  notes: "Messe Frankfurt.",
  values: { vf_schule: 4 },
  valuesUpdatedAt: { vf_schule: "2026-08-20T10:00:00.000Z" },
  nameUpdatedAt: "2026-08-19T09:00:00.000Z",
  notesUpdatedAt: "2026-08-20T11:00:00.000Z",
  timeLogs: [],
  geloeschteSchichten: { alt1: "2026-08-21T08:00:00.000Z" },
};

const T_VERSAND = "2026-09-03T08:30:00.000Z";
const T_SPEICHERN = "2026-09-05T12:00:00.000Z";

const bisher: HistoryRecord = {
  month: "2026-08",
  name: "Marc Petry",
  notes: "",
  values: { vf_schule: 3 },
  savedAt: "2026-09-01T10:00:00.000Z",
  sentAt: T_VERSAND,
  sentUpdatedAt: T_VERSAND,
};

gruppe("Archiv-Datensatz bauen");

pruefe("die Werte des laufenden Monats gewinnen", () => {
  const e = baueArchivEintrag(laufend, felder, bisher, T_SPEICHERN);
  gleich(e.values, { vf_schule: 4 });
  gleich(e.notes, "Messe Frankfurt.");
  gleich(e.savedAt, T_SPEICHERN);
  gleich(e.fieldsSnapshot, felder);
});

pruefe("die Versand-Markierung wird übernommen, nicht überschrieben", () => {
  // DER Fehler, zweimal passiert: Wer den Datensatz neu baut und sentAt nicht
  // aufzaehlt, loescht die Markierung still.
  const e = baueArchivEintrag(laufend, felder, bisher, T_SPEICHERN);
  gleich(e.sentAt, T_VERSAND);
  gleich(e.sentUpdatedAt, T_VERSAND);
});

pruefe("ohne vorherigen Stand entsteht keine Markierung aus dem Nichts", () => {
  const e = baueArchivEintrag(laufend, felder, undefined, T_SPEICHERN);
  wahr(e.sentAt === undefined, "sentAt erfunden");
  wahr(e.sentUpdatedAt === undefined, "sentUpdatedAt erfunden");
});

pruefe("eine zurückgenommene Markierung bleibt zurückgenommen", () => {
  // sentAt fehlt, sentUpdatedAt ist gesetzt -> das ist eine Ruecknahme und
  // muss erhalten bleiben, sonst gewinnt beim naechsten Abgleich die alte
  // Markierung des anderen Geraets.
  const zurueckgenommen: HistoryRecord = { ...bisher, sentAt: undefined, sentUpdatedAt: T_SPEICHERN };
  const e = baueArchivEintrag(laufend, felder, zurueckgenommen, T_SPEICHERN);
  wahr(e.sentAt === undefined, "Ruecknahme wurde rueckgaengig gemacht");
  gleich(e.sentUpdatedAt, T_SPEICHERN);
});

pruefe("leere Felder werden zu leeren Werten, nicht zu undefined", () => {
  // HistoryRecord verlangt name/notes/values als Pflichtfelder. Ein
  // "undefined" darin landete frueher als Text "undefined" im Excel-Export.
  const leer = { month: "2026-09" } as ReportData;
  const e = baueArchivEintrag(leer, felder, undefined, T_SPEICHERN);
  gleich(e.name, "");
  gleich(e.notes, "");
  gleich(e.values, {});
  gleich(e.timeLogs, []);
});

pruefe("Zeitpunkte von Name und Notiz sowie Löschmarken (0.9.72) werden übernommen", () => {
  // Fehlten sie hier, fiele die Notiz beim naechsten Abgleich wieder auf den
  // Zeitstempel des ganzen Datensatzes zurueck -- und geloeschte Schichten
  // kaemen von der Gegenseite wieder.
  const e = baueArchivEintrag(laufend, felder, undefined, T_SPEICHERN);
  gleich(e.nameUpdatedAt, "2026-08-19T09:00:00.000Z");
  gleich(e.notesUpdatedAt, "2026-08-20T11:00:00.000Z");
  gleich(e.geloeschteSchichten, { alt1: "2026-08-21T08:00:00.000Z" });
});

pruefe("ohne Zeitpunkte und Marken entstehen auch keine leeren Felder", () => {
  // Ein leeres Objekt ist ein anderer Text als ein fehlendes Feld und liesse
  // den Live-Abgleich senden, obwohl sich nichts geaendert hat.
  const e = baueArchivEintrag(
    { ...laufend, nameUpdatedAt: undefined, notesUpdatedAt: undefined, geloeschteSchichten: {} },
    felder,
    undefined,
    T_SPEICHERN,
  );
  wahr(!("nameUpdatedAt" in e), "nameUpdatedAt als leeres Feld angelegt");
  wahr(!("notesUpdatedAt" in e), "notesUpdatedAt als leeres Feld angelegt");
  wahr(!("geloeschteSchichten" in e), "geloeschteSchichten als leeres Objekt angelegt");
});

pruefe("jedes Feld von HistoryRecord ist abgedeckt", () => {
  /*
    Waechter gegen die naechste Wiederholung: Kommt ein Feld zu HistoryRecord
    dazu und niemand traegt es in baueArchivEintrag ein, faellt es hier auf --
    nicht erst, wenn ein Nutzer es vermisst.
  */
  const e = baueArchivEintrag(laufend, felder, bisher, T_SPEICHERN);
  const erwartet = [
    "month", "name", "notes", "values", "valuesUpdatedAt",
    "nameUpdatedAt", "notesUpdatedAt", "geloeschteSchichten",
    "timeLogs", "fieldsSnapshot", "savedAt", "sentAt", "sentUpdatedAt",
  ].sort();
  gleich(Object.keys(e).sort(), erwartet);
});
