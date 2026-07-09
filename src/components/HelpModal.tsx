import React, { useEffect, useRef, useState } from "react";
import { 
  X, 
  HelpCircle, 
  Accessibility, 
  BookOpen, 
  Volume2, 
  Check, 
  AlertTriangle,
  Eye,
  GraduationCap,
  Clock,
  Sparkles,
  FileText,
  Share2,
  Download,
  UploadCloud
} from "lucide-react";
import { SectionsConfig } from "../types";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  appFields: SectionsConfig;
  onRestore: (fields: SectionsConfig, values: any) => void;
}

export default function HelpModal({ isOpen, onClose, appFields, onRestore }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<"instructions" | "backup">("instructions");
  const [backupCode, setBackupCode] = useState("");
  
  // Restore / Import States
  const [restoreCode, setRestoreCode] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // Focus trap and esc key
  useEffect(() => {
    if (!isOpen) return;

    const previouslyActive = document.activeElement as HTMLElement;

    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
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

  // --- GENERATE BACKUP DATA OBJECT ---
  const generateBackupData = (): string => {
    try {
      const dataString = localStorage.getItem("aussendienst_pwa_data") || "{}";
      const values = JSON.parse(dataString);
      const backupData = {
        fields: appFields,
        values: values,
      };
      return JSON.stringify(backupData, null, 2);
    } catch (e) {
      console.error("Backup generation failed", e);
      return "";
    }
  };

  // --- TRIGGER BACKUP TEXT EXPORT (Base64 for raw code text box) ---
  const handleGenerateTextCode = () => {
    const jsonString = generateBackupData();
    if (!jsonString) return;
    try {
      // Encode as safe Base64
      const utf8Bytes = new TextEncoder().encode(jsonString);
      let binary = "";
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const base64 = btoa(binary);
      setBackupCode(base64);
      setRestoreSuccess(false);
      setRestoreError("");
    } catch (e) {
      setRestoreError("Fehler beim Generieren des Text-Codes.");
    }
  };

  // --- DOWNLOAD OR SHARE BACKUP FILE ---
  const handleDownloadOrShareBackup = async () => {
    setRestoreError("");
    setRestoreSuccess(false);

    const jsonString = generateBackupData();
    if (!jsonString) {
      setRestoreError("Backup-Daten konnten nicht gelesen werden.");
      return;
    }

    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const fileName = `rv_monatsreport_backup_${dateStr}.txt`;

    try {
      const blob = new Blob([jsonString], { type: "text/plain;charset=utf-8" });
      const file = new File([blob], fileName, { type: "text/plain" });

      // Check if browser supports Web Share API for sharing files (like AirDrop/iMessage/Mail)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "RV Monatsreport Backup",
          text: `Anbei das Monatsreport-Backup vom ${dateStr}.`,
        });
        setRestoreSuccess(true);
      } else {
        // Fallback to traditional local file download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setRestoreSuccess(true);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Backup file download/share error:", e);
        setRestoreError("Fehler beim Teilen oder Herunterladen des Backups.");
      }
    }
  };

  // --- PROCESS BACKUP INPUT STRING ---
  const processBackupString = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) {
      setRestoreError("Fehler: Der Code ist leer.");
      return false;
    }

    try {
      let parsed;
      // Try to parse direct JSON
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        // Fallback: decode base64
        const binaryString = atob(trimmed);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decodedString = new TextDecoder().decode(bytes);
        parsed = JSON.parse(decodedString);
      }

      if (parsed && parsed.fields && parsed.values) {
        onRestore(parsed.fields, parsed.values);
        setRestoreSuccess(true);
        setRestoreCode("");
        setBackupCode("");
        setRestoreError("");
        return true;
      } else {
        setRestoreError("Ungültiges Backup-Format: Notwendige Datenstruktur fehlt.");
        return false;
      }
    } catch (e) {
      setRestoreError("Fehler: Ungültiger Backup-Text oder fehlerhafte Datei.");
      return false;
    }
  };

  // --- MANUAL TEXT RESTORE ---
  const handleRestoreText = () => {
    setRestoreError("");
    setRestoreSuccess(false);
    processBackupString(restoreCode);
  };

  // --- RESTORE FROM UPLOADED TEXT FILE ---
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError("");
    setRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedSuccessfully = processBackupString(text);
      if (parsedSuccessfully && fileInputRef.current) {
        fileInputRef.current.value = ""; // reset file input
      }
    };
    reader.onerror = () => {
      setRestoreError("Fehler beim Lesen der ausgewählten Datei.");
    };
    reader.readAsText(file);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      ref={modalRef}
      className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-3xl w-full border border-[var(--border-color)] flex flex-col relative shadow-lg animate-fade-in"
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
            Anleitung &amp; Backup
          </h2>
        </div>
        <p className="text-sm text-[var(--text-muted)] font-semibold">
          Hilfetexte und sichere Textdatei-Datensicherung zum Teilen.
        </p>
      </div>

        {/* SEGMENTED TABS CONTROLLER */}
        <div className="px-6 pt-3 bg-slate-50 dark:bg-slate-900/30 flex border-b border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("instructions");
            }}
            className={`pb-3 pt-1 px-4 text-xs font-bold transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center gap-1.5 ${
              activeTab === "instructions"
                ? "border-[var(--accent)] text-[var(--accent)] font-extrabold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-color)]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📖 Ausfüll-Anleitung</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("backup");
            }}
            className={`pb-3 pt-1 px-4 text-xs font-bold transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center gap-1.5 ${
              activeTab === "backup"
                ? "border-[var(--accent)] text-[var(--accent)] font-extrabold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-color)]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>💾 Datei-Backup &amp; Teilen</span>
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-5">
          
          {/* TAB 1: DETAILED INSTRUCTIONS */}
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
                
                <div className="space-y-4">
                  
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

          {/* TAB 2: TEXT FILE BACKUP & DATA TRANSFER */}
          {activeTab === "backup" && (
            <div className="space-y-5">
              
              {/* Export Backup File Box */}
              <div className="p-4 rounded-xl border border-[var(--accent)]/30 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                <div>
                  <h4 className="text-xs font-black text-[var(--text-color)] flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-[var(--accent)]" />
                    Daten sichern &amp; teilen
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-1">
                    Speichern Sie alle Ihre Zählerstände als Datei ab. Diese können Sie per E-Mail, Messenger oder AirDrop an ein neues Gerät schicken.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadOrShareBackup}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Datei speichern / teilen</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateTextCode}
                    className="py-3 px-4 rounded-xl font-bold border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--bg-color)] text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <FileText className="w-4 h-4 text-[var(--accent)]" />
                    <span>Als Code anzeigen</span>
                  </button>
                </div>

                {/* Backup Code copy-paste display */}
                {backupCode && (
                  <div className="text-left space-y-1 mt-3 pt-2.5 border-t border-[var(--border-color)]">
                    <label htmlFor="backup-code-text" className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider block">
                      Ihr Backup-Textcode:
                    </label>
                    <textarea
                      id="backup-code-text"
                      readOnly
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      value={backupCode}
                      className="w-full h-20 p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg text-[9px] font-mono select-all focus:outline-none leading-relaxed"
                      aria-label="Generierter Text-Backup-Code"
                    />
                    <p className="text-[9px] text-[var(--accent)] font-bold">
                      Tipp: Ein Klick in das Textfeld markiert den gesamten Code zum einfachen Kopieren.
                    </p>
                  </div>
                )}
              </div>

              {/* Import / Restore File Box */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] space-y-4">
                <div>
                  <h4 className="text-xs font-black text-[var(--text-color)] flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-emerald-500" />
                    Daten wiederherstellen
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-1">
                    Wählen Sie Ihre gespeicherte Backup-Datei aus, um alle Daten und Kategorien wieder in die App zu laden.
                  </p>
                </div>

                {/* File Upload Selector */}
                <div className="space-y-2">
                  <label className="py-3 px-4 rounded-xl text-xs font-extrabold border-2 border-dashed border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--bg-color)] hover:border-emerald-500 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center">
                    <UploadCloud className="w-6 h-6 text-emerald-500" />
                    <span className="font-extrabold text-[var(--text-color)]">Datei auswählen</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">Klicken Sie hier, um eine Datei auszuwählen</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.json"
                      className="hidden"
                      onChange={handleFileImport}
                    />
                  </label>
                </div>

                {/* Manual Text Import (Fallback) */}
                <div className="border-t border-dashed border-[var(--border-color)] pt-3.5 space-y-2.5">
                  <label htmlFor="restore-code-textarea" className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider block">
                    Alternativ als Text-Code einfügen:
                  </label>
                  <textarea
                    id="restore-code-textarea"
                    placeholder="Fügen Sie hier Ihren kopierten Textcode ein..."
                    value={restoreCode}
                    onChange={(e) => setRestoreCode(e.target.value)}
                    className="w-full h-16 p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg text-[10px] font-mono focus:outline-none leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={handleRestoreText}
                    className="w-full py-2.5 px-4 rounded-xl font-black bg-[var(--accent)] text-white hover:opacity-90 text-xs cursor-pointer transition-all"
                  >
                    Backup-Code laden
                  </button>
                </div>

                {/* Feedbacks */}
                {restoreError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 font-bold flex gap-1.5 items-center" role="alert">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{restoreError}</span>
                  </div>
                )}

                {restoreSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 font-bold flex gap-1.5 items-center" role="alert">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>✓ Daten erfolgreich übertragen &amp; wiederhergestellt!</span>
                  </div>
                )}
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
  );
}
