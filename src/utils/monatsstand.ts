import { HistoryRecord, ReportData } from "../types";
import { stempelNachtragen } from "./zeitstempel";

/**
 * Den laufenden Stand fuer einen Zielmonat bauen -- aus dem Archiv oder leer.
 *
 * Aus `handleMonthChange` (App.tsx) herausgeloest, weil dieser Block ein
 * Archiv-Datensatz-in-Bericht-Umbau ist, bei dem ein vergessenes optionales
 * Feld typkorrekt ist und trotzdem still verloren geht (vgl. `archivEintrag.ts`,
 * dort die Gegenrichtung). Absicherung: `scripts/checks/monatsstand.ts`.
 *
 * Wer ein Feld zu `ReportData` hinzufuegt, das aus dem Archiv kommt, traegt es
 * hier ein.
 */
export function baueMonatsstand(
  zielMonat: string,
  aktuell: ReportData | null | undefined,
  archiviert: HistoryRecord | undefined,
): ReportData {
  if (archiviert) {
    // Hat der Archivstand keinen Namen, bleibt der mitgenommene -- samt seinem
    // Zeitpunkt (0.9.72), sonst waere er beim Abgleich "der aelteste".
    const nameAusArchiv = !!archiviert.name;
    const nameUpdatedAt = nameAusArchiv ? archiviert.nameUpdatedAt : aktuell?.nameUpdatedAt;
    return {
      month: zielMonat,
      name: nameAusArchiv ? archiviert.name : aktuell?.name || "",
      notes: archiviert.notes || "",
      values: archiviert.values || {},
      // Zeitstempel des Archivstands mitnehmen und fehlende mit dessen
      // Speicherzeitpunkt nachtragen -- sonst fiele das Feld später auf den
      // dann bereits weitergewanderten Monats-Zeitstempel zurück.
      valuesUpdatedAt: stempelNachtragen(
        archiviert.values,
        archiviert.valuesUpdatedAt,
        archiviert.savedAt,
      ),
      timeLogs: archiviert.timeLogs || [],
      ...(nameUpdatedAt ? { nameUpdatedAt } : {}),
      ...(archiviert.notesUpdatedAt ? { notesUpdatedAt: archiviert.notesUpdatedAt } : {}),
      ...(archiviert.geloeschteSchichten
        ? { geloeschteSchichten: archiviert.geloeschteSchichten }
        : {}),
    };
  }
  // Neuer Monat: leeres Formular, aber der Name wird mitgenommen.
  return {
    month: zielMonat,
    name: aktuell?.name || "",
    notes: "",
    values: {},
    timeLogs: [],
    // Der mitgenommene Name behaelt seinen Zeitpunkt (0.9.72).
    ...(aktuell?.name && aktuell.nameUpdatedAt
      ? { nameUpdatedAt: aktuell.nameUpdatedAt }
      : {}),
  };
}
