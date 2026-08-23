import { useCallback, useEffect, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import { HistoryRecord, ReportData, SectionsConfig } from "../types";
import { persistHistory, safeSetItem } from "../utils/speicher";
import { stempeln, stempelNachtragen } from "../utils/zeitstempel";
import { baueArchivEintrag } from "../utils/archivEintrag";
import { monthHasContent } from "../utils/monatInhalt";
import { stableStringify } from "../utils/stableJson";

/**
 * Die Monatsdaten und ihre Speicherung -- der Kern der App.
 *
 * Sechster und letzter Baustein der Aufteilung von `App.tsx` (0.9.14/0.9.15).
 * Bewusst zuletzt: Hier sind in dieser Sitzung ZWEIMAL Daten stillschweigend
 * verschwunden (die Versand-Markierung, siehe utils/archivEintrag.ts).
 *
 * KEINE ANSAGEN HIER. Der Hook meldet ueber `speicherFehler` nur, DASS etwas
 * fehlschlug; `App.tsx` sagt es an. Sonst braeuchte dieser Hook die
 * Sprachausgabe -- die wiederum `reportData` von hier braucht. Diese
 * Ringabhaengigkeit ueber eine Referenz zu umgehen waere im Kern-Datenfluss
 * die falsche Antwort.
 */

/** Drei Ebenen, absichtlich getrennt -- siehe Kommentare unten. */
const SCHLUESSEL_BERICHT = "aussendienst_pwa_data";
const SCHLUESSEL_ARCHIV = "aussendienst_pwa_history";
const SCHLUESSEL_NOTFALL = "aussendienst_pwa_emergency_data";

/** Verzoegerung des Speicherns, damit nicht jeder Tastendruck schreibt. */
const SPEICHER_VERZOEGERUNG_MS = 400;

export type SaveStatus = "saving" | "saved" | "error";
/** Zuletzt abgeschlossener Monat -- Grundlage fuer das Rueckgaengig-Angebot. */
export type MonatsAbschluss = { from: string; to: string } | null;
/** Welche Ebene zuletzt nicht geschrieben werden konnte. */
export type SpeicherFehler = null | "bericht" | "archiv";

export interface BerichtsdatenParameter {
  appFields: SectionsConfig;
  /** Einstieg zeigen? Entscheidet sich beim Laden aus den vorhandenen Daten. */
  setShowOnboarding: (zeigen: boolean) => void;
  onboardingSchluessel: string;
}

export interface Berichtsdaten {
  reportData: ReportData | null;
  setReportData: React.Dispatch<React.SetStateAction<ReportData | null>>;
  history: Record<string, HistoryRecord> | null;
  setHistory: React.Dispatch<
    React.SetStateAction<Record<string, HistoryRecord> | null>
  >;

  saveStatus: SaveStatus;
  lastSavedTime: string;
  /** Treibt das Warnbanner. */
  storageWriteFailed: boolean;
  setStorageWriteFailed: (fehler: boolean) => void;
  /** Wechselt bei jedem neuen Fehlschlag -- App.tsx sagt ihn an. */
  speicherFehler: SpeicherFehler;
  handleHistoryPersistFailure: (context: string, err: unknown) => void;

  handleValueChange: (id: string, val: number | "") => void;
  /** Zaehler aendern und den neuen Wert sofort zurueckgeben. */
  applyValueDelta: (id: string, delta: number) => number;
  handleValueInput: (id: string, val: number | "") => void;
  handleMetaChange: (key: keyof Omit<ReportData, "values">, val: string) => void;
  /** Wird bei jeder Eingabe geleert -- siehe handleValueChange. */
  setLastMonthClose: React.Dispatch<React.SetStateAction<MonatsAbschluss>>;
  lastMonthClose: MonatsAbschluss;
}

/** Inhaltlicher Fingerabdruck eines Monats -- ohne savedAt. */
const inhaltsFingerabdruck = (r: {
  name?: string;
  notes?: string;
  values?: Record<string, number | "">;
  valuesUpdatedAt?: Record<string, string>;
  timeLogs?: unknown[];
  fieldsSnapshot?: SectionsConfig;
}): string =>
  stableStringify({
    name: r.name || "",
    notes: r.notes || "",
    values: r.values || {},
    valuesUpdatedAt: r.valuesUpdatedAt || {},
    timeLogs: r.timeLogs || [],
    fieldsSnapshot: r.fieldsSnapshot || null,
  });

const aktuellerMonat = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const leererMonat = (monat: string): ReportData => ({
  month: monat,
  name: "",
  notes: "",
  values: {},
  timeLogs: [],
});

export function useBerichtsdaten(p: BerichtsdatenParameter): Berichtsdaten {
  const { appFields, setShowOnboarding, onboardingSchluessel } = p;

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryRecord> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  // Vorbelegt mit der aktuellen Uhrzeit, nicht leer: Die Anzeige "zuletzt
  // gesichert um --:--:--" verunsichert, bevor der erste Speicherlauf lief.
  const [lastSavedTime, setLastSavedTime] = useState<string>(() =>
    new Date().toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );
  const [storageWriteFailed, setStorageWriteFailed] = useState(false);
  const [speicherFehler, setSpeicherFehler] = useState<SpeicherFehler>(null);
  const [lastMonthClose, setLastMonthClose] = useState<MonatsAbschluss>(null);

  /**
   * Zentrale Reaktion, wenn ein Archiv-Schreibvorgang fehlschlaegt -- z. B.
   * Speicher voll oder IndexedDB durch Browser-Richtlinie blockiert. Ohne
   * diese Rueckmeldung wuesste niemand, dass eine Aenderung nicht gesichert
   * wurde.
   */
  const handleHistoryPersistFailure = useCallback(
    (context: string, err: unknown) => {
      console.error(`Speichern des RV Archivs fehlgeschlagen (${context})`, err);
      setStorageWriteFailed(true);
      setSpeicherFehler("archiv");
    },
    [],
  );

  // --- Laden ------------------------------------------------------------
  useEffect(() => {
    async function loadData() {
      try {
        const [savedData, savedHistory] = await Promise.all([
          get(SCHLUESSEL_BERICHT),
          get(SCHLUESSEL_ARCHIV),
        ]);

        // Notfallkopie hat Vorrang: Sie ist juenger als der letzte regulaere
        // Schreibvorgang, wenn iOS die Seite mitten im Tippen entladen hat.
        // Nur anwenden, wenn sie WIRKLICH da ist -- dieser Pfad hat schon
        // einmal einen nahezu leeren Stand ueber echte Daten geschrieben.
        const notfall = localStorage.getItem(SCHLUESSEL_NOTFALL);
        let initialData = savedData;
        if (notfall) {
          try {
            initialData = JSON.parse(notfall);
            localStorage.removeItem(SCHLUESSEL_NOTFALL);
          } catch {
            /* unbrauchbare Notfallkopie -- der regulaere Stand gilt */
          }
        }

        const monat = aktuellerMonat();
        if (initialData) {
          if (!initialData.month) initialData.month = monat;
          // Feld-Zeitstempel aus aelteren Staenden nachtragen, solange der
          // Monats-Zeitstempel noch der alte ist (siehe stempelNachtragen).
          initialData.valuesUpdatedAt = stempelNachtragen(
            initialData.values,
            initialData.valuesUpdatedAt,
            savedHistory?.[initialData.month]?.savedAt || new Date(0).toISOString(),
          );
          setReportData(initialData);
        } else {
          setReportData(leererMonat(monat));
        }

        setHistory(savedHistory || {});

        // Einstieg nur bei echter Erstnutzung. Bestehende Nutzer erkennen wir
        // an vorhandenen Daten -- bei ihnen wird die Markierung still gesetzt,
        // damit der Einstieg nicht nachtraeglich aufpoppt.
        const bereitsGesehen = localStorage.getItem(onboardingSchluessel) === "1";
        const hatDaten =
          (savedHistory && Object.keys(savedHistory).length > 0) ||
          (initialData &&
            (initialData.name ||
              (initialData.values &&
                Object.values(initialData.values).some(
                  (v: any) => typeof v === "number" && v > 0,
                ))));
        if (bereitsGesehen || hatDaten) {
          if (!bereitsGesehen) safeSetItem(onboardingSchluessel, "1");
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
        }
      } catch (e) {
        console.error("Failed to load from IDB", e);
        setReportData(leererMonat(aktuellerMonat()));
        setHistory({});
        // Im Fehlerfall keinen Einstieg erzwingen -- der Nutzer hat
        // moeglicherweise Daten, die nur gerade nicht lesbar waren.
        setShowOnboarding(false);
      }
    }
    loadData();
    // Absichtlich nur beim Start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Speichern des Berichts (verzoegert) ------------------------------
  useEffect(() => {
    setSaveStatus("saving");
    const t = setTimeout(() => {
      if (!reportData) return;
      set(SCHLUESSEL_BERICHT, reportData)
        .then(() => {
          setSaveStatus("saved");
          setStorageWriteFailed(false);
          setSpeicherFehler(null);
          setLastSavedTime(
            new Date().toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          );
        })
        .catch((err) => {
          // Muss ehrlich angezeigt werden: Ohne diesen Pfad meldete die
          // Anzeige weiterhin "gesichert", obwohl nichts geschrieben wurde.
          console.error("Speichern des Reports fehlgeschlagen", err);
          setSaveStatus("error");
          setStorageWriteFailed(true);
          setSpeicherFehler("bericht");
        });
    }, SPEICHER_VERZOEGERUNG_MS);
    return () => clearTimeout(t);
  }, [reportData]);

  // --- Automatisch ins Archiv spiegeln ----------------------------------
  useEffect(() => {
    // Einmal festhalten statt ueberall `reportData?.`: Innerhalb des
    // setHistory-Rueckrufs kann TypeScript die Pruefung oben nicht mehr
    // zuordnen -- und ein `?.` dort legte still einen Archiveintrag unter dem
    // Schluessel "undefined" an.
    const daten = reportData;
    if (!daten?.month) return;
    if (!monthHasContent(daten)) return;

    setHistory((prev) => {
      // `null` heisst "Archiv noch nicht geladen". Dann NICHT schreiben: Ein
      // `prev || {}` ersetzte den gespeicherten Bestand durch einen einzelnen
      // Monat.
      if (!prev) return prev;

      // Ohne inhaltliche Aenderung KEIN neues savedAt und kein Schreibvorgang.
      // Vorher erzeugte jedes Zusammenfuehren neue Objekte, dadurch lief der
      // Live-Abgleich endlos im Dreisekundentakt und schrieb dabei
      // ununterbrochen in die IndexedDB (gemessen 2026-08-02).
      const bestehend = prev[daten.month];
      const inhalt = {
        month: daten.month,
        name: daten.name,
        notes: daten.notes,
        values: daten.values,
        valuesUpdatedAt: daten.valuesUpdatedAt,
        timeLogs: daten.timeLogs || [],
        fieldsSnapshot: appFields,
      };
      if (bestehend && inhaltsFingerabdruck(bestehend) === inhaltsFingerabdruck(inhalt)) {
        return prev;
      }

      const updated = {
        ...prev,
        [daten.month]: baueArchivEintrag(
          daten,
          appFields,
          bestehend,
          new Date().toISOString(),
        ),
      };
      persistHistory(updated, handleHistoryPersistFailure, "auto-save");
      return updated;
    });
  }, [
    reportData?.name,
    reportData?.notes,
    reportData?.values,
    reportData?.valuesUpdatedAt,
    reportData?.month,
    reportData?.timeLogs,
    appFields,
    handleHistoryPersistFailure,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  // --- Notfallspeicherung beim Wegwischen -------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && reportData) {
        // Synchron in localStorage, damit iOS beim Wegwischen der App nichts
        // abschneidet. try/catch statt safeSetItem: Hier darf kein alert()
        // den Wechsel in den Hintergrund blockieren.
        try {
          localStorage.setItem(SCHLUESSEL_NOTFALL, JSON.stringify(reportData));
        } catch (err) {
          console.error("Notfallspeicherung fehlgeschlagen", err);
        }
        // Zusaetzlich der regulaere Weg. Ein Fehler ist hier nicht dramatisch
        // -- die Notfallkopie greift --, gehoert aber in die Konsole.
        set(SCHLUESSEL_BERICHT, reportData).catch((err) =>
          console.error("Sicherung beim Wechsel in den Hintergrund fehlgeschlagen", err),
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [reportData]);

  // --- Zaehler aendern ---------------------------------------------------
  const handleValueChange = useCallback((id: string, val: number | "") => {
    // Sobald im neuen Monat gearbeitet wird, ist das Rueckgaengig-Angebot
    // hinfaellig -- ein Ruecksprung wuerde sonst frische Eingaben gefaehrden.
    setLastMonthClose(null);
    setReportData((prev) => {
      // Solange kein Bericht geladen ist, darf eine Eingabe nichts anlegen --
      // sonst entstuende ein Datensatz ohne Monat und Namen.
      if (!prev) return prev;
      return {
        ...prev,
        values: { ...prev.values, [id]: val },
        valuesUpdatedAt: stempeln(prev.valuesUpdatedAt, [id]),
      };
    });
  }, []);

  /**
   * Synchron mitgefuehrter Spiegel der Zaehlerstaende.
   *
   * Grund: Schnelles mehrfaches Tippen darf keine Zaehlung verlieren. Wuerde
   * der neue Wert aus dem React-Zustand gelesen, laese jeder Tipp vor dem
   * naechsten Rendern denselben alten Stand -- "dreimal tippen" ergab +1.
   */
  const valuesRef = useRef<Record<string, number | "">>({});
  useEffect(() => {
    valuesRef.current = reportData?.values || {};
  }, [reportData?.values]);

  const applyValueDelta = useCallback(
    (id: string, delta: number): number => {
      const current =
        typeof valuesRef.current[id] === "number" ? (valuesRef.current[id] as number) : 0;
      const newVal = Math.max(0, parseFloat((current + delta).toFixed(1)));
      const stored: number | "" = newVal === 0 ? "" : newVal;
      valuesRef.current = { ...valuesRef.current, [id]: stored };
      handleValueChange(id, stored);
      return newVal;
    },
    [handleValueChange],
  );

  /** Direkte Eingabe -- Spiegel mitziehen, damit +/- danach stimmt. */
  const handleValueInput = useCallback(
    (id: string, val: number | "") => {
      valuesRef.current = { ...valuesRef.current, [id]: val };
      handleValueChange(id, val);
    },
    [handleValueChange],
  );

  const handleMetaChange = useCallback(
    (key: keyof Omit<ReportData, "values">, val: string) => {
      setLastMonthClose(null);
      setReportData((prev) => (prev ? { ...prev, [key]: val } : prev));
    },
    [],
  );

  return {
    reportData, setReportData,
    history, setHistory,
    saveStatus, lastSavedTime,
    storageWriteFailed, setStorageWriteFailed,
    speicherFehler, handleHistoryPersistFailure,
    handleValueChange, applyValueDelta, handleValueInput, handleMetaChange,
    lastMonthClose, setLastMonthClose,
  };
}
