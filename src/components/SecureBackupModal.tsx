import React, { useState, useRef } from "react";
import { X, Download, Upload, Share2, Lock, Unlock, AlertTriangle, CheckCircle2 } from "lucide-react";
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
            setStatus({ type: "error", msg: "Dieses Backup ist verschlüsselt. Bitte gib unten das Passwort ein und versuche es erneut." });
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
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg w-full overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 animate-fade-in relative">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-12 h-12 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer z-10 transition-colors"
        aria-label="Zurück"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex items-center gap-3 p-6 md:p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-slate-800/50">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
          <Lock className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 id="backup-title" className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Datensicherung</h2>
      </div>

      <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
          
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm leading-relaxed border border-blue-100 dark:border-blue-800/30">
            Sichern Sie Ihre Daten oder übertragen Sie diese auf ein neues Gerät. 
            Mit einem <strong>Passwort</strong> können Sie die Datei sicher per E-Mail oder Messenger teilen.
          </div>

          <div className="space-y-4 bg-gray-50 dark:bg-slate-900/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-500" />
              Sicherheit
            </h3>
            
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={useEncryption} 
                  onChange={(e) => setUseEncryption(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                  aria-label="Verschlüsselung aktivieren"
                />
              </div>
              <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                Backup mit Passwort schützen
              </span>
            </label>

            {useEncryption && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <input
                  type="password"
                  placeholder="Sicheres Passwort vergeben"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
                  aria-label="Backup Passwort"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Wichtig: Ohne dieses Passwort können Sie das Backup später nicht mehr öffnen!
                </p>
              </motion.div>
            )}
            
            {/* For Import when unencrypted is selected but they need password */}
            {!useEncryption && (
               <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                 <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                   Passwort für Wiederherstellung (nur wenn Backup verschlüsselt ist):
                 </p>
                 <input
                  type="password"
                  placeholder="Passwort eingeben"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                  aria-label="Backup Passwort für Import"
                />
               </div>
            )}
          </div>

          {status && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl flex items-start gap-3 ${
                status.type === "success" ? "bg-green-50 text-green-800 border border-green-200" :
                status.type === "error" ? "bg-red-50 text-red-800 border border-red-200" :
                "bg-blue-50 text-blue-800 border border-blue-200"
              }`}
              role="alert"
              aria-live="assertive"
            >
              {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
              <p className="text-sm font-medium">{status.msg}</p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleExport}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md hover:shadow-lg focus:ring-4 focus:ring-blue-500/50 outline-none"
            >
              <Download className="w-6 h-6" />
              <span className="font-semibold">Auf Gerät speichern</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md hover:shadow-lg focus:ring-4 focus:ring-indigo-500/50 outline-none"
            >
              <Share2 className="w-6 h-6" />
              <span className="font-semibold">Sicher Teilen / Senden</span>
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
              className="sm:col-span-2 flex items-center justify-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 transition-all focus:ring-4 focus:ring-blue-500/50 outline-none group"
            >
              <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Backup wiederherstellen
              </span>
            </button>
          </div>
      </div>
    </div>
  );
}
