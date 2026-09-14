import React, { useCallback } from "react";
import {
  AccessibilitySettings,
  HistoryRecord,
  ReportData,
  SectionsConfig,
} from "../types";
import { triggerFileDownload } from "../utils/excelUtils";
import { formatMonthGerman } from "../utils/dateUtils";
import { pruefeMonatsabschluss } from "../utils/abschlussCheck";
import { persistHistory, OnPersistFailure } from "../utils/speicher";
import { ConfirmRequest } from "../components/ConfirmDialog";
import type { BlattUmfang } from "../utils/vorlageExport";
import { VORLAGE_STAND } from "../utils/vorlageStand";

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
  /**
   * Nur zum Nachsehen, ob ein Monat ueberhaupt im Archiv liegt. Die Ansage
   * nach dem Export behauptete bis 0.9.21 IMMER "im RV Archiv als gesendet
   * markiert" -- auch dann, wenn `setzeVersandStatus` wortlos ausgestiegen
   * war, weil es den Monat dort gar nicht gibt (ein Monat ohne Inhalt wird
   * nach `monthHasContent` nicht archiviert und laesst sich trotzdem ueber
   * "Trotzdem senden" ausgeben).
   */
  history: Record<string, HistoryRecord> | null;
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
  handleExportExcel: (umfang: BlattUmfang) => Promise<void>;
  /** Stundenzettel getrennt ausgeben. */
  handleExportTimeLogsExcel: () => Promise<void>;
  /** Mit Abschluss-Check: fragt bei Auffaelligkeiten nach. */
  handleSendToVL: () => Promise<void>;
}

export function useExport(p: ExportParameter): ExportFunktionen {
  const {
    reportData, appFields, accessibility, setHistory,
    history,
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
  // Blatt 2 und 3. Seit 0.9.33 entscheidet der Nutzer vor jedem Senden, ob
  // die beiden ueberhaupt mitgehen; `umfang` traegt diese Entscheidung.
  const handleExportExcel = useCallback(async (umfang: BlattUmfang) => {
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
      const wbout = await erzeugeVorlagenDatei(
        daten,
        appFields,
        umfang,
        // Ist die Stempeluhr abgeschaltet, waere ein Schichtenblatt (leer oder
        // mit Altbestand) keine Angabe, sondern ein Missverstaendnis.
        accessibility.enableTimeTracking !== false,
      );
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
      const imArchiv = !!history?.[monthVal];
      setzeVersandStatus(monthVal, true);
      triggerToast(`Excel-Report erfolgreich ${ergebnis}!`);
      // Nur behaupten, was auch passiert ist: `setzeVersandStatus` steigt
      // wortlos aus, wenn der Monat nicht im Archiv liegt.
      announceToAriaAndSpeech(
        imArchiv
          ? `Excel-Report ${ergebnis}. Der Monat ist im RV Archiv als gesendet markiert.`
          : `Excel-Report ${ergebnis}. Dieser Monat liegt nicht im RV Archiv und konnte dort nicht als gesendet markiert werden.`,
      );
    } catch (err) {
      console.error("Excel-Export fehlgeschlagen", err);
      triggerToast("Fehler beim Erstellen der Excel-Datei.");
      announceToAriaAndSpeech("Fehler beim Erstellen der Excel-Datei.", true);
    }
  }, [
    reportData, appFields, history, triggerHaptic, meldeNochNichtGeladen,
    triggerToast, announceToAriaAndSpeech, setzeVersandStatus, accessibility,
  ]);

  const handleExportTimeLogsExcel = useCallback(async () => {
    triggerHaptic(25);
    const daten = reportData;
    if (!daten) {
      meldeNochNichtGeladen();
      return;
    }
    try {
      // Erst beim Export laden -- wie beim Bericht: ExcelJS kommt nach.
      const { erzeugeZeitenDatei } = await import("../utils/vorlageExport");
      const result = await erzeugeZeitenDatei(daten);
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
    const senden = async (umfang: BlattUmfang) => {
      announceToAriaAndSpeech(
        umfang === "vorlage"
          ? "Teilen-Dialog wird geöffnet. Gesendet wird nur das Blatt Monatsinfo."
          : "Teilen-Dialog wird geöffnet. Gesendet werden alle Blätter.",
      );
      await handleExportExcel(umfang);
    };

    /*
      Die Blattwahl (0.9.33) -- bewusst vor JEDEM Senden und bewusst nicht als
      gespeicherte Einstellung.

      Blatt 3 traegt die einzelnen Schichten mit Kommen, Gehen, Pause und
      Notiz. Das ist die einzige Stelle, an der die Vertriebsleitung sie zu
      sehen bekommt; die Vorlage selbst fragt nur nach Arbeitstagen (D18) und
      Buerostunden (D19). Wer das einmal einstellt, weiss beim naechsten Mal
      nicht mehr, was gerade rausgeht -- deshalb die Frage statt eines
      Schalters.
    */
    const mitZeiten = accessibility.enableTimeTracking !== false;
    const frageNachUmfang = () => {
      setConfirmRequest({
        title: "Was soll gesendet werden?",
        message: mitZeiten
          ? `Blatt 1 ist das gewohnte Formular der Vertriebsleitung (Fassung ${VORLAGE_STAND}). Auf Wunsch kommen zwei weitere Blätter dazu: Ihre Zusatzangaben und Ihre einzelnen Schichten. Beides braucht die Vertriebsleitung nicht.`
          : `Blatt 1 ist das gewohnte Formular der Vertriebsleitung (Fassung ${VORLAGE_STAND}). Auf Wunsch kommt ein Blatt mit Ihren Zusatzangaben dazu, für die es im Formular keine Zeile gibt.`,
        confirmLabel: "Nur Vorlage senden",
        cancelLabel: "Abbrechen",
        alternative: {
          label: mitZeiten ? "Alle drei Blätter" : "Beide Blätter",
          onSelect: () => {
            void senden("alle");
          },
        },
        onConfirm: () => {
          void senden("vorlage");
        },
      });
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
        onConfirm: frageNachUmfang,
      });
      return;
    }
    frageNachUmfang();
  }, [
    reportData, triggerHaptic, announceToAriaAndSpeech,
    handleExportExcel, getReportWarnings, setConfirmRequest, accessibility,
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
