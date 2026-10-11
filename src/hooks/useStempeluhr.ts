import React, { useCallback, useState } from "react";
import { ReportData, TimeLog } from "../types";
import { safeSetItem } from "../utils/speicher";
import { stempeln } from "../utils/zeitstempel";
import {
  verrechneSchicht,
  schichtGehoertInMonat,
  schichtMonate,
  SCHICHT_FELDER,
  Verrechnung,
} from "../utils/schichtVerrechnung";
import { formatMonthGerman } from "../utils/dateUtils";

/**
 * Die Stempeluhr: ein- und ausstempeln, Schichten nachtragen und loeschen.
 *
 * Fuenfter Baustein der Aufteilung von `App.tsx` (0.9.14) und mit Abstand der
 * groesste Einzelblock gewesen.
 *
 * Der laufende Einstempel-Zeitpunkt liegt in `localStorage` und NICHT im
 * Bericht: Er ueberlebt damit ein Neuladen und das Schliessen der App. Wer
 * morgens einstempelt und das Handy in die Tasche steckt, findet die laufende
 * Schicht am Abend wieder -- auch wenn iOS die Seite zwischendurch entladen
 * hat.
 *
 * Die eigentliche Rechnung liegt in `utils/schichtVerrechnung.ts`. Sie stand
 * hier dreimal fast gleich; drei Kopien einer Rechnung, die den Monatsbericht
 * veraendert.
 */

const SCHLUESSEL_EINSTEMPELN = "aussendienst_pwa_clock_in_time_v2";

export interface StempeluhrParameter {
  setReportData: React.Dispatch<React.SetStateAction<ReportData | null>>;
  /** Der gerade angezeigte Berichtsmonat ("JJJJ-MM"); ohne Angabe wird nicht geprüft. */
  berichtsmonat?: string;
  announceToAriaAndSpeech: (nachricht: string, sofort?: boolean) => void;
  triggerToast: (nachricht: string) => void;
  triggerHaptic: (dauer?: number) => void;
}

export interface Stempeluhr {
  /** ISO-Zeit der laufenden Schicht, oder null. */
  clockInTime: string | null;
  handleClockIn: () => void;
  /** `false`: nicht gebucht (falscher Monat) -- die Stempeluhr läuft weiter. */
  handleClockOut: (schicht: TimeLog) => boolean;
  handleDeleteLog: (schicht: TimeLog) => void;
  handleManualLogAdd: (schicht: TimeLog) => boolean;
}

export function useStempeluhr(p: StempeluhrParameter): Stempeluhr {
  const { setReportData, berichtsmonat, announceToAriaAndSpeech, triggerToast, triggerHaptic } = p;

  const [clockInTime, setClockInTime] = useState<string | null>(() =>
    localStorage.getItem(SCHLUESSEL_EINSTEMPELN),
  );

  /**
   * Schicht in den Bericht einrechnen und die drei Summenfelder stempeln.
   *
   * Der Zeitstempel ist kein Beiwerk: Ohne ihn faellt das Feld beim
   * Geraete-Abgleich auf den Monats-Zeitstempel zurueck, und eine Schicht vom
   * zweiten Geraet koennte die hier verbuchten Stunden ueberschreiben.
   */
  const verbuche = useCallback(
    (
      schicht: TimeLog,
      richtung: Verrechnung,
      listeAendern: (bisher: TimeLog[]) => TimeLog[],
      /**
       * Beim Loeschen: die ID der Schicht. Sie bekommt eine Loeschmarke (0.9.72).
       * Ohne sie kam die Schicht beim naechsten Geraeteabgleich vom anderen
       * Geraet zurueck -- im Live-Betrieb binnen Sekunden.
       */
      geloeschteId?: string,
    ) => {
      setReportData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          values: verrechneSchicht(prev.values, schicht, richtung),
          valuesUpdatedAt: stempeln(prev.valuesUpdatedAt, [...SCHICHT_FELDER]),
          timeLogs: listeAendern(Array.isArray(prev.timeLogs) ? prev.timeLogs : []),
          ...(geloeschteId
            ? {
                geloeschteSchichten: {
                  ...(prev.geloeschteSchichten || {}),
                  [geloeschteId]: new Date().toISOString(),
                },
              }
            : {}),
        };
      });
    },
    [setReportData],
  );

  /**
   * Gehört die Schicht in den angezeigten Monat? Sonst NICHT buchen: Bis 0.9.76
   * ging jede Schicht in den gerade angezeigten Monat, auch wenn dort ein
   * anderer stand -- Stunden und Arbeitstage landeten im falschen Bericht,
   * ohne Rückmeldung. Das Formular und die laufende Stempeluhr bleiben
   * unberührt, nichts geht verloren.
   */
  const passtInMonat = useCallback(
    (schicht: TimeLog): boolean => {
      if (schichtGehoertInMonat(schicht, berichtsmonat)) return true;
      const richtig = formatMonthGerman(schichtMonate(schicht)[0]);
      const angezeigt = formatMonthGerman(berichtsmonat || "");
      const text = `Die Schicht gehört in den Monat ${richtig}, angezeigt ist aber ${angezeigt}. Sie wurde nicht gebucht. Bitte wechseln Sie im Formular zum Monat ${richtig} und versuchen Sie es erneut.`;
      triggerToast("Schicht nicht gebucht – falscher Monat.");
      announceToAriaAndSpeech(text, true);
      return false;
    },
    [berichtsmonat, triggerToast, announceToAriaAndSpeech],
  );

  const handleClockIn = useCallback(() => {
    triggerHaptic(25);
    const nowISO = new Date().toISOString();
    setClockInTime(nowISO);
    safeSetItem(SCHLUESSEL_EINSTEMPELN, nowISO);
    triggerToast("Eingestempelt!");

    const timeStr = new Date().toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    announceToAriaAndSpeech(
      `Erfolgreich eingestempelt um ${timeStr} Uhr. Gute Schicht!`,
      true,
    );
  }, [triggerHaptic, triggerToast, announceToAriaAndSpeech]);

  const handleClockOut = useCallback(
    (newLog: TimeLog): boolean => {
      if (!passtInMonat(newLog)) return false;
      triggerHaptic(25);
      verbuche(newLog, "hinzufuegen", (bisher) => [...bisher, newLog]);

      setClockInTime(null);
      localStorage.removeItem(SCHLUESSEL_EINSTEMPELN);

      triggerToast("Ausgestempelt & Schicht verbucht!");
      announceToAriaAndSpeech(
        `Erfolgreich ausgestempelt. Schicht über ${newLog.duration.toFixed(2)} Stunden wurde verbucht.`,
        true,
      );
      return true;
    },
    [verbuche, passtInMonat, triggerHaptic, triggerToast, announceToAriaAndSpeech],
  );

  const handleDeleteLog = useCallback(
    (logToDelete: TimeLog) => {
      triggerHaptic(20);
      verbuche(
        logToDelete,
        "entfernen",
        (bisher) => bisher.filter((l) => l.id !== logToDelete.id),
        logToDelete.id,
      );

      triggerToast("Schicht gelöscht & Stunden korrigiert!");
      announceToAriaAndSpeech(
        "Schicht gelöscht. Stunden wurden automatisch korrigiert.",
        true,
      );
    },
    [verbuche, triggerHaptic, triggerToast, announceToAriaAndSpeech],
  );

  const handleManualLogAdd = useCallback(
    (newLog: TimeLog): boolean => {
      if (!passtInMonat(newLog)) return false;
      triggerHaptic(25);
      verbuche(newLog, "hinzufuegen", (bisher) => [...bisher, newLog]);

      triggerToast("Schicht manuell nachgetragen!");
      announceToAriaAndSpeech(
        `Schicht über ${newLog.duration.toFixed(2)} Stunden erfolgreich manuell nachgetragen.`,
        true,
      );
      return true;
    },
    [verbuche, passtInMonat, triggerHaptic, triggerToast, announceToAriaAndSpeech],
  );

  return {
    clockInTime,
    handleClockIn,
    handleClockOut,
    handleDeleteLog,
    handleManualLogAdd,
  };
}
