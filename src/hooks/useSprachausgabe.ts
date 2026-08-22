import { useCallback, useRef, useState } from "react";
import { AccessibilitySettings, ReportData, SectionsConfig } from "../types";
import { baueZusammenfassung } from "../utils/zusammenfassung";

/**
 * Alles Hoerbare: ARIA-Ansagen, Sprachausgabe, Diktat, Vorlesefunktion.
 *
 * Dritter Baustein der Aufteilung von `App.tsx` (0.9.14). Der vorgelesene
 * Text selbst liegt als reine Funktion in `utils/zusammenfassung.ts` -- er ist
 * die Kontrollinstanz vor dem Senden und gehoert einzeln prueffbar.
 *
 * Warum die Ansage-Funktion hier und nicht in den Komponenten: Sie ist die
 * EINE Stelle, ueber die jede Rueckmeldung laeuft (ARIA-Live-Bereich plus
 * optionale Sprachausgabe). Verteilt man das, sagen manche Aktionen nichts an
 * -- und genau das merkt man ohne Screenreader nicht.
 */

export interface SprachausgabeParameter {
  accessibility: Pick<
    AccessibilitySettings,
    "screenReaderNarration" | "speechRate"
  >;
  reportData: ReportData | null;
  appFields: SectionsConfig;
  triggerToast: (nachricht: string) => void;
  triggerHaptic: (dauer?: number) => void;
  /** Diktiertext ans Notizfeld anhaengen. */
  onDiktatText: (text: string) => void;
}

export interface Sprachausgabe {
  /** Inhalt des ARIA-Live-Bereichs. */
  ariaAnnouncement: string;
  /**
   * Jede Rueckmeldung laeuft hierueber -- Live-Bereich und Sprachausgabe.
   * `fieldId` + `newValue` schalten die Kurzform fuer schnelles Tippen frei.
   */
  announceToAriaAndSpeech: (
    nachricht: string,
    sofort?: boolean,
    fieldId?: string,
    newValue?: number | "",
  ) => void;
  isDictating: boolean;
  toggleDictation: () => void;
  isReadingSummary: boolean;
  handleReadSummaryAloud: () => void;
}

export function useSprachausgabe(p: SprachausgabeParameter): Sprachausgabe {
  const { accessibility, reportData, appFields, triggerToast, triggerHaptic, onDiktatText } = p;

  const [ariaAnnouncement, setAriaAnnouncement] = useState("");
  const [isDictating, setIsDictating] = useState(false);
  const [isReadingSummary, setIsReadingSummary] = useState(false);

  const lastAnnouncedFieldRef = useRef<{ id: string; time: number } | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);

  const announceToAriaAndSpeech = useCallback(
    (
      message: string,
      immediate = false,
      fieldId?: string,
      newValue?: number | "",
    ) => {
      let finalMessage = message;

      // Kurzform beim schnellen Tippen: Wer denselben Zaehler innerhalb von
      // drei Sekunden erneut aendert, hoert nur noch die nackte Zahl. Sonst
      // laege die volle Feldbeschriftung ueber jedem Tastendruck und man
      // koennte nicht zuegig zaehlen.
      if (fieldId && typeof newValue !== "undefined") {
        const now = Date.now();
        const last = lastAnnouncedFieldRef.current;
        if (last && last.id === fieldId && now - last.time < 3000) {
          finalMessage = newValue === "" ? "leer" : String(newValue);
        }
        lastAnnouncedFieldRef.current = { id: fieldId, time: now };
      } else {
        lastAnnouncedFieldRef.current = null;
      }

      // 1. Live-Bereich: immer nur die juengste Ansage, sonst reihen
      //    Screenreader die Meldungen zu einer Kette auf.
      setAriaAnnouncement(finalMessage);

      // 2. Eigene Sprachausgabe, falls eingeschaltet -- gebremst, damit
      //    schnelle Eingaben nicht jede Zwischenzahl vorlesen.
      if (
        accessibility.screenReaderNarration &&
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);

        const speakNow = () => {
          try {
            window.speechSynthesis.cancel(); // laufenden Text abbrechen
            const utterance = new SpeechSynthesisUtterance(finalMessage);
            utterance.lang = "de-DE";
            utterance.rate = accessibility.speechRate || 1.0;
            utterance.onerror = (e) => {
              console.warn("ScreenReaderNarration SpeechSynthesis error:", e);
            };
            window.speechSynthesis.speak(utterance);
          } catch (err) {
            console.warn("ScreenReaderNarration SpeechSynthesis play exception:", err);
          }
        };

        if (immediate) speakNow();
        else speechTimeoutRef.current = setTimeout(speakNow, 600);
      }
    },
    [accessibility.screenReaderNarration, accessibility.speechRate],
  );

  const toggleDictation = useCallback(() => {
    triggerHaptic(20);
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      triggerToast("Spracherkennung wird von diesem Browser leider nicht unterstützt.");
      announceToAriaAndSpeech("Fehler: Spracherkennung nicht unterstützt", true);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsDictating(true);
      triggerToast("Spracheingabe gestartet... Bitte sprechen Sie jetzt.");
      announceToAriaAndSpeech("Sprachaufnahme gestartet", true);
    };

    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      if (text) {
        onDiktatText(text);
        triggerToast("Sprache erfolgreich in Text umgewandelt!");
        announceToAriaAndSpeech(`Eingefügter Text: ${text}`, true);
      }
    };

    recognition.onerror = (err: any) => {
      console.error(err);
      setIsDictating(false);
      triggerToast("Fehler bei der Spracherkennung. Bitte erneut versuchen.");
      announceToAriaAndSpeech("Fehler bei der Spracherkennung", true);
    };

    recognition.onend = () => {
      setIsDictating(false);
      announceToAriaAndSpeech("Sprachaufnahme beendet", true);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isDictating, triggerHaptic, triggerToast, announceToAriaAndSpeech, onDiktatText]);

  const handleReadSummaryAloud = useCallback(() => {
    triggerHaptic(20);

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      triggerToast("Sprachausgabe wird in diesem Browser leider nicht unterstützt.");
      return;
    }

    if (isReadingSummary) {
      window.speechSynthesis.cancel();
      setIsReadingSummary(false);
      triggerToast("Vorlesen gestoppt.");
      announceToAriaAndSpeech("Zusammenfassung gestoppt.", true);
      return;
    }

    const textToSpeak = baueZusammenfassung(reportData, appFields);

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "de-DE";
      utterance.rate = accessibility.speechRate || 1.0;

      utterance.onstart = () => {
        setIsReadingSummary(true);
        triggerToast("Zusammenfassung wird vorgelesen...");
      };
      utterance.onend = () => {
        setIsReadingSummary(false);
        triggerToast("Zusammenfassung beendet.");
      };
      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis utterance error", e);
        setIsReadingSummary(false);
        if (e.error === "not-allowed") {
          triggerToast("Info: Sprachausgabe im Vorschaufenster durch Browser blockiert.");
        } else {
          triggerToast("Sprachausgabe abgebrochen oder blockiert.");
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("SpeechSynthesis speak exception", err);
      setIsReadingSummary(false);
      triggerToast("Sprachausgabe konnte nicht gestartet werden.");
    }
  }, [
    isReadingSummary, reportData, appFields, accessibility.speechRate,
    triggerHaptic, triggerToast, announceToAriaAndSpeech,
  ]);

  return {
    ariaAnnouncement,
    announceToAriaAndSpeech,
    isDictating,
    toggleDictation,
    isReadingSummary,
    handleReadSummaryAloud,
  };
}
