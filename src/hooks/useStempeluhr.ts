import React, { useCallback, useState } from "react";
import { ReportData, TimeLog } from "../types";
import { safeSetItem } from "../utils/speicher";
import { stempeln } from "../utils/zeitstempel";
import { verrechneSchicht, SCHICHT_FELDER, Verrechnung } from "../utils/schichtVerrechnung";

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
  announceToAriaAndSpeech: (nachricht: string, sofort?: boolean) => void;
  triggerToast: (nachricht: string) => void;
  triggerHaptic: (dauer?: number) => void;
}

export interface Stempeluhr {
  /** ISO-Zeit der laufenden Schicht, oder null. */
  clockInTime: string | null;
  handleClockIn: () => void;
  handleClockOut: (schicht: TimeLog) => void;
  handleDeleteLog: (schicht: TimeLog) => void;
  handleManualLogAdd: (schicht: TimeLog) => void;
}

export function useStempeluhr(p: StempeluhrParameter): Stempeluhr {
  const { setReportData, announceToAriaAndSpeech, triggerToast, triggerHaptic } = p;

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
    (schicht: TimeLog, richtung: Verrechnung, listeAendern: (bisher: TimeLog[]) => TimeLog[]) => {
      setReportData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          values: verrechneSchicht(prev.values, schicht, richtung),
          valuesUpdatedAt: stempeln(prev.valuesUpdatedAt, [...SCHICHT_FELDER]),
          timeLogs: listeAendern(Array.isArray(prev.timeLogs) ? prev.timeLogs : []),
        };
      });
    },
    [setReportData],
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
    (newLog: TimeLog) => {
      triggerHaptic(25);
      verbuche(newLog, "hinzufuegen", (bisher) => [...bisher, newLog]);

      setClockInTime(null);
      localStorage.removeItem(SCHLUESSEL_EINSTEMPELN);

      triggerToast("Ausgestempelt & Schicht verbucht!");
      announceToAriaAndSpeech(
        `Erfolgreich ausgestempelt. Schicht über ${newLog.duration.toFixed(2)} Stunden wurde verbucht.`,
        true,
      );
    },
    [verbuche, triggerHaptic, triggerToast, announceToAriaAndSpeech],
  );

  const handleDeleteLog = useCallback(
    (logToDelete: TimeLog) => {
      triggerHaptic(20);
      verbuche(logToDelete, "entfernen", (bisher) =>
        bisher.filter((l) => l.id !== logToDelete.id),
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
    (newLog: TimeLog) => {
      triggerHaptic(25);
      verbuche(newLog, "hinzufuegen", (bisher) => [...bisher, newLog]);

      triggerToast("Schicht manuell nachgetragen!");
      announceToAriaAndSpeech(
        `Schicht über ${newLog.duration.toFixed(2)} Stunden erfolgreich manuell nachgetragen.`,
        true,
      );
    },
    [verbuche, triggerHaptic, triggerToast, announceToAriaAndSpeech],
  );

  return {
    clockInTime,
    handleClockIn,
    handleClockOut,
    handleDeleteLog,
    handleManualLogAdd,
  };
}
