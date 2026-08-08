import React, { useState, useRef } from "react";
import { ArrowLeft, Download, Upload, Share2, Lock, Unlock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { encryptData, decryptData } from "../utils/crypto";
import { motion } from "framer-motion";

interface SecureBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => string; // Returns stringified JSON of all data
  onImport: (data: string) => void;
}

export default function SecureBackupModal({ isOpen, onClose, onExport, onImport }: SecureBackupModalProps) {
  const [password, setPassword] = useState("");
  const [useEncryption, setUseEncryption] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      const dataStr = onExport();
      let finalData = dataStr;
      let filename = `zeiterfassung_backup_${new Date().toISOString().split("T")[0]}.json`;

      if (useEncryption) {
        if (!password || password.length < 4) {
          setStatus({ type: "error", msg: "Passwort muss mindestens 4 Zeichen lang sein." });
          return;
        }
        finalData = await encryptData(dataStr, password);
        filename += ".enc";
      }

      const blob = new Blob([finalData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus({ type: "success", msg: "Backup erfolgreich heruntergeladen." });
    } catch (error: any) {
      setStatus({ type: "error", msg: `Export fehlgeschlagen: ${error.message}` });
    }
  };

  const handleShare = async () => {
    try {
      const dataStr = onExport();
      let finalData = dataStr;
      let filename = `zeiterfassung_backup_${new Date().toISOString().split("T")[0]}.json`;

      if (useEncryption) {
        if (!password || password.length < 4) {
          setStatus({ type: "error", msg: "Passwort muss mindestens 4 Zeichen lang sein." });
          return;
        }
        finalData = await encryptData(dataStr, password);
        filename += ".enc";
      }

      const blob = new Blob([finalData], { type: "application/json" });
      const file = new File([blob], filename, { type: "application/json" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Zeiterfassung Backup",
          text: "Hier ist mein verschlüsseltes Backup.",
          files: [file],
        });
        setStatus({ type: "success", msg: "Backup erfolgreich geteilt." });
      } else {
        setStatus({ type: "info", msg: "Teilen wird auf diesem Gerät nicht unterstützt. Bitte nutze den Download." });
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setStatus({ type: "error", msg: `Teilen fehlgeschlagen: ${error.message}` });
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let finalDataStr = content;

        if (file.name.endsWith(".enc")) {
          if (!password) {
            setStatus({ type: "error", msg: "Dieses Backup ist verschlüsselt. Bitte tragen Sie oben das Passwort ein und wählen Sie die Datei erneut aus." });
            return;
          }
          finalDataStr = await decryptData(content, password);
        }

        // Validate JSON
        JSON.parse(finalDataStr);
        
        onImport(finalDataStr);
        setStatus({ type: "success", msg: "Backup erfolgreich wiederhergestellt!" });
      } catch (error: any) {
        setStatus({ type: "error", msg: error.message || "Fehler beim Einlesen der Datei." });
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-3xl shadow-lg w-full overflow-hidden flex flex-col border border-[var(--border-color)] animate-fade-in relative">
      {/* Kopfzeile mit Zurück-Pfeil (einheitliches Navigationsmuster) */}
      <div className="flex items-center gap-3 p-6 md:p-8 border-b border-[var(--border-color)] bg-[var(--bg-color)]">
        <button
          onClick={onClose}
          className="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer transition-colors active:scale-95"
          aria-label="Zurück zu den Optionen"
        >
          <ArrowLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <div className="p-3 bg-[var(--info-bg)] text-[var(--cat-4-text)] rounded-xl flex-shrink-0">
          <Lock className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 id="backup-title" className="text-2xl md:text-3xl font-black text-[var(--text-color)]">Datensicherung</h2>
      </div>

      <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
          
          <div className="bg-[var(--info-bg)] text-[var(--info-text)] p-4 rounded-xl text-sm leading-relaxed border border-[var(--info-border)]">
            Sichern Sie Ihre Daten oder übertragen Sie diese auf ein neues Gerät. 
            Mit einem <strong>Passwort</strong> können Sie die Datei sicher per E-Mail oder Messenger teilen.
          </div>

          <div className="space-y-4 bg-[var(--bg-color)] p-5 rounded-xl border border-[var(--border-color)]">
            <h3 className="font-bold text-[var(--text-color)] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--text-muted)]" />
              Sicherheit
            </h3>
            
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={useEncryption}
                  onChange={(e) => setUseEncryption(e.target.checked)}
                  className="w-6 h-6 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--border-focus)] transition-all"
                  aria-label="Verschlüsselung aktivieren"
                />
              </div>
              <span className="text-[var(--text-color)] font-normal group-hover:text-[var(--text-color)] transition-colors">
                Backup mit Passwort schützen
              </span>
            </label>

            {/*
              EIN Passwortfeld für beide Richtungen. Vorher gab es zwei, die
              abwechselnd erschienen -- je nachdem, ob das Häkchen oben gesetzt
              war. Beide schrieben in denselben Zustand, aber beim
              Wiederherstellen sah man dann ein Feld mit der Aufforderung
              "Sicheres Passwort vergeben", obwohl man ein vorhandenes Passwort
              eingeben sollte. Auch die Hilfe liess sich so nicht sauber
              formulieren.
            */}
            <div>
              <label
                htmlFor="backup-passwort"
                className="block text-sm font-bold text-[var(--text-color)] mb-1.5"
              >
                Passwort
              </label>
              <input
                id="backup-passwort"
                type="password"
                placeholder="Passwort eingeben"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--border-focus)] focus:border-[var(--cat-4)] transition-all text-lg"
                aria-describedby="backup-passwort-hinweis"
              />
              <p id="backup-passwort-hinweis" className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                {useEncryption
                  ? "Wird zum Verschlüsseln Ihres neuen Backups verwendet – und um ein verschlüsseltes Backup wieder einzuspielen. Ohne dieses Passwort lässt sich die Datei später nicht mehr öffnen."
                  : "Nur nötig, um ein verschlüsseltes Backup (Endung .json.enc) wieder einzuspielen. Für ein neues Backup ohne Passwortschutz können Sie das Feld leer lassen."}
              </p>
            </div>
          </div>

          {status && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl flex items-start gap-3 ${
                status.type === "success" ? "bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]" :
                status.type === "error" ? "bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-border)]" :
                "bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--info-border)]"
              }`}
              role="alert"
              aria-live="assertive"
            >
              {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
              <p className="text-sm font-normal">{status.msg}</p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleExport}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--primary)] hover:brightness-110 text-[var(--primary-text)] transition-all shadow-md hover:shadow-lg focus:ring-4 focus:ring-[var(--border-focus)] outline-none"
            >
              <Download className="w-6 h-6" />
              <span className="font-bold">Auf Gerät speichern</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] transition-all shadow-md hover:shadow-lg focus:ring-4 focus:ring-[var(--border-focus)] outline-none"
            >
              <Share2 className="w-6 h-6" />
              <span className="font-bold">Sicher Teilen / Senden</span>
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,.enc"
              className="hidden"
              aria-hidden="true"
            />
            
            <button
              onClick={handleImportClick}
              className="sm:col-span-2 flex items-center justify-center gap-2 p-4 rounded-xl bg-[var(--card-bg)] border-2 border-dashed border-[var(--border-color)] hover:border-[var(--cat-4)] hover:bg-[var(--info-bg)] text-[var(--text-color)] transition-all focus:ring-4 focus:ring-[var(--border-focus)] outline-none group"
            >
              <Upload className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--cat-4-text)] transition-colors" />
              <span className="font-normal group-hover:text-[var(--cat-4-text)] transition-colors">
                Backup wiederherstellen
              </span>
            </button>
          </div>
      </div>
    </div>
  );
}
