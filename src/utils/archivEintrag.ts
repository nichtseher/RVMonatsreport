import { HistoryRecord, ReportData, SectionsConfig } from "../types";
import { monthHasContent } from "./monatInhalt";
import { stableStringify } from "./stableJson";

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
  | "month"
  | "name"
  | "notes"
  | "values"
  | "valuesUpdatedAt"
  | "timeLogs"
  | "nameUpdatedAt"
  | "notesUpdatedAt"
  | "geloeschteSchichten"
>;

export function baueArchivEintrag(
  quelle: ArchivQuelle,
  /** Fehlt nur, wenn ein Fremdpaket keine Kategorien mitbrachte (Abgleich). */
  felder: SectionsConfig | undefined,
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

  // Zeitstempel und Loeschmarken (0.9.72) stammen aus dem laufenden Monat --
  // aber nur setzen, wenn es sie gibt: Ein leeres Objekt waere ein anderer
  // Text als ein fehlendes Feld und liesse den Live-Abgleich senden.
  if (quelle.nameUpdatedAt) eintrag.nameUpdatedAt = quelle.nameUpdatedAt;
  if (quelle.notesUpdatedAt) eintrag.notesUpdatedAt = quelle.notesUpdatedAt;
  if (quelle.geloeschteSchichten && Object.keys(quelle.geloeschteSchichten).length > 0) {
    eintrag.geloeschteSchichten = quelle.geloeschteSchichten;
  }

  // Zustand, der NICHT aus dem laufenden Monat stammt, sondern am Archiv
  // haengt, muss ausdruecklich uebernommen werden.
  if (bisher?.sentAt) eintrag.sentAt = bisher.sentAt;
  if (bisher?.sentUpdatedAt) eintrag.sentUpdatedAt = bisher.sentUpdatedAt;

  return eintrag;
}

/** Was fuer den Vergleich "hat sich etwas geaendert?" gebraucht wird. */
type Vergleichbar = {
  name?: string;
  notes?: string;
  values?: Record<string, number | "">;
  valuesUpdatedAt?: Record<string, string>;
  timeLogs?: unknown[];
  nameUpdatedAt?: string;
  notesUpdatedAt?: string;
  geloeschteSchichten?: Record<string, string>;
  fieldsSnapshot?: SectionsConfig;
};

/**
 * Inhaltlicher Fingerabdruck eines Monats -- ohne savedAt.
 *
 * Aus `useBerichtsdaten.ts` hierher gezogen (0.9.72), weil der Geraeteabgleich
 * denselben Vergleich braucht: Er legt den laufenden Monat nur dann ueber den
 * Archiveintrag, wenn sich der Inhalt wirklich unterscheidet.
 *
 * `mitFeldAufbau: false` laesst den Feld-Schnappschuss weg. Der Abgleich darf
 * wegen einer abweichenden Konfiguration kein neues `savedAt` vergeben -- sonst
 * waere jedes Zusammenfuehren eine Aenderung und der Live-Abgleich liefe
 * endlos (genau das, was `stableStringify` schon einmal verhindern musste).
 */
export function inhaltsFingerabdruck(r: Vergleichbar, mitFeldAufbau = true): string {
  return stableStringify({
    name: r.name || "",
    notes: r.notes || "",
    values: r.values || {},
    valuesUpdatedAt: r.valuesUpdatedAt || {},
    timeLogs: r.timeLogs || [],
    nameUpdatedAt: r.nameUpdatedAt || "",
    notesUpdatedAt: r.notesUpdatedAt || "",
    geloeschteSchichten: r.geloeschteSchichten || {},
    fieldsSnapshot: mitFeldAufbau ? r.fieldsSnapshot || null : null,
  });
}

/**
 * Den laufenden Monat ins Archiv spiegeln -- als reine Funktion.
 *
 * Liefert das neue Archiv oder `null`, wenn nichts zu schreiben ist.
 *
 * DER INHALTSWAECHTER GILT NUR FUERS NEUANLEGEN. Bis 0.9.71 brach der Spiegel
 * ab, sobald der Monat keinen Inhalt hatte -- auch wenn es schon einen Eintrag
 * gab. Wer den einzigen Zaehler wieder leerte oder die einzige Schicht
 * loeschte, liess den alten Stand im Archiv stehen: Das Archiv zeigte weiter
 * "Zaehler: 2", und der naechste Abgleich holte die geloeschte Schicht samt
 * Stunden zurueck (nachgestellt am 2026-10-02, zwei gekoppelte Fenster). Ein
 * leerer Monat ist eine echte Aenderung, wenn vorher etwas drin stand.
 */
export function spiegleMonat(
  prev: Record<string, HistoryRecord>,
  daten: ArchivQuelle,
  felder: SectionsConfig | undefined,
  jetzt: string,
  /** Beim Geraeteabgleich false -- siehe `inhaltsFingerabdruck`. */
  feldAufbauZaehlt = true,
): Record<string, HistoryRecord> | null {
  if (!daten?.month) return null;
  const bestehend = prev[daten.month];
  if (!bestehend && !monthHasContent(daten)) return null;

  const neu: Vergleichbar = { ...daten, fieldsSnapshot: felder };
  if (
    bestehend &&
    inhaltsFingerabdruck(bestehend, feldAufbauZaehlt) === inhaltsFingerabdruck(neu, feldAufbauZaehlt)
  ) {
    return null;
  }
  return { ...prev, [daten.month]: baueArchivEintrag(daten, felder, bestehend, jetzt) };
}
