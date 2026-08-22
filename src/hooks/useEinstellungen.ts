import { useEffect, useState } from "react";
import {
  AccessibilitySettings,
  SectionsConfig,
  YearlyCarryover,
} from "../types";
import { QuickEntryConfig, DEFAULT_QUICK_CONFIG } from "../components/QuickEntryPanel";
import { safeSetItem } from "../utils/speicher";

/**
 * Die Einstellungen und ihre Speicherung.
 *
 * Vierter Baustein der Aufteilung von `App.tsx` (0.9.14). Zusammengefasst ist
 * hier alles, was der Nutzer EINMAL einstellt und was danach bleibt --
 * getrennt von den Monatsdaten, die sich staendig aendern.
 *
 * Die Aufteilung folgt der Speicherung, nicht dem Bildschirm: Alles hier liegt
 * in `localStorage` (klein, synchron lesbar beim Start), waehrend Bericht und
 * Archiv in der IndexedDB liegen und asynchron nachgeladen werden. Diese
 * Trennung ist der Grund, warum die App sofort mit der richtigen Schriftgroesse
 * und dem richtigen Farbschema erscheint und nicht erst umspringt.
 *
 * `accessibility`, `appFields` und die beiden Layout-Schalter bleiben bewusst
 * in `App.tsx`: Sie werden vor diesem Hook gebraucht (die Sprachausgabe haengt
 * an `accessibility`). Hier liegt nur ihre Speicherung.
 */

/** Monatsziele je Bereich. Der Aufbau stammt aus dem Zielkarten-Bereich. */
export interface GoalsConfig {
  enabled: boolean;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
}

export interface EinstellungenParameter {
  /** Wird gespeichert, aber nicht hier gehalten -- siehe Kopfkommentar. */
  appFields: SectionsConfig;
  accessibility: AccessibilitySettings;
  isCompactView: boolean;
  mobileComfortMode: boolean;
  triggerToast: (nachricht: string) => void;
  announceToAriaAndSpeech: (nachricht: string, sofort?: boolean) => void;
}

export interface Einstellungen {
  quickConfig: QuickEntryConfig;
  updateQuickConfig: (neu: QuickEntryConfig) => void;
  goalsConfig: GoalsConfig;
  updateGoalsConfig: (neu: GoalsConfig) => void;
  carryover: YearlyCarryover;
  /** Ohne Speichern -- fuer den Geraete-Abgleich, der selbst schreibt. */
  setCarryover: React.Dispatch<React.SetStateAction<YearlyCarryover>>;
  /** Mit Speichern, Zeitstempel und Rueckmeldung -- fuer die Oberflaeche. */
  updateCarryover: (neu: YearlyCarryover) => void;
}

/**
 * Werte unveraendert aus `App.tsx` uebernommen. Nicht "aufraeumen": Sie sind
 * die Vorbelegung fuer Neuinstallationen und damit sichtbares Verhalten.
 */
const STANDARD_ZIELE: GoalsConfig = {
  enabled: false,
  s1: 15,
  s2: 10,
  s3: 5,
  s4: 40,
};

const STANDARD_UEBERTRAG: YearlyCarryover = {
  regularVacationEntitlement: 30,
  additionalVacationEntitlement: 5,
  vacationCarryover: 0,
  overtimeCarryover: 0,
  dailyTargetHours: 8.0,
};

/** Aus localStorage lesen und mit den Standardwerten auffuellen. */
function ladeMitStandard<T extends object>(schluessel: string, standard: T): T {
  const gespeichert = localStorage.getItem(schluessel);
  if (!gespeichert) return standard;
  try {
    // Auffuellen statt ersetzen: Kommt spaeter ein Feld dazu, fehlt es sonst
    // bei allen bestehenden Installationen.
    return { ...standard, ...JSON.parse(gespeichert) };
  } catch {
    return standard;
  }
}

export function useEinstellungen(p: EinstellungenParameter): Einstellungen {
  const {
    appFields, accessibility, isCompactView, mobileComfortMode,
    triggerToast, announceToAriaAndSpeech,
  } = p;

  const [quickConfig, setQuickConfig] = useState<QuickEntryConfig>(() =>
    ladeMitStandard("aussendienst_pwa_quick_v1", DEFAULT_QUICK_CONFIG),
  );
  const [goalsConfig, setGoalsConfig] = useState<GoalsConfig>(() =>
    ladeMitStandard("aussendienst_pwa_goals_v2", STANDARD_ZIELE),
  );
  const [carryover, setCarryover] = useState<YearlyCarryover>(() =>
    ladeMitStandard("aussendienst_pwa_carryover_v2", STANDARD_UEBERTRAG),
  );

  const updateQuickConfig = (neu: QuickEntryConfig) => {
    setQuickConfig(neu);
    safeSetItem("aussendienst_pwa_quick_v1", JSON.stringify(neu));
  };

  const updateGoalsConfig = (neu: GoalsConfig) => {
    setGoalsConfig(neu);
    safeSetItem("aussendienst_pwa_goals_v2", JSON.stringify(neu));
  };

  const updateCarryover = (neu: YearlyCarryover) => {
    // Zeitstempel: Beim Geraete-Abgleich entscheidet er, welcher Stand gilt.
    const gestempelt = { ...neu, updatedAt: new Date().toISOString() };
    setCarryover(gestempelt);
    safeSetItem("aussendienst_pwa_carryover_v2", JSON.stringify(gestempelt));
    triggerToast("Jahreskonto erfolgreich aktualisiert!");
    announceToAriaAndSpeech("Jahreskonto-Einstellungen gespeichert.", true);
  };

  // --- Speicherung dessen, was in App.tsx gehalten wird ------------------
  useEffect(() => {
    safeSetItem("aussendienst_pwa_fields", JSON.stringify(appFields));
  }, [appFields]);

  useEffect(() => {
    safeSetItem("aussendienst_pwa_a11y", JSON.stringify(accessibility));
    document.documentElement.setAttribute("data-theme", accessibility.theme);
    document.documentElement.setAttribute("data-size", accessibility.fontSize);
    // Steuert Tailwinds dark:-Varianten (siehe @custom-variant in index.css).
    // Ohne dies folgen sie dem Betriebssystem statt der App-Einstellung -- das
    // ergab "Hell" bei dunklem System mit 1,18:1 Kontrast.
    const dunkleThemes = ["dark", "high-contrast-dark", "high-contrast-yellow"];
    document.documentElement.setAttribute(
      "data-dark",
      dunkleThemes.includes(accessibility.theme) ? "true" : "false",
    );
  }, [accessibility]);

  useEffect(() => {
    safeSetItem("aussendienst_pwa_compact", String(isCompactView));
  }, [isCompactView]);

  useEffect(() => {
    safeSetItem("aussendienst_pwa_mobile_comfort", mobileComfortMode ? "true" : "false");
  }, [mobileComfortMode]);

  return {
    quickConfig,
    updateQuickConfig,
    goalsConfig,
    updateGoalsConfig,
    carryover,
    setCarryover,
    updateCarryover,
  };
}
