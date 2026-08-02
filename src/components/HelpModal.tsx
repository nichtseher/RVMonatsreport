import React, { useRef, useEffect, useState } from "react";
import { 
  X, HelpCircle, BookOpen, Clock, FileText,
  Settings, Share2, Lock, AlertTriangle, Play,
  CalendarDays, BarChart3, LayoutGrid, Shield, Zap, Keyboard
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
                  <p><strong>Ihre Daten bleiben ausschließlich auf Ihrem Gerät.</strong></p>
                  <p>Diese App ist eine "Offline-App". Das bedeutet, es gibt keinen Server, der im Hintergrund mithört oder Daten speichert. Alles, was Sie eintragen, bleibt im Speicher Ihres Browsers (z.B. Safari oder Chrome). Daten verlassen Ihr Gerät nur, wenn Sie es selbst auslösen: beim Teilen eines Excel-Reports oder beim Übertragen auf ein zweites Gerät (Geräte-Sync) – und auch dann gehen sie direkt zum Zielgerät, nicht über einen fremden Server.</p>
                </FAQItem>

                <FAQItem
                  icon={<AlertTriangle className="text-red-500" />}
                  title="Was muss ich tun, damit meine Daten nicht verloren gehen?"
                >
                  <p>Weil alles nur lokal gespeichert ist, gibt es zwei Dinge zu beachten:</p>
                  <ul className="list-disc pl-4 space-y-1 mt-1">
                    <li><strong>Regelmäßig ein Backup erstellen</strong> (Optionen → Datensicherung). Beim Löschen der Browserdaten, bei einem neuen Gerät oder einem Geräteverlust sind die Daten sonst weg.</li>
                    <li><strong>Auf die Speicheranzeige achten:</strong> Oben im RV Report steht normalerweise „Automatisch lokal gesichert“. Erscheint stattdessen ein roter Hinweis <strong>„Speichern fehlgeschlagen“</strong>, konnte die App Ihre Eingaben nicht sichern – erstellen Sie dann bitte sofort ein Backup, bevor Sie weiterarbeiten.</li>
                  </ul>
                  <p className="mt-2">Vermeiden Sie außerdem den privaten Modus des Browsers: Dort werden die Daten beim Schließen gelöscht.</p>
                </FAQItem>

                <FAQItem
                  icon={<Share2 className="text-emerald-500" />}
                  title="Kann ich die App auf Handy und Laptop gleichzeitig nutzen?"
                >
                  <p>Ja. Von sich aus synchronisieren sich Handy und Laptop nicht automatisch – ein Eintrag auf dem Handy erscheint erst dann auf dem Laptop, wenn Sie beide Geräte einmal koppeln. Das geht auf zwei Arten unter Optionen → Geräte-Sync:</p>
                  <p><strong>Einmal-Übertragung:</strong> Ein Gerät zeigt einen Code an, das andere übernimmt ihn – gut, um Daten einmalig zu übertragen. Sie wählen dabei, ob die Daten <em>zusammengeführt</em> (empfohlen) oder <em>ersetzt</em> werden sollen.</p>
                  <p><strong>Live-Verbindung:</strong> Nach einer einmaligen Kopplung gleichen sich beide Geräte automatisch alle paar Sekunden ab. Sie können das Sync-Fenster danach schließen und ganz normal weiterarbeiten – oben erscheint der Hinweis <strong>„Live verbunden“</strong>. Voraussetzung: beide Geräte im gleichen WLAN, App auf beiden geöffnet. Die Verbindung endet, wenn Sie sie trennen oder die App schließen.</p>
                  <p><strong>Keine Kamera nötig:</strong> Beide Wege funktionieren normalerweise per QR-Code-Scan, aber jeder Code lässt sich auch antippen, kopieren und am anderen Gerät einfügen – praktisch, wenn der PC keine Webcam hat.</p>
                  <p>Alternativ steht weiterhin die Funktion "Sicheres Backup" unter "Optionen" zur Verfügung. Alles funktioniert komplett offline – ganz ohne Server.</p>
                </FAQItem>

                <FAQItem
                  icon={<Keyboard className="text-blue-500" />}
                  title="Tastenkürzel (besonders praktisch am PC)"
                >
                  <p>Diese Kürzel funktionieren überall in der App. Halten Sie <strong>Alt</strong> und <strong>Umschalt</strong> zusammen gedrückt und tippen Sie dann den Buchstaben:</p>
                  <ul className="list-disc pl-4 space-y-1 mt-1">
                    <li><strong>Alt+Umschalt+M</strong> – zum Feld „Berichtsmonat“ springen</li>
                    <li><strong>Alt+Umschalt+N</strong> – zum Feld „Mitarbeiter/in“ springen</li>
                    <li><strong>Alt+Umschalt+O</strong> – zum Notizfeld springen</li>
                    <li><strong>Alt+Umschalt+T</strong> – RV Zeit (Stempeluhr) öffnen</li>
                    <li><strong>Alt+Umschalt+H</strong> – RV Archiv öffnen</li>
                    <li><strong>Alt+Umschalt+S</strong> – Sprachansagen ein- oder ausschalten</li>
                    <li><strong>Alt+Umschalt+L</strong> – Ein-Hand-Modus ein- oder ausschalten</li>
                  </ul>
                  <p className="mt-2">In den Zähler-Eingabefeldern gilt zusätzlich: <strong>Pfeil hoch/runter</strong> ändert den Wert, <strong>Enter</strong> springt zum nächsten Feld, <strong>Umschalt+Enter</strong> zum vorherigen.</p>
                  <p>Ganz oben auf der Seite liegt außerdem ein Sprunglink <strong>„Zum Hauptinhalt springen“</strong>, den Sie mit der Tabulatortaste erreichen.</p>
                </FAQItem>
              </div>
            </div>
          )}

          {activeTab === "report" && (
            <div className="space-y-6 animate-fade-in">
               <div className="grid gap-4">
                <FAQItem
                  icon={<Zap className="text-amber-500" />}
                  title="Am schnellsten: die Schnell-Erfassung direkt nach dem Termin"
                >
                  <p>Ganz oben im <strong>RV Report</strong> finden Sie die <strong>Schnell-Erfassung</strong>: große Tasten für Ihre wichtigsten Kategorien. <strong>Ein Tipp = plus eins</strong>, mit Ton und kurzer Vibration als Bestätigung. So erfassen Sie einen Termin in wenigen Sekunden, ohne zu scrollen oder zu suchen.</p>
                  <p>Welche Tasten dort erscheinen, richtet sich normalerweise automatisch danach, was Sie am häufigsten nutzen. Über <strong>Anpassen</strong> können Sie stattdessen bis zu acht Kategorien selbst auswählen – die Reihenfolge Ihrer Auswahl bestimmt die Reihenfolge der Tasten.</p>
                  <p><strong>Tipp:</strong> Wenn Sie die App auf dem Startbildschirm installiert haben, halten Sie das App-Symbol gedrückt – so springen Sie direkt zur Erfassung oder zur Stempeluhr.</p>
                </FAQItem>

                <FAQItem
                  icon={<LayoutGrid className="text-indigo-500" />}
                  title="Wie trage ich meine Tätigkeiten im RV Report ein?"
                >
                  <p>Unter dem Reiter <strong>RV Report</strong> finden Sie verschiedene Bereiche (z.B. Vorführungen, Schulungen). Tippen Sie einfach auf das <strong>+</strong> Symbol, um den Zähler für eine Tätigkeit um 1 zu erhöhen. Tippen Sie auf das <strong>-</strong> Symbol, um ihn wieder zu verringern.</p>
                  <p>Sie können auch in das Eingabefeld zwischen + und - tippen, um direkt eine größere Zahl über die Tastatur einzugeben.</p>
                  <p><strong>Mit Tastatur:</strong> Im Eingabefeld erhöhen und verringern die Pfeiltasten den Wert. Mit <strong>Enter</strong> springen Sie zum nächsten Feld, mit <strong>Umschalt+Enter</strong> zum vorherigen.</p>
                  <p>Die Suchleiste über den Bereichen filtert die Kategorien – hilfreich, wenn Sie eine bestimmte schnell finden möchten.</p>
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
                  <p>Ganz unten im RV Report finden Sie den Knopf <strong>Bericht an VL senden (Teilen/E-Mail)</strong>. Damit erzeugt die App den Monatsbericht als Excel-Datei und öffnet den Teilen-Dialog Ihres Geräts – dort wählen Sie selbst, wie Sie ihn verschicken (z. B. per E-Mail). <strong>Die Empfängeradresse ist nicht hinterlegt</strong>, Sie geben sie im E-Mail-Programm ein. Auf Geräten ohne Teilen-Funktion (meist am PC) wird die Datei stattdessen heruntergeladen.</p>
                  <p>Vor dem Senden prüft die App Ihren Bericht kurz auf Auffälligkeiten (z. B. fehlender Name oder Stunden, die nicht zur Stempeluhr passen) und fragt gegebenenfalls nach.</p>
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
                  <p className="mt-2 text-teal-700 dark:text-teal-400 font-bold">Automatisch übernommen werden: Ihre Arbeitsstunden (Büro und Außendienst) sowie die Anzahl der Arbeitstage – diese müssen Sie nicht doppelt eintragen.</p>
                  <p className="mt-2 text-amber-700 dark:text-amber-400 font-bold">Bitte selbst eintragen: <strong>Urlaubs- und Krankheitstage</strong> tragen Sie im RV Report (Bereich 4 „Arbeitszeit &amp; Büro“) von Hand ein. Die Stempeluhr erfasst diese nicht automatisch – sie rechnet damit aber in der Jahresübersicht weiter.</p>
                </FAQItem>

                <FAQItem 
                  icon={<BarChart3 className="text-amber-500" />}
                  title="Wie werden Überstunden und Urlaub berechnet?"
                >
                  <p>Die App berechnet Ihr Gleitzeitkonto automatisch anhand Ihrer täglichen Soll-Stunden. Im Bereich <strong>RV Zeit</strong> wechseln Sie dafür oben auf den Reiter <strong>Jahreskonto</strong>.</p>
                  <p>Dort sehen Sie für jeden Monat, wie viele Stunden Sie arbeiten sollten (Soll) und wie viele Sie tatsächlich gearbeitet haben (Ist, aus Büro + Außendienst). Auch Ihr Resturlaub wird dort berechnet – auf Basis der Urlaubstage, die Sie im RV Report eingetragen haben.</p>
                  <p>Ihre Startwerte (z. B. Resturlaub aus dem Vorjahr, alte Überstunden, Soll-Stunden pro Tag) passen Sie über <strong>Jahreskonto-Einstellungen bearbeiten</strong> an.</p>
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
                  <p>Gehen Sie im Menü auf <strong>Optionen</strong> und dort auf <strong>Datensicherung</strong>.</p>
                  <p>Setzen Sie das Häkchen bei <strong>„Backup mit Passwort schützen“</strong> und vergeben Sie ein Passwort. Mit <strong>Auf Gerät speichern</strong> laden Sie die Datei herunter, mit <strong>Sicher Teilen / Senden</strong> geben Sie sie direkt weiter (z. B. an sich selbst per E-Mail).</p>
                  <p>Ohne Passwort entsteht eine normale Datei (Endung <code>.json</code>), mit Passwort eine verschlüsselte (Endung <code>.json.enc</code>). Heben Sie diese Datei sicher auf.</p>
                  <p className="text-amber-700 dark:text-amber-400 font-bold">Wichtig: Ohne das Passwort lässt sich ein verschlüsseltes Backup später nicht mehr öffnen.</p>
                </FAQItem>

                <FAQItem
                  icon={<Lock className="text-slate-500" />}
                  title="Wie stelle ich ein Backup wieder her?"
                >
                  <p>Ebenfalls unter <strong>Optionen &gt; Datensicherung</strong> finden Sie den Knopf <strong>Backup wiederherstellen</strong>.</p>
                  <p>Wählen Sie Ihre Backup-Datei aus (<code>.json</code> oder <code>.json.enc</code>). Bei einer verschlüsselten Datei tragen Sie <strong>vorher</strong> das Passwort in das Passwortfeld ein – sonst meldet die App, dass das Passwort fehlt.</p>
                  <p>Alle Ihre Daten (Zählerstände, Archiv, Zeiterfassung, Jahreskonto) werden dann wiederhergestellt.</p>
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
