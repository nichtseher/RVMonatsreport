import React, { useState, useEffect } from "react";
import {
  Clock,
  Play,
  LogOut,
  Trash2,
  Check,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import { TimeLog } from "../types";
import { berechneNettoStunden } from "../utils/timeUtils";
import { aufZwei, berechneSchichtzahlen } from "../utils/schichtStunden";
import { useSchichtFormular } from "../hooks/useSchichtFormular";
import ConfirmDialog, { ConfirmRequest } from "./ConfirmDialog";
import SchichtFelder from "./SchichtFelder";

interface ClockInWidgetProps {
  clockInTime: string | null;
  onClockIn: () => void;
  onClockOut: (log: TimeLog) => boolean | void;
  timeLogs: TimeLog[];
  onDeleteLog: (log: TimeLog) => void;
  announceToAriaAndSpeech: (message: string, immediate?: boolean) => void;
  onExportExcel?: () => void;
  selectedMonth?: string;
  onAddManualLog?: (newLog: TimeLog) => boolean | void;
  /** Steht direkt unter der Stempeluhr-Karte (0.9.71: die Wochenübersicht). */
  nachDerUhr?: React.ReactNode;
}

export default React.memo(function ClockInWidget({
  clockInTime,
  onClockIn,
  onClockOut,
  timeLogs,
  onDeleteLog,
  announceToAriaAndSpeech,
  onExportExcel,
  selectedMonth,
  nachDerUhr,
  onAddManualLog,
}: ClockInWidgetProps) {
  // Barrierefreier Bestätigungsdialog (Ersatz für window.confirm)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  // Timer state for active clock-in
  const [elapsed, setElapsed] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Die Felder beider Schicht-Formulare (0.9.78: ein Hook statt 18 useState)
  const aktiv = useSchichtFormular();
  const manuell = useSchichtFormular();

  // Manual entry states
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualClockIn, setManualClockIn] = useState("08:00");
  const [manualClockOut, setManualClockOut] = useState("16:30");

  // Month calculation for manual date boundaries
  const currentYearMonth = new Date().toLocaleDateString("sv-SE").substring(0, 7); // lokale Zeit statt UTC (Fix: falscher Monat nachts)
  const monthToUse = selectedMonth || currentYearMonth;
  const [year, month] = monthToUse.split("-");
  const minDate = `${monthToUse}-01`;
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const maxDate = `${monthToUse}-${String(daysInMonth).padStart(2, "0")}`;

  const getDefaultManualDate = (selMonth: string) => {
    const today = new Date();
    const todayStr = today.toLocaleDateString("sv-SE"); // lokale Zeit statt UTC ("2026-07-08")
    if (todayStr.startsWith(selMonth)) {
      return todayStr;
    }
    return `${selMonth}-01`;
  };

  const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  // Time formatting helpers
  const formatTimeHM = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateYMD = (date: Date) => {
    // Lokale Zeit statt UTC: Schichten zwischen 0 und 2 Uhr sonst am Vortag
    return date.toLocaleDateString("sv-SE");
  };

  // Timer loop when clocked in
  useEffect(() => {
    if (!clockInTime) return;

    const interval = setInterval(() => {
      const start = new Date(clockInTime).getTime();
      const now = Date.now();
      const diffMs = now - start;

      if (diffMs < 0) {
        setElapsed("00:00:00");
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formatted = [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0"),
      ].join(":");

      setElapsed(formatted);
    }, 1000);

    return () => clearInterval(interval);
  }, [clockInTime]);

  // Suggest breaks based on German Labor Law (Arbeitszeitgesetz ArbZG § 4)
  // - After 6 hours: 30 minutes break required
  // - After 9 hours: 45 minutes break required
  const autoSuggestBreak = (durationHours: number) => {
    if (durationHours > 9) return 45;
    if (durationHours > 6) return 30;
    return 0;
  };

  const handleStartClockIn = () => {
    onClockIn();
  };

  const handleOpenClockOutForm = () => {
    if (!clockInTime) return;
    const start = new Date(clockInTime).getTime();
    const end = Date.now();
    const diffHours = (end - start) / (1000 * 3600);

    // Set default suggested break
    const suggestedBreak = autoSuggestBreak(diffHours);
    aktiv.oeffnen(suggestedBreak);
    setIsFormOpen(true);

    announceToAriaAndSpeech(
      "Schicht beendet. Formular zum Einbuchen geöffnet.",
      true,
    );
  };

  // Nettozeit der laufenden Schicht: Grundlage für Vorschlag und Buchung.
  const aktivNetto = clockInTime
    ? aufZwei(
        Math.max(
          0,
          (Date.now() - new Date(clockInTime).getTime()) / (1000 * 3600) - aktiv.pause / 60,
        ),
      )
    : 0;
  const aktivVorschlag = berechneSchichtzahlen(
    aktivNetto, aktiv.aufteilung, aktiv.eigenProzent, "", "",
  ).vorschlag;

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clockInTime) return;

    const startDate = new Date(clockInTime);
    const endDate = new Date();
    // Rundung und Aufteilung stehen in utils/schichtStunden.ts (einmal, geprüft).
    const z = berechneSchichtzahlen(
      aktivNetto, aktiv.aufteilung, aktiv.eigenProzent, aktiv.getipptBuero, aktiv.getipptAussendienst,
    );

    const newLog: TimeLog = {
      id: `log_${Date.now()}`,
      date: formatDateYMD(startDate),
      clockIn: formatTimeHM(startDate),
      clockOut: formatTimeHM(endDate),
      breakMinutes: aktiv.pause,
      duration: z.gesamt,
      officeRatio: z.bueroAnteil,
      officeHours: z.buero,
      fieldHours: z.aussendienst,
      notes: aktiv.notiz.trim() || undefined,
    };

    // `false`: nicht gebucht (falscher Monat) -- Formular und Eingaben bleiben.
    if (onClockOut(newLog) === false) return;
    setIsFormOpen(false);
    aktiv.tippenLeeren();
  };

  /* Hier stand bis 0.9.24 `handleGetLocation` -- ein Abruf von
     `navigator.geolocation`, dessen Koordinaten in die Schichtnotiz und damit
     ueber den Excel-Export zur Vertriebsleitung wanderten.

     Entfernt auf Anweisung des Projektinhabers. Was zu der Frage gefuehrt hat,
     steht im DEVLOG zum 2026-09-07: Die Funktion kam in keinem Dokument des
     Projekts vor -- nicht im README, nicht in CLAUDE.md, nicht in der ROADMAP,
     nicht im Konformitaetsbericht, nicht in der Hilfe --, `server.ts` verbietet
     sie per `Permissions-Policy: geolocation=()`, und Standortdaten von
     Beschaeftigten sind eine andere Kategorie als Arbeitszeiten. */

  // `manualDate` mitgeben: Ohne das Datum kann die Rechnung die Zeitumstellung
  // nicht kennen, und eine nachgetragene Nachtschicht in die Umstellungsnacht
  // wäre um eine Stunde falsch.
  const manuellNetto = berechneNettoStunden(
    manualClockIn, manualClockOut, manuell.pause, manualDate,
  );
  const manuellVorschlag = berechneSchichtzahlen(
    manuellNetto, manuell.aufteilung, manuell.eigenProzent, "", "",
  ).vorschlag;

  const handleSaveManualShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate || !manualClockIn || !manualClockOut) return;

    const z = berechneSchichtzahlen(
      manuellNetto, manuell.aufteilung, manuell.eigenProzent,
      manuell.getipptBuero, manuell.getipptAussendienst,
    );

    const newLog: TimeLog = {
      id: `log_${Date.now()}`,
      date: manualDate,
      clockIn: manualClockIn,
      clockOut: manualClockOut,
      breakMinutes: manuell.pause,
      duration: z.gesamt,
      officeRatio: z.bueroAnteil,
      officeHours: z.buero,
      fieldHours: z.aussendienst,
      notes: manuell.notiz.trim() || undefined,
    };

    const gebucht = onAddManualLog ? onAddManualLog(newLog) : onClockOut(newLog);
    if (gebucht === false) return;

    setIsManualOpen(false);
    manuell.tippenLeeren();
  };

  // „03:47:12" -> „3:47" für die Stempeluhr-Karte.
  const laufzeit = (() => {
    const [h = "0", m = "00"] = (elapsed || "00:00:00").split(":");
    return `${parseInt(h, 10)}:${m}`;
  })();
  const laufzeitGesprochen = (() => {
    const [h = "0", m = "00"] = (elapsed || "00:00:00").split(":");
    const std = parseInt(h, 10);
    const min = parseInt(m, 10);
    return `Laufende Zeit: ${std} ${std === 1 ? "Stunde" : "Stunden"} ${min} ${min === 1 ? "Minute" : "Minuten"}`;
  })();

  return (
    <div className="space-y-4">
      {/*
        STEMPELUHR-KARTE (0.9.71, Entwurf „Warmes Grün"): eine große Karte statt
        Überschrift, Abzeichen und Zeile. Oben der Zustand in Worten, darunter
        die laufende Zeit, unten die eine Handlung, die jetzt dran ist.

        Die laufende Zeit ist Text ohne aria-live: Wer mit dem Screenreader
        dorthin navigiert, hört den Stand; jede Minute ungefragt vorgelesen
        würde er die Arbeit am Formular unterbrechen. Sekunden stehen nicht
        mehr da -- sie tickten sichtbar und sagten nichts, was man braucht.
        Die Farben sind --primary / --primary-text, also in jedem der vier
        Schemata das geprüfte Paar der Haupttaste.
      */}
      <section
        aria-labelledby="stempeluhr-titel"
        className="min-w-0 p-[18px] sm:p-6 rounded-[var(--rv-radius-xl)] bg-[var(--primary)] text-[var(--primary-text)] shadow-[var(--rv-shadow-lg)] break-words hyphens-auto"
      >
        <h3 id="stempeluhr-titel" className="text-base font-bold flex items-center gap-2 min-w-0">
          {clockInTime ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary-text)] flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0 [overflow-wrap:anywhere]">
                Eingestempelt seit{" "}
                {new Date(clockInTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
              </span>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>Stempeluhr</span>
            </>
          )}
        </h3>

        {clockInTime ? (
          <>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
              <span className="text-5xl font-black tabular-nums leading-none" aria-hidden="true">{laufzeit}</span>
              <span className="text-xl font-bold" aria-hidden="true">Std.</span>
              {/* „3:48" läse ein Screenreader als Uhrzeit. */}
              <span className="sr-only">{laufzeitGesprochen}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Laufende Arbeitszeit · seit {new Date(clockInTime).toLocaleDateString("de-DE")}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-xl sm:text-2xl font-black [overflow-wrap:anywhere]">Nicht eingestempelt</p>
            <p className="mt-1 text-sm leading-relaxed">
              Starten Sie Ihre Schicht. Die App läuft im Hintergrund weiter
              (auch wenn Sie den Browser schließen).
            </p>
          </>
        )}

        {!clockInTime ? (
          <button
            type="button"
            onClick={handleStartClockIn}
            className="mt-5 w-full min-h-[56px] px-4 py-2 rounded-[var(--rv-radius-lg)] bg-[var(--card-bg)] text-[var(--text-color)] text-base font-black cursor-pointer transition-all focus-visible:ring-4 flex items-center justify-center gap-2 shadow-[var(--rv-shadow-md)] active:scale-95"
          >
            <Play className="w-5 h-5 fill-current flex-shrink-0" aria-hidden="true" />
            <span className="min-w-0">Jetzt Einstempeln (Kommen)</span>
          </button>
        ) : !isFormOpen ? (
          <button
            type="button"
            onClick={handleOpenClockOutForm}
            className="mt-5 w-full min-h-[56px] px-4 py-2 rounded-[var(--rv-radius-lg)] bg-[var(--card-bg)] text-[var(--text-color)] text-base font-black cursor-pointer transition-all focus-visible:ring-4 flex items-center justify-center gap-2 shadow-[var(--rv-shadow-md)] active:scale-95"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="min-w-0">Ausstempeln (Gehen)</span>
          </button>
        ) : null}
      </section>

      {clockInTime && isFormOpen && (
        // Clock-out Booking Form (Accessible inline design)
        <form
          onSubmit={handleSaveShift}
          className="p-4 rounded-[var(--rv-radius-md)] border border-[var(--card-border)] bg-[var(--bg-color)] space-y-4 animate-slide-up"
        >
          <h4 className="text-xs font-black text-[var(--accent)]">
            Arbeitszeit verbuchen
          </h4>

          <SchichtFelder
            f={aktiv}
            ids={{
              pause: "break-input",
              regler: "custom-ratio-slider",
              buero: "typed-office-hours",
              aussendienst: "typed-field-hours",
              notiz: "shift-notes",
            }}
            gruppenName="Arbeitszeit Aufteilung"
            vorschlag={aktivVorschlag}
            pauseHinweis
          />

          {/* Form buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="flex-1 min-w-0 min-h-[44px] py-2 px-3 border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] text-xs font-bold rounded-[var(--rv-radius-sm)] cursor-pointer hover:bg-[var(--bg-color)] [overflow-wrap:anywhere]"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 min-w-0 min-h-[44px] py-2 px-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-black rounded-[var(--rv-radius-sm)] cursor-pointer flex items-center justify-center gap-1 [&>span]:min-w-0 [&>span]:[overflow-wrap:anywhere]"
            >
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Schicht verbuchen</span>
            </button>
          </div>
        </form>
      )}

      {nachDerUhr}

      {/* Manual Entry Toggle Button */}
      {!isManualOpen && !isFormOpen && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setIsManualOpen(true);
              const fallbackDate = getDefaultManualDate(monthToUse);
              setManualDate(fallbackDate);
              setManualClockIn("08:00");
              setManualClockOut("16:30");
              manuell.oeffnen(30);
              announceToAriaAndSpeech(
                "Formular für manuelles Nachtragen geöffnet.",
              );
            }}
            className="w-full min-h-[48px] py-2.5 px-3 border border-dashed border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] text-sm font-bold rounded-[var(--rv-radius-lg)] cursor-pointer hover:bg-[var(--bg-color)] hover:border-[var(--border-focus)] transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4 text-[var(--accent)]" />
            <span>Vergessene Schicht manuell nachtragen</span>
          </button>
        </div>
      )}

      {/* Manual Entry Form */}
      {isManualOpen && (
        <form
          onSubmit={handleSaveManualShift}
          className="p-4 rounded-[var(--rv-radius-md)] border-2 border-dashed border-[var(--accent)] bg-[var(--bg-color)] space-y-4 animate-slide-up"
        >
          {/* min-w-0 an Ueberschrift und Text, flex-shrink-0 am Symbol und am
              Abzeichen: Ohne das gab die Ueberschrift als Flex-Kind ihre Breite
              nicht unter den Inhalt preis. Gemessen bei 360 px und "Extra
              gross": ohne diese Zeile fiel die Seite von 407 auf 360 px.
              Zehnter Fall dieser Klasse in diesem Projekt. */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-[var(--accent)] flex items-center gap-1.5 min-w-0">
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">Schicht manuell nachtragen</span>
            </h4>
            <span className="text-[0.75rem] bg-[var(--success-bg)] text-[var(--success-text)] px-2 py-0.5 rounded-full font-black flex-shrink-0">
              Manuell
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Datum */}
            <div className="space-y-1">
              <label
                htmlFor="manual-date"
                className="text-xs font-bold text-[var(--text-muted)] block"
              >
                Datum:
              </label>
              <input
                id="manual-date"
                type="date"
                min={minDate}
                max={maxDate}
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full min-w-0 min-h-[44px] p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-bold outline-none focus:border-[var(--border-focus)] cursor-pointer"
                required
              />
            </div>

            {/* Kommen */}
            <div className="space-y-1">
              <label
                htmlFor="manual-clock-in"
                className="text-xs font-bold text-[var(--text-muted)] block"
              >
                Kommen:
              </label>
              <input
                id="manual-clock-in"
                type="time"
                value={manualClockIn}
                onChange={(e) => setManualClockIn(e.target.value)}
                className="w-full min-w-0 min-h-[44px] p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-bold outline-none focus:border-[var(--border-focus)] cursor-pointer"
                required
              />
            </div>

            {/* Gehen */}
            <div className="space-y-1">
              <label
                htmlFor="manual-clock-out"
                className="text-xs font-bold text-[var(--text-muted)] block"
              >
                Gehen:
              </label>
              <input
                id="manual-clock-out"
                type="time"
                value={manualClockOut}
                onChange={(e) => setManualClockOut(e.target.value)}
                className="w-full min-w-0 min-h-[44px] p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-bold outline-none focus:border-[var(--border-focus)] cursor-pointer"
                required
              />
            </div>
          </div>

          <SchichtFelder
            f={manuell}
            ids={{
              pause: "manual-break-input",
              regler: "manual-custom-ratio-slider",
              buero: "typed-manual-office-hours",
              aussendienst: "typed-manual-field-hours",
              notiz: "manual-shift-notes",
            }}
            gruppenName="Manuelle Arbeitszeit Aufteilung"
            vorschlag={manuellVorschlag}
          />

          {/* Form buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsManualOpen(false)}
              className="flex-1 min-w-0 min-h-[44px] py-2 px-3 border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] text-xs font-bold rounded-[var(--rv-radius-sm)] cursor-pointer hover:bg-[var(--bg-color)] [overflow-wrap:anywhere]"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 min-w-0 min-h-[44px] py-2 px-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-black rounded-[var(--rv-radius-sm)] cursor-pointer flex items-center justify-center gap-1 [&>span]:min-w-0 [&>span]:[overflow-wrap:anywhere]"
            >
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Schicht manuell verbuchen</span>
            </button>
          </div>
        </form>
      )}

      {/*
        SCHICHT-PROTOKOLL -- bewusst ohne Einklappung.

        Bis 0.9.28 lag dieser ganze Abschnitt hinter einem Umschalter, und zwar
        standardmaessig ZUGEKLAPPT. Versteckt war damit nicht nur die Liste,
        sondern eine ganze Funktion: die Excel-Ausgabe des Schichtprotokolls.

        `CLAUDE.md` verbietet das ausdruecklich ("Nichts, was Inhalte hinter
        einer Einklappung versteckt") und sagt dazu, die Regel gewinne gegen
        etablierte Muster -- wer Laenge reduzieren will, kuerzt Inhalt oder
        trennt Ansichten, er versteckt nicht. Die ROADMAP fuehrte den
        Widerspruch seit 0.9.23 als "benannt, nicht geaendert".

        Gegen die Laenge steht der scrollbare Bereich unten, der per Tastatur
        erreichbar ist (tabIndex). Das ist kein Verstecken: Der Inhalt steht im
        Lesefluss und die Suche des Screenreaders findet ihn.
      */}
      {timeLogs.length > 0 && (
        <div className="p-4 sm:p-5 rounded-[var(--rv-radius-xl)] border border-[var(--card-border)] bg-[var(--bg-color)]">
          <h3 className="text-lg font-black text-[var(--text-color)] min-w-0 [overflow-wrap:anywhere]">
            Schicht-Protokoll{" "}
            <span className="text-base font-normal text-[var(--text-muted)]">
              ({timeLogs.length} {timeLogs.length === 1 ? "Eintrag" : "Einträge"})
            </span>
          </h3>

          {(
            <div className="space-y-3 mt-2.5">
              {onExportExcel && (
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="w-full min-h-[44px] py-2.5 px-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] rounded-[var(--rv-radius-md)] text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[var(--rv-shadow-sm)]"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Schichtprotokoll als Excel exportieren</span>
                </button>
              )}
              {/* tabIndex am scrollbaren Bereich: Ohne ihn kommt die Tastatur
                  nicht an die unteren Eintraege -- derselbe Defekt, der bis
                  0.9.22 in `ManageModal` steckte. overflow-x-hidden, weil
                  overflow-y die x-Achse mitzieht. */}
              <div
                id="shift-logs-list"
                tabIndex={0}
                className="divide-y divide-[var(--card-border)] max-h-80 overflow-y-auto overflow-x-hidden space-y-1.5 pr-1 focus-visible:ring-4 rounded-[var(--rv-radius-sm)]"
                role="region"
                aria-label="Monatliche Schichtliste"
              >
                {timeLogs.map((log) => {
                  const [, m, d] = log.date.split("-");
                  const formattedDate = `${d}.${m}.`;
                  return (
                    <div
                      key={log.id}
                      className="py-3 flex items-center gap-3 text-sm"
                    >
                      {/* Datumskachel wie im Entwurf: Tag groß, Monat klein.
                          Gesprochen wird das Datum im Zeilentext unten. */}
                      <span
                        className="w-12 h-12 flex-shrink-0 rounded-[var(--rv-radius-md)] bg-[var(--cat-4-soft)] text-[var(--cat-4-text)] flex flex-col items-center justify-center leading-none"
                        aria-hidden="true"
                      >
                        <span className="text-lg font-black">{d}</span>
                        <span className="text-[0.75rem] font-bold mt-0.5">{MONATE_KURZ[parseInt(m, 10) - 1] || m}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[var(--text-color)] tabular-nums">
                          <span className="font-bold text-base">
                            <span className="sr-only">{formattedDate}, </span>
                            {log.clockIn} – {log.clockOut}
                          </span>
                          <span className="text-base font-black">
                            {log.duration.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h
                          </span>
                        </p>
                        <p className="text-[var(--text-muted)] leading-snug">
                          Pause {log.breakMinutes} Min. · Büro {log.officeHours.toLocaleString("de-DE", { maximumFractionDigits: 2 })} h · Außen {log.fieldHours.toLocaleString("de-DE", { maximumFractionDigits: 2 })} h
                        </p>
                        {log.notes && (
                          <p className="text-[var(--text-muted)] italic mt-0.5 [overflow-wrap:anywhere]">
                            „{log.notes}"
                          </p>
                        )}
                      </div>


                      <button
                        type="button"
                        onClick={() => {
                          setConfirmRequest({
                            title: "Schicht löschen?",
                            message: `Die Schicht vom ${formattedDate} über ${log.duration.toFixed(2)} Stunden wird entfernt. Die Stunden werden automatisch von der Monatsübersicht abgezogen.`,
                            confirmLabel: "Schicht löschen",
                            tone: "danger",
                            onConfirm: () => onDeleteLog(log),
                          });
                        }}
                        aria-label={`Schicht vom ${formattedDate} löschen`}
                        /* Gemessen 2026-09-07: 32 x 32 px. Zwei solche Tasten
                           stehen in benachbarten Zeilen untereinander -- wer
                           danebentippt, loescht die falsche Schicht. */
                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-[var(--rv-radius-sm)] cursor-pointer active:scale-90 transition-all flex-shrink-0 focus-visible:ring-4"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        request={confirmRequest}
        onClose={() => setConfirmRequest(null)}
        announce={announceToAriaAndSpeech}
      />
    </div>
  );
});
