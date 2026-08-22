import React, { useCallback } from "react";
import {
  AccessibilitySettings,
  HistoryRecord,
  ReportData,
  SectionsConfig,
} from "../types";
import { exportTimeLogsToExcel, triggerFileDownload } from "../utils/excelUtils";
import { formatMonthGerman } from "../utils/dateUtils";
import { pruefeMonatsabschluss } from "../utils/abschlussCheck";
import { persistHistory, OnPersistFailure } from "../utils/speicher";
import { ConfirmRequest } from "../components/ConfirmDialog";

/**
 * Alles, was den Betrieb verlaesst: die beiden Excel-Ausgaben, der
 * Abschluss-Check davor und die Versand-Markierung danach.
 *
 * Zweiter Baustein der Aufteilung von `App.tsx` (0.9.14). Die Pruefregeln
 * selbst liegen als reine Funktion in `utils/abschlussCheck.ts` -- sie
 * entscheiden, was beim Chef landet, und gehoeren einzeln pruefbar.
 *
 * DIE REIHENFOLGE IM EXPORT IST NICHT BELIEBIG: Markiert wird erst NACH dem
 * Abbruch-Zweig. Ein abgebrochener Teilen-Dialog darf keinen Monat als erledigt
 * ausweisen -- sonst steht er im Archiv auf "Gesendet", obwohl nichts das
 * Geraet verlassen hat.
 */

export interface ExportParameter {
  reportData: ReportData | null;
  appFields: SectionsConfig;
  accessibility: Pick<AccessibilitySettings, "enableTimeTracking">;
  setHistory: React.Dispatch<
    React.SetStateAction<Record<string, HistoryRecord> | null>
  >;
  announceToAriaAndSpeech: (nachricht: string, sofort?: boolean) => void;
  triggerToast: (nachricht: string) => void;
  triggerHaptic: (dauer: number) => void;
  setConfirmRequest: (anfrage: ConfirmRequest) => void;
  onPersistFailure: OnPersistFailure;
}

export interface ExportFunktionen {
  /** Markierung setzen oder zuruecknehmen -- ohne eigene Ansage. */
  setzeVersandStatus: (monat: string, versendet: boolean, zeitpunkt?: string) => void;
  /** Markierung von Hand umschalten, mit Rueckmeldung. */
  handleToggleVersandStatus: (monat: string, versendet: boolean) => void;
  /** Die Warnungen des Abschluss-Checks fuer den aktuellen Stand. */
  getReportWarnings: () => string[];
  /** Monatsreport in der Firmenvorlage ausgeben. */
  handleExportExcel: () => Promise<void>;
  /** Stundenzettel getrennt ausgeben. */
  handleExportTimeLogsExcel: () => Promise<void>;
  /** Mit Abschluss-Check: fragt bei Auffaelligkeiten nach. */
  handleSendToVL: () => Promise<void>;
}

export function useExport(p: ExportParameter): ExportFunktionen {
  const {
    reportData, appFields, accessibility, setHistory,
    announceToAriaAndSpeech, triggerToast, triggerHaptic,
    setConfirmRequest, onPersistFailure,
  } = p;

  /**
   * `sentUpdatedAt` wird IMMER mitgeschrieben -- auch beim Zuruecknehmen. Nur
   * daran erkennt der Geraete-Abgleich, welche der beiden Entscheidungen die
   * juengere ist; ohne den Stempel wuerde eine Ruecknahme beim naechsten Sync
   * von der alten Markierung des anderen Geraets ueberschrieben.
   */
  const setzeVersandStatus = useCallback(
    (monthStr: string, versendet: boolean, zeitpunkt?: string) => {
      setHistory((prev) => {
        if (!prev) return prev;
        const rec = prev[monthStr];
        if (!rec) return prev;
        const jetzt = new Date().toISOString();
        const neu: HistoryRecord = { ...rec, sentUpdatedAt: jetzt };
        if (versendet) neu.sentAt = zeitpunkt || jetzt;
        else delete neu.sentAt;
        const updated = { ...prev, [monthStr]: neu };
        persistHistory(updated, onPersistFailure, "versand-status");
        return updated;
      });
    },
    [setHistory, onPersistFailure],
  );

  const handleToggleVersandStatus = useCallback(
    (monthStr: string, versendet: boolean) => {
      setzeVersandStatus(monthStr, versendet);
      triggerHaptic(15);
      const monatText = formatMonthGerman(monthStr);
      announceToAriaAndSpeech(
        versendet
          ? `${monatText} als an die Vertriebsleitung gesendet markiert.`
          : `Markierung für ${monatText} zurückgenommen. Der Monat gilt wieder als offen.`,
        true,
      );
    },
    [setzeVersandStatus, triggerHaptic, announceToAriaAndSpeech],
  );

  const getReportWarnings = useCallback(
    () => pruefeMonatsabschluss(reportData, accessibility),
    [reportData, accessibility],
  );

  /** Gemeinsame Meldung, solange die IndexedDB noch nicht geantwortet hat. */
  const meldeNochNichtGeladen = useCallback(() => {
    // Still nichts zu tun waere hier falsch: Wer die Taste drueckt, braucht
    // eine Rueckmeldung -- gerade mit Screenreader.
    triggerToast("Die Daten werden noch geladen. Bitte einen Moment warten.");
    announceToAriaAndSpeech(
      "Die Daten werden noch geladen. Bitte einen Moment warten.",
      true,
    );
  }, [triggerToast, announceToAriaAndSpeech]);

  // Blatt 1 IST die Firmenvorlage der Vertriebsleitung, nicht ein Nachbau --
  // siehe utils/vorlageExport.ts. Alles, was dort keine Zeile hat, steht auf
  // Blatt 2 und 3.
  const handleExportExcel = useCallback(async () => {
    triggerHaptic(25);
    const daten = reportData;
    if (!daten) {
      meldeNochNichtGeladen();
      return;
    }
    try {
      // Erst beim Export laden: Das Modul zieht ExcelJS (271 KB gzip) und die
      // eingebettete Vorlage (19 KB) nach. Beides braucht niemand beim Start.
      const { erzeugeVorlagenDatei } = await import("../utils/vorlageExport");
      const wbout = await erzeugeVorlagenDatei(daten, appFields);
      const monthVal = daten.month || "Monat";
      const nameVal = daten.name || "Mitarbeitende_r";
      const cleanName = nameVal.replace(/\s+/g, "_") || "Mitarbeiter";
      const formattedMonthName = formatMonthGerman(monthVal).replace(/\s+/g, "_");
      const fileName = `RV_Mobil_Report_${cleanName}_${formattedMonthName}.xlsx`;

      const ergebnis = await triggerFileDownload(
        wbout,
        fileName,
        `Anbei der aktuelle Monatsreport für ${formatMonthGerman(monthVal)}`,
      );
      if (ergebnis === "abgebrochen") {
        triggerToast("Teilen abgebrochen – es wurde nichts gesendet.");
        announceToAriaAndSpeech("Teilen abgebrochen. Es wurde nichts gesendet.");
        return;
      }
      // Erst hier markieren -- siehe Kopfkommentar.
      setzeVersandStatus(monthVal, true);
      triggerToast(`Excel-Report erfolgreich ${ergebnis}!`);
      announceToAriaAndSpeech(
        `Excel-Report ${ergebnis}. Der Monat ist im RV Archiv als gesendet markiert.`,
      );
    } catch (err) {
      console.error("Excel-Export fehlgeschlagen", err);
      triggerToast("Fehler beim Erstellen der Excel-Datei.");
      announceToAriaAndSpeech("Fehler beim Erstellen der Excel-Datei.", true);
    }
  }, [
    reportData, appFields, triggerHaptic, meldeNochNichtGeladen,
    triggerToast, announceToAriaAndSpeech, setzeVersandStatus,
  ]);

  const handleExportTimeLogsExcel = useCallback(async () => {
    triggerHaptic(25);
    const daten = reportData;
    if (!daten) {
      meldeNochNichtGeladen();
      return;
    }
    try {
      const result = await exportTimeLogsToExcel(daten);
      if (!result) {
        triggerToast("Keine Zeiterfassungsdaten vorhanden!");
        announceToAriaAndSpeech("Keine Zeiterfassungsdaten zum Exportieren vorhanden.");
        return;
      }
      const { wbout, monthVal, nameVal } = result;
      const cleanName = nameVal.replace(/\s+/g, "_") || "Mitarbeiter";
      const formattedMonthName = formatMonthGerman(monthVal).replace(/\s+/g, "_");
      const fileName = `RV_Zeiterfassung_${cleanName}_${formattedMonthName}.xlsx`;

      const ergebnis = await triggerFileDownload(
        wbout,
        fileName,
        `Anbei das Zeiterfassungs-Protokoll für ${formatMonthGerman(monthVal)}`,
      );
      if (ergebnis === "abgebrochen") {
        triggerToast("Teilen abgebrochen – es wurde nichts gesendet.");
        announceToAriaAndSpeech("Teilen abgebrochen. Es wurde nichts gesendet.");
        return;
      }
      triggerToast(`Zeiterfassung erfolgreich ${ergebnis}!`);
      announceToAriaAndSpeech(`Zeiterfassung ${ergebnis}.`);
    } catch (err) {
      console.error("Zeiterfassungs-Export fehlgeschlagen", err);
      triggerToast("Fehler beim Erstellen der Excel-Datei.");
      announceToAriaAndSpeech("Fehler beim Erstellen der Excel-Datei.", true);
    }
  }, [
    reportData, triggerHaptic, meldeNochNichtGeladen,
    triggerToast, announceToAriaAndSpeech,
  ]);

  const handleSendToVL = useCallback(async () => {
    triggerHaptic(25);
    if (!reportData) return;

    // DSGVO-konform ohne Server: Der Bericht wird als Excel-Datei ueber den
    // System-Teilen-Dialog (z. B. E-Mail an die VL) weitergegeben.
    const senden = async () => {
      announceToAriaAndSpeech(
        "Teilen-Dialog wird geöffnet, um den Bericht an die VL zu senden.",
      );
      await handleExportExcel();
    };

    const warnungen = getReportWarnings();
    if (warnungen.length > 0) {
      setConfirmRequest({
        title: "Monatsabschluss-Check",
        message:
          warnungen.length === 1
            ? "Vor dem Senden ist eine Sache aufgefallen:"
            : `Vor dem Senden sind ${warnungen.length} Dinge aufgefallen:`,
        details: warnungen,
        confirmLabel: "Trotzdem senden",
        cancelLabel: "Erst korrigieren",
        onConfirm: () => {
          void senden();
        },
      });
      return;
    }
    await senden();
  }, [
    reportData, triggerHaptic, announceToAriaAndSpeech,
    handleExportExcel, getReportWarnings, setConfirmRequest,
  ]);

  return {
    setzeVersandStatus,
    handleToggleVersandStatus,
    getReportWarnings,
    handleExportExcel,
    handleExportTimeLogsExcel,
    handleSendToVL,
  };
}
