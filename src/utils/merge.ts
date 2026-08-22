import {
  HistoryRecord,
  SectionsConfig,
  TimeLog,
  YearlyCarryover,
  ReportData,
  ValueTimestamps,
} from "../types";

/**
 * Zusammenführen zweier Datenstände (statt Überschreiben).
 *
 * Regeln:
 * - Archiv: pro Monat gewinnt der zuletzt gespeicherte Stand (savedAt),
 *   erfasste Schichten (TimeLogs) beider Geräte werden per ID vereinigt.
 * - Kategorien/Felder: Vereinigung – eigene Kategorien beider Geräte bleiben erhalten.
 * - Jahreskonto: der zuletzt geänderte Stand gewinnt (updatedAt).
 * Das Ergebnis ist idempotent: mehrfaches Mergen desselben Stands ändert nichts.
 */

export interface SyncPayload {
  appFields?: SectionsConfig;
  history?: Record<string, HistoryRecord>;
  carryover?: YearlyCarryover;
  reportData?: ReportData;
}

export function mergeTimeLogs(a?: TimeLog[], b?: TimeLog[]): TimeLog[] {
  const map = new Map<string, TimeLog>();
  [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach((log) => {
    if (log && log.id) map.set(log.id, log);
  });
  return Array.from(map.values()).sort((x, y) => x.date.localeCompare(y.date));
}

/**
 * Zählerstände feldweise zusammenführen.
 *
 * Vorher gewann der komplette Datensatz mit dem jüngeren `savedAt`. Wurde auf
 * beiden Geräten im selben Abgleich-Fenster je ein *anderes* Feld getippt,
 * verschwand eine der beiden Eingaben spurlos (zweimal reproduziert).
 * Jetzt entscheidet je Feld sein eigener Zeitstempel; nur wenn dasselbe Feld
 * auf beiden Seiten geändert wurde, gewinnt die jüngere Änderung.
 *
 * Rückfallebene für Daten aus älteren Versionen: Fehlt der Feld-Zeitstempel,
 * gilt der Zeitstempel des Monats (`savedAt`) -- damit verhält sich alter
 * Bestand exakt wie bisher.
 */
export function mergeValues(
  a: Pick<HistoryRecord, "values" | "valuesUpdatedAt" | "savedAt">,
  b: Pick<HistoryRecord, "values" | "valuesUpdatedAt" | "savedAt">,
): { values: Record<string, number | "">; valuesUpdatedAt: ValueTimestamps } {
  const zeitVon = (
    r: Pick<HistoryRecord, "valuesUpdatedAt" | "savedAt">,
    id: string,
  ) => r.valuesUpdatedAt?.[id] || r.savedAt || "";

  const values: Record<string, number | ""> = {};
  const valuesUpdatedAt: ValueTimestamps = {};
  const ids = new Set([
    ...Object.keys(a.values || {}),
    ...Object.keys(b.values || {}),
  ]);

  ids.forEach((id) => {
    const inA = Object.prototype.hasOwnProperty.call(a.values || {}, id);
    const inB = Object.prototype.hasOwnProperty.call(b.values || {}, id);
    // Nur eine Seite kennt das Feld -> diese gewinnt.
    const gewinner = !inB ? a : !inA ? b : zeitVon(a, id) >= zeitVon(b, id) ? a : b;
    values[id] = gewinner.values[id];
    // Immer einen Stempel setzen -- nach dem Zusammenführen ist die Liste
    // damit vollständig und kann nicht mehr auf den wandernden
    // Monats-Zeitstempel zurückfallen.
    const stempel = zeitVon(gewinner, id);
    if (stempel) valuesUpdatedAt[id] = stempel;
  });

  return { values, valuesUpdatedAt };
}

/**
 * Versand-Markierung zusammenführen.
 *
 * Läuft bewusst NICHT über `savedAt`: Der wandert bei jeder Änderung am Monat
 * weiter. Markiert Gerät A den Monat als versendet und tippt Gerät B danach
 * eine Zahl, hätte B den jüngeren `savedAt` -- und die Markierung von A wäre
 * weg. Entscheidend ist deshalb `sentUpdatedAt`, der sich nur ändert, wenn
 * jemand die Markierung selbst anfasst.
 *
 * Zurücknehmen muss möglich sein (man markiert sich auch mal falsch), deshalb
 * gewinnt die jüngere ÄNDERUNG -- nicht einfach "Markierung schlägt keine".
 */
export function mergeVersand(
  a: Pick<HistoryRecord, "sentAt" | "sentUpdatedAt">,
  b: Pick<HistoryRecord, "sentAt" | "sentUpdatedAt">,
): Pick<HistoryRecord, "sentAt" | "sentUpdatedAt"> {
  const zeitA = a.sentUpdatedAt || "";
  const zeitB = b.sentUpdatedAt || "";

  // Altbestand ohne Änderungsstempel (vor 0.9.12): Dort kann es keine
  // Zurücknahme gegeben haben, also schlägt eine vorhandene Markierung keine.
  if (!zeitA && !zeitB) {
    const vorhanden = a.sentAt || b.sentAt;
    return vorhanden ? { sentAt: vorhanden } : {};
  }

  const gewinner = zeitA >= zeitB ? a : b;
  return gewinner.sentAt
    ? { sentAt: gewinner.sentAt, sentUpdatedAt: gewinner.sentUpdatedAt }
    : { sentUpdatedAt: gewinner.sentUpdatedAt };
}

function mergeRecord(a?: HistoryRecord, b?: HistoryRecord): HistoryRecord | undefined {
  if (!a) return b;
  if (!b) return a;
  // Für alles ausser den Zählerständen (Name, Kommentar, Feld-Aufbau) bleibt
  // es beim jüngeren Datensatz -- dort ist ein Feld-Zeitstempel nicht sinnvoll.
  const newer = (a.savedAt || "") >= (b.savedAt || "") ? a : b;
  const other = newer === a ? b : a;
  const { values, valuesUpdatedAt } = mergeValues(a, b);
  const versand = mergeVersand(a, b);
  // sentAt/sentUpdatedAt aus dem Gewinner erst entfernen, dann das Ergebnis des
  // eigenen Abgleichs setzen -- sonst zöge `...newer` eine veraltete Markierung
  // wieder herein.
  const { sentAt: _weg1, sentUpdatedAt: _weg2, ...rest } = newer;
  return {
    ...rest,
    ...versand,
    values,
    valuesUpdatedAt,
    timeLogs: mergeTimeLogs(other.timeLogs, newer.timeLogs),
  };
}

export function mergeHistories(
  local?: Record<string, HistoryRecord>,
  remote?: Record<string, HistoryRecord>,
): Record<string, HistoryRecord> {
  const out: Record<string, HistoryRecord> = {};
  const months = new Set([
    ...Object.keys(local || {}),
    ...Object.keys(remote || {}),
  ]);
  months.forEach((month) => {
    const merged = mergeRecord(local?.[month], remote?.[month]);
    if (merged) out[month] = merged;
  });
  return out;
}

export function mergeFields(local: SectionsConfig, remote?: SectionsConfig): SectionsConfig {
  if (!remote) return local;
  const out = {} as SectionsConfig;
  (["s1", "s2", "s3", "s4"] as const).forEach((sec) => {
    const loc = Array.isArray(local?.[sec]) ? local[sec] : [];
    const rem = Array.isArray(remote?.[sec]) ? remote[sec] : [];
    const known = new Set(loc.map((f) => f.id));
    out[sec] = [...loc, ...rem.filter((f) => f && f.id && !known.has(f.id))];
  });
  return out;
}

export function mergeCarryover(
  local?: YearlyCarryover,
  remote?: YearlyCarryover,
): YearlyCarryover | undefined {
  if (!remote) return local;
  if (!local) return remote;
  return (remote.updatedAt || "") > (local.updatedAt || "") ? remote : local;
}

/**
 * Fasst einen empfangenen Sync-Datenstand mit dem lokalen zusammen.
 * Der aktuell bearbeitete Monat des Empfängers bleibt der aktive Monat.
 */
export function mergeSyncPayload(
  local: {
    appFields: SectionsConfig;
    history: Record<string, HistoryRecord>;
    carryover: YearlyCarryover;
    reportData: ReportData | null;
  },
  remote: SyncPayload,
): {
  appFields: SectionsConfig;
  history: Record<string, HistoryRecord>;
  carryover: YearlyCarryover;
  reportData: ReportData | null;
} {
  const remoteHistory: Record<string, HistoryRecord> = { ...(remote.history || {}) };

  // Fallback für ältere Datenstände, in denen der aktive Monat des Senders
  // noch nicht im Archiv gespiegelt war: als "ältesten" Stand einreihen,
  // damit er nur greift, wenn lokal nichts existiert.
  const remoteReport = remote.reportData;
  if (remoteReport?.month && !remoteHistory[remoteReport.month]) {
    remoteHistory[remoteReport.month] = {
      month: remoteReport.month,
      name: remoteReport.name || "",
      notes: remoteReport.notes || "",
      values: remoteReport.values || {},
      valuesUpdatedAt: remoteReport.valuesUpdatedAt,
      timeLogs: remoteReport.timeLogs || [],
      fieldsSnapshot: remote.appFields,
      savedAt: new Date(0).toISOString(),
    };
  }

  const history = mergeHistories(local.history, remoteHistory);
  const appFields = mergeFields(local.appFields, remote.appFields);
  const carryover = mergeCarryover(local.carryover, remote.carryover) || local.carryover;

  let reportData = local.reportData;
  const activeMonth = local.reportData?.month;
  if (activeMonth && history[activeMonth]) {
    const rec = history[activeMonth];
    reportData = {
      month: activeMonth,
      name: rec.name || local.reportData?.name || "",
      notes: rec.notes || "",
      values: rec.values || {},
      valuesUpdatedAt: rec.valuesUpdatedAt,
      timeLogs: rec.timeLogs || [],
    };
  }

  return { appFields, history, carryover, reportData };
}
