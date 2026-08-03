import { gruppe, pruefe, gleich } from "../helfer";
import { mergeValues, mergeSyncPayload, mergeTimeLogs, mergeFields } from "../../src/utils/merge";
import { stableStringify } from "../../src/utils/stableJson";
import type {
  SectionsConfig,
  HistoryRecord,
  ReportData,
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
