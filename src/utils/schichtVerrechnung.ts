import { TimeLog } from "../types";

/**
 * Eine Schicht auf die Summenfelder des Berichts verrechnen.
 *
 * Die Stempeluhr fuehrt drei Werte im Bericht automatisch mit: Buerostunden,
 * Aussendienststunden und Arbeitstage. Beim Ein- und Ausbuchen einer Schicht
 * muessen sie mitwandern -- sonst weichen die Zahlen, die zur
 * Vertriebsleitung gehen, von der erfassten Arbeitszeit ab.
 *
 * WARUM ALS EIGENE FUNKTION: Dieselbe Rechnung stand bis 0.9.14 DREIMAL in
 * `App.tsx` -- beim Ausstempeln, beim Loeschen einer Schicht und beim
 * Nachtragen von Hand. Drei Kopien einer Rechnung, die den Monatsbericht
 * veraendert. Genau diese Bauart hat in 0.9.12 und 0.9.13 zweimal denselben
 * Fehler erzeugt (siehe utils/archivEintrag.ts).
 */

/** Die drei Felder, die die Stempeluhr mitfuehrt. */
export const SCHICHT_FELDER = ["std_buero", "std_aussendienst", "tage_arbeit"] as const;

export type Verrechnung = "hinzufuegen" | "entfernen";

/** Zahl aus dem Wertespeicher lesen; alles andere gilt als 0. */
const alsZahl = (wert: number | "" | undefined): number =>
  typeof wert === "number" ? wert : 0;

/** Auf zwei Nachkommastellen, wie die Stempeluhr selbst rechnet. */
const gerundet = (n: number): number => Math.round(n * 100) / 100;

export function verrechneSchicht(
  werte: Record<string, number | "">,
  schicht: Pick<TimeLog, "officeHours" | "fieldHours">,
  richtung: Verrechnung,
): Record<string, number | ""> {
  const buero = alsZahl(werte.std_buero);
  const feld = alsZahl(werte.std_aussendienst);
  const tage = alsZahl(werte.tage_arbeit);

  const stunden = {
    buero: schicht.officeHours || 0,
    feld: schicht.fieldHours || 0,
  };

  if (richtung === "hinzufuegen") {
    return {
      ...werte,
      std_buero: gerundet(buero + stunden.buero),
      std_aussendienst: gerundet(feld + stunden.feld),
      tage_arbeit: tage + 1,
    };
  }

  // Beim Entfernen wird bei null abgeschnitten. Ohne die Grenze koennte eine
  // von Hand korrigierte Stundenzahl beim Loeschen einer Schicht ins Negative
  // rutschen -- und eine negative Stundenzahl im Bericht ist schlimmer als
  // eine zu niedrige: Sie ist offensichtlich falsch und stellt alles andere
  // in Frage. Beim Hinzufuegen braucht es die Grenze nicht.
  return {
    ...werte,
    std_buero: Math.max(0, gerundet(buero - stunden.buero)),
    std_aussendienst: Math.max(0, gerundet(feld - stunden.feld)),
    tage_arbeit: Math.max(0, tage - 1),
  };
}
