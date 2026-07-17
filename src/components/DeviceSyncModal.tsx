import React, { useState, useEffect, useRef } from "react";
import { X, QrCode, Camera, Smartphone, Laptop, CheckCircle2, AlertTriangle, ArrowRightLeft } from "lucide-react";
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
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

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
  };

  const setupSocketAndRelay = (room: string, key: string, isInitiator: boolean) => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join-room", room);
      if (isInitiator) {
        // The one scanning the code joins and notifies the host
        setStatus({ type: "success", msg: "Geräte erfolgreich gekoppelt!" });
        setMode("connected");
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
        }
      }
    });

    newSocket.on("user-joined", () => {
      if (!isInitiator) {
        setStatus({ type: "success", msg: "Geräte erfolgreich gekoppelt!" });
        setMode("connected");
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
      console.error("Socket connect_error", err);
      setStatus({ type: "error", msg: "Verbindungsfehler zum Server. Versuche erneut..." });
      // Removed setMode("select") to keep the QR code visible
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
            if (decodedText && decodedText.includes(":")) {
              scanner.stop();
              setStatus({ type: "info", msg: "Code erkannt! Verbinde..." });
              const [scannedRoom, scannedKey] = decodedText.split(":");
              setRoomId(scannedRoom);
              setEncryptionKey(scannedKey);
              setupSocketAndRelay(scannedRoom, scannedKey, true);
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
    if (socket && socket.connected) {
      try {
        const dataStr = onExport();
        const payloadStr = JSON.stringify({ type: "SYNC_DATA", data: dataStr });
        const encryptedPayload = await encryptData(payloadStr, encryptionKey);
        socket.emit("relay-data", { roomId, payload: encryptedPayload });
        setStatus({ type: "success", msg: "Daten erfolgreich an das andere Gerät gesendet!" });
      } catch (err) {
        setStatus({ type: "error", msg: "Fehler beim Verschlüsseln oder Senden." });
      }
    } else {
      setStatus({ type: "error", msg: "Keine aktive Verbindung zum Server." });
    }
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
                Verbinden Sie Ihr Smartphone und den PC sicher über eine direkte Ende-zu-Ende verschlüsselte Verbindung, ähnlich wie bei WhatsApp Web. Es werden keine Logindaten benötigt und keine Daten auf einem Server gespeichert.
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
                <QRCodeSVG value={`${roomId}:${encryptionKey}`} size={200} />
              </div>
              <p className="text-sm text-center text-[var(--text-muted)] max-w-[250px]">
                Öffnen Sie diese App auf dem anderen Gerät, wählen Sie "Anderes Gerät scannen" und scannen Sie diesen Code.
              </p>
              <button onClick={resetState} className="mt-8 text-sm text-[var(--accent)] font-semibold hover:underline">
                Abbrechen
              </button>
            </div>
          )}

          {mode === "scan" && (
            <div className="flex flex-col items-center justify-center">
              <div id="reader" className="w-full max-w-[300px] overflow-hidden rounded-xl border-2 border-[var(--accent)] mb-6 bg-black" />
              <p className="text-sm text-center text-[var(--text-muted)] mb-6">
                Zentrieren Sie den QR-Code des anderen Geräts im Rahmen.
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
                Hinweis: Das Empfänger-Gerät wird sofort aktualisiert. Der Transfer erfolgt komplett Ende-zu-Ende-verschlüsselt.
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
