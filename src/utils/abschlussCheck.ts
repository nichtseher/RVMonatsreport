import { AccessibilitySettings, ReportData } from "../types";

/**
 * Plausibilitaetspruefung vor dem Senden an die Vertriebsleitung.
 *
 * Faengt die typischen Fluechtigkeitsfehler ab, bevor der Bericht beim Chef
 * landet -- ein leerer Report oder Stunden, die nicht zur Stempeluhr passen,
 * fallen dort auf und muessen nachgefragt werden.
 *
 * Lag bis 0.9.14 als `getReportWarnings` mitten in `App.tsx`. Es ist eine reine
 * Funktion und gehoert damit nicht in einen Hook, sondern hierher: Die Regeln
 * entscheiden, was den Betrieb verlaesst, und sind einzeln pruefbar.
 *
 * Die Meldungen sind Nutzertext und werden woertlich angezeigt.
 */

/** Ab welcher Abweichung die Stundensummen als widerspruechlich gelten. */
export const STUNDEN_TOLERANZ = 1;

export function pruefeMonatsabschluss(
  daten: ReportData | null,
  barrierefreiheit: Pick<AccessibilitySettings, "enableTimeTracking">,
): string[] {
  const warnungen: string[] = [];

  if (!daten?.name || !String(daten.name).trim()) {
    warnungen.push("Der Name (Mitarbeiter/in) ist noch nicht eingetragen.");
  }

  const werte = daten?.values || {};
  const hatWerte = Object.values(werte).some((v) => typeof v === "number" && v > 0);
  if (!hatWerte) {
    warnungen.push("Es sind noch keine Zählerstände eingetragen – der Report wäre leer.");
  }

  const schichten = Array.isArray(daten?.timeLogs) ? daten.timeLogs : [];
  // Ist die Stempeluhr abgeschaltet, sind Abweichungen zu ihr bedeutungslos.
  if (barrierefreiheit.enableTimeTracking !== false && schichten.length > 0) {
    const schichtTage = new Set(schichten.map((l) => l.date)).size;
    const tageArbeit = typeof werte.tage_arbeit === "number" ? werte.tage_arbeit : 0;
    if (tageArbeit < schichtTage) {
      warnungen.push(
        `Es sind nur ${tageArbeit} Arbeitstage eingetragen, aber Schichten an ${schichtTage} Tagen erfasst.`,
      );
    }

    const schichtStunden = schichten.reduce(
      (summe, l) => summe + (l.officeHours || 0) + (l.fieldHours || 0),
      0,
    );
    const eingetrageneStunden =
      (typeof werte.std_buero === "number" ? werte.std_buero : 0) +
      (typeof werte.std_aussendienst === "number" ? werte.std_aussendienst : 0);
    if (Math.abs(schichtStunden - eingetrageneStunden) > STUNDEN_TOLERANZ) {
      warnungen.push(
        `Die Stunden im Report (${eingetrageneStunden.toFixed(1)} h) weichen von der Stempeluhr-Summe (${schichtStunden.toFixed(1)} h) ab.`,
      );
    }
  }

  return warnungen;
}
