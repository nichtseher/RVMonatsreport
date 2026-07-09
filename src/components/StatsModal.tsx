import React, { useState } from "react";
import { 
   X, 
   BarChart3, 
   TrendingUp, 
   PieChart, 
   Calendar, 
   Layers, 
   Clock, 
   AlertCircle,
   Sparkles,
   Award,
   Table
} from "lucide-react";
import { ReportData, SectionsConfig, HistoryRecord } from "../types";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData;
  appFields: SectionsConfig;
  history: Record<string, HistoryRecord>;
  announceToAriaAndSpeech: (message: string, immediate?: boolean) => void;
}

export default function StatsModal({
  isOpen,
  onClose,
  reportData,
  appFields,
  history,
  announceToAriaAndSpeech
}: StatsModalProps) {
  const [activeTab, setActiveTab] = useState<"current" | "trends">("current");
  const [viewType, setViewType] = useState<"visual" | "table">("visual");

  if (!isOpen) return null;

  const handleTabChange = (tab: "current" | "trends") => {
    setActiveTab(tab);
    let desc = "Statistik für aktuellen Monat ausgewählt";
    if (tab === "trends") desc = "Trendanalyse der Vormonate ausgewählt";
    announceToAriaAndSpeech(desc, true);
  };

  // Helper to format German Month Name
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

  // --- CALCULATION HELPER FUNCTIONS FOR MAIN TOTALS ---
  const getS1Total = (data: ReportData | HistoryRecord) => {
    let total = 0;
    if (!data || !data.values) return 0;
    const fields = ("fieldsSnapshot" in data && data.fieldsSnapshot) ? data.fieldsSnapshot.s1 : appFields.s1;
    if (!fields) return 0;
    fields.forEach((f) => {
      const v = data.values[f.id];
      if (typeof v === "number") total += v;
    });
    return total;
  };

  const getS2Total = (data: ReportData | HistoryRecord) => {
    let total = 0;
    if (!data || !data.values) return 0;
    const fields = ("fieldsSnapshot" in data && data.fieldsSnapshot) ? data.fieldsSnapshot.s2 : appFields.s2;
    if (!fields) return 0;
    fields.forEach((f) => {
      const v = data.values[f.id];
      if (typeof v === "number") total += v;
    });
    return total;
  };

  const getS3Total = (data: ReportData | HistoryRecord) => {
    let total = 0;
    if (!data || !data.values) return 0;
    const fields = ("fieldsSnapshot" in data && data.fieldsSnapshot) ? data.fieldsSnapshot.s3 : appFields.s3;
    if (!fields) return 0;
    fields.forEach((f) => {
      const v = data.values[f.id];
      if (typeof v === "number") total += v;
    });
    return total;
  };

  const getS4Hours = (data: ReportData | HistoryRecord) => {
    // Specifically return hours (std_buero or custom hours in s4)
    let hours = 0;
    if (!data || !data.values) return 0;
    const fields = ("fieldsSnapshot" in data && data.fieldsSnapshot) ? data.fieldsSnapshot.s4 : appFields.s4;
    if (!fields) return 0;
    fields.forEach((f) => {
      if (f.id.includes("std") || f.label.toLowerCase().includes("stunden") || f.step === 0.5) {
        const v = data.values[f.id];
        if (typeof v === "number") hours += v;
      }
    });
    return hours;
  };

  // --- GET CURRENT MONTH METRICS ---
  const currentS1 = getS1Total(reportData);
  const currentS2 = getS2Total(reportData);
  const currentS3 = getS3Total(reportData);
  const currentHours = getS4Hours(reportData);
  const totalActions = currentS1 + currentS2 + currentS3;

  // --- COMPUTE HISTORY DATA POINTS FOR TRENDS ---
  // Combine all history items + the current active month
  const allMonthsMap: Record<string, { month: string; s1: number; s2: number; s3: number; hours: number; name: string }> = {};

  // 1. Add historical records
  Object.values(history || {})
    .filter((rec): rec is HistoryRecord & { month: string } => typeof rec?.month === "string")
    .forEach((rec) => {
      allMonthsMap[rec.month] = {
        month: rec.month,
        s1: getS1Total(rec),
        s2: getS2Total(rec),
        s3: getS3Total(rec),
        hours: getS4Hours(rec),
        name: rec.name || "Außendienst"
      };
    });

  // 2. Add current active record (might overwrite or update)
  allMonthsMap[reportData.month] = {
    month: reportData.month,
    s1: currentS1,
    s2: currentS2,
    s3: currentS3,
    hours: currentHours,
    name: reportData.name || "Außendienst"
  };

  // Sort months chronologically
  const sortedMonths = Object.values(allMonthsMap).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div 
      className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
    >
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden my-auto focus:outline-none max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="stats-title" className="text-lg font-extrabold tracking-tight text-[var(--text-color)]">
                RV Analyse & Trends
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-semibold">
                Automatische Auswertung für {formatMonthGerman(reportData.month)}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            aria-label="RV Analyse schließen"
            className="w-10 h-10 rounded-full border border-[var(--border-color)] flex items-center justify-center bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] cursor-pointer focus-visible:ring-4 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Toggles */}
        <div className="px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/20 border-b border-[var(--border-color)]">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start flex-wrap gap-0.5">
            <button
              type="button"
              onClick={() => handleTabChange("current")}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeTab === "current"
                  ? "bg-[var(--card-bg)] text-[var(--text-color)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-color)]"
              }`}
            >
              Monat
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("trends")}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeTab === "trends"
                  ? "bg-[var(--card-bg)] text-[var(--text-color)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-color)]"
              }`}
            >
              Trend ({sortedMonths.length})
            </button>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewType("visual")}
              aria-label="Grafische Ansicht"
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewType === "visual"
                  ? "bg-[var(--card-bg)] text-[var(--text-color)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-color)]"
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span className="text-[10px] font-bold px-1">Grafik</span>
            </button>
            <button
              type="button"
              onClick={() => setViewType("table")}
              aria-label="Tabellarische Ansicht"
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewType === "table"
                  ? "bg-[var(--card-bg)] text-[var(--text-color)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-color)]"
              }`}
            >
              <Table className="w-4 h-4" />
              <span className="text-[10px] font-bold px-1">Tabelle</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: CURRENT MONTH */}
          {activeTab === "current" && (
            <div className="space-y-6">
              {/* Bento Grid Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-indigo-500/5 text-center">
                  <span className="block text-[10px] font-black uppercase text-indigo-500 tracking-wider mb-1">
                    Aktivitäten
                  </span>
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                    {totalActions}
                  </span>
                  <span className="block text-[9px] text-[var(--text-muted)] font-semibold mt-1">
                    Gesamtaktionen
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-emerald-500/5 text-center">
                  <span className="block text-[10px] font-black uppercase text-emerald-500 tracking-wider mb-1">
                    Vorführungen
                  </span>
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {currentS1}
                  </span>
                  <span className="block text-[9px] text-[var(--text-muted)] font-semibold mt-1">
                    Bereich 1
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-amber-500/5 text-center">
                  <span className="block text-[10px] font-black uppercase text-amber-500 tracking-wider mb-1">
                    Schulungen
                  </span>
                  <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                    {currentS2}
                  </span>
                  <span className="block text-[9px] text-[var(--text-muted)] font-semibold mt-1">
                    Bereich 2
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-blue-500/5 text-center">
                  <span className="block text-[10px] font-black uppercase text-blue-500 tracking-wider mb-1">
                    Bürozeit
                  </span>
                  <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {currentHours}h
                  </span>
                  <span className="block text-[9px] text-[var(--text-muted)] font-semibold mt-1">
                    Arbeitszeit ca.
                  </span>
                </div>
              </div>

              {/* Graphical View (Donut Chart representation) */}
              {viewType === "visual" && (
                <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)] space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                    📊 Verteilung der Aktivitäten dieses Monats
                  </h3>

                  {totalActions === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto animate-pulse" />
                      <p className="text-sm font-bold text-[var(--text-muted)]">
                        Keine Daten für diesen Monat eingetragen.
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Erhöhen Sie Zählerstände auf dem Hauptbildschirm, um die Grafik zu füllen.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4">
                      {/* Modern CSS Stacked Ring or Dynamic SVG Pie Chart */}
                      <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          {(() => {
                            let accumulatedPercent = 0;
                            const r = 40;
                            const circ = 2 * Math.PI * r;

                            return [
                              { val: currentS1, color: "var(--primary-color, #10b981)", name: "Vorführungen" },
                              { val: currentS2, color: "#f59e0b", name: "Schulung" },
                              { val: currentS3, color: "#6366f1", name: "Spezialprodukte" }
                            ].map((item, idx) => {
                              if (item.val === 0) return null;
                              const pct = (item.val / totalActions) * 100;
                              const strokeDashArray = `${(pct / 100) * circ} ${circ}`;
                              const strokeDashOffset = -((accumulatedPercent / 100) * circ);
                              accumulatedPercent += pct;

                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r={r}
                                  fill="transparent"
                                  stroke={item.color}
                                  strokeWidth="12"
                                  strokeDasharray={strokeDashArray}
                                  strokeDashoffset={strokeDashOffset}
                                  className="transition-all duration-700 hover:scale-[1.02] origin-center cursor-help"
                                  title={`${item.name}: ${pct.toFixed(0)}%`}
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute text-center">
                          <span className="block text-2xl font-black text-[var(--text-color)]">{totalActions}</span>
                          <span className="block text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Aktionen</span>
                        </div>
                      </div>

                      {/* Customized Legends with details */}
                      <div className="space-y-3 w-full max-w-xs">
                        {[
                          { val: currentS1, color: "bg-emerald-500", border: "border-emerald-500/20", title: "1. Vorführungen & Auslieferungen", desc: "Besuche an Schulen & Arbeitsplätzen" },
                          { val: currentS2, color: "bg-amber-500", border: "border-amber-500/20", title: "2. Schulung & Akquise", desc: "Einweisungen, Telefonate & Messen" },
                          { val: currentS3, color: "bg-indigo-500", border: "border-indigo-500/20", title: "3. Spezialprodukte", desc: "Tactonom, Feelspace, WeWalk" }
                        ].map((category, idx) => {
                          const pct = totalActions > 0 ? ((category.val / totalActions) * 100).toFixed(0) : "0";
                          return (
                            <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
                              <span className={`w-3 h-3 rounded-full ${category.color} mt-1`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-[var(--text-color)] truncate">{category.title}</span>
                                  <span className="text-xs font-bold text-[var(--text-muted)]">{category.val} ({pct}%)</span>
                                </div>
                                <span className="block text-[10px] text-[var(--text-muted)] truncate">{category.desc}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tabular View */}
              {viewType === "table" && (
                <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-[var(--border-color)] text-[var(--text-color)] font-black">
                        <th className="p-4">Bereich / Kategorie</th>
                        <th className="p-4 text-right">Anzahl / Stunden</th>
                        <th className="p-4 text-right">Anteil (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-muted)] font-semibold">
                      <tr>
                        <td className="p-4 font-bold text-[var(--text-color)]">1. Vorführungen & Auslieferungen</td>
                        <td className="p-4 text-right font-black text-emerald-500">{currentS1}</td>
                        <td className="p-4 text-right">{totalActions > 0 ? ((currentS1 / totalActions) * 100).toFixed(1) : "0"}%</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-[var(--text-color)]">2. Schulung & Akquise</td>
                        <td className="p-4 text-right font-black text-amber-500">{currentS2}</td>
                        <td className="p-4 text-right">{totalActions > 0 ? ((currentS2 / totalActions) * 100).toFixed(1) : "0"}%</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-[var(--text-color)]">3. Spezialprodukte</td>
                        <td className="p-4 text-right font-black text-indigo-500">{currentS3}</td>
                        <td className="p-4 text-right">{totalActions > 0 ? ((currentS3 / totalActions) * 100).toFixed(1) : "0"}%</td>
                      </tr>
                      <tr className="bg-slate-50/40 dark:bg-slate-900/10 font-bold">
                        <td className="p-4 text-[var(--text-color)]">Arbeitszeit (Bürostunden ca.)</td>
                        <td className="p-4 text-right font-black text-blue-500">{currentHours}h</td>
                        <td className="p-4 text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORY TRENDS */}
          {activeTab === "trends" && (
            <div className="space-y-6">
              {sortedMonths.length < 2 ? (
                <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-amber-500/5 flex gap-3 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1.5 leading-relaxed font-semibold">
                    <p className="font-extrabold">Nicht genügend historische Daten für eine Trendanalyse vorhanden.</p>
                    <p>
                      Die Trendanalyse vergleicht Ihre Monatsdaten über einen längeren Zeitraum. Sobald Sie Berichte für weitere Monate im RV Archiv sichern (dies geschieht automatisch, wenn Sie auf "Nächsten Monat starten" klicken), wird hier ein automatischer Monatsvergleich gezeichnet.
                    </p>
                    <p className="font-bold underline mt-1">Tipp: Ihr aktueller Monat ist bereits als erster Datenpunkt registriert!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Visual Trend Chart */}
                  {viewType === "visual" && (
                    <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)] space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                        <span>📈 Aktivitätsvergleich über {sortedMonths.length} Monate</span>
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Trend
                        </span>
                      </h3>

                      {/* SVG Multiline Trend Line Chart */}
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[450px] h-64 relative pt-4 pr-4">
                          <svg className="w-full h-full" viewBox="0 0 500 220">
                            {(() => {
                              const paddingLeft = 35;
                              const paddingRight = 15;
                              const paddingTop = 20;
                              const paddingBottom = 30;
                              const chartWidth = 500 - paddingLeft - paddingRight;
                              const chartHeight = 220 - paddingTop - paddingBottom;

                              // Find maximum action total to scale graph appropriately
                              const maxVal = Math.max(
                                ...sortedMonths.map(m => Math.max(m.s1 + m.s2 + m.s3, m.hours, 10))
                              ) * 1.15; // Give 15% headroom

                              const getX = (idx: number) => {
                                if (sortedMonths.length <= 1) return paddingLeft;
                                return paddingLeft + (idx / (sortedMonths.length - 1)) * chartWidth;
                              };

                              const getY = (val: number) => {
                                return paddingTop + chartHeight - (val / maxVal) * chartHeight;
                              };

                              // Generate line paths
                              let s1Points = "";
                              let s2Points = "";
                              let s3Points = "";
                              let hoursPoints = "";

                              sortedMonths.forEach((m, idx) => {
                                const x = getX(idx);
                                s1Points += `${idx === 0 ? "M" : "L"} ${x} ${getY(m.s1)} `;
                                s2Points += `${idx === 0 ? "M" : "L"} ${x} ${getY(m.s2)} `;
                                s3Points += `${idx === 0 ? "M" : "L"} ${x} ${getY(m.s3)} `;
                                hoursPoints += `${idx === 0 ? "M" : "L"} ${x} ${getY(m.hours)} `;
                              });

                              return (
                                <>
                                  {/* Gridlines */}
                                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                    const y = paddingTop + ratio * chartHeight;
                                    const labelVal = Math.round(maxVal * (1 - ratio));
                                    return (
                                      <g key={i} className="opacity-30 dark:opacity-20">
                                        <line x1={paddingLeft} y1={y} x2={500 - paddingRight} y2={y} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="4 4" />
                                        <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fill="var(--text-color)" className="text-[9px] font-bold font-mono">{labelVal}</text>
                                      </g>
                                    );
                                  })}

                                  {/* Section 1 Line (Vorführungen) - Emerald */}
                                  <path d={s1Points} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                  
                                  {/* Section 2 Line (Schulungen) - Amber */}
                                  <path d={s2Points} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                                  {/* Section 3 Line (Spezial) - Indigo */}
                                  <path d={s3Points} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                                  {/* Bureau hours - Blue */}
                                  <path d={hoursPoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />

                                  {/* Data dots */}
                                  {sortedMonths.map((m, idx) => {
                                    const x = getX(idx);
                                    return (
                                      <g key={idx}>
                                        <circle cx={x} cy={getY(m.s1)} r="4.5" fill="#10b981" stroke="white" strokeWidth="1" className="cursor-pointer" />
                                        <circle cx={x} cy={getY(m.s2)} r="4.5" fill="#f59e0b" stroke="white" strokeWidth="1" className="cursor-pointer" />
                                        <circle cx={x} cy={getY(m.s3)} r="4.5" fill="#6366f1" stroke="white" strokeWidth="1" className="cursor-pointer" />
                                        <circle cx={x} cy={getY(m.hours)} r="4" fill="#3b82f6" stroke="white" strokeWidth="1" className="cursor-pointer" />
                                      </g>
                                    );
                                  })}

                                  {/* X-Axis labels */}
                                  {sortedMonths.map((m, idx) => {
                                    const x = getX(idx);
                                    const shortMonth = m.month.split("-")[1] + "/" + m.month.split("-")[0].slice(-2);
                                    return (
                                      <text key={idx} x={x} y={220 - 8} textAnchor="middle" fill="var(--text-color)" className="text-[10px] font-black font-mono">
                                        {shortMonth}
                                      </text>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      </div>

                      {/* Legends */}
                      <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center pt-2 border-t border-[var(--border-color)]">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-color)]">
                          <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                          <span>1. Vorführungen</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-color)]">
                          <span className="w-3 h-3 bg-amber-500 rounded-full" />
                          <span>2. Schulungen</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-color)]">
                          <span className="w-3 h-3 bg-indigo-500 rounded-full" />
                          <span>3. Spezialprodukte</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-color)]">
                          <span className="w-3.5 h-1 border-b-2 border-dashed border-blue-500" />
                          <span>Bürostunden ca.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabular View */}
                  {viewType === "table" && (
                    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-[var(--border-color)] text-[var(--text-color)] font-black">
                              <th className="p-4">Monat</th>
                              <th className="p-4 text-right text-emerald-500">1. Vorführungen</th>
                              <th className="p-4 text-right text-amber-500">2. Schulungen</th>
                              <th className="p-4 text-right text-indigo-500">3. Spezial</th>
                              <th className="p-4 text-right text-blue-500">Bürozeit (h)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-muted)] font-semibold">
                            {sortedMonths.map((m, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                <td className="p-4 font-black text-[var(--text-color)]">{formatMonthGerman(m.month)}</td>
                                <td className="p-4 text-right font-black">{m.s1}</td>
                                <td className="p-4 text-right font-black">{m.s2}</td>
                                <td className="p-4 text-right font-black">{m.s3}</td>
                                <td className="p-4 text-right font-black">{m.hours}h</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}



        </div>

        {/* Action Button at bottom */}
        <div className="p-6 border-t border-[var(--border-color)] bg-slate-50 dark:bg-slate-900/40 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 font-black bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 rounded-xl cursor-pointer text-xs transition-all focus-visible:ring-4 active:scale-95"
          >
            Fertig ✓ Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
