import {
  HistoryRecord,
  SectionsConfig,
  TimeLog,
  YearlyCarryover,
  ReportData,
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

function mergeRecord(a?: HistoryRecord, b?: HistoryRecord): HistoryRecord | undefined {
  if (!a) return b;
  if (!b) return a;
  const newer = (a.savedAt || "") >= (b.savedAt || "") ? a : b;
  const other = newer === a ? b : a;
  return { ...newer, timeLogs: mergeTimeLogs(other.timeLogs, newer.timeLogs) };
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
      timeLogs: rec.timeLogs || [],
    };
  }

  return { appFields, history, carryover, reportData };
}
