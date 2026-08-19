import React, { useState } from "react";
import { 
  X, 
  Trash2, 
  FileSpreadsheet, 
  ArrowUpRight, 
  History, 
  Calendar,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter
} from "lucide-react";
import { SectionsConfig, HistoryRecord } from "../types";
import { exportTimeLogsToExcel, triggerFileDownload } from "../utils/excelUtils";
import { formatMonthGerman } from "../utils/dateUtils";

interface HistoryModalProps {
  appFields: SectionsConfig;
  history: Record<string, HistoryRecord>;
  onLoadMonth: (monthStr: string) => void;
  onDeleteRecord: (monthStr: string) => void;
  announceToAriaAndSpeech: (msg: string) => void;
  triggerToast: (msg: string) => void;
}

export default function HistoryModal({
  appFields,
  history,
  onLoadMonth,
  onDeleteRecord,
  announceToAriaAndSpeech,
  triggerToast
}: HistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const records = Object.values(history || {})
    .filter((r): r is HistoryRecord & { month: string } => typeof r?.month === "string")
    .sort((a, b) => b.month.localeCompare(a.month));

  // Initialize expanded years with the most recent year expanded by default
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>(() => {
    const years: Record<string, boolean> = {};
    if (records.length > 0 && records[0] && records[0].month) {
      const parts = records[0].month.split("-");
      if (parts[0]) {
        years[parts[0]] = true;
      }
    }
    return years;
  });

  const toggleYear = (year: string) => {
    const isNowExpanded = !expandedYears[year];
    setExpandedYears((prev) => ({ ...prev, [year]: isNowExpanded }));
    announceToAriaAndSpeech(`Jahr ${year} ${isNowExpanded ? "ausgeklappt" : "eingeklappt"}.`);
  };

  const toggleMonth = (monthStr: string) => {
    const isNowExpanded = !expandedMonths[monthStr];
    setExpandedMonths((prev) => ({ ...prev, [monthStr]: isNowExpanded }));
    
    announceToAriaAndSpeech(
      isNowExpanded 
        ? `${formatMonthGerman(monthStr)} ausgeklappt. Details und Exportoptionen sichtbar.` 
        : `${formatMonthGerman(monthStr)} eingeklappt.`
    );
  };

  const getActiveCount = (record: HistoryRecord) => {
    let total = 0;
    if (record && record.values) {
      Object.values(record.values).forEach((v) => {
        if (typeof v === "number") total += v;
      });
    }
    return total;
  };

  // Direct Excel export from history without loading it first!
  const handleDirectExport = async (record: HistoryRecord) => {
    announceToAriaAndSpeech(`Direkt-Export für ${formatMonthGerman(record.month)} wird vorbereitet.`);
    try {
      // Erst beim Export laden -- siehe App.tsx: ExcelJS plus eingebettete Vorlage.
      const { erzeugeVorlagenDatei } = await import("../utils/vorlageExport");
      const wbout = await erzeugeVorlagenDatei(record, appFields);
      const monthVal = record.month || "Monat";
      const nameVal = record.name || "Mitarbeitende_r";
      const cleanName = nameVal.replace(/\s+/g, "_") || "Mitarbeiter";
      const formattedMonthName = formatMonthGerman(monthVal).replace(/\s+/g, "_");
      const fileName = `RV_Mobil_Report_${cleanName}_${formattedMonthName}_Archiv.xlsx`;
      
      const ergebnis = await triggerFileDownload(
        wbout,
        fileName,
        `RV Report ${formatMonthGerman(monthVal)} (aus dem Archiv)`,
      );
      if (ergebnis === "abgebrochen") {
        triggerToast("Teilen abgebrochen – es wurde nichts gesendet.");
        announceToAriaAndSpeech("Teilen abgebrochen. Es wurde nichts gesendet.");
        return;
      }
      triggerToast(`Excel RV Report für ${formatMonthGerman(monthVal)} ${ergebnis}!`);
      announceToAriaAndSpeech(`Excel RV Report für ${formatMonthGerman(monthVal)} ${ergebnis}.`);
    } catch (err) {
      console.error(err);
      triggerToast("Fehler beim Exportieren des Reports.");
      announceToAriaAndSpeech("Fehler beim Exportieren des Reports.");
    }
  };

  const handleDirectExportTimeLogs = async (record: HistoryRecord) => {
    announceToAriaAndSpeech(`Zeiterfassungs-Export für ${formatMonthGerman(record.month)} wird vorbereitet.`);
    try {
      const result = await exportTimeLogsToExcel(record, true);
      if (!result) {
        triggerToast("Keine Zeiterfassungsdaten vorhanden!");
        announceToAriaAndSpeech("Keine Zeiterfassungsdaten zum Exportieren vorhanden.");
        return;
      }
      
      const { wbout, monthVal, nameVal } = result;
      const cleanName = nameVal.replace(/\s+/g, "_") || "Mitarbeiter";
      const formattedMonthName = formatMonthGerman(monthVal).replace(/\s+/g, "_");
      const fileName = `RV_Zeiterfassung_${cleanName}_${formattedMonthName}_Archiv.xlsx`;
      
      const ergebnis = await triggerFileDownload(
        wbout,
        fileName,
        `RV Zeiterfassung ${formatMonthGerman(monthVal)} (aus dem Archiv)`,
      );
      if (ergebnis === "abgebrochen") {
        triggerToast("Teilen abgebrochen – es wurde nichts gesendet.");
        announceToAriaAndSpeech("Teilen abgebrochen. Es wurde nichts gesendet.");
        return;
      }
      triggerToast(`Zeiterfassung für ${formatMonthGerman(monthVal)} ${ergebnis}!`);
      announceToAriaAndSpeech(`Zeiterfassungs-Protokoll für ${formatMonthGerman(monthVal)} ${ergebnis}.`);
    } catch (err) {
      console.error(err);
      triggerToast("Fehler beim Exportieren der Zeiterfassung.");
      announceToAriaAndSpeech("Fehler beim Exportieren der Zeiterfassung.");
    }
  };

  const executeDelete = () => {
    if (deleteConfirm) {
      const formatted = formatMonthGerman(deleteConfirm);
      onDeleteRecord(deleteConfirm);
      triggerToast(`Eintrag für ${formatted} gelöscht.`);
      announceToAriaAndSpeech(`Eintrag für ${formatted} aus dem RV Archiv gelöscht.`);
      setDeleteConfirm(null);
    }
  };

  // Filter & Search Logic
  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const monthName = formatMonthGerman(r.month).toLowerCase();
    const employeeName = String(r.name || "").toLowerCase();
    const notes = String(r.notes || "").toLowerCase();
    return monthName.includes(query) || employeeName.includes(query) || notes.includes(query);
  });

  // Group filtered records by Year
  const recordsByYear: Record<string, HistoryRecord[]> = {};
  filteredRecords.forEach((record) => {
    const year = record.month.split("-")[0] || "Unbekannt";
    if (!recordsByYear[year]) {
      recordsByYear[year] = [];
    }
    recordsByYear[year].push(record);
  });

  const sortedYears = Object.keys(recordsByYear).sort((a, b) => b.localeCompare(a));

  return (
    <div className="w-full bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-3xl shadow-lg overflow-hidden flex flex-col focus:outline-none animate-fade-in" tabIndex={-1}>
      {/* Header */}
      <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-color)]">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
          <h2 id="history-modal-title" className="text-lg md:text-xl font-black tracking-tight text-[var(--text-color)]">
            RV Archiv - Gespeicherte Monate
          </h2>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="p-5 space-y-4 flex-1">
          {/* Storage Information box */}
          <div className="p-3.5 rounded-xl bg-[var(--cat-4-soft)] text-[var(--info-text)] border border-[var(--info-border)] text-xs font-bold leading-relaxed">
            <strong>Ihre Daten sind sicher:</strong> Alle Ihre Monatsdaten werden direkt auf Ihrem Gerät gespeichert. Es werden keine Daten ins Internet übertragen.
          </div>

          {/* Search bar integration for clutter-free scaling */}
          {records.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Monat, Name oder Kommentar suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-9 pr-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs font-bold text-[var(--text-color)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-color)] text-xs font-black cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {records.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <History className="w-10 h-10 mx-auto text-[var(--text-muted)]" aria-hidden="true" />
              <p className="text-sm font-black text-[var(--text-muted)]">
                Noch keine Monate im Archiv.
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
                Sobald Sie auf <strong>"Nächsten Monat starten"</strong> klicken, wird Ihr aktueller Monat mit allen Zählerständen und Schichten automatisch hier gesichert!
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm font-black text-[var(--text-muted)]">
                Keine passenden Einträge gefunden.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedYears.map((year) => {
                const yearRecords = recordsByYear[year];
                const isYearCollapsed = !expandedYears[year] && !searchQuery;
                
                return (
                  <div key={year} className="space-y-2">
                    {/* Year Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleYear(year)}
                      className="w-full flex items-center justify-between min-h-[44px] px-3 bg-[var(--bg-color)]/60 rounded-xl border border-[var(--border-color)] text-left cursor-pointer hover:bg-[var(--bg-color)] transition-all select-none"
                    >
                      <span className="text-xs font-black tracking-wider text-[var(--text-color)] uppercase flex items-center gap-1.5">
                        <Filter className="w-3 h-3 text-[var(--accent)]" />
                        Jahr {year} ({yearRecords.length} {yearRecords.length === 1 ? "Monat" : "Monate"})
                      </span>
                      <div className="text-[var(--text-muted)]">
                        {isYearCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>

                    {/* Year Accordion Content */}
                    {!isYearCollapsed && (
                      <div className="space-y-2.5 pl-1" role="list">
                        {yearRecords.map((record) => {
                          const totalCount = getActiveCount(record);
                          const isExpanded = !!expandedMonths[record.month];
                          return (
                            <div 
                              key={record.month}
                              className="rounded-2xl border-2 border-[var(--border-color)] bg-[var(--bg-color)] overflow-hidden shadow-xs hover:border-[var(--border-focus)] transition-all"
                              role="listitem"
                            >
                              {/* Collapsible Header Button */}
                              <button
                                type="button"
                                onClick={() => toggleMonth(record.month)}
                                aria-expanded={isExpanded}
                                aria-label={`${formatMonthGerman(record.month)} details ${isExpanded ? "einklappen" : "ausklappen"}`}
                                className="w-full text-left p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--bg-color)] transition-all select-none focus:outline-none focus-visible:ring-4"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-black text-xs md:text-sm text-[var(--text-color)] flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                                      {formatMonthGerman(record.month)}
                                    </span>
                                    <span className="text-[0.6875rem] font-mono font-bold bg-[var(--bg-color)] px-2 py-0.5 rounded-full text-[var(--text-muted)]">
                                      Zähler: {totalCount}
                                    </span>
                                  </div>
                                  <p className="text-[0.75rem] font-bold text-[var(--text-muted)] mt-1">
                                    Mitarbeiter: {record.name ? String(record.name) : "Kein Name eingetragen"}
                                  </p>
                                </div>
                                <div className="text-[var(--text-muted)] p-1 rounded-full border border-[var(--border-color)] bg-[var(--card-bg)]">
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                </div>
                              </button>

                              {/* Collapsible content body */}
                              {isExpanded && (
                                <div className="p-3.5 border-t border-[var(--border-color)] bg-[var(--bg-color)] space-y-3.5 animate-fade-in">
                                  {record.notes && (
                                    <p className="text-xs italic text-[var(--text-muted)] leading-relaxed bg-[var(--bg-color)]/30 p-2.5 rounded-xl border border-[var(--border-color)]">
                                      <strong>Kommentar:</strong> "{String(record.notes)}"
                                    </p>
                                  )}

                                  {/* Action buttons (Touch-optimized heights of 44px) */}
                                  <div className="space-y-2 select-none">
                                    <div className="grid grid-cols-4 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onLoadMonth(record.month);
                                        }}
                                        aria-label={`${formatMonthGerman(record.month)} laden und bearbeiten`}
                                        className="col-span-3 h-11 rounded-xl bg-[var(--primary)] text-[var(--primary-text)] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all focus-visible:ring-4"
                                      >
                                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                                        <span>Laden / Editieren</span>
                                      </button>

                                      {deleteConfirm === record.month ? (
                                        <div className="col-span-1 h-11 flex gap-1">
                                          <button
                                            type="button"
                                            onClick={() => executeDelete()}
                                            className="flex-1 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-solid)] text-white font-black text-xs flex items-center justify-center cursor-pointer hover:bg-[var(--danger-solid)] active:scale-95 transition-all focus-visible:ring-4"
                                            aria-label="Wirklich löschen? Ja"
                                          >
                                            Ja
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeleteConfirm(null)}
                                            className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] font-black text-xs flex items-center justify-center cursor-pointer hover:bg-[var(--border-color)] active:scale-95 transition-all focus-visible:ring-4"
                                            aria-label="Abbrechen"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setDeleteConfirm(record.month)}
                                          aria-label={`${formatMonthGerman(record.month)} aus RV Archiv löschen`}
                                          className="col-span-1 h-11 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] font-black text-xs flex items-center justify-center cursor-pointer hover:brightness-110 active:scale-95 transition-all focus-visible:ring-4"
                                        >
                                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleDirectExport(record)}
                                        aria-label={`${formatMonthGerman(record.month)} RV Report als Excel exportieren und teilen`}
                                        className="h-11 rounded-xl border border-[var(--accent)] bg-[var(--cat-1-soft)] text-[var(--cat-1-text)] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[var(--cat-1-soft)] active:scale-95 transition-all focus-visible:ring-4"
                                      >
                                        <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                                        <span>Export RV Report</span>
                                      </button>

                                      {record.timeLogs && Array.isArray(record.timeLogs) && record.timeLogs.length > 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleDirectExportTimeLogs(record)}
                                          aria-label={`${formatMonthGerman(record.month)} RV Zeit Zeiterfassung als Excel exportieren und teilen`}
                                          className="h-11 rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[var(--info-bg)] active:scale-95 transition-all focus-visible:ring-4"
                                        >
                                          <Clock className="w-3.5 h-3.5 text-[var(--info-text)]" aria-hidden="true" />
                                          <span>Export RV Zeit</span>
                                        </button>
                                      ) : (
                                        <div className="h-11 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-muted)] text-[0.75rem] font-bold flex items-center justify-center select-none">
                                          Keine Schichten erfasst
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
}
