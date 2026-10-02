import { gruppe, pruefe, gleich } from "../helfer";
import {
  mergeValues,
  mergeSyncPayload,
  mergeTimeLogs,
  mergeFields,
  mergeHistories,
  mergeLoeschmarken,
} from "../../src/utils/merge";
import { stableStringify } from "../../src/utils/stableJson";
import type {
  SectionsConfig,
  HistoryRecord,
  ReportData,
  TimeLog,
  YearlyCarryover,
} from "../../src/types";

const T0 = "2026-08-02T15:00:00.000Z";
const TA = "2026-08-02T15:00:01.000Z"; // Gerät A tippt
const TB = "2026-08-02T15:00:01.500Z"; // Gerät B tippt, minimal später

const felder: SectionsConfig = {
  s1: [
    { id: "vf_schule", label: "Vorführungen Schule", step: 1 },
    { id: "vf_arbeit", label: "Vorführungen Arbeitsplatz", step: 1 },
  ],
  s2: [{ id: "aus_schule", label: "Auslieferungen Schule", step: 1 }],
  s3: [],
  s4: [],
};

const uebertrag: YearlyCarryover = {
  regularVacationEntitlement: 30,
  additionalVacationEntitlement: 0,
  vacationCarryover: 0,
  overtimeCarryover: 0,
  dailyTargetHours: 8,
};

const a: HistoryRecord = {
  month: "2026-08", name: "M", notes: "", savedAt: TA,
  values: { vf_schule: 4, vf_arbeit: 1 },
  valuesUpdatedAt: { vf_schule: T0, vf_arbeit: TA },
};
const b: HistoryRecord = {
  month: "2026-08", name: "M", notes: "", savedAt: TB,
  values: { vf_schule: 4, aus_schule: 1 },
  valuesUpdatedAt: { vf_schule: T0, aus_schule: TB },
};

gruppe("Zusammenführen der Zählerstände");

// Der Fehler, der bis 0.9.0 Eingaben verschluckt hat: Zwei Geräte tippen
// im selben Abgleich-Fenster in VERSCHIEDENE Felder.
pruefe("verschiedene Felder bleiben beide erhalten", () => {
  gleich(mergeValues(a, b).values, { vf_schule: 4, vf_arbeit: 1, aus_schule: 1 });
});

pruefe("Reihenfolge der Geräte ist egal", () => {
  gleich(mergeValues(b, a).values, mergeValues(a, b).values);
});

pruefe("gleiches Feld: die jüngere Änderung gewinnt", () => {
  const c = { values: { x: 7 }, valuesUpdatedAt: { x: TA }, savedAt: TA };
  const d = { values: { x: 9 }, valuesUpdatedAt: { x: TB }, savedAt: TB };
  gleich(mergeValues(c, d).values, { x: 9 });
  gleich(mergeValues(d, c).values, { x: 9 });
});

pruefe("Korrektur nach unten setzt sich durch (kein Maximum)", () => {
  const alt = { values: { x: 10 }, valuesUpdatedAt: { x: T0 }, savedAt: T0 };
  const neu = { values: { x: 3 }, valuesUpdatedAt: { x: TB }, savedAt: TB };
  gleich(mergeValues(alt, neu).values, { x: 3 });
});

pruefe("Stempelliste ist danach vollständig", () => {
  // Sonst fiele ein Feld später auf den wandernden Monats-Zeitstempel zurück
  const r = mergeValues(a, b);
  gleich(Object.keys(r.valuesUpdatedAt).sort(), Object.keys(r.values).sort());
});

gruppe("Rückfallebene für Altdaten");

pruefe("ohne Feld-Stempel entscheidet savedAt", () => {
  const altA = { values: { x: 5 }, savedAt: TA };
  const altB = { values: { x: 6 }, savedAt: TB };
  gleich(mergeValues(altA, altB).values, { x: 6 });
});

pruefe("Feld-Stempel schlägt älteren savedAt-Stand", () => {
  const ohneStempel = { values: { x: 5 }, savedAt: TB };
  const mitStempel = { values: { x: 99 }, valuesUpdatedAt: { x: "2026-08-02T15:00:02.000Z" }, savedAt: T0 };
  gleich(mergeValues(ohneStempel, mitStempel).values, { x: 99 });
});

gruppe("Schichten und Kategorien");

pruefe("Schichten werden über die ID vereinigt, nicht überschrieben", () => {
  const s1 = [{ id: "l1", date: "2026-08-03", clockIn: "08:00", clockOut: "16:00", breakMinutes: 30, duration: 7.5, officeRatio: 0.5, officeHours: 3.75, fieldHours: 3.75 }];
  const s2 = [{ id: "l2", date: "2026-08-04", clockIn: "09:00", clockOut: "17:00", breakMinutes: 30, duration: 7.5, officeRatio: 0.5, officeHours: 3.75, fieldHours: 3.75 }];
  gleich(mergeTimeLogs(s1, s2).map((l) => l.id), ["l1", "l2"]);
  gleich(mergeTimeLogs(s1, s1).map((l) => l.id), ["l1"], "dieselbe Schicht darf sich nicht verdoppeln");
});

pruefe("eigene Kategorien beider Geräte bleiben erhalten", () => {
  const fern: SectionsConfig = {
    ...felder,
    s1: [...felder.s1, { id: "eigene", label: "Eigene Kategorie", step: 1, isCustom: true }],
  };
  gleich(mergeFields(felder, fern).s1.map((f) => f.id), ["vf_schule", "vf_arbeit", "eigene"]);
});

gruppe("Gesamtabgleich");

const bericht: ReportData = {
  month: "2026-08", name: "M", notes: "", values: { vf_schule: 4, vf_arbeit: 1 },
  valuesUpdatedAt: { vf_schule: T0, vf_arbeit: TA }, timeLogs: [],
};
const lokal = { appFields: felder, history: { "2026-08": a }, carryover: uebertrag, reportData: bericht };
const fern = { appFields: felder, history: { "2026-08": b }, carryover: uebertrag };

pruefe("ist idempotent — zweimal zusammenführen ändert nichts", () => {
  const einmal = mergeSyncPayload(lokal, fern);
  const zweimal = mergeSyncPayload(einmal, fern);
  gleich(stableStringify(zweimal), stableStringify(einmal));
});

pruefe("beide Geräte kommen auf denselben Stand", () => {
  const seiteA = mergeSyncPayload(lokal, fern);
  const berichtB: ReportData = {
    month: "2026-08", name: "M", notes: "", values: { vf_schule: 4, aus_schule: 1 },
    valuesUpdatedAt: { vf_schule: T0, aus_schule: TB }, timeLogs: [],
  };
  const seiteB = mergeSyncPayload(
    { appFields: felder, history: { "2026-08": b }, carryover: uebertrag, reportData: berichtB },
    { appFields: felder, history: { "2026-08": a }, carryover: uebertrag },
  );
  gleich(seiteB.reportData?.values, seiteA.reportData?.values);
});

gruppe("Spiegeln des aktiven Monats");

/*
  Der Sender spiegelt seinen aktiven Monat ins Archiv des Empfaengers, falls
  der dort fehlt -- als "aeltester" Stand, damit er nur greift, wenn lokal
  nichts existiert. Richtig und gewollt.

  Bis 0.9.30 geschah das aber unabhaengig vom Inhalt. Gemessen am 2026-09-07
  mit zwei gekoppelten Browserkontexten: Nach dem Zusammenfuehren stand im
  Archiv des Empfaengers ein Eintrag "2026-09" mit leeren Werten, leerer Notiz
  und ohne Schichten -- genau das Symptom, das `monthHasContent` verhindern
  soll ("Die Liste fuellte sich mit Eintraegen 'Zaehler: 0'").
*/

const leererBericht: ReportData = {
  month: "2026-09", name: "M", notes: "", values: {}, valuesUpdatedAt: {}, timeLogs: [],
};

pruefe("ein leerer aktiver Monat wandert NICHT ins Archiv", () => {
  const ergebnis = mergeSyncPayload(
    { appFields: felder, history: {}, carryover: uebertrag, reportData: null },
    { appFields: felder, history: {}, carryover: uebertrag, reportData: leererBericht },
  );
  gleich(Object.keys(ergebnis.history), []);
});

pruefe("ein aktiver Monat mit Zahlen wandert weiterhin ins Archiv", () => {
  const ergebnis = mergeSyncPayload(
    { appFields: felder, history: {}, carryover: uebertrag, reportData: null },
    {
      appFields: felder,
      history: {},
      carryover: uebertrag,
      reportData: { ...leererBericht, values: { vf_schule: 3 } },
    },
  );
  gleich(Object.keys(ergebnis.history), ["2026-09"]);
  gleich(ergebnis.history["2026-09"]?.values, { vf_schule: 3 });
});

pruefe("ein aktiver Monat mit nur einer Notiz wandert ebenfalls ins Archiv", () => {
  const ergebnis = mergeSyncPayload(
    { appFields: felder, history: {}, carryover: uebertrag, reportData: null },
    {
      appFields: felder,
      history: {},
      carryover: uebertrag,
      reportData: { ...leererBericht, notes: "Messewoche" },
    },
  );
  gleich(Object.keys(ergebnis.history), ["2026-09"]);
});

gruppe("Stabile Textform");

pruefe("Schlüsselreihenfolge ändert das Ergebnis nicht", () => {
  // Grundlage der Änderungserkennung im Live-Sync: Inhaltsgleiche Stände
  // müssen denselben Text ergeben, sonst wird endlos gesendet.
  gleich(
    stableStringify({ b: 1, a: { y: 2, x: [3, 4] } }),
    stableStringify({ a: { x: [3, 4], y: 2 }, b: 1 }),
  );
});

pruefe("Reihenfolge in Listen bleibt bedeutungstragend", () => {
  const gleichSortiert = stableStringify([1, 2]) === stableStringify([2, 1]);
  gleich(gleichSortiert, false);
});

/* ======================================================================
   0.9.72 -- Was der Abgleich nie wieder verlieren darf.

   Die Faelle sind am 2026-10-02 mit der echten Funktion und zwei gekoppelten
   Fenstern nachgestellt worden (DEVLOG 0.9.72). Hier stehen sie als reine
   Pruefung.
   ====================================================================== */

const ZT = (s: string) => `2026-10-${s}Z`;
const MONTAG = ZT("05T10:00:00.000");
const DIENSTAG = ZT("06T09:00:00.000");
const JETZT = ZT("07T12:00:00.000");

function satz(teil: Partial<HistoryRecord>): HistoryRecord {
  return { month: "2026-10", name: "M", notes: "", values: {}, savedAt: MONTAG, ...teil };
}
function lauf(teil: Partial<ReportData>): ReportData {
  return { month: "2026-10", name: "M", notes: "", values: {}, timeLogs: [], ...teil };
}
function stand(
  history: Record<string, HistoryRecord>,
  reportData: ReportData | null,
  geloeschteMonate?: Record<string, string>,
) {
  return { appFields: felder, history, carryover: uebertrag, reportData, geloeschteMonate };
}
const schicht = (id: string, tag = "2026-10-01", von = "08:00"): TimeLog => ({
  id, date: tag, clockIn: von, clockOut: "16:00", breakMinutes: 30,
  duration: 7.5, officeRatio: 0.5, officeHours: 3.75, fieldHours: 3.75,
});

gruppe("Frisch Getipptes wird vom Abgleich nicht zurückgesetzt");

/*
  Der laufende Bericht wird beim Zusammenfuehren aus dem Archiv neu gebaut. Das
  Archiv hinkt dem Bericht bis zu eine Sekunde hinterher (Bremse des
  Archiv-Spiegels, 0.9.59); beim Dauertippen in die Notiz durchgehend.
*/
const altesArchiv = satz({
  values: { vf_schule: 4 }, valuesUpdatedAt: { vf_schule: MONTAG }, notes: "",
});

pruefe("ein frisch getippter Zähler überlebt", () => {
  const frisch = lauf({ values: { vf_schule: 5 }, valuesUpdatedAt: { vf_schule: DIENSTAG } });
  const e = mergeSyncPayload(
    stand({ "2026-10": altesArchiv }, frisch),
    { appFields: felder, history: { "2026-10": altesArchiv } },
    JETZT,
  );
  gleich(e.reportData?.values.vf_schule, 5, "laufender Bericht");
  gleich(e.history["2026-10"].values.vf_schule, 5, "Archiv");
});

pruefe("eine frisch getippte Notiz überlebt", () => {
  const frisch = lauf({
    values: { vf_schule: 4 }, valuesUpdatedAt: { vf_schule: MONTAG },
    notes: "Kunde Meier ruft morgen zurueck", notesUpdatedAt: DIENSTAG,
  });
  const e = mergeSyncPayload(
    stand({ "2026-10": altesArchiv }, frisch),
    { appFields: felder, history: { "2026-10": altesArchiv } },
    JETZT,
  );
  gleich(e.reportData?.notes, "Kunde Meier ruft morgen zurueck");
});

pruefe("ohne Unterschied vergibt der Abgleich kein neues savedAt (kein Dauersenden)", () => {
  const gleichImArchiv = lauf({ values: { vf_schule: 4 }, valuesUpdatedAt: { vf_schule: MONTAG } });
  const e = mergeSyncPayload(
    stand({ "2026-10": altesArchiv }, gleichImArchiv),
    { appFields: felder, history: { "2026-10": altesArchiv } },
    "2099-01-01T00:00:00.000Z",
  );
  gleich(e.history["2026-10"].savedAt, MONTAG);
});

pruefe("auch mit frischem Stand: zweimal zusammenführen ändert nichts", () => {
  const frisch = lauf({
    values: { vf_schule: 5 }, valuesUpdatedAt: { vf_schule: DIENSTAG },
    notes: "neu", notesUpdatedAt: DIENSTAG,
  });
  const fernArchiv = satz({
    values: { aus_schule: 2 }, valuesUpdatedAt: { aus_schule: DIENSTAG }, savedAt: DIENSTAG,
  });
  const fernPaket = { appFields: felder, history: { "2026-10": fernArchiv } };
  const einmal = mergeSyncPayload(stand({ "2026-10": altesArchiv }, frisch), fernPaket, JETZT);
  const zweimal = mergeSyncPayload(
    { ...einmal, carryover: uebertrag },
    fernPaket,
    "2030-01-01T00:00:00.000Z",
  );
  gleich(stableStringify(zweimal), stableStringify(einmal));
});

pruefe("beide Geräte landen auf demselben Text (sonst sendet der Live-Abgleich endlos)", () => {
  const berichtA = lauf({
    values: { vf_schule: 5 }, valuesUpdatedAt: { vf_schule: DIENSTAG },
    notes: "Notiz von A", notesUpdatedAt: DIENSTAG,
  });
  const archivB = satz({
    values: { aus_schule: 2 }, valuesUpdatedAt: { aus_schule: DIENSTAG }, savedAt: DIENSTAG,
  });
  const berichtB = lauf({ values: { aus_schule: 2 }, valuesUpdatedAt: { aus_schule: DIENSTAG } });
  const aufA = mergeSyncPayload(
    stand({ "2026-10": altesArchiv }, berichtA),
    { appFields: felder, history: { "2026-10": archivB }, reportData: berichtB },
    JETZT,
  );
  const aufB = mergeSyncPayload(
    stand({ "2026-10": archivB }, berichtB),
    { appFields: felder, history: { "2026-10": altesArchiv }, reportData: berichtA },
    JETZT,
  );
  gleich(stableStringify(aufA.reportData), stableStringify(aufB.reportData), "laufender Bericht");
  gleich(aufA.history["2026-10"].values, aufB.history["2026-10"].values, "Zähler im Archiv");
  gleich(aufA.history["2026-10"].notes, aufB.history["2026-10"].notes, "Notiz im Archiv");
});

gruppe("Name und Notiz: feldweise statt je Datensatz");

/*
  Notiz auf A (Montag), B zaehlt am Dienstag nur einen Zaehler. Der Datensatz
  von B hat den juengeren savedAt -- und loeschte die Notiz auf beiden Geraeten.
*/
const aMontag = satz({
  notes: "Kunde Meier: Rueckruf zugesagt", notesUpdatedAt: MONTAG,
  values: { vf_schule: 1 }, valuesUpdatedAt: { vf_schule: MONTAG }, savedAt: MONTAG,
});
const bDienstag = satz({
  notes: "", values: { vf_schule: 1, aus_schule: 2 },
  valuesUpdatedAt: { vf_schule: MONTAG, aus_schule: DIENSTAG }, savedAt: DIENSTAG,
});

pruefe("die Notiz von A übersteht einen Zähler auf B (beide Richtungen)", () => {
  const aufB = mergeHistories({ "2026-10": bDienstag }, { "2026-10": aMontag });
  const aufA = mergeHistories({ "2026-10": aMontag }, { "2026-10": bDienstag });
  gleich(aufB["2026-10"].notes, "Kunde Meier: Rueckruf zugesagt");
  gleich(aufA["2026-10"].notes, "Kunde Meier: Rueckruf zugesagt");
  gleich(aufA["2026-10"].values, { vf_schule: 1, aus_schule: 2 }, "der Zähler von B bleibt");
});

pruefe("Altdaten ohne Zeitstempel: ein Text schlägt einen leeren", () => {
  const mitText = satz({ notes: "Messewoche", savedAt: MONTAG });
  const leer = satz({ notes: "", savedAt: DIENSTAG });
  gleich(mergeHistories({ "2026-10": mitText }, { "2026-10": leer })["2026-10"].notes, "Messewoche");
  gleich(mergeHistories({ "2026-10": leer }, { "2026-10": mitText })["2026-10"].notes, "Messewoche");
});

pruefe("eine bewusst geleerte Notiz setzt sich durch (sie trägt einen Zeitpunkt)", () => {
  const geleert = satz({ notes: "", notesUpdatedAt: DIENSTAG, savedAt: DIENSTAG });
  const r = mergeHistories({ "2026-10": aMontag }, { "2026-10": geleert })["2026-10"];
  gleich(r.notes, "");
  gleich(r.notesUpdatedAt, DIENSTAG);
});

pruefe("zwei verschiedene Notizen ohne Zeitstempel: beide Geräte wählen dieselbe", () => {
  const x = satz({ notes: "Eins", savedAt: MONTAG });
  const y = satz({ notes: "Zwei", savedAt: MONTAG });
  gleich(
    mergeHistories({ "2026-10": x }, { "2026-10": y })["2026-10"].notes,
    mergeHistories({ "2026-10": y }, { "2026-10": x })["2026-10"].notes,
  );
});

pruefe("der Name folgt derselben Regel", () => {
  const mitName = satz({ name: "Marc Petry", nameUpdatedAt: MONTAG, savedAt: MONTAG });
  const ohneName = satz({ name: "", savedAt: DIENSTAG, values: { vf_schule: 1 } });
  gleich(mergeHistories({ "2026-10": ohneName }, { "2026-10": mitName })["2026-10"].name, "Marc Petry");
});

gruppe("Gelöschte Schichten kehren nicht zurück");

pruefe("Löschmarke: die Schicht bleibt in beide Richtungen gelöscht", () => {
  const geloescht = satz({ timeLogs: [], geloeschteSchichten: { l1: DIENSTAG }, savedAt: DIENSTAG });
  const unberuehrt = satz({ timeLogs: [schicht("l1"), schicht("l2", "2026-10-02")] });
  for (const [lokal, fern] of [[geloescht, unberuehrt], [unberuehrt, geloescht]]) {
    const r = mergeHistories({ "2026-10": lokal }, { "2026-10": fern })["2026-10"];
    gleich(r.timeLogs?.map((l) => l.id), ["l2"], "nur die nicht gelöschte Schicht bleibt");
    gleich(r.geloeschteSchichten, { l1: DIENSTAG });
  }
});

pruefe("der laufende Bericht verliert die Löschung nicht wieder (Archiv-Abbild noch alt)", () => {
  const berichtA = lauf({ timeLogs: [], geloeschteSchichten: { l1: DIENSTAG } });
  const veraltet = satz({ timeLogs: [schicht("l1")], savedAt: MONTAG });
  const e = mergeSyncPayload(
    stand({ "2026-10": veraltet }, berichtA),
    { appFields: felder, history: { "2026-10": veraltet } },
    JETZT,
  );
  gleich(e.reportData?.timeLogs, [], "laufender Bericht");
  gleich(e.history["2026-10"].timeLogs, [], "Archiv");
});

pruefe("Löschmarken werden vereinigt, die jüngere gilt", () => {
  gleich(
    mergeLoeschmarken({ a: MONTAG, b: DIENSTAG }, { a: DIENSTAG, c: MONTAG }),
    { a: DIENSTAG, b: DIENSTAG, c: MONTAG },
  );
});

pruefe("Schichten desselben Tages stehen in beiden Richtungen gleich sortiert", () => {
  const x = [schicht("zz", "2026-10-01", "13:00")];
  const y = [schicht("aa", "2026-10-01", "08:00")];
  gleich(mergeTimeLogs(x, y).map((l) => l.id), ["aa", "zz"]);
  gleich(mergeTimeLogs(y, x).map((l) => l.id), ["aa", "zz"]);
});

gruppe("Gelöschte Archivmonate kehren nicht zurück");

const august = satz({ month: "2026-08", values: { vf_schule: 3 }, savedAt: MONTAG });

pruefe("ein gelöschter Monat bleibt gelöscht, die Marke wandert mit", () => {
  const e = mergeSyncPayload(
    stand({}, null, { "2026-08": DIENSTAG }),
    { appFields: felder, history: { "2026-08": august } },
    JETZT,
  );
  gleich(Object.keys(e.history), []);
  gleich(e.geloeschteMonate, { "2026-08": DIENSTAG });
});

pruefe("die Marke der Gegenseite löscht auch lokal", () => {
  const e = mergeSyncPayload(
    stand({ "2026-08": august }, null),
    { appFields: felder, history: {}, geloeschteMonate: { "2026-08": DIENSTAG } },
    JETZT,
  );
  gleich(Object.keys(e.history), []);
});

pruefe("ein nach dem Löschen neu bearbeiteter Monat bleibt -- ohne den alten Inhalt der Gegenseite", () => {
  const neu = satz({
    month: "2026-08", values: { aus_schule: 1 }, valuesUpdatedAt: { aus_schule: JETZT },
    savedAt: JETZT,
  });
  const e = mergeSyncPayload(
    stand({ "2026-08": neu }, null, { "2026-08": DIENSTAG }),
    { appFields: felder, history: { "2026-08": august } },
    JETZT,
  );
  gleich(e.history["2026-08"].values, { aus_schule: 1 });
});

pruefe("der gespiegelte Stand des Senders (savedAt 1970) fällt unter jede Marke", () => {
  const e = mergeSyncPayload(
    stand({}, null, { "2026-09": DIENSTAG }),
    {
      appFields: felder, history: {},
      reportData: lauf({ month: "2026-09", values: { vf_schule: 2 } }),
    },
    JETZT,
  );
  gleich(Object.keys(e.history), []);
});

pruefe("kaputte Marken aus einem Fremdpaket bringen den Abgleich nicht zum Absturz", () => {
  const e = mergeSyncPayload(
    stand({ "2026-08": august }, null),
    { appFields: felder, history: {}, geloeschteMonate: "kaputt" as unknown as Record<string, string> },
    JETZT,
  );
  gleich(Object.keys(e.history), ["2026-08"]);
});
