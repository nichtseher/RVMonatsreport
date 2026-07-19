import React, { useRef, useEffect, useState } from "react";
import { 
  X, HelpCircle, BookOpen, Clock, FileText, 
  Settings, Share2, Lock, AlertTriangle, Play,
  CalendarDays, BarChart3, LayoutGrid, Shield
} from "lucide-react";
import { SectionsConfig } from "../types";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  appFields: SectionsConfig;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"general" | "report" | "time" | "backup">("general");

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const previouslyActive = document.activeElement as HTMLElement;
    setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector('button');
      firstFocusable?.focus();
    }, 50);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyActive?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="animate-fade-in"
      role="dialog"
      aria-labelledby="help-modal-title"
      aria-modal="true"
      ref={modalRef}
    >
      <div className="bg-[var(--card-bg)] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-100 dark:bg-slate-900 p-6 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-inner">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 id="help-modal-title" className="text-xl md:text-2xl font-black text-[var(--text-color)] tracking-tight">
                Hilfe & Handbuch
              </h2>
              <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Ausführliche Erklärungen zur RV Mobil App</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full transition-all active:scale-95 focus-visible:ring-4"
            aria-label="Hilfe schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-color)] overflow-x-auto">
          {[
            { id: "general", label: "Allgemein", icon: BookOpen },
            { id: "report", label: "RV Report", icon: LayoutGrid },
            { id: "time", label: "RV Zeit", icon: Clock },
            { id: "backup", label: "Daten & Backup", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[120px] py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-4 transition-colors ${
                  activeTab === tab.id
                    ? "border-[var(--accent)] text-[var(--accent)] bg-slate-50 dark:bg-slate-900/50"
                    : "border-transparent text-[var(--text-muted)] hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {activeTab === "general" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-5 rounded-2xl border border-blue-200 dark:border-blue-900">
                <h3 className="font-black text-lg text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Erste Schritte
                </h3>
                <p className="text-sm text-blue-900/80 dark:text-blue-200/80 leading-relaxed font-medium">
                  Willkommen bei RV Mobil. Diese App wurde speziell entwickelt, um Außendienstmitarbeitern die Erfassung von Tätigkeiten und Arbeitszeiten so einfach und barrierefrei wie möglich zu machen. Sie funktioniert komplett offline und speichert Ihre Daten sicher direkt auf Ihrem Gerät.
                </p>
              </div>

              <div className="grid gap-4">
                <FAQItem 
                  icon={<AlertTriangle className="text-amber-500" />}
                  title="Sind meine Daten sicher? Werden sie ins Internet übertragen?"
                >
                  <p><strong>Ihre Daten sind zu 100% sicher und bleiben ausschließlich auf Ihrem Gerät.</strong></p>
                  <p>Diese App ist eine "Offline-App". Das bedeutet, es gibt keinen Server, der im Hintergrund mithört oder Daten speichert. Alles, was Sie eintragen, bleibt im Speicher Ihres Browsers (z.B. Safari oder Chrome). Der einzige Moment, wo Daten Ihr Gerät verlassen, ist, wenn Sie selbst auf "Teilen" drücken, z.B. um einen Excel-Report zu versenden.</p>
                </FAQItem>

                <FAQItem 
                  icon={<Share2 className="text-emerald-500" />}
                  title="Kann ich die App auf Handy und Laptop gleichzeitig nutzen?"
                >
                  <p>Da die App offline arbeitet, synchronisieren sich Handy und Laptop <strong>nicht automatisch</strong> miteinander. Ein Eintrag auf dem Handy taucht nicht automatisch auf dem Laptop auf.</p>
                  <p><strong>Tipp:</strong> Nutzen Sie am besten ein Hauptgerät (z.B. Ihr Diensthandy) für die tägliche Eingabe. Wenn Sie die Daten auf den Laptop übertragen möchten, nutzen Sie den Geräte-Sync per QR-Code (Optionen → Sync) oder die Funktion "Sicheres Backup" unter "Optionen". Beides funktioniert komplett offline – ganz ohne Server.</p>
                </FAQItem>
              </div>
            </div>
          )}

          {activeTab === "report" && (
            <div className="space-y-6 animate-fade-in">
               <div className="grid gap-4">
                <FAQItem 
                  icon={<LayoutGrid className="text-indigo-500" />}
                  title="Wie trage ich meine Tätigkeiten im RV Report ein?"
                >
                  <p>Unter dem Reiter <strong>RV Report</strong> finden Sie verschiedene Bereiche (z.B. Vorführungen, Schulungen). Tippen Sie einfach auf das <strong>+</strong> Symbol, um den Zähler für eine Tätigkeit um 1 zu erhöhen. Tippen Sie auf das <strong>-</strong> Symbol, um ihn wieder zu verringern.</p>
                  <p>Sie können auch in das Eingabefeld zwischen + und - tippen, um direkt eine größere Zahl über die Tastatur einzugeben.</p>
                </FAQItem>

                <FAQItem 
                  icon={<CalendarDays className="text-blue-500" />}
                  title="Was passiert, wenn ich auf 'Monat abschließen & neu starten' drücke?"
                >
                  <p>Sobald Sie diesen Knopf ganz unten im RV Report drücken, passieren zwei Dinge:</p>
                  <ul className="list-disc pl-4 space-y-1 mt-2">
                    <li>Ihre aktuellen Zählerstände und Notizen werden eingefroren und im <strong>RV Archiv</strong> gespeichert.</li>
                    <li>Die Zähler auf der Startseite werden alle wieder auf <strong>0</strong> gesetzt, und der Monat springt automatisch eins weiter (z.B. von Januar auf Februar).</li>
                  </ul>
                  <p className="mt-2">Keine Sorge: Sie können sich die archivierten Monate jederzeit über den Reiter "RV Archiv" wieder ansehen, nachträglich bearbeiten oder exportieren.</p>
                </FAQItem>

                <FAQItem 
                  icon={<FileText className="text-emerald-500" />}
                  title="Wie exportiere ich die Daten (z.B. für die Vertriebsleitung)?"
                >
                  <p>Ganz unten im RV Report finden Sie den Bereich zum Teilen. Der Knopf <strong>Direkt an VL senden</strong> öffnet direkt Ihr E-Mail-Programm und hängt den Monatsbericht als Excel-Datei an. Die Adresse der Vertriebsleitung ist bereits voreingestellt.</p>
                  <p>Zusätzlich können Sie im <strong>RV Archiv</strong> jederzeit rückwirkend Excel-Dateien für jeden vergangenen Monat herunterladen oder teilen.</p>
                </FAQItem>
              </div>
            </div>
          )}

          {activeTab === "time" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid gap-4">
                <FAQItem 
                  icon={<Clock className="text-teal-500" />}
                  title="Wie funktioniert die Stempeluhr (RV Zeit)?"
                >
                  <p>Der Reiter <strong>RV Zeit</strong> ersetzt einen Stundenzettel. Wenn Sie morgens anfangen, drücken Sie auf <strong>Einstempeln</strong>. Die Uhr beginnt zu laufen.</p>
                  <p>Wenn Sie Feierabend machen, drücken Sie auf <strong>Ausstempeln</strong>. Es öffnet sich ein Dialog, in dem Sie Ihre Pausenzeit anpassen und die gearbeitete Zeit auf Büro- und Außendienst aufteilen können. Bestätigen Sie dies, um den Eintrag zu speichern.</p>
                  <p className="mt-2 text-teal-700 dark:text-teal-400 font-bold">Wichtig: Alle Zeiten, Urlaubstage und Krankheitstage aus der Stempeluhr werden automatisch im RV Report (Bereich 4) addiert. Sie müssen diese nicht doppelt eintragen!</p>
                </FAQItem>

                <FAQItem 
                  icon={<BarChart3 className="text-amber-500" />}
                  title="Wie werden Überstunden und Urlaub berechnet?"
                >
                  <p>Die App berechnet Ihr Gleitzeitkonto automatisch basierend auf Ihren täglichen Soll-Stunden. Im RV Zeit Bereich sehen Sie unter <strong>Meine Jahresübersicht (Urlaub & Gleitzeit)</strong> eine detaillierte Aufstellung.</p>
                  <p>Dort sehen Sie für jeden Monat, wie viele Stunden Sie arbeiten sollten (Soll) und wie viele Sie tatsächlich gearbeitet haben (Ist, basierend auf Büro + Außendienst). Auch Ihr Resturlaub wird dort genau berechnet.</p>
                  <p>Sie können Ihre Startwerte (z.B. Urlaubstage aus dem Vorjahr oder alte Überstunden) jederzeit über den Knopf <strong>Stammdaten & Startwerte bearbeiten</strong> anpassen.</p>
                </FAQItem>
              </div>
            </div>
          )}

          {activeTab === "backup" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-200 dark:border-amber-900">
                <h3 className="font-black text-lg text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Wichtiger Hinweis zum Backup
                </h3>
                <p className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed font-medium">
                  Da diese App offline arbeitet und Ihre Daten nur auf Ihrem Gerät speichert, sind Sie <strong>selbst für die Sicherung Ihrer Daten verantwortlich</strong>. Wenn Sie den Browserverlauf komplett löschen oder Ihr Handy verlieren, sind die Daten weg, es sei denn, Sie haben ein Backup erstellt.
                </p>
              </div>

              <div className="grid gap-4">
                <FAQItem 
                  icon={<Shield className="text-purple-500" />}
                  title="Wie erstelle ich ein Backup meiner Daten?"
                >
                  <p>Gehen Sie im Menü auf <strong>Optionen</strong> und klicken Sie ganz unten auf <strong>Sicheres Backup</strong>.</p>
                  <p>Dort geben Sie ein selbstgewähltes Passwort ein und klicken auf <strong>Backup erstellen & herunterladen</strong>. Die App erzeugt eine verschlüsselte Datei (Endung .rvbackup), die Sie sicher aufheben sollten (z.B. auf dem PC speichern oder sich selbst per E-Mail schicken).</p>
                </FAQItem>

                <FAQItem 
                  icon={<Lock className="text-slate-500" />}
                  title="Wie stelle ich ein Backup wieder her?"
                >
                  <p>Ebenfalls unter <strong>Optionen &gt; Sicheres Backup</strong> finden Sie den Bereich "Backup wiederherstellen".</p>
                  <p>Laden Sie die .rvbackup Datei hoch und geben Sie das Passwort ein, das Sie beim Erstellen vergeben haben. Alle Ihre Daten (Zählerstände, Historie, Zeiterfassung) werden dann wiederhergestellt.</p>
                </FAQItem>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[var(--primary)] hover:opacity-90 text-[var(--primary-text)] font-black rounded-xl transition-all active:scale-95 focus-visible:ring-4 shadow-sm"
          >
            Hilfe schließen
          </button>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border-color)]">
        <h4 className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
          {icon}
          {title}
        </h4>
      </div>
      <div className="p-4 text-xs text-[var(--text-muted)] leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}
