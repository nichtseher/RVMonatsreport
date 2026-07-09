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
      const base64 = btoa(String.fromCharCode(...Array.from(utf8Bytes)));
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
        const bytes = new Uint8Array(
          binaryString.split("").map((char) => char.charCodeAt(0))
        );
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto border border-[var(--border-color)] flex flex-col relative shadow-2xl"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Hilfe schließen"
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer z-10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5 mb-1.5">
            <HelpCircle className="w-6 h-6 text-[var(--accent)]" aria-hidden="true" />
            <h2 id="help-modal-title" className="text-xl font-black tracking-tight">
              Anleitung &amp; Backup
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-semibold">
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
            <div className="space-y-5">
              {/* Section Descriptions */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-[var(--accent)] uppercase tracking-wider">
                  Detaillierte Erfassungsrichtlinien (VL-Vorgaben)
                </h3>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs space-y-2">
                    <span className="font-extrabold text-[var(--text-color)] flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-blue-500" />
                      1. Vorführungen &amp; Auslieferungen (Kernaktivitäten)
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Hier werden alle Vor-Ort-Kundentermine zur praktischen Gerätedemonstration, Erprobung oder formellen Übergabe (Auslieferung) dokumentiert:
                    </p>
                    <ul className="list-disc pl-4 text-[10.5px] text-[var(--text-muted)] space-y-1">
                      <li><strong>Schule/Bildung:</strong> Termine an Regelschulen, Förderzentren, Universitäten sowie Berufsbildungswerken (BBW) zur Erprobung schulspezifischer Hilfsmittel.</li>
                      <li><strong>Arbeitsplatz:</strong> Termine direkt beim Arbeitgeber des Versicherten, an Integrationsämtern oder Berufsförderungswerken (BfW) zur Einrichtung beruflicher Arbeitsplatzausstattungen.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs space-y-2">
                    <span className="font-extrabold text-[var(--text-color)] flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-500" />
                      2. Schulung, Support &amp; Akquise
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Sämtliche Dienstleistungen und Multiplikatoren-Kontakte zur Marktpflege und Kundenbefähigung:
                    </p>
                    <ul className="list-disc pl-4 text-[10.5px] text-[var(--text-muted)] space-y-1">
                      <li><strong>Schulungen &amp; Support (Vor-Ort):</strong> Reine Hilfsmittel-Einweisungen und technischer Vor-Ort-Support ohne physische Neuauslieferung.</li>
                      <li><strong>Telefon-Support:</strong> Komplexere telefonische Beratung, Problemlösung oder Fernwartung bei Software-Fragen.</li>
                      <li><strong>Akquise &amp; Multiplikatoren:</strong> Beratungsbesuche bei Augenärzten, Beratungsstellen (z.B. BSV-Regionalgruppen) und Optikern.</li>
                      <li><strong>Messen &amp; Ausstellungen:</strong> Aktive Standbetreuung oder geführte Messerundgänge (Teilnahme in Tagen oder Anzahl Terminen).</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs space-y-2">
                    <span className="font-extrabold text-[var(--text-color)] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      3. Spezialprodukte (Fokus-Produkte)
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Gezielte Zählung unserer innovativen Fokus-Systeme. Jeder Kundenkontakt mit diesen Systemen muss separat erfasst werden:
                    </p>
                    <ul className="list-disc pl-4 text-[10.5px] text-[var(--text-muted)] space-y-1">
                      <li><strong>Tactonom:</strong> Taktile Grafikausgabegeräte für blinde Menschen.</li>
                      <li><strong>Feelspace:</strong> Vibrations-Navigationsgurte zur taktilen Orientierung.</li>
                      <li><strong>WeWalk:</strong> Smarte Blindenlangstöcke mit Ultraschall-Hinderniserkennung.</li>
                    </ul>
                    {appFields.s3 && appFields.s3.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {Array.from(
                          new Set(
                            appFields.s3.map((field) =>
                              field.label
                                .replace("Anzahl Vorführungen ", "")
                                .replace("Anzahl telefonische Einweisungen ", "")
                            )
                          )
                        ).map((cleanLabel, index) => (
                          <span key={index} className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/10 px-2.5 py-0.5 rounded-md text-[9.5px] font-bold">
                            {cleanLabel}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs space-y-2">
                    <span className="font-extrabold text-[var(--text-color)] flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      4. Arbeitszeit &amp; Büro
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Genaue Zeiterfassung der administrativen Tätigkeiten und Netto-Arbeitstage:
                    </p>
                    <ul className="list-disc pl-4 text-[10.5px] text-[var(--text-muted)] space-y-1">
                      <li><strong>Arbeitstage:</strong> Tatsächlich geleistete Arbeitstage (Urlaubs-, Krankheits- und Feiertage abziehen).</li>
                      <li><strong>Bürostunden ca.:</strong> Erstellung von Berichten, Terminplanung, E-Mail-Korrespondenz und Telefonate mit der Zentrale.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* RV Archiv & Monatsverwaltung */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs space-y-2">
                <span className="font-extrabold text-[var(--text-color)] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  📂 RV Archiv &amp; Monats-Sicherung (Verwaltung)
                </span>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Die App ermöglicht Ihnen die parallele Verwaltung mehrerer Berichtsmonate:
                </p>
                <ul className="list-disc pl-4 text-[10.5px] text-[var(--text-muted)] space-y-1">
                  <li><strong>Automatisches Archivieren:</strong> Sobald Sie am Monatsende auf <strong>"Nächsten Monat starten"</strong> klicken, wird Ihr aktueller Monat mit allen Zählerständen (RV Report) und Schichten (RV Zeit) automatisch im RV Archiv gesichert.</li>
                  <li><strong>Monate wechseln:</strong> Über den Kalender-Wähler oben links können Sie jederzeit zu einem anderen Berichtsmonat springen.</li>
                  <li><strong>Archiv-Zugriff:</strong> Unterhalb der Monatsanzeige finden Sie den Link <strong>"Gespeicherte Monate ansehen"</strong>. Dort können Sie alle archivierten Monate über eine übersichtliche Ausklappliste einsehen, Reports löschen, wieder in die Live-Ansicht laden oder direkt exportieren und teilen.</li>
                </ul>
              </div>

              {/* Security & Local Sandbox */}
              <div className="p-4 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>🔒 DSGVO-konformer Datenschutz (Offline-First)</span>
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Dieses Berichtssystem arbeitet nach dem <strong>Strict-Local-Privacy-Prinzip</strong>. Ihre Daten (Name, Zählerstände, persönliche Anmerkungen) verbleiben ausschließlich verschlüsselt in der lokalen Sandbox Ihres Browsers. Es erfolgt keinerlei Übertragung an Cloud-Server oder Analysetools. Erst durch Ihren bewussten Excel-Export oder Datei-Export geben Sie die Daten kontrolliert frei.
                </p>
              </div>

              {/* Keyboard Accessibility shortcuts */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] space-y-2">
                <h4 className="text-xs font-black text-[var(--text-color)] flex items-center gap-1.5">
                  <Accessibility className="w-4 h-4 text-purple-500" />
                  Effiziente Tastaturbedienung (Hintergrund-Hilfe)
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Für maximale Arbeitsgeschwindigkeit ohne Maus und Touch:
                </p>
                <ul className="list-disc pl-4 text-[10.5px] text-[var(--text-muted)] space-y-1">
                  <li><strong>Wert ändern:</strong> Nutzen Sie im fokussierten Eingabefeld die Tasten <kbd className="px-1 bg-slate-100 dark:bg-slate-800 border rounded font-mono text-[9px]">↑</kbd> und <kbd className="px-1 bg-slate-100 dark:bg-slate-800 border rounded font-mono text-[9px]">↓</kbd>, um Zählerstände sekundenschnell anzupassen.</li>
                  <li><strong>Feld-Wechsel:</strong> Drücken Sie einfach <kbd className="px-1 bg-slate-100 dark:bg-slate-800 border rounded font-mono text-[9px]">Enter</kbd>, um zum nächsten Zähler zu springen, oder <kbd className="px-1 bg-slate-100 dark:bg-slate-800 border rounded font-mono text-[9px]">Shift+Enter</kbd>, um zum vorherigen zurückzukehren.</li>
                  <li><strong>Automatische Text-Kommentare:</strong> Verwenden Sie das Sprach-Diktat (Mikrofon) oder drücken Sie <strong>Datumstempel</strong>, um Notizen blitzschnell zu gliedern.</li>
                </ul>
              </div>

              {/* WCAG Accessibility features */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] space-y-2">
                <h4 className="text-xs font-black text-[var(--text-color)] flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-sky-500" />
                  Barrierefreiheit (WCAG 2.2 Standard)
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Die App ist speziell für assistive Technologien optimiert:
                </p>
                <ul className="list-disc pl-4 text-[10.5px] text-[var(--text-muted)] space-y-1">
                  <li><strong>Acoustic Feedback:</strong> Zähler-Beeps verändern ihre Tonhöhe proportional zum Zählerstand (höhere Werte klingen höher), was Sehbehinderten intuitive Orientierung ermöglicht.</li>
                  <li><strong>Live Regionen:</strong> Screenreader wie JAWS, NVDA oder VoiceOver erhalten sofortige, verständliche Updates bei jeder Zähleränderung.</li>
                  <li><strong>Audio-Auditor:</strong> Die Schaltfläche <strong>🔊 Vorlesen</strong> liest Ihnen den gesamten fertigen Monatsbericht zusammenfassend vor, bevor Sie ihn versenden.</li>
                </ul>
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
                    Backup teilen &amp; sichern (Daten exportieren)
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-1">
                    Erstellt eine gesicherte Textdatei (.txt) mit all Ihren Zählerständen und benutzerdefinierten Feldern. Sie können diese Datei direkt über <strong>Airdrop</strong>, E-Mail, WhatsApp oder Dateitransfer an Ihr neues Gerät senden.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadOrShareBackup}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Backup-Datei teilen / herunterladen</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateTextCode}
                    className="py-3 px-4 rounded-xl font-bold border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--bg-color)] text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <FileText className="w-4 h-4 text-[var(--accent)]" />
                    <span>Als Code-Text anzeigen</span>
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
                    Backup einspielen (Daten importieren)
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-1">
                    Laden Sie Ihre exportierte Backup-Textdatei (.txt) direkt von Ihrem Gerät hoch, um alle Zählerstände und Kategorien wiederherzustellen.
                  </p>
                </div>

                {/* File Upload Selector */}
                <div className="space-y-2">
                  <label className="py-3 px-4 rounded-xl text-xs font-extrabold border-2 border-dashed border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--bg-color)] hover:border-emerald-500 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center">
                    <UploadCloud className="w-6 h-6 text-emerald-500" />
                    <span className="font-extrabold text-[var(--text-color)]">Backup-Textdatei auswählen</span>
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
                    Alternativ als Text einspielen:
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
    </div>
  );
}
