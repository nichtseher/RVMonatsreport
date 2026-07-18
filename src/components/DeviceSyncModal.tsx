import React, { useState, useEffect, useRef } from "react";
import { X, QrCode, Camera, Smartphone, Laptop, CheckCircle2, AlertTriangle, ArrowRightLeft, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";
import { encryptData, decryptData } from "../utils/crypto";

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => string;
  onImport: (data: string) => void;
}

export default function DeviceSyncModal({ isOpen, onClose, onExport, onImport }: DeviceSyncModalProps) {
  const [mode, setMode] = useState<"select" | "host" | "scan" | "connected">("select");
  const [roomId, setRoomId] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [copied, setCopied] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    } else {
      // Check if opened via URL hash
      if (window.location.hash.startsWith("#sync=")) {
        const parsedSync = parseSyncValue(window.location.hash);
        if (parsedSync) {
          const { room, key } = parsedSync;
          setRoomId(room);
          setEncryptionKey(key);
          setupSocketAndRelay(room, key, true);
          // Clean up hash so it doesn't trigger again on reload
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    }
  }, [isOpen]);

  const parseSyncValue = (value: string): { room: string; key: string } | null => {
    if (!value) return null;

    const normalized = value.trim();
    const hashValue = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    const syncValue = hashValue.startsWith("sync=") ? hashValue.slice("sync=".length) : hashValue;

    if (!syncValue) return null;

    try {
      const parsedUrl = new URL(syncValue, window.location.origin);
      const hashFragment = parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : parsedUrl.hash;
      const decodedSyncValue = hashFragment.startsWith("sync=") ? hashFragment.slice("sync=".length) : hashFragment;
      const separatorIndex = decodedSyncValue.lastIndexOf(":");
      if (separatorIndex <= 0 || separatorIndex === decodedSyncValue.length - 1) return null;
      return {
        room: decodedSyncValue.slice(0, separatorIndex),
        key: decodedSyncValue.slice(separatorIndex + 1),
      };
    } catch {
      const separatorIndex = syncValue.lastIndexOf(":");
      if (separatorIndex <= 0 || separatorIndex === syncValue.length - 1) return null;
      return {
        room: syncValue.slice(0, separatorIndex),
        key: syncValue.slice(separatorIndex + 1),
      };
    }
  };

  const resetState = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setMode("select");
    setRoomId("");
    setEncryptionKey("");
    setStatus(null);
    setCopied(false);
  };

  const copySyncLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}${window.location.search}#sync=${roomId}:${encryptionKey}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setStatus({ type: "success", msg: "Synchronisations-Link in die Zwischenablage kopiert." });
    } catch {
      setStatus({ type: "info", msg: "Kopieren nicht möglich. Bitte den Link manuell aus dem QR-Code übernehmen." });
    }
  };

  const sendPayload = async (socketToUse: Socket | null, roomToUse: string, keyToUse: string) => {
    if (!socketToUse || !socketToUse.connected) {
      setStatus({ type: "error", msg: "Keine aktive Verbindung zum Server." });
      return;
    }

    try {
      const dataStr = onExport();
      const payloadStr = JSON.stringify({ type: "SYNC_DATA", data: dataStr });
      const encryptedPayload = await encryptData(payloadStr, keyToUse);
      socketToUse.emit("relay-data", { roomId: roomToUse, payload: encryptedPayload });
      setStatus({ type: "success", msg: "Daten erfolgreich an das andere Gerät gesendet!" });
    } catch (err) {
      console.error("Sync send error", err);
      setStatus({ type: "error", msg: "Fehler beim Verschlüsseln oder Senden." });
    }
  };

  const setupSocketAndRelay = (room: string, key: string, isInitiator: boolean) => {
    const newSocket = io(window.location.origin, { 
      path: "/socket.io",
      transports: ["polling"],
      reconnectionAttempts: 10,
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join-room", room);
      if (isInitiator) {
        setStatus({ type: "success", msg: "Geräte erfolgreich gekoppelt! Sende Daten jetzt..." });
        setMode("connected");
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
        }
        setTimeout(() => {
          void sendPayload(newSocket, room, key);
        }, 400);
      } else {
        setStatus((prev) => 
          prev?.type === "success" && prev.msg.includes("gekoppelt") 
            ? prev 
            : { type: "info", msg: "Mit Server verbunden. Warte auf anderes Gerät..." }
        );
      }
    });

    newSocket.on("user-joined", () => {
      if (!isInitiator) {
        setStatus({ type: "success", msg: "Geräte erfolgreich gekoppelt!" });
        setMode("connected");
      } else {
        setTimeout(() => {
          void sendPayload(newSocket, room, key);
        }, 300);
      }
    });

    newSocket.on("user-left", () => {
      setStatus({ type: "error", msg: "Anderes Gerät hat die Verbindung getrennt." });
      setMode("select");
    });

    newSocket.on("relay-data", async (encryptedPayload: string) => {
      try {
        const decryptedStr = await decryptData(encryptedPayload, key);
        const payload = JSON.parse(decryptedStr);
        if (payload.type === "SYNC_DATA") {
          onImport(payload.data);
          setStatus({ type: "success", msg: "Daten erfolgreich empfangen und angewendet!" });
        }
      } catch (e) {
        console.error("Decryption error:", e);
        setStatus({ type: "error", msg: "Fehler beim Entschlüsseln der empfangenen Daten." });
      }
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
      setStatus({ type: "error", msg: `Verbindungsfehler: ${err.message}. Versuche erneut...` });
    });
  };

  const startHost = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    const key = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setRoomId(id);
    setEncryptionKey(key);
    setMode("host");
    setStatus({ type: "info", msg: "Warte auf Verbindung... Bitte QR-Code scannen." });
    setupSocketAndRelay(id, key, false);
  };

  const startScan = async () => {
    setMode("scan");
    setStatus({ type: "info", msg: "Kamera wird gestartet..." });
    
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const parsedSync = parseSyncValue(decodedText);
            if (parsedSync) {
              scanner.stop();
              setStatus({ type: "info", msg: "Code erkannt! Verbinde..." });
              setRoomId(parsedSync.room);
              setEncryptionKey(parsedSync.key);
              setupSocketAndRelay(parsedSync.room, parsedSync.key, true);
            }
          },
          (error) => {
            // ignore scan errors
          }
        );
        setStatus({ type: "info", msg: "Bitte QR-Code des anderen Geräts scannen." });
      } catch (err) {
        setStatus({ type: "error", msg: "Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen." });
      }
    }, 100);
  };

  const sendData = async () => {
    await sendPayload(socket, roomId, encryptionKey);
  };

  const renderSyncSteps = () => {
    const currentStep =
      mode === "select" ? 1 : mode === "host" || mode === "scan" ? 2 : 3;

    return (
      <div className="mb-5 grid grid-cols-3 gap-2 text-[11px] uppercase font-black tracking-[0.18em] text-[var(--text-muted)]">
        {[
          { label: "1. Wahl", active: currentStep === 1, help: "Gerät auswählen" },
          { label: "2. Verbindung", active: currentStep === 2, help: "QR-Code nutzen" },
          { label: "3. Sync", active: currentStep === 3, help: "Daten übertragen" },
        ].map((step) => (
          <div
            key={step.label}
            className={`rounded-2xl border px-3 py-2 text-center ${
              step.active
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-color)]"
                : "border-[var(--border-color)] bg-[var(--bg-color)]"
            }`}
          >
            <div className="text-[9px] font-black mb-1">{step.label}</div>
            <div className="text-[10px] font-semibold">{step.help}</div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[var(--card-bg)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-color)]">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-[var(--accent)]" />
            Geräte-Synchronisation
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {renderSyncSteps()}
          {status && (
            <div className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-3 ${
              status.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
              status.type === "error" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
              "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            }`}>
              {status.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
              <span className="leading-tight">{status.msg}</span>
            </div>
          )}

          {mode === "select" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Verbinden Sie Smartphone und Desktop sicher für einen parallelen Arbeitsablauf. Die Daten werden direkt Ende-zu-Ende verschlüsselt übertragen und nicht zentral gespeichert.
              </p>
              <button
                onClick={startHost}
                className="w-full p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all flex items-center gap-4 text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-[var(--text-color)]">Dieses Gerät anzeigen</div>
                  <div className="text-xs text-[var(--text-muted)]">Generiert einen QR-Code zum Scannen</div>
                </div>
              </button>

              <button
                onClick={startScan}
                className="w-full p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all flex items-center gap-4 text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-[var(--text-color)]">Anderes Gerät scannen</div>
                  <div className="text-xs text-[var(--text-muted)]">Öffnet die Kamera (iOS & Android)</div>
                </div>
              </button>
            </div>
          )}

          {mode === "host" && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
                <QRCodeSVG value={`${window.location.origin}${window.location.pathname}${window.location.search}#sync=${roomId}:${encryptionKey}`} size={200} />
              </div>
              <p className="text-sm text-center text-[var(--text-muted)] max-w-[280px]">
                Scannen Sie diesen Code mit der normalen <strong>Kamera-App Ihres Smartphones</strong>, um die App automatisch zu öffnen und zu verbinden.
              </p>
              <button
                type="button"
                onClick={copySyncLink}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-color)]"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Link kopiert" : "Link kopieren"}
              </button>
              <button onClick={resetState} className="mt-8 text-sm text-[var(--accent)] font-semibold hover:underline">
                Abbrechen
              </button>
            </div>
          )}

          {mode === "scan" && (
            <div className="flex flex-col items-center justify-center">
              <div id="reader" className="w-full max-w-[300px] overflow-hidden rounded-xl border-2 border-[var(--accent)] mb-6 bg-black" />
              <p className="text-sm text-center text-[var(--text-muted)] mb-6">
                Zentrieren Sie den QR-Code des anderen Geräts im Rahmen. Für Screenreader-Nutzer wird der Status direkt mitgelesen.
              </p>
              <button onClick={resetState} className="text-sm text-[var(--accent)] font-semibold hover:underline">
                Abbrechen
              </button>
            </div>
          )}

          {mode === "connected" && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 py-4 text-[var(--accent)]">
                <Laptop className="w-8 h-8" />
                <ArrowRightLeft className="w-6 h-6 animate-pulse" />
                <Smartphone className="w-8 h-8" />
              </div>
              <p className="text-sm text-center font-medium">
                Sichere Verbindung hergestellt!
              </p>
              
              <button
                onClick={sendData}
                className="w-full py-3.5 px-4 rounded-xl font-bold bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 transition-all flex justify-center items-center gap-2"
              >
                <ArrowRightLeft className="w-5 h-5" />
                Meine Daten jetzt dorthin senden
              </button>

              <p className="text-xs text-center text-[var(--text-muted)] mt-4 px-4">
                Hinweis: Die Daten werden automatisch gesendet, sobald die Verbindung steht. Der Transfer erfolgt komplett Ende-zu-Ende-verschlüsselt.
              </p>
              
              <button onClick={resetState} className="w-full mt-4 text-sm text-[var(--text-muted)] font-semibold hover:underline">
                Verbindung trennen
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
