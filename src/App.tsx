import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useSwipeable } from "react-swipeable";
import { get, set } from "idb-keyval";
import {
  Calendar,
  CalendarPlus,
  Check,
  Copy,
  Target,
  Share2,
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
  AlertTriangle,
} from "lucide-react";

import {
  SectionsConfig,
  ReportData,
  AccessibilitySettings,
  FieldConfig,
  HistoryRecord,
  YearlyCarryover,
  TimeLog,
  ValueTimestamps,
} from "./types";
import { baueArchivEintrag } from "./utils/archivEintrag";
import { persistHistory, safeSetItem } from "./utils/speicher";
import { useGeraeteSync } from "./hooks/useGeraeteSync";
import { useExport } from "./hooks/useExport";
import { useSprachausgabe } from "./hooks/useSprachausgabe";
import { stableStringify } from "./utils/stableJson";
import { pruefeSyncPaket } from "./utils/syncSchema";
// Eine Quelle für die Monatsnamen: Dieselbe Funktion lag zuvor zusätzlich
// hier und in HistoryModal.tsx -- drei Kopien, die auseinanderlaufen konnten.
import { formatMonthGerman } from "./utils/dateUtils";
import {
  exportTimeLogsToExcel,
  triggerFileDownload,
} from "./utils/excelUtils";
import { subscribeLiveSync, getLiveSyncSnapshot } from "./utils/liveSync";
import A11yModal from "./components/A11yModal";
import CounterField from "./components/CounterField";
import QuickEntryPanel, { QuickEntryConfig, DEFAULT_QUICK_CONFIG } from "./components/QuickEntryPanel";
import ConfirmDialog, { ConfirmRequest } from "./components/ConfirmDialog";
import OnboardingModal from "./components/OnboardingModal";
import HelpModal from "./components/HelpModal";
import ManageModal from "./components/ManageModal";
import HistoryModal from "./components/HistoryModal";
import StatsModal from "./components/StatsModal";
import CarryoverModal from "./components/CarryoverModal";
import ClockInWidget from "./components/ClockInWidget";
import TimeModal from "./components/TimeModal";
/*
  Geräte-Sync und Datensicherung werden erst geladen, wenn man sie öffnet.
  Beide ziehen schwere Bibliotheken nach (QR-Erzeugung, Kamera-Scanner,
  Animationen), die auf der Startseite niemand braucht. Gemessen: Das
  Start-Bundle schrumpft dadurch von 996 KB auf 610 KB (288 → 173 KB
  komprimiert) -- Ladezeit zählt im Aussendienst bei schlechtem Netz.
*/
const SecureBackupModal = React.lazy(() => import("./components/SecureBackupModal"));
const DeviceSyncModal = React.lazy(() => import("./components/DeviceSyncModal"));

/** Platzhalter, solange ein nachgeladener Bereich noch unterwegs ist. */
function BereichLaedt({ name }: { name: string }) {
  return (
    <div
      role="status"
      className="p-6 text-sm font-bold text-[var(--text-muted)] flex items-center gap-2"
    >
      <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden="true" />
      {name} wird geladen …
    </div>
  );
}
import { ChangelogModal } from "./components/ChangelogModal";

const ONBOARDING_KEY = "aussendienst_pwa_onboarding_v1";

/**
 * Hat dieser Monat echten Inhalt -- also etwas, das verloren gehen koennte?
 *
 * Der Name zaehlt bewusst NICHT dazu: Er wird beim Monatswechsel automatisch
 * mitgenommen, dadurch galt jeder frische Monat sofort als "hat Daten" und
 * landete leer im RV Archiv. Die Archivliste fuellte sich mit Eintraegen
 * "Zaehler: 0", und ein Rueckgaengig nach dem Monatsabschluss haette einen
 * leeren Monat zurueckgelassen.
 */
/**
 * Zeitstempel für geänderte Zählerfelder setzen.
 * Grundlage für das feldweise Zusammenführen beim Geräte-Abgleich
 * (siehe mergeValues in utils/merge.ts).
 */
const stempeln = (
  vorher: ValueTimestamps | undefined,
  ids: string[],
  zeit: string = new Date().toISOString(),
): ValueTimestamps => {
  const out: ValueTimestamps = { ...(vorher || {}) };
  ids.forEach((id) => {
    out[id] = zeit;
  });
  return out;
};

/**
 * Fehlende Feld-Zeitstempel nachtragen (für Daten aus Versionen vor 0.9.1).
 *
 * WICHTIG und beim Testen teuer gelernt: Ein Feld ohne eigenen Zeitstempel
 * fällt beim Zusammenführen auf den Monats-Zeitstempel zurück. Der springt
 * aber nach vorn, sobald irgendein *anderes* Feld getippt wird -- damit
 * bekäme ein unverändert alter Wert plötzlich einen taufrischen Stempel und
 * würde die echte Änderung des anderen Geräts überschreiben (genau der
 * Fehler, der behoben werden sollte, nur subtiler).
 *
 * Deshalb werden fehlende Stempel *einmal beim Laden* mit dem damaligen
 * Speicherzeitpunkt nachgetragen, bevor er sich weiterbewegen kann.
 */
const stempelNachtragen = (
  values: Record<string, number | ""> | undefined,
  vorhanden: ValueTimestamps | undefined,
  zeitpunkt: string,
): ValueTimestamps => {
  const out: ValueTimestamps = { ...(vorhanden || {}) };
  Object.keys(values || {}).forEach((id) => {
    if (!out[id]) out[id] = zeitpunkt;
  });
  return out;
};

/** Wie stempeln(), aber nur für Felder, deren Wert sich tatsächlich geändert hat. */
const stempelnGeaenderte = (
  vorher: ValueTimestamps | undefined,
  alteWerte: Record<string, number | "">,
  neueWerte: Record<string, number | "">,
): ValueTimestamps => {
  const ids = new Set([
    ...Object.keys(alteWerte || {}),
    ...Object.keys(neueWerte || {}),
  ]);
  const geaendert = Array.from(ids).filter(
    (id) => (alteWerte || {})[id] !== (neueWerte || {})[id],
  );
  return stempeln(vorher, geaendert);
};

/**
 * Inhaltlicher Fingerabdruck eines Monats -- ohne savedAt.
 * Damit lässt sich erkennen, ob ein Speichervorgang überhaupt etwas ändert.
 */
const inhaltsFingerabdruck = (r: {
  name?: string;
  notes?: string;
  values?: Record<string, number | "">;
  valuesUpdatedAt?: ValueTimestamps;
  timeLogs?: TimeLog[];
  fieldsSnapshot?: SectionsConfig;
}): string =>
  stableStringify({
    name: r.name || "",
    notes: r.notes || "",
    values: r.values || {},
    valuesUpdatedAt: r.valuesUpdatedAt || {},
    timeLogs: r.timeLogs || [],
    fieldsSnapshot: r.fieldsSnapshot || null,
  });

const monthHasContent = (data?: {
  notes?: string;
  values?: Record<string, number | "">;
  timeLogs?: TimeLog[];
} | null): boolean => {
  if (!data) return false;
  if (typeof data.notes === "string" && data.notes.trim() !== "") return true;
  if (Object.values(data.values || {}).some((v) => typeof v === "number" && v !== 0))
    return true;
  return Array.isArray(data.timeLogs) && data.timeLogs.length > 0;
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
      // Steht in der Firmenvorlage als Zeile D22 ("Vorführungen Envision"),
      // fehlte aber in der App -- das Feld war schlicht nie angelegt. Die
      // Reihenfolge folgt der Vorlage: Tactonom, Envision, Feelspace, WeWalk.
      id: "envision_vf",
      label: "Anzahl Vorführungen Envision",
      step: 1,
      icon: "👓",
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
  // Start-Ansicht per URL-Parameter (für PWA-Shortcuts, z. B. ./?tab=time)
  const [activeTab, setActiveTab] = useState<"form" | "time" | "stats" | "history" | "options" | "help" | "backup" | "manage" | "carryover" | "sync" | "changelog">(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "time" || tab === "stats" || tab === "history" || tab === "options") return tab;
    } catch {
      /* ignore */
    }
    return "form";
  });

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

      // Envision nachruesten: Die Firmenvorlage hat dafuer eine eigene Zeile
      // (D22), die App hatte das Feld nie. Ohne diese Nachruestung bekaemen es
      // nur Neuinstallationen -- bestehende Geraete haben ihre Feldliste in
      // localStorage und wuerden die Zeile leer lassen.
      // Einsortiert direkt hinter Tactonom, wie in der Vorlage.
      if (!fields.s3.some((f: FieldConfig) => f.id === "envision_vf")) {
        const envision = {
          id: "envision_vf",
          label: "Anzahl Vorführungen Envision",
          step: 1,
          icon: "👓",
        };
        const nachTactonom = fields.s3.findIndex(
          (f: FieldConfig) => f.id === "tac_vf"
        );
        if (nachTactonom === -1) fields.s3.push(envision);
        else fields.s3.splice(nachTactonom + 1, 0, envision);
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
  const [mobileComfortMode, setMobileComfortMode] = useState<boolean>(() => {
    return localStorage.getItem("aussendienst_pwa_mobile_comfort") === "true";
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

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  // Sticky, bis ein Speichervorgang wieder erfolgreich war -- damit ein
  // Außendienstler nie fälschlich "gesichert" sieht, während im Hintergrund
  // etwas schiefgeht (z. B. Speicher voll, IndexedDB blockiert).
  const [storageWriteFailed, setStorageWriteFailed] = useState(false);

  // Live-Sync-Status (Verbindung lebt außerhalb dieses Fensters weiter)
  const liveSync = useSyncExternalStore(subscribeLiveSync, getLiveSyncSnapshot);

  // Barrierefreier Ersatz für window.confirm() (siehe ConfirmDialog.tsx)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  // Zuletzt abgeschlossener Monat -- Grundlage für das Rückgängig-Angebot
  const [lastMonthClose, setLastMonthClose] = useState<{
    from: string;
    to: string;
  } | null>(null);
  // Hinweis auf eine abgebrochene Live-Verbindung weggeklickt?
  const [syncAbbruchAusgeblendet, setSyncAbbruchAusgeblendet] = useState(false);

  // Interaktiver Einstieg bei Erstnutzung. null = noch nicht entschieden
  // (die Entscheidung fällt erst, wenn die gespeicherten Daten geladen sind,
  // damit bestehende Nutzer den Einstieg nicht faelschlich sehen).
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  // Breiter Bildschirm? Grundlage für das automatische Desktop-Layout.
  const [viewportIsWide, setViewportIsWide] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setViewportIsWide(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

  // Active focused field for Mobile Touch-Accessory Toolbar helper
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);

  // Real-time live search query for products/categories
  const [searchQuery, setSearchQuery] = useState("");

  const monthInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

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

  // --- SCHNELL-ERFASSUNG (meistgenutzte Kategorien als große Tasten) ---
  const [quickConfig, setQuickConfig] = useState<QuickEntryConfig>(() => {
    const saved = localStorage.getItem("aussendienst_pwa_quick_v1");
    if (saved) {
      try {
        return { ...DEFAULT_QUICK_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_QUICK_CONFIG;
      }
    }
    return DEFAULT_QUICK_CONFIG;
  });

  const updateQuickConfig = (newConfig: QuickEntryConfig) => {
    setQuickConfig(newConfig);
    safeSetItem("aussendienst_pwa_quick_v1", JSON.stringify(newConfig));
  };

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
    const stamped = { ...newCarryover, updatedAt: new Date().toISOString() };
    setCarryover(stamped);
    safeSetItem(
      "aussendienst_pwa_carryover_v2",
      JSON.stringify(stamped),
    );
    triggerToast("Jahreskonto erfolgreich aktualisiert!");
    announceToAriaAndSpeech("Jahreskonto-Einstellungen gespeichert.", true);
  };

  // --- STAMPELUHR TIME TRACKING STATE ---
  const [clockInTime, setClockInTime] = useState<string | null>(() => {
    return localStorage.getItem("aussendienst_pwa_clock_in_time_v2");
  });

  // Acoustic Auditor state

  // Toast notification state
  const [toastText, setToastText] = useState("");
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- HAPTIK UND TOAST (vor der Sprachausgabe: sie braucht beide) ---
  const triggerHaptic = (ms = 12) => {
    if (
      typeof window !== "undefined" &&
      window.navigator &&
      window.navigator.vibrate
    ) {
      window.navigator.vibrate(ms);
    }
  };

  const triggerToast = (text: string) => {
    setToastText(text);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastText("");
    }, 2800);
  };

  // --- SPRACHAUSGABE (ausgelagert nach hooks/useSprachausgabe) ---
  // Ansagen, Diktat und Vorlesefunktion. Der vorgelesene Text selbst liegt als
  // reine Funktion in utils/zusammenfassung.ts -- er ist die Kontrollinstanz
  // vor dem Senden und gehoert einzeln pruefbar.
  //
  // Die Umleitung ueber diktatRef ist kein Schnoerkel: Das Diktat haengt das
  // Ergebnis ans Notizfeld, und handleMetaChange steht rund 500 Zeilen weiter
  // unten. Ein direkter Zugriff waere ein Zugriff vor der Definition. Die
  // Referenz wird gleich nach handleMetaChange gefuellt.
  const diktatRef = useRef<(text: string) => void>(() => {});

  const {
    ariaAnnouncement,
    announceToAriaAndSpeech,
    isDictating,
    toggleDictation,
    isReadingSummary,
    handleReadSummaryAloud,
  } = useSprachausgabe({
    accessibility,
    reportData,
    appFields,
    triggerToast,
    triggerHaptic,
    onDiktatText: (text) => diktatRef.current(text),
  });

  // Zentrale Reaktion, wenn ein Archiv-Schreibvorgang (RV Archiv in
  // IndexedDB) fehlschlägt -- z. B. Speicher voll, IndexedDB durch
  // Browser-Richtlinie blockiert. Ohne diese Rückmeldung würde ein
  // Außendienstler nie erfahren, dass eine Änderung nicht gesichert wurde.
  const handleHistoryPersistFailure = useCallback((context: string, err: unknown) => {
    console.error(`Speichern des RV Archivs fehlgeschlagen (${context})`, err);
    setStorageWriteFailed(true);
    announceToAriaAndSpeech(
      "Achtung: Das RV Archiv konnte nicht gespeichert werden. Bitte jetzt ein Backup erstellen.",
      true,
    );
  }, [announceToAriaAndSpeech]);

  const finishOnboarding = useCallback(() => {
    safeSetItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
    announceToAriaAndSpeech(
      "Einrichtung abgeschlossen. Sie können jetzt Ihre Zahlen erfassen.",
      true,
    );
  }, [announceToAriaAndSpeech]);

  const focusAndAnnounce = useCallback((target: "month" | "name" | "notes") => {
    if (target === "month") {
      monthInputRef.current?.focus();
      monthInputRef.current?.select();
      announceToAriaAndSpeech("Berichtsmonat-Feld aktiviert.", true);
    } else if (target === "name") {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
      announceToAriaAndSpeech("Mitarbeiter-Feld aktiviert.", true);
    } else {
      notesInputRef.current?.focus();
      notesInputRef.current?.select();
      announceToAriaAndSpeech("Notizenfeld aktiviert.", true);
    }
  }, [announceToAriaAndSpeech]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || !event.shiftKey) return;

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        focusAndAnnounce("month");
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        focusAndAnnounce("name");
      } else if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        focusAndAnnounce("notes");
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        setAccessibility((prev) => ({ ...prev, screenReaderNarration: !prev.screenReaderNarration }));
        announceToAriaAndSpeech("Sprachansagen aktualisiert.", true);
      } else if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        setMobileComfortMode((prev) => !prev);
        announceToAriaAndSpeech("Ein-Hand-Modus aktualisiert.", true);
      } else if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setActiveTab("time");
        announceToAriaAndSpeech("Zeiterfassung geöffnet.", true);
      } else if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        setActiveTab("history");
        announceToAriaAndSpeech("Archiv geöffnet.", true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [announceToAriaAndSpeech, focusAndAnnounce]);

  // --- SYNC LOCALSTORAGE & ACCESSIBILITY ATTRIBUTES ---
  useEffect(() => {
    safeSetItem("aussendienst_pwa_fields", JSON.stringify(appFields));
  }, [appFields]);

  useEffect(() => {
    setSaveStatus("saving");
    const t = setTimeout(() => {
      if (!reportData) return;
      set("aussendienst_pwa_data", reportData)
        .then(() => {
          setSaveStatus("saved");
          setStorageWriteFailed(false);
          const now = new Date();
          setLastSavedTime(
            now.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          );
        })
        .catch((err) => {
          // Muss dem Nutzer ehrlich angezeigt werden: Ohne diesen Fehlerpfad
          // hätte die Anzeige weiterhin "gesichert" gemeldet, obwohl die
          // Eingaben nicht persistiert wurden (z. B. Speicher voll,
          // IndexedDB durch Browser/Richtlinie blockiert).
          console.error("Speichern des Reports fehlgeschlagen", err);
          setSaveStatus("error");
          setStorageWriteFailed(true);
          announceToAriaAndSpeech(
            "Achtung: Speichern fehlgeschlagen. Bitte jetzt ein Backup erstellen, damit keine Daten verloren gehen.",
            true,
          );
        });
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


  // Automatic saving into history list upon any relevant data changes
  useEffect(() => {
    // Einmal festhalten statt ueberall `reportData?.`: Innerhalb des
    // setHistory-Callbacks kann TypeScript die Pruefung oben nicht mehr
    // zuordnen -- und ein `?.` an dieser Stelle wuerde stillschweigend einen
    // Archiveintrag unter dem Schluessel "undefined" anlegen.
    const daten = reportData;
    if (!daten?.month) return;

    // Nur Monate mit echtem Inhalt archivieren (siehe monthHasContent)
    if (!monthHasContent(daten)) return;

    setHistory((prev) => {
      // `null` heisst "Archiv noch nicht aus der IndexedDB geladen". Dann NICHT
      // schreiben: Ein `prev || {}` wuerde den gespeicherten Bestand durch einen
      // einzelnen Monat ersetzen. In der Praxis kann das nicht eintreten, weil
      // setReportData und setHistory beim Laden im selben Block stehen -- aber
      // das ist ein Implementierungsdetail von React, keine Zusicherung.
      if (!prev) return prev;
      const inhalt = {
        month: daten.month,
        name: daten.name,
        notes: daten.notes,
        values: daten.values,
        valuesUpdatedAt: daten.valuesUpdatedAt,
        timeLogs: daten.timeLogs || [],
        fieldsSnapshot: appFields,
      };

      // Ohne inhaltliche Änderung KEIN neues savedAt und kein Schreibvorgang.
      // Vorher erzeugte jedes Zusammenführen neue Objekte, dadurch lief der
      // Live-Abgleich endlos im Dreisekundentakt weiter und schrieb dabei
      // ununterbrochen in die IndexedDB (gemessen am 2026-08-02). Nebenwirkung
      // war, dass savedAt als "zuletzt gespeichert" nichts mehr aussagte --
      // obwohl genau dieses Feld beim Zusammenführen entscheidet.
      const bestehend = prev[daten.month];
      if (bestehend && inhaltsFingerabdruck(bestehend) === inhaltsFingerabdruck(inhalt)) {
        return prev;
      }

      // Bauen laeuft ueber baueArchivEintrag -- dieselbe Stelle wie beim
      // Monatswechsel. Die Versand-Markierung wird dort uebernommen; sie geht
      // bewusst NICHT in den Fingerabdruck ein, sonst erzeugte das Setzen der
      // Markierung einen Speicherlauf mit neuem savedAt, und das entscheidet
      // beim Geraete-Abgleich.
      const updated = {
        ...prev,
        [daten.month]: baueArchivEintrag(
          daten,
          appFields,
          bestehend,
          new Date().toISOString(),
        ),
      };
      persistHistory(updated, handleHistoryPersistFailure, "auto-save");
      return updated;
    });
  }, [
    reportData?.name,
    reportData?.notes,
    reportData?.values,
    reportData?.valuesUpdatedAt,
    reportData?.month,
    reportData?.timeLogs,
    appFields,
    handleHistoryPersistFailure,
  ]);

  useEffect(() => {
    safeSetItem(
      "aussendienst_pwa_a11y",
      JSON.stringify(accessibility),
    );
    document.documentElement.setAttribute("data-theme", accessibility.theme);
    document.documentElement.setAttribute("data-size", accessibility.fontSize);
    // Steuert Tailwinds dark:-Varianten (siehe @custom-variant in index.css).
    // Ohne dies folgen sie dem Betriebssystem statt der App-Einstellung.
    const dunkleThemes = ["dark", "high-contrast-dark", "high-contrast-yellow"];
    document.documentElement.setAttribute(
      "data-dark",
      dunkleThemes.includes(accessibility.theme) ? "true" : "false",
    );
  }, [accessibility]);

  useEffect(() => {
    safeSetItem("aussendienst_pwa_mobile_comfort", mobileComfortMode ? "true" : "false");
  }, [mobileComfortMode]);

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
        sichtbar: true,
        isUrgent: true,
        message: `Achtung Abgabefrist: Sie haben ungesendete Zählerstände für ${formatMonthGerman(reportData?.month || "")}! Bitte exportieren Sie den Report sofort als Excel und senden ihn an die Vertriebsleitung (VL)!`,
      };
    }

    // Der allgemeine Merksatz stand bisher ganze 31 Tage im Monat da und kostete
    // auf dem Handy 80 px, ohne je etwas Neues zu sagen. Jetzt erscheint er nur
    // im Zeitfenster, in dem er zählt: kurz vor Monatsende und bis zur Abgabe.
    const letzterTag = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const naheAmMonatsende = currentDay >= letzterTag - 4;
    return {
      sichtbar: naheAmMonatsende || currentDay <= 8,
      isUrgent: false,
      message: `ℹ️ Hinweis für den Monatsabschluss: Bitte senden Sie den Report bis spätestens zum 8. des Folgemonats als Excel-Datei an die Vertriebsleitung (VL).`,
    };
  };

  const deadlineInfo = getDeadlineAlert();

  // --- VALUE UPDATERS ---
  const handleValueChange = useCallback((id: string, val: number | "") => {
    // Sobald im neuen Monat gearbeitet wird, ist das Rückgängig-Angebot
    // hinfällig -- ein Rücksprung würde sonst frische Eingaben gefährden.
    setLastMonthClose(null);
    setReportData((prev) => {
      // Solange kein Bericht geladen ist, darf eine Eingabe nichts anlegen --
      // sonst entstünde ein Datensatz ohne Monat und Namen.
      if (!prev) return prev;
      return {
        ...prev,
        values: {
          ...prev.values,
          [id]: val,
        },
        // Zeitstempel je Feld -- Grundlage des feldweisen Abgleichs
        valuesUpdatedAt: stempeln(prev.valuesUpdatedAt, [id]),
      };
    });
  }, []);

  // Synchron mitgeführter Spiegel der Zählerstände.
  // Grund: Schnelles mehrfaches Tippen darf keine Zählungen verlieren. Würde
  // der neue Wert aus dem React-State gelesen, läse jeder Tipp vor dem
  // nächsten Rendern denselben alten Stand ("3x tippen" ergab nur +1).
  const valuesRef = useRef<Record<string, number | "">>({});
  useEffect(() => {
    valuesRef.current = reportData?.values || {};
  }, [reportData?.values]);

  /**
   * Zähler um einen Betrag ändern und den neuen Wert sofort zurückgeben.
   * Nutzt den synchronen Spiegel, damit auch schnelles Tippen jede einzelne
   * Zählung erfasst. Gibt den neuen Wert zurück, damit der Aufrufer ihn
   * direkt ansagen und vertonen kann.
   */
  const applyValueDelta = useCallback((id: string, delta: number): number => {
    const current =
      typeof valuesRef.current[id] === "number" ? (valuesRef.current[id] as number) : 0;
    const newVal = Math.max(0, parseFloat((current + delta).toFixed(1)));
    const stored: number | "" = newVal === 0 ? "" : newVal;
    valuesRef.current = { ...valuesRef.current, [id]: stored };
    handleValueChange(id, stored);
    return newVal;
  }, [handleValueChange]);

  /** Direkte Eingabe (Tastatur) -- Spiegel mitziehen, damit +/- danach stimmt. */
  const handleValueInput = useCallback((id: string, val: number | "") => {
    valuesRef.current = { ...valuesRef.current, [id]: val };
    handleValueChange(id, val);
  }, [handleValueChange]);

  // --- SCHNELL-ERFASSUNG: EIN TIPP = +1 ---
  const handleQuickIncrement = useCallback((field: FieldConfig) => {
    triggerHaptic(15);
    const newVal = applyValueDelta(field.id, field.step);
    announceToAriaAndSpeech(`${field.label}: ${newVal}`, false, field.id, newVal);
  }, [applyValueDelta, announceToAriaAndSpeech]);

  // --- STAMPELUHR HANDLERS ---
  const handleClockIn = useCallback(() => {
    triggerHaptic(25);
    const nowISO = new Date().toISOString();
    setClockInTime(nowISO);
    safeSetItem("aussendienst_pwa_clock_in_time_v2", nowISO);
    triggerToast("Eingestempelt!");

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
      if (!prev) return prev;
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
        valuesUpdatedAt: stempeln(prev.valuesUpdatedAt, [
          "std_buero",
          "std_aussendienst",
          "tage_arbeit",
        ]),
        timeLogs: updatedLogs,
      };
    });

    // 3. Reset clock-in timer
    setClockInTime(null);
    localStorage.removeItem("aussendienst_pwa_clock_in_time_v2");

    triggerToast("Ausgestempelt & Schicht verbucht!");
    announceToAriaAndSpeech(
      `Erfolgreich ausgestempelt. Schicht über ${newLog.duration.toFixed(2)} Stunden wurde verbucht.`,
      true,
    );
  }, [announceToAriaAndSpeech]);

  const handleDeleteLog = useCallback((logToDelete: TimeLog) => {
    triggerHaptic(20);

    setReportData((prev) => {
      if (!prev) return prev;
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
        valuesUpdatedAt: stempeln(prev.valuesUpdatedAt, [
          "std_buero",
          "std_aussendienst",
          "tage_arbeit",
        ]),
        timeLogs: updatedLogs,
      };
    });

    triggerToast("Schicht gelöscht & Stunden korrigiert!");
    announceToAriaAndSpeech(
      `Schicht gelöscht. Stunden wurden automatisch korrigiert.`,
      true,
    );
  }, [announceToAriaAndSpeech]);

  const handleManualLogAdd = useCallback((newLog: TimeLog) => {
    triggerHaptic(25);

    setReportData((prev) => {
      if (!prev) return prev;
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
        valuesUpdatedAt: stempeln(prev.valuesUpdatedAt, [
          "std_buero",
          "std_aussendienst",
          "tage_arbeit",
        ]),
        timeLogs: updatedLogs,
      };
    });

    triggerToast("Schicht manuell nachgetragen!");
    announceToAriaAndSpeech(
      `Schicht über ${newLog.duration.toFixed(2)} Stunden erfolgreich manuell nachgetragen.`,
      true,
    );
  }, [announceToAriaAndSpeech]);

  const handleMetaChange = useCallback((
    key: keyof Omit<ReportData, "values">,
    val: string,
  ) => {
    setLastMonthClose(null);
    setReportData((prev) => (prev ? { ...prev, [key]: val } : prev));
  }, []);

  // Diktat-Ergebnis ans Notizfeld anhängen. Die Zuweisung steht hier und nicht
  // beim Hook-Aufruf, weil handleMetaChange erst an dieser Stelle existiert --
  // siehe Kommentar bei diktatRef.
  diktatRef.current = (text: string) => {
    handleMetaChange(
      "notes",
      (reportData?.notes || "") + (reportData?.notes ? " " : "") + text,
    );
  };

  const handleMonthChange = (newMonth: string) => {
    if (!newMonth) return;
    // Jeder Monatswechsel beendet ein offenes Rückgängig-Angebot; der
    // Abschluss-Ablauf setzt es danach bewusst neu.
    setLastMonthClose(null);

    // 1. Save current active month state to history first if it has any meaningful content
    const currentMonth = reportData?.month;
    const hasData = monthHasContent(reportData);

    let updatedHistory = { ...history };
    if (hasData && currentMonth && reportData) {
      updatedHistory[currentMonth] = baueArchivEintrag(
        { ...reportData, month: currentMonth },
        appFields,
        updatedHistory[currentMonth],
        new Date().toISOString(),
      );
      setHistory(updatedHistory);
      persistHistory(updatedHistory, handleHistoryPersistFailure, "month-change");
    }

    // 2. Load the target month state from history or start fresh
    const savedRecord = updatedHistory[newMonth];
    if (savedRecord) {
      setReportData({
        month: newMonth,
        name: savedRecord.name || reportData?.name || "",
        notes: savedRecord.notes || "",
        values: savedRecord.values || {},
        // Zeitstempel des Archivstands mitnehmen und fehlende mit dessen
        // Speicherzeitpunkt nachtragen -- sonst fiele das Feld später auf den
        // dann bereits weitergewanderten Monats-Zeitstempel zurück.
        valuesUpdatedAt: stempelNachtragen(
          savedRecord.values,
          savedRecord.valuesUpdatedAt,
          savedRecord.savedAt,
        ),
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
        name: reportData?.name || "",
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
      persistHistory(updated, handleHistoryPersistFailure, "delete-record");
      return updated;
    });
  };

  // --- EXPORT & VERSANDSTAND (ausgelagert nach hooks/useExport) ---
  // Die beiden Excel-Ausgaben, der Abschluss-Check davor und die Markierung
  // danach. Die Prüfregeln selbst liegen als reine Funktion in
  // utils/abschlussCheck.ts -- sie entscheiden, was beim Chef landet.
  const {
    setzeVersandStatus,
    handleToggleVersandStatus,
    getReportWarnings,
    handleExportExcel,
    handleExportTimeLogsExcel,
    handleSendToVL,
  } = useExport({
    reportData,
    appFields,
    accessibility,
    setHistory,
    announceToAriaAndSpeech,
    triggerToast,
    triggerHaptic,
    setConfirmRequest,
    onPersistFailure: handleHistoryPersistFailure,
  });

  const getPreviousSavedMonthRecord = (): HistoryRecord | null => {
    if (!history) return null;
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
    setConfirmRequest({
      title: "Vorlage laden?",
      message: `Die Zahlen und Kategorien aus „${formattedMonth}“ werden als Vorlage übernommen. Ihre aktuellen Zählerstände für diesen Monat werden dabei überschrieben.`,
      confirmLabel: "Vorlage laden",
      onConfirm: () => {
        setReportData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            notes: prevRecord.notes || "",
            values: prevRecord.values || {},
            valuesUpdatedAt: stempelnGeaenderte(
              prev.valuesUpdatedAt,
              prev.values || {},
              prevRecord.values || {},
            ),
          };
        });
        if (prevRecord.fieldsSnapshot) {
          setAppFields(prevRecord.fieldsSnapshot);
        }
        triggerToast(`Vorlage von ${formattedMonth} erfolgreich geladen!`);
        announceToAriaAndSpeech(
          `Vorlage von ${formattedMonth} erfolgreich geladen.`,
          true,
        );
      },
    });
  };

  const addTimestamp = () => {
    triggerHaptic(15);
    const d = new Date();
    const dStr = `[${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.] `;
    handleMetaChange(
      "notes",
      (reportData?.notes || "") + (reportData?.notes ? "\n" : "") + dStr,
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
    setConfirmRequest({
      title: "Kategorie löschen?",
      message: `„${label}“ wird endgültig aus dem Formular entfernt. Der bisher erfasste Wert für diesen Monat geht dabei verloren.`,
      confirmLabel: "Endgültig löschen",
      tone: "danger",
      onConfirm: () => {
        setAppFields((prev) => ({
          ...prev,
          [sectionKey]: prev[sectionKey].filter((f) => f.id !== fieldId),
        }));

        // Also clean up value
        const updatedValues = { ...(reportData?.values || {}) };
        delete updatedValues[fieldId];
        setReportData((prev) =>
          prev
            ? {
                ...prev,
                values: updatedValues,
                valuesUpdatedAt: stempeln(prev.valuesUpdatedAt, [fieldId]),
              }
            : prev,
        );

        triggerToast(`Kategorie "${label}" wurde gelöscht.`);
        announceToAriaAndSpeech(`Kategorie ${label} gelöscht.`);
      },
    });
  };

  const handleFactoryResetFields = () => {
    triggerHaptic(40);
    setConfirmRequest({
      title: "Formular zurücksetzen?",
      message:
        "Alle Formularfelder werden auf den Auslieferungszustand zurückgesetzt. Ihre selbst erstellten Kategorien und die Zählerstände dieses Monats werden dabei gelöscht.",
      confirmLabel: "Zurücksetzen",
      tone: "danger",
      onConfirm: () => {
        setAppFields(DEFAULT_FIELDS_CONFIG);
        setReportData((prev) =>
          prev
            ? {
                ...prev,
                values: {},
                valuesUpdatedAt: stempelnGeaenderte(prev.valuesUpdatedAt, prev.values || {}, {}),
              }
            : prev,
        );
        setActiveTab("options");
        triggerToast("Erfolgreich auf Standard-Felder zurückgesetzt!");
        announceToAriaAndSpeech(
          "Formular erfolgreich auf Standardfelder zurückgesetzt.",
        );
      },
    });
  };

  // --- START NEW MONTH (ARCHIVE & RESET) ---
  /**
   * Monatsabschluss ist der folgenschwerste Knopf der App: Er wechselt den
   * Arbeitsmonat und leert das Formular. Bisher geschah das ohne jede
   * Rueckfrage -- ein Fehlgriff auf dem Handy genuegte. Die Daten gehen dabei
   * zwar nicht verloren (der Monat wandert vollstaendig ins RV Archiv,
   * nachgemessen: Zaehler, Kommentar, Schichten und Feld-Aufbau), aber der
   * Nutzer sieht das nicht und weiss nicht, wie er zurueckkommt.
   * Deshalb: vorher fragen, hinterher Rueckgaengig anbieten.
   */
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

    const zaehlungen = Object.values(reportData?.values || {}).reduce<number>(
      (sum, v) => (typeof v === "number" ? sum + v : sum),
      0,
    );
    const schichten = reportData?.timeLogs?.length || 0;
    const details = [
      `Gezählte Vorgänge: ${zaehlungen}`,
      `Erfasste Schichten: ${schichten}`,
      "Der Monat bleibt vollständig im RV Archiv und lässt sich dort jederzeit wieder laden.",
    ];
    if (!monthHasContent(reportData)) {
      details.unshift(
        "Achtung: In diesem Monat ist noch nichts erfasst – es wird nichts archiviert.",
      );
    }

    setConfirmRequest({
      title: `${formatMonthGerman(currentMonth)} abschließen?`,
      message: `${formatMonthGerman(currentMonth)} wird im RV Archiv gesichert. Danach arbeiten Sie in ${formatMonthGerman(nextMonthStr)} mit leerem Formular weiter.`,
      details,
      confirmLabel: "Monat abschließen",
      onConfirm: () => {
        // Trigger month change - this saves the current month into history and opens the next one fresh (cleared)
        handleMonthChange(nextMonthStr);
        setLastMonthClose({ from: currentMonth, to: nextMonthStr });
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    });
  };

  /**
   * Monatsabschluss zurueckholen. Der neue Monat wird dabei nur dann aus dem
   * Archiv entfernt, wenn dort nichts eingetragen wurde -- sonst bliebe ein
   * leerer Eintrag stehen. Sobald der Nutzer im neuen Monat wirklich zu
   * arbeiten beginnt, verschwindet das Angebot (siehe clearMonthCloseUndo).
   */
  const handleUndoMonthClose = () => {
    if (!lastMonthClose) return;
    const { from, to } = lastMonthClose;
    triggerHaptic(25);

    if (!monthHasContent(reportData) && history?.[to]) {
      handleDeleteRecordFromHistory(to);
    }
    setLastMonthClose(null);
    handleMonthChange(from);
    triggerToast(`Monatsabschluss zurückgenommen – zurück in ${formatMonthGerman(from)}.`);
    announceToAriaAndSpeech(
      `Monatsabschluss zurückgenommen. Sie arbeiten wieder in ${formatMonthGerman(from)}.`,
      true,
    );
  };

  // --- GERÄTE-SYNC (ausgelagert nach hooks/useGeraeteSync) ---
  // Paket bauen, Paket übernehmen, Live-Verbindung anbinden. Der Hook macht
  // sichtbar, woran dieser Teil hängt -- im Monolithen war das unsichtbar,
  // weil alles im selben Sichtbarkeitsbereich lag.
  const { buildSyncPayload, ersetzeGesamtstand, handleSyncImport } = useGeraeteSync({
    appFields,
    setAppFields,
    history,
    setHistory,
    carryover,
    setCarryover,
    reportData,
    setReportData,
    liveSyncFailed: liveSync.failed,
    zeigeAbbruchHinweis: () => setSyncAbbruchAusgeblendet(false),
    announceToAriaAndSpeech,
    triggerToast,
    setActiveTab,
    onPersistFailure: handleHistoryPersistFailure,
  });

  // --- LOKALE MONATSBERICHT-ERINNERUNG (serverlos, ohne Push-Dienst) ---
  useEffect(() => {
    if (!reportData) return;
    if (localStorage.getItem("aussendienst_pwa_reminder") !== "true") return;
    const now = new Date();
    if (now.getDate() < 8) return;
    const monthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const doneKey = "aussendienst_pwa_reminder_done_" + monthKey;
    if (localStorage.getItem(doneKey)) return;
    localStorage.setItem(doneKey, "1");
    const reminderText = "Erinnerung: Bitte denken Sie an die Abgabe des Monatsberichts an die VL.";
    triggerToast(reminderText);
    announceToAriaAndSpeech(reminderText);
    if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) =>
          reg.showNotification("RV Monatsreport", {
            body: reminderText,
            icon: "./icon-192.png",
            badge: "./icon-192.png",
          }),
        )
        .catch(() => {});
    }
    // Läuft bewusst nur einmal pro Monat (doneKey-Sperre in localStorage).
  }, [reportData?.month]);

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
        triggerToast("Vorlage Geräte-Erprobung geladen");
        break;
      case "Buerotag":
        newValues["std_buero"] = (newValues["std_buero"] || 0) + 8;
        newValues["tage_arbeit"] = (newValues["tage_arbeit"] || 0) + 1;
        newNotes = (newNotes ? newNotes + "\n" : "") + "Regulärer Bürotag.";
        announceToAriaAndSpeech("Template Bürotag angewendet.");
        triggerToast("Vorlage Bürotag geladen");
        break;
      case "Schulung":
        newValues["schul_vorort"] = (newValues["schul_vorort"] || 0) + 1;
        newValues["std_aussendienst"] = (newValues["std_aussendienst"] || 0) + 4;
        newNotes = (newNotes ? newNotes + "\n" : "") + "Schulung vor Ort durchgeführt.";
        announceToAriaAndSpeech("Template Schulung angewendet.");
        triggerToast("Vorlage Schulung geladen");
        break;
    }

    setReportData({
      ...reportData,
      values: newValues,
      valuesUpdatedAt: stempelnGeaenderte(
        reportData.valuesUpdatedAt,
        reportData.values || {},
        newValues,
      ),
      notes: newNotes,
    });
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

        const d = new Date();
        const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (initialData) {
          // Monat absichern, falls er im gespeicherten Stand fehlt
          if (!initialData.month) initialData.month = currentMonthStr;
          // Feld-Zeitstempel aus älteren Ständen nachtragen, solange der
          // Monats-Zeitstempel noch der alte ist (siehe stempelNachtragen).
          initialData.valuesUpdatedAt = stempelNachtragen(
            initialData.values,
            initialData.valuesUpdatedAt,
            savedHistory?.[initialData.month]?.savedAt || new Date(0).toISOString(),
          );
          setReportData(initialData);
        } else {
          setReportData({ month: currentMonthStr, name: "", notes: "", values: {}, timeLogs: [] });
        }

        if (savedHistory) {
          setHistory(savedHistory);
        } else {
          setHistory({});
        }

        // Einstieg nur bei echter Erstnutzung zeigen. Bestehende Nutzer
        // erkennen wir an vorhandenen Daten -- bei ihnen wird die Markierung
        // still gesetzt, damit der Einstieg nicht nachtraeglich aufpoppt.
        const bereitsGesehen = localStorage.getItem(ONBOARDING_KEY) === "1";
        const hatDaten =
          (savedHistory && Object.keys(savedHistory).length > 0) ||
          (initialData &&
            (initialData.name ||
              (initialData.values &&
                Object.values(initialData.values).some((v: any) => typeof v === "number" && v > 0))));
        if (bereitsGesehen || hatDaten) {
          if (!bereitsGesehen) safeSetItem(ONBOARDING_KEY, "1");
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
        }
      } catch (e) {
        console.error("Failed to load from IDB", e);
        const d = new Date();
        const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        setReportData({ month: currentMonthStr, name: "", notes: "", values: {}, timeLogs: [] });
        setHistory({});
        // Im Fehlerfall keinen Einstieg erzwingen -- der Nutzer hat
        // moeglicherweise Daten, die nur gerade nicht lesbar waren.
        setShowOnboarding(false);
      }
    }
    loadData();
  }, []);

  // Emergency synchronous save on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && reportData) {
        // Synchronous emergency save to localStorage to prevent data loss on iOS swipe-close.
        // try/catch statt safeSetItem: hier darf kein alert() das Backgrounding blockieren.
        try {
          localStorage.setItem("aussendienst_pwa_emergency_data", JSON.stringify(reportData));
        } catch (err) {
          console.error("Notfallspeicherung fehlgeschlagen", err);
        }
        // Zusätzlich der normale Weg. Ein Fehler ist hier nicht dramatisch --
        // die Notfallkopie oben in localStorage greift --, aber er gehört
        // wenigstens in die Konsole statt komplett verschluckt zu werden.
        set("aussendienst_pwa_data", reportData).catch((err) =>
          console.error("Sicherung beim Wechsel in den Hintergrund fehlgeschlagen", err),
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [reportData]);

  
  if (!reportData || !history) {
    return <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-color)] text-[var(--text-muted)]">Lade Daten...</div>;
  }

  // Desktop-Layout: standardmäßig automatisch anhand der Fensterbreite.
  // Vorher war es fest aus -- am PC blieben dadurch rund zwei Drittel der
  // Bildschirmbreite ungenutzt, bis man die Einstellung fand. Eine
  // ausdrückliche Wahl in den Optionen hat weiterhin Vorrang.
  const isDesktop =
    accessibility.desktopLayout === undefined ? viewportIsWide : accessibility.desktopLayout;
  const shouldUseCompactFields = isCompactView && !(mobileComfortMode && !isDesktop);

  return (
    <>
      <a href="#main-content" className="skip-link">Zum Hauptinhalt springen</a>
      <div className={isDesktop ? "lg:flex lg:h-screen lg:w-screen lg:overflow-hidden bg-[var(--bg-color)]" : ""}>
      
      {/* SIDEBAR NAVIGATION (Only visible on Desktop when enabled) */}
      {isDesktop && (
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-[var(--border-color)] bg-[var(--card-bg)] h-screen shrink-0 sticky top-0 z-[150] shadow-sm">
          <div className="p-6 pb-4 border-b border-[var(--border-color)]">
             <h1 className="text-2xl font-black text-[var(--text-color)] flex items-center gap-2">
               RV Mobil
             </h1>
             <p className="text-xs text-[var(--text-muted)] font-bold mt-1 uppercase tracking-wider">Desktop Ansicht</p>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
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
                  onClick={() => {
                     triggerHaptic(12);
                     setActiveTab(tab.id as any);
                     if (tab.id === "form") announceToAriaAndSpeech("RV Report Hauptformular angezeigt");
                     else if (tab.id === "time") announceToAriaAndSpeech("RV Zeit und Stempeluhr geöffnet");
                     else if (tab.id === "stats") announceToAriaAndSpeech("RV Analyse und Statistiken geöffnet");
                     else if (tab.id === "history") announceToAriaAndSpeech("RV Archiv geöffnet");
                     else if (tab.id === "options") announceToAriaAndSpeech("Anzeige-Optionen geöffnet");
                     window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all cursor-pointer font-bold ${
                    isSelected ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-md" : "text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text-color)]"
                  }`}
                >
                  <IconComp className={`w-5 h-5 ${isSelected ? "stroke-[2.5]" : "stroke-[2]"}`} />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-6 text-center border-t border-[var(--border-color)]">
             <p className="text-[0.75rem] text-[var(--text-muted)] font-bold opacity-70">
               © 2026 Reinecker Vision
             </p>
          </div>
        </aside>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <div id="main-content" className={`w-full relative ${isDesktop ? 'lg:flex-1 lg:overflow-y-auto lg:h-screen lg:px-6' : ''}`}>
        <div className={`mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative ${isDesktop ? 'lg:max-w-5xl lg:pb-12 xl:max-w-6xl' : 'max-w-2xl'}`}>
      {/* Off-screen live announcer region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {activeTab === "form" && (
        <div className={`animate-fade-in ${isDesktop ? 'lg:pb-8' : 'pb-24'}`}>
          {/* HEADER SECTION (Accessible, modern responsive layout, removed duplicate buttons for clean tidiness) */}
          <header
            className="p-3 sm:p-5 mb-3 sm:mb-4 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)] flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-5 shadow-sm"
            role="banner"
          >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-color)]">
              RV Mobil
            </h1>
            <span className="rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2.5 py-1 text-[0.75rem] font-black uppercase tracking-[0.2em] text-[var(--success-text)]">
              DSGVO & barrierefrei
            </span>
          </div>

          {/* Offline Auto-Save live status feedback */}
          <div className="flex items-center gap-1.5 text-[0.75rem] font-bold text-[var(--text-muted)] uppercase tracking-wider pt-1">
            {saveStatus === "saving" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning-border)] animate-pulse"></span>
                <span>Speichert lokal...</span>
              </>
            ) : saveStatus === "error" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger-solid)]"></span>
                <span className="text-[var(--danger-text)]">Speichern fehlgeschlagen!</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
                <span>Automatisch lokal gesichert ({lastSavedTime})</span>
              </>
            )}
            {liveSync.connected && (
              <button
                type="button"
                onClick={() => setActiveTab("sync")}
                title="Live-Verbindung aktiv – zum Verwalten antippen"
                aria-label={`Live-Verbindung mit dem anderen Gerät ist aktiv.${liveSync.lastSyncTime ? ` Letzter Abgleich um ${liveSync.lastSyncTime} Uhr.` : ""} Antippen zum Verwalten.`}
                className="ml-2 flex items-center gap-1 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2 py-0.5 text-[var(--success-text)] cursor-pointer hover:brightness-110 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden="true"></span>
                <span>Live verbunden</span>
              </button>
            )}
          </div>
        </div>

        {/* Stammdaten: auf dem Handy nebeneinander statt gestapelt -- das
            spart rund 100px Hoehe, ohne etwas zu verstecken. Die Hinweise
            "DSGVO-sicher lokal" und der Archiv-Link entfielen bewusst: beides
            steht bereits im Kopf-Abzeichen bzw. in der Navigation. */}
        <div className="flex flex-row items-stretch gap-2 sm:gap-3 w-full md:w-auto md:max-w-md bg-[var(--bg-color)] p-2.5 sm:p-3 rounded-xl border border-dashed border-[var(--border-color)]" role="group" aria-label="Berichtsmetadaten">
          {/* Month input */}
          <div className="flex-1 min-w-0 space-y-1">
            <label
              htmlFor="meta-month-input"
              className="text-[0.75rem] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1"
            >
              <Calendar className="w-3 h-3 text-[var(--accent)] flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Monat:</span>
            </label>
            <input
              ref={monthInputRef}
              id="meta-month-input"
              type="month"
              value={reportData?.month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full px-2 py-2.5 min-h-[44px] border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg text-xs font-bold focus:border-[var(--border-focus)] outline-none"
              aria-required="true"
            />
          </div>

          {/* Name input */}
          <div className="flex-1 min-w-0 space-y-1">
            <label
              htmlFor="meta-name-input"
              className="text-[0.75rem] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1"
            >
              <User className="w-3 h-3 text-[var(--accent)] flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Mitarbeiter/in:</span>
            </label>
            <input
              ref={nameInputRef}
              id="meta-name-input"
              type="text"
              placeholder="Name..."
              value={
                typeof reportData?.name === "string"
                  ? reportData?.name
                  : String(reportData?.name || "")
              }
              onChange={(e) => handleMetaChange("name", e.target.value)}
              className="w-full px-2 py-2.5 min-h-[44px] border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg text-xs font-bold focus:border-[var(--border-focus)] outline-none"
              autoComplete="name"
              aria-required="true"
            />
          </div>
        </div>
      </header>

      {/* Rückgängig-Angebot nach dem Monatsabschluss.
          role="status" statt "alert": Es ist eine Bestätigung, keine Störung --
          der Screenreader liest sie, ohne den Nutzer zu unterbrechen. */}
      {lastMonthClose && (
        <div
          role="status"
          className="mb-4 p-3.5 rounded-2xl border-2 border-[var(--accent)] bg-[var(--accent)]/10 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <p className="flex-1 min-w-0 text-sm font-bold text-[var(--text-color)] leading-snug">
            <Check className="w-4 h-4 inline-block align-[-2px] mr-1" aria-hidden="true" />
            {formatMonthGerman(lastMonthClose.from)} ist im RV Archiv gesichert.
            Sie arbeiten jetzt in {formatMonthGerman(lastMonthClose.to)}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUndoMonthClose}
              aria-label={`Monatsabschluss rückgängig machen und zurück zu ${formatMonthGerman(lastMonthClose.from)}`}
              className="min-h-[44px] px-4 rounded-xl font-black text-sm bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 transition-all cursor-pointer active:scale-95 focus-visible:ring-4"
            >
              Rückgängig
            </button>
            <button
              type="button"
              onClick={() => setLastMonthClose(null)}
              aria-label="Hinweis zum Monatsabschluss ausblenden"
              className="min-h-[44px] px-4 rounded-xl font-bold text-sm border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-all cursor-pointer active:scale-95 focus-visible:ring-4"
            >
              Alles klar
            </button>
          </div>
        </div>
      )}

      {/* Schnell-Umschalter (kompakt): Sprachansage & Ein-Hand-Modus */}
      <div className="mb-4 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Schnell-Einstellungen">
        <button
          type="button"
          aria-pressed={accessibility.screenReaderNarration}
          onClick={() => {
            setAccessibility((prev) => ({ ...prev, screenReaderNarration: !prev.screenReaderNarration }));
            announceToAriaAndSpeech("Sprachansagen wurden aktualisiert.", true);
          }}
          className={`inline-flex items-center rounded-full px-3.5 min-h-[44px] text-xs font-black transition-all cursor-pointer ${accessibility.screenReaderNarration ? "bg-[var(--accent)] text-[var(--accent-text)]" : "bg-[var(--bg-color)] text-[var(--text-color)] border border-[var(--border-color)]"}`}
        >
          {accessibility.screenReaderNarration ? "Sprachansagen AN" : "Sprachansagen AUS"}
        </button>
        {!isDesktop && (
          <button
            type="button"
            aria-pressed={mobileComfortMode}
            onClick={() => {
              setMobileComfortMode((prev) => !prev);
              announceToAriaAndSpeech("Ein-Hand-Modus aktualisiert.", true);
            }}
            className={`inline-flex items-center rounded-full px-3.5 min-h-[44px] text-xs font-black transition-all cursor-pointer ${mobileComfortMode ? "bg-[var(--accent)] text-[var(--accent-text)]" : "bg-[var(--bg-color)] text-[var(--text-color)] border border-[var(--border-color)]"}`}
          >
            {mobileComfortMode ? "Ein-Hand AN" : "Ein-Hand AUS"}
          </button>
        )}
      </div>

      {/* SCHNELL-ERFASSUNG: Ein Tipp direkt nach dem Termin */}
      <QuickEntryPanel
        appFields={appFields}
        history={history}
        values={reportData?.values || {}}
        config={quickConfig}
        onConfigChange={updateQuickConfig}
        onIncrement={handleQuickIncrement}
        audioFeedbackEnabled={accessibility.audioFeedback}
        announce={announceToAriaAndSpeech}
      />

      {/* MOBILE COMFORT ACTION BAR */}
      {mobileComfortMode && !isDesktop && (
        <div className="mb-4 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-3 shadow-sm" role="toolbar" aria-label="Schnellzugriffe für den Ein-Hand-Modus">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => focusAndAnnounce("month")} className="rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-3 py-1.5 text-xs font-black">Monat</button>
            <button type="button" onClick={() => focusAndAnnounce("name")} className="rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-3 py-1.5 text-xs font-black">Name</button>
            <button type="button" onClick={() => focusAndAnnounce("notes")} className="rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-3 py-1.5 text-xs font-black">Notizen</button>
            <button type="button" onClick={() => setActiveTab("time")} className="rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-3 py-1.5 text-xs font-black">Zeit</button>
          </div>
        </div>
      )}

            {/* SPEICHER-FEHLER BANNER: bleibt sichtbar, bis ein Speichervorgang wieder klappt */}
            {storageWriteFailed && (
              <div
                role="alert"
                className="p-4 mb-4 rounded-xl border-2 border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-start gap-2.5 flex-1">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm font-bold leading-snug">
                    Speichern fehlgeschlagen! Ihre letzten Änderungen sind eventuell nicht dauerhaft
                    gesichert. Bitte erstellen Sie jetzt ein Backup, bevor Sie weiterarbeiten.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("backup")}
                  className="px-4 py-2.5 rounded-xl font-black text-sm bg-[var(--danger-solid)] text-[var(--danger-solid-text)] hover:brightness-110 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap"
                >
                  Jetzt Backup erstellen
                </button>
              </div>
            )}

            {/* ABBRUCH DER LIVE-VERBINDUNG: sichtbarer Hinweis, weil sonst nur
                das grüne Abzeichen verschwindet und niemand es bemerkt. */}
            {liveSync.failed && !syncAbbruchAusgeblendet && (
              <div
                role="alert"
                className="p-4 mb-4 rounded-xl border-2 border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)] flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm font-bold leading-snug">
                    Live-Verbindung unterbrochen. Ihre Eingaben werden weiter auf
                    diesem Gerät gespeichert, aber nicht mehr auf das andere Gerät
                    übertragen.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSyncAbbruchAusgeblendet(true);
                      setActiveTab("sync");
                    }}
                    className="min-h-[44px] px-4 rounded-xl font-black text-sm bg-[var(--warning-solid)] text-[var(--warning-solid-text)] hover:brightness-110 transition-all cursor-pointer whitespace-nowrap focus-visible:ring-4"
                  >
                    Neu verbinden
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncAbbruchAusgeblendet(true)}
                    aria-label="Hinweis zur unterbrochenen Live-Verbindung ausblenden"
                    className="min-h-[44px] px-4 rounded-xl font-bold text-sm border border-[var(--warning-border)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--warning-bg)] transition-all cursor-pointer whitespace-nowrap focus-visible:ring-4"
                  >
                    Ausblenden
                  </button>
                </div>
              </div>
            )}

            {/* DEADLINE NOTIFICATION BANNER -- nur im relevanten Zeitfenster */}
      {deadlineInfo.sichtbar && (
        <div
          role="alert"
          className={`p-3.5 mb-4 rounded-xl border flex gap-2.5 items-center text-xs font-bold leading-snug ${
            deadlineInfo.isUrgent
              ? "bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-text)] animate-pulse"
              : "bg-[var(--alert-bg)] border-[var(--alert-border)] text-[var(--alert-text)]"
          }`}
        >
          <Info
            className="w-4 h-4 flex-shrink-0 text-[var(--warning-text)]"
            aria-hidden="true"
          />
          <p className="flex-1">{deadlineInfo.message}</p>
        </div>
      )}

      {/* Bento Header title & interactive filter toggle */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[0.75rem] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
          Monats-Fortschritt{" "}
          <span className="font-bold text-xs text-[var(--text-muted)] lowercase">
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
            className="text-[0.75rem] font-black text-[var(--danger)] hover:text-[var(--danger-text)] hover:underline flex items-center gap-1 cursor-pointer bg-[var(--danger-bg)] px-2 py-0.5 rounded-md transition-all active:scale-95"
          >
            <span>Filter aufheben</span>
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
          className={`p-3 rounded-2xl border bg-[var(--card-bg)] flex flex-col justify-between shadow-xs hover:border-[var(--cat-1)] transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s1"
              ? "border-2 border-[var(--cat-1)] bg-[var(--cat-1-soft)]"
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
              className="w-8 h-8 rounded-xl bg-[var(--cat-1-soft)] text-[var(--cat-1-text)] border border-[var(--cat-1)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-tight">
                Vorführungen
              </span>
              <span className="text-lg font-black text-[var(--text-color)] leading-none">
                {s1Total}
                {goalsConfig.enabled && (
                  <span className="text-[0.75rem] font-normal text-[var(--text-muted)] ml-0.5">
                    /{goalsConfig.s1}
                  </span>
                )}
              </span>
            </div>
          </div>
          {goalsConfig.enabled && (
            <div
              className="w-full bg-[var(--border-color)] h-1.5 rounded-full mt-2.5 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="bg-[var(--cat-1)] h-full rounded-full transition-all duration-500"
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
          className={`p-3 rounded-2xl border bg-[var(--card-bg)] flex flex-col justify-between shadow-xs hover:border-[var(--cat-2)] transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s2"
              ? "border-2 border-[var(--cat-2)] bg-[var(--cat-2-soft)]"
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
              className="w-8 h-8 rounded-xl bg-[var(--cat-2-soft)] text-[var(--cat-2-text)] border border-[var(--cat-2)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-tight">
                Schulungen
              </span>
              <span className="text-lg font-black text-[var(--text-color)] leading-none">
                {s2Total}
                {goalsConfig.enabled && (
                  <span className="text-[0.75rem] font-normal text-[var(--text-muted)] ml-0.5">
                    /{goalsConfig.s2}
                  </span>
                )}
              </span>
            </div>
          </div>
          {goalsConfig.enabled && (
            <div
              className="w-full bg-[var(--border-color)] h-1.5 rounded-full mt-2.5 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="bg-[var(--cat-2)] h-full rounded-full transition-all duration-500"
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
          className={`p-3 rounded-2xl border bg-[var(--card-bg)] flex flex-col justify-between shadow-xs hover:border-[var(--cat-3)] transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s3"
              ? "border-2 border-[var(--cat-3)] bg-[var(--cat-3-soft)]"
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
              className="w-8 h-8 rounded-xl bg-[var(--cat-3-soft)] text-[var(--cat-3-text)] border border-[var(--cat-3)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-tight">
                Spezial
              </span>
              <span className="text-lg font-black text-[var(--text-color)] leading-none">
                {s3Total}
                {goalsConfig.enabled && (
                  <span className="text-[0.75rem] font-normal text-[var(--text-muted)] ml-0.5">
                    /{goalsConfig.s3}
                  </span>
                )}
              </span>
            </div>
          </div>
          {goalsConfig.enabled && (
            <div
              className="w-full bg-[var(--border-color)] h-1.5 rounded-full mt-2.5 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="bg-[var(--cat-3)] h-full rounded-full transition-all duration-500"
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
          className={`p-3 rounded-2xl border bg-[var(--card-bg)] flex flex-col justify-between shadow-xs hover:border-[var(--cat-4)] transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s4"
              ? "border-2 border-[var(--cat-4)] bg-[var(--cat-4-soft)]"
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
              className="w-8 h-8 rounded-xl bg-[var(--cat-4-soft)] text-[var(--cat-4-text)] border border-[var(--cat-4)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-tight">
                Bürozeit
              </span>
              <span className="text-lg font-black text-[var(--text-color)] leading-none">
                {s4Hours}h
                {goalsConfig.enabled && (
                  <span className="text-[0.75rem] font-normal text-[var(--text-muted)] ml-0.5">
                    /{goalsConfig.s4}
                  </span>
                )}
              </span>
            </div>
          </div>
          {goalsConfig.enabled && (
            <div
              className="w-full bg-[var(--border-color)] h-1.5 rounded-full mt-2.5 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="bg-[var(--cat-4)] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (s4Hours / (goalsConfig.s4 || 1)) * 100)}%`,
                }}
              />
            </div>
          )}
        </button>
      </div>
      </div>

      {/*
        ERGONOMIC CONTROLS DASHBOARD.
        Eine Zeile statt zwei: Der Block kostete auf einem 390-px-Handy 203 px
        (ein Viertel Bildschirm) für drei Umschalter, die man einmal einstellt.
        Die Überschrift ist entfallen -- jede Taste sagt über ihr aria-label
        ohnehin, was sie tut --, und die "Ein/Aus"-Plaketten sind durch
        aria-pressed ersetzt, das Screenreader von sich aus vorlesen.
      */}
      <div className="mb-3 p-2.5 rounded-xl border bg-[var(--card-bg)] border-[var(--border-color)] space-y-2 shadow-xs">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="toolbar"
          aria-label="Schnell-Optionen"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Compact mode toggle */}
            <button
              type="button"
              aria-pressed={isCompactView}
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
              className={`px-2.5 min-h-[44px] rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                isCompactView
                  ? "bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-xs"
                  : "bg-[var(--bg-color)] text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--border-color)]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kompakt</span>
            </button>

            {/* Baseline Template Copy Button (Vormonats-Direktkopie) */}
            {getPreviousSavedMonthRecord() && (
              <button
                type="button"
                onClick={handleCopyPreviousMonth}
                aria-label="Vormonats-Werte als Vorlage laden"
                title="Werte des letzten gesicherten Monats als Vorlage laden"
                className="px-2.5 min-h-[44px] rounded-lg text-xs font-bold border bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)] hover:brightness-110 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Vorlage</span>
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
              className={`px-2.5 min-h-[44px] rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                isReadingSummary
                  ? "bg-[var(--warning-solid)] text-[var(--warning-solid-text)] border-[var(--warning-border)] shadow-xs"
                  : "bg-[var(--bg-color)] text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--border-color)]"
              }`}
            >
              {isReadingSummary ? (
                <>
                  <Square className="w-3 h-3 fill-current" aria-hidden="true" />
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
              aria-expanded={isGoalsEditorOpen}
              aria-label={`Monatsziele einrichten. Ziele sind zurzeit ${goalsConfig.enabled ? "eingeschaltet" : "ausgeschaltet"}.`}
              title="Monatsziele einrichten"
              className={`px-2.5 min-h-[44px] rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                isGoalsEditorOpen
                  ? "bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-xs"
                  : goalsConfig.enabled
                    ? "bg-[var(--cat-3-soft)] text-[var(--cat-3-text)] border-[var(--cat-3)]"
                    : "bg-[var(--bg-color)] text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--border-color)]"
              }`}
            >
              <Target className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ziele</span>
            </button>
          </div>
        </div>

        {/* Inline goals configuration form */}
        {isGoalsEditorOpen && (
          <div
            className="pt-2.5 mt-2.5 border-t border-[var(--border-color)] space-y-2.5 animate-slide-up"
            role="group"
            aria-label="Ziele-Konfiguration"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-color)] flex items-center gap-1">
                <span>Monatsziele festlegen</span>
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
                <div className="w-8 h-4 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--card-bg)] after:border-[var(--border-color)] after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                <span className="ml-1.5 text-[0.75rem] font-bold text-[var(--text-muted)] uppercase">
                  {goalsConfig.enabled ? "Aktiviert" : "Deaktiviert"}
                </span>
              </label>
            </div>

            <p className="text-[0.75rem] text-[var(--text-muted)] leading-relaxed">
              Tragen Sie hier Ihre persönlichen Monatsziele ein. Wenn die Ziele
              aktiviert sind, zeigt Ihnen das Dashboard in den Kacheln Ihren
              aktuellen Fortschritt mit farbigen Balken an.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[0.6875rem] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
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
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg outline-none focus:border-[var(--border-focus)]"
                  disabled={!goalsConfig.enabled}
                />
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
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
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg outline-none focus:border-[var(--border-focus)]"
                  disabled={!goalsConfig.enabled}
                />
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
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
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg outline-none focus:border-[var(--border-focus)]"
                  disabled={!goalsConfig.enabled}
                />
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
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
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-lg outline-none focus:border-[var(--border-focus)]"
                  disabled={!goalsConfig.enabled}
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Search bar (Incredibly efficient for finding products on-the-go) */}
        <div className="pt-2 border-t border-[var(--border-color)]">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--text-muted)]">
              <Search className="w-4 h-4" aria-hidden="true" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nach Produkten oder Kategorien suchen (z.B. WeWalk, Tactonom, Schulung)..."
              aria-label="Nach Produkten oder Kategorien suchen"
              className="w-full pl-9 pr-8 min-h-[44px] border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl text-xs font-bold focus:border-[var(--border-focus)] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Suche löschen"
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-[var(--text-muted)] hover:text-[var(--text-color)]"
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
            className="p-4 sm:p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
            aria-labelledby="section1-heading"
          >
            <h2
              id="section1-heading"
              className="text-lg md:text-xl font-black pb-3 mb-4 border-b-2 border-[var(--border-color)] tracking-tight text-[var(--text-color)]"
            >
              1. Vorführungen & Auslieferungen
            </h2>
            <div className={`grid grid-cols-1 ${isDesktop ? 'lg:grid-cols-2 lg:gap-5' : 'gap-3'}`}>
              {filterFields(appFields.s1).map((field) => (
                <CounterField
                  key={field.id}
                  config={field}
                  value={(reportData?.values || {})[field.id] ?? ""}
                  onChange={(val) => handleValueInput(field.id, val)}
                  onDelta={(delta) => applyValueDelta(field.id, delta)}
                  onAnnounce={announceToAriaAndSpeech}
                  audioFeedbackEnabled={accessibility.audioFeedback}
                  isCompact={shouldUseCompactFields}
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
              className="mt-6 p-4 rounded-xl bg-[var(--total-bg)] text-[var(--total-text)] font-black text-right text-lg border border-[var(--border-color)]"
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
            className="p-4 sm:p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
            aria-labelledby="section2-heading"
          >
            <h2
              id="section2-heading"
              className="text-lg md:text-xl font-black pb-3 mb-4 border-b-2 border-[var(--border-color)] tracking-tight text-[var(--text-color)]"
            >
              2. Schulung, Support & Akquise
            </h2>
            <div className={`grid grid-cols-1 ${isDesktop ? 'lg:grid-cols-2 lg:gap-5' : 'gap-3'}`}>
              {filterFields(appFields.s2).map((field) => (
                <CounterField
                  key={field.id}
                  config={field}
                  value={(reportData?.values || {})[field.id] ?? ""}
                  onChange={(val) => handleValueInput(field.id, val)}
                  onDelta={(delta) => applyValueDelta(field.id, delta)}
                  onAnnounce={announceToAriaAndSpeech}
                  audioFeedbackEnabled={accessibility.audioFeedback}
                  isCompact={shouldUseCompactFields}
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
            className="p-4 sm:p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
            aria-labelledby="section3-heading"
          >
            <h2
              id="section3-heading"
              className="text-lg md:text-xl font-black pb-3 mb-4 border-b-2 border-[var(--border-color)] tracking-tight text-[var(--text-color)]"
            >
              3. Spezialprodukte (Fokus)
            </h2>
            <div className={`grid grid-cols-1 ${isDesktop ? 'lg:grid-cols-2 lg:gap-5' : 'gap-3'}`}>
              {filterFields(appFields.s3).map((field) => (
                <CounterField
                  key={field.id}
                  config={field}
                  value={(reportData?.values || {})[field.id] ?? ""}
                  onChange={(val) => handleValueInput(field.id, val)}
                  onDelta={(delta) => applyValueDelta(field.id, delta)}
                  onAnnounce={announceToAriaAndSpeech}
                  audioFeedbackEnabled={accessibility.audioFeedback}
                  isCompact={shouldUseCompactFields}
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
            className="p-4 sm:p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
            aria-labelledby="section4-heading"
          >
            <h2
              id="section4-heading"
              className="text-lg md:text-xl font-black pb-3 mb-4 border-b-2 border-[var(--border-color)] tracking-tight text-[var(--text-color)]"
            >
              4. Arbeitszeit & Büro
            </h2>
            {accessibility.enableTimeTracking !== false && (
              <div className="mb-4 p-3 rounded-xl bg-[var(--info-bg)] border border-[var(--info-border)] text-[var(--info-text)] text-xs font-bold flex items-start gap-2">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Diese Werte werden automatisch aus Ihrer Stempeluhr (RV Zeit) berechnet und beim Ausstempeln hier eingetragen.</p>
              </div>
            )}
            <div className={`grid grid-cols-1 ${isDesktop ? 'lg:grid-cols-2 lg:gap-5' : 'gap-3'}`}>
              {filterFields(appFields.s4).map((field) => (
                <CounterField
                  key={field.id}
                  config={field}
                  value={(reportData?.values || {})[field.id] ?? ""}
                  onChange={(val) => handleValueInput(field.id, val)}
                  onDelta={(delta) => applyValueDelta(field.id, delta)}
                  onAnnounce={announceToAriaAndSpeech}
                  audioFeedbackEnabled={accessibility.audioFeedback}
                  isCompact={shouldUseCompactFields}
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
            <p className="text-sm font-bold text-[var(--text-muted)]">
              Keine passenden Einträge gefunden für "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition-all"
            >
              Suche zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* SECTION 5: NOTES & ANMERKUNGEN */}
      <section
        className={`p-4 sm:p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]`}
        aria-labelledby="notes-heading"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b-2 border-[var(--border-color)]">
          <h2
            id="notes-heading"
            className="text-lg md:text-xl font-black tracking-tight text-[var(--text-color)]"
          >
            Anmerkungen & Kommentare
          </h2>
          {/* flex-wrap: Bei grosser Schrift passten "Diktieren" und
              "Datumstempel" nicht mehr nebeneinander und schoben die Seite
              waagerecht aus dem Bildschirm (gemessen: 430 px Inhalt auf einem
              360-px-Handy). */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Dictate Speech Input button */}
            <button
              type="button"
              onClick={toggleDictation}
              aria-label={
                isDictating
                  ? "Sprachaufnahme stoppen"
                  : "Notiz per Sprache diktieren"
              }
              className={`py-2 px-3.5 rounded-xl border-2 transition-all cursor-pointer font-black text-sm flex items-center gap-1.5 focus-visible:ring-4 ${
                isDictating
                  ? "bg-[var(--danger-solid)] border-[var(--danger-border)] text-[var(--danger-solid-text)] animate-pulse"
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
              className="py-2 px-3.5 rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:border-[var(--border-focus)] transition-all cursor-pointer font-black text-sm focus-visible:ring-4"
            >
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span>Datumstempel</span>
            </button>
          </div>
        </div>

        <label
          htmlFor="meta-notes-textarea"
          className="text-xs font-bold text-[var(--text-muted)] block mb-2 leading-relaxed"
        >
          Tragen Sie hier wichtige Notizen ein:{" "}
          {/* emerald-700 statt -600: erreicht auf weissem Grund 4,5:1 */}
          <span className="text-[var(--success-text)] font-black">
            Wird nur auf Ihrem Gerät gespeichert
          </span>
        </label>

        {/* Quick templates for notes (excellent usability for sales reps on mobile) */}
        <div
          className="flex flex-wrap gap-1.5 mb-3"
          aria-label="Schnell-Vorlagen für Notizen"
        >
          {[
            {
              label: "Alles planmäßig",
              text: "Alles planmäßig verlaufen. Keine besonderen Vorkommnisse.",
            },
            {
              label: "Messewoche",
              text: "Fokus auf Repräsentanz, Messestand-Betreuung und Neukunden-Akquise vor Ort.",
            },
            {
              label: "Erfolgreiche Schulungen",
              text: "Kundenschulungen wurden sehr erfolgreich absolviert mit durchweg positivem Feedback.",
            },
            {
              label: "Urlaubszeit",
              text: "Erhöhte Abwesenheiten im Berichtszeitraum wegen Urlaubs-/Ferienzeit.",
            },
          ].map((tpl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyNoteTemplate(tpl.text)}
              className="inline-flex items-center px-2.5 min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] hover:border-[var(--border-focus)] hover:bg-[var(--bg-color)] text-[0.75rem] font-black text-[var(--text-color)] transition-all cursor-pointer active:scale-95 focus-visible:ring-2"
              title={`Text einfügen: "${tpl.text}"`}
            >
              {tpl.label}
            </button>
          ))}
        </div>

                  <textarea
          ref={notesInputRef}
          id="meta-notes-textarea"
          value={
            typeof reportData?.notes === "string"
              ? reportData?.notes
              : String(reportData?.notes || "")
          }
          onChange={(e) => handleMetaChange("notes", e.target.value)}
          placeholder="Tragen Sie hier z.B. besondere Vorkommnisse oder Messeergebnisse ein..."
          className="w-full h-36 p-4 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-normal focus:border-[var(--border-focus)] outline-none resize-y leading-relaxed"
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
            className="w-full py-4 px-6 rounded-2xl font-bold bg-[var(--cat-3-soft)] hover:brightness-110 text-[var(--cat-3-text)] border border-[var(--cat-3)] text-base flex items-center justify-center gap-2.5 shadow-sm cursor-pointer transition-all active:scale-[0.99] focus-visible:ring-4"
          >
            <Share2 className="w-5 h-5" aria-hidden="true" />
            <span>Bericht an VL senden (Teilen/E-Mail)</span>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="mt-12 pt-6 pb-2 border-t border-[var(--border-color)] text-center text-xs font-bold text-[var(--text-muted)] space-y-4"
        role="contentinfo"
      >
        <p className="opacity-80 text-[0.75rem]">
          © 2026 Reinecker Vision GmbH | RV Mobil – Konzeptioniert &amp;
          entwickelt von Marc Petry Stramov
        </p>
      </footer>
      </div>
      )}

      {/* INTERAKTIVER EINSTIEG BEI ERSTNUTZUNG */}
      {showOnboarding === true && (
        <OnboardingModal
          name={reportData?.name || ""}
          onNameChange={(n) => handleMetaChange("name", n)}
          settings={accessibility}
          onSettingsChange={setAccessibility}
          onFinish={finishOnboarding}
          announce={announceToAriaAndSpeech}
        />
      )}

      {/* BARRIEREFREIER BESTÄTIGUNGSDIALOG (Ersatz für window.confirm) */}
      <ConfirmDialog
        request={confirmRequest}
        onClose={() => setConfirmRequest(null)}
        announce={announceToAriaAndSpeech}
      />

      {/* TOAST POPUP (With ARIA live attribute) */}
      {toastText && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 bg-[var(--primary)] text-[var(--primary-text)] font-black py-3.5 px-6 rounded-full shadow-2xl z-50 text-sm border border-[var(--border-color)] animate-bounce"
        >
          {toastText}
        </div>
      )}

      {/* HELP & BACKUP MODAL */}
      {activeTab === "help" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <HelpModal
            isOpen={true}
            onClose={() => setActiveTab("options")}
            appFields={appFields}
          />
        </div>
      )}

      {/* SECURE BACKUP MODAL */}
      {activeTab === "backup" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          {/* Backup und Geräte-Sync nutzen dieselbe Paketform und denselben
              Weg zurück -- siehe buildSyncPayload / ersetzeGesamtstand. */}
          <React.Suspense fallback={<BereichLaedt name="Datensicherung" />}>
          <SecureBackupModal
            isOpen={true}
            onClose={() => setActiveTab("options")}
            onExport={buildSyncPayload}
            onImport={(dataStr) => {
              try {
                // Gleiche Struktur-Prüfung wie beim Geräte-Sync: Eine
                // beschädigte Backup-Datei darf die App nicht in den
                // Fehlerbildschirm schicken.
                const geprueft = pruefeSyncPaket(JSON.parse(dataStr));
                if (!geprueft.ok) {
                  const text = `Diese Datei konnte nicht eingespielt werden. ${geprueft.grund}`;
                  triggerToast(text);
                  announceToAriaAndSpeech(text, true);
                  return;
                }
                ersetzeGesamtstand(geprueft.paket);
                setActiveTab("options");
                triggerToast("Backup erfolgreich geladen!");
                announceToAriaAndSpeech("Backup erfolgreich geladen.", true);
              } catch (e) {
                triggerToast("Fehler beim Laden des Backups.");
                announceToAriaAndSpeech("Fehler beim Laden des Backups.", true);
              }
            }}
          />
          </React.Suspense>
        </div>
      )}

      {activeTab === "sync" && (
        <React.Suspense fallback={<BereichLaedt name="Geräte-Sync" />}>
          <DeviceSyncModal
            isOpen={true}
            onClose={() => setActiveTab("options")}
            onExport={buildSyncPayload}
            onImport={(dataStr, strategy) => handleSyncImport(dataStr, strategy)}
            lokaleMonate={Object.keys(history || {}).length}
          />
        </React.Suspense>
      )}

      {/* TIME MODAL (ZEITBEREICH) */}
      {activeTab === "time" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
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
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
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
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <HistoryModal
            appFields={appFields}
            history={history}
            onLoadMonth={handleLoadMonthFromHistory}
            onDeleteRecord={handleDeleteRecordFromHistory}
            announceToAriaAndSpeech={announceToAriaAndSpeech}
            triggerToast={triggerToast}
            onToggleVersand={handleToggleVersandStatus}
            onVersandGemeldet={(monat) => setzeVersandStatus(monat, true)}
          />
        </div>
      )}

      {/* STATS & TRENDS MODAL */}
      {activeTab === "stats" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
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
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
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
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <ChangelogModal onClose={() => setActiveTab("options")} />
        </div>
      )}
      {activeTab === "carryover" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
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
                  className="h-12 px-3 rounded-xl font-black border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] active:scale-95 transition-all text-xs flex items-center justify-center cursor-pointer"
                >
                  ◀ Zurück
                </button>

                <div className="flex-1 min-w-0 text-center px-1">
                  <span className="block text-[0.75rem] font-black uppercase tracking-wider text-[var(--accent)] truncate">
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
                  className="h-12 px-3 rounded-xl font-black border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] active:scale-95 transition-all text-xs flex items-center justify-center cursor-pointer"
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
                  Fertig
                </button>
              </div>
            </div>
          );
        })()}

      {/* RESPONSIVE BOTTOM NAVIGATION DOCK (FLOATING PILL DOCK FOR ERGONOMY & WCAG ACCESS) */}
      {!focusedFieldId && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-xl z-[200] bg-[var(--card-bg)]/90 dark:bg-[var(--card-bg)]/95 backdrop-blur-md border border-[var(--border-color)] py-2.5 px-4 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all ${isDesktop ? 'lg:hidden' : ''}`}
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
                  className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 rounded-xl relative transition-all active:scale-90 cursor-pointer ${
                    isSelected
                      ? "text-[var(--accent)] font-black"
                      : "text-[var(--text-muted)] hover:text-[var(--text-color)] font-bold"
                  }`}
                >
                  <div className="relative p-1">
                    <IconComp
                      className={`w-5 h-5 transition-transform ${isSelected ? "scale-110 stroke-[2.5]" : "stroke-[1.8]"}`}
                    />
                  </div>
                  <span className="text-[0.75rem] mt-0.5 tracking-tight truncate max-w-full">
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
      </div>
      </div>
    </>
  );

}