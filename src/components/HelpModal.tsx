import React, { useRef, useEffect, useState } from "react";
import { 
  ArrowLeft, HelpCircle, BookOpen, Clock, FileText,
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
      <div className="bg-[var(--card-bg)] rounded-3xl overflow-hidden shadow-2xl border-4 border-[var(--border-color)] flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-[var(--bg-color)] p-6 border-b-2 border-[var(--border-color)] flex items-center justify-between sticky top-0 z-10">
          {/* Zurück-Pfeil links (einheitliches Navigationsmuster) */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer transition-colors active:scale-95 focus-visible:ring-4"
              aria-label="Zurück zu den Optionen"
            >
              <ArrowLeft className="w-6 h-6" aria-hidden="true" />
            </button>
            <div className="w-12 h-12 bg-[var(--primary)] rounded-full hidden sm:flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <HelpCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="help-modal-title" className="text-xl md:text-2xl font-black text-[var(--text-color)] tracking-tight">
                Hilfe & Handbuch
              </h2>
              <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Ausführliche Erklärungen zur RV Mobil App</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        {/* data-scroll-x: Die Leiste laeuft auf schmalen Geraeten bewusst
            seitwaerts, statt vier Reiter unlesbar zu quetschen. Der Marker
            sagt das der Ueberlaufpruefung in check:ui -- ohne ihn meldet sie
            hier 176 px versteckten Ueberlauf, und sie hat damit recht: Von
            aussen ist das von einem Fehler nicht zu unterscheiden. */}
        <div
          data-scroll-x="absicht"
          className="flex flex-shrink-0 border-b border-[var(--border-color)] overflow-x-auto"
        >
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
                className={`flex-1 min-w-[120px] min-h-[44px] py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-4 transition-colors ${
                  activeTab === tab.id
                    ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-color)]"
                    : "border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-color)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        {/* tabIndex + role + Beschriftung: Der Bereich scrollt, enthaelt aber
            ueberwiegend Fliesstext ohne Bedienelemente. Ohne Fokussierbarkeit
            kommt niemand per Tastatur an den Teil, der unterhalb der Kante
            liegt -- man sieht ihn, erreicht ihn aber nicht (axe-Regel
            `scrollable-region-focusable`, WCAG 2.1.1). Mit tabIndex 0 laesst
            er sich anspringen und mit den Pfeiltasten lesen. */}
        {/* break-words: Bei "Extra gross" passten lange deutsche Komposita
            ("Home-Bildschirm", "Speicheranzeige") nicht mehr in die schmale
            Spalte und machten den Bereich 17 px waagerecht scrollbar. Ein
            unteilbares Wort bricht sonst nicht um -- WCAG 1.4.10 Reflow. */}
        <div
          className="p-6 overflow-y-auto space-y-6 break-words"
          tabIndex={0}
          role="region"
          aria-label="Inhalt der Hilfe"
        >
          
          {activeTab === "general" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[var(--info-bg)] p-5 rounded-2xl border border-[var(--info-border)]">
                <h3 className="font-black text-lg text-[var(--info-text)] mb-2 flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Erste Schritte
                </h3>
                <p className="text-sm text-[var(--info-text)] leading-relaxed font-normal">
                  Willkommen bei RV Mobil. Diese App wurde speziell entwickelt, um Außendienstmitarbeitern die Erfassung von Tätigkeiten und Arbeitszeiten so einfach und barrierefrei wie möglich zu machen. Sie funktioniert komplett offline und speichert Ihre Daten sicher direkt auf Ihrem Gerät.
                </p>
              </div>

              <div className="grid gap-4">
                <FAQItem 
                  icon={<AlertTriangle className="text-[var(--warning-border)]" />}
                  title="Sind meine Daten sicher? Werden sie ins Internet übertragen?"
                >
                  <p><strong>Ihre Daten bleiben ausschließlich auf Ihrem Gerät.</strong></p>
                  <p>Diese App ist eine "Offline-App". Das bedeutet, es gibt keinen Server, der im Hintergrund mithört oder Daten speichert. Alles, was Sie eintragen, bleibt im Speicher Ihres Browsers (z.B. Safari oder Chrome). Daten verlassen Ihr Gerät nur, wenn Sie es selbst auslösen: beim Teilen eines Excel-Reports oder beim Übertragen auf ein zweites Gerät (Geräte-Sync) – und auch dann gehen sie direkt zum Zielgerät, nicht über einen fremden Server.</p>
                </FAQItem>

                <FAQItem
                  icon={<AlertTriangle className="text-[var(--danger)]" />}
                  title="Was muss ich tun, damit meine Daten nicht verloren gehen?"
                >
                  <p>Weil alles nur lokal gespeichert ist, gibt es einige Dinge zu beachten:</p>
                  <ul className="list-disc pl-4 space-y-1 mt-1">
                    <li><strong>Auf dem iPhone: RV Mobil zum Home-Bildschirm hinzufügen</strong> (im Teilen-Menü von Safari). Wenn Sie die App nur über ein Lesezeichen benutzen, löscht Safari nach <strong>sieben Tagen ohne Nutzung</strong> alle gespeicherten Daten – Bericht und Archiv. Als App auf dem Home-Bildschirm bleiben sie erhalten. Zeigt die App oben einen roten Hinweis dazu, ist genau das der Grund.</li>
                    <li><strong>Regelmäßig ein Backup erstellen</strong> (Optionen → Datensicherung). Beim Löschen der Browserdaten, bei einem neuen Gerät oder einem Geräteverlust sind die Daten sonst weg. Nach zwei Wochen ohne Sicherung erinnert die App Sie von selbst daran.</li>
                    <li><strong>Auf die Speicheranzeige achten:</strong> Oben im RV Report steht normalerweise „Automatisch lokal gesichert“. Erscheint stattdessen ein roter Hinweis <strong>„Speichern fehlgeschlagen“</strong>, konnte die App Ihre Eingaben nicht sichern – erstellen Sie dann bitte sofort ein Backup, bevor Sie weiterarbeiten.</li>
                  </ul>
                  <p className="mt-2">Vermeiden Sie außerdem den privaten Modus des Browsers: Dort werden die Daten beim Schließen gelöscht.</p>
                  <p className="mt-2"><strong>Eine Sicherung einspielen überschreibt nichts mehr:</strong> Unter „Backup wiederherstellen“ werden die Daten aus der Datei standardmäßig mit dem vorhandenen Stand <strong>zusammengeführt</strong>. Nur wenn Sie den Haken „Vorhandene Daten ersetzen“ setzen, wird alles auf diesem Gerät überschrieben.</p>
                  <p className="mt-2"><strong>Falls die App einmal abstürzt:</strong> Auf dem Fehlerbildschirm steht ganz oben „Daten als Datei sichern“. Nutzen Sie diese Schaltfläche <strong>bevor</strong> Sie etwas anderes versuchen – die Datei lässt sich später über Optionen → Datensicherung → Backup einspielen wieder laden. „Kompletten Reset durchführen“ löscht dagegen alles.</p>
                </FAQItem>

                <FAQItem
                  icon={<Share2 className="text-[var(--accent)]" />}
                  title="Kann ich die App auf Handy und Laptop gleichzeitig nutzen?"
                >
                  <p>Ja. Von sich aus synchronisieren sich Handy und Laptop nicht automatisch – ein Eintrag auf dem Handy erscheint erst dann auf dem Laptop, wenn Sie beide Geräte einmal koppeln. Das geht auf zwei Arten unter Optionen → Geräte-Sync:</p>
                  <p><strong>Einmal-Übertragung:</strong> Ein Gerät zeigt einen Code an, das andere übernimmt ihn – gut, um Daten einmalig zu übertragen. Sie wählen dabei, ob die Daten <em>zusammengeführt</em> (empfohlen) oder <em>ersetzt</em> werden sollen.</p>
                  <p><strong>Live-Verbindung:</strong> Nach einer einmaligen Kopplung gleichen sich beide Geräte von selbst ab – immer dann, wenn sich etwas geändert hat. Sie können das Sync-Fenster danach schließen und ganz normal weiterarbeiten; oben erscheint der Hinweis <strong>„Live verbunden“</strong>. Voraussetzung: beide Geräte im gleichen WLAN, App auf beiden geöffnet.</p>
                  <p>Tippen Sie auf beiden Geräten kurz hintereinander etwas ein, bleiben <strong>beide Eingaben erhalten</strong> – jede Kategorie wird einzeln abgeglichen. Nur wenn Sie dieselbe Kategorie gleichzeitig auf beiden Geräten ändern, gilt die zuletzt getippte.</p>
                  <p>Die Verbindung endet, wenn Sie sie trennen oder die App schließen. Bricht sie von selbst ab – WLAN weg, anderes Gerät zugeklappt –, meldet die App das mit einem <strong>deutlichen Hinweis samt Ansage</strong> und bietet „Neu verbinden“ an. Solange Sie diesen Hinweis sehen, landen Ihre Eingaben nur noch auf diesem einen Gerät.</p>
                  <p><strong>Keine Kamera nötig:</strong> Auf dem empfangenden Gerät steht das Feld „Ohne Kamera: Code einfügen“ <strong>ganz oben</strong> – noch vor der Kameravorschau. Ein eingefügter Code wird sofort übernommen, Sie müssen danach keine Schaltfläche mehr suchen. Jeder Code lässt sich auf dem sendenden Gerät mit „Code kopieren“ übertragen; eine Webcam am PC braucht es dafür nicht.</p>
                  <p><strong>Zum Antwort-Code der Live-Verbindung:</strong> Lassen Sie sich Zeit – nachgemessen funktioniert er noch nach mehreren Minuten. Sollte die Verbindung trotzdem nicht zustande kommen, erzeugen Sie auf dem zweiten Gerät einfach einen neuen Antwort-Code und übertragen ihn erneut.</p>
                  <p>Alternativ steht weiterhin die Funktion "Sicheres Backup" unter "Optionen" zur Verfügung. Alles funktioniert komplett offline – ganz ohne Server.</p>
                </FAQItem>

                <FAQItem
                  icon={<Keyboard className="text-[var(--info-border)]" />}
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
                  icon={<Zap className="text-[var(--warning-border)]" />}
                  title="Am schnellsten: die Schnell-Erfassung direkt nach dem Termin"
                >
                  <p>Ganz oben im <strong>RV Report</strong> finden Sie die <strong>Schnell-Erfassung</strong>: große Tasten für Ihre wichtigsten Kategorien. <strong>Ein Tipp erhöht den Zähler um eins</strong>, mit Ton und kurzer Vibration als Bestätigung. So erfassen Sie einen Termin in wenigen Sekunden, ohne zu scrollen oder zu suchen.</p>
                  <p>Welche Tasten dort erscheinen, richtet sich normalerweise automatisch danach, was Sie am häufigsten nutzen. Über <strong>Anpassen</strong> können Sie stattdessen bis zu acht Kategorien selbst auswählen – die Reihenfolge Ihrer Auswahl bestimmt die Reihenfolge der Tasten.</p>
                  <p>Zur Auswahl stehen dabei auch die Stunden-Felder aus Bereich 4 („Arbeitszeit &amp; Büro“). Dort zählt ein Tipp in <strong>halben Stunden</strong> (+0,5), weil diese Felder in Stunden geführt werden. Die automatische Auswahl lässt sie bewusst weg – die füllt normalerweise die Stempeluhr.</p>
                  <p><strong>Tipp:</strong> Wenn Sie die App auf dem Startbildschirm installiert haben, halten Sie das App-Symbol gedrückt – so springen Sie direkt zur Erfassung oder zur Stempeluhr.</p>
                </FAQItem>

                <FAQItem
                  icon={<LayoutGrid className="text-[var(--info-border)]" />}
                  title="Wie trage ich meine Tätigkeiten im RV Report ein?"
                >
                  <p>Unter dem Reiter <strong>RV Report</strong> finden Sie verschiedene Bereiche (z.B. Vorführungen, Schulungen). Tippen Sie einfach auf das <strong>+</strong> Symbol, um den Zähler für eine Tätigkeit um 1 zu erhöhen. Tippen Sie auf das <strong>-</strong> Symbol, um ihn wieder zu verringern.</p>
                  <p>Sie können auch in das Eingabefeld zwischen + und - tippen, um direkt eine größere Zahl über die Tastatur einzugeben.</p>
                  <p><strong>Mit Tastatur:</strong> Im Eingabefeld erhöhen und verringern die Pfeiltasten den Wert. Mit <strong>Enter</strong> springen Sie zum nächsten Feld, mit <strong>Umschalt+Enter</strong> zum vorherigen.</p>
                  <p>Die Suchleiste über den Bereichen filtert die Kategorien – hilfreich, wenn Sie eine bestimmte schnell finden möchten.</p>
                </FAQItem>

                <FAQItem 
                  icon={<CalendarDays className="text-[var(--info-border)]" />}
                  title="Was passiert, wenn ich auf 'Monat abschließen & neu starten' drücke?"
                >
                  <p>Zuerst kommt eine <strong>Rückfrage</strong>. Sie zeigt Ihnen, was gesichert wird – wie viele Vorgänge Sie gezählt und wie viele Schichten Sie erfasst haben. Erst wenn Sie dort auf „Monat abschließen“ tippen, passieren zwei Dinge:</p>
                  <ul className="list-disc pl-4 space-y-1 mt-2">
                    <li>Ihre aktuellen Zählerstände und Notizen werden eingefroren und im <strong>RV Archiv</strong> gespeichert.</li>
                    <li>Die Zähler auf der Startseite werden alle wieder auf <strong>0</strong> gesetzt, und der Monat springt automatisch eins weiter (z.B. von Januar auf Februar).</li>
                  </ul>
                  <p className="mt-2">Danach erscheint oben ein Streifen mit der Taste <strong>Rückgängig</strong>. Damit sind Sie sofort wieder im alten Monat, als wäre nichts gewesen. Der Streifen verschwindet, sobald Sie im neuen Monat den ersten Wert erfassen – ein Rücksprung würde diesen sonst gefährden.</p>
                  <p className="mt-2">Auch ohne Rückgängig ist nichts verloren: Sie können sich die archivierten Monate jederzeit über den Reiter „RV Archiv“ wieder ansehen, nachträglich bearbeiten oder exportieren.</p>
                </FAQItem>

                <FAQItem 
                  icon={<FileText className="text-[var(--accent)]" />}
                  title="Wie exportiere ich die Daten (z.B. für die Vertriebsleitung)?"
                >
                  <p>Ganz unten im RV Report finden Sie den Knopf <strong>Bericht an VL senden (Teilen/E-Mail)</strong>. Damit erzeugt die App den Monatsbericht als Excel-Datei und öffnet den Teilen-Dialog Ihres Geräts – dort wählen Sie selbst, wie Sie ihn verschicken (z. B. per E-Mail). <strong>Die Empfängeradresse ist nicht hinterlegt</strong>, Sie geben sie im E-Mail-Programm ein. Auf Geräten ohne Teilen-Funktion (meist am PC) wird die Datei stattdessen heruntergeladen.</p>
                  <p>Vor dem Senden prüft die App Ihren Bericht kurz auf Auffälligkeiten (z. B. fehlender Name oder Stunden, die nicht zur Stempeluhr passen) und fragt gegebenenfalls nach.</p>
                  <p>Zusätzlich können Sie im <strong>RV Archiv</strong> jederzeit rückwirkend Excel-Dateien für jeden vergangenen Monat herunterladen oder teilen.</p>
                  <p className="mt-2">Im RV Archiv trägt jeder Monat ein Abzeichen: <strong>„Gesendet"</strong> mit Datum oder <strong>„Noch offen"</strong>. Es wird automatisch gesetzt, sobald Sie den Monat exportiert und die Datei wirklich verschickt haben – brechen Sie den Teilen-Dialog ab, bleibt der Monat offen. Mit der Schaltfläche <strong>Als gesendet markieren</strong> können Sie es jederzeit von Hand korrigieren.</p>
                  <p className="mt-2 text-[var(--info-text)] font-bold">Die Datei enthält drei Tabellenblätter: <strong>Monatsinfo</strong> ist exakt das gewohnte Formular der Vertriebsleitung – gleiche Zeilen, gleiche gelbe Felder, gleiche Summenformel. Auf <strong>RV Mobil - Zusatzangaben</strong> stehen alle Werte, für die es im Formular keine Zeile gibt (etwa Urlaubs- und Krankheitstage, Reisezeit und Ihre eigenen Kategorien) samt der Summen je Bereich. Auf <strong>RV Mobil - Arbeitszeiten</strong> stehen Ihre einzelnen Schichten aus der Stempeluhr.</p>
                </FAQItem>
              </div>
            </div>
          )}

          {activeTab === "time" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid gap-4">
                <FAQItem 
                  icon={<Clock className="text-[var(--info-border)]" />}
                  title="Wie funktioniert die Stempeluhr (RV Zeit)?"
                >
                  <p>Der Reiter <strong>RV Zeit</strong> ersetzt einen Stundenzettel. Wenn Sie morgens anfangen, drücken Sie auf <strong>Einstempeln</strong>. Die Uhr beginnt zu laufen.</p>
                  <p>Wenn Sie Feierabend machen, drücken Sie auf <strong>Ausstempeln</strong>. Es öffnet sich ein Dialog, in dem Sie Ihre Pausenzeit anpassen und die gearbeitete Zeit auf Büro- und Außendienst aufteilen können. Bestätigen Sie dies, um den Eintrag zu speichern.</p>
                  <p className="mt-2 text-[var(--info-text)] font-bold">Automatisch übernommen werden: Ihre Arbeitsstunden (Büro und Außendienst) sowie die Anzahl der Arbeitstage – diese müssen Sie nicht doppelt eintragen.</p>
                  <p className="mt-2 text-[var(--warning-text)] font-bold">Bitte selbst eintragen: <strong>Urlaubs- und Krankheitstage</strong> tragen Sie im RV Report (Bereich 4 „Arbeitszeit &amp; Büro“) von Hand ein. Die Stempeluhr erfasst diese nicht automatisch – sie rechnet damit aber in der Jahresübersicht weiter.</p>
                </FAQItem>

                <FAQItem 
                  icon={<BarChart3 className="text-[var(--warning-border)]" />}
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
              <div className="bg-[var(--warning-bg)] p-5 rounded-2xl border border-[var(--warning-border)]">
                <h3 className="font-black text-lg text-[var(--warning-text)] mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Wichtiger Hinweis zum Backup
                </h3>
                <p className="text-sm text-[var(--warning-text)] leading-relaxed font-normal">
                  Da diese App offline arbeitet und Ihre Daten nur auf Ihrem Gerät speichert, sind Sie <strong>selbst für die Sicherung Ihrer Daten verantwortlich</strong>. Wenn Sie den Browserverlauf komplett löschen oder Ihr Handy verlieren, sind die Daten weg, es sei denn, Sie haben ein Backup erstellt.
                </p>
              </div>

              <div className="grid gap-4">
                <FAQItem 
                  icon={<Shield className="text-[var(--accent)]" />}
                  title="Wie erstelle ich ein Backup meiner Daten?"
                >
                  <p>Gehen Sie im Menü auf <strong>Optionen</strong> und dort auf <strong>Datensicherung</strong>.</p>
                  <p>Setzen Sie das Häkchen bei <strong>„Backup mit Passwort schützen“</strong> und tragen Sie darunter im Feld <strong>„Passwort“</strong> eines ein. Mit <strong>Auf Gerät speichern</strong> laden Sie die Datei herunter, mit <strong>Sicher Teilen / Senden</strong> geben Sie sie direkt weiter (z. B. an sich selbst per E-Mail).</p>
                  <p>Ohne Passwort entsteht eine normale Datei (Endung <code>.json</code>), mit Passwort eine verschlüsselte (Endung <code>.json.enc</code>). Heben Sie diese Datei sicher auf.</p>
                  <p className="text-[var(--warning-text)] font-bold">Wichtig: Ohne das Passwort lässt sich ein verschlüsseltes Backup später nicht mehr öffnen.</p>
                </FAQItem>

                <FAQItem
                  icon={<Lock className="text-[var(--text-muted)]" />}
                  title="Wie stelle ich ein Backup wieder her?"
                >
                  <p>Ebenfalls unter <strong>Optionen &gt; Datensicherung</strong> finden Sie den Knopf <strong>Backup wiederherstellen</strong>.</p>
                  <p>Wählen Sie Ihre Backup-Datei aus (<code>.json</code> oder <code>.json.enc</code>). Bei einer verschlüsselten Datei tragen Sie <strong>vorher</strong> das Passwort in das Feld <strong>„Passwort“</strong> ein – sonst meldet die App, dass das Passwort fehlt. Es ist dasselbe Feld, mit dem Sie auch ein neues Backup schützen.</p>
                  <p>Alle Ihre Daten (Zählerstände, Archiv, Zeiterfassung, Jahreskonto) werden dann wiederhergestellt.</p>
                </FAQItem>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 bg-[var(--bg-color)] border-t-2 border-[var(--border-color)] flex justify-end">
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
      <div className="p-4 bg-[var(--bg-color)] border-b border-[var(--border-color)]">
        <h4 className="font-black text-sm text-[var(--text-color)] flex items-center gap-2">
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
