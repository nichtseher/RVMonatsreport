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

interface HistoryModalProps {
  history: Record<string, HistoryRecord>;
  onLoadMonth: (monthStr: string) => void;
  onDeleteRecord: (monthStr: string) => void;
  announceToAriaAndSpeech: (msg: string) => void;
  triggerToast: (msg: string) => void;
}

export default function HistoryModal({
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

  const formatMonthGerman = (monthStr: string) => {
    if (!monthStr || typeof monthStr !== "string") return "";
    const parts = monthStr.split("-");
    if (parts.length < 2) return monthStr;
    const [year, month] = parts;
    const monthNames = [
      "Januar", "Februar", "März", "April", "Mai", "Juni",
      "Juli", "August", "September", "Oktober", "November", "Dezember"
    ];
    const monthIdx = parseInt(month, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNames[monthIdx]} ${year}`;
    }
    return monthStr;
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
    const XLSX = await import("xlsx");
    
    const monthVal = record.month || "Monat";
    const nameVal = record.name || "Mitarbeitende_r";
    const getVal = (id: string) => {
      if (!record.values) return 0;
      const val = record.values[id];
      return typeof val === "number" ? val : 0;
    };

    const fields = record.fieldsSnapshot || { s1: [], s2: [], s3: [], s4: [] };
    const startRowS1 = 10;
    const endRowS1 = startRowS1 + fields.s1.length - 1;

    // Excel structure
    const excelRows = [
      ["MONATSÜBERSICHT AUßENDIENST - HISTORISCH"],
      ["Erstellt mit der barrierefreien RV Mobil App (Archiv)"],
      [],
      ["Monat / Jahr:", formatMonthGerman(monthVal)],
      ["Name (Mitarbeiter/in):", nameVal],
      [],
      ["1. VORFÜHRUNGEN & AUSLIEFERUNGEN", "Anzahl / Zählerstand"],
      ...fields.s1.map((i) => [i.label, getVal(i.id)]),
      ["Gesamt (Bereich 1)", { t: "n", f: `SUM(B${startRowS1}:B${endRowS1})` }],
      [],
      ["2. SCHULUNG, SUPPORT & AKQUISE", "Anzahl / Zählerstand"],
      ...fields.s2.map((i) => [i.label, getVal(i.id)]),
      [],
      ["3. SPEZIALPRODUKTE (DETAILS)", "Anzahl / Zählerstand"],
      ...fields.s3.map((i) => [i.label, getVal(i.id)]),
      [],
      ["4. ARBEITSZEIT & BÜRO", "Wert / Stunden"],
      ...fields.s4.map((i) => [i.label, getVal(i.id)]),
      [],
      ["Anmerkungen & Kommentare:"],
      [record.notes || "Keine Anmerkungen eingetragen."]
    ];

    const ws = XLSX.utils.aoa_to_sheet(excelRows);
    ws["!cols"] = [{ wch: 54 }, { wch: 22 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monatsreport");

    const cleanName = nameVal.replace(/\s+/g, "_") || "Mitarbeiter";
    const formattedMonthName = formatMonthGerman(monthVal).replace(/\s+/g, "_");
    const fileName = `RV_Mobil_Report_${cleanName}_${formattedMonthName}_Archiv.xlsx`;

    // Try web sharing API first (for iOS and Android support)
    if (navigator.share && navigator.canShare) {
      try {
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new File([wbout], fileName, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        
        if (navigator.canShare({ files: [file] })) {
          navigator.share({
            title: "RV Mobil Report (Archiv)",
            text: `Anbei der archivierte RV Report für ${formatMonthGerman(monthVal)}`,
            files: [file],
          }).then(() => {
            triggerToast("RV Report erfolgreich geteilt!");
            announceToAriaAndSpeech("Teilen-Dialog erfolgreich geöffnet.");
          }).catch((err) => {
            console.log("Sharing cancelled or failed, falling back to download", err);
            XLSX.writeFile(wb, fileName);
            triggerToast("Excel RV Report heruntergeladen!");
            announceToAriaAndSpeech("Excel RV Report heruntergeladen.");
          });
          return;
        }
      } catch (e) {
        console.warn("Share API was blocked, using standard download.", e);
      }
    }

    // Fallback direct download
    XLSX.writeFile(wb, fileName);
    triggerToast(`Excel RV Report für ${formatMonthGerman(monthVal)} heruntergeladen!`);
    announceToAriaAndSpeech(`Excel RV Report für ${formatMonthGerman(monthVal)} heruntergeladen.`);
  };

  const handleDirectExportTimeLogs = async (record: HistoryRecord) => {
    const XLSX = await import("xlsx");
    const monthVal = record.month || "Monat";
    const nameVal = record.name || "Mitarbeitende_r";
    const logs = (Array.isArray(record.timeLogs) ? [...record.timeLogs] : []).sort((a, b) => a.date.localeCompare(b.date));

    if (logs.length === 0) {
      triggerToast("Keine Zeiterfassungsdaten in diesem Monat vorhanden!");
      announceToAriaAndSpeech("Keine Zeiterfassungsdaten zum Exportieren vorhanden.");
      return;
    }

    announceToAriaAndSpeech(`Zeiterfassungs-Export für ${formatMonthGerman(record.month)} wird vorbereitet.`);

    const excelRows: any[][] = [];
    excelRows.push(["ARBEITSZEITERFASSUNG & STEMPELUHR - RV AUßENDIENST (HISTORISCH)"]);
    excelRows.push(["Erstellt mit der barrierefreien RV Mobil App (Archiv)"]);
    excelRows.push([]);
    excelRows.push(["Mitarbeiter/in:", nameVal]);
    excelRows.push(["Berichtsmonat:", formatMonthGerman(monthVal)]);
    excelRows.push([]);

    // Table Headers
    excelRows.push([
      "Datum",
      "Kommen",
      "Gehen",
      "Abzug Pause (Min)",
      "Netto-Stunden (h)",
      "Anteil Büro (h)",
      "Anteil Außendienst (h)",
      "Kommentar / Ort / Besuchte Schule"
    ]);

    const startRow = excelRows.length + 1;
    logs.forEach((log) => {
      const [y, m, d] = log.date.split("-");
      const formattedDate = y && m && d ? `${d}.${m}.${y}` : log.date;
      excelRows.push([
        formattedDate,
        log.clockIn,
        log.clockOut,
        log.breakMinutes,
        log.duration,
        log.officeHours,
        log.fieldHours,
        log.notes || ""
      ]);
    });
    const endRow = excelRows.length;

    // Sums Row
    excelRows.push([
      "GESAMT",
      "",
      "",
      "",
      { t: "n", f: `SUM(E${startRow}:E${endRow})` },
      { t: "n", f: `SUM(F${startRow}:F${endRow})` },
      { t: "n", f: `SUM(G${startRow}:G${endRow})` },
      ""
    ]);

    const ws = XLSX.utils.aoa_to_sheet(excelRows);
    
    // Set widths
    ws["!cols"] = [
      { wch: 12 }, // Datum
      { wch: 10 }, // Kommen
      { wch: 10 }, // Gehen
      { wch: 18 }, // Pause
      { wch: 18 }, // Netto
      { wch: 16 }, // Büro
      { wch: 22 }, // Außendienst
      { wch: 45 }  // Kommentar
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Arbeitszeiten");

    const cleanName = nameVal.replace(/\s+/g, "_") || "Mitarbeiter";
    const formattedMonthName = formatMonthGerman(monthVal).replace(/\s+/g, "_");
    const fileName = `RV_Zeiterfassung_${cleanName}_${formattedMonthName}_Archiv.xlsx`;

    // Try web sharing API first (for iOS and Android support)
    if (navigator.share && navigator.canShare) {
      try {
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new File([wbout], fileName, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        
        if (navigator.canShare({ files: [file] })) {
          navigator.share({
            title: "RV Zeiterfassung (Archiv)",
            text: `Anbei das archivierte Zeiterfassungs-Protokoll für ${formatMonthGerman(monthVal)}`,
            files: [file],
          }).then(() => {
            triggerToast("Zeiterfassung erfolgreich geteilt!");
            announceToAriaAndSpeech("Zeiterfassungs-Teilen-Dialog erfolgreich geöffnet.");
          }).catch((err) => {
            console.log("Sharing cancelled or failed, falling back to download", err);
            XLSX.writeFile(wb, fileName);
            triggerToast("Excel RV Zeit heruntergeladen!");
            announceToAriaAndSpeech("Zeiterfassung heruntergeladen.");
          });
          return;
        }
      } catch (e) {
        console.warn("Share API was blocked, using standard download.", e);
      }
    }

    // Fallback direct download
    XLSX.writeFile(wb, fileName);
    triggerToast(`Zeiterfassung für ${formatMonthGerman(monthVal)} heruntergeladen!`);
    announceToAriaAndSpeech(`Zeiterfassungs-Protokoll für ${formatMonthGerman(monthVal)} heruntergeladen.`);
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
      <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
          <h2 id="history-modal-title" className="text-lg md:text-xl font-extrabold tracking-tight text-[var(--text-color)]">
            RV Archiv - Gespeicherte Monate
          </h2>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="p-5 space-y-4 flex-1">
          {/* Storage Information box */}
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900 text-xs font-bold leading-relaxed">
            💡 <strong>Ihre Daten sind sicher:</strong> Alle Ihre Monatsdaten werden direkt auf Ihrem Gerät gespeichert. Es werden keine Daten ins Internet übertragen.
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
              <div className="text-4xl">📁</div>
              <p className="text-sm font-extrabold text-[var(--text-muted)]">
                Noch keine Monate im Archiv.
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
                Sobald Sie auf <strong>"Nächsten Monat starten"</strong> klicken, wird Ihr aktueller Monat mit allen Zählerständen und Schichten automatisch hier gesichert!
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm font-extrabold text-[var(--text-muted)]">
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
                      className="w-full flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-[var(--border-color)] text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all select-none"
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
                                className="w-full text-left p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all select-none focus:outline-none focus-visible:ring-4"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-extrabold text-xs md:text-sm text-[var(--text-color)] flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                                      {formatMonthGerman(record.month)}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[var(--text-muted)]">
                                      Zähler: {totalCount}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-bold text-[var(--text-muted)] mt-1">
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
                                    <p className="text-xs italic text-[var(--text-muted)] leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-[var(--border-color)]">
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
                                        className="col-span-3 h-11 rounded-xl bg-[var(--primary)] text-[var(--primary-text)] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all focus-visible:ring-4"
                                      >
                                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                                        <span>Laden / Editieren</span>
                                      </button>

                                      {deleteConfirm === record.month ? (
                                        <div className="col-span-1 h-11 flex gap-1">
                                          <button
                                            type="button"
                                            onClick={() => executeDelete()}
                                            className="flex-1 rounded-xl border border-red-600 bg-red-500 text-white font-extrabold text-xs flex items-center justify-center cursor-pointer hover:bg-red-600 active:scale-95 transition-all focus-visible:ring-4"
                                            aria-label="Wirklich löschen? Ja"
                                          >
                                            Ja
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeleteConfirm(null)}
                                            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[var(--text-color)] font-extrabold text-xs flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all focus-visible:ring-4"
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
                                          className="col-span-1 h-11 rounded-xl border border-red-200 dark:border-red-950/40 bg-red-50/20 text-red-600 dark:text-red-400 font-extrabold text-xs flex items-center justify-center cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all focus-visible:ring-4"
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
                                        className="h-11 rounded-xl border border-emerald-600/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-emerald-500/10 active:scale-95 transition-all focus-visible:ring-4"
                                      >
                                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                        <span>Export RV Report</span>
                                      </button>

                                      {record.timeLogs && Array.isArray(record.timeLogs) && record.timeLogs.length > 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleDirectExportTimeLogs(record)}
                                          aria-label={`${formatMonthGerman(record.month)} RV Zeit Zeiterfassung als Excel exportieren und teilen`}
                                          className="h-11 rounded-xl border border-teal-600/30 bg-teal-500/5 text-teal-600 dark:text-teal-400 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-teal-500/10 active:scale-95 transition-all focus-visible:ring-4"
                                        >
                                          <Clock className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                                          <span>Export RV Zeit</span>
                                        </button>
                                      ) : (
                                        <div className="h-11 rounded-xl border border-dashed border-[var(--border-color)] bg-slate-500/5 text-[var(--text-muted)] text-[10px] font-bold flex items-center justify-center select-none">
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
