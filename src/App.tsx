import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useSwipeable } from "react-swipeable";
import {
  Calendar,
  CalendarPlus,
  Check,
  Copy,
  Target,
  Share2,
  User,
  Settings,
  Info,
  Sparkles,
  History,
  Volume2,
  Square,
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
  AccessibilitySettings,
  FieldConfig,
  HistoryRecord,
} from "./types";
import { baueArchivEintrag } from "./utils/archivEintrag";
import { persistHistory, safeSetItem } from "./utils/speicher";
import { useGeraeteSync } from "./hooks/useGeraeteSync";
import { useExport } from "./hooks/useExport";
import { useSprachausgabe } from "./hooks/useSprachausgabe";
import { useEinstellungen } from "./hooks/useEinstellungen";
import { useStempeluhr } from "./hooks/useStempeluhr";
import { useBerichtsdaten } from "./hooks/useBerichtsdaten";
import { useAnsichtsFokus } from "./hooks/useAnsichtsFokus";
import BerichtsBereich from "./components/BerichtsBereich";
import NotizBereich from "./components/NotizBereich";
import { loescheAllesLokal } from "./utils/allesLoeschen";
import { FELD_ZU_ZELLE } from "./utils/vorlageZellen";
import { monthHasContent } from "./utils/monatInhalt";
import { rueckfrageOffen } from "./utils/rueckfrage";
import { stempeln, stempelNachtragen, stempelnGeaenderte } from "./utils/zeitstempel";
import { pruefeSyncPaket } from "./utils/syncSchema";
import {
  sichereSpeicher,
  beurteileSpeicher,
  beurteileSicherung,
  leseLetzteSicherung,
  SpeicherUrteil,
  SicherungsUrteil,
} from "./utils/speicherSchutz";
// Eine Quelle für die Monatsnamen: Dieselbe Funktion lag zuvor zusätzlich
// hier und in HistoryModal.tsx -- drei Kopien, die auseinanderlaufen konnten.
import { formatMonthGerman } from "./utils/dateUtils";
import { subscribeLiveSync, getLiveSyncSnapshot } from "./utils/liveSync";
import A11yModal from "./components/A11yModal";
import QuickEntryPanel from "./components/QuickEntryPanel";
import MonatsKarte from "./components/MonatsKarte";
import FensterHinweis from "./components/FensterHinweis";
import { abonniereFenster, istFensterAktiv } from "./utils/einFenster";
import ConfirmDialog, { ConfirmRequest } from "./components/ConfirmDialog";
import OnboardingModal from "./components/OnboardingModal";

/*
  Geräte-Sync und Datensicherung werden erst geladen, wenn man sie öffnet.
  Beide ziehen schwere Bibliotheken nach (QR-Erzeugung, Kamera-Scanner,
  Animationen), die auf der Startseite niemand braucht. Gemessen: Das
  Start-Bundle schrumpft dadurch von 996 KB auf 610 KB (288 → 173 KB
  komprimiert) -- Ladezeit zählt im Aussendienst bei schlechtem Netz.
*/
const SecureBackupModal = React.lazy(() => import("./components/SecureBackupModal"));
const DeviceSyncModal = React.lazy(() => import("./components/DeviceSyncModal"));

/*
  Seit 0.9.43 werden auch die uebrigen acht Ansichten nachgeladen. Vorher lagen
  sie samt ClockInWidget (1.126 Zeilen, ueber TimeModal) fest im Startbuendel
  -- auch fuer jemanden, der nur Zahlen eintippt.

  DER HAKEN, DER DAS FAST VERHINDERT HAETTE: Nachgeladene Teile stehen NICHT in
  der index.html, der Service Worker legt sie also beim Installieren nicht
  vorab in den Cache (Begruendung steht in public/sw.js). Wer nach einem Update
  offline geht, kaeme an eine Ansicht nicht heran, die er online nie geoeffnet
  hat -- in einer App fuer den Aussendienst der schlechtere Tausch.

  Deshalb steht unten `holeAnsichtenVor()`: Sobald der Browser Luft hat, holt
  die Seite alle acht Teile im Hintergrund. Der Fetch-Handler des Service
  Workers legt jede erfolgreiche Antwort derselben Herkunft in den Cache, also
  sind sie danach offline da. Schneller Start UND offline vollstaendig.
*/
const HelpModal = React.lazy(() => import("./components/HelpModal"));
const ManageModal = React.lazy(() => import("./components/ManageModal"));
const HistoryModal = React.lazy(() => import("./components/HistoryModal"));
const StatsModal = React.lazy(() => import("./components/StatsModal"));
const CarryoverModal = React.lazy(() => import("./components/CarryoverModal"));
const BestandModal = React.lazy(() => import("./components/BestandModal"));
const TimeModal = React.lazy(() => import("./components/TimeModal"));
const ChangelogModal = React.lazy(() =>
  import("./components/ChangelogModal").then((m) => ({ default: m.ChangelogModal })),
);
const BarrierefreiheitModal = React.lazy(() => import("./components/BarrierefreiheitModal"));

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

const ONBOARDING_KEY = "aussendienst_pwa_onboarding_v1";

/**
 * Feldstand je Monat, für Monate ohne Archiveintrag.
 *
 * Warum es das gibt, steht ausführlich an der Stelle, die schreibt
 * (`handleMonthChange`, Abschnitt 1b). Kurz: Ein Monat ohne Zählerwerte,
 * Notizen und Schichten wandert nicht ins Archiv und hinterlässt deshalb
 * keinen `fieldsSnapshot` -- eine dort angelegte eigene Kategorie ging beim
 * Blick in einen Archivmonat verloren. Gemessen am 2026-09-07.
 *
 * Bewusst `localStorage` und nicht IndexedDB: Es gehört zu den Einstellungen,
 * nicht zu den Berichtsdaten, und liegt damit neben
 * `aussendienst_pwa_fields`, dessen Lücke es schließt.
 */
const MONATSFELDER_SCHLUESSEL = "aussendienst_pwa_monatsfelder_v1";

/** Abgelegte Feldstände lesen. Unlesbares gilt als "nichts abgelegt". */
function leseMonatsfelder(): Record<string, SectionsConfig> {
  try {
    const roh = localStorage.getItem(MONATSFELDER_SCHLUESSEL);
    if (!roh) return {};
    const wert = JSON.parse(roh);
    return wert && typeof wert === "object" ? (wert as Record<string, SectionsConfig>) : {};
  } catch {
    return {};
  }
}

/**
 * Die Felder, mit denen die App ausgeliefert wird.
 *
 * Hier stand bis 0.9.22 die Beschreibung von `monthHasContent` -- einer
 * Funktion, die seit 0.9.15 in `utils/monatInhalt.ts` liegt und ihren Text
 * dort nochmals fuehrt. Ein Doc-Block ueber der falschen Deklaration ist
 * schlimmer als keiner: Er beschreibt beim Ueberfliegen etwas, das gar nicht
 * darunter steht.
 */
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
  const [activeTab, setActiveTab] = useState<"form" | "time" | "stats" | "history" | "options" | "help" | "backup" | "manage" | "carryover" | "bestand" | "sync" | "changelog" | "erklaerung">(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      // "form" steht hier, obwohl es auch der Standard unten ist: Die
      // Manifest-Verknuepfung "Zahlen erfassen" zeigt auf ./?tab=form und traf
      // bisher nur zufaellig das Richtige. Aendert sich der Standard je, waere
      // sie stillschweigend kaputt.
      if (tab === "form" || tab === "stats" || tab === "history" || tab === "options") return tab;
      /*
        "bestand" ist per ?tab= erreichbar, obwohl die Ansicht nur ueber die
        Optionen angeboten wird. Zwei Gruende: Eine spaetere
        Startbildschirm-Verknuepfung bleibt moeglich, und die Ansicht laeuft
        damit in ANSICHTEN statt nur in EINSTIEGE -- also im vollen Prueflauf
        (Ueberlauf x drei Schriftgroessen, axe, Kontrast x vier Schemata).
      */
      if (tab === "bestand") return tab;
      if (tab === "time") {
        /*
          Die Manifest-Verknuepfung "Stempeluhr" zeigt hierher. Ein Manifest
          laesst sich nicht pro Einstellung aendern, also bleibt sie stehen --
          sie darf aber nicht doch in die Ansicht fuehren, die der Nutzer
          abgeschaltet hat. Die Einstellung wird hier direkt aus dem Speicher
          gelesen, weil der Zustand `accessibility` erst weiter unten entsteht.
        */
        const roh = localStorage.getItem("aussendienst_pwa_a11y");
        const aus = roh ? JSON.parse(roh)?.enableTimeTracking === false : false;
        return aus ? "form" : "time";
      }
    } catch {
      /* ignore */
    }
    return "form";
  });

  /*
    Nach jedem Ansichtswechsel wandert der Fokus auf die Ueberschrift der neuen
    Ansicht. Vorher blieb er auf der Navigationstaste (die im Dokument HINTER
    dem Inhalt steht) oder fiel auf den Dokumentanfang -- gemessen am 2026-09-15,
    Tabelle in useAnsichtsFokus.ts.
  */
  /*
    Woher der Nutzer kam, wenn er eine Ansicht über ihre Zurück-Taste verlässt.

    Ohne das landet der Fokus auf der Überschrift „Optionen", und wer die
    siebte Menüzeile geöffnet hatte, tastet sich erneut durch sechs. Gesetzt
    wird die Kennung NUR auf dem ausdrücklichen Rückweg -- wer die Ansicht über
    die Navigationsleiste verlässt, hat etwas anderes gedrückt und bekommt
    deshalb die Überschrift. Findet sich die Zeile nicht (das Untermenü
    „Formular anpassen" klappt beim Schliessen zu), fällt es ebenfalls auf die
    Überschrift zurück.
  */
  const rueckkehrRef = useRef<string | null>(null);
  const zurueckZuOptionen = (menueId: string | null) => {
    rueckkehrRef.current = menueId;
    setActiveTab("options");
  };

  useAnsichtsFokus(activeTab, rueckkehrRef);

  /*
    Die nachgeladenen Ansichten im Hintergrund holen, sobald der Browser Luft
    hat. Das ist die Gegenleistung fuer das Nachladen: Der Start bleibt
    schlank, aber wer nach einem Update ins Funkloch faehrt, findet trotzdem
    jede Ansicht -- der Service Worker legt jede geholte Datei in den Cache.
  */
  useEffect(() => {
    const holen = () => {
      void import("./components/TimeModal");
      void import("./components/StatsModal");
      void import("./components/HistoryModal");
      void import("./components/HelpModal");
      void import("./components/ManageModal");
      void import("./components/CarryoverModal");
      void import("./components/BestandModal");
      void import("./components/ChangelogModal");
      void import("./components/BarrierefreiheitModal");
      /*
        Bis 0.9.56 fehlten diese zwei -- neun von elf nachgeladenen Ansichten,
        nicht "jede". Ausgerechnet Datensicherung und Geraete-Sync fehlten:
        Wer nach einem Update ins Funkloch fuhr, fand dort keine Sicherung
        und keinen Sync-Weg mehr -- der Fall, fuer den dieser ganze
        Mechanismus existiert. DeviceSyncModal ist mit rund 116 KB (gzip,
        ueberwiegend die QR-Bibliothek) das schwerste einzelne Buendel der
        App; das kostet hier Netzwerk und Parse-Zeit im Leerlauf nach dem
        Start, nicht die erste Eingabe. Eine leichtere QR-Bibliothek waere
        eine eigene, groessere Aenderung.
      */
      void import("./components/SecureBackupModal");
      void import("./components/DeviceSyncModal");
    };
    const fenster = window as Window & {
      requestIdleCallback?: (r: () => void, o?: { timeout: number }) => number;
    };
    if (fenster.requestIdleCallback) {
      fenster.requestIdleCallback(holen, { timeout: 4000 });
      return;
    }
    // Safari kennt requestIdleCallback nicht -- und Safari ist genau der
    // Browser der Kolleginnen und Kollegen.
    const t = window.setTimeout(holen, 2500);
    return () => window.clearTimeout(t);
  }, []);

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
  
  /*
    BEREICHSNAMEN FÜR DIE ANSAGE -- wörtlich dieselben wie an den vier Kacheln.

    Bis 0.9.21 wechselte das Wischen den Filter STUMM. Ein Wisch blendet drei
    von vier Abschnitten aus dem Dokument aus; wer nicht sieht, dem wurde die
    Seite ohne ein Wort leergeräumt, während jeder Klick auf eine Kachel
    ordentlich „Filter gewechselt auf …" ansagt. Im Quelltext stand die dafür
    angelegte Tabelle sogar schon -- ungenutzt, mitsamt dem Arbeitsvermerk
    „Wait, we need to define this later".
  */
  const bereichsNamen: Record<(typeof tabs)[number], string> = {
    all: "Alle Bereiche",
    s1: "Bereich 1: Vorführungen",
    s2: "Bereich 2: Schulungen & Support",
    s3: "Bereich 3: Spezialprodukte",
    s4: "Bereich 4: Arbeitszeit",
  };

  const wechsleBereich = (ziel: (typeof tabs)[number]) => {
    setActiveSectionTab(ziel);
    triggerHaptic(15);
    announceToAriaAndSpeech(
      ziel === "all"
        ? "Filter auf alle Bereiche zurückgesetzt"
        : `Filter gewechselt auf ${bereichsNamen[ziel]}`,
    );
  };

  const handleSwipeLeft = () => {
    const currentIndex = tabs.indexOf(activeSectionTab);
    if (currentIndex < tabs.length - 1) wechsleBereich(tabs[currentIndex + 1]);
  };

  const handleSwipeRight = () => {
    const currentIndex = tabs.indexOf(activeSectionTab);
    if (currentIndex > 0) wechsleBereich(tabs[currentIndex - 1]);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    trackMouse: false
  });

  // Sticky, bis ein Speichervorgang wieder erfolgreich war -- damit ein
  // Außendienstler nie fälschlich "gesichert" sieht, während im Hintergrund
  // etwas schiefgeht (z. B. Speicher voll, IndexedDB blockiert).

  // Live-Sync-Status (Verbindung lebt außerhalb dieses Fensters weiter)
  const liveSync = useSyncExternalStore(subscribeLiveSync, getLiveSyncSnapshot);
  // Nur das zuletzt geöffnete Fenster arbeitet (0.9.67, siehe einFenster.ts).
  const fensterAktiv = useSyncExternalStore(abonniereFenster, istFensterAktiv);

  // Barrierefreier Ersatz für window.confirm() (siehe ConfirmDialog.tsx)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
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
  const [isGoalsEditorOpen, setIsGoalsEditorOpen] = useState(false);

  // Acoustic Auditor state

  // Toast notification state
  const [toastText, setToastText] = useState("");
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Datenverlust-Schutz (0.9.16) -- Begruendung im Effekt-Block weiter unten.
  const [speicherUrteil, setSpeicherUrteil] = useState<SpeicherUrteil | null>(null);
  const [sicherungUrteil, setSicherungUrteil] = useState<SicherungsUrteil | null>(null);
  const [speicherHinweisAusgeblendet, setSpeicherHinweisAusgeblendet] = useState(false);
  const [sicherungHinweisAusgeblendet, setSicherungHinweisAusgeblendet] = useState(false);
  const speicherGeprueftRef = useRef(false);

  // --- BERICHTSDATEN (ausgelagert nach hooks/useBerichtsdaten) ---
  // Monatsdaten, Archiv und ihre Speicherung. Steht VOR allen anderen Hooks,
  // weil praktisch jeder reportData oder history braucht.
  //
  // Der Hook sagt bewusst nichts an: Er meldet ueber speicherFehler nur, DASS
  // etwas fehlschlug. Braeuchte er die Sprachausgabe, haetten wir einen Ring --
  // die braucht ihrerseits reportData von hier.
  const {
    reportData, setReportData,
    history, setHistory,
    saveStatus, lastSavedTime,
    storageWriteFailed, ladeFehler,
    speicherFehler, fehlerZaehler, handleHistoryPersistFailure,
    applyValueDelta, handleValueInput, handleMetaChange,
    lastMonthClose, setLastMonthClose,
  } = useBerichtsdaten({
    appFields,
    setShowOnboarding,
    onboardingSchluessel: ONBOARDING_KEY,
  });

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

  /**
   * Speicherfehler ansagen.
   *
   * Der Datenhook meldet nur, DASS etwas fehlschlug -- die Ansage sitzt hier,
   * weil sie sonst eine Ringabhängigkeit erzeugte: Die Sprachausgabe braucht
   * `reportData`, das aus eben jenem Hook kommt.
   *
   * Ein fehlgeschlagener Schreibvorgang MUSS hörbar sein. Ohne diese Meldung
   * arbeitet jemand weiter im guten Glauben, und beim nächsten Öffnen ist die
   * Arbeit weg.
   */
  useEffect(() => {
    if (!speicherFehler) return;
    announceToAriaAndSpeech(
      speicherFehler === "archiv"
        ? "Achtung: Das RV Archiv konnte nicht gespeichert werden. Bitte jetzt ein Backup erstellen."
        : "Achtung: Speichern fehlgeschlagen. Bitte jetzt ein Backup erstellen, damit keine Daten verloren gehen.",
      true,
    );
    // `fehlerZaehler` gehört in die Abhängigkeiten, nicht nur `speicherFehler`:
    // Zwei gleichartige Fehlschläge hintereinander setzen denselben String, der
    // Effekt liefe sonst kein zweites Mal und der zweite Fehlversuch bliebe
    // stumm.
  }, [speicherFehler, fehlerZaehler, announceToAriaAndSpeech]);

  /**
   * Lesefehler beim Start ansagen.
   *
   * Arbeitsteilung, weil die Fehleransicht die übrige App ersetzt: Den
   * Screenreader erreicht der Text über das `role="alert"` der Ansicht — das
   * wird erst nach dem Fehlschlag ins Dokument gehängt und deshalb angesagt.
   * Der reguläre Live-Bereich existiert in diesem Zweig gar nicht (nachgemessen
   * am 2026-09-07: `[aria-live]` findet dort nichts); dieser Aufruf trägt hier
   * also die *Sprachausgabe*, nicht die ARIA-Meldung.
   */
  useEffect(() => {
    if (!ladeFehler) return;
    announceToAriaAndSpeech(
      "Ihre Daten konnten nicht gelesen werden. Sie sind nicht verloren, aber gerade nicht abrufbar. " +
        "Es wird nichts gespeichert, damit nichts überschrieben wird. Bitte laden Sie die App erneut.",
      true,
    );
  }, [ladeFehler, announceToAriaAndSpeech]);

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
      /*
        Solange eine Rueckfrage steht, ruhen diese Kuerzel. Alt+Umschalt+H
        haette sonst ins Archiv gewechselt, waehrend vorn noch "Endgueltig
        loeschen?" steht -- der Dialog wird ausserhalb der Reiter-Umschaltung
        gerendert und bliebe ueber der neuen Ansicht stehen. Begruendung und
        Messung in `utils/rueckfrage.ts`.
      */
      if (rueckfrageOffen()) return;

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
        // neuerWert lokal berechnet statt in setAccessibility(prev => ...):
        // announceToAriaAndSpeech im selben Tick saehe sonst noch den ALTEN
        // Wert (siehe Kommentar an der Funktion in useSprachausgabe.ts).
        const neuerWert = !accessibility.screenReaderNarration;
        setAccessibility((prev) => ({ ...prev, screenReaderNarration: neuerWert }));
        announceToAriaAndSpeech(
          neuerWert ? "Sprachansagen eingeschaltet." : "Sprachansagen ausgeschaltet.",
          true,
          undefined,
          undefined,
          neuerWert,
        );
      } else if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        setMobileComfortMode((prev) => !prev);
        announceToAriaAndSpeech("Ein-Hand-Modus aktualisiert.", true);
      } else if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        if (accessibility.enableTimeTracking === false) {
          announceToAriaAndSpeech(
            "Die Zeiterfassung ist abgeschaltet. Sie lässt sich in den Optionen wieder einschalten.",
            true,
          );
          return;
        }
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
  }, [announceToAriaAndSpeech, focusAndAnnounce, accessibility.enableTimeTracking]);

  // --- STEMPELUHR (ausgelagert nach hooks/useStempeluhr) ---
  // Der laufende Einstempel-Zeitpunkt liegt in localStorage, nicht im Bericht:
  // Er ueberlebt damit ein Neuladen und das Entladen der Seite durch iOS. Wer
  // morgens einstempelt, findet die Schicht abends wieder.
  const {
    clockInTime,
    handleClockIn,
    handleClockOut,
    handleDeleteLog,
    handleManualLogAdd,
  } = useStempeluhr({
    setReportData,
    announceToAriaAndSpeech,
    triggerToast,
    triggerHaptic,
  });

  // --- EINSTELLUNGEN (ausgelagert nach hooks/useEinstellungen) ---
  // Alles, was der Nutzer EINMAL einstellt und was danach bleibt -- getrennt
  // von den Monatsdaten, die sich staendig aendern. Die Trennung folgt der
  // Speicherung: Einstellungen liegen in localStorage (klein, beim Start
  // sofort lesbar), Bericht und Archiv in der IndexedDB.
  const {
    quickConfig,
    updateQuickConfig,
    goalsConfig,
    updateGoalsConfig,
    carryover,
    setCarryover,
    updateCarryover,
    bestand,
    setBestand,
  } = useEinstellungen({
    appFields,
    accessibility,
    isCompactView,
    mobileComfortMode,
    triggerToast,
    announceToAriaAndSpeech,
  });

  // --- DEADLINE LOGIC ---
  const getDeadlineAlert = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const realCurrentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    // Check if we have any counts registered in the values
    const hasValues = Object.values(reportData?.values || {}).some(
      (v) => typeof v === "number" && v > 0,
    );
    /*
      ZWEI FEHLER, DIE HIER BIS 0.9.21 STANDEN.

      1. Der Name sagte „isPastDeadlineMonth", die Bedingung war aber nur
         „irgendein anderer Monat als der laufende" -- also auch jeder
         ZUKÜNFTIGE. Wer am 3. September vorausschauend auf Oktober wechselt
         und dort etwas einträgt, bekam einen dringlichen Fristalarm für einen
         Monat, dessen Frist Wochen entfernt ist.
      2. Der Alarm behauptete „Sie haben ungesendete Zählerstände", hat den
         Versandstatus aber nie gelesen: `history` kam in dieser Funktion nicht
         vor. Wer den Bericht am 2. September gesendet hatte, wurde bis zum 8.
         weiter aufgefordert, ihn „sofort" zu senden -- in einem `role="alert"`
         mit Sprachansage. Eine Warnung, die auch nach dem Erledigen weiter
         warnt, bringt man sich bei zu überhören.
    */
    const istFrueher = !!reportData?.month && reportData.month < realCurrentMonthStr;
    const bereitsGesendet = !!(reportData?.month && history?.[reportData.month]?.sentAt);

    if (currentDay <= 8 && istFrueher && hasValues && !bereitsGesendet) {
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
      message: `Hinweis für den Monatsabschluss: Bitte senden Sie den Report bis spätestens zum 8. des Folgemonats als Excel-Datei an die Vertriebsleitung (VL).`,
    };
  };

  const deadlineInfo = getDeadlineAlert();

  // --- SCHNELL-ERFASSUNG: EIN TIPP = +1 ---
  const handleQuickIncrement = useCallback((field: FieldConfig) => {
    triggerHaptic(15);
    const newVal = applyValueDelta(field.id, field.step);
    announceToAriaAndSpeech(`${field.label}: ${newVal}`, false, field.id, newVal);
  }, [applyValueDelta, announceToAriaAndSpeech]);

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

    /*
      1b. Feldstand des verlassenen Monats sichern -- aber nur, wenn er NICHT
      ins Archiv gewandert ist.

      Gemessen am 2026-09-07: Wer in einem noch leeren Monat eine eigene
      Kategorie anlegt und dann in einen Archivmonat schaut, hatte sie danach
      nicht mehr. Die Kette: `monthHasContent()` kennt Notizen, Zählerwerte und
      Schichten, aber keine Feldkonfiguration -- der leere Monat wandert also
      nicht ins Archiv und hinterlässt keinen `fieldsSnapshot`. Gleich darauf
      ersetzt `setAppFields(savedRecord.fieldsSnapshot)` die Konfiguration, und
      der useEffect in `useEinstellungen.ts` schreibt sie sofort nach
      `localStorage`. Damit war die eigene Kategorie endgültig weg.

      Den Schnappschuss beim Öffnen NICHT anzuwenden wäre die falsche Abhilfe:
      Dann stünden die alten Zahlen unter Kategorien, die es damals nicht gab.
      Kaputt ist nur, dass der eigene Stand dabei verlorengeht -- also wird er
      hier abgelegt und beim Zurückwechseln wieder geholt.

      Selbstaufräumend: Ist der Monat archiviert, trägt der Archiveintrag den
      Schnappschuss, und der Eintrag hier wird gelöscht. Es sammeln sich also
      nur die wenigen Monate an, die nie Inhalt bekommen haben.
    */
    if (currentMonth && currentMonth !== newMonth) {
      const abgelegt = leseMonatsfelder();
      if (hasData) delete abgelegt[currentMonth];
      else abgelegt[currentMonth] = appFields;
      safeSetItem(MONATSFELDER_SCHLUESSEL, JSON.stringify(abgelegt));
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
      // Kein Archiveintrag -- also den zuletzt abgelegten Feldstand dieses
      // Monats zurückholen, falls es einen gibt (siehe 1b).
      const abgelegt = leseMonatsfelder()[newMonth];
      if (abgelegt) setAppFields(abgelegt);
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

  /*
    Aus welcher Ansicht das Jahreskonto geoeffnet wurde -- "RV Zeit" oder
    "Optionen". Vorher zeigte sein Schliessen fest auf "time"; seit es einen
    zweiten Einstieg gibt, waere das ein Sprung in eine Ansicht, die der
    Nutzer vielleicht gar nicht sehen will (oder die abgeschaltet ist).
  */
  const carryoverHerkunftRef = useRef<"time" | "options">("time");

  /**
   * Alle Schicht-Aufzeichnungen von diesem Geraet entfernen.
   *
   * Die Zaehlerstaende bleiben absichtlich stehen: Sie sind der Bericht, der
   * an die Vertriebsleitung geht. Wer den Nachweis loescht, soll damit keine
   * bereits gemeldete Zahl veraendern.
   */
  const handleSchichtenLoeschen = useCallback(() => {
    setConfirmRequest({
      title: "Erfasste Schichten löschen?",
      message:
        "Alle Schicht-Aufzeichnungen werden von diesem Gerät entfernt – im laufenden Monat und im RV Archiv. Ihre Zählerstände im Bericht bleiben unverändert.",
      details: ["Das lässt sich nicht rückgängig machen."],
      confirmLabel: "Endgültig löschen",
      tone: "danger",
      onConfirm: () => {
        localStorage.removeItem("aussendienst_pwa_clock_in_time_v2");
        setReportData((prev) => (prev ? { ...prev, timeLogs: [] } : prev));
        setHistory((prev) => {
          if (!prev) return prev;
          const updated: Record<string, HistoryRecord> = {};
          for (const [monat, eintrag] of Object.entries(prev)) {
            updated[monat] = { ...eintrag, timeLogs: [] };
          }
          persistHistory(updated, handleHistoryPersistFailure, "schichten-loeschen");
          return updated;
        });
        triggerToast("Erfasste Schichten gelöscht.");
        announceToAriaAndSpeech(
          "Alle erfassten Schichten wurden gelöscht. Die Zählerstände im Bericht sind unverändert.",
          true,
        );
      },
    });
  }, [
    setConfirmRequest, setReportData, setHistory,
    handleHistoryPersistFailure, triggerToast, announceToAriaAndSpeech,
  ]);

  /*
    „Gerät geht zurück ans Haus" -- der Fall, den 0.9.38 benannt und nicht
    bedient hat. Einzelne Monate, eigene Felder und Schichten liessen sich
    löschen, das ganze Gerät nur über den Absturzbildschirm, den niemand
    absichtlich aufsuchen kann.

    Die dritte Taste ist hier kein Schmuck: Wer „alles löschen" liest, hat
    meist genau eine Sorge -- dass etwas verlorengeht, das er noch braucht.
    „Zuerst sichern" führt in die Datensicherung, statt ihm zu raten, sie
    selbst zu finden. Es ist die zweite Rückfrage der App mit drei Antworten,
    nach der Blattwahl vor dem Senden.
  */
  const handleAllesLoeschen = useCallback(() => {
    const monate = Object.keys(history || {}).length;
    const schichten = new Set([
      ...(reportData?.timeLogs || []).map((s) => s.id),
      ...Object.values(history || {}).flatMap((e) => (e.timeLogs || []).map((s) => s.id)),
    ]).size;
    const eigeneFelder = Object.values(appFields)
      .flat()
      .filter((f) => f.isCustom).length;

    setConfirmRequest({
      title: "Wirklich alle Daten von diesem Gerät löschen?",
      message:
        "Danach ist die App wie neu. Alles liegt nur auf diesem Gerät – es gibt keinen Server, von dem sich etwas zurückholen liesse.",
      details: [
        `RV Archiv: ${monate} ${monate === 1 ? "gespeicherter Monat" : "gespeicherte Monate"}`,
        `Erfasste Schichten: ${schichten}`,
        `Eigene Kategorien: ${eigeneFelder}`,
        "Dazu der laufende Monat, alle Einstellungen, das Jahreskonto und die Liste Meine Demogeräte.",
        "Das lässt sich nicht rückgängig machen.",
      ],
      confirmLabel: "Endgültig löschen",
      cancelLabel: "Abbrechen",
      tone: "danger",
      alternative: {
        label: "Zuerst Daten sichern",
        onSelect: () => setActiveTab("backup"),
      },
      onConfirm: () => {
        void (async () => {
          try {
            await loescheAllesLokal();
          } catch {
            /*
              Ehrlich bleiben duerfen wir nur wegen der Reihenfolge in
              loescheAllesLokal: IndexedDB zuerst. Schlaegt sie fehl, ist
              localStorage unberuehrt -- es ist wirklich nichts weg.
            */
            triggerToast("Löschen fehlgeschlagen.");
            announceToAriaAndSpeech(
              "Das Löschen ist fehlgeschlagen. Es wurde nichts entfernt. Bitte versuchen Sie es erneut.",
              true,
            );
            return;
          }
          announceToAriaAndSpeech(
            "Alle Daten wurden von diesem Gerät gelöscht. Die App startet jetzt neu.",
            true,
          );
          // Kurz warten, damit die Ansage noch gesprochen wird -- ein
          // sofortiges Neuladen schneidet sie ab.
          window.setTimeout(() => window.location.reload(), 1600);
        })();
      },
    });
  }, [
    history, reportData, appFields, setConfirmRequest, setActiveTab,
    triggerToast, announceToAriaAndSpeech,
  ]);

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
    handleExportTimeLogsExcel,
    handleSendToVL,
  } = useExport({
    reportData,
    appFields,
    history,
    accessibility,
    setHistory,
    announceToAriaAndSpeech,
    triggerToast,
    triggerHaptic,
    setConfirmRequest,
    onPersistFailure: handleHistoryPersistFailure,
  });

  /**
   * Der **jüngste** archivierte Monat, der nicht der gerade bearbeitete ist.
   *
   * Hieß bis 0.9.21 `getPreviousSavedMonthRecord`, und der Kommentar sprach vom
   * „closest chronologically saved month". Beides traf nicht zu: Sortiert wird
   * absteigend und `[0]` genommen -- das ist der neueste Eintrag, unabhängig
   * davon, ob er vor oder nach dem Arbeitsmonat liegt. Wer aus dem Archiv den
   * Januar öffnet und daneben den August archiviert hat, bekam über die Taste
   * „Vorlage" die August-Zahlen, während die Beschriftung „Vormonats-Werte"
   * versprach. Der Bestätigungsdialog nannte den Monat schon immer richtig --
   * für die blinde Zielgruppe war der Name vor dem Antippen aber der einzige
   * Hinweis.
   */
  const getJuengsterArchivMonat = (): HistoryRecord | null => {
    if (!history) return null;
    const savedMonths = Object.keys(history).filter(
      (m) => m !== reportData?.month,
    );
    if (savedMonths.length === 0) return null;
    savedMonths.sort((a, b) => b.localeCompare(a));
    return history[savedMonths[0]];
  };

  const handleCopyPreviousMonth = () => {
    const prevRecord = getJuengsterArchivMonat();
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
    /*
      Die Zelle gehört in die Rückfrage (0.9.45). Vorher stand dort nur, dass
      der Wert dieses Monats verlorengeht -- das ist das Kleinere. 15 der 19
      Standardkategorien füllen eine feste Zeile der Firmenvorlage; wer eine
      davon löscht, erzeugt eine Zeile, die in JEDEM künftigen Bericht leer
      bleibt. Und eine leere Zeile sieht aus wie eine Null. Genau dieser
      Fehler ist 0.9.11 schon einmal aufgetreten.
    */
    const zelle = FELD_ZU_ZELLE[fieldId];
    setConfirmRequest({
      title: "Kategorie löschen?",
      message: `„${label}“ wird endgültig aus dem Formular entfernt. Der bisher erfasste Wert für diesen Monat geht dabei verloren.`,
      details: zelle
        ? [
            `Diese Kategorie füllt Zeile ${zelle} im Firmenformular. Nach dem Löschen bleibt diese Zeile in jedem Bericht leer.`,
          ]
        : undefined,
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
   * arbeiten beginnt, verschwindet das Angebot -- allerdings nur ueber
   * `handleValueChange` und `handleMetaChange`. Andere Wege in denselben
   * Zustand (Aus- und Einstempeln, Vorlage laden, Feld loeschen,
   * Werkseinstellungen) leeren es NICHT. Datenverlust entsteht dadurch nicht,
   * `monthHasContent` verhindert das Loeschen des Archiveintrags; das Angebot
   * steht dann nur laenger da, als der Satz oben verspricht. Die frueher hier
   * genannte Funktion `clearMonthCloseUndo` gibt es im Projekt nicht mehr.
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
  const { buildSyncPayload, handleSyncImport } = useGeraeteSync({
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
    bestand,
    setBestand,
    onPersistFailure: handleHistoryPersistFailure,
  });

  // --- DATENVERLUST-SCHUTZ (0.9.16) ---
  //
  // Bis hierher lag das Archiv in "best effort"-Speicher, den der Browser
  // jederzeit raeumen darf: iOS loescht ihn bei nicht installierten Seiten nach
  // sieben Tagen ohne Nutzung, Chrome bei Speicherdruck. Fuer eine App, in der
  // jemand nach einem Termin Zahlen erfasst und danach zwei Wochen keinen
  // Termin hat, ist das der Fehler mit dem groessten Schaden.
  //
  // Die Beurteilung liegt als reine Funktion in utils/speicherSchutz.ts.
  useEffect(() => {
    // Erst wenn die App wirklich steht: Eine Ansage vor dem Laden der
    // Barrierefreiheits-Einstellungen ginge verloren.
    if (!reportData) return;
    if (speicherGeprueftRef.current) return;
    speicherGeprueftRef.current = true;

    sichereSpeicher().then((lage) => {
      const urteil = beurteileSpeicher(lage);
      setSpeicherUrteil(urteil);
      if (urteil.stufe === "sicher") return;

      // Abgestuft, damit die Warnung nicht abstumpft: "kritisch" heisst, der
      // Verlust kommt nach dokumentierter Browser-Regel -- das wird bei jedem
      // Start gesagt, bis es behoben ist. Die weicheren Stufen sagen es einmal;
      // danach steht es nur noch im Band.
      const nurEinmal = urteil.stufe !== "kritisch";
      const einmalSchluessel = "aussendienst_pwa_speicherhinweis_" + urteil.stufe;
      if (nurEinmal) {
        if (localStorage.getItem(einmalSchluessel)) return;
        safeSetItem(einmalSchluessel, "1");
      }
      announceToAriaAndSpeech(`${urteil.ansage} ${urteil.rat ?? ""}`.trim(), true);
    });
  }, [reportData, announceToAriaAndSpeech]);

  // --- SICHERUNGS-ERINNERUNG ---
  // Getrennt von der Abgabe-Erinnerung weiter unten: Die erinnert an die
  // Abgabe an die VL, nicht daran, die Daten vor Verlust zu schuetzen. Bis
  // 0.9.16 gab es fuer Letzteres gar nichts.
  useEffect(() => {
    if (!reportData || !history) return;
    const hatInhalt =
      Object.keys(history).length > 0 || monthHasContent(reportData);
    const urteil = beurteileSicherung(leseLetzteSicherung(), new Date(), hatInhalt);
    setSicherungUrteil(urteil.faellig ? urteil : null);
    /*
      `activeTab` gehört in die Abhängigkeiten, obwohl es im Rumpf nicht
      vorkommt -- und das ist hier kein Versehen, sondern der Punkt.

      `merkeSicherung()` schreibt nur nach `localStorage` und löst kein neues
      Rendern aus. Mit den Abhängigkeiten `[reportData, history]` allein lief
      dieser Effekt nach einer erstellten Sicherung erst bei der nächsten
      Datenänderung wieder: Wer dem Band folgte, ein Backup erstellte und
      zurückging, sah „Ihre letzte Datensicherung ist 21 Tage her" unverändert
      weiterstehen -- und sicherte womöglich ein zweites Mal.

      Der Wechsel der Ansicht ist der zuverlässige Zeitpunkt dafür: Das Band
      steht im Formular, die Sicherung entsteht in einer anderen Ansicht. Wer
      es wiedersehen kann, hat vorher navigiert.
    */
  }, [reportData, history, activeTab]);

  // --- LOKALE MONATSBERICHT-ERINNERUNG (serverlos, ohne Push-Dienst) ---
  useEffect(() => {
    if (!reportData) return;
    if (localStorage.getItem("aussendienst_pwa_reminder") !== "true") return;
    const now = new Date();
    if (now.getDate() < 8) return;
    const monthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const doneKey = "aussendienst_pwa_reminder_done_" + monthKey;
    if (localStorage.getItem(doneKey)) return;
    // safeSetItem statt localStorage.setItem: Ein rohes setItem im Rumpf eines
    // Effekts reißt bei vollem Kontingent (QuotaExceededError) die ganze App in
    // die ErrorBoundary -- der Nutzer sähe ab dem 8. des Monats statt des
    // Formulars den Absturzbildschirm. Es war die einzige Stelle im Projekt,
    // die am Schutz vorbeischrieb.
    safeSetItem(doneKey, "1");
    const reminderText = "Erinnerung: Bitte denken Sie an die Abgabe des Monatsberichts an die VL.";
    triggerToast(reminderText);
    announceToAriaAndSpeech(reminderText);
    if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) =>
          reg.showNotification("RV Mobil", {
            body: reminderText,
            icon: "./icon-192.png",
            badge: "./icon-192.png",
          }),
        )
        .catch(() => {});
    }
    // Läuft bewusst nur einmal pro Monat (doneKey-Sperre in localStorage).
  }, [reportData?.month]);

  /* Hier standen bis 0.9.21 42 Zeilen `applyTemplate` mit drei fertigen
     Vorlagen (Geräte-Erprobung, Bürotag, Schulung) -- inklusive Schreibzugriff
     auf `reportData` und gepflegten Zeitstempeln. Der Bezeichner kam in der
     ganzen Datei genau einmal vor: in seiner eigenen Definition. Es gab keinen
     Aufrufer; die sichtbaren „Vorlagen"-Knöpfe rufen `handleApplyNoteTemplate`
     auf, das nur Text an die Notiz anhängt. Entfernt, weil toter Code mit
     Schreibzugriff bei der nächsten Durchsicht als Feature gelesen wird. */

  /*
    Zustimmung vor dem ersten Diktat.

    WARUM DAS NOETIG IST: Das Diktat nutzt die Spracherkennung des
    Browsers (`webkitSpeechRecognition`). Die arbeitet NICHT auf dem
    Geraet, sondern schickt die Aufnahme an den Anbieter des Browsers --
    bei Chrome an Google, bei Safari an Apple.

    Die App verspricht an mehreren Stellen das Gegenteil ("keine externen
    Dienste", "kein Server, der mithoert"). Das ist kein Schleichweg --
    der Nutzer drueckt die Taste --, aber er drueckt sie im Vertrauen auf
    eine Zusage, die an dieser einen Stelle nicht stimmt. Und es trifft
    ausgerechnet das Notizfeld, in dem Schulnamen stehen.

    Also: einmal ausdruecklich fragen, in klaren Worten, und die Antwort
    merken. Wer ablehnt, tippt -- das Feld bleibt bedienbar.
  */
  const DIKTAT_ZUSTIMMUNG = "aussendienst_pwa_diktat_ok_v1";
  const handleDiktat = useCallback(() => {
    let schonZugestimmt = false;
    try {
      schonZugestimmt = localStorage.getItem(DIKTAT_ZUSTIMMUNG) === "1";
    } catch {
      /* Kein Speicher: dann eben jedes Mal fragen. */
    }
    if (schonZugestimmt || isDictating) {
      toggleDictation();
      return;
    }
    setConfirmRequest({
      title: "Diktat nutzt einen fremden Dienst",
      message:
        "Die Spracherkennung läuft nicht auf Ihrem Gerät. Ihre Aufnahme wird an den Anbieter Ihres Browsers übertragen – bei Chrome an Google, bei Safari an Apple. Das ist der einzige Teil der App, bei dem das passiert.",
      details: [
        "Sprechen Sie keine Namen oder andere vertrauliche Angaben ein.",
        "Sie können stattdessen jederzeit tippen.",
        "Diese Frage kommt nur einmal.",
      ],
      confirmLabel: "Verstanden, diktieren",
      cancelLabel: "Lieber tippen",
      onConfirm: () => {
        safeSetItem(DIKTAT_ZUSTIMMUNG, "1");
        toggleDictation();
      },
    });
  }, [isDictating, toggleDictation, setConfirmRequest]);

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

  /*
    Verzögertes Aufheben des Feldfokus. Die 120 ms sind unverändert aus dem
    vorherigen Inline-Rückruf übernommen: Ohne sie verschwindet die untere
    Navigationsleiste (`!focusedFieldId`) für einen Lidschlag, sobald der
    Fokus von einem Zählerfeld zum nächsten wandert.
  */
  /*
    Die Hauptnavigation als EINE Liste (0.9.42).

    Bis dahin stand sie zweimal da -- einmal in der Seitenleiste, einmal in der
    unteren Leiste --, wortgleich bis auf die Darstellung, samt der fünf
    Ansage-Zweige im Klickblock. Dass das nicht bloss unschön war, zeigt 0.9.41:
    Die beiden Leisten waren auseinandergelaufen, die eine gab sich als
    Reitersatz aus, die andere markierte den aktuellen Eintrag gar nicht. Wer
    hier etwas ändert, ändert es jetzt an einer Stelle für beide.

    Die Ansage steht mit in der Liste und nicht in einer if-Kette: So kann kein
    Eintrag ohne Ansage existieren.
  */
  /*
    VIER STATIONEN, KURZE WOERTER (0.9.45) -- und beides ist gemessen, nicht
    gestaltet.

    Bei "Extra gross" war bis 0.9.44 JEDE der fuenf Beschriftungen
    abgeschnitten: 51 px Taste bei 360 px Breite, 44 px bei 320 px -- gegen
    57 bis 88 px Bedarf. Lautlos, denn `truncate` laesst nichts ueberlaufen
    und der zugaengliche Name bleibt vollstaendig: Keine der 1.086 Pruefungen
    hat es je bemerkt. Betroffen war genau die Gruppe, die die grosse Schrift
    einstellt -- fuer sie unterschieden sich fuenf Tasten namens "RV A...",
    "RV R...", "RV Ar..." nur noch am Symbol.

    Bei 320 px bleiben innen 292 px. Auf fuenf Eintraege sind das 49 px je
    Taste, auf vier 62 px. Ohne das Praefix "RV" passt dann jedes Wort:
    Report 53, Analyse 61, Archiv 49, Zeit 30, Mehr 42 px.

    Gewichen ist RV Analyse -- ein Rueckblick ueber Monate, den man bewusst
    oeffnet und nicht zwischen zwei Terminen, und mit 88 px die laengste
    Beschriftung von allen. Sie steht jetzt in "Mehr" unter "Meine Sachen".
    Die Stempeluhr bleibt: Sie ist eine Handlung, die zweimal taeglich
    stattfindet.

    `tests/oberflaeche.spec.ts` haelt beides fest -- keine abgeschnittene
    Beschriftung bei 320 px und "Extra gross", und hoechstens vier Stationen.
  */
  const hauptnavigation = [
    { id: "form" as const, label: "Report", icon: LayoutGrid, ansage: "RV Report Hauptformular angezeigt", active: activeTab === "form", visible: true },
    { id: "time" as const, label: "Zeit", icon: Clock, ansage: "RV Zeit und Stempeluhr geöffnet", active: activeTab === "time" || activeTab === "carryover", visible: accessibility.enableTimeTracking !== false },
    { id: "history" as const, label: "Archiv", icon: History, ansage: "RV Archiv geöffnet", active: activeTab === "history", visible: true },
    { id: "options" as const, label: "Mehr", icon: Settings, ansage: "Weitere Ansichten und Optionen geöffnet", active: activeTab === "options" || activeTab === "help" || activeTab === "backup" || activeTab === "manage" || activeTab === "sync" || activeTab === "changelog" || activeTab === "stats" || activeTab === "bestand", visible: true },
  ];

  /** Ansicht wechseln aus der Hauptnavigation -- beide Leisten nutzen diesen Weg. */
  const wechsleHauptansicht = (
    id: "form" | "time" | "stats" | "history" | "options",
    ansage: string,
  ) => {
    triggerHaptic(12);
    setActiveTab(id);
    announceToAriaAndSpeech(ansage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFeldBlur = useCallback((fieldId: string) => {
    setTimeout(() => {
      setFocusedFieldId((prev) => (prev === fieldId ? null : prev));
    }, 120);
  }, []);

  /*
    Die vier Bereiche des Berichts als Daten. `hinweis` und `fuss` sind die
    einzigen zwei Stellen, an denen sich die Bereiche wirklich unterscheiden --
    sie stehen deshalb je Bereich da und nicht als Bedingung in der Komponente.
  */
  const bereiche = [
    {
      nr: 1,
      schluessel: "s1" as const,
      titel: "1. Vorführungen & Auslieferungen",
      icon: <Eye className="w-5 h-5" />,
      felder: appFields.s1,
      hinweis: null as React.ReactNode,
      fuss: (
        <div
          className="mt-6 p-4 rounded-[var(--rv-radius-lg)] bg-[var(--total-bg)] text-[var(--total-text)] font-black text-right text-lg border border-[var(--card-border)]"
          aria-live="polite"
        >
          <span>Bereichs-Gesamtsumme: </span>
          <span className="text-xl md:text-2xl ml-1">{s1Total}</span>
        </div>
      ) as React.ReactNode,
    },
    {
      nr: 2,
      schluessel: "s2" as const,
      titel: "2. Schulung, Support & Akquise",
      icon: <GraduationCap className="w-5 h-5" />,
      felder: appFields.s2,
      hinweis: null as React.ReactNode,
      fuss: null as React.ReactNode,
    },
    {
      nr: 3,
      schluessel: "s3" as const,
      titel: "3. Spezialprodukte (Fokus)",
      icon: <Sparkles className="w-5 h-5" />,
      felder: appFields.s3,
      hinweis: null as React.ReactNode,
      fuss: null as React.ReactNode,
    },
    {
      nr: 4,
      schluessel: "s4" as const,
      titel: "4. Arbeitszeit & Büro",
      icon: <Clock className="w-5 h-5" />,
      felder: appFields.s4,
      hinweis: (accessibility.enableTimeTracking !== false ? (
        <div className="mb-4 p-3 rounded-[var(--rv-radius-md)] bg-[var(--info-bg)] border border-[var(--info-border)] text-[var(--info-text)] text-xs font-bold flex items-start gap-2">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Diese Werte werden automatisch aus Ihrer Stempeluhr (RV Zeit) berechnet und beim Ausstempeln hier eingetragen.</p>
        </div>
      ) : null) as React.ReactNode,
      fuss: null as React.ReactNode,
    },
  ];

  /*
    LESEFEHLER BEIM START -- eigene Ansicht statt Formular.

    Warum kein Formular: Ein Lesefehler heißt nicht, dass die Daten weg sind,
    sondern dass wir sie gerade nicht sehen. Wer in diesem Zustand tippt,
    arbeitet in einem leeren Stand, der anschließend über den vorhandenen
    geschrieben würde — genau der Weg, über den am 2026-09-07 ein Archiv mit
    drei Monaten nachweislich auf einen einzigen zusammenschrumpfte.

    `role="alert"` und die Ansage, weil ein blinder Nutzer sonst nur eine
    stille Seite vorfindet.
  */
  if (!fensterAktiv) {
    return <FensterHinweis />;
  }

  if (ladeFehler) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--bg-color)] p-4">
        <div
          role="alert"
          className="w-full max-w-md rounded-[var(--rv-radius-lg)] border-2 border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] p-5 flex flex-col gap-4"
        >
          <h1 className="text-xl font-black flex items-start gap-2.5">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              Ihre Daten konnten nicht gelesen werden
            </span>
          </h1>
          <p className="text-sm font-bold leading-relaxed">
            Der Speicher dieses Geräts hat beim Start nicht geantwortet. Ihre Daten sind
            deshalb <strong>nicht verloren</strong> — sie sind nur gerade nicht abrufbar.
          </p>
          <p className="text-sm font-bold leading-relaxed">
            Damit nichts überschrieben wird, speichert die App bis auf Weiteres nichts.
            Bitte laden Sie die App neu. Hilft das nicht, schließen Sie sie ganz und öffnen
            sie erneut.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[44px] px-5 py-3 rounded-[var(--rv-radius-md)] font-black bg-[var(--danger-solid)] text-[var(--danger-solid-text)] hover:brightness-110 transition-all cursor-pointer"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

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
  /* Dichte statt Verstecken: siehe Begruendung an der Stammdaten-Karte unten. */
  const stammdatenKompakt = !!(reportData?.name && String(reportData.name).trim().length > 0);

  return (
    <>
      <a href="#main-content" className="skip-link">Zum Hauptinhalt springen</a>
      <div className={isDesktop ? "lg:flex lg:h-screen lg:w-screen lg:overflow-hidden bg-[var(--bg-color)]" : ""}>
      
      {/* SIDEBAR NAVIGATION (Only visible on Desktop when enabled) */}
      {isDesktop && (
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-[var(--card-border)] bg-[var(--card-bg)] h-screen shrink-0 sticky top-0 z-[150] shadow-[var(--rv-shadow-sm)]">
          <div className="p-6 pb-4 border-b border-[var(--card-border)]">
             <h1 className="text-2xl font-black text-[var(--text-color)] flex items-center gap-2.5">
               {/* Markenzeichen, rein schmueckend -- der Name steht daneben. */}
               <span
                 className="w-9 h-9 rounded-[var(--rv-radius-md)] bg-[var(--primary)] text-[var(--primary-text)] text-sm font-black flex items-center justify-center flex-shrink-0"
                 aria-hidden="true"
               >
                 RV
               </span>
               RV Mobil
             </h1>
             <p className="text-xs text-[var(--text-muted)] font-bold mt-1">Desktop Ansicht</p>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {hauptnavigation
            .filter((tab) => tab.visible)
            .map((tab) => {
              const IconComp = tab.icon;
              const isSelected = tab.active;
              return (
                <button
                  key={tab.id}
                  aria-current={isSelected ? "page" : undefined}
                  onClick={() => {
                     wechsleHauptansicht(tab.id, tab.ansage);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-[var(--rv-radius-lg)] transition-all cursor-pointer font-bold ${
                    isSelected ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-black" : "text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)]"
                  }`}
                >
                  <IconComp className={`w-5 h-5 ${isSelected ? "stroke-[2.5]" : "stroke-[2]"}`} />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-6 text-center border-t border-[var(--card-border)]">
             {/* Ohne `opacity-70`: Damit lag der Kontrast bei 3,59:1 statt der
                 geforderten 4,5:1 (WCAG 1.4.3, gemessen von axe-core). */}
             <p className="text-[0.75rem] text-[var(--text-muted)] font-bold">
               © 2026 Reinecker Vision GmbH | RV Mobil
             </p>
          </div>
        </aside>
      )}

      {/*
        MAIN CONTENT WRAPPER -- seit 0.9.47 ein echtes `<main>`.

        Vorher war das ein `<div>` mit einer Kennung, auf die der Sprunglink
        zeigte. Der Sprunglink funktionierte damit, die Landmarke fehlte
        trotzdem: NVDA und VoiceOver bieten einen eigenen Weg zum Hauptbereich
        an (NVDA `D` durch die Landmarken, VoiceOver-Rotor "Orientierungshilfen")
        -- und der fand hier nichts, weil es nichts zu finden gab. Das war die
        im Konformitaetsbericht als Luecke benannte Stelle zu 1.3.1.

        Mit der Landmarke fallen zwei Rollen weg, die hier nicht mehr stehen
        duerfen: `role="banner"` an der Kopfkarte des Formulars und
        `role="contentinfo"` an der Fusszeile. Beide sind Landmarken der
        SEITE; innerhalb von `main` sind sie laut ARIA fehl am Platz. Die
        Elemente selbst (`<header>`, `<footer>`) bleiben, sie sind dort als
        Abschnittsgliederung richtig.
      */}
      <main id="main-content" className={`w-full relative ${isDesktop ? 'lg:flex-1 lg:overflow-y-auto lg:h-screen lg:px-6' : ''}`}>
        <div className={`mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative ${isDesktop ? 'lg:max-w-5xl lg:pb-12 xl:max-w-6xl' : 'max-w-2xl'}`}>
      {/* Off-screen live announcer region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {activeTab === "form" && (
        <div className={`animate-fade-in ${isDesktop ? 'lg:pb-8' : 'pb-24'}`}>
          {/* HEADER SECTION (Accessible, modern responsive layout, removed duplicate buttons for clean tidiness) */}
          <header
            className="p-4 sm:p-5 mb-3 sm:mb-4 rounded-[var(--rv-radius-xl)] border bg-[var(--card-bg)] border-[var(--card-border)] flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-5 shadow-[var(--rv-shadow-sm)]"
          >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Markenzeichen (0.9.66): rein schmückend, deshalb AUSSERHALB der
                Überschrift -- in ihr stünde „RV" im Textinhalt, auch wenn der
                Screenreader es wegen aria-hidden übergeht. */}
            <span
              className="w-9 h-9 rounded-[var(--rv-radius-md)] bg-[var(--primary)] text-[var(--primary-text)] text-sm font-black flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              RV
            </span>
            {/*
              „RV Report" statt „RV Mobil" (0.9.43): Die Überschrift benennt
              seit 0.9.41 die Ansicht, denn der Fokus landet nach jedem Wechsel
              auf ihr. Wer in der Navigation „RV Report" drückt, hörte hier bis
              dahin den Namen der APP -- als einzige der zwölf Ansichten. Der
              Produktname steht weiterhin in der Seitenleiste am Rechner, im
              Einstieg, im Fusszeilen-Hinweis und im Namen des Fensters.
            */}
            <h1 tabIndex={-1} data-ansicht-titel="" className="text-xl md:text-2xl font-black text-[var(--text-color)]">
              RV Report
            </h1>
          </div>

          {/* Offline Auto-Save live status feedback */}
          {/* flex-wrap, weil das Live-Abzeichen dazukommen KANN: ohne Umbruch
              sprengte die Zeile bei "Extra groß" und breiter Schrift das
              Fenster (gemessen 2026-09-09: 385 px in 360, 384 px in 320 --
              ohne Abzeichen jeweils genau die Fensterbreite). Kein Geschwister
              traegt hier flex-1, deshalb greift der Umbruch auch wirklich. */}
          <div className="flex flex-wrap items-center gap-1.5 text-[0.75rem] font-bold text-[var(--text-muted)] pt-1">
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
                aria-label={`Live verbunden. Die Live-Verbindung mit dem anderen Gerät ist aktiv.${liveSync.lastSyncTime ? ` Letzter Abgleich um ${liveSync.lastSyncTime} Uhr.` : ""} Antippen zum Verwalten.`}
                className="ml-2 flex min-h-[44px] items-center gap-1 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-1 text-[var(--success-text)] cursor-pointer hover:brightness-110 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden="true"></span>
                <span>Live verbunden</span>
              </button>
            )}
            {/* Das Abzeichen stand bis 0.9.65 neben der Überschrift. Mit dem
                Markenzeichen davor passte die Zeile auf dem Handy nicht mehr
                und brach als eigene Zeile um -- hier teilt es sich die Zeile
                mit dem Speicherstand, zu dem es inhaltlich gehört. */}
            <span className="rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2 py-0.5 text-[0.75rem] font-bold text-[var(--success-text)]">
              DSGVO & barrierefrei
            </span>
          </div>
        </div>

        {/* Stammdaten: auf dem Handy nebeneinander statt gestapelt -- das
            spart rund 100px Hoehe, ohne etwas zu verstecken. Die Hinweise
            "DSGVO-sicher lokal" und der Archiv-Link entfielen bewusst: beides
            steht bereits im Kopf-Abzeichen bzw. in der Navigation.

            Dichte statt Verstecken (0.9.65): Sobald einmal ein Name gespeichert
            wurde, braucht die Karte nicht mehr die volle Aufmerksamkeit eines
            Ersteinstiegs -- sie entfaellt hier aber nur die Kastenoptik
            (gestrichelter Rahmen, Flaeche, Polsterung), niemals ein Element.
            Label, Icon und beide <input>-Felder bleiben WORTGLEICH bestehen,
            mit derselben id, demselben Tabindex, demselben Wert -- ein
            Screenreader-Nutzer erreicht sie im ersten Tab-Durchlauf, in
            beiden Zustaenden, ohne vorher etwas zu aktivieren. Das ist die
            Bedingung, an der ein Verstecken-Muster hier abgelehnt wuerde. */}
        {/* flex-wrap mit rem-Grundbreite (0.9.66): Die Felder stehen
            nebeneinander, solange 2 x 8 rem hineinpassen -- bei „Extra groß"
            also untereinander. Seit die Eingaben 16 px Schrift haben (vorher
            12 px, darunter zoomt Safari auf dem iPhone bei jedem Antippen ins
            Feld), braucht ein halbes Handy dafür sonst zu wenig Platz. */}
        <div className={`flex flex-row flex-wrap items-stretch gap-2 w-full md:w-auto md:max-w-md ${
          stammdatenKompakt
            ? ""
            : "sm:gap-3 bg-[var(--bg-color)] p-2.5 sm:p-3 rounded-[var(--rv-radius-lg)] border border-[var(--card-border)]"
        }`} role="group" aria-label="Berichtsmetadaten">
          {/* Month input */}
          <div className="flex-1 basis-[8rem] min-w-0 space-y-1">
            <label
              htmlFor="meta-month-input"
              className="text-[0.75rem] font-bold text-[var(--text-muted)] flex items-center gap-1"
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
              className="w-full px-3 py-2.5 min-h-[48px] border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-[var(--rv-radius-md)] text-base font-bold focus:border-[var(--border-focus)] outline-none"
              aria-required="true"
            />
          </div>

          {/* Name input */}
          <div className="flex-1 basis-[8rem] min-w-0 space-y-1">
            <label
              htmlFor="meta-name-input"
              className="text-[0.75rem] font-bold text-[var(--text-muted)] flex items-center gap-1"
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
              className="w-full px-3 py-2.5 min-h-[48px] border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-[var(--rv-radius-md)] text-base font-bold focus:border-[var(--border-focus)] outline-none"
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
          className="mb-4 p-3.5 rounded-[var(--rv-radius-lg)] border-2 border-[var(--accent)] bg-[var(--accent)]/10 flex flex-col sm:flex-row sm:items-center gap-3"
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
              className="min-h-[44px] px-4 rounded-[var(--rv-radius-md)] font-black text-sm bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 transition-all cursor-pointer active:scale-95 focus-visible:ring-4"
            >
              Rückgängig
            </button>
            <button
              type="button"
              onClick={() => setLastMonthClose(null)}
              aria-label="Alles klar. Hinweis zum Monatsabschluss ausblenden."
              className="min-h-[44px] px-4 rounded-[var(--rv-radius-md)] font-bold text-sm border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)] transition-all cursor-pointer active:scale-95 focus-visible:ring-4"
            >
              Alles klar
            </button>
          </div>
        </div>
      )}

      {/* MONATSKARTE (0.9.66): Wo stehe ich, und ist das Letzte drin? */}
      <MonatsKarte
        monat={reportData.month}
        aktivitaeten={s1Total + s2Total + s3Total}
        felder={[...appFields.s1, ...appFields.s2, ...appFields.s3, ...appFields.s4]}
        zeitstempel={reportData.valuesUpdatedAt}
      />

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
        monat={reportData.month}
      />

      {/* MOBILE COMFORT ACTION BAR */}
      {mobileComfortMode && !isDesktop && (
        <div className="mb-4 rounded-[var(--rv-radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-[var(--rv-shadow-sm)]" role="toolbar" aria-label="Schnellzugriffe für den Ein-Hand-Modus">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => focusAndAnnounce("month")} className="rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-4 min-h-[44px] text-xs font-black inline-flex items-center justify-center cursor-pointer focus-visible:ring-4">Monat</button>
            <button type="button" onClick={() => focusAndAnnounce("name")} className="rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-4 min-h-[44px] text-xs font-black inline-flex items-center justify-center cursor-pointer focus-visible:ring-4">Name</button>
            <button type="button" onClick={() => focusAndAnnounce("notes")} className="rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-4 min-h-[44px] text-xs font-black inline-flex items-center justify-center cursor-pointer focus-visible:ring-4">Notizen</button>
            <button type="button" onClick={() => setActiveTab("time")} className="rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-4 min-h-[44px] text-xs font-black inline-flex items-center justify-center cursor-pointer focus-visible:ring-4">Zeit</button>
          </div>
        </div>
      )}

            {/* SPEICHER-SCHUTZ (0.9.16)
                Der Browser darf "best effort"-Speicher jederzeit raeumen -- auf
                iOS bei nicht installierten Seiten nach sieben Tagen ohne
                Nutzung. Ohne diesen Hinweis verliert jemand einen ganzen Monat,
                ohne etwas falsch gemacht zu haben.
                Kein role="alert": Der Effekt sagt den Text bereits ueber
                announceToAriaAndSpeech an, das ergaebe sonst eine Dopplung. */}
            {speicherUrteil &&
              speicherUrteil.stufe !== "sicher" &&
              !(speicherUrteil.stufe !== "kritisch" && speicherHinweisAusgeblendet) && (
                <div
                  className={`p-4 mb-4 rounded-[var(--rv-radius-lg)] border-2 flex flex-col sm:flex-row sm:items-center gap-3 ${
                    speicherUrteil.stufe === "kritisch"
                      ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]"
                      : "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]"
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm font-semibold leading-snug">
                      {speicherUrteil.ansage}
                      {speicherUrteil.rat ? " " + speicherUrteil.rat : ""}
                    </p>
                  </div>
                  {/* Kein `whitespace-nowrap` und auf schmalen Geraeten
                      gestapelt: Nebeneinander ragten die beiden Knoepfe bei
                      Schriftgroesse "Extra groß" 51 px aus dem 360-px-Bildschirm
                      (nachgemessen 2026-08-31). */}
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab("backup")}
                      className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-[var(--rv-radius-md)] font-black text-sm bg-[var(--primary)] text-[var(--primary-text)] hover:brightness-110 transition-all cursor-pointer"
                    >
                      Jetzt sichern
                    </button>
                    {speicherUrteil.stufe !== "kritisch" && (
                      <button
                        type="button"
                        onClick={() => setSpeicherHinweisAusgeblendet(true)}
                        aria-label="Hinweis zum Speicherzustand ausblenden"
                        className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-[var(--rv-radius-md)] font-black text-sm border-2 border-current hover:brightness-110 transition-all cursor-pointer"
                      >
                        Ausblenden
                      </button>
                    )}
                  </div>
                </div>
              )}

            {/* SICHERUNGS-ERINNERUNG (0.9.16)
                Getrennt von der Abgabe-Erinnerung: Die erinnert daran, den
                Bericht an die VL zu schicken -- nicht daran, die Daten gegen
                Geraeteverlust zu sichern. Fuer Letzteres gab es bis 0.9.16
                nichts. */}
            {sicherungUrteil && !sicherungHinweisAusgeblendet && (
              <div className="p-4 mb-4 rounded-[var(--rv-radius-lg)] border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)] flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm font-semibold leading-snug">{sicherungUrteil.ansage}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("backup")}
                    className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-[var(--rv-radius-md)] font-black text-sm bg-[var(--primary)] text-[var(--primary-text)] hover:brightness-110 transition-all cursor-pointer"
                  >
                    Jetzt sichern
                  </button>
                  <button
                    type="button"
                    onClick={() => setSicherungHinweisAusgeblendet(true)}
                    aria-label="Später. Erinnerung an die Datensicherung ausblenden."
                    className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-[var(--rv-radius-md)] font-black text-sm border-2 border-current hover:brightness-110 transition-all cursor-pointer"
                  >
                    Später
                  </button>
                </div>
              </div>
            )}

            {/* SPEICHER-FEHLER BANNER: bleibt sichtbar, bis ein Speichervorgang wieder klappt */}
            {storageWriteFailed && (
              <div
                role="alert"
                className="p-4 mb-4 rounded-[var(--rv-radius-lg)] border-2 border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-start gap-2.5 flex-1">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm font-semibold leading-snug">
                    Speichern fehlgeschlagen! Ihre letzten Änderungen sind eventuell nicht dauerhaft
                    gesichert. Bitte erstellen Sie jetzt ein Backup, bevor Sie weiterarbeiten.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("backup")}
                  className="px-4 py-2.5 rounded-[var(--rv-radius-md)] font-black text-sm bg-[var(--danger-solid)] text-[var(--danger-solid-text)] hover:brightness-110 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap"
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
                className="p-4 mb-4 rounded-[var(--rv-radius-lg)] border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)] flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm font-semibold leading-snug">
                    Live-Verbindung unterbrochen. Ihre Eingaben werden weiter auf
                    diesem Gerät gespeichert, aber nicht mehr auf das andere Gerät
                    übertragen.
                  </p>
                </div>
                {/* Gestapelt auf schmalen Geraeten: Nebeneinander brauchten die
                    beiden Knoepfe bei "Extra groß" 390 px in einem 356 px
                    breiten Band -- 34 px Ueberlauf (nachgemessen 2026-08-31).
                    Faellt nur auf, wenn eine Live-Verbindung tatsaechlich
                    abreisst, und war deshalb nie jemandem aufgefallen. */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSyncAbbruchAusgeblendet(true);
                      setActiveTab("sync");
                    }}
                    className="min-h-[44px] px-4 py-2 w-full sm:w-auto rounded-[var(--rv-radius-md)] font-black text-sm bg-[var(--warning-solid)] text-[var(--warning-solid-text)] hover:brightness-110 transition-all cursor-pointer focus-visible:ring-4"
                  >
                    Neu verbinden
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncAbbruchAusgeblendet(true)}
                    aria-label="Hinweis zur unterbrochenen Live-Verbindung ausblenden"
                    className="min-h-[44px] px-4 py-2 w-full sm:w-auto rounded-[var(--rv-radius-md)] font-bold text-sm border border-[var(--warning-border)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--warning-bg)] transition-all cursor-pointer focus-visible:ring-4"
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
          className={`p-3.5 mb-4 rounded-[var(--rv-radius-lg)] border flex gap-2.5 items-center text-sm font-semibold leading-snug ${
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
        <span className="text-[0.75rem] font-black text-[var(--text-muted)] flex items-center gap-1.5">
          Monats-Fortschritt{" "}
          {/*
            `lowercase` ist mit 0.9.47 entfallen -- es war das Gegengift zum
            `uppercase` der Elternzeile und hätte ohne sie "(bereich anklicken
            zum filtern)" ergeben, also ein kleingeschriebenes Substantiv.
          */}
          <span className="font-bold text-xs text-[var(--text-muted)]">
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
      <div className="sticky top-2 z-30 bg-[var(--bg-color)]/95 backdrop-blur-md py-2 -mx-2 px-2 rounded-[var(--rv-radius-lg)] mb-4 shadow-[var(--rv-shadow-md)] border border-[var(--card-border)]">
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
          aria-label="Aktueller Monatsfortschritt Live-Anzeige"
          role="region"
        >
        {/* Card 1: Vorführungen */}
        <button
          type="button"
          /* Umschalter, also aria-pressed (0.9.66): Ob der Filter aktiv
             ist, zeigten bis dahin nur Rahmen und Fläche -- ein Screenreader
             sagte bei jedem Zustand dasselbe. */
          aria-pressed={activeSectionTab === "s1"}
          onClick={() => {
            triggerHaptic(15);
            setActiveSectionTab(activeSectionTab === "s1" ? "all" : "s1");
            announceToAriaAndSpeech(
              activeSectionTab === "s1"
                ? "Filter auf alle Bereiche zurückgesetzt"
                : "Filter gewechselt auf Bereich 1: Vorführungen",
            );
          }}
          className={`p-3 rounded-[var(--rv-radius-lg)] border bg-[var(--card-bg)] flex flex-col justify-between shadow-[var(--rv-shadow-sm)] hover:shadow-[var(--rv-shadow-md)] hover:border-[var(--cat-1)] transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s1"
              ? "border-2 border-[var(--cat-1)] bg-[var(--cat-1-soft)]"
              : "border-[var(--card-border)]"
          }`}
          aria-label={
            goalsConfig.enabled
              ? `Bereich 1: Vorführungen. Aktuelle Summe: ${s1Total} von Monatsziel ${goalsConfig.s1}. Klick, um auf diesen Bereich zu filtern.`
              : `Bereich 1: Vorführungen. Aktuelle Summe: ${s1Total}. Klick, um auf diesen Bereich zu filtern.`
          }
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-[var(--rv-radius-md)] bg-[var(--cat-1-soft)] text-[var(--cat-1-text)] border border-[var(--cat-1)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[0.75rem] font-bold text-[var(--text-muted)] leading-tight">
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
          aria-pressed={activeSectionTab === "s2"}
          onClick={() => {
            triggerHaptic(15);
            setActiveSectionTab(activeSectionTab === "s2" ? "all" : "s2");
            announceToAriaAndSpeech(
              activeSectionTab === "s2"
                ? "Filter auf alle Bereiche zurückgesetzt"
                : "Filter gewechselt auf Bereich 2: Schulungen & Support",
            );
          }}
          className={`p-3 rounded-[var(--rv-radius-lg)] border bg-[var(--card-bg)] flex flex-col justify-between shadow-[var(--rv-shadow-sm)] hover:shadow-[var(--rv-shadow-md)] hover:border-[var(--cat-2)] transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s2"
              ? "border-2 border-[var(--cat-2)] bg-[var(--cat-2-soft)]"
              : "border-[var(--card-border)]"
          }`}
          aria-label={
            goalsConfig.enabled
              ? `Bereich 2: Schulungen und Support. Aktuelle Summe: ${s2Total} von Monatsziel ${goalsConfig.s2}. Klick, um auf diesen Bereich zu filtern.`
              : `Bereich 2: Schulungen und Support. Aktuelle Summe: ${s2Total}. Klick, um auf diesen Bereich zu filtern.`
          }
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-[var(--rv-radius-md)] bg-[var(--cat-2-soft)] text-[var(--cat-2-text)] border border-[var(--cat-2)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[0.75rem] font-bold text-[var(--text-muted)] leading-tight">
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
          aria-pressed={activeSectionTab === "s3"}
          onClick={() => {
            triggerHaptic(15);
            setActiveSectionTab(activeSectionTab === "s3" ? "all" : "s3");
            announceToAriaAndSpeech(
              activeSectionTab === "s3"
                ? "Filter auf alle Bereiche zurückgesetzt"
                : "Filter gewechselt auf Bereich 3: Spezialprodukte",
            );
          }}
          className={`p-3 rounded-[var(--rv-radius-lg)] border bg-[var(--card-bg)] flex flex-col justify-between shadow-[var(--rv-shadow-sm)] hover:shadow-[var(--rv-shadow-md)] hover:border-[var(--cat-3)] transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s3"
              ? "border-2 border-[var(--cat-3)] bg-[var(--cat-3-soft)]"
              : "border-[var(--card-border)]"
          }`}
          aria-label={
            goalsConfig.enabled
              ? `Spezial. Bereich 3: Spezialprodukte. Aktuelle Summe: ${s3Total} von Monatsziel ${goalsConfig.s3}. Klick, um auf diesen Bereich zu filtern.`
              : `Spezial. Bereich 3: Spezialprodukte. Aktuelle Summe: ${s3Total}. Klick, um auf diesen Bereich zu filtern.`
          }
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-[var(--rv-radius-md)] bg-[var(--cat-3-soft)] text-[var(--cat-3-text)] border border-[var(--cat-3)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[0.75rem] font-bold text-[var(--text-muted)] leading-tight">
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
          aria-pressed={activeSectionTab === "s4"}
          onClick={() => {
            triggerHaptic(15);
            setActiveSectionTab(activeSectionTab === "s4" ? "all" : "s4");
            announceToAriaAndSpeech(
              activeSectionTab === "s4"
                ? "Filter auf alle Bereiche zurückgesetzt"
                : "Filter gewechselt auf Bereich 4: Arbeitszeit",
            );
          }}
          className={`p-3 rounded-[var(--rv-radius-lg)] border bg-[var(--card-bg)] flex flex-col justify-between shadow-[var(--rv-shadow-sm)] hover:shadow-[var(--rv-shadow-md)] hover:border-[var(--cat-4)] transition-all cursor-pointer text-left focus-visible:ring-4 active:scale-95 overflow-hidden ${
            activeSectionTab === "s4"
              ? "border-2 border-[var(--cat-4)] bg-[var(--cat-4-soft)]"
              : "border-[var(--card-border)]"
          }`}
          aria-label={
            goalsConfig.enabled
              ? `Bürozeit ${s4Hours} h. Bereich 4: Arbeitszeit. Aktuelle Summe: ${s4Hours} Stunden von Monatsziel ${goalsConfig.s4} Stunden. Klick, um auf diesen Bereich zu filtern.`
              : `Bürozeit ${s4Hours} h. Bereich 4: Arbeitszeit. Aktuelle Summe: ${s4Hours} Stunden. Klick, um auf diesen Bereich zu filtern.`
          }
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-[var(--rv-radius-md)] bg-[var(--cat-4-soft)] text-[var(--cat-4-text)] border border-[var(--cat-4)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[0.75rem] font-bold text-[var(--text-muted)] leading-tight">
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
      <div className="mb-3 p-3 rounded-[var(--rv-radius-xl)] border bg-[var(--card-bg)] border-[var(--card-border)] space-y-2 shadow-[var(--rv-shadow-sm)]">
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
              className={`px-2.5 min-h-[44px] rounded-[var(--rv-radius-sm)] text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                isCompactView
                  ? "bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-[var(--rv-shadow-sm)]"
                  : "bg-[var(--bg-color)] text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kompakt</span>
            </button>

            {/* Baseline Template Copy Button (Vormonats-Direktkopie) */}
            {/* Ohne title-Attribut: Der native Tooltip erfuellt WCAG 1.4.13
                nicht -- er laesst sich weder mit Escape schliessen noch mit
                dem Zeiger ueberfahren, und auf dem Handy erscheint er gar
                nicht. Der aria-label traegt dieselbe Auskunft und erreicht
                auch die Hilfstechnik. Galt genauso fuer die beiden anderen
                Stellen (Live-Verbindung, Monatsziele). */}
            {(() => {
              const vorlage = getJuengsterArchivMonat();
              if (!vorlage) return null;
              return (
                <button
                  type="button"
                  onClick={handleCopyPreviousMonth}
                  /* Der Name nennt den Monat, den die Taste wirklich lädt.
                     „Vormonats-Werte" war falsch: Geladen wird der jüngste
                     archivierte Monat, der auch NACH dem bearbeiteten liegen
                     kann — beim Blick in einen alten Archivmonat war das die
                     Regel, nicht die Ausnahme. */
                  aria-label={`Werte aus ${formatMonthGerman(vorlage.month)} als Vorlage laden`}
                  className="px-2.5 min-h-[44px] rounded-[var(--rv-radius-sm)] text-xs font-bold border bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)] hover:brightness-110 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Vorlage</span>
                </button>
              );
            })()}

            {/* Acoustic Auditor / summary reader button */}
            <button
              type="button"
              onClick={handleReadSummaryAloud}
              aria-label={
                isReadingSummary
                  ? "Zusammenfassung vorlesen stoppen"
                  : "Zusammenfassung vorlesen"
              }
              className={`px-2.5 min-h-[44px] rounded-[var(--rv-radius-sm)] text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                isReadingSummary
                  ? "bg-[var(--warning-solid)] text-[var(--warning-solid-text)] border-[var(--warning-border)] shadow-[var(--rv-shadow-sm)]"
                  : "bg-[var(--bg-color)] text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)]"
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
              className={`px-2.5 min-h-[44px] rounded-[var(--rv-radius-sm)] text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                isGoalsEditorOpen
                  ? "bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-[var(--rv-shadow-sm)]"
                  : goalsConfig.enabled
                    ? "bg-[var(--cat-3-soft)] text-[var(--cat-3-text)] border-[var(--cat-3)]"
                    : "bg-[var(--bg-color)] text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)]"
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
            className="pt-2.5 mt-2.5 border-t border-[var(--card-border)] space-y-2.5 animate-slide-up"
            role="group"
            aria-label="Ziele-Konfiguration"
          >
            {/*
              War zwei Elemente: eine sichtbare Ueberschrift ausserhalb des
              Labels und ein <label>, dessen Text nur "Aktiviert"/"Deaktiviert"
              enthielt. Der zugaengliche Name der Checkbox war dadurch
              woertlich "Deaktiviert" -- gemessen 2026-09-19 mit Playwright
              gegen die gebaute Fassung. Jetzt umschliesst EIN <label> die
              ganze Zeile (WCAG 2.5.3: der zugaengliche Name enthaelt jetzt
              jeden sichtbaren Text der klickbaren Flaeche), und min-h-[44px]
              haelt die Trefferflaeche ein -- vorher 101 x 18 px, weit unter
              der Schwelle, weil dieser Zustand (isGoalsEditorOpen) in keinem
              Testzustand geoeffnet wird und dem Pruefnetz nie begegnet ist. */}
            <label className="flex items-center justify-between min-h-[44px] cursor-pointer select-none">
              <span className="text-xs font-bold text-[var(--text-color)]">
                Monatsziele festlegen
              </span>
              <span className="relative inline-flex items-center">
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
                <span className="w-8 h-4 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--card-bg)] after:border-[var(--border-color)] after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-[var(--accent)]"></span>
                <span className="ml-1.5 text-[0.75rem] font-bold text-[var(--text-muted)]">
                  {goalsConfig.enabled ? "Aktiviert" : "Deaktiviert"}
                </span>
              </span>
            </label>

            <p className="text-[0.75rem] text-[var(--text-muted)] leading-relaxed">
              Tragen Sie hier Ihre persönlichen Monatsziele ein. Wenn die Ziele
              aktiviert sind, zeigt Ihnen das Dashboard in den Kacheln Ihren
              aktuellen Fortschritt mit farbigen Balken an.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/*
                Vier <label> ohne htmlFor neben vier <input> ohne id/aria-label
                -- keins programmatisch verbunden. Gemessen 2026-09-19: der
                zugaengliche Name aller vier Felder war leer, NVDA/VoiceOver
                lasen nur "Bearbeiten, Zahl". Derselbe blinde Fleck wie beim
                Umschalter oben: isGoalsEditorOpen liegt in keinem
                Testzustand des Pruefnetzes.
              */}
              <div>
                <label htmlFor="goal-s1-input" className="block text-[0.75rem] font-bold text-[var(--text-muted)] mb-1">
                  Vorführungen
                </label>
                <input
                  id="goal-s1-input"
                  type="number"
                  min="1"
                  max="999"
                  value={goalsConfig.s1 || ""}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    updateGoalsConfig({ ...goalsConfig, s1: val });
                  }}
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-[var(--rv-radius-sm)] outline-none focus:border-[var(--border-focus)]"
                  disabled={!goalsConfig.enabled}
                />
              </div>
              <div>
                <label htmlFor="goal-s2-input" className="block text-[0.75rem] font-bold text-[var(--text-muted)] mb-1">
                  Schulungen
                </label>
                <input
                  id="goal-s2-input"
                  type="number"
                  min="1"
                  max="999"
                  value={goalsConfig.s2 || ""}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    updateGoalsConfig({ ...goalsConfig, s2: val });
                  }}
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-[var(--rv-radius-sm)] outline-none focus:border-[var(--border-focus)]"
                  disabled={!goalsConfig.enabled}
                />
              </div>
              <div>
                <label htmlFor="goal-s3-input" className="block text-[0.75rem] font-bold text-[var(--text-muted)] mb-1">
                  Spezialprodukte
                </label>
                <input
                  id="goal-s3-input"
                  type="number"
                  min="1"
                  max="999"
                  value={goalsConfig.s3 || ""}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    updateGoalsConfig({ ...goalsConfig, s3: val });
                  }}
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-[var(--rv-radius-sm)] outline-none focus:border-[var(--border-focus)]"
                  disabled={!goalsConfig.enabled}
                />
              </div>
              <div>
                <label htmlFor="goal-s4-input" className="block text-[0.75rem] font-bold text-[var(--text-muted)] mb-1">
                  Bürozeit (h)
                </label>
                <input
                  id="goal-s4-input"
                  type="number"
                  min="1"
                  max="999"
                  value={goalsConfig.s4 || ""}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    updateGoalsConfig({ ...goalsConfig, s4: val });
                  }}
                  className="w-full px-2 py-1 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded-[var(--rv-radius-sm)] outline-none focus:border-[var(--border-focus)]"
                  disabled={!goalsConfig.enabled}
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Search bar (Incredibly efficient for finding products on-the-go) */}
        <div className="pt-2 border-t border-[var(--card-border)]">
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
              className="w-full pl-9 pr-8 min-h-[44px] border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-[var(--rv-radius-md)] text-xs font-bold focus:border-[var(--border-focus)] outline-none"
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
        {/*
          HINWEIS AUF DIE DIREKTEINGABE -- genau einmal, nicht je Abschnitt.

          Steht hier, seit die Fünferschritte weggefallen sind (0.9.22): Wer
          zehn Vorführungen auf einmal nachträgt, tippt die Zahl, statt zehnmal
          zu tippen. Der Weg war immer da, sah aber nach Anzeige aus statt nach
          Eingabefeld.

          Warum nur einmal und nicht in jeder Abschnittskarte: Vier gleiche
          Sätze stehen auch viermal in der Vorlesereihenfolge -- für die
          Zielgruppe dieser App ist das kein Hinweis mehr, sondern Ballast. Wer
          mit Screenreader an einem Feld steht, bekommt dieselbe Auskunft
          ohnehin aus dessen eigener Beschreibung (`CounterField.tsx`,
          `sr-only`), also genau dort, wo sie hilft.
        */}
        <p className="flex items-start gap-2 mb-4 px-3.5 py-3 rounded-[var(--rv-radius-lg)] border border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)] text-sm font-semibold leading-snug">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            Tipp: Sie können jede Zahl direkt in das Feld eintippen — auch größere
            Mengen auf einmal.
          </span>
        </p>

        {/*
          Die vier Bereiche als Daten statt als vier fast gleiche JSX-Blöcke
          (0.9.42). Die Unterschiede stehen dort, wo sie gelten: Bereich 1 hat
          die Bereichssumme, Bereich 4 den Hinweis zur Stempeluhr. Der Rest ist
          wortgleich und liegt jetzt in `BerichtsBereich`.
        */}
        {bereiche
          .filter(
            (b) =>
              (activeSectionTab === "all" || activeSectionTab === b.schluessel) &&
              hasVisibleFields(b.felder),
          )
          .map((b) => (
            <BerichtsBereich
              key={b.nr}
              nummer={b.nr}
              titel={b.titel}
              icon={b.icon}
              felder={filterFields(b.felder)}
              werte={reportData?.values || {}}
              zeitstempel={reportData?.valuesUpdatedAt}
              isDesktop={isDesktop}
              isCompact={shouldUseCompactFields}
              audioFeedbackEnabled={accessibility.audioFeedback}
              onChange={handleValueInput}
              onDelta={applyValueDelta}
              onAnnounce={announceToAriaAndSpeech}
              onFocusField={setFocusedFieldId}
              onBlurField={handleFeldBlur}
              hinweis={b.hinweis}
              fuss={b.fuss}
            />
          ))}

      {/* SEARCH EMPTY STATE */}
      {searchQuery &&
        !hasVisibleFields(appFields.s1) &&
        !hasVisibleFields(appFields.s2) &&
        !hasVisibleFields(appFields.s3) &&
        !hasVisibleFields(appFields.s4) && (
          <div className="p-8 text-center border-2 border-dashed border-[var(--border-color)] rounded-[var(--rv-radius-lg)] bg-[var(--card-bg)] mb-5 animate-fade-in">
            <p className="text-sm font-bold text-[var(--text-muted)]">
              Keine passenden Einträge gefunden für "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold rounded-[var(--rv-radius-sm)] cursor-pointer active:scale-95 transition-all"
            >
              Suche zurücksetzen
            </button>
          </div>
        )}
      </div>

      <NotizBereich
        notizen={
          typeof reportData?.notes === "string"
            ? reportData?.notes
            : String(reportData?.notes || "")
        }
        onNotizenChange={(wert) => handleMetaChange("notes", wert)}
        isDictating={isDictating}
        onDiktat={handleDiktat}
        onDatumstempel={addTimestamp}
        onVorlage={handleApplyNoteTemplate}
        notesInputRef={notesInputRef}
      />

      {/* FINAL ACTION AREA */}
      <section
        className="space-y-3.5"
        aria-label="Monat abschließen und exportieren"
      >
        <button
          type="button"
          onClick={handleStartNewMonth}
          /* Der Name muss die sichtbare Beschriftung enthalten (WCAG 2.5.3).
             Vorher hieß die Taste sichtbar „Monat abschließen & neu starten
             (Auto-Archiv)", zugänglich aber „Nächsten Monat starten…" — wer
             per Sprachsteuerung „Klick Monat abschließen" sagt, traf nichts. */
          aria-label="Monat abschließen und neu starten. Auto-Archiv: Der aktuelle Monat wird automatisch im RV Archiv gesichert."
          className="w-full py-4 px-6 rounded-[var(--rv-radius-lg)] font-black bg-[var(--primary)] hover:opacity-90 text-[var(--primary-text)] text-base md:text-lg flex items-center justify-center gap-2.5 shadow-[var(--rv-shadow-md)] cursor-pointer transition-all active:scale-[0.99] focus-visible:ring-4 mb-4"
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
            className="w-full py-4 px-6 rounded-[var(--rv-radius-lg)] font-bold bg-[var(--cat-3-soft)] hover:brightness-110 text-[var(--cat-3-text)] border border-[var(--cat-3)] text-base flex items-center justify-center gap-2.5 shadow-[var(--rv-shadow-sm)] cursor-pointer transition-all active:scale-[0.99] focus-visible:ring-4"
          >
            <Share2 className="w-5 h-5" aria-hidden="true" />
            <span>Bericht an VL senden (Teilen/E-Mail)</span>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="mt-12 pt-6 pb-2 border-t border-[var(--card-border)] text-center text-xs font-bold text-[var(--text-muted)] space-y-4"
      >
        {/* Kein `opacity-80` mehr: Auf --text-muted angewandt ergab das einen
            Kontrast von 4,41:1 gegen die geforderten 4,5:1 (WCAG 1.4.3) --
            gemessen von axe-core, siehe tests/oberflaeche.spec.ts. Die
            Deckkraft war reine Zier und hat ausgerechnet in einer App fuer
            sehbehinderte Nutzer Text unlesbarer gemacht. */}
        <p className="text-[0.75rem]">
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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 bg-[var(--primary)] text-[var(--primary-text)] font-black py-3.5 px-6 rounded-full shadow-[var(--rv-shadow-lg)] z-50 text-sm border border-[var(--border-color)] animate-bounce"
        >
          {toastText}
        </div>
      )}

      {/* HELP & BACKUP MODAL */}
      {activeTab === "help" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <React.Suspense fallback={<BereichLaedt name="Hilfe" />}>
            <HelpModal
              isOpen={true}
              onClose={() => zurueckZuOptionen("menu-help")}
              appFields={appFields}
            />
          </React.Suspense>
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
            onClose={() => zurueckZuOptionen("menu-backup")}
            onExport={buildSyncPayload}
            onImport={(dataStr, strategie) => {
              try {
                // Gleiche Struktur-Prüfung wie beim Geräte-Sync: Eine
                // beschädigte Backup-Datei darf die App nicht in den
                // Fehlerbildschirm schicken. Bleibt hier stehen, weil sie den
                // konkreten Grund liefert -- handleSyncImport meldet im stillen
                // Modus nichts.
                const geprueft = pruefeSyncPaket(JSON.parse(dataStr));
                if (!geprueft.ok) {
                  const text = `Diese Datei konnte nicht eingespielt werden. ${geprueft.grund}`;
                  triggerToast(text);
                  announceToAriaAndSpeech(text, true);
                  return;
                }
                // Seit 0.9.17 über denselben Weg wie der Geräte-Sync, damit
                // "Zusammenführen" auch hier möglich ist. Vorher rief diese
                // Stelle direkt ersetzeGesamtstand -- eine per Datei
                // übertragene Sicherung löschte damit den Stand des Zielgeräts.
                const ok = handleSyncImport(dataStr, strategie, { silent: true });
                if (!ok) {
                  triggerToast("Fehler beim Laden des Backups.");
                  announceToAriaAndSpeech("Fehler beim Laden des Backups.", true);
                  return;
                }
                setActiveTab("options");
                const text =
                  strategie === "merge"
                    ? "Sicherung eingespielt und mit den vorhandenen Daten zusammengeführt."
                    : "Sicherung eingespielt. Die vorhandenen Daten wurden ersetzt.";
                triggerToast(text);
                announceToAriaAndSpeech(text, true);
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
            onClose={() => zurueckZuOptionen("menu-sync")}
            onExport={buildSyncPayload}
            onImport={(dataStr, strategy) => handleSyncImport(dataStr, strategy)}
            lokaleMonate={Object.keys(history || {}).length}
          />
        </React.Suspense>
      )}

      {/* TIME MODAL (ZEITBEREICH) */}
      {activeTab === "time" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <React.Suspense fallback={<BereichLaedt name="RV Zeit" />}>
            <TimeModal
              clockInTime={clockInTime}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              timeLogs={reportData?.timeLogs || []}
              onDeleteLog={handleDeleteLog}
              announceToAriaAndSpeech={announceToAriaAndSpeech}
              carryover={carryover}
              onOpenCarryover={() => {
                carryoverHerkunftRef.current = "time";
                setActiveTab("carryover");
              }}
              onExportExcel={handleExportTimeLogsExcel}
              selectedMonth={reportData?.month}
              onAddManualLog={handleManualLogAdd}
              history={history}
              reportData={reportData}
            />
          </React.Suspense>
        </div>
      )}

      {/* MANAGEMENT MODAL */}
      {activeTab === "manage" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <React.Suspense fallback={<BereichLaedt name="Formularfelder" />}>
            <ManageModal
              isOpen={true}
              onClose={() => zurueckZuOptionen(null)}
              appFields={appFields}
              onDeleteField={handleDeleteField}
              onFactoryReset={handleFactoryResetFields}
            />
          </React.Suspense>
        </div>
      )}

      {/* HISTORY MODAL */}
      {activeTab === "history" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <React.Suspense fallback={<BereichLaedt name="RV Archiv" />}>
            <HistoryModal
              appFields={appFields}
              history={history}
              onLoadMonth={handleLoadMonthFromHistory}
              onDeleteRecord={handleDeleteRecordFromHistory}
              announceToAriaAndSpeech={announceToAriaAndSpeech}
              triggerToast={triggerToast}
              onToggleVersand={handleToggleVersandStatus}
              onVersandGemeldet={(monat) => setzeVersandStatus(monat, true)}
              setConfirmRequest={setConfirmRequest}
              stempeluhrAktiv={accessibility.enableTimeTracking !== false}
            />
          </React.Suspense>
        </div>
      )}

      {/* STATS & TRENDS MODAL */}
      {activeTab === "stats" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <React.Suspense fallback={<BereichLaedt name="RV Analyse" />}>
            <StatsModal
              reportData={reportData}
              appFields={appFields}
              history={history}
              announceToAriaAndSpeech={announceToAriaAndSpeech}
            />
          </React.Suspense>
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
            onOpenCarryover={() => {
              carryoverHerkunftRef.current = "options";
              setActiveTab("carryover");
            }}
            onOpenBestand={() => setActiveTab("bestand")}
            onOpenErklaerung={() => setActiveTab("erklaerung")}
            /*
              Ueber die Kennung zaehlen, nicht addieren: Der laufende Monat
              steht zugleich im Archiv (die Selbstsicherung legt ihn dort ab),
              seine Schichten kaemen sonst doppelt vor. Gemessen am
              2026-09-14 -- ein Bestand aus zwei Schichten wurde als "(3)"
              angezeigt.
            */
            schichtenAnzahl={
              new Set([
                ...(reportData?.timeLogs || []).map((s) => s.id),
                ...Object.values(history || {}).flatMap((e) =>
                  (e.timeLogs || []).map((s) => s.id),
                ),
              ]).size
            }
            onSchichtenLoeschen={handleSchichtenLoeschen}
            onAllesLoeschen={handleAllesLoeschen}
            onOpenStats={() => setActiveTab("stats")}
            mobileComfortMode={mobileComfortMode}
            onToggleMobileComfort={() => {
              setMobileComfortMode((prev) => !prev);
              announceToAriaAndSpeech("Ein-Hand-Modus aktualisiert.", true);
            }}
          />
        </div>
      )}
      
      {activeTab === "changelog" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <React.Suspense fallback={<BereichLaedt name="Neuigkeiten" />}>
            <ChangelogModal onClose={() => zurueckZuOptionen("menu-changelog")} />
          </React.Suspense>
        </div>
      )}

      {/* ERKLAERUNG ZUR BARRIEREFREIHEIT -- eigene Ansicht, siehe Kopf der Datei dort */}
      {activeTab === "erklaerung" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <React.Suspense fallback={<BereichLaedt name="Erklärung zur Barrierefreiheit" />}>
            <BarrierefreiheitModal onClose={() => zurueckZuOptionen("menu-erklaerung")} />
          </React.Suspense>
        </div>
      )}
      {/* MEIN BESTAND -- freiwillige Liste der Vorfuehrgeraete */}
      {activeTab === "bestand" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <React.Suspense fallback={<BereichLaedt name="Meine Demogeräte" />}>
            <BestandModal
              isOpen={true}
              onClose={() => zurueckZuOptionen("menu-bestand")}
              posten={bestand}
              onSave={setBestand}
              announceToAriaAndSpeech={announceToAriaAndSpeech}
              setConfirmRequest={setConfirmRequest}
            />
          </React.Suspense>
        </div>
      )}

      {activeTab === "carryover" && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 relative">
          <React.Suspense fallback={<BereichLaedt name="Jahreskonto" />}>
            <CarryoverModal
              isOpen={true}
              onClose={() => {
                // Aus der Zeit-Ansicht heraus gibt es keine Menüzeile, auf die
                // zurückzukehren wäre -- dort bleibt es bei der Überschrift.
                rueckkehrRef.current =
                  carryoverHerkunftRef.current === "options" ? "menu-carryover" : null;
                setActiveTab(carryoverHerkunftRef.current);
              }}
              carryover={carryover}
              onSave={updateCarryover}
              announceToAriaAndSpeech={announceToAriaAndSpeech}
            />
          </React.Suspense>
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
              className="fixed bottom-0 left-0 right-0 z-[100] bg-[var(--card-bg)] border-t border-[var(--card-border)] p-3 shadow-[var(--rv-shadow-lg)] rv-safe-pb"
              role="toolbar"
              aria-label="Mobiles Navigations-Hilfe-Menü"
            >
              <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigateField("prev")}
                  /*
                    War "Vorheriges Eingabefeld" -- ersetzte den sichtbaren
                    Text "Zurück" komplett, statt ihn zu enthalten. Verstiess
                    gegen WCAG 2.5.3 (Label in Name): Wer per Sprachsteuerung
                    "Klicke Zurück" sagt, traf nichts. Der zugaengliche Name
                    beginnt jetzt mit dem sichtbaren Wort.
                  */
                  aria-label="Zurück zum vorherigen Eingabefeld"
                  className="h-12 px-3 rounded-[var(--rv-radius-md)] font-black border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] active:scale-95 transition-all text-xs flex items-center justify-center cursor-pointer"
                >
                  ◀ Zurück
                </button>

                <div className="flex-1 min-w-0 text-center px-1">
                  <span className="block text-[0.75rem] font-black text-[var(--accent)] truncate">
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
                  // Gleiche Begruendung wie bei "Zurück" oben.
                  aria-label="Weiter zum nächsten Eingabefeld"
                  className="h-12 px-3 rounded-[var(--rv-radius-md)] font-black border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] active:scale-95 transition-all text-xs flex items-center justify-center cursor-pointer"
                >
                  Weiter ▶
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    (document.activeElement as HTMLElement)?.blur();
                  }}
                  // Gleiche Begruendung wie bei "Zurück" oben.
                  aria-label="Fertig – Eingabe abschließen"
                  className="h-12 px-3.5 rounded-[var(--rv-radius-md)] font-black bg-[var(--primary)] text-[var(--primary-text)] active:scale-95 transition-all text-xs flex items-center justify-center cursor-pointer"
                >
                  Fertig
                </button>
              </div>
            </div>
          );
        })()}

      {/*
        Untere Navigationsleiste.

        Bis 0.9.40 trug sie `role="tablist"` mit `role="tab"` und
        `aria-selected` -- und versprach damit ein Bedienmuster, das die App
        nicht hat: Ein Reitersatz verlangt Pfeiltasten zum Wechseln, einen
        einzigen Tabulatorhalt fuer die ganze Gruppe und ein `role="tabpanel"`,
        auf das die Reiter zeigen. Nichts davon war da (gemessen 2026-09-15:
        kein tabpanel im gesamten Quelltext, keine Pfeiltastenbehandlung, alle
        fuenf Tasten einzeln im Tabulatorlauf). Wer den Ansagen seines
        Screenreaders folgte, versuchte also Pfeiltasten, die nichts tun.

        Dazu kam, dass dieselbe Navigation auf dem Desktop als gewoehnliches
        `<nav>` ohne jede Markierung des aktuellen Eintrags auftrat -- zwei
        verschiedene Zusagen fuer dieselbe Sache, je nach Bildschirmbreite.

        Jetzt ist beides eine Navigation mit `aria-current="page"`. Das ist
        das, was die Leiste wirklich tut, und es traegt in beiden Breiten.
      */}
      {!focusedFieldId && (
        <div
          /*
            UNDURCHSICHTIG seit 0.9.45, und das ist eine Kontrastfrage, keine
            Geschmacksfrage. Die Leiste stand auf `bg-[var(--card-bg)]/90` mit
            Weichzeichner; was hinter ihr liegt, ging damit in die wirksame
            Hintergrundfarbe ein. Beim Umbau auf vier Stationen rutschte die
            aktive Taste ueber anderen Seiteninhalt, und axe meldete die
            Beschriftung mit 4,16:1 -- unter den geforderten 4,5:1 (gemessen
            2026-09-15 in der Datensicherung).

            Gegen die undurchsichtige Kartenflaeche sind es 5,02:1 im hellen
            und 7,83:1 im dunklen Schema. Der Weichzeichner ist ersatzlos weg:
            Hinter einer deckenden Flaeche tut er ohnehin nichts.
          */
          /* 0.9.66: Haarlinie und Schatten der Skala statt kraeftigem Umriss
             und fester rgba-Schatten -- die Leiste ist ein Behaelter, kein
             Bedienelement. Undurchsichtig bleibt sie, aus dem Grund oben. */
          className={`fixed rv-safe-nav-bottom left-1/2 -translate-x-1/2 w-[96%] max-w-xl z-[200] bg-[var(--card-bg)] border border-[var(--card-border)] py-2 px-2 rounded-[var(--rv-radius-xl)] shadow-[var(--rv-shadow-lg)] transition-all ${isDesktop ? 'lg:hidden' : ''}`}
          role="navigation"
          aria-label="Hauptnavigation"
        >
          <div className="flex items-center justify-between gap-0.5">
            {hauptnavigation
            .filter((tab) => tab.visible)
            .map((tab) => {
              const IconComp = tab.icon;
              const isSelected = tab.active;

              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isSelected ? "page" : undefined}
                  onClick={() => {
                    wechsleHauptansicht(tab.id, tab.ansage);
                  }}
                  /* Aktive Station als weiche Flaeche (0.9.66) statt farbiger
                     Schrift mit Strich darunter: Die Flaeche ist auch ohne
                     Farbwahrnehmung als Form erkennbar, der Strich war 4 px
                     breit. Im Hochkontrast tauschen Flaeche und Schrift. */
                  className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 rounded-[var(--rv-radius-lg)] relative transition-all active:scale-90 cursor-pointer ${
                    isSelected
                      ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-black"
                      : "text-[var(--text-muted)] hover:text-[var(--text-color)] font-bold"
                  }`}
                >
                  <div className="relative p-1">
                    <IconComp
                      className={`w-5 h-5 transition-transform ${isSelected ? "stroke-[2.5]" : "stroke-[1.8]"}`}
                    />
                  </div>
                  <span className="text-[0.75rem] mt-0.5 truncate max-w-full">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
        </div>
      </main>
      </div>
    </>
  );

}