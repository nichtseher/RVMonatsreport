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

/**
 * Zu welchen Berichtsmonaten gehört eine Schicht? Der Monat ihres Datums --
 * und bei einer Schicht über Mitternacht (Ende vor Beginn) auch der des
 * Folgetags. Ohne den zweiten Monat bliebe das Ausstempeln in der Nacht auf
 * den Monatsersten gesperrt.
 */
export function schichtMonate(schicht: Pick<TimeLog, "date" | "clockIn" | "clockOut">): string[] {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(schicht.date || "");
  if (!treffer) return [];
  const [, j, m, t] = treffer;
  const monat = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const start = new Date(Number(j), Number(m) - 1, Number(t), 12);
  // `Date` rollt ein Datum wie 2026-13-45 still weiter -- nur Echtes zählt.
  if (
    start.getFullYear() !== Number(j) ||
    start.getMonth() !== Number(m) - 1 ||
    start.getDate() !== Number(t)
  ) {
    return [];
  }
  const ueberMitternacht =
    !!schicht.clockIn && !!schicht.clockOut && schicht.clockOut < schicht.clockIn;
  const ende = new Date(start);
  if (ueberMitternacht) ende.setDate(ende.getDate() + 1);
  return Array.from(new Set([monat(start), monat(ende)]));
}

/**
 * Darf die Schicht in den angezeigten Monat gebucht werden? Ohne Monatsangabe
 * oder mit unlesbarem Datum: ja -- dann fehlt der Anhaltspunkt, und eine
 * Sperre ohne Grund wäre schlimmer als die bisherige Buchung.
 */
export function schichtGehoertInMonat(
  schicht: Pick<TimeLog, "date" | "clockIn" | "clockOut">,
  berichtsmonat: string | undefined,
): boolean {
  if (!berichtsmonat) return true;
  const monate = schichtMonate(schicht);
  return monate.length === 0 || monate.includes(berichtsmonat);
}
