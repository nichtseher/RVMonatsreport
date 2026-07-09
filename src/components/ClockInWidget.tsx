import React, { useState, useEffect } from "react";
import {
  Clock,
  Play,
  Square,
  Trash2,
  Shield,
  Calendar,
  Info,
  Check,
  HelpCircle,
  FileSpreadsheet,
  Plus,
  MapPin,
} from "lucide-react";
import { TimeLog } from "../types";

interface ClockInWidgetProps {
  clockInTime: string | null;
  onClockIn: () => void;
  onClockOut: (log: TimeLog) => void;
  timeLogs: TimeLog[];
  onDeleteLog: (log: TimeLog) => void;
  announceToAriaAndSpeech: (message: string, immediate?: boolean) => void;
  onExportExcel?: () => void;
  selectedMonth?: string;
  onAddManualLog?: (newLog: TimeLog) => void;
}

export default function ClockInWidget({
  clockInTime,
  onClockIn,
  onClockOut,
  timeLogs,
  onDeleteLog,
  announceToAriaAndSpeech,
  onExportExcel,
  selectedMonth,
  onAddManualLog,
}: ClockInWidgetProps) {
  // Timer state for active clock-in
  const [elapsed, setElapsed] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(true);

  // Form states for clocking out
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [officeRatio, setOfficeRatio] = useState<number>(0.5); // 0 = 100% Außendienst, 1 = 100% Büro, 0.5 = 50/50
  const [preset, setPreset] = useState<"office" | "field" | "half" | "custom">(
    "half",
  );
  const [customRatio, setCustomRatio] = useState(50); // percentage for custom option

  // Manual entry states
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualClockIn, setManualClockIn] = useState("08:00");
  const [manualClockOut, setManualClockOut] = useState("16:30");
  const [manualBreakMinutes, setManualBreakMinutes] = useState(30);
  const [manualNotes, setManualNotes] = useState("");
  const [manualOfficeRatio, setManualOfficeRatio] = useState<number>(0.5);
  const [manualPreset, setManualPreset] = useState<
    "office" | "field" | "half" | "custom"
  >("half");
  const [manualCustomRatio, setManualCustomRatio] = useState(50);

  // States for typed custom hours
  const [typedOfficeHours, setTypedOfficeHours] = useState<string>("");
  const [typedFieldHours, setTypedFieldHours] = useState<string>("");
  const [typedManualOfficeHours, setTypedManualOfficeHours] =
    useState<string>("");
  const [typedManualFieldHours, setTypedManualFieldHours] =
    useState<string>("");

  // Month calculation for manual date boundaries
  const currentYearMonth = new Date().toISOString().substring(0, 7); // e.g., "2026-07"
  const monthToUse = selectedMonth || currentYearMonth;
  const [year, month] = monthToUse.split("-");
  const minDate = `${monthToUse}-01`;
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const maxDate = `${monthToUse}-${String(daysInMonth).padStart(2, "0")}`;

  const getDefaultManualDate = (selMonth: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // "2026-07-08"
    if (todayStr.startsWith(selMonth)) {
      return todayStr;
    }
    return `${selMonth}-01`;
  };

  // Time formatting helpers
  const formatTimeHM = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateYMD = (date: Date) => {
    return date.toISOString().split("T")[0];
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
    setBreakMinutes(suggestedBreak);
    setNotes("");
    setPreset("half");
    setOfficeRatio(0.5);
    setIsFormOpen(true);

    announceToAriaAndSpeech(
      "Schicht beendet. Formular zum Einbuchen geöffnet.",
      true,
    );
  };

  const getCalculatedActiveShiftValues = () => {
    if (!clockInTime) return { netHours: 0, officeHrs: 0, fieldHrs: 0 };
    const startDate = new Date(clockInTime);
    const endDate = new Date();
    const rawDiffMs = endDate.getTime() - startDate.getTime();
    const rawHours = rawDiffMs / (1000 * 3600);
    const breakHours = breakMinutes / 60;
    const netHours = Math.max(0, rawHours - breakHours);
    const roundedNet = Math.round(netHours * 100) / 100;

    let ratio = officeRatio;
    if (preset === "office") ratio = 1.0;
    if (preset === "field") ratio = 0.0;
    if (preset === "half") ratio = 0.5;
    if (preset === "custom") ratio = customRatio / 100;

    const officeHrs = Math.round(roundedNet * ratio * 100) / 100;
    const fieldHrs = Math.round(roundedNet * (1 - ratio) * 100) / 100;

    return { netHours: roundedNet, officeHrs, fieldHrs };
  };

  const activeVals = getCalculatedActiveShiftValues();
  const calculatedOfficeHrs = activeVals.officeHrs;
  const calculatedFieldHrs = activeVals.fieldHrs;

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clockInTime) return;

    const startDate = new Date(clockInTime);
    const endDate = new Date();

    const finalOfficeHrs =
      typedOfficeHours !== ""
        ? parseFloat(typedOfficeHours) || 0
        : calculatedOfficeHrs;
    const finalFieldHrs =
      typedFieldHours !== ""
        ? parseFloat(typedFieldHours) || 0
        : calculatedFieldHrs;
    const finalDuration =
      Math.round((finalOfficeHrs + finalFieldHrs) * 100) / 100;

    const newLog: TimeLog = {
      id: `log_${Date.now()}`,
      date: formatDateYMD(startDate),
      clockIn: formatTimeHM(startDate),
      clockOut: formatTimeHM(endDate),
      breakMinutes: breakMinutes,
      duration: finalDuration,
      officeRatio:
        finalDuration > 0
          ? Math.round((finalOfficeHrs / finalDuration) * 100) / 100
          : 0.5,
      officeHours: finalOfficeHrs,
      fieldHours: finalFieldHrs,
      notes: notes.trim() || undefined,
    };

    onClockOut(newLog);
    setIsFormOpen(false);
    setTypedOfficeHours("");
    setTypedFieldHours("");
  };

  const handleGetLocation = (isManual: boolean) => {
    if (!navigator.geolocation) {
      alert("GPS wird von diesem Browser nicht unterstützt.");
      return;
    }
    
    announceToAriaAndSpeech("Standort wird ermittelt...");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Construct a Google Maps link or just simple coordinates as placeholder
        // Since we don't have a reverse geocoding API, we'll just write the coords
        const locationStr = `📍 GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        if (isManual) {
          setManualNotes((prev) => prev ? `${prev} | ${locationStr}` : locationStr);
        } else {
          setNotes((prev) => prev ? `${prev} | ${locationStr}` : locationStr);
        }
        announceToAriaAndSpeech("Standort erfolgreich hinzugefügt.");
      },
      (error) => {
        console.error("Error getting location", error);
        alert("Standort konnte nicht ermittelt werden. Bitte Berechtigungen prüfen.");
        announceToAriaAndSpeech("Fehler bei der Standortermittlung.");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const calculateManualDuration = (
    cin: string,
    cout: string,
    breaks: number,
  ) => {
    const [inH, inM] = cin.split(":").map(Number);
    const [outH, outM] = cout.split(":").map(Number);

    let inMinutes = inH * 60 + inM;
    let outMinutes = outH * 60 + outM;

    if (outMinutes < inMinutes) {
      outMinutes += 24 * 60;
    }

    const rawDiffMinutes = outMinutes - inMinutes;
    const netMinutes = Math.max(0, rawDiffMinutes - breaks);
    return Math.round((netMinutes / 60) * 100) / 100;
  };

  const getCalculatedManualShiftValues = () => {
    const netHours = calculateManualDuration(
      manualClockIn,
      manualClockOut,
      manualBreakMinutes,
    );

    let ratio = manualOfficeRatio;
    if (manualPreset === "office") ratio = 1.0;
    if (manualPreset === "field") ratio = 0.0;
    if (manualPreset === "half") ratio = 0.5;
    if (manualPreset === "custom") ratio = manualCustomRatio / 100;

    const officeHrs = Math.round(netHours * ratio * 100) / 100;
    const fieldHrs = Math.round(netHours * (1 - ratio) * 100) / 100;

    return { netHours, officeHrs, fieldHrs };
  };

  const manualVals = getCalculatedManualShiftValues();
  const calculatedManualOfficeHrs = manualVals.officeHrs;
  const calculatedManualFieldHrs = manualVals.fieldHrs;

  const handleSaveManualShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate || !manualClockIn || !manualClockOut) return;

    const finalOfficeHrs =
      typedManualOfficeHours !== ""
        ? parseFloat(typedManualOfficeHours) || 0
        : calculatedManualOfficeHrs;
    const finalFieldHrs =
      typedManualFieldHours !== ""
        ? parseFloat(typedManualFieldHours) || 0
        : calculatedManualFieldHrs;
    const finalDuration =
      Math.round((finalOfficeHrs + finalFieldHrs) * 100) / 100;

    const newLog: TimeLog = {
      id: `log_${Date.now()}`,
      date: manualDate,
      clockIn: manualClockIn,
      clockOut: manualClockOut,
      breakMinutes: manualBreakMinutes,
      duration: finalDuration,
      officeRatio:
        finalDuration > 0
          ? Math.round((finalOfficeHrs / finalDuration) * 100) / 100
          : 0.5,
      officeHours: finalOfficeHrs,
      fieldHours: finalFieldHrs,
      notes: manualNotes.trim() || undefined,
    };

    if (onAddManualLog) {
      onAddManualLog(newLog);
    } else {
      onClockOut(newLog);
    }

    setIsManualOpen(false);
    setTypedManualOfficeHours("");
    setTypedManualFieldHours("");
  };

  return (
    <div className="p-4 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)] shadow-xs space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-color)] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--accent)]" />
          <span>⏱️ Echtzeit-Stempeluhr</span>
        </h3>
        {clockInTime && (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/10 text-[9px] font-black tracking-wide uppercase animate-pulse">
            ● Aufnahme läuft
          </span>
        )}
      </div>

      {/* Clocking controls */}
      {!clockInTime ? (
        // Clock-in View
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-1.5">
          <div className="space-y-1 text-center sm:text-left">
            <span className="block text-xs font-bold text-[var(--text-color)]">
              Aktuell nicht eingestempelt
            </span>
            <span className="block text-[10px] text-[var(--text-muted)] leading-relaxed">
              Starten Sie Ihre Schicht. Die App läuft im Hintergrund weiter
              (auch wenn Sie den Browser schließen).
            </span>
          </div>
          <button
            type="button"
            onClick={handleStartClockIn}
            className="w-full sm:w-auto py-3 px-6 font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer text-sm transition-all focus-visible:ring-4 flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Jetzt Einstempeln (Kommen)</span>
          </button>
        </div>
      ) : (
        // Clock-out View
        <div className="space-y-3.5">
          {!isFormOpen ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 rounded-xl bg-slate-500/5 border border-[var(--border-color)]">
              <div className="text-center md:text-left space-y-1">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                  Laufende Arbeitszeit
                </span>
                <div className="text-3xl font-black font-mono tracking-tight text-[var(--text-color)]">
                  {elapsed || "00:00:00"}
                </div>
                <span className="block text-[10px] text-[var(--text-muted)] font-semibold">
                  Eingestempelt seit{" "}
                  {new Date(clockInTime).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  Uhr am {new Date(clockInTime).toLocaleDateString("de-DE")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenClockOutForm}
                className="w-full md:w-auto py-3.5 px-6 font-black bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer text-sm transition-all focus-visible:ring-4 flex items-center justify-center gap-2 shadow-md shadow-red-600/10 active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Ausstempeln (Gehen)</span>
              </button>
            </div>
          ) : (
            // Clock-out Booking Form (Accessible inline design)
            <form
              onSubmit={handleSaveShift}
              className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] space-y-4 animate-slide-up"
            >
              <h4 className="text-xs font-black uppercase text-[var(--accent)] tracking-wider">
                ✍️ Arbeitszeit verbuchen
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Break input */}
                <div className="space-y-1">
                  <label
                    htmlFor="break-input"
                    className="text-xs font-bold text-[var(--text-muted)] block"
                  >
                    Pause abziehen (Minuten):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setBreakMinutes((prev) => Math.max(0, prev - 15))
                      }
                      className="px-2.5 py-1.5 rounded bg-[var(--card-bg)] border border-[var(--border-color)] text-xs font-bold cursor-pointer hover:bg-[var(--border-color)] active:scale-90"
                      aria-label="Pause um 15 Minuten verringern"
                    >
                      -15
                    </button>
                    <input
                      id="break-input"
                      type="number"
                      min="0"
                      max="240"
                      step="5"
                      value={breakMinutes}
                      onChange={(e) =>
                        setBreakMinutes(
                          Math.max(0, parseInt(e.target.value) || 0),
                        )
                      }
                      className="flex-1 p-1.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded text-center outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setBreakMinutes((prev) => Math.min(240, prev + 15))
                      }
                      className="px-2.5 py-1.5 rounded bg-[var(--card-bg)] border border-[var(--border-color)] text-xs font-bold cursor-pointer hover:bg-[var(--border-color)] active:scale-90"
                      aria-label="Pause um 15 Minuten erhöhen"
                    >
                      +15
                    </button>
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)] block font-medium">
                    (Vorgeschrieben: 30 Min ab 6h, 45 Min ab 9h)
                  </span>
                </div>

                {/* Split ratio selector (ACCESSIBLE Presets) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-muted)] block">
                    Aufteilung der Stunden:
                  </label>
                  <div
                    className="grid grid-cols-2 gap-1"
                    role="radiogroup"
                    aria-label="Arbeitszeit Aufteilung"
                  >
                    {[
                      { id: "half", label: "⚖️ 50% / 50% " },
                      { id: "office", label: "💻 100% Büro" },
                      { id: "field", label: "🚗 100% Außen" },
                      { id: "custom", label: "✏️ Eigene %" },
                    ].map((p) => {
                      const isActive = preset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => {
                            setPreset(p.id as any);
                            if (p.id === "office") setOfficeRatio(1.0);
                            if (p.id === "field") setOfficeRatio(0.0);
                            if (p.id === "half") setOfficeRatio(0.5);
                          }}
                          className={`p-1.5 rounded border text-[10px] font-extrabold cursor-pointer transition-all ${
                            isActive
                              ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                              : "bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Custom ratio slider if selected */}
              {preset === "custom" && (
                <div className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] space-y-2 animate-slide-up">
                  <label
                    htmlFor="custom-ratio-slider"
                    className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider flex justify-between"
                  >
                    <span>
                      Aufteilung: {customRatio}% Büro / {100 - customRatio}%
                      Außendienst
                    </span>
                  </label>
                  <input
                    id="custom-ratio-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={customRatio}
                    aria-valuetext={`${customRatio} Prozent Büro, ${100 - customRatio} Prozent Außendienst`}
                    onChange={(e) => setCustomRatio(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                </div>
              )}

              {/* Direct manual hours entry */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-[var(--text-color)] tracking-wide flex items-center gap-1">
                    💻 Büro vs. 🚗 Außendienst h
                  </span>
                  {(typedOfficeHours !== "" || typedFieldHours !== "") && (
                    <button
                      type="button"
                      onClick={() => {
                        setTypedOfficeHours("");
                        setTypedFieldHours("");
                      }}
                      className="text-[10px] text-red-500 hover:underline font-extrabold cursor-pointer"
                    >
                      Zurücksetzen auf Automatik
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed">
                  Tragen Sie die Stunden bei Bedarf direkt manuell ein (mit 2
                  Nachkommastellen):
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="typed-office-hours"
                      className="text-[11px] font-bold text-[var(--text-muted)] block"
                    >
                      Stunden Büro (h):
                    </label>
                    <input
                      id="typed-office-hours"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={calculatedOfficeHrs.toFixed(2)}
                      value={typedOfficeHours}
                      onChange={(e) => setTypedOfficeHours(e.target.value)}
                      className="w-full p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-semibold outline-none focus:border-[var(--border-focus)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="typed-field-hours"
                      className="text-[11px] font-bold text-[var(--text-muted)] block"
                    >
                      Stunden Außendienst (h):
                    </label>
                    <input
                      id="typed-field-hours"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={calculatedFieldHrs.toFixed(2)}
                      value={typedFieldHours}
                      onChange={(e) => setTypedFieldHours(e.target.value)}
                      className="w-full p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-semibold outline-none focus:border-[var(--border-focus)]"
                    />
                  </div>
                </div>
                <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex justify-between bg-slate-500/5 p-2 rounded-lg">
                  <span>Gesamtstunden dieser Schicht:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {(typedOfficeHours !== "" || typedFieldHours !== ""
                      ? (parseFloat(typedOfficeHours) || 0) +
                        (parseFloat(typedFieldHours) || 0)
                      : calculatedOfficeHrs + calculatedFieldHrs
                    ).toFixed(2)}
                    h
                  </span>
                </div>
              </div>

              {/* Quick shift commentary/notes */}
              <div className="space-y-1">
                <label
                  htmlFor="shift-notes"
                  className="text-xs font-bold text-[var(--text-muted)] block"
                >
                  Kurzkommentar / besuchte Schule / Ort (optional):
                </label>
                <div className="flex gap-2">
                  <input
                    id="shift-notes"
                    type="text"
                    placeholder="z.B. Schulung an blindenschule Hannover, wewalk vorführung..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="flex-1 p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-semibold outline-none focus:border-[var(--border-focus)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleGetLocation(false)}
                    aria-label="Aktuellen GPS-Standort abrufen und einfügen"
                    className="px-3 border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] rounded hover:border-[var(--border-focus)] active:scale-95 transition-all flex items-center justify-center"
                  >
                    <MapPin className="w-4 h-4 text-blue-500" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Form buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2 px-3 border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--bg-color)]"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Schicht verbuchen</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Manual Entry Toggle Button */}
      {!isManualOpen && !isFormOpen && (
        <div className="pt-2 border-t border-[var(--border-color)] flex justify-center">
          <button
            type="button"
            onClick={() => {
              setIsManualOpen(true);
              const fallbackDate = getDefaultManualDate(monthToUse);
              setManualDate(fallbackDate);
              setManualClockIn("08:00");
              setManualClockOut("16:30");
              setManualBreakMinutes(30);
              setManualNotes("");
              setManualPreset("half");
              setManualOfficeRatio(0.5);
              announceToAriaAndSpeech(
                "Formular für manuelles Nachtragen geöffnet.",
              );
            }}
            className="w-full py-2.5 px-3 border border-dashed border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--bg-color)] hover:border-[var(--border-focus)] transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4 text-[var(--accent)]" />
            <span>✍️ Vergessene Schicht manuell nachtragen</span>
          </button>
        </div>
      )}

      {/* Manual Entry Form */}
      {isManualOpen && (
        <form
          onSubmit={handleSaveManualShift}
          className="p-4 rounded-xl border-2 border-dashed border-[var(--accent)] bg-[var(--bg-color)] space-y-4 animate-slide-up"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-[var(--accent)] tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>✍️ Schicht manuell nachtragen</span>
            </h4>
            <span className="text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full font-black uppercase">
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
                className="w-full p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-semibold outline-none focus:border-[var(--border-focus)] cursor-pointer"
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
                className="w-full p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-semibold outline-none focus:border-[var(--border-focus)] cursor-pointer"
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
                className="w-full p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-semibold outline-none focus:border-[var(--border-focus)] cursor-pointer"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Break */}
            <div className="space-y-1">
              <label
                htmlFor="manual-break-input"
                className="text-xs font-bold text-[var(--text-muted)] block"
              >
                Pause abziehen (Minuten):
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setManualBreakMinutes((prev) => Math.max(0, prev - 15))
                  }
                  className="px-2.5 py-1.5 rounded bg-[var(--card-bg)] border border-[var(--border-color)] text-xs font-bold cursor-pointer hover:bg-[var(--border-color)] active:scale-90"
                  aria-label="Pause um 15 Minuten verringern"
                >
                  -15
                </button>
                <input
                  id="manual-break-input"
                  type="number"
                  min="0"
                  max="240"
                  step="5"
                  value={manualBreakMinutes}
                  onChange={(e) =>
                    setManualBreakMinutes(
                      Math.max(0, parseInt(e.target.value) || 0),
                    )
                  }
                  className="flex-1 p-1.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded text-center outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setManualBreakMinutes((prev) => Math.min(240, prev + 15))
                  }
                  className="px-2.5 py-1.5 rounded bg-[var(--card-bg)] border border-[var(--border-color)] text-xs font-bold cursor-pointer hover:bg-[var(--border-color)] active:scale-90"
                  aria-label="Pause um 15 Minuten erhöhen"
                >
                  +15
                </button>
              </div>
            </div>

            {/* Split */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-muted)] block">
                Aufteilung der Stunden:
              </label>
              <div
                className="grid grid-cols-2 gap-1"
                role="radiogroup"
                aria-label="Manuelle Arbeitszeit Aufteilung"
              >
                {[
                  { id: "half", label: "⚖️ 50% / 50% " },
                  { id: "office", label: "💻 100% Büro" },
                  { id: "field", label: "🚗 100% Außen" },
                  { id: "custom", label: "✏️ Eigene %" },
                ].map((p) => {
                  const isActive = manualPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => {
                        setManualPreset(p.id as any);
                        if (p.id === "office") setManualOfficeRatio(1.0);
                        if (p.id === "field") setManualOfficeRatio(0.0);
                        if (p.id === "half") setManualOfficeRatio(0.5);
                      }}
                      className={`p-1.5 rounded border text-[10px] font-extrabold cursor-pointer transition-all ${
                        isActive
                          ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                          : "bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Custom slider */}
          {manualPreset === "custom" && (
            <div className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] space-y-2 animate-slide-up">
              <label
                htmlFor="manual-custom-ratio-slider"
                className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider flex justify-between"
              >
                <span>
                  Aufteilung: {manualCustomRatio}% Büro /{" "}
                  {100 - manualCustomRatio}% Außendienst
                </span>
              </label>
              <input
                id="manual-custom-ratio-slider"
                type="range"
                min="0"
                max="100"
                step="5"
                value={manualCustomRatio}
                aria-valuetext={`${manualCustomRatio} Prozent Büro, ${100 - manualCustomRatio} Prozent Außendienst`}
                onChange={(e) => setManualCustomRatio(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded appearance-none cursor-pointer accent-[var(--accent)]"
              />
            </div>
          )}

          {/* Direct manual hours entry */}
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-[var(--text-color)] tracking-wide flex items-center gap-1">
                💻 Büro vs. 🚗 Außendienst h
              </span>
              {(typedManualOfficeHours !== "" ||
                typedManualFieldHours !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setTypedManualOfficeHours("");
                    setTypedManualFieldHours("");
                  }}
                  className="text-[10px] text-red-500 hover:underline font-extrabold cursor-pointer"
                >
                  Zurücksetzen auf Automatik
                </button>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed">
              Tragen Sie die Stunden bei Bedarf direkt manuell ein (mit 2
              Nachkommastellen):
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="typed-manual-office-hours"
                  className="text-[11px] font-bold text-[var(--text-muted)] block"
                >
                  Stunden Büro (h):
                </label>
                <input
                  id="typed-manual-office-hours"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={calculatedManualOfficeHrs.toFixed(2)}
                  value={typedManualOfficeHours}
                  onChange={(e) => setTypedManualOfficeHours(e.target.value)}
                  className="w-full p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-semibold outline-none focus:border-[var(--border-focus)]"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="typed-manual-field-hours"
                  className="text-[11px] font-bold text-[var(--text-muted)] block"
                >
                  Stunden Außendienst (h):
                </label>
                <input
                  id="typed-manual-field-hours"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={calculatedManualFieldHrs.toFixed(2)}
                  value={typedManualFieldHours}
                  onChange={(e) => setTypedManualFieldHours(e.target.value)}
                  className="w-full p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-semibold outline-none focus:border-[var(--border-focus)]"
                />
              </div>
            </div>
            <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex justify-between bg-slate-500/5 p-2 rounded-lg">
              <span>Gesamtstunden dieser Schicht:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {(typedManualOfficeHours !== "" || typedManualFieldHours !== ""
                  ? (parseFloat(typedManualOfficeHours) || 0) +
                    (parseFloat(typedManualFieldHours) || 0)
                  : calculatedManualOfficeHrs + calculatedManualFieldHrs
                ).toFixed(2)}
                h
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label
              htmlFor="manual-shift-notes"
              className="text-xs font-bold text-[var(--text-muted)] block"
            >
              Kurzkommentar / besuchte Schule / Ort (optional):
            </label>
            <div className="flex gap-2">
              <input
                id="manual-shift-notes"
                type="text"
                placeholder="z.B. Schulung an blindenschule Hannover, wewalk vorführung..."
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="flex-1 p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-semibold outline-none focus:border-[var(--border-focus)]"
              />
              <button
                type="button"
                onClick={() => handleGetLocation(true)}
                aria-label="Aktuellen GPS-Standort abrufen und einfügen"
                className="px-3 border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] rounded hover:border-[var(--border-focus)] active:scale-95 transition-all flex items-center justify-center"
              >
                <MapPin className="w-4 h-4 text-blue-500" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Form buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsManualOpen(false)}
              className="flex-1 py-2 px-3 border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--bg-color)]"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg cursor-pointer flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Schicht manuell verbuchen</span>
            </button>
          </div>
        </form>
      )}

      {/* SHIFT LOGS COLLAPSIBLE (WCAG-compliant custom component) */}
      {timeLogs.length > 0 && (
        <div className="pt-2 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => {
              setIsLogsCollapsed(!isLogsCollapsed);
              announceToAriaAndSpeech(
                isLogsCollapsed
                  ? "Schichtprotokoll ausgeklappt"
                  : "Schichtprotokoll eingeklappt",
              );
            }}
            className="w-full py-1.5 flex items-center justify-between text-xs font-black text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-color)] cursor-pointer"
            aria-expanded={!isLogsCollapsed}
            aria-controls="shift-logs-list"
          >
            <span>📅 Schicht-Protokoll ({timeLogs.length} Einträge)</span>
            <span>{isLogsCollapsed ? "Anzeigen ➕" : "Ausblenden ➖"}</span>
          </button>

          {!isLogsCollapsed && (
            <div className="space-y-3 mt-2.5">
              {onExportExcel && (
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm shadow-emerald-600/10"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Schichtprotokoll als Excel exportieren</span>
                </button>
              )}
              <div
                id="shift-logs-list"
                className="divide-y divide-[var(--border-color)] max-h-56 overflow-y-auto space-y-1.5 pr-1"
                role="region"
                aria-label="Monatliche Schichtliste"
              >
                {timeLogs.map((log) => {
                  const [y, m, d] = log.date.split("-");
                  const formattedDate = `${d}.${m}.`;
                  return (
                    <div
                      key={log.id}
                      className="py-2 flex items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-[var(--text-color)] bg-[var(--bg-color)] border border-[var(--border-color)] px-1.5 py-0.2 rounded font-mono">
                            {formattedDate}
                          </span>
                          <span className="font-bold text-[var(--text-color)]">
                            {log.duration.toFixed(2)}h
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-medium">
                            ({log.clockIn} - {log.clockOut}, Pause{" "}
                            {log.breakMinutes}m)
                          </span>
                        </div>

                        <div className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5 flex flex-wrap gap-x-2">
                          <span>💻 Büro: {log.officeHours.toFixed(2)}h</span>
                          <span>🚗 Außen: {log.fieldHours.toFixed(2)}h</span>
                        </div>

                        {log.notes && (
                          <p
                            className="text-[10px] text-[var(--text-muted)] italic font-medium mt-0.5 truncate"
                            title={log.notes}
                          >
                            "{log.notes}"
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Schicht vom ${formattedDate} (${log.duration.toFixed(2)}h) wirklich löschen? Die Stunden werden automatisch von der Monatsübersicht abgezogen.`,
                            )
                          ) {
                            onDeleteLog(log);
                          }
                        }}
                        aria-label={`Schicht vom ${formattedDate} löschen`}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer active:scale-90 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
