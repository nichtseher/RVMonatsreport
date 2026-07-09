import React, { useEffect, useRef, useState } from "react";
import { 
  X, 
  Clock, 
  Calendar, 
  Briefcase, 
  Umbrella, 
  HeartPulse, 
  Table 
} from "lucide-react";
import ClockInWidget from "./ClockInWidget";
import { TimeLog, YearlyCarryover, ReportData, HistoryRecord } from "../types";

interface TimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clockInTime: string | null;
  onClockIn: () => void;
  onClockOut: (log: TimeLog) => void;
  timeLogs: TimeLog[];
  onDeleteLog: (log: TimeLog) => void;
  announceToAriaAndSpeech: (message: string, immediate?: boolean) => void;
  carryover: YearlyCarryover;
  onOpenCarryover: () => void;
  onExportExcel?: () => void;
  selectedMonth?: string;
  onAddManualLog?: (newLog: TimeLog) => void;
  history: Record<string, HistoryRecord>;
  reportData: ReportData;
}

export default function TimeModal({
  isOpen,
  onClose,
  clockInTime,
  onClockIn,
  onClockOut,
  timeLogs,
  onDeleteLog,
  announceToAriaAndSpeech,
  carryover,
  onOpenCarryover,
  onExportExcel,
  selectedMonth,
  onAddManualLog,
  history,
  reportData
}: TimeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activeTab, setActiveTab] = useState<"stempeln" | "konto">("stempeln");

  // Focus trap and ESC handler
  useEffect(() => {
    if (!isOpen) return;

    const previouslyActive = document.activeElement as HTMLElement;

    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex="0"]'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyActive) {
        previouslyActive.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // --- COMPUTE YEARLY VACATION & OVERTIME LEDGERS ---
  const getWeekdaysInMonth = (year: number, month: number): number => {
    let count = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        count++;
      }
    }
    return count;
  };

  const calculateYearlyOvertime = () => {
    const [activeYearStr] = selectedMonth ? selectedMonth.split("-") : ["2026"];
    const activeYear = parseInt(activeYearStr, 10);
    
    // Gather all month records in history for this year, plus our current active month
    const yearRecords: Record<string, any> = {};
    
    Object.entries(history || {}).forEach(([mStr, record]) => {
      if (mStr.startsWith(`${activeYear}-`)) {
        yearRecords[mStr] = record;
      }
    });
    
    // Ensure current active month is included with its current unsaved reportData values
    if (selectedMonth && reportData) {
      yearRecords[selectedMonth] = reportData;
    }
    
    let totalOvertimeAccumulated = 0;
    const monthsCalculated: Array<{ month: string; ist: number; soll: number; diff: number }> = [];
    
    Object.keys(yearRecords).sort().forEach((mStr) => {
      const record = yearRecords[mStr];
      const [y, m] = mStr.split("-").map(Number);
      
      const weekdays = getWeekdaysInMonth(y, m);
      const uDays = Number(record.values?.tage_urlaub) || 0;
      const kDays = Number(record.values?.tage_krank) || 0;
      const fDays = Number(record.values?.tage_feiertag) || 0;
      
      const targetDays = Math.max(0, weekdays - uDays - kDays - fDays);
      const sollHours = targetDays * carryover.dailyTargetHours;
      
      // Ist-Stunden = std_buero + std_aussendienst
      const stdBuero = Number(record.values?.std_buero) || 0;
      const stdAussen = Number(record.values?.std_aussendienst) || 0;
      const istHours = stdBuero + stdAussen;
      
      const diff = istHours - sollHours;
      totalOvertimeAccumulated += diff;
      
      monthsCalculated.push({
        month: mStr,
        ist: istHours,
        soll: sollHours,
        diff: diff
      });
    });
    
    const totalBalance = carryover.overtimeCarryover + totalOvertimeAccumulated;
    return {
      totalBalance,
      totalOvertimeAccumulated,
      monthsCalculated
    };
  };

  const calculateYearlyVacation = () => {
    const [activeYearStr] = selectedMonth ? selectedMonth.split("-") : ["2026"];
    const activeYear = parseInt(activeYearStr, 10);
    
    // Gather all month records in history for this year, plus our current active month
    const yearRecords: Record<string, any> = {};
    
    Object.entries(history || {}).forEach(([mStr, record]) => {
      if (mStr.startsWith(`${activeYear}-`)) {
        yearRecords[mStr] = record;
      }
    });
    if (selectedMonth && reportData) {
      yearRecords[selectedMonth] = reportData;
    }
    
    let totalUrlaubTaken = 0;
    let totalKrankDays = 0;
    let totalFeiertage = 0;
    
    Object.values(yearRecords).forEach((record) => {
      totalUrlaubTaken += Number(record.values?.tage_urlaub) || 0;
      totalKrankDays += Number(record.values?.tage_krank) || 0;
      totalFeiertage += Number(record.values?.tage_feiertag) || 0;
    });
    
    const totalEntitlement = carryover.regularVacationEntitlement + carryover.additionalVacationEntitlement + carryover.vacationCarryover;
    const remainingVacation = totalEntitlement - totalUrlaubTaken;
    
    return {
      totalEntitlement,
      totalUrlaubTaken,
      remainingVacation,
      totalKrankDays,
      totalFeiertage
    };
  };

  const formatMonthGerman = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const months = [
      "Januar", "Februar", "März", "April", "Mai", "Juni",
      "Juli", "August", "September", "Oktober", "November", "Dezember"
    ];
    const idx = parseInt(month, 10) - 1;
    return isNaN(idx) || idx < 0 || idx > 11 ? monthStr : `${months[idx]} ${year}`;
  };

  const activeYear = selectedMonth ? selectedMonth.split("-")[0] : "2026";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="time-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto border border-[var(--border-color)] p-6 md:p-8 relative shadow-2xl flex flex-col gap-5"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Zeiterfassung schließen"
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
          <Clock className="w-8 h-8 text-[var(--accent)]" aria-hidden="true" />
          <div>
            <h2 id="time-modal-title" className="text-2xl font-extrabold tracking-tight">
              RV Zeit &amp; Stempeluhr
            </h2>
            <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">
              Verwalten Sie Ihre Schichtaufzeichnungen, Pausenzeiten und Ihr Arbeitszeitkonto.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border-color)] select-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab("stempeln");
              announceToAriaAndSpeech("Stempeluhr und Schichten ausgewählt");
            }}
            className={`flex-1 pb-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === "stempeln"
                ? "border-[var(--accent)] text-[var(--text-color)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-color)]"
            }`}
          >
            Stempeluhr &amp; Schichten
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("konto");
              announceToAriaAndSpeech("Jahreskonto und Abwesenheiten ausgewählt");
            }}
            className={`flex-1 pb-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === "konto"
                ? "border-[var(--accent)] text-[var(--text-color)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-color)]"
            }`}
          >
            Jahreskonto ({activeYear})
          </button>
        </div>

        {activeTab === "stempeln" ? (
          <div className="space-y-4 flex flex-col flex-1">
            {/* Info Card / Carryover Integration */}
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10 flex flex-col gap-3">
              <div className="flex gap-3 text-[var(--text-color)]">
                <Briefcase className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" aria-hidden="true" />
                <div className="text-xs space-y-1 leading-relaxed font-semibold">
                  <p className="font-extrabold text-sm">Arbeitszeit- &amp; Urlaubskonto</p>
                  <p className="text-[var(--text-muted)]">
                    Sollzeit: <strong className="text-[var(--text-color)]">{(carryover.dailyTargetHours * 5).toFixed(1)}h/Woche</strong> | 
                    Jahresanspruch: <strong className="text-[var(--text-color)]">{carryover.regularVacationEntitlement + carryover.additionalVacationEntitlement} Tage</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCarryover();
                }}
                className="w-full py-2 px-3 bg-[var(--bg-color)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-color)] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                aria-label="Jahreskonto-Einstellungen anpassen"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Jahreskonto-Einstellungen bearbeiten</span>
              </button>
            </div>

            {/* Real-time Stempeluhr Widget */}
            <div className="flex-1">
              <ClockInWidget
                clockInTime={clockInTime}
                onClockIn={onClockIn}
                onClockOut={onClockOut}
                timeLogs={timeLogs}
                onDeleteLog={onDeleteLog}
                announceToAriaAndSpeech={announceToAriaAndSpeech}
                onExportExcel={onExportExcel}
                selectedMonth={selectedMonth}
                onAddManualLog={onAddManualLog}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5 flex-1 overflow-y-auto pr-1">
            {/* Grid Container for Vacation and Overtime */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Overtime (Überstunden) Card */}
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center" aria-hidden="true">
                      <Clock className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">Überstundenkonto</h3>
                  </div>

                  <div className="space-y-2 mt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text-muted)]">Übertrag (Start):</span>
                      <span className="font-mono font-bold">{carryover.overtimeCarryover.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text-muted)]">Aufbau im Jahr:</span>
                      <span className="font-mono font-bold">
                        {calculateYearlyOvertime().totalOvertimeAccumulated >= 0 ? "+" : ""}{calculateYearlyOvertime().totalOvertimeAccumulated.toFixed(2)}h
                      </span>
                    </div>
                    <div className="border-t border-dashed border-[var(--border-color)] pt-2 mt-2 flex justify-between items-baseline">
                      <span className="text-xs font-bold text-[var(--text-color)]">Gesamt-Saldo:</span>
                      <span className={`text-xl font-black font-mono ${
                        calculateYearlyOvertime().totalBalance > 0 
                          ? "text-emerald-600 dark:text-emerald-400" 
                          : calculateYearlyOvertime().totalBalance < 0 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-[var(--text-color)]"
                      }`}>
                        {calculateYearlyOvertime().totalBalance >= 0 ? "+" : ""}{calculateYearlyOvertime().totalBalance.toFixed(2)}h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)]">
                  <span>Sollzeit:</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[var(--text-color)] font-extrabold">
                    {(carryover.dailyTargetHours * 5).toFixed(1)}h/Woche
                  </span>
                </div>
              </div>

              {/* Vacation (Urlaubskonto) Card */}
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center" aria-hidden="true">
                      <Umbrella className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">Urlaubskonto</h3>
                  </div>

                  <div className="space-y-2 mt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text-muted)]">Jahresanspruch:</span>
                      <span className="font-mono font-bold">
                        {carryover.regularVacationEntitlement + carryover.additionalVacationEntitlement} Tage
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text-muted)]">Resturlaub Übertrag:</span>
                      <span className="font-mono font-bold">+{carryover.vacationCarryover} Tage</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text-muted)]">Genommen (YTD):</span>
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">-{calculateYearlyVacation().totalUrlaubTaken} Tage</span>
                    </div>
                    <div className="border-t border-dashed border-[var(--border-color)] pt-2 mt-2 flex justify-between items-baseline">
                      <span className="text-xs font-bold text-[var(--text-color)]">Resturlaub aktuell:</span>
                      <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {calculateYearlyVacation().remainingVacation} Tage
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)]">
                  <span>Fehltage (YTD):</span>
                  <span className="flex gap-2">
                    <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-extrabold">
                      Krank: {calculateYearlyVacation().totalKrankDays}
                    </span>
                    <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-extrabold">
                      Feiertag: {calculateYearlyVacation().totalFeiertage}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Table list */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5" />
                <span>Monatlicher Stunden-Verlauf ({activeYear})</span>
              </h4>

              <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]" aria-label="Monatliche Arbeitszeit-Aufschlüsselung">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-[var(--border-color)] text-[var(--text-color)] font-black">
                        <th className="p-2.5">Monat</th>
                        <th className="p-2.5 text-right">Ist-Stunden</th>
                        <th className="p-2.5 text-right">Soll-Stunden</th>
                        <th className="p-2.5 text-right">Abweichung (Diff)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-muted)] font-semibold">
                      {calculateYearlyOvertime().monthsCalculated.map((mRow, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <td className="p-2.5 font-black text-[var(--text-color)]">{formatMonthGerman(mRow.month)}</td>
                          <td className="p-2.5 text-right font-bold font-mono text-[var(--text-color)]">
                            {mRow.ist.toFixed(2)}h
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            {mRow.soll.toFixed(2)}h
                          </td>
                          <td className={`p-2.5 text-right font-black font-mono ${
                            mRow.diff > 0 
                              ? "text-emerald-600 dark:text-emerald-400" 
                              : mRow.diff < 0 
                                ? "text-red-600 dark:text-red-400" 
                                : "text-[var(--text-color)]"
                          }`}>
                            {mRow.diff >= 0 ? "+" : ""}{mRow.diff.toFixed(2)}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick config access */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCarryover();
                }}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900/40 hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-color)] text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                aria-label="Jahreskonto-Einstellungen anpassen"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Jahresübertrag &amp; Soll-Stunden bearbeiten</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-4 border-t border-[var(--border-color)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 font-extrabold bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 rounded-xl cursor-pointer text-sm transition-all focus-visible:ring-4"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
