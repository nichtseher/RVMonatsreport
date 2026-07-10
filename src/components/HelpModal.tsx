import React, { useRef, useState, useEffect } from "react";
import { SectionsConfig } from "../types";
import { HelpCircle, X, BookOpen, AlertTriangle, Eye, GraduationCap, Sparkles, Clock, Check, Share2, Lock, Key, FileText } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  appFields: SectionsConfig;
}

export default function HelpModal({ isOpen, onClose, appFields }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activeTab, setActiveTab] = useState<"instructions" | "faq">("instructions");

  useEffect(() => {
    const previouslyActive = document.activeElement as HTMLElement;

    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "auto";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex="0"]'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyActive) {
        previouslyActive.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-3xl w-full max-w-2xl border border-[var(--border-color)] flex flex-col relative shadow-lg animate-fade-in my-auto max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Zurück"
          className="absolute top-5 right-5 w-12 h-12 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer z-10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Header */}
        <div className="p-6 md:p-8 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="w-8 h-8 text-[var(--accent)]" aria-hidden="true" />
            <h2 id="help-modal-title" className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Anleitung &amp; Hilfe
            </h2>
          </div>
          <p className="text-sm text-[var(--text-muted)] font-semibold">
            Informationen zur Bedienung und häufig gestellte Fragen.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-[var(--bg-color)] flex overflow-x-auto no-scrollbar border-b border-[var(--border-color)] gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("instructions")}
            className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition-colors whitespace-nowrap ${
              activeTab === "instructions"
                ? "bg-[var(--card-bg)] text-[var(--text-color)] border-t border-l border-r border-[var(--border-color)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            Anleitung
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("faq")}
            className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition-colors whitespace-nowrap ${
              activeTab === "faq"
                ? "bg-[var(--card-bg)] text-[var(--text-color)] border-t border-l border-r border-[var(--border-color)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            Häufige Fragen (FAQ)
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 md:p-8 overflow-y-auto">
          {/* TAB 1: INSTRUCTIONS */}
          {activeTab === "instructions" && (
            <div className="space-y-6">
              
              {/* Introduction */}
              <div className="p-4 rounded-xl border-l-4 border-[var(--accent)] bg-[var(--accent)]/5 text-xs space-y-2">
                <h3 className="font-extrabold text-[var(--accent)] text-sm">Willkommen in Ihrer digitalen Zähl-App</h3>
                <p className="text-[11.5px] text-[var(--text-color)] leading-relaxed">
                  Diese App hilft Ihnen, alle Kundentermine, Vorführungen und Arbeitszeiten während des Monats einfach und schnell zu erfassen. Am Ende des Monats speichern Sie die Daten ab und können sie bequem in Ihr offizielles System (z.B. eine Excel-Tabelle der Firma) übertragen.
                </p>
              </div>

              {/* Section Descriptions */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-[var(--text-color)] border-b border-[var(--border-color)] pb-2">
                  1. Kategorien & Felder richtig ausfüllen
                </h3>
                
                {/* Category 1 */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs space-y-3 shadow-sm">
                  <span className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Eye className="w-4 h-4" />
                    </div>
                    Vorführungen &amp; Auslieferungen
                  </span>
                  <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
                    Erfassen Sie hier alle <strong>Termine vor Ort</strong>, bei denen Sie ein Gerät physisch präsentieren, testen lassen oder endgültig an den Kunden übergeben. Es wird nicht zwischen Vorführung und Auslieferung unterschieden – gezählt wird der Vor-Ort-Termin.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-[var(--border-color)]">
                      <strong className="text-blue-600 dark:text-blue-400 block mb-1">Schule / Bildung</strong>
                      <span className="text-[10.5px] text-[var(--text-muted)]">Termine in Schulen, Universitäten, Berufsbildungswerken oder bei Schülern zu Hause (wenn es um schulische Versorgung geht).</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-[var(--border-color)]">
                      <strong className="text-blue-600 dark:text-blue-400 block mb-1">Arbeitsplatz</strong>
                      <span className="text-[10.5px] text-[var(--text-muted)]">Termine zur beruflichen Teilhabe direkt am Arbeitsplatz des Kunden oder in Kooperation mit Integrationsämtern.</span>
                    </div>
                  </div>
                </div>

                {/* Category 2 */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs space-y-3 shadow-sm">
                  <span className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    Schulung, Support &amp; Akquise
                  </span>
                  <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
                    Hier dokumentieren Sie alle Dienstleistungen, technischen Hilfestellungen und Netzwerk-Aktivitäten.
                  </p>
                  <ul className="space-y-2 text-[11px] text-[var(--text-muted)]">
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold w-4 mt-0.5">•</span>
                      <div><strong>Schulungen (Vor-Ort):</strong> Der Kunde besitzt das Gerät bereits. Sie fahren hin, um eine tiefergehende Einweisung oder Nachschulung durchzuführen (ohne Hardware-Auslieferung).</div>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold w-4 mt-0.5">•</span>
                      <div><strong>Telefon-Support:</strong> Jede Form von technischer oder fachlicher Beratung über Telefon, Zoom, Teams etc. Sie lösen das Problem aus der Ferne.</div>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold w-4 mt-0.5">•</span>
                      <div><strong>Akquise:</strong> Reine Netzwerk- und Vertriebstermine ohne direkte Geräte-Vorführung bei Endkunden (z.B. Besuche bei Augenärzten, Optikern, Reha-Beratern).</div>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold w-4 mt-0.5">•</span>
                      <div><strong>Messen:</strong> Tage, an denen Sie als Standbetreuer oder Besucher auf Fachmessen, Kongressen oder Ausstellungen aktiv sind.</div>
                    </li>
                  </ul>
                </div>

                {/* Category 3 */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs space-y-3 shadow-sm">
                  <span className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    Spezialprodukte (Zusatz-Zählung)
                  </span>
                  <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
                    Einige hochspezialisierte Produkte müssen <strong>zusätzlich</strong> erfasst werden, da sie für spezielle Statistiken relevant sind.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 dark:border-amber-800/30 text-[11px] text-[var(--text-muted)]">
                    <strong>Wichtig: Doppelte Eintragung!</strong><br />
                    Wenn Sie beispielsweise einen <em>Tactonom</em> an einem Arbeitsplatz vorführen, tragen Sie bitte <strong>1x bei "Arbeitsplatz"</strong> (Sektion 1) UND <strong>1x bei "Tactonom"</strong> (in dieser Sektion) ein.
                  </div>
                  {appFields.s3 && appFields.s3.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {Array.from(
                        new Set(
                          appFields.s3.map((field) =>
                            field.label
                              .replace("Anzahl Vorführungen ", "")
                              .replace("Anzahl telefonische Einweisungen ", "")
                          )
                        )
                      ).map((cleanLabel, index) => (
                        <span key={index} className="bg-[var(--card-bg)] border border-[var(--border-color)] px-2.5 py-1 rounded-md text-[10.5px] font-bold text-[var(--text-color)] flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          {cleanLabel}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category 4 */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs space-y-3 shadow-sm">
                  <span className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    Arbeitszeit &amp; Büro
                  </span>
                  <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
                    Erfassen Sie hier Ihre geleistete Arbeitszeit zur Auswertung der Auslastung.
                  </p>
                  <ul className="space-y-2 text-[11px] text-[var(--text-muted)]">
                    <li className="flex gap-2">
                      <span className="text-emerald-500 font-bold w-4 mt-0.5">•</span>
                      <div><strong>Arbeitstage:</strong> Anzahl der Tage in diesem Monat, an denen Sie <em>tatsächlich gearbeitet</em> haben. Urlaubstage, Krankheitstage und gesetzliche Feiertage werden <strong>nicht</strong> mitgezählt.</div>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-500 font-bold w-4 mt-0.5">•</span>
                      <div><strong>Bürostunden:</strong> Die summierte Zeit in Stunden, die Sie im Homeoffice oder Büro verbracht haben (z.B. für E-Mails, Berichte, Terminvereinbarungen). Geben Sie hier einfach die Gesamtzahl der Stunden ein (z.B. "20").</div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* App Features & Usage */}
              <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                <h3 className="text-sm font-black text-[var(--text-color)] border-b border-[var(--border-color)] pb-2">
                  2. Funktionen &amp; Bedienung der App
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  
                  <div className="bg-[var(--bg-color)] border border-[var(--border-color)] p-4 rounded-xl space-y-2 shadow-sm">
                    <div className="flex items-center gap-2 text-[var(--text-color)] font-bold text-xs">
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-blue-500"><Check className="w-4 h-4" /></div>
                      Werte schnell eintragen
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                      Klicken Sie auf das <strong>+</strong> oder <strong>-</strong> Symbol, um Zähler zu verändern. Sie können auch direkt auf die Zahl klicken und einen Wert über die Tastatur eintippen. Mit der <strong>Tab-Taste</strong> springen Sie bequem zum nächsten Feld.
                    </p>
                  </div>
                  
                  <div className="bg-[var(--bg-color)] border border-[var(--border-color)] p-4 rounded-xl space-y-2 shadow-sm">
                    <div className="flex items-center gap-2 text-[var(--text-color)] font-bold text-xs">
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-emerald-500"><Clock className="w-4 h-4" /></div>
                      Monatsabschluss (Archiv)
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                      Wenn der Monat vorbei ist, klicken Sie auf der Startseite ganz unten auf <strong>"Nächsten Monat starten"</strong>. Der aktuelle Monat wird sicher im Archiv gespeichert und alle Zähler werden auf 0 gesetzt.
                    </p>
                  </div>

                  <div className="bg-[var(--bg-color)] border border-[var(--border-color)] p-4 rounded-xl space-y-2 shadow-sm">
                    <div className="flex items-center gap-2 text-[var(--text-color)] font-bold text-xs">
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-indigo-500"><BookOpen className="w-4 h-4" /></div>
                      Historie ansehen
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                      Sie finden alle vergangenen, abgeschlossenen Monate unter der Schaltfläche <strong>"Historie"</strong> (unten links). Dort können Sie alte Daten einsehen, um diese in das Firmen-System zu übertragen.
                    </p>
                  </div>
                  
                  <div className="bg-[var(--bg-color)] border border-[var(--border-color)] p-4 rounded-xl space-y-2 shadow-sm">
                    <div className="flex items-center gap-2 text-[var(--text-color)] font-bold text-xs">
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-amber-500"><AlertTriangle className="w-4 h-4" /></div>
                      Datenschutz &amp; Offline
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                      Diese App arbeitet zu <strong>100% offline</strong>. Ihre Daten werden ausschließlich lokal auf Ihrem Gerät gespeichert. Es werden keine Daten ins Internet gesendet. Sichern Sie Ihre Daten regelmäßig über den Reiter <strong>"Datei-Backup & Teilen"</strong>.
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2: FAQ */}
          {activeTab === "faq" && (
            <div className="space-y-4">
              
              <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border-color)]">
                  <h4 className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Sind meine Daten sicher? Werden sie ins Internet übertragen?
                  </h4>
                </div>
                <div className="p-4 text-[11.5px] text-[var(--text-muted)] leading-relaxed space-y-2">
                  <p>
                    <strong>Ihre Daten sind zu 100% sicher und bleiben ausschließlich auf Ihrem Gerät.</strong>
                  </p>
                  <p>
                    Diese App ist eine "Offline-App". Das bedeutet, es gibt keinen Server, der im Hintergrund mithört oder Daten speichert. Alles, was Sie eintragen, bleibt im Speicher Ihres Browsers. Der einzige Moment, wo Daten Ihr Gerät verlassen, ist, wenn Sie selbst auf "Teilen" drücken und z.B. einen Excel-Report versenden oder ein Backup erstellen.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border-color)]">
                  <h4 className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-500" />
                    Wie kann ich meine Daten sichern (Backup)?
                  </h4>
                </div>
                <div className="p-4 text-[11.5px] text-[var(--text-muted)] leading-relaxed space-y-2">
                  <p>
                    Da die App komplett offline arbeitet, sollten Sie regelmäßig ein Backup erstellen (z.B. bevor Sie ein neues Handy bekommen).
                  </p>
                  <p>
                    Gehen Sie unten im Menü auf <strong>Optionen</strong> und klicken Sie auf <strong>Sicheres Backup</strong>. Dort können Sie eine passwortgeschützte Backup-Datei herunterladen. Auf einem neuen Gerät können Sie diese Datei im selben Menü wieder hochladen.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border-color)]">
                  <h4 className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    Was passiert, wenn ich auf "Nächsten Monat starten" drücke?
                  </h4>
                </div>
                <div className="p-4 text-[11.5px] text-[var(--text-muted)] leading-relaxed space-y-2">
                  <p>
                    Sobald Sie diesen Knopf ganz unten drücken, passieren zwei Dinge:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Ihre aktuellen Zählerstände werden eingefroren und im <strong>Archiv ("Historie")</strong> gespeichert.</li>
                    <li>Die Zähler auf der Startseite werden alle wieder auf <strong>0</strong> gesetzt, damit Sie mit dem neuen Monat beginnen können.</li>
                  </ul>
                  <p>
                    Keine Sorge: Sie können sich die archivierten Monate jederzeit über den Knopf "Historie" wieder ansehen.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border-color)]">
                  <h4 className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Wie bekomme ich meine Daten als Excel-Tabelle?
                  </h4>
                </div>
                <div className="p-4 text-[11.5px] text-[var(--text-muted)] leading-relaxed space-y-2">
                  <p>
                    Ganz am Ende der Hauptseite ("RV Report") finden Sie zwei Buttons für den <strong>Excel-Export</strong>. 
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Monatsreport:</strong> Erzeugt eine Excel-Datei mit all Ihren eingetragenen Werten für Schulungen, Vorführungen und Arbeitszeiten. (Perfekt für die Vertriebsleitung)</li>
                    <li><strong>Zeiterfassung:</strong> Exportiert alle gestempelten Arbeits- und Pausenzeiten als detailliertes Schichtprotokoll. (Für die Personalabteilung)</li>
                  </ul>
                  <p>Sie können die Excel-Dateien direkt herunterladen oder über Ihr Smartphone teilen (z.B. per Mail versenden).</p>
                </div>
              </div>

              <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border-color)]">
                  <h4 className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-500" />
                    Wie funktioniert die Zeiterfassung (Stempeluhr)?
                  </h4>
                </div>
                <div className="p-4 text-[11.5px] text-[var(--text-muted)] leading-relaxed space-y-2">
                  <p>
                    Unter dem Reiter <strong>RV Zeit</strong> können Sie täglich einstempeln. Die App erfasst Ihre Arbeitszeiten und berechnet automatisch Ihr Gleitzeit- / Überstundenkonto und den Resturlaub.
                  </p>
                  <p>
                    Wenn Sie sich ausstempeln, werden die erfassten Büro- und Außendienststunden sowie der Arbeitstag <strong>automatisch in Ihren Monatsreport (Bereich 4) übertragen</strong>. Sie müssen diese also nicht mehr händisch eintragen.
                  </p>
                  <p>
                    <em>Tipp:</em> Wenn Sie die Stempeluhr nicht benötigen, können Sie das Modul unter <strong>Optionen</strong> deaktivieren. Sie tragen Ihre Bürozeiten dann einfach wieder manuell im RV Report ein.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border-color)]">
                  <h4 className="font-extrabold text-sm text-[var(--text-color)] flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-500" />
                    Kann ich die App auf dem Handy und Laptop gleichzeitig nutzen?
                  </h4>
                </div>
                <div className="p-4 text-[11.5px] text-[var(--text-muted)] leading-relaxed space-y-2">
                  <p>
                    Da die App offline arbeitet, synchronisieren sich Handy und Laptop <strong>nicht automatisch</strong> miteinander. Ein Eintrag auf dem Handy taucht nicht auf dem Laptop auf.
                  </p>
                  <p>
                    <strong>Tipp:</strong> Entscheiden Sie sich für <em>ein</em> Hauptgerät (z.B. Ihr Diensthandy), auf dem Sie tagsüber immer alles eintragen. Am Ende des Monats können Sie die Backup-Datei an Ihren Laptop schicken, sie dort importieren und dann die Zahlen in Ruhe abtippen.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border-t border-[var(--border-color)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black bg-[var(--border-color)] hover:bg-[var(--text-muted)]/10 text-[var(--text-color)] rounded-lg cursor-pointer transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
