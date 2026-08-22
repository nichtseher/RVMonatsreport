import { HistoryRecord, ReportData, SectionsConfig } from "../types";

/**
 * Einen Archiv-Datensatz aus dem laufenden Monat bauen.
 *
 * WARUM ES DIESE FUNKTION GIBT: Der Datensatz wurde an zwei Stellen in
 * `App.tsx` von Hand zusammengesetzt -- beim automatischen Speichern und beim
 * Monatswechsel. Beide zaehlen die Felder einzeln auf, und genau daran ist es
 * zweimal gescheitert:
 *
 *   0.9.12  Das automatische Speichern verlor die Versand-Markierung, weil
 *           `sentAt` in der Aufzaehlung fehlte. Beim Bauen bemerkt.
 *   0.9.13  Der Monatswechsel verlor sie aus demselben Grund. Erst beim
 *           Durchspielen im Browser aufgefallen -- nachgemessen: Ein Monat,
 *           der als "an die Vertriebsleitung gesendet" markiert war, stand
 *           nach dem Wechsel in den Folgemonat wieder als offen da.
 *
 * Der Typpruefer faengt diese Klasse NICHT: Ein fehlendes optionales Feld ist
 * typkorrekt. Nur eine gemeinsame Stelle hilft -- und die ist hier.
 *
 * Wer ein Feld zu `HistoryRecord` hinzufuegt, muss es hier eintragen und in
 * `scripts/checks/archiv-eintrag.ts` absichern.
 */

/** Felder des laufenden Monats, die in den Archiv-Datensatz einfliessen. */
export type ArchivQuelle = Pick<
  ReportData,
  "month" | "name" | "notes" | "values" | "valuesUpdatedAt" | "timeLogs"
>;

export function baueArchivEintrag(
  quelle: ArchivQuelle,
  felder: SectionsConfig,
  /** Bisheriger Stand desselben Monats, falls vorhanden. */
  bisher: HistoryRecord | undefined,
  savedAt: string,
): HistoryRecord {
  const eintrag: HistoryRecord = {
    month: quelle.month,
    name: quelle.name || "",
    notes: quelle.notes || "",
    values: quelle.values || {},
    valuesUpdatedAt: quelle.valuesUpdatedAt,
    timeLogs: quelle.timeLogs || [],
    fieldsSnapshot: felder,
    savedAt,
  };

  // Zustand, der NICHT aus dem laufenden Monat stammt, sondern am Archiv
  // haengt, muss ausdruecklich uebernommen werden.
  if (bisher?.sentAt) eintrag.sentAt = bisher.sentAt;
  if (bisher?.sentUpdatedAt) eintrag.sentUpdatedAt = bisher.sentUpdatedAt;

  return eintrag;
}
