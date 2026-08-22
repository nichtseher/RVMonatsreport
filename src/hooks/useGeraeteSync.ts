import { useCallback, useEffect } from "react";
import {
  AppTab,
  HistoryRecord,
  ReportData,
  SectionsConfig,
  YearlyCarryover,
} from "../types";
import { mergeSyncPayload } from "../utils/merge";
import { stableStringify } from "../utils/stableJson";
import { pruefeSyncPaket, PAKET_APP, PAKET_FORMAT } from "../utils/syncSchema";
import { registerLiveSyncHandlers, disconnectLiveSync } from "../utils/liveSync";
import { persistHistory, safeSetItem, OnPersistFailure } from "../utils/speicher";

/**
 * Geraete-Abgleich: Paket bauen, Paket uebernehmen, Live-Verbindung anbinden.
 *
 * Erster Baustein der Aufteilung von `App.tsx` (0.9.14). Herausgeloest wurden
 * die Bloecke "LIVE-SYNC" und "GERAETE-SYNC: ZUSAMMENFUEHREN ODER ERSETZEN" --
 * inhaltlich unveraendert, nur der Ort ist neu.
 *
 * Die lange Parameterliste ist Absicht und kein Versehen: Sie macht sichtbar,
 * woran dieser Teil tatsaechlich haengt. In der Monolith-Fassung war das
 * unsichtbar, weil alles im selben Sichtbarkeitsbereich lag.
 */

export interface GeraeteSyncParameter {
  appFields: SectionsConfig;
  setAppFields: (felder: SectionsConfig) => void;
  history: Record<string, HistoryRecord> | null;
  setHistory: (verlauf: Record<string, HistoryRecord>) => void;
  carryover: YearlyCarryover;
  setCarryover: (uebertrag: YearlyCarryover) => void;
  reportData: ReportData | null;
  setReportData: (daten: ReportData) => void;

  /** Aus dem Live-Sync-Dienst: Die Verbindung ist abgerissen. */
  liveSyncFailed: boolean;
  /** Den Hinweis auf den Abbruch wieder einblenden. */
  zeigeAbbruchHinweis: () => void;

  announceToAriaAndSpeech: (nachricht: string, sofort?: boolean) => void;
  triggerToast: (nachricht: string) => void;
  setActiveTab: (tab: AppTab) => void;
  onPersistFailure: OnPersistFailure;
}

export interface GeraeteSync {
  /** Der komplette Stand als stabiler Text -- Grundlage jeder Uebertragung. */
  buildSyncPayload: () => string;
  /** Kompletten Datenbestand aus einem Paket uebernehmen ("Ersetzen"). */
  ersetzeGesamtstand: (paket: any) => void;
  /** Ein empfangenes Paket zusammenfuehren oder ersetzen. */
  handleSyncImport: (
    dataStr: string,
    strategy: "merge" | "replace",
    options?: { silent?: boolean },
  ) => boolean;
}

export function useGeraeteSync(p: GeraeteSyncParameter): GeraeteSync {
  const {
    appFields, setAppFields,
    history, setHistory,
    carryover, setCarryover,
    reportData, setReportData,
    liveSyncFailed, zeigeAbbruchHinweis,
    announceToAriaAndSpeech, triggerToast, setActiveTab, onPersistFailure,
  } = p;

  // stableStringify statt JSON.stringify: Der Live-Abgleich vergleicht den
  // erzeugten Text, um Unveraendertes nicht erneut zu senden. Ohne stabile
  // Schluesselreihenfolge sahen inhaltsgleiche Staende verschieden aus.
  // Der fruehere Zusatzschluessel "timeLogs" ist entfallen: Die Gegenseite hat
  // ihn nie gelesen -- er war reiner Ballast in jeder Nachricht. Die Schichten
  // stecken ohnehin in reportData und im Archiv.
  const buildSyncPayload = useCallback((): string => {
    // app/fmt seit 0.9.5: Damit laesst sich ein fremder oder unvollstaendiger
    // Code klar als solcher erkennen, statt ihn zu erraten (siehe syncSchema).
    return stableStringify({
      app: PAKET_APP,
      fmt: PAKET_FORMAT,
      appFields,
      history,
      carryover,
      reportData,
    });
  }, [appFields, history, carryover, reportData]);

  /**
   * Gemeinsame Grundlage fuer "Ersetzen" beim Geraete-Sync und fuer das
   * Einspielen einer Datensicherung -- vorher zweimal fast gleich
   * ausgeschrieben, mit dem ueblichen Risiko, nur eine Stelle zu pflegen.
   */
  const ersetzeGesamtstand = useCallback(
    (paket: any) => {
      if (paket.appFields) setAppFields(paket.appFields);
      if (paket.history) {
        setHistory(paket.history);
        // Direkt in IndexedDB sichern, sonst ist das Archiv nach dem Neuladen
        // weg. Ueber persistHistory statt mit verschlucktem Fehler: Sonst
        // meldet die App "erfolgreich wiederhergestellt", obwohl nichts
        // geschrieben wurde -- und beim naechsten Oeffnen ist alles weg.
        persistHistory(paket.history, onPersistFailure, "wiederherstellung");
      }
      if (paket.carryover) {
        setCarryover(paket.carryover);
        safeSetItem("aussendienst_pwa_carryover_v2", JSON.stringify(paket.carryover));
      }
      if (paket.reportData) setReportData(paket.reportData);
    },
    [setAppFields, setHistory, setCarryover, setReportData, onPersistFailure],
  );

  const handleSyncImport = useCallback(
    (
      dataStr: string,
      strategy: "merge" | "replace",
      options?: { silent?: boolean },
    ): boolean => {
      try {
        const roh = JSON.parse(dataStr);
        // Letzte Verteidigungslinie: Auch der Live-Kanal und aeltere Fassungen
        // koennen unbrauchbare Pakete liefern. Ungeprueft uebernommen fuehrte
        // das direkt in den Fehlerbildschirm (reproduziert am 2026-08-03).
        const geprueft = pruefeSyncPaket(roh);
        if (!geprueft.ok) {
          console.error("Sync-Paket abgelehnt:", geprueft.grund);
          if (!options?.silent) {
            triggerToast(geprueft.grund);
            announceToAriaAndSpeech(geprueft.grund, true);
          }
          return false;
        }
        const parsed = geprueft.paket;
        if (strategy === "merge") {
          const merged = mergeSyncPayload(
            { appFields, history: history || {}, carryover, reportData },
            parsed,
          );
          setAppFields(merged.appFields);
          setHistory(merged.history);
          // Fehler beim Schreiben muessen sichtbar werden -- gerade beim
          // Zusammenfuehren, wo der Nutzer glaubt, beide Geraete seien gleichauf.
          persistHistory(merged.history, onPersistFailure, "sync-zusammenfuehren");
          setCarryover(merged.carryover);
          safeSetItem("aussendienst_pwa_carryover_v2", JSON.stringify(merged.carryover));
          if (merged.reportData) setReportData(merged.reportData);
        } else {
          ersetzeGesamtstand(parsed);
        }
        if (!options?.silent) {
          setActiveTab("options");
          const msg =
            strategy === "merge"
              ? "Daten beider Geräte erfolgreich zusammengeführt!"
              : "Daten erfolgreich ersetzt!";
          triggerToast(msg);
          announceToAriaAndSpeech(msg, true);
        }
        return true;
      } catch (e) {
        console.error("Sync import failed", e);
        triggerToast("Fehler bei der Datensynchronisation.");
        announceToAriaAndSpeech("Fehler bei der Datensynchronisation.", true);
        return false;
      }
    },
    [
      appFields, history, carryover, reportData,
      setAppFields, setHistory, setCarryover, setReportData,
      announceToAriaAndSpeech, triggerToast, setActiveTab,
      ersetzeGesamtstand, onPersistFailure,
    ],
  );

  // Aktuelle Export-/Merge-Funktionen beim Live-Sync-Dienst hinterlegen, damit
  // der Hintergrund-Abgleich immer den aktuellen Stand sendet.
  useEffect(() => {
    registerLiveSyncHandlers(buildSyncPayload, (dataStr) => {
      handleSyncImport(dataStr, "merge", { silent: true });
    });
  }, [buildSyncPayload, handleSyncImport]);

  // Abbruch der Live-Verbindung hoerbar UND sichtbar machen. Vorher verschwand
  // nur das gruene Abzeichen im Kopfbereich -- wer gerade Zahlen eintippt,
  // bemerkt das nicht und glaubt weiter, beide Geraete seien gleichauf.
  useEffect(() => {
    if (!liveSyncFailed) return;
    zeigeAbbruchHinweis();
    triggerToast("Live-Verbindung unterbrochen – es wird nicht mehr abgeglichen.");
    announceToAriaAndSpeech(
      "Achtung: Die Live-Verbindung zum anderen Gerät ist unterbrochen. Ihre Eingaben werden weiter auf diesem Gerät gespeichert, aber nicht mehr übertragen.",
      true,
    );
    // triggerToast und zeigeAbbruchHinweis absichtlich NICHT in der Liste:
    // Beide wechseln bei jedem Rendern die Identitaet, der Hinweis wuerde sonst
    // dauernd erneut ausgeloest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSyncFailed, announceToAriaAndSpeech]);

  // Live-Verbindung sauber beenden, wenn die App geschlossen wird
  useEffect(() => {
    const handleUnload = () => disconnectLiveSync();
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);

  return { buildSyncPayload, ersetzeGesamtstand, handleSyncImport };
}
