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

/** "2026-12" -> "2027-01". */
export function folgemonat(monat: string): string {
  const [jahr, m] = monat.split("-").map((t) => parseInt(t, 10));
  const n = m + 1;
  return n > 12 ? `${jahr + 1}-01` : `${jahr}-${String(n).padStart(2, "0")}`;
}

/**
 * Zeilen der Rueckfrage vor dem Monatsabschluss. `leerOhneEintrag`: Der Monat
 * hat keinen Inhalt UND keinen Archiveintrag -- dann wird nichts archiviert.
 * Liegt schon ein Eintrag im Archiv, wird er mit dem leeren Stand aktualisiert
 * (0.9.72), und der Satz stimmte nicht.
 */
export function abschlussDetails(
  werte: ReportData["values"] | undefined,
  schichten: number,
  leerOhneEintrag: boolean,
): string[] {
  const zaehlungen = Object.values(werte || {}).reduce<number>(
    (summe, v) => (typeof v === "number" ? summe + v : summe),
    0,
  );
  const details = [
    `Gezählte Vorgänge: ${zaehlungen}`,
    `Erfasste Schichten: ${schichten}`,
    "Der Monat bleibt vollständig im Archiv und lässt sich dort jederzeit wieder laden.",
  ];
  if (leerOhneEintrag) {
    details.unshift("Achtung: In diesem Monat ist noch nichts erfasst – es wird nichts archiviert.");
  }
  return details;
}

/**
 * Feldstand des verlassenen Monats ablegen -- aber nur, wenn er NICHT ins
 * Archiv gewandert ist (der Archiveintrag traegt dann den Schnappschuss und
 * der Eintrag hier wird geloescht). Warum das noetig ist: siehe Kommentar 1b in
 * `handleMonthChange`. Gibt eine neue Ablage zurueck.
 */
export function legeMonatsfelderAb<F>(
  abgelegt: Record<string, F>,
  verlassenerMonat: string,
  imArchiv: boolean,
  felder: F,
): Record<string, F> {
  const neu = { ...abgelegt };
  if (imArchiv) delete neu[verlassenerMonat];
  else neu[verlassenerMonat] = felder;
  return neu;
}
