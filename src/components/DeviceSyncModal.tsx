import React, { useState, useEffect, useRef } from "react";
import { X, QrCode, Camera, Smartphone, Laptop, CheckCircle2, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => string;
  onImport: (data: string) => void;
}

export default function DeviceSyncModal({ isOpen, onClose, onExport, onImport }: DeviceSyncModalProps) {
  const [mode, setMode] = useState<"select" | "host" | "scan" | "connected">("select");
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

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
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setMode("select");
    setRoomId("");
    setStatus(null);
  };

  const setupSocketAndRTC = (room: string, isInitiator: boolean) => {
    const newSocket = io();
    setSocket(newSocket);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    });
    peerRef.current = pc;
    setPeerConnection(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        newSocket.emit("signal", { roomId: room, signalData: { type: "candidate", candidate: event.candidate } });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setMode("connected");
        setStatus({ type: "success", msg: "Geräte erfolgreich gekoppelt!" });
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
        }
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setStatus({ type: "error", msg: "Verbindung abgebrochen." });
        setMode("select");
      }
    };

    if (isInitiator) {
      const dc = pc.createDataChannel("sync");
      setupDataChannel(dc);
    } else {
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };
    }

    newSocket.on("connect", () => {
      newSocket.emit("join-room", room);
    });

    newSocket.on("user-joined", async () => {
      if (isInitiator) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          newSocket.emit("signal", { roomId: room, signalData: { type: "offer", offer } });
        } catch (e) {
          console.error(e);
        }
      }
    });

    newSocket.on("signal", async ({ signalData }) => {
      try {
        if (signalData.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          newSocket.emit("signal", { roomId: room, signalData: { type: "answer", answer } });
        } else if (signalData.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
        } else if (signalData.type === "candidate") {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  const setupDataChannel = (dc: RTCDataChannel) => {
    channelRef.current = dc;
    setDataChannel(dc);
    
    dc.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "SYNC_DATA") {
          onImport(payload.data);
          setStatus({ type: "success", msg: "Daten erfolgreich empfangen und angewendet!" });
        }
      } catch (e) {
        setStatus({ type: "error", msg: "Fehler beim Empfangen der Daten." });
      }
    };
  };

  const startHost = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(id);
    setMode("host");
    setStatus({ type: "info", msg: "Warte auf Verbindung... Bitte QR-Code scannen." });
    setupSocketAndRTC(id, false);
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
            if (decodedText && decodedText.length === 6) {
              scanner.stop();
              setStatus({ type: "info", msg: "Code erkannt! Verbinde..." });
              setRoomId(decodedText);
              setupSocketAndRTC(decodedText, true);
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

  const sendData = () => {
    if (channelRef.current && channelRef.current.readyState === "open") {
      const dataStr = onExport();
      channelRef.current.send(JSON.stringify({ type: "SYNC_DATA", data: dataStr }));
      setStatus({ type: "success", msg: "Daten erfolgreich an das andere Gerät gesendet!" });
    } else {
      setStatus({ type: "error", msg: "Keine aktive Verbindung." });
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
                <QRCodeSVG value={roomId} size={200} />
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
                Sichere P2P-Verbindung hergestellt!
              </p>
              
              <button
                onClick={sendData}
                className="w-full py-3.5 px-4 rounded-xl font-bold bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 transition-all flex justify-center items-center gap-2"
              >
                <ArrowRightLeft className="w-5 h-5" />
                Meine Daten jetzt dorthin senden
              </button>

              <p className="text-xs text-center text-[var(--text-muted)] mt-4 px-4">
                Hinweis: Das Empfänger-Gerät wird sofort aktualisiert. Der Transfer erfolgt komplett verschlüsselt und direkt zwischen den Geräten.
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
