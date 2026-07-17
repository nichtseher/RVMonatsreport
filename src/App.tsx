import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSwipeable } from "react-swipeable";
import { get, set } from "idb-keyval";
import {
  Calendar,
  CalendarPlus,
  User,
  FileSpreadsheet,
  PlusCircle,
  Trash2,
  Mic,
  MicOff,
  Settings,
  RotateCcw,
  HelpCircle,
  Info,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Plus,
  Minus,
  History,
  Volume2,
  Square,
  BarChart3,
  LayoutGrid,
  Eye,
  GraduationCap,
  Clock,
  Search,
  X,
} from "lucide-react";

import {
  SectionsConfig,
  ReportData,
  AccessibilitySettings,
  FieldConfig,
  HistoryRecord,
  YearlyCarryover,
  TimeLog,
} from "./types";
import A11yModal from "./components/A11yModal";
import CounterField from "./components/CounterField";
import HelpModal from "./components/HelpModal";
import ManageModal from "./components/ManageModal";
import HistoryModal from "./components/HistoryModal";
import StatsModal from "./components/StatsModal";
import CarryoverModal from "./components/CarryoverModal";
import ClockInWidget from "./components/ClockInWidget";
import TimeModal from "./components/TimeModal";
import SecureBackupModal from "./components/SecureBackupModal";
import DeviceSyncModal from "./components/DeviceSyncModal";
import { ChangelogModal } from "./components/ChangelogModal";

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    console.error(`Error saving to localStorage (key: ${key}):`, e);
    if (e.name === "QuotaExceededError" || e.code === 22) {
      alert("Speicherlimit erreicht! Bitte exportieren Sie Ihre Daten und löschen Sie alte Monate aus dem Archiv, da sonst keine neuen Daten gespeichert werden können.");
    }
  }
};

const DEFAULT_FIELDS_CONFIG: SectionsConfig = {
  s1: [
    {
      id: "vf_schule",
      label: "Anzahl Vorführungen Schule/Bildung",
      step: 1,
      icon: "🏫",
    },
    {
      id: "vf_arbeit",
      label: "Anzahl Vorführungen Arbeitsplatz",
      step: 1,
      icon: "💼",
    },
    {
      id: "aus_schule",
      label: "Anzahl Auslieferungen Schule/Bildung",
      step: 1,
      icon: "🎒",
    },
    {
      id: "aus_arbeit",
      label: "Anzahl Auslieferungen Arbeitsplatz",
      step: 1,
      icon: "🏢",
    },
  ],
  s2: [
    {
      id: "schul_vorort",
      label: "Anzahl Schulungen/Support (ohne Auslieferung)",
      step: 1,
      icon: "👨‍🏫",
    },
    {
      id: "schul_tel",
      label: "Anzahl Schulung/Support Telefon",
      step: 1,
      icon: "📞",
    },
    {
      id: "akquise",
      label: "Anzahl Akquisetermine / Beratungsstellen / Multiplikator/innen",
      step: 1,
      icon: "🤝",
    },
    {
      id: "messen",
      label: "Anzahl Teilnahme Veranstaltungen/Messen/Ausstellungen",
      step: 1,
      icon: "🎪",
    },
  ],
  s3: [
    {
      id: "tac_vf",
      label: "Anzahl Vorführungen Tactonom",
      step: 1,
      icon: "🎯",
    },
    {
      id: "feel_vf",
      label: "Anzahl Vorführungen Feelspace",
      step: 1,
      icon: "🌍",
    },
    {
      id: "wewalk_vf",
      label: "Anzahl Vorführungen WeWalk",
      step: 1,
      icon: "🦯",
    },
    {
      id: "wewalk_tel",
      label: "Anzahl telefonische Einweisungen WeWalk",
      step: 1,
      icon: "☎️",
    },
  ],
  s4: [
    {
      id: "tage_arbeit",
      label: "Arbeitstage (ohne Urlaub/Krankheit)",
      step: 1,
      icon: "🗓️",
    },
    {
      id: "std_buero",
      label: "Stunden Büro/Innendienst",
      step: 0.5,
      icon: "⌨️",
    },
    {
      id: "std_aussendienst",
      label: "Stunden Außendienst/Reisezeit",
      step: 0.5,
      icon: "🚗",
    },
    {
      id: "tage_urlaub",
      label: "Genommene Urlaubstage",
      step: 0.5,
      icon: "🌴",
    },
    {
      id: "tage_krank",
      label: "Krankheitstage (bezahlt)",
      step: 0.5,
      icon: "🤒",
    },
    {
      id: "tage_feiertag",
      label: "Feiertage (arbeitsfrei)",
      step: 1,
      icon: "🎉",
    },
  ],
};



export default function App() {
  // --- ROUTING / NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState<"form" | "time" | "stats" | "history" | "options" | "help" | "backup" | "manage" | "carryover" | "sync" | "changelog">("form");

  // --- STATE ---
  const [appFields, setAppFields] = useState<SectionsConfig>(() => {
    const saved = localStorage.getItem("aussendienst_pwa_fields");
    let fields = DEFAULT_FIELDS_CONFIG;
    if (saved) {
      try {
        fields = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse fields config", e);
      }
    }

    // Ensure wewalk_tel is restored if it was missing
    if (fields && fields.s3) {
      const hasTel = fields.s3.some((f: FieldConfig) => f.id === "wewalk_tel");
      if (!hasTel) {
        fields.s3.push({
          id: "wewalk_tel",
          label: "Anzahl telefonische Einweisungen WeWalk",
          step: 1,
          icon: "☎️",
        });
      }
    }

    // Migration for s4 fields to add vacation, sickness, travel, holidays
    if (fields && fields.s4) {
      const requiredS4 = [
        {
          id: "std_aussendienst",
          label: "Stunden Außendienst/Reisezeit",
          step: 0.5,
          icon: "🚗",
        },
        {
          id: "tage_urlaub",
          label: "Genommene Urlaubstage",
          step: 0.5,
          icon: "🌴",
        },
        {
          id: "tage_krank",
          label: "Krankheitstage (bezahlt)",
          step: 0.5,
          icon: "🤒",
        },
        {
          id: "tage_feiertag",
          label: "Feiertage (arbeitsfrei)",
          step: 1,
          icon: "🎉",
        },
      ];
      requiredS4.forEach((field) => {
        const exists = fields.s4.some((f: FieldConfig) => f.id === field.id);
        if (!exists) {
          fields.s4.push(field);
        }
      });
      // Update label to be descriptive
      fields.s4 = fields.s4.map((f: FieldConfig) => {
        if (f.id === "std_buero") {
          return { ...f, label: "Stunden Büro/Innendienst" };
        }
        return f;
      });
    }

    const iconMap: Record<string, string> = {
      vf_schule: "🏫",
      vf_arbeit: "💼",
      aus_schule: "🎒",
      aus_arbeit: "🏢",
      schul_vorort: "👨‍🏫",
      schul_tel: "📞",
      akquise: "🤝",
      messen: "🎪",
      tac_vf: "🎯",
      feel_vf: "🌍",
      wewalk_vf: "🦯",
      wewalk_tel: "☎️",
      tage_arbeit: "🗓️",
      std_buero: "⌨️",
      std_aussendienst: "🚗",
      tage_urlaub: "🌴",
      tage_krank: "🤒",
      tage_feiertag: "🎉",
    };

    // Make sure every field in every section has an icon
    Object.keys(fields).forEach((sectionKey) => {
      const sec = sectionKey as keyof SectionsConfig;
      if (Array.isArray(fields[sec])) {
        fields[sec] = fields[sec].map((f: FieldConfig) => {
          if (!f.icon) {
            return { ...f, icon: iconMap[f.id] || "⭐" };
          }
          return f;
        });
      }
    });

    return fields;
  });

  const [reportData, setReportData] = useState<ReportData | null>(null);

  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(
    () => {
      const defaultSettings: AccessibilitySettings = {
        theme: "light",
        fontSize: "normal",
        screenReaderNarration: false,
        audioFeedback: true,
        speechRate: 1.0,
      };
      const saved = localStorage.getItem("aussendienst_pwa_a11y");
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
          return defaultSettings;
        }
      }
      return defaultSettings;
    },
  );

  // History State
  const [history, setHistory] = useState<Record<string, HistoryRecord> | null>(null);

  // Ergonomic Field Service states
  const [isCompactView, setIsCompactView] = useState<boolean>(() => {
    return localStorage.getItem("aussendienst_pwa_compact") === "true";
  });
  const [activeSectionTab, setActiveSectionTab] = useState<
    "all" | "s1" | "s2" | "s3" | "s4"
  >("all");

  const tabs = ["all", "s1", "s2", "s3", "s4"] as const;
  
  const handleSwipeLeft = () => {
    const currentIndex = tabs.indexOf(activeSectionTab);
    if (currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1];
      setActiveSectionTab(nextTab);
      // Using a basic haptic simulation (assuming triggerHaptic exists in scope)
      triggerHaptic && triggerHaptic(15);
      const tabNames = { s1: "Bereich 1: Vorführungen", s2: "Bereich 2: Schulungen & Support", s3: "Bereich 3: Spezialprodukte", s4: "Bereich 4: Arbeitszeit" };
      // Assuming announceToAriaAndSpeech is hoisted or available, otherwise we use a side-effect.
      // Wait, we need to define this later if announceToAriaAndSpeech is defined after.
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = tabs.indexOf(activeSectionTab);
    if (currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1];
      setActiveSectionTab(prevTab);
      triggerHaptic && triggerHaptic(15);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    trackMouse: false
  });

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  });

  // Custom field creator inputs
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldSection, setNewFieldSection] =
    useState<keyof SectionsConfig>("s1");
  const [newFieldStep, setNewFieldStep] = useState<number>(1);
  const [newFieldIcon, setNewFieldIcon] = useState("⭐");

  // Speech Recognition dictation state
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Active focused field for Mobile Touch-Accessory Toolbar helper
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);

  // Real-time live search query for products/categories
  const [searchQuery, setSearchQuery] = useState("");

  // Goals configuration state with local storage persistence
  const [goalsConfig, setGoalsConfig] = useState<{
    enabled: boolean;
    s1: number;
    s2: number;
    s3: number;
    s4: number;
  }>(() => {
    const defaultGoals = {
      enabled: false,
      s1: 15,
      s2: 10,
      s3: 5,
      s4: 40,
    };
    const saved = localStorage.getItem("aussendienst_pwa_goals_v2");
    if (saved) {
      try {
        return { ...defaultGoals, ...JSON.parse(saved) };
      } catch (e) {
        return defaultGoals;
      }
    }
    return defaultGoals;
  });

  const [isGoalsEditorOpen, setIsGoalsEditorOpen] = useState(false);

  const updateGoalsConfig = (newConfig: typeof goalsConfig) => {
    setGoalsConfig(newConfig);
    safeSetItem(
      "aussendienst_pwa_goals_v2",
      JSON.stringify(newConfig),
    );
  };

  // --- YEARLY ACCOUNT CARRYOVER & SETTINGS STATE ---
  const [carryover, setCarryover] = useState<YearlyCarryover>(() => {
    const saved = localStorage.getItem("aussendienst_pwa_carryover_v2");
    const defaultCarryover: YearlyCarryover = {
      regularVacationEntitlement: 30,
      additionalVacationEntitlement: 5,
      vacationCarryover: 0,
      overtimeCarryover: 0,
      dailyTargetHours: 8.0,
    };
    if (saved) {
      try {
        return { ...defaultCarryover, ...JSON.parse(saved) };
      } catch (e) {
        return defaultCarryover;
      }
    }
    return defaultCarryover;
  });

  const updateCarryover = (newCarryover: YearlyCarryover) => {
    setCarryover(newCarryover);
    safeSetItem(
      "aussendienst_pwa_carryover_v2",
      JSON.stringify(newCarryover),
    );
    triggerToast("Jahreskonto erfolgreich aktualisiert!");
    announceToAriaAndSpeech("Jahreskonto-Einstellungen gespeichert.", true);
  };

  // --- STAMPELUHR TIME TRACKING STATE ---
  const [clockInTime, setClockInTime] = useState<string | null>(() => {
    return localStorage.getItem("aussendienst_pwa_clock_in_time_v2");
  });

  // Acoustic Auditor state
  const [isReadingSummary, setIsReadingSummary] = useState(false);

  // Toast notification state
  const [toastText, setToastText] = useState("");
  const [ariaAnnouncement, setAriaAnnouncement] = useState("");
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnnouncedFieldRef = useRef<{ id: string; time: number } | null>(
    null,
  );

  // --- ARIA LIVE REGION ANNOUNCEMENT HELPER ---
  const announceToAriaAndSpeech = useCallback((
    message: string,
    immediate = false,
    fieldId?: string,
    newValue?: number | "",
  ) => {
    let finalMessage = message;

    // Smart Speech Reduction: If editing the same field within 3 seconds, speak only the naked number!
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

    // 1. Screen Reader Live Region update (only keep the single latest announcement to prevent speech chains)
    setAriaAnnouncement(finalMessage);

    // 2. TTS Voice Synthesis (custom browser speaker if active) - Debounced for incremental values
    if (
      accessibility.screenReaderNarration &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }

      const speakNow = () => {
        try {
          window.speechSynthesis.cancel(); // Interrupt any currently playing text
          const utterance = new SpeechSynthesisUtterance(finalMessage);
          utterance.lang = "de-DE";
          utterance.rate = accessibility.speechRate || 1.0;
          utterance.onerror = (e) => {
            console.warn("ScreenReaderNarration SpeechSynthesis error:", e);
          };
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn(
            "ScreenReaderNarration SpeechSynthesis play exception:",
            err,
          );
        }
      };

      if (immediate) {
        speakNow();
      } else {
        speechTimeoutRef.current = setTimeout(speakNow, 600); // 600ms debounce
      }
    }
  }, [accessibility.screenReaderNarration, accessibility.speechRate]);

  // --- TRIGGER HAPTIC VIBRATION ---
  const triggerHaptic = (ms = 12) => {
    if (
      typeof window !== "undefined" &&
      window.navigator &&
      window.navigator.vibrate
    ) {
      window.navigator.vibrate(ms);
    }
  };

  // --- TOAST HELPER ---
  const triggerToast = (text: string) => {
    setToastText(text);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastText("");
    }, 2800);
  };

  // --- SYNC LOCALSTORAGE & ACCESSIBILITY ATTRIBUTES ---
  useEffect(() => {
    safeSetItem("aussendienst_pwa_fields", JSON.stringify(appFields));
  }, [appFields]);

  useEffect(() => {
    setSaveStatus("saving");
    const t = setTimeout(() => {
      if (reportData) set("aussendienst_pwa_data", reportData);
      setSaveStatus("saved");
      const now = new Date();
      setLastSavedTime(
        now.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }, 400);
    return () => clearTimeout(t);
  }, [reportData]);

  useEffect(() => {
    safeSetItem("aussendienst_pwa_compact", String(isCompactView));
  }, [isCompactView]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // German month formatting helper
  const formatMonthGerman = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const monthNames = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];
    const monthIdx = parseInt(month, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNames[monthIdx]} ${year}`;
    }
    return monthStr;
  };

  // Automatic saving into history list upon any relevant data changes
  useEffect(() => {
    if (!reportData?.month) return;

    // Only save if we have some data in the form to avoid empty spamming
    const hasData =
      reportData?.name ||
      reportData?.notes ||
      Object.values(reportData?.values || {}).some((v) => v !== "" && v !== 0) ||
      (reportData?.timeLogs && reportData?.timeLogs.length > 0);
    if (!hasData) return;

    setHistory((prev) => {
      const updated = {
        ...prev,
        [reportData?.month]: {
          month: reportData?.month,
          name: reportData?.name,
          notes: reportData?.notes,
          values: reportData?.values,
          timeLogs: reportData?.timeLogs || [],
          fieldsSnapshot: appFields,
          savedAt: new Date().toISOString(),
        },
      };
      set("aussendienst_pwa_history", updated);
      return updated;
    });
  }, [
    reportData?.name,
    reportData?.notes,
    reportData?.values,
    reportData?.month,
    reportData?.timeLogs,
    appFields,
  ]);

  useEffect(() => {
    safeSetItem(
      "aussendienst_pwa_a11y",
      JSON.stringify(accessibility),
    );
    document.documentElement.setAttribute("data-theme", accessibility.theme);
    document.documentElement.setAttribute("data-size", accessibility.fontSize);
  }, [accessibility]);

  // Set default month on load if empty
  useEffect(() => {
    if (!reportData?.month) {
      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      setReportData((prev) => ({ ...prev, month: currentMonthStr }));
    }
  }, [reportData?.month]);

  // --- DEADLINE LOGIC ---
  const getDeadlineAlert = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const realCurrentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    // Check if we have any counts registered in the values
    const hasValues = Object.values(reportData?.values || {}).some(
      (v) => typeof v === "number" && v > 0,
    );
    const isPastDeadlineMonth = reportData?.month !== realCurrentMonthStr;

    if (currentDay <= 8 && isPastDeadlineMonth && hasValues) {
      return {
        isUrgent: true,
        message: `🚨 Achtung Abgabefrist: Sie haben ungesendete Zählerstände für den Monat ${reportData?.month}! Bitte exportieren Sie den Report sofort als Excel und senden ihn an die Vertriebsleitung (VL)!`,
      };
    }

    return {
      isUrgent: false,
      message: `ℹ️ Hinweis für den Monatsabschluss: Bitte senden Sie den Report bis spätestens zum 8. des Folgemonats als Excel-Datei an die Vertriebsleitung (VL).`,
    };
  };

  const deadlineInfo = getDeadlineAlert();

  // --- VALUE UPDATERS ---
  const handleValueChange = useCallback((id: string, val: number | "") => {
    setReportData((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [id]: val,
      },
    }));
  }, []);

  // --- STAMPELUHR HANDLERS ---
  const handleClockIn = useCallback(() => {
    triggerHaptic(25);
    const nowISO = new Date().toISOString();
    setClockInTime(nowISO);
    safeSetItem("aussendienst_pwa_clock_in_time_v2", nowISO);
    triggerToast("🟢 Eingestempelt!");

    const timeStr = new Date().toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    announceToAriaAndSpeech(
      `Erfolgreich eingestempelt um ${timeStr} Uhr. Gute Schicht!`,
      true,
    );
  }, [announceToAriaAndSpeech]);

  const handleClockOut = useCallback((newLog: TimeLog) => {
    triggerHaptic(25);

    // 1. Add log to list
    setReportData((prev) => {
      const updatedLogs = [
        ...(Array.isArray(prev.timeLogs) ? prev.timeLogs : []),
        newLog,
      ];

      const currentOffice = typeof prev.values.std_buero === "number" ? prev.values.std_buero : 0;
      const currentField = typeof prev.values.std_aussendienst === "number" ? prev.values.std_aussendienst : 0;
      const currentWorkDays = typeof prev.values.tage_arbeit === "number" ? prev.values.tage_arbeit : 0;

      const newValues = {
        ...prev.values,
        std_buero: Math.round((currentOffice + newLog.officeHours) * 100) / 100,
        std_aussendienst:
          Math.round((currentField + newLog.fieldHours) * 100) / 100,
        tage_arbeit: currentWorkDays + 1,
      };

      return {
        ...prev,
        values: newValues,
        timeLogs: updatedLogs,
      };
    });

    // 3. Reset clock-in timer
    setClockInTime(null);
    localStorage.removeItem("aussendienst_pwa_clock_in_time_v2");

    triggerToast("🔴 Ausgestempelt & Schicht verbucht!");
    announceToAriaAndSpeech(
      `Erfolgreich ausgestempelt. Schicht über ${newLog.duration.toFixed(2)} Stunden wurde verbucht.`,
      true,
    );
  }, [announceToAriaAndSpeech]);

  const handleDeleteLog = useCallback((logToDelete: TimeLog) => {
    triggerHaptic(20);

    setReportData((prev) => {
      const updatedLogs = (
        Array.isArray(prev.timeLogs) ? prev.timeLogs : []
      ).filter((l) => l.id !== logToDelete.id);

      const currentOffice = typeof prev.values.std_buero === "number" ? prev.values.std_buero : 0;
      const currentField = typeof prev.values.std_aussendienst === "number" ? prev.values.std_aussendienst : 0;
      const currentWorkDays = typeof prev.values.tage_arbeit === "number" ? prev.values.tage_arbeit : 0;

      const newValues = {
        ...prev.values,
        std_buero: Math.max(0, Math.round((currentOffice - logToDelete.officeHours) * 100) / 100),
        std_aussendienst: Math.max(0, Math.round((currentField - logToDelete.fieldHours) * 100) / 100),
        tage_arbeit: Math.max(0, currentWorkDays - 1),
      };

      return {
        ...prev,
        values: newValues,
        timeLogs: updatedLogs,
      };
    });

    triggerToast("✓ Schicht gelöscht & Stunden korrigiert!");
    announceToAriaAndSpeech(
      `Schicht gelöscht. Stunden wurden automatisch korrigiert.`,
      true,
    );
  }, [announceToAriaAndSpeech]);

  const handleManualLogAdd = useCallback((newLog: TimeLog) => {
    triggerHaptic(25);

    setReportData((prev) => {
      const updatedLogs = [
        ...(Array.isArray(prev.timeLogs) ? prev.timeLogs : []),
        newLog,
      ];

      const currentOffice = typeof prev.values.std_buero === "number" ? prev.values.std_buero : 0;
      const currentField = typeof prev.values.std_aussendienst === "number" ? prev.values.std_aussendienst : 0;
      const currentWorkDays = typeof prev.values.tage_arbeit === "number" ? prev.values.tage_arbeit : 0;

      const newValues = {
        ...prev.values,
        std_buero: Math.round((currentOffice + newLog.officeHours) * 100) / 100,
        std_aussendienst:
          Math.round((currentField + newLog.fieldHours) * 100) / 100,
        tage_arbeit: currentWorkDays + 1,
      };

      return {
        ...prev,
        values: newValues,
        timeLogs: updatedLogs,
      };
    });

    triggerToast("✓ Schicht manuell nachgetragen!");
    announceToAriaAndSpeech(
      `Schicht über ${newLog.duration.toFixed(2)} Stunden erfolgreich manuell nachgetragen.`,
      true,
    );
  }, [announceToAriaAndSpeech]);

  const handleMetaChange = useCallback((
    key: keyof Omit<ReportData, "values">,
    val: string,
  ) => {
    setReportData((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleMonthChange = (newMonth: string) => {
    if (!newMonth) return;

    // 1. Save current active month state to history first if it has any meaningful content
    const currentMonth = reportData?.month;
    const hasData =
      reportData?.name ||
      reportData?.notes ||
      Object.values(reportData?.values || {}).some(
        (v) => typeof v === "number" && v > 0,
      ) ||
      (reportData?.timeLogs && reportData?.timeLogs.length > 0);

    let updatedHistory = { ...history };
    if (hasData && currentMonth) {
      updatedHistory[currentMonth] = {
        month: currentMonth,
        name: reportData?.name,
        notes: reportData?.notes,
        values: reportData?.values,
        timeLogs: reportData?.timeLogs || [],
        fieldsSnapshot: appFields,
        savedAt: new Date().toISOString(),
      };
      setHistory(updatedHistory);
      set("aussendienst_pwa_history", updatedHistory);
    }

    // 2. Load the target month state from history or start fresh
    const savedRecord = updatedHistory[newMonth];
    if (savedRecord) {
      setReportData({
        month: newMonth,
        name: savedRecord.name || reportData?.name,
        notes: savedRecord.notes || "",
        values: savedRecord.values || {},
        timeLogs: savedRecord.timeLogs || [],
      });
      if (savedRecord.fieldsSnapshot) {
        setAppFields(savedRecord.fieldsSnapshot);
      }
      triggerToast(`Daten für ${formatMonthGerman(newMonth)} geladen!`);
      announceToAriaAndSpeech(
        `Daten für ${formatMonthGerman(newMonth)} erfolgreich geladen.`,
        true,
      );
    } else {
      // Start a fresh month template, but retain user name
      setReportData({
        month: newMonth,
        name: reportData?.name,
        notes: "",
        values: {},
        timeLogs: [],
      });
      triggerToast(
        `Neues Formular für ${formatMonthGerman(newMonth)} gestartet!`,
      );
      announceToAriaAndSpeech(
        `Neues leeres Formular für ${formatMonthGerman(newMonth)} gestartet.`,
        true,
      );
    }
  };

  const handleLoadMonthFromHistory = (monthStr: string) => {
    handleMonthChange(monthStr);
    setActiveTab("form");
  };

  const handleDeleteRecordFromHistory = (monthStr: string) => {
    setHistory((prev) => {
      const updated = { ...prev };
      delete updated[monthStr];
      set("aussendienst_pwa_history", updated);
      return updated;
    });
  };

  const getPreviousSavedMonthRecord = (): HistoryRecord | null => {
    const savedMonths = Object.keys(history).filter(
      (m) => m !== reportData?.month,
    );
    if (savedMonths.length === 0) return null;
    // Sort descending to get the closest chronologically saved month
    savedMonths.sort((a, b) => b.localeCompare(a));
    return history[savedMonths[0]];
  };

  const handleCopyPreviousMonth = () => {
    const prevRecord = getPreviousSavedMonthRecord();
    if (!prevRecord) return;

    const formattedMonth = formatMonthGerman(prevRecord.month);
    if (
      confirm(
        `Möchten Sie die Zahlen und Kategorien aus dem Monat "${formattedMonth}" als Vorlage kopieren? Ihre aktuellen Zählerstände für diesen Monat werden überschrieben.`,
      )
    ) {
      setReportData((prev) => ({
        ...prev,
        notes: prevRecord.notes || "",
        values: prevRecord.values || {},
      }));
      if (prevRecord.fieldsSnapshot) {
        setAppFields(prevRecord.fieldsSnapshot);
      }
      triggerToast(`Vorlage von ${formattedMonth} erfolgreich geladen!`);
      announceToAriaAndSpeech(
        `Vorlage von ${formattedMonth} erfolgreich geladen.`,
        true,
      );
    }
  };

  // --- DICTATION ENGINE ---
  const toggleDictation = () => {
    triggerHaptic(20);
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      triggerToast(
        "Spracherkennung wird von diesem Browser leider nicht unterstützt.",
      );
      announceToAriaAndSpeech(
        "Fehler: Spracherkennung nicht unterstützt",
        true,
      );
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

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
      triggerToast("🎤 Spracheingabe gestartet... Bitte sprechen Sie jetzt.");
      announceToAriaAndSpeech("Sprachaufnahme gestartet", true);
    };

    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      if (text) {
        handleMetaChange(
          "notes",
          reportData?.notes + (reportData?.notes ? " " : "") + text,
        );
        triggerToast("✓ Sprache erfolgreich in Text umgewandelt!");
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
  };

  // --- ACOUSTIC AUDITOR / SUMMARY READBACK ---
  const handleReadSummaryAloud = () => {
    triggerHaptic(20);

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      triggerToast(
        "Sprachausgabe wird in diesem Browser leider nicht unterstützt.",
      );
      return;
    }

    if (isReadingSummary) {
      window.speechSynthesis.cancel();
      setIsReadingSummary(false);
      triggerToast("Vorlesen gestoppt.");
      announceToAriaAndSpeech("Zusammenfassung gestoppt.", true);
      return;
    }

    // Compile summary text
    const formattedMonth = formatMonthGerman(reportData?.month);
    const parts: string[] = [];
    parts.push(`Zusammenfassung für ${formattedMonth}.`);
    if (reportData?.name) {
      parts.push(`Mitarbeiter: ${reportData?.name}.`);
    }

    // Iterate through sections and find values > 0
    let valueFound = false;

    // Helper to extract non-zero fields from a section
    const getSectionSummaryText = (title: string, fields: FieldConfig[]) => {
      const sectionParts: string[] = [];
      fields.forEach((f) => {
        const val = (reportData?.values || {})[f.id];
        if (typeof val === "number" && val > 0) {
          sectionParts.push(`${f.label}: ${val}`);
          valueFound = true;
        }
      });
      if (sectionParts.length > 0) {
        return `Im Bereich ${title}: ${sectionParts.join(". ")}.`;
      }
      return "";
    };

    const s1Text = getSectionSummaryText(
      "Vorführungen und Auslieferungen",
      appFields.s1,
    );
    if (s1Text) parts.push(s1Text);

    const s2Text = getSectionSummaryText(
      "Schulung, Support und Akquise",
      appFields.s2,
    );
    if (s2Text) parts.push(s2Text);

    const s3Text = getSectionSummaryText("Spezialprodukte", appFields.s3);
    if (s3Text) parts.push(s3Text);

    const s4Text = getSectionSummaryText("Arbeitszeit und Büro", appFields.s4);
    if (s4Text) parts.push(s4Text);

    if (reportData?.notes && reportData?.notes.trim()) {
      parts.push(`Notizen: ${reportData?.notes}.`);
      valueFound = true;
    }

    if (!valueFound) {
      parts.push("Es wurden noch keine Werte für diesen Monat eingetragen.");
    } else {
      parts.push("Bericht vollständig vorgelesen.");
    }

    const textToSpeak = parts.join(" ");

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "de-DE";
      utterance.rate = accessibility.speechRate || 1.0;

      utterance.onstart = () => {
        setIsReadingSummary(true);
        triggerToast("🔊 Zusammenfassung wird vorgelesen...");
      };

      utterance.onend = () => {
        setIsReadingSummary(false);
        triggerToast("✓ Zusammenfassung beendet.");
      };

      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis utterance error", e);
        setIsReadingSummary(false);
        if (e.error === "not-allowed") {
          triggerToast(
            "Info: Sprachausgabe im Vorschaufenster durch Browser blockiert.",
          );
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
  };

  const addTimestamp = () => {
    triggerHaptic(15);
    const d = new Date();
    const dStr = `[${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.] `;
    handleMetaChange(
      "notes",
      reportData?.notes + (reportData?.notes ? "\n" : "") + dStr,
    );
    triggerToast("Datumstempel eingefügt");
    announceToAriaAndSpeech("Datumstempel im Kommentarfeld eingefügt.", true);
  };

  const handleApplyNoteTemplate = (templateText: string) => {
    triggerHaptic(15);
    const updatedNotes = reportData?.notes
      ? `${reportData?.notes}\n${templateText}`
      : templateText;
    handleMetaChange("notes", updatedNotes);
    triggerToast("Vorlage angehängt!");
    announceToAriaAndSpeech("Notiz-Vorlage erfolgreich angehängt.", true);
  };

  // --- MOBILE TOUCH-ACCESSORY NAVIGATION HELPERS ---
  const getVisibleFields = (): FieldConfig[] => {
    if (activeSectionTab === "all") {
      return [
        ...appFields.s1,
        ...appFields.s2,
        ...appFields.s3,
        ...appFields.s4,
      ];
    } else {
      return appFields[activeSectionTab as keyof SectionsConfig] || [];
    }
  };

  const getFieldSectionInfo = (fieldId: string) => {
    if (appFields.s1.some((f) => f.id === fieldId))
      return { num: 1, name: "Vorführungen" };
    if (appFields.s2.some((f) => f.id === fieldId))
      return { num: 2, name: "Schulung & Support" };
    if (appFields.s3.some((f) => f.id === fieldId))
      return { num: 3, name: "Spezialprodukte" };
    if (appFields.s4.some((f) => f.id === fieldId))
      return { num: 4, name: "Arbeitszeit" };
    return { num: 1, name: "Kategorie" };
  };

  const handleNavigateField = (direction: "prev" | "next") => {
    triggerHaptic(15);
    const fields = getVisibleFields();
    if (fields.length === 0) return;

    const currentIndex = fields.findIndex((f) => f.id === focusedFieldId);
    let targetIndex = 0;

    if (currentIndex !== -1) {
      if (direction === "next") {
        targetIndex = (currentIndex + 1) % fields.length;
      } else {
        targetIndex = (currentIndex - 1 + fields.length) % fields.length;
      }
    } else {
      targetIndex = 0;
    }

    const targetField = fields[targetIndex];
    if (targetField) {
      setTimeout(() => {
        const inputEl = document.getElementById(
          `input-${targetField.id}`,
        ) as HTMLInputElement | null;
        if (inputEl) {
          inputEl.focus();
          inputEl.select();
          announceToAriaAndSpeech(`Gewechselt zu ${targetField.label}.`);
        }
      }, 50);
    }
  };

  // --- CALC SECTION TOTALS HELPER ---
  const getSectionTotal = (sectionFields: typeof appFields.s1) => {
    let total = 0;
    sectionFields.forEach((field) => {
      const val = (reportData?.values || {})[field.id];
      if (typeof val === "number") total += val;
    });
    return total;
  };

  // --- CUSTOM FIELD GENERATOR ---
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFieldName.trim();
    if (!name) {
      triggerToast("Bitte geben Sie einen gültigen Namen ein.");
      return;
    }

    const fieldId = `custom_${Date.now()}`;
    const newField: FieldConfig = {
      id: fieldId,
      label: name,
      step: newFieldStep,
      isCustom: true,
      icon: newFieldIcon,
    };

    setAppFields((prev) => ({
      ...prev,
      [newFieldSection]: [...prev[newFieldSection], newField],
    }));

    setNewFieldName("");
    setNewFieldIcon("⭐");
    triggerToast(`Kategorie "${name}" wurde erfolgreich hinzugefügt!`);
    announceToAriaAndSpeech(
      `Neue Kategorie ${name} in Bereich ${newFieldSection} hinzugefügt`,
    );
  };

  const handleDeleteField = (
    sectionKey: keyof SectionsConfig,
    fieldId: string,
    label: string,
  ) => {
    triggerHaptic(25);
    if (
      confirm(
        `Möchten Sie die Kategorie "${label}" wirklich unwiderruflich löschen?`,
      )
    ) {
      setAppFields((prev) => ({
        ...prev,
        [sectionKey]: prev[sectionKey].filter((f) => f.id !== fieldId),
      }));

      // Also clean up value
      const updatedValues = { ...(reportData?.values || {}) };
      delete updatedValues[fieldId];
      setReportData((prev) => ({ ...prev, values: updatedValues }));

      triggerToast(`Kategorie "${label}" wurde gelöscht.`);
      announceToAriaAndSpeech(`Kategorie ${label} gelöscht.`);
    }
  };

  const handleFactoryResetFields = () => {
    triggerHaptic(40);
    if (
      confirm(
        "Möchten Sie alle Formularfelder wirklich auf den Auslieferungszustand zurücksetzen? Alle Ihre selbst erstellten Kategorien werden gelöscht.",
      )
    ) {
      setAppFields(DEFAULT_FIELDS_CONFIG);
      setReportData((prev) => ({ ...prev, values: {} }));
      setActiveTab("options");
      triggerToast("Erfolgreich auf Standard-Felder zurückgesetzt!");
      announceToAriaAndSpeech(
        "Formular erfolgreich auf Standardfelder zurückgesetzt.",
      );
    }
  };

  // --- START NEW MONTH (ARCHIVE & RESET) ---
  const handleStartNewMonth = () => {
    triggerHaptic(40);
    const currentMonth = reportData?.month;
    if (!currentMonth) return;

    // Calculate next month
    const [yearStr, monthStr] = currentMonth.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;

    // Trigger month change - this saves the current month into history and opens the next one fresh (cleared)
    handleMonthChange(nextMonthStr);
  };

  // --- BACKUP RESTORE ---
  const handleRestoreFromBackup = (
    fields: SectionsConfig,
    restoredReport: any,
  ) => {
    setAppFields(fields);
    setReportData((prev) => {
      // Compatibility fallback: if restoredReport is just the raw values dictionary
      if (
        restoredReport &&
        typeof restoredReport === "object" &&
        !("values" in restoredReport)
      ) {
        return {
          ...prev,
          values: restoredReport || {},
        };
      }
      // If it is the full ReportData object
      return {
        month: restoredReport?.month || prev.month,
        name: restoredReport?.name || prev.name,
        notes: restoredReport?.notes || prev.notes,
        values: restoredReport?.values || {},
      };
    });
    setActiveTab("options");
    triggerToast("Backup erfolgreich geladen!");
    announceToAriaAndSpeech("Backup erfolgreich wiederhergestellt.");
  };

  
  // --- OFFLINE SYNC (Send to VL) ---
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === 'SYNC_SUCCESS') {
          triggerToast("Bericht " + event.data.month + " wurde erfolgreich im Hintergrund versendet!");
          announceToAriaAndSpeech("Bericht erfolgreich versendet.");
        }
      });
    }
  }, []);

  const handleSendToVL = async () => {
    triggerHaptic(25);
    if (!reportData) return;
    
    const request = indexedDB.open('rv-sync-db', 1);
    
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = async (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('sync-queue', 'readwrite');
      const store = tx.objectStore('sync-queue');
      const syncRecord = {
        id: Date.now().toString(),
        data: JSON.parse(JSON.stringify(reportData)),
        timestamp: new Date().toISOString()
      };
      store.add(syncRecord);
      
      tx.oncomplete = async () => {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          try {
            const registration = await navigator.serviceWorker.ready;
            await (registration as any).sync.register('sync-reports');
            triggerToast("Report wurde in die Sende-Warteschlange (Offline-Sync) gestellt.");
            announceToAriaAndSpeech("Report zum Senden eingereiht.");
          } catch (err) {
            console.error("Background sync failed to register", err);
            triggerToast("Report in der Warteschlange gespeichert.");
          }
        } else {
          // Fallback if background sync is not supported
          triggerToast("Ihr Browser unterstützt keinen Background Sync. Gespeichert für späteren Versand.");
        }
      };
    };
    
    request.onerror = (e) => {
      console.error("Failed to open sync DB", e);
      triggerToast("Fehler beim Vorbereiten des Versands.");
    };
  };

  
  // --- TEMPLATES ---
  const applyTemplate = (templateName: string) => {
    triggerHaptic(20);
    if (!reportData) return;
    
    let newValues = { ...(reportData.values || {}) };
    let newNotes = reportData.notes || "";

    switch (templateName) {
      case "Geraete-Erprobung":
        newValues["vf_arbeit"] = (newValues["vf_arbeit"] || 0) + 1;
        newValues["std_aussendienst"] = (newValues["std_aussendienst"] || 0) + 2.5;
        newNotes = (newNotes ? newNotes + "\n" : "") + "Standard Geräte-Erprobung durchgeführt.";
        announceToAriaAndSpeech("Template Geräte-Erprobung angewendet.");
        triggerToast("🚀 Template: Geräte-Erprobung geladen");
        break;
      case "Buerotag":
        newValues["std_buero"] = (newValues["std_buero"] || 0) + 8;
        newValues["tage_arbeit"] = (newValues["tage_arbeit"] || 0) + 1;
        newNotes = (newNotes ? newNotes + "\n" : "") + "Regulärer Bürotag.";
        announceToAriaAndSpeech("Template Bürotag angewendet.");
        triggerToast("☕ Template: Bürotag geladen");
        break;
      case "Schulung":
        newValues["schul_vorort"] = (newValues["schul_vorort"] || 0) + 1;
        newValues["std_aussendienst"] = (newValues["std_aussendienst"] || 0) + 4;
        newNotes = (newNotes ? newNotes + "\n" : "") + "Schulung vor Ort durchgeführt.";
        announceToAriaAndSpeech("Template Schulung angewendet.");
        triggerToast("🎓 Template: Schulung geladen");
        break;
    }

    setReportData({
      ...reportData,
      values: newValues,
      notes: newNotes,
    });
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = async () => {
    triggerHaptic(25);
    const XLSX = await import("xlsx");
    const monthVal = reportData?.month || "Monat";
    const nameVal = reportData?.name || "Mitarbeitende_r";
    const getVal = (id: string) => {
      const val = (reportData?.values || {})[id];
      return typeof val === "number" ? val : 0;
    };

    const excelRows: any[][] = [];
    excelRows.push(["MONATSÜBERSICHT AUßENDIENST - BARRIEREFREI"]);
    excelRows.push(["Erstellt mit der barrierefreien RV Mobil App"]);
    excelRows.push([]);
    excelRows.push(["Monat / Jahr:", monthVal]);
    excelRows.push(["Name (Mitarbeiter/in):", nameVal]);
    excelRows.push([]);

    // 1. VORFÜHRUNGEN & AUSLIEFERUNGEN
    excelRows.push([
      "1. VORFÜHRUNGEN & AUSLIEFERUNGEN",
      "Anzahl / Zählerstand",
    ]);
    const startRowS1 = excelRows.length + 1;
    appFields.s1.forEach((i) => {
      excelRows.push([i.label, getVal(i.id)]);
    });
    const endRowS1 = excelRows.length;
    excelRows.push([
      "Gesamt (Bereich 1)",
      { t: "n", f: `SUM(B${startRowS1}:B${endRowS1})` },
    ]);
    const totalS1Row = excelRows.length;
    excelRows.push([]);

    // 2. SCHULUNG, SUPPORT & AKQUISE
    excelRows.push(["2. SCHULUNG, SUPPORT & AKQUISE", "Anzahl / Zählerstand"]);
    const startRowS2 = excelRows.length + 1;
    appFields.s2.forEach((i) => {
      excelRows.push([i.label, getVal(i.id)]);
    });
    const endRowS2 = excelRows.length;
    excelRows.push([
      "Gesamt (Bereich 2)",
      { t: "n", f: `SUM(B${startRowS2}:B${endRowS2})` },
    ]);
    const totalS2Row = excelRows.length;
    excelRows.push([]);

    // 3. SPEZIALPRODUKTE (DETAILS)
    excelRows.push(["3. SPEZIALPRODUKTE (DETAILS)", "Anzahl / Zählerstand"]);
    const startRowS3 = excelRows.length + 1;
    appFields.s3.forEach((i) => {
      excelRows.push([i.label, getVal(i.id)]);
    });
    const endRowS3 = excelRows.length;
    excelRows.push([
      "Gesamt (Bereich 3)",
      { t: "n", f: `SUM(B${startRowS3}:B${endRowS3})` },
    ]);
    const totalS3Row = excelRows.length;
    excelRows.push([]);

    // 4. ARBEITSZEIT & BÜRO
    excelRows.push(["4. ARBEITSZEIT & BÜRO", "Wert / Stunden"]);
    const startRowS4 = excelRows.length + 1;
    appFields.s4.forEach((i) => {
      excelRows.push([i.label, getVal(i.id)]);
    });
    const endRowS4 = excelRows.length;
    excelRows.push([
      "Gesamt (Bereich 4)",
      { t: "n", f: `SUM(B${startRowS4}:B${endRowS4})` },
    ]);
    excelRows.push([]);

    // Summary section
    excelRows.push(["GESAMT-ZUSAMMENFASSUNG"]);
    excelRows.push([
      "Gesamt-Aktivitäten (Bereich 1 + 2 + 3)",
      { t: "n", f: `B${totalS1Row}+B${totalS2Row}+B${totalS3Row}` },
    ]);
    excelRows.push([]);

    excelRows.push(["Anmerkungen & Kommentare:"]);
    excelRows.push([reportData?.notes || "Keine Anmerkungen eingetragen."]);

    const ws = XLSX.utils.aoa_to_sheet(excelRows);

    // Set widths
    ws["!cols"] = [{ wch: 54 }, { wch: 22 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monatsreport");

    const cleanName = nameVal.replace(/\s+/g, "_") || "Mitarbeiter";
    const formattedMonthName = formatMonthGerman(monthVal).replace(/\s+/g, "_");
    const fileName = `RV_Mobil_Report_${cleanName}_${formattedMonthName}.xlsx`;

    // Try web sharing API first
    if (navigator.share && navigator.canShare) {
      try {
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new File([wbout], fileName, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        if (navigator.canShare({ files: [file] })) {
          navigator
            .share({
              title: "Außendienst Monatsreport",
              text: `Anbei der aktuelle Monatsreport für ${formatMonthGerman(monthVal)}`,
              files: [file],
            })
            .then(() => {
              triggerToast("Report erfolgreich geteilt!");
              announceToAriaAndSpeech("Teilen-Dialog erfolgreich geöffnet.");
            })
            .catch((err) => {
              console.log(
                "Sharing cancelled or failed, falling back to download",
                err,
              );
              XLSX.writeFile(wb, fileName);
              triggerToast("Excel-Report erfolgreich heruntergeladen!");
              announceToAriaAndSpeech("Excel-Report heruntergeladen.");
            });
          return;
        }
      } catch (e) {
        console.warn("Share API was blocked, using standard download.", e);
      }
    }

    // Standard download fallback
    XLSX.writeFile(wb, fileName);
    triggerToast("Excel-Report erfolgreich heruntergeladen!");
    announceToAriaAndSpeech("Excel-Report heruntergeladen.");
  };

  // --- EXPORT TIME LOGS TO EXCEL (Variante B) ---
  const handleExportTimeLogsExcel = async () => {
    triggerHaptic(25);
    const XLSX = await import("xlsx");
    const monthVal = reportData?.month || "Monat";
    const nameVal = reportData?.name || "Mitarbeitende_r";
    const logs = (
      Array.isArray(reportData?.timeLogs) ? [...reportData?.timeLogs] : []
    ).sort((a, b) => a.date.localeCompare(b.date));

    if (logs.length === 0) {
      triggerToast("Keine Zeiterfassungsdaten vorhanden!");
      announceToAriaAndSpeech(
        "Keine Zeiterfassungsdaten zum Exportieren vorhanden.",
      );
      return;
    }

    const excelRows: any[][] = [];
    excelRows.push(["ARBEITSZEITERFASSUNG & STEMPELUHR - RV AUßENDIENST"]);
    excelRows.push(["Erstellt mit der barrierefreien RV Mobil App"]);
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
      "Kommentar / Ort / Besuchte Schule",
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
        log.notes || "",
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
      "",
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
      { wch: 45 }, // Kommentar
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Arbeitszeiten");

    const cleanName = nameVal.replace(/\s+/g, "_") || "Mitarbeiter";
    const formattedMonthName = formatMonthGerman(monthVal).replace(/\s+/g, "_");
    const fileName = `RV_Zeiterfassung_${cleanName}_${formattedMonthName}.xlsx`;

    // Try web sharing API first
    if (navigator.share && navigator.canShare) {
      try {
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new File([wbout], fileName, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        if (navigator.canShare({ files: [file] })) {
          navigator
            .share({
              title: "RV Zeiterfassung",
              text: `Anbei das Zeiterfassungs-Protokoll für ${formatMonthGerman(monthVal)}`,
              files: [file],
            })
            .then(() => {
              triggerToast("Zeiterfassung erfolgreich geteilt!");
              announceToAriaAndSpeech(
                "Zeiterfassung-Teilen-Dialog erfolgreich geöffnet.",
              );
            })
            .catch((err) => {
              console.log(
                "Sharing cancelled or failed, falling back to download",
                err,
              );
              XLSX.writeFile(wb, fileName);
              triggerToast("Zeiterfassung erfolgreich heruntergeladen!");
              announceToAriaAndSpeech("Zeiterfassung heruntergeladen.");
            });
          return;
        }
      } catch (e) {
        console.warn("Share API was blocked, using standard download.", e);
      }
    }

    // Standard download fallback
    XLSX.writeFile(wb, fileName);
    triggerToast("Zeiterfassung erfolgreich heruntergeladen!");
    announceToAriaAndSpeech("Zeiterfassung heruntergeladen.");
  };

  // --- COMPUTE LIVE TOTALS FOR DASHBOARD ---
  const s1Total = getSectionTotal(appFields.s1);
  const s2Total = getSectionTotal(appFields.s2);
  const s3Total = getSectionTotal(appFields.s3);

  const s4Hours = (() => {
    let hours = 0;
    appFields.s4.forEach((f) => {
      if (
        f.id.includes("std") ||
        f.label.toLowerCase().includes("stunden") ||
        f.step === 0.5
      ) {
        const v = (reportData?.values || {})[f.id];
        if (typeof v === "number") hours += v;
      }
    });
    return hours;
  })();

  // --- REAL-TIME LIVE SEARCH FILTER HELPERS ---
  const filterFields = (fields: FieldConfig[]): FieldConfig[] => {
    if (!searchQuery) return fields;
    const q = searchQuery.toLowerCase().trim();
    return fields.filter((f) => f.label.toLowerCase().includes(q));
  };

  const hasVisibleFields = (fields: FieldConfig[]): boolean => {
    return filterFields(fields).length > 0;
  };

  // Initial loading from idb-keyval
  useEffect(() => {
    async function loadData() {
      try {
        const [savedData, savedHistory] = await Promise.all([
          get("aussendienst_pwa_data"),
          get("aussendienst_pwa_history")
        ]);
        
        // Handle emergency synchronous save fallback
        const emergencyData = localStorage.getItem("aussendienst_pwa_emergency_data");
        let initialData = savedData;
        if (emergencyData) {
          try {
            initialData = JSON.parse(emergencyData);
            localStorage.removeItem("aussendienst_pwa_emergency_data");
          } catch (e) {}
        }

        if (initialData) {
          setReportData(initialData);
        } else {
          const d = new Date();
          const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          setReportData({ month: currentMonthStr, name: "", notes: "", values: {}, timeLogs: [] });
        }

        if (savedHistory) {
          setHistory(savedHistory);
        } else {
          setHistory({});
        }
      } catch (e) {
        console.error("Failed to load from IDB", e);
        const d = new Date();
        const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        setReportData({ month: currentMonthStr, name: "", notes: "", values: {}, timeLogs: [] });
        setHistory({});
      }
    }
    loadData();
  }, []);

  // Emergency synchronous save on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && reportData) {
        // Synchronous emergency save to localStorage to prevent data loss on iOS swipe-close
        localStorage.setItem("aussendienst_pwa_emergency_data", JSON.stringify(reportData));
        // Also trigger async save just in case
        set("aussendienst_pwa_data", reportData).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [reportData]);

  if (!reportData || !history) {
    return <div className="flex h-screen w-screen items-center justify-center bg-gray-100 text-gray-500">Lade Daten...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
      {/* Off-screen live announcer region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {activeTab === "form" && (
        <div className="animate-fade-in pb-24">
          {/* HEADER SECTION (Accessible, modern responsive layout, removed duplicate buttons for clean tidiness) */}
          <header
            className="p-5 mb-4 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)] flex flex-col md:flex-row md:items-center md:justify-between gap-5"
            role="banner"
          >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-color)]">
              RV Mobil
            </h1>
          </div>

          {/* Offline Auto-Save live status feedback */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider pt-1">
            {saveStatus === "saving" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Speichert lokal...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Automatisch lokal gesichert ({lastSavedTime})</span>
              </>
            )}
          </div>
        </div>

        {/* Right side: Compact inline Stammdaten inputs for ultra-clear visibility */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto md:max-w-md bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-dashed border-[var(--border-color)]">
          {/* Month input */}
          <div className="flex-1 min-w-[130px] space-y-1">
            <label
              htmlFor="meta-month-input"
              className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1"
            >
              <Calendar className="w-3 h-3 text-[var(--accent)]" />{" "}
              Berichtsmonat:
            </label>
            <input
              id="meta-month-input"
              type="month"
              value={reportData?.month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full px-2 py-1.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg text-xs font-bold focus:border-[var(--border-focus)] outline-none"
              aria-required="true"
            />
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className="text-[9px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer p-0.5 rounded"
              aria-label="Frühere Monate aus dem RV Archiv wählen"
            >
              <History className="w-2.5 h-2.5" />
              <span>Monats-Archiv</span>
            </button>
          </div>

          {/* Name input */}
          <div className="flex-1 min-w-[155px] space-y-1">
            <label
              htmlFor="meta-name-input"
              className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1"
            >
              <User className="w-3 h-3 text-[var(--accent)]" /> Mitarbeiter/in:
            </label>
            <input
              id="meta-name-input"
              type="text"
              placeholder="Name..."
              value={
                typeof reportData?.name === "string"
                  ? reportData?.name
                  : String(reportData?.name || "")
              }
              onChange={(e) => handleMetaChange("name", e.target.value)}
              className="w-full px-2 py-1.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg text-xs font-bold focus:border-[var(--border-focus)] outline-none"
              autoComplete="name"
              aria-required="true"
            />
            <span className="block text-[8px] text-[var(--text-muted)] font-semibold pt-1">
              🔒 DSGVO-sicher lokal
            </span>
          </div>
        </div>
      </header>

      {/* DEADLINE NOTIFICATION BANNER (Sleeker & more compact) */}
      <div
        role="alert"
        className={`p-3.5 mb-4 rounded-xl border flex gap-2.5 items-center text-xs font-semibold leading-snug ${
          deadlineInfo.isUrgent
            ? "bg-red-50 dark:bg-red-950/20 border-red-500 text-red-900 dark:text-red-200 animate-pulse"
            : "bg-[var(--alert-bg)] border-[var(--alert-border)] text-[var(--alert-text)]"
        }`}
      >
        <Info
          className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <p className="flex-1">{deadlineInfo.message}</p>
      </div>

      {/* Bento Header title & interactive filter toggle */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
          📊 Monats-Fortschritt{" "}
          <span className="font-semibold text-xs text-[var(--text-muted)]/70 lowercase">
            (Bereich anklicken zum Filtern)
          </span>
        </span>
        {activeSectionTab !== "all" && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(12);
              setActiveSectionTab("all");
              announceToAriaAndSpeech("Alle Filter aufgehoben.");
            }}
            className="text-[10px] font-black text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 cursor-pointer bg-red-500/10 dark:bg-red-500/20 px-2 py-0.5 rounded-md transition-all active:scale-95"
          >
            <span>Filter aufheben ✕</span>
          </button>
        )}
      </div>

      {/* LIVE BENTO DASHBOARD CARDS (Modern, interactive, responsive, screen-reader optimized metrics dashboard of current totals) */}
      <div className="sticky top-2 z-30 bg-[var(--bg-color)]/95 backdrop-blur-md py-2 -mx-2 px-2 rounded-xl mb-4 shadow-sm border border-[var(--border-color)]">
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
          aria-label="Aktueller Monatsfortschritt Live-Anzeige"
          role="region"
        >
        {/* Card 1: Vorführungen */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setActiveSectionTab(activeSectionTab === "s1" ? "all" : "s1");
            announceToAriaAndSpeech(
              activeSectionTab === "s1"
                ? "Filter auf alle Bereiche zurückgesetzt"
                : "Filter gewechselt auf Bereich 1: Vorführungen",
            );
          }}
          className={`p-3 rounded-2xl border bg-[var(--card-bg)] flex flex-col justify-between shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s1"
              ? "border-2 border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-500/10"
              : "border-[var(--border-color)]"
          }`}
          aria-label={
            goalsConfig.enabled
              ? `Bereich 1: Vorführungen. Aktuelle Summe: ${s1Total} von Monatsziel ${goalsConfig.s1}. Klick, um auf diesen Bereich zu filtern.`
              : `Bereich 1: Vorführungen. Aktuelle Summe: ${s1Total}. Klick, um auf diesen Bereich zu filtern.`
          }
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-tight">
                Vorführungen
              </span>
              <span className="text-lg font-black text-[var(--text-color)] leading-none">
                {s1Total}
                {goalsConfig.enabled && (
                  <span className="text-[10px] font-normal text-[var(--text-muted)] ml-0.5">
                    /{goalsConfig.s1}
                  </span>
                )}
              </span>
            </div>
          </div>
          {goalsConfig.enabled && (
            <div
              className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (s1Total / (goalsConfig.s1 || 1)) * 100)}%`,
                }}
              />
            </div>
          )}
        </button>

        {/* Card 2: Schulungen */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setActiveSectionTab(activeSectionTab === "s2" ? "all" : "s2");
            announceToAriaAndSpeech(
              activeSectionTab === "s2"
                ? "Filter auf alle Bereiche zurückgesetzt"
                : "Filter gewechselt auf Bereich 2: Schulungen & Support",
            );
          }}
          className={`p-3 rounded-2xl border bg-[var(--card-bg)] flex flex-col justify-between shadow-xs hover:border-amber-500/50 transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s2"
              ? "border-2 border-amber-500 ring-2 ring-amber-500/10 bg-amber-500/5 dark:bg-amber-500/10"
              : "border-[var(--border-color)]"
          }`}
          aria-label={
            goalsConfig.enabled
              ? `Bereich 2: Schulungen und Support. Aktuelle Summe: ${s2Total} von Monatsziel ${goalsConfig.s2}. Klick, um auf diesen Bereich zu filtern.`
              : `Bereich 2: Schulungen und Support. Aktuelle Summe: ${s2Total}. Klick, um auf diesen Bereich zu filtern.`
          }
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-tight">
                Schulungen
              </span>
              <span className="text-lg font-black text-[var(--text-color)] leading-none">
                {s2Total}
                {goalsConfig.enabled && (
                  <span className="text-[10px] font-normal text-[var(--text-muted)] ml-0.5">
                    /{goalsConfig.s2}
                  </span>
                )}
              </span>
            </div>
          </div>
          {goalsConfig.enabled && (
            <div
              className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (s2Total / (goalsConfig.s2 || 1)) * 100)}%`,
                }}
              />
            </div>
          )}
        </button>

        {/* Card 3: Spezialprodukte */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setActiveSectionTab(activeSectionTab === "s3" ? "all" : "s3");
            announceToAriaAndSpeech(
              activeSectionTab === "s3"
                ? "Filter auf alle Bereiche zurückgesetzt"
                : "Filter gewechselt auf Bereich 3: Spezialprodukte",
            );
          }}
          className={`p-3 rounded-2xl border bg-[var(--card-bg)] flex flex-col justify-between shadow-xs hover:border-indigo-500/50 transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s3"
              ? "border-2 border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-500/5 dark:bg-indigo-500/10"
              : "border-[var(--border-color)]"
          }`}
          aria-label={
            goalsConfig.enabled
              ? `Bereich 3: Spezialprodukte. Aktuelle Summe: ${s3Total} von Monatsziel ${goalsConfig.s3}. Klick, um auf diesen Bereich zu filtern.`
              : `Bereich 3: Spezialprodukte. Aktuelle Summe: ${s3Total}. Klick, um auf diesen Bereich zu filtern.`
          }
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-tight">
                Spezial
              </span>
              <span className="text-lg font-black text-[var(--text-color)] leading-none">
                {s3Total}
                {goalsConfig.enabled && (
                  <span className="text-[10px] font-normal text-[var(--text-muted)] ml-0.5">
                    /{goalsConfig.s3}
                  </span>
                )}
              </span>
            </div>
          </div>
          {goalsConfig.enabled && (
            <div
              className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (s3Total / (goalsConfig.s3 || 1)) * 100)}%`,
                }}
              />
            </div>
          )}
        </button>

        {/* Card 4: Büro & Arbeitszeit */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setActiveSectionTab(activeSectionTab === "s4" ? "all" : "s4");
            announceToAriaAndSpeech(
              activeSectionTab === "s4"
                ? "Filter auf alle Bereiche zurückgesetzt"
                : "Filter gewechselt auf Bereich 4: Arbeitszeit",
            );
          }}
          className={`p-3 rounded-2xl border bg-[var(--card-bg)] flex flex-col justify-between shadow-xs hover:border-blue-500/50 transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s4"
              ? "border-2 border-blue-500 ring-2 ring-blue-500/10 bg-blue-500/5 dark:bg-blue-500/10"
              : "border-[var(--border-color)]"
          }`}
          aria-label={
            goalsConfig.enabled
              ? `Bereich 4: Arbeitszeit. Aktuelle Summe: ${s4Hours} Stunden von Monatsziel ${goalsConfig.s4} Stunden. Klick, um auf diesen Bereich zu filtern.`
              : `Bereich 4: Arbeitszeit. Aktuelle Summe: ${s4Hours} Stunden. Klick, um auf diesen Bereich zu filtern.`
          }
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-tight">
                Bürozeit
              </span>
              <span className="text-lg font-black text-[var(--text-color)] leading-none">
                {s4Hours}h
                {goalsConfig.enabled && (
                  <span className="text-[10px] font-normal text-[var(--text-muted)] ml-0.5">
                    /{goalsConfig.s4}
                  </span>
                )}
              </span>
            </div>
          </div>
          {goalsConfig.enabled && (
            <div
              className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (s4Hours / (goalsConfig.s4 || 1)) * 100)}%`,
                }}
              />
            </div>
          )}
        </button>
      </div>
      </div>

      {/* ERGONOMIC CONTROLS DASHBOARD (Streamlined, compact & optimized for screen readers) */}
      <div className="mb-3 p-2.5 rounded-xl border bg-[var(--card-bg)] border-[var(--border-color)] space-y-2 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
            Schnell-Optionen
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Compact mode toggle */}
            <button
              type="button"
              aria-label={`Kompakt-Layout ${isCompactView ? "deaktivieren" : "aktivieren"}`}
              onClick={() => {
                triggerHaptic(15);
                setIsCompactView((prev) => !prev);
                triggerToast(
                  !isCompactView
                    ? "Kompakt-Layout aktiviert!"
                    : "Standard-Layout aktiviert!",
                );
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                isCompactView
                  ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs"
                  : "bg-[var(--bg-color)] text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--border-color)]"
              }`}
            >
              <span aria-hidden="true">📐 </span>
              <span>Kompakt</span>
              <span className="text-[9px] bg-black/10 dark:bg-white/10 px-1 py-0.2 rounded font-black uppercase">
                {isCompactView ? "Ein" : "Aus"}
              </span>
            </button>

            {/* Baseline Template Copy Button (Vormonats-Direktkopie) */}
            {getPreviousSavedMonthRecord() && (
              <button
                type="button"
                onClick={handleCopyPreviousMonth}
                aria-label="Vormonats-Werte als Vorlage laden"
                title="Werte des letzten gesicherten Monats als Vorlage laden"
                className="px-2 py-1 rounded-lg text-xs font-bold border bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span aria-hidden="true">📋 </span>
                <span>Vorlage laden</span>
              </button>
            )}

            {/* Acoustic Auditor / summary reader button */}
            <button
              type="button"
              onClick={handleReadSummaryAloud}
              aria-label={
                isReadingSummary
                  ? "Zusammenfassung vorlesen stoppen"
                  : "Zusammenfassung vorlesen"
              }
              title={
                isReadingSummary
                  ? "Vorlesen stoppen"
                  : "Zusammenfassung vorlesen"
              }
              className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                isReadingSummary
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                  : "bg-[var(--bg-color)] text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--border-color)]"
              }`}
            >
              {isReadingSummary ? (
                <>
                  <Square className="w-3 h-3 fill-white" aria-hidden="true" />
                  <span>Stopp</span>
                </>
              ) : (
                <>
                  <Volume2
                    className="w-3 h-3 text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <span>Vorlesen</span>
                </>
              )}
            </button>

            {/* Optional Goals Configuration button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setIsGoalsEditorOpen((prev) => !prev);
              }}
              aria-label="Monatsziele einrichten"
              title="Monatsziele einrichten"
              className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                isGoalsEditorOpen
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : goalsConfig.enabled
                    ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900"
                    : "bg-[var(--bg-color)] text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--border-color)]"
              }`}
            >
              <span aria-hidden="true">🎯 </span>
              <span>Ziele</span>
              <span className="text-[9px] bg-black/10 dark:bg-white/10 px-1 py-0.2 rounded font-black uppercase">
                {goalsConfig.enabled ? "An" : "Aus"}
              </span>
            </button>
          </div>
        </div>

        {/* Inline goals configuration form */}
        {isGoalsEditorOpen && (
          <div
            className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 animate-slide-up"
            role="group"
            aria-label="Ziele-Konfiguration"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-color)] flex items-center gap-1">
                <span>🎯 Monatsziele festlegen</span>
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={goalsConfig.enabled}
                  onChange={(e) => {
                    triggerHaptic(15);
                    updateGoalsConfig({
                      ...goalsConfig,
                      enabled: e.target.checked,
                    });
                    announceToAriaAndSpeech(
                      e.target.checked
                        ? "Monatsziele in den Kacheln aktiviert"
                        : "Monatsziele in den Kacheln ausgeblendet",
                    );
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                  {goalsConfig.enabled ? "Aktiviert" : "Deaktiviert"}
                </span>
              </label>
            </div>

            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Tragen Sie hier Ihre persönlichen Monatsziele ein. Wenn die Ziele
              aktiviert sind, zeigt Ihnen das Dashboard in den Kacheln Ihren
              aktuellen Fortschritt mit farbigen Balken an.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                  Vorführungen
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={goalsConfig.s1 || ""}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    updateGoalsConfig({ ...goalsConfig, s1: val });
                  }}
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg outline-none focus:border-emerald-500"
                  disabled={!goalsConfig.enabled}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                  Schulungen
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={goalsConfig.s2 || ""}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    updateGoalsConfig({ ...goalsConfig, s2: val });
                  }}
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg outline-none focus:border-amber-500"
                  disabled={!goalsConfig.enabled}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                  Spezialprodukte
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={goalsConfig.s3 || ""}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    updateGoalsConfig({ ...goalsConfig, s3: val });
                  }}
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg outline-none focus:border-indigo-500"
                  disabled={!goalsConfig.enabled}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                  Bürozeit (h)
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={goalsConfig.s4 || ""}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    updateGoalsConfig({ ...goalsConfig, s4: val });
                  }}
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg outline-none focus:border-blue-500"
                  disabled={!goalsConfig.enabled}
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Search bar (Incredibly efficient for finding products on-the-go) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 dark:text-slate-600">
              <Search className="w-4 h-4" aria-hidden="true" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nach Produkten oder Kategorien suchen (z.B. WeWalk, Tactonom, Schulung)..."
              aria-label="Nach Produkten oder Kategorien suchen"
              className="w-full pl-9 pr-8 py-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl text-xs font-semibold focus:border-[var(--border-focus)] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Suche löschen"
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-[var(--text-color)]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div {...swipeHandlers} className="w-full">
        {/* SECTION 1: VORFÜHRUNGEN & AUSLIEFERUNGEN */}
        {(activeSectionTab === "all" || activeSectionTab === "s1") &&
          hasVisibleFields(appFields.s1) && (
          <section
            className="p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
            aria-labelledby="section1-heading"
          >
            <h2
              id="section1-heading"
              className="text-lg md:text-xl font-extrabold pb-3 mb-4 border-b-2 border-slate-100 dark:border-slate-800 tracking-tight text-[var(--text-color)]"
            >
              1. Vorführungen & Auslieferungen
            </h2>
            <div className="flex flex-col gap-3">
              {filterFields(appFields.s1).map((field) => (
                <CounterField
                  key={field.id}
                  config={field}
                  value={(reportData?.values || {})[field.id] ?? ""}
                  onChange={(val) => handleValueChange(field.id, val)}
                  onAnnounce={announceToAriaAndSpeech}
                  audioFeedbackEnabled={accessibility.audioFeedback}
                  isCompact={isCompactView}
                  onFocus={() => setFocusedFieldId(field.id)}
                  onBlur={() => {
                    setTimeout(() => {
                      setFocusedFieldId((prev) =>
                        prev === field.id ? null : prev,
                      );
                    }, 120);
                  }}
                />
              ))}
            </div>

            {/* Dynamic section total box with aria live attribute */}
            <div
              className="mt-6 p-4 rounded-xl bg-[var(--total-bg)] text-[var(--total-text)] font-extrabold text-right text-lg border border-[var(--border-color)]"
              aria-live="polite"
            >
              <span>Bereichs-Gesamtsumme: </span>
              <span className="text-xl md:text-2xl ml-1">
                {s1Total}
              </span>
            </div>
          </section>

        )}

      {/* SECTION 2: SCHULUNG, SUPPORT & AKQUISE */}
      {(activeSectionTab === "all" || activeSectionTab === "s2") &&
        hasVisibleFields(appFields.s2) && (
          <section
            className="p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
            aria-labelledby="section2-heading"
          >
            <h2
              id="section2-heading"
              className="text-lg md:text-xl font-extrabold pb-3 mb-4 border-b-2 border-slate-100 dark:border-slate-800 tracking-tight text-[var(--text-color)]"
            >
              2. Schulung, Support & Akquise
            </h2>
            <div className="flex flex-col gap-3">
              {filterFields(appFields.s2).map((field) => (
                <CounterField
                  key={field.id}
                  config={field}
                  value={(reportData?.values || {})[field.id] ?? ""}
                  onChange={(val) => handleValueChange(field.id, val)}
                  onAnnounce={announceToAriaAndSpeech}
                  audioFeedbackEnabled={accessibility.audioFeedback}
                  isCompact={isCompactView}
                  onFocus={() => setFocusedFieldId(field.id)}
                  onBlur={() => {
                    setTimeout(() => {
                      setFocusedFieldId((prev) =>
                        prev === field.id ? null : prev,
                      );
                    }, 120);
                  }}
                />
              ))}
            </div>
          </section>
        )}

      {/* SECTION 3: SPEZIALPRODUKTE (FOKUS) */}
      {(activeSectionTab === "all" || activeSectionTab === "s3") &&
        hasVisibleFields(appFields.s3) && (
          <section
            className="p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
            aria-labelledby="section3-heading"
          >
            <h2
              id="section3-heading"
              className="text-lg md:text-xl font-extrabold pb-3 mb-4 border-b-2 border-slate-100 dark:border-slate-800 tracking-tight text-[var(--text-color)]"
            >
              3. Spezialprodukte (Fokus)
            </h2>
            <div className="flex flex-col gap-3">
              {filterFields(appFields.s3).map((field) => (
                <CounterField
                  key={field.id}
                  config={field}
                  value={(reportData?.values || {})[field.id] ?? ""}
                  onChange={(val) => handleValueChange(field.id, val)}
                  onAnnounce={announceToAriaAndSpeech}
                  audioFeedbackEnabled={accessibility.audioFeedback}
                  isCompact={isCompactView}
                  onFocus={() => setFocusedFieldId(field.id)}
                  onBlur={() => {
                    setTimeout(() => {
                      setFocusedFieldId((prev) =>
                        prev === field.id ? null : prev,
                      );
                    }, 120);
                  }}
                />
              ))}
            </div>
          </section>
        )}

      {/* SECTION 4: ARBEITSZEIT & BÜRO */}
      {(activeSectionTab === "all" || activeSectionTab === "s4") &&
        hasVisibleFields(appFields.s4) && (
          <section
            className="p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
            aria-labelledby="section4-heading"
          >
            <h2
              id="section4-heading"
              className="text-lg md:text-xl font-extrabold pb-3 mb-4 border-b-2 border-slate-100 dark:border-slate-800 tracking-tight text-[var(--text-color)]"
            >
              4. Arbeitszeit & Büro
            </h2>
            {accessibility.enableTimeTracking !== false && (
              <div className="mb-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400 text-xs font-bold flex items-start gap-2">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Diese Werte werden automatisch aus Ihrer Stempeluhr (RV Zeit) berechnet und beim Ausstempeln hier eingetragen.</p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {filterFields(appFields.s4).map((field) => (
                <CounterField
                  key={field.id}
                  config={field}
                  value={(reportData?.values || {})[field.id] ?? ""}
                  onChange={(val) => handleValueChange(field.id, val)}
                  onAnnounce={announceToAriaAndSpeech}
                  audioFeedbackEnabled={accessibility.audioFeedback}
                  isCompact={isCompactView}
                  onFocus={() => setFocusedFieldId(field.id)}
                  onBlur={() => {
                    setTimeout(() => {
                      setFocusedFieldId((prev) =>
                        prev === field.id ? null : prev,
                      );
                    }, 120);
                  }}
                />
              ))}
            </div>
          </section>
        )}

      {/* SEARCH EMPTY STATE */}
      {searchQuery &&
        !hasVisibleFields(appFields.s1) &&
        !hasVisibleFields(appFields.s2) &&
        !hasVisibleFields(appFields.s3) &&
        !hasVisibleFields(appFields.s4) && (
          <div className="p-8 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--card-bg)] mb-5 animate-fade-in">
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Keine passenden Einträge gefunden für "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition-all"
            >
              Suche zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* SECTION 5: NOTES & ANMERKUNGEN */}
      <section
        className="p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
        aria-labelledby="notes-heading"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b-2 border-slate-100 dark:border-slate-800">
          <h2
            id="notes-heading"
            className="text-lg md:text-xl font-extrabold tracking-tight text-[var(--text-color)]"
          >
            Anmerkungen & Kommentare
          </h2>
          <div className="flex items-center gap-2">
            {/* Dictate Speech Input button */}
            <button
              type="button"
              onClick={toggleDictation}
              aria-label={
                isDictating
                  ? "Sprachaufnahme stoppen"
                  : "Notiz per Sprache diktieren"
              }
              className={`py-2 px-3.5 rounded-xl border-2 transition-all cursor-pointer font-extrabold text-sm flex items-center gap-1.5 focus-visible:ring-4 ${
                isDictating
                  ? "bg-red-600 border-red-600 text-white animate-pulse"
                  : "bg-[var(--bg-color)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
              }`}
            >
              {isDictating ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span>{isDictating ? "Stopp" : "Diktieren"}</span>
            </button>

            {/* Timestamp */}
            <button
              type="button"
              onClick={addTimestamp}
              aria-label="Datumstempel in Kommentare einfügen"
              className="py-2 px-3.5 rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:border-[var(--border-focus)] transition-all cursor-pointer font-extrabold text-sm focus-visible:ring-4"
            >
              🗓️ Datumstempel
            </button>
          </div>
        </div>

        <label
          htmlFor="meta-notes-textarea"
          className="text-xs font-bold text-[var(--text-muted)] block mb-2 leading-relaxed"
        >
          Tragen Sie hier wichtige Notizen ein:{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-black">
            🔒 Wird nur auf Ihrem Gerät gespeichert
          </span>
        </label>

        {/* Quick templates for notes (excellent usability for sales reps on mobile) */}
        <div
          className="flex flex-wrap gap-1.5 mb-3"
          aria-label="Schnell-Vorlagen für Notizen"
        >
          {[
            {
              label: "Alles planmäßig 📅",
              text: "Alles planmäßig verlaufen. Keine besonderen Vorkommnisse.",
            },
            {
              label: "Messewoche 🎪",
              text: "Fokus auf Repräsentanz, Messestand-Betreuung und Neukunden-Akquise vor Ort.",
            },
            {
              label: "Erfolgreiche Schulungen 📈",
              text: "Kundenschulungen wurden sehr erfolgreich absolviert mit durchweg positivem Feedback.",
            },
            {
              label: "Urlaubszeit 🏖️",
              text: "Erhöhte Abwesenheiten im Berichtszeitraum wegen Urlaubs-/Ferienzeit.",
            },
          ].map((tpl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyNoteTemplate(tpl.text)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] hover:border-[var(--border-focus)] hover:bg-slate-50 dark:hover:bg-slate-900 text-[11px] font-black text-[var(--text-color)] transition-all cursor-pointer active:scale-95 focus-visible:ring-2"
              title={`Text einfügen: "${tpl.text}"`}
            >
              {tpl.label}
            </button>
          ))}
        </div>

                  <textarea
          id="meta-notes-textarea"
          value={
            typeof reportData?.notes === "string"
              ? reportData?.notes
              : String(reportData?.notes || "")
          }
          onChange={(e) => handleMetaChange("notes", e.target.value)}
          placeholder="Tragen Sie hier z.B. besondere Vorkommnisse oder Messeergebnisse ein..."
          className="w-full h-36 p-4 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-medium focus:border-[var(--border-focus)] outline-none resize-y leading-relaxed"
        />
      </section>

      {/* FINAL ACTION AREA */}
      <section
        className="space-y-3.5"
        aria-label="Monat abschließen und exportieren"
      >
        <button
          type="button"
          onClick={handleStartNewMonth}
          aria-label="Nächsten Monat starten. Der aktuelle Monat wird automatisch im RV Archiv gesichert."
          className="w-full py-4 px-6 rounded-2xl font-black bg-[var(--primary)] hover:opacity-90 text-[var(--primary-text)] text-base md:text-lg flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all active:scale-[0.99] focus-visible:ring-4 mb-4"
        >
          <CalendarPlus
            className="w-5.5 h-5.5 text-[var(--accent)]"
            aria-hidden="true"
          />
          <span>Monat abschließen & neu starten (Auto-Archiv)</span>
        </button>

        
        {/* EXPORT OPTIONS (Reduced) */}
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={handleSendToVL}
            className="w-full py-4 px-6 rounded-2xl font-bold bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-base flex items-center justify-center gap-2.5 shadow-sm cursor-pointer transition-all active:scale-[0.99] focus-visible:ring-4"
          >
            <span className="text-xl">🚀</span>
            <span>Direkt an VL senden</span>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="mt-12 pt-6 pb-2 border-t border-[var(--border-color)] text-center text-xs font-bold text-[var(--text-muted)] space-y-4"
        role="contentinfo"
      >
        <p className="opacity-80 text-[10px]">
          © 2026 Reinecker Vision GmbH | RV Mobil – Konzeptioniert &amp;
          entwickelt von Marc Petry Stramov
        </p>
      </footer>
      </div>
      )}

      {/* TOAST POPUP (With ARIA live attribute) */}
      {toastText && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-extrabold py-3.5 px-6 rounded-full shadow-2xl z-50 text-sm border border-slate-700 animate-bounce"
        >
          {toastText}
        </div>
      )}

      {/* HELP & BACKUP MODAL */}
      {activeTab === "help" && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
          <HelpModal
            isOpen={true}
            onClose={() => setActiveTab("options")}
            appFields={appFields}
          />
        </div>
      )}

      {/* SECURE BACKUP MODAL */}
      {activeTab === "backup" && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
          <SecureBackupModal
            isOpen={true}
            onClose={() => setActiveTab("options")}
            onExport={() => {
              // Gather all necessary app state
              const backupData = {
                appFields,
                history,
                carryover,
                reportData,
                timeLogs: reportData?.month && history[reportData?.month] ? history[reportData?.month].timeLogs : []
              };
              return JSON.stringify(backupData);
            }}
            onImport={(dataStr) => {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.appFields) setAppFields(parsed.appFields);
                if (parsed.history) setHistory(parsed.history);
                if (parsed.carryover) setCarryover(parsed.carryover);
                if (parsed.reportData) setReportData(parsed.reportData);
                setActiveTab("options");
                setToastText("Backup erfolgreich geladen!");
              } catch (e) {
                setToastText("Fehler beim Laden des Backups.");
              }
            }}
          />
        </div>
      )}

      {activeTab === "sync" && (
        <DeviceSyncModal
          isOpen={true}
          onClose={() => setActiveTab("options")}
          onExport={() => {
            const syncData = {
              appFields,
              history,
              carryover,
              reportData,
              timeLogs: reportData?.month && history[reportData?.month] ? history[reportData?.month].timeLogs : []
            };
            return JSON.stringify(syncData);
          }}
          onImport={(dataStr) => {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.appFields) setAppFields(parsed.appFields);
              if (parsed.history) setHistory(parsed.history);
              if (parsed.carryover) setCarryover(parsed.carryover);
              if (parsed.reportData) setReportData(parsed.reportData);
              setActiveTab("options");
              setToastText("Daten erfolgreich synchronisiert!");
            } catch (e) {
              setToastText("Fehler bei der Datensynchronisation.");
            }
          }}
        />
      )}

      {/* TIME MODAL (ZEITBEREICH) */}
      {activeTab === "time" && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
          <TimeModal
            clockInTime={clockInTime}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            timeLogs={reportData?.timeLogs || []}
            onDeleteLog={handleDeleteLog}
            announceToAriaAndSpeech={announceToAriaAndSpeech}
            carryover={carryover}
            onOpenCarryover={() => setActiveTab("carryover")}
            onExportExcel={handleExportTimeLogsExcel}
            selectedMonth={reportData?.month}
            onAddManualLog={handleManualLogAdd}
            history={history}
            reportData={reportData}
          />
        </div>
      )}

      {/* MANAGEMENT MODAL */}
      {activeTab === "manage" && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
          <ManageModal
            isOpen={true}
            onClose={() => setActiveTab("options")}
            appFields={appFields}
            onDeleteField={handleDeleteField}
            onFactoryReset={handleFactoryResetFields}
          />
        </div>
      )}

      {/* HISTORY MODAL */}
      {activeTab === "history" && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
          <HistoryModal
            appFields={appFields}
            history={history}
            onLoadMonth={handleLoadMonthFromHistory}
            onDeleteRecord={handleDeleteRecordFromHistory}
            announceToAriaAndSpeech={announceToAriaAndSpeech}
            triggerToast={triggerToast}
          />
        </div>
      )}

      {/* STATS & TRENDS MODAL */}
      {activeTab === "stats" && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
          <StatsModal
            reportData={reportData}
            appFields={appFields}
            history={history}
            announceToAriaAndSpeech={announceToAriaAndSpeech}
          />
        </div>
      )}

      {/* ACCESSIBILITY & DISPLAY MODAL */}
      {activeTab === "options" && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
          <A11yModal
            settings={accessibility}
            onChange={setAccessibility}
            onOpenHelp={() => setActiveTab("help")}
            newFieldName={newFieldName}
            setNewFieldName={setNewFieldName}
            newFieldSection={newFieldSection}
            setNewFieldSection={setNewFieldSection}
            newFieldStep={newFieldStep}
            setNewFieldStep={setNewFieldStep}
            newFieldIcon={newFieldIcon}
            setNewFieldIcon={setNewFieldIcon}
            onAddCustomField={handleAddCustomField}
            onOpenManage={() => {
              setActiveTab("manage");
            }}
            onOpenBackup={() => {
              setActiveTab("backup");
            }}
            onOpenSync={() => {
              setActiveTab("sync");
            }}
            onOpenChangelog={() => {
              setActiveTab("changelog");
            }}
          />
        </div>
      )}
      
      {activeTab === "changelog" && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
          <ChangelogModal onClose={() => setActiveTab("options")} />
        </div>
      )}
      {activeTab === "carryover" && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 relative">
          <CarryoverModal
            isOpen={true}
            onClose={() => setActiveTab("time")}
            carryover={carryover}
            onSave={updateCarryover}
            announceToAriaAndSpeech={announceToAriaAndSpeech}
          />
        </div>
      )}

      {/* Safety spacing container so sticky bar doesn't obscure lower layout elements */}
      {focusedFieldId && <div className="h-24 w-full" aria-hidden="true" />}

      {/* MOBILE TOUCH-ACCESSORY NAVIGATION BAR (OPTIMIZED FOR TOUCH PHONES & TABLETS) */}
      {focusedFieldId &&
        (() => {
          const visibleFields = getVisibleFields();
          const activeIndex = visibleFields.findIndex(
            (f) => f.id === focusedFieldId,
          );
          const activeField =
            activeIndex !== -1 ? visibleFields[activeIndex] : null;
          const secInfo = activeField
            ? getFieldSectionInfo(activeField.id)
            : null;

          if (!activeField || !secInfo) return null;

          return (
            <div
              className="fixed bottom-0 left-0 right-0 z-[100] bg-[var(--card-bg)] border-t border-[var(--border-color)] p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] pb-safe-bottom"
              role="toolbar"
              aria-label="Mobiles Navigations-Hilfe-Menü"
            >
              <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigateField("prev")}
                  aria-label="Vorheriges Eingabefeld"
                  className="h-12 px-3 rounded-xl font-extrabold border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] active:scale-95 transition-all text-xs flex items-center justify-center cursor-pointer"
                >
                  ◀ Zurück
                </button>

                <div className="flex-1 min-w-0 text-center px-1">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--accent)] truncate">
                    Bereich {secInfo.num}: {secInfo.name} ({activeIndex + 1}/
                    {visibleFields.length})
                  </span>
                  <span className="block text-xs font-black text-[var(--text-color)] truncate">
                    {activeField.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateField("next")}
                  aria-label="Nächstes Eingabefeld"
                  className="h-12 px-3 rounded-xl font-extrabold border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] active:scale-95 transition-all text-xs flex items-center justify-center cursor-pointer"
                >
                  Weiter ▶
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    (document.activeElement as HTMLElement)?.blur();
                  }}
                  aria-label="Eingabe abschließen"
                  className="h-12 px-3.5 rounded-xl font-black bg-[var(--primary)] text-[var(--primary-text)] active:scale-95 transition-all text-xs flex items-center justify-center cursor-pointer"
                >
                  Fertig ✓
                </button>
              </div>
            </div>
          );
        })()}

      {/* RESPONSIVE BOTTOM NAVIGATION DOCK (FLOATING PILL DOCK FOR ERGONOMY & WCAG ACCESS) */}
      {!focusedFieldId && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-xl z-[200] bg-[var(--card-bg)]/90 dark:bg-[var(--card-bg)]/95 backdrop-blur-md border border-[var(--border-color)] py-2.5 px-4 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all"
          role="tablist"
          aria-label="Hauptnavigation"
        >
          <div className="flex items-center justify-between gap-1">
            {[
              { id: "form", label: "RV Report", icon: LayoutGrid, active: activeTab === "form", visible: true },
              { id: "time", label: "RV Zeit", icon: Clock, active: activeTab === "time" || activeTab === "carryover", visible: accessibility.enableTimeTracking !== false },
              { id: "stats", label: "RV Analyse", icon: BarChart3, active: activeTab === "stats", visible: true },
              { id: "history", label: "RV Archiv", icon: History, active: activeTab === "history", visible: true },
              { id: "options", label: "Optionen", icon: Settings, active: activeTab === "options" || activeTab === "help" || activeTab === "backup" || activeTab === "manage" || activeTab === "sync" || activeTab === "changelog", visible: true },
            ]
            .filter(tab => tab.visible)
            .map((tab) => {
              const IconComp = tab.icon;
              const isSelected = tab.active;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    triggerHaptic(12);
                    setActiveTab(tab.id as any);
                    if (tab.id === "form") {
                      announceToAriaAndSpeech("RV Report Hauptformular angezeigt");
                    } else if (tab.id === "time") {
                      announceToAriaAndSpeech("RV Zeit und Stempeluhr geöffnet");
                    } else if (tab.id === "stats") {
                      announceToAriaAndSpeech("RV Analyse und Statistiken geöffnet");
                    } else if (tab.id === "history") {
                      announceToAriaAndSpeech("RV Archiv geöffnet");
                    } else if (tab.id === "options") {
                      announceToAriaAndSpeech("Anzeige-Optionen geöffnet");
                    }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl relative transition-all active:scale-90 cursor-pointer ${
                    isSelected
                      ? "text-[var(--accent)] font-extrabold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-color)] font-semibold"
                  }`}
                >
                  <div className="relative p-1">
                    <IconComp
                      className={`w-5 h-5 transition-transform ${isSelected ? "scale-110 stroke-[2.5]" : "stroke-[1.8]"}`}
                    />
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
                    {tab.label}
                  </span>
                  {isSelected && (
                    <span className="absolute bottom-0 w-4 h-1 bg-[var(--accent)] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

}