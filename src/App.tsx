import React, { useState, useEffect } from "react";
import { Navigation } from "./components/Navigation";
import { Dashboard } from "./components/Dashboard";
import { TimeTracker } from "./components/TimeTracker";
import { Archive } from "./components/Archive";
import { SettingsView } from "./components/SettingsView";
import { SectionsConfig, ReportData, HistoryRecord, AccessibilitySettings, FieldConfig, TimeLog } from "./types";
import { safeSetItem, formatMonthGerman } from "./utils";

const DEFAULT_FIELDS_CONFIG: SectionsConfig = {
  s1: [
    { id: "vf_schule", label: "Vorführungen Schule", step: 1, icon: "🏫" },
    { id: "vf_arbeit", label: "Vorführungen Arbeitsplatz", step: 1, icon: "💼" },
    { id: "aus_schule", label: "Auslieferungen Schule", step: 1, icon: "🎒" },
    { id: "aus_arbeit", label: "Auslieferungen Arbeitsplatz", step: 1, icon: "🏢" },
  ],
  s2: [
    { id: "schul_vorort", label: "Schulungen/Support (Vorort)", step: 1, icon: "👨‍🏫" },
    { id: "schul_tel", label: "Schulung/Support (Telefon)", step: 1, icon: "📞" },
    { id: "akquise", label: "Akquisetermine", step: 1, icon: "🤝" },
    { id: "messen", label: "Veranstaltungen/Messen", step: 1, icon: "🎪" },
  ],
  s3: [
    { id: "tac_vf", label: "Vorführungen Tactonom", step: 1, icon: "🎯" },
    { id: "feel_vf", label: "Vorführungen Feelspace", step: 1, icon: "🌍" },
    { id: "wewalk_vf", label: "Vorführungen WeWalk", step: 1, icon: "🦯" },
    { id: "wewalk_tel", label: "Einweisungen WeWalk (Tel)", step: 1, icon: "☎️" },
  ],
  s4: [
    { id: "tage_arbeit", label: "Arbeitstage", step: 1, icon: "🗓️" },
    { id: "std_buero", label: "Stunden Büro/Innendienst", step: 0.5, icon: "⌨️" },
    { id: "std_aussendienst", label: "Stunden Außendienst/Reise", step: 0.5, icon: "🚗" },
    { id: "tage_urlaub", label: "Urlaubstage", step: 0.5, icon: "🌴" },
    { id: "tage_krank", label: "Krankheitstage", step: 0.5, icon: "🤒" },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "time" | "archive" | "settings">("dashboard");

  const [appFields, setAppFields] = useState<SectionsConfig>(() => {
    const saved = localStorage.getItem("aussendienst_pwa_fields");
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });

  const [reportData, setReportData] = useState<ReportData>(() => {
    const saved = localStorage.getItem("aussendienst_pwa_data");
    if (saved) return JSON.parse(saved);
    const d = new Date();
    const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { month: currentMonthStr, name: "", notes: "", values: {}, timeLogs: [] };
  });

  const [history, setHistory] = useState<Record<string, HistoryRecord>>(() => {
    const saved = localStorage.getItem("aussendienst_pwa_history");
    return saved ? JSON.parse(saved) : {};
  });

  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() => {
    const defaultSettings: AccessibilitySettings = {
      theme: "light",
      fontSize: "normal",
      screenReaderNarration: false,
      audioFeedback: false,
      speechRate: 1.0,
    };
    const saved = localStorage.getItem("aussendienst_pwa_a11y");
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [clockInTime, setClockInTime] = useState<string | null>(() => {
    return localStorage.getItem("aussendienst_pwa_clock_in_time_v2");
  });

  // Persist State
  useEffect(() => safeSetItem("aussendienst_pwa_fields", JSON.stringify(appFields)), [appFields]);
  useEffect(() => safeSetItem("aussendienst_pwa_data", JSON.stringify(reportData)), [reportData]);
  useEffect(() => safeSetItem("aussendienst_pwa_history", JSON.stringify(history)), [history]);
  useEffect(() => {
    safeSetItem("aussendienst_pwa_a11y", JSON.stringify(accessibility));
    if (accessibility.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [accessibility]);

  useEffect(() => {
    if (clockInTime) safeSetItem("aussendienst_pwa_clock_in_time_v2", clockInTime);
    else localStorage.removeItem("aussendienst_pwa_clock_in_time_v2");
  }, [clockInTime]);

  // Save current month to history on change
  useEffect(() => {
    if (!reportData.month) return;
    const hasData = reportData.notes || Object.values(reportData.values).some((v) => v !== "" && v !== 0) || (reportData.timeLogs && reportData.timeLogs.length > 0);
    if (!hasData) return;

    setHistory((prev) => ({
      ...prev,
      [reportData.month]: {
        month: reportData.month,
        name: reportData.name,
        notes: reportData.notes,
        values: reportData.values,
        timeLogs: reportData.timeLogs || [],
        fieldsSnapshot: appFields,
        savedAt: new Date().toISOString(),
      },
    }));
  }, [reportData.notes, reportData.values, reportData.timeLogs, reportData.month, appFields]);

  // Handlers
  const handleValueChange = (id: string, val: number) => {
    setReportData(prev => ({ ...prev, values: { ...prev.values, [id]: val } }));
  };

  const handleNotesChange = (notes: string) => {
    setReportData(prev => ({ ...prev, notes }));
  };

  const handleClockIn = () => setClockInTime(new Date().toISOString());
  const handleClockOut = (log: TimeLog) => {
    setReportData(prev => ({
      ...prev,
      timeLogs: [...(prev.timeLogs || []), log]
    }));
    setClockInTime(null);
  };
  const handleDeleteLog = (log: TimeLog) => {
    setReportData(prev => ({
      ...prev,
      timeLogs: (prev.timeLogs || []).filter(l => l.id !== log.id)
    }));
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const excelRows: any[][] = [];
      excelRows.push(["MONATSÜBERSICHT AUßENDIENST"]);
      excelRows.push(["Monat:", reportData.month]);
      excelRows.push([]);
      
      const addSection = (title: string, fields: FieldConfig[]) => {
        excelRows.push([title, "Anzahl"]);
        fields.forEach(f => {
          excelRows.push([f.label, reportData.values[f.id] || 0]);
        });
        excelRows.push([]);
      };
      
      addSection("1. VORFÜHRUNGEN & AUSLIEFERUNGEN", appFields.s1);
      addSection("2. SCHULUNG & SUPPORT", appFields.s2);
      addSection("3. SPEZIALPRODUKTE", appFields.s3);
      addSection("4. ARBEITSZEIT", appFields.s4);
      
      if (reportData.notes) {
        excelRows.push(["Notizen:"]);
        excelRows.push([reportData.notes]);
      }
      
      const ws = XLSX.utils.aoa_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monatsbericht");
      XLSX.writeFile(wb, `Aussendienst_${reportData.month}.xlsx`);
    } catch (e) {
      console.error("Export failed", e);
      alert("Fehler beim Exportieren.");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <Navigation activeTab={activeTab} onChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="sm:hidden flex items-center justify-between px-5 py-3 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 z-40 sticky top-0 shrink-0">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
              {activeTab === 'dashboard' ? formatMonthGerman(reportData.month) : 
               activeTab === 'time' ? 'Zeiterfassung' : 
               activeTab === 'archive' ? 'Archiv' : 'Einstellungen'}
            </h1>
            {activeTab === 'dashboard' && (
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Dashboard</span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 lg:p-12 pb-[calc(env(safe-area-inset-bottom)+80px)] sm:pb-12 scroll-smooth">
          <div className="max-w-5xl mx-auto w-full">
          {activeTab === "dashboard" && (
            <Dashboard 
              fields={appFields} 
              reportData={reportData} 
              onValueChange={handleValueChange}
              onNotesChange={handleNotesChange}
            />
          )}
          
          {activeTab === "time" && (
            <TimeTracker 
              clockInTime={clockInTime}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onDeleteLog={handleDeleteLog}
              logs={reportData.timeLogs || []}
            />
          )}
          
          {activeTab === "archive" && (
            <Archive 
              history={history}
              onLoadMonth={(m) => {
                const rec = history[m];
                if (rec) {
                  setReportData({ month: m, name: rec.name, notes: rec.notes, values: rec.values, timeLogs: rec.timeLogs });
                  if (rec.fieldsSnapshot) setAppFields(rec.fieldsSnapshot);
                  setActiveTab("dashboard");
                }
              }}
              onDeleteMonth={(m) => {
                setHistory(prev => {
                  const n = {...prev};
                  delete n[m];
                  return n;
                });
              }}
              onExport={handleExportExcel}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView 
              settings={accessibility}
              onUpdateSettings={setAccessibility}
              onFactoryReset={() => {
                setAppFields(DEFAULT_FIELDS_CONFIG);
                setReportData(prev => ({...prev, values: {}}));
                setActiveTab("dashboard");
              }}
            />
          )}
        </div>
      </main>
      </div>
    </div>
  );
}
