import { teileArbeitszeit } from "./timeUtils";

/**
 * Die Stundenrechnung hinter den beiden Schicht-Formularen der Stempeluhr
 * („Ausstempeln" und „Vergessene Schicht nachtragen").
 *
 * Sie stand bis 0.9.78 zweimal in `ClockInWidget.tsx`, Zeile für Zeile
 * kopiert -- samt `aufZwei`. Die Doppelung hat nachweislich geschadet: Die
 * Rundung von 0.9.22 musste in beiden Kopien gemacht werden. Hier steht sie
 * einmal und ist prüfbar (`scripts/checks/schicht-stunden.ts`).
 */

export type Aufteilung = "office" | "field" | "half" | "custom";

/** Anteil Büro (0..1) für eine Voreinstellung; `eigenProzent` gilt nur bei „custom". */
export function bueroAnteil(aufteilung: Aufteilung, eigenProzent: number): number {
  if (aufteilung === "office") return 1;
  if (aufteilung === "field") return 0;
  if (aufteilung === "custom") return eigenProzent / 100;
  return 0.5;
}

/** Auf zwei Nachkommastellen, wie die Stempeluhr selbst rechnet. */
export const aufZwei = (n: number): number => Math.round(n * 100) / 100;

export interface Schichtzahlen {
  /** Vorschlag aus der Aufteilung -- das, was als Platzhalter in den Feldern steht. */
  vorschlag: { buero: number; aussendienst: number };
  /** Was gebucht wird: getippte Stunden haben Vorrang, sonst der Vorschlag. */
  buero: number;
  aussendienst: number;
  gesamt: number;
  /** Anteil Büro an der Schicht (0..1), 0,5 bei einer Schicht ohne Dauer. */
  bueroAnteil: number;
}

/**
 * Stunden einer Schicht aus Nettozeit, Aufteilung und eventuell getippten Werten.
 *
 * Getippte Stunden werden auf zwei Stellen gerundet -- so wie die berechneten.
 * Ohne das landete eine Eingabe wie „3,875" ungerundet in der Schicht, und das
 * Verrechnen im Bericht wäre nicht mehr umkehrbar: 7,25 + 3,875 ergibt
 * gerundet 11,13, davon 3,875 abgezogen 7,26 (gemessen 2026-08-22).
 */
export function berechneSchichtzahlen(
  nettoStunden: number,
  aufteilung: Aufteilung,
  eigenProzent: number,
  getipptBuero: string,
  getipptAussendienst: string,
): Schichtzahlen {
  const { buero: vorBuero, aussendienst: vorAussen } = teileArbeitszeit(
    nettoStunden,
    bueroAnteil(aufteilung, eigenProzent),
  );
  const buero = getipptBuero !== "" ? aufZwei(parseFloat(getipptBuero) || 0) : vorBuero;
  const aussendienst =
    getipptAussendienst !== "" ? aufZwei(parseFloat(getipptAussendienst) || 0) : vorAussen;
  const gesamt = aufZwei(buero + aussendienst);
  return {
    vorschlag: { buero: vorBuero, aussendienst: vorAussen },
    buero,
    aussendienst,
    gesamt,
    bueroAnteil: gesamt > 0 ? aufZwei(buero / gesamt) : 0.5,
  };
}
