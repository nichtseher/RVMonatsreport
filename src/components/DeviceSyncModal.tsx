import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Camera,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { motion } from "framer-motion";

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => string;
  onImport: (data: string) => void;
}

/**
 * Serverloser Geräte-Sync:
 * Die Daten werden ausschließlich optisch per QR-Code von Bildschirm zu
 * Kamera übertragen – komplett offline, ohne Server, ohne Internet.
 * Große Datenmengen werden komprimiert und in mehrere QR-Codes aufgeteilt,
 * die automatisch durchrotieren ("animierter QR-Code").
 */

const PROTOCOL = "RV1";
const CHUNK_SIZE = 450; // Zeichen pro QR-Code (zuverlässig scannbar)
const CYCLE_MS = 650; // Rotationsgeschwindigkeit der QR-Codes

// --- Hilfsfunktionen ---------------------------------------------------

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compressString(input: string): Promise<{ data: string; compressed: boolean }> {
  const raw = new TextEncoder().encode(input);
  if (typeof CompressionStream === "undefined") {
    return { data: bytesToBase64(raw), compressed: false };
  }
  try {
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const buffer = await new Response(stream).arrayBuffer();
    return { data: bytesToBase64(new Uint8Array(buffer)), compressed: true };
  } catch {
    return { data: bytesToBase64(raw), compressed: false };
  }
}

async function decompressString(base64: string, compressed: boolean): Promise<string> {
  const bytes = base64ToBytes(base64);
  if (!compressed) {
    return new TextDecoder().decode(bytes);
  }
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Dieses Gerät unterstützt die Dekomprimierung nicht.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(new Uint8Array(buffer));
}

/** Kryptografisch sichere, kurze Transfer-ID */
function secureTransferId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint8Array(4);
  crypto.getRandomValues(random);
  return Array.from(random, (b) => alphabet[b % alphabet.length]).join("");
}

interface ParsedChunk {
  id: string;
  seq: number;
  total: number;
  compressed: boolean;
  data: string;
}

function parseChunk(text: string): ParsedChunk | null {
  // Format: RV1|<id>|<seq>|<total>|<z|u>|<daten>
  if (!text.startsWith(PROTOCOL + "|")) return null;
  const parts = text.split("|");
  if (parts.length < 6) return null;
  const seq = parseInt(parts[2], 10);
  const total = parseInt(parts[3], 10);
  if (!Number.isFinite(seq) || !Number.isFinite(total) || seq < 1 || total < 1 || seq > total) return null;
  return {
    id: parts[1],
    seq,
    total,
    compressed: parts[4] === "z",
    data: parts.slice(5).join("|"),
  };
}

// --- Komponente --------------------------------------------------------

export default function DeviceSyncModal({ isOpen, onClose, onExport, onImport }: DeviceSyncModalProps) {
  const [mode, setMode] = useState<"select" | "send" | "receive" | "confirm">("select");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Sender-Zustand
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Empfänger-Zustand
  const [receivedCount, setReceivedCount] = useState(0);
  const [expectedTotal, setExpectedTotal] = useState(0);
  const [pendingImport, setPendingImport] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const receivedRef = useRef<Map<number, ParsedChunk>>(new Map());
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyActiveRef = useRef<HTMLElement | null>(null);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      try {
        scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    stopScanner();
    receivedRef.current = new Map();
    setMode("select");
    setStatus(null);
    setChunks([]);
    setCurrentChunk(0);
    setIsPlaying(true);
    setReceivedCount(0);
    setExpectedTotal(0);
    setPendingImport(null);
  }, [stopScanner]);

  // Fokus-Falle + Escape (Barrierefreiheit)
  useEffect(() => {
    if (!isOpen) return;
    previouslyActiveRef.current = document.activeElement as HTMLElement | null;
    setTimeout(() => closeButtonRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex="0"]'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyActiveRef.current?.focus();
    };
  }, [isOpen, onClose]);

  // Aufräumen beim Schließen
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  // QR-Code-Rotation (Sender)
  useEffect(() => {
    if (mode !== "send" || chunks.length <= 1 || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentChunk((prev) => (prev + 1) % chunks.length);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [mode, chunks.length, isPlaying]);

  // --- Sender ---
  const startSend = async () => {
    try {
      setStatus({ type: "info", msg: "Daten werden vorbereitet..." });
      const dataStr = onExport();
      const { data, compressed } = await compressString(dataStr);
      const id = secureTransferId();
      const total = Math.max(1, Math.ceil(data.length / CHUNK_SIZE));
      const flag = compressed ? "z" : "u";
      const parts: string[] = [];
      for (let i = 0; i < total; i++) {
        const slice = data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        parts.push(`${PROTOCOL}|${id}|${i + 1}|${total}|${flag}|${slice}`);
      }
      setChunks(parts);
      setCurrentChunk(0);
      setIsPlaying(true);
      setMode("send");
      setStatus({
        type: "info",
        msg:
          total === 1
            ? "Bereit. Scannen Sie den QR-Code mit dem anderen Gerät (in der App unter Sync → Empfangen)."
            : `Bereit. ${total} QR-Codes rotieren automatisch. Halten Sie die Kamera des anderen Geräts ruhig davor, bis alle Teile empfangen wurden.`,
      });
    } catch (err) {
      console.error("Sync prepare error", err);
      setStatus({ type: "error", msg: "Fehler beim Vorbereiten der Daten." });
    }
  };

  // --- Empfänger ---
  const startReceive = () => {
    receivedRef.current = new Map();
    setReceivedCount(0);
    setExpectedTotal(0);
    setPendingImport(null);
    setMode("receive");
    setStatus({ type: "info", msg: "Kamera wird gestartet..." });

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 260, height: 260 } },
          (decodedText) => void handleScanResult(decodedText),
          () => {
            /* Einzelne Fehlscans ignorieren */
          }
        );
        setStatus({
          type: "info",
          msg: "Kamera aktiv. Richten Sie sie auf den QR-Code des sendenden Geräts.",
        });
      } catch (err) {
        console.error("Camera error", err);
        setStatus({
          type: "error",
          msg: "Kamera konnte nicht gestartet werden. Bitte Kamera-Berechtigung in den Browser-Einstellungen prüfen.",
        });
      }
    }, 100);
  };

  const handleScanResult = async (decodedText: string) => {
    const chunk = parseChunk(decodedText);
    if (!chunk) return;

    const map = receivedRef.current;

    // Neuer Transfer? Alles zurücksetzen.
    const existing = map.values().next().value as ParsedChunk | undefined;
    if (existing && (existing.id !== chunk.id || existing.total !== chunk.total)) {
      map.clear();
    }

    if (!map.has(chunk.seq)) {
      map.set(chunk.seq, chunk);
      setReceivedCount(map.size);
      setExpectedTotal(chunk.total);
      setStatus({
        type: "info",
        msg: `Teil ${map.size} von ${chunk.total} empfangen...`,
      });
    }

    if (map.size === chunk.total) {
      stopScanner();
      try {
        const sorted = Array.from(map.values()).sort((a, b) => a.seq - b.seq);
        const base64 = sorted.map((c) => c.data).join("");
        const jsonStr = await decompressString(base64, sorted[0].compressed);
        JSON.parse(jsonStr); // Validierung
        setPendingImport(jsonStr);
        setMode("confirm");
        setStatus({
          type: "success",
          msg: "Alle Daten vollständig empfangen. Bitte Übernahme bestätigen.",
        });
      } catch (err) {
        console.error("Sync assemble error", err);
        map.clear();
        setReceivedCount(0);
        setStatus({
          type: "error",
          msg: "Daten konnten nicht gelesen werden. Bitte Vorgang neu starten.",
        });
        setMode("select");
      }
    }
  };

  const applyImport = () => {
    if (!pendingImport) return;
    onImport(pendingImport);
    setPendingImport(null);
  };

  // --- Schritt-Anzeige ---
  const renderSyncSteps = () => {
    const currentStep = mode === "select" ? 1 : mode === "confirm" ? 3 : 2;
    return (
      <ol className="mb-5 grid grid-cols-3 gap-2 text-[11px] uppercase font-black tracking-[0.18em] text-[var(--text-muted)] list-none p-0">
        {[
          { label: "1. Wahl", help: "Senden oder Empfangen" },
          { label: "2. QR-Code", help: "Zeigen & Scannen" },
          { label: "3. Fertig", help: "Daten übernehmen" },
        ].map((step, idx) => (
          <li
            key={step.label}
            aria-current={currentStep === idx + 1 ? "step" : undefined}
            className={`rounded-2xl border px-3 py-2 text-center ${
              currentStep === idx + 1
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-color)]"
                : "border-[var(--border-color)] bg-[var(--bg-color)]"
            }`}
          >
            <div className="text-[9px] font-black mb-1">{step.label}</div>
            <div className="text-[10px] font-semibold">{step.help}</div>
          </li>
        ))}
      </ol>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        ref={modalRef}
        className="bg-[var(--card-bg)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-color)]">
          <h2 id="sync-modal-title" className="font-bold text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
            Geräte-Synchronisation
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Synchronisation schließen"
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {renderSyncSteps()}

          {/* Statusmeldung: für Screenreader live mitgelesen */}
          <div role="status" aria-live="polite" aria-atomic="true">
            {status && (
              <div
                className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-3 ${
                  status.type === "success"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : status.type === "error"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                )}
                <span className="leading-tight">{status.msg}</span>
              </div>
            )}
          </div>

          {mode === "select" && (
            <div className="space-y-4">
              <div className="mb-6 p-4 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-[var(--accent)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-[var(--text-muted)]">
                  <strong className="text-[var(--text-color)]">100 % offline &amp; DSGVO-konform:</strong>{" "}
                  Die Übertragung läuft direkt von Bildschirm zu Kamera – ohne Internet, ohne Server, ohne
                  Zwischenspeicherung.
                </p>
              </div>

              <button
                onClick={startSend}
                className="w-full p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all flex items-center gap-4 text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                  <Monitor className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-bold text-[var(--text-color)]">Daten senden</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Dieses Gerät zeigt QR-Codes an (z. B. der PC)
                  </div>
                </div>
              </button>

              <button
                onClick={startReceive}
                className="w-full p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all flex items-center gap-4 text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                  <Smartphone className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-bold text-[var(--text-color)]">Daten empfangen</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Dieses Gerät scannt mit der Kamera (iOS &amp; Android)
                  </div>
                </div>
              </button>

              <p className="text-xs text-[var(--text-muted)] pt-2">
                Tipp: Bei sehr großen Datenmengen können Sie alternativ die verschlüsselte
                Backup-Datei nutzen (Optionen → Backup).
              </p>
            </div>
          )}

          {mode === "send" && chunks.length > 0 && (
            <div className="flex flex-col items-center justify-center py-2">
              <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                <QRCodeSVG value={chunks[currentChunk]} size={230} marginSize={1} />
              </div>

              {chunks.length > 1 && (
                <>
                  <p className="text-sm font-bold text-[var(--text-color)] mb-3" aria-hidden="true">
                    Code {currentChunk + 1} von {chunks.length}
                  </p>
                  <div
                    className="flex items-center gap-2 mb-4"
                    role="group"
                    aria-label="Steuerung der QR-Code-Rotation"
                  >
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentChunk((prev) => (prev - 1 + chunks.length) % chunks.length);
                      }}
                      aria-label="Vorheriger QR-Code"
                      className="p-3 rounded-full border border-[var(--border-color)] hover:bg-[var(--bg-color)] cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setIsPlaying((p) => !p)}
                      aria-label={isPlaying ? "Rotation pausieren" : "Rotation fortsetzen"}
                      aria-pressed={!isPlaying}
                      className="p-3 rounded-full border border-[var(--border-color)] hover:bg-[var(--bg-color)] cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Play className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentChunk((prev) => (prev + 1) % chunks.length);
                      }}
                      aria-label="Nächster QR-Code"
                      className="p-3 rounded-full border border-[var(--border-color)] hover:bg-[var(--bg-color)] cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}

              <p className="text-sm text-center text-[var(--text-muted)] max-w-[300px]">
                Öffnen Sie auf dem anderen Gerät die App, wählen Sie{" "}
                <strong>Sync → Daten empfangen</strong> und halten Sie die Kamera vor diesen Bildschirm.
              </p>
              <button
                onClick={resetState}
                className="mt-6 text-sm text-[var(--accent)] font-semibold hover:underline cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          )}

          {mode === "receive" && (
            <div className="flex flex-col items-center justify-center">
              <div
                id="reader"
                className="w-full max-w-[300px] overflow-hidden rounded-xl border-2 border-[var(--accent)] mb-4 bg-black"
                aria-label="Kamera-Vorschau für QR-Code-Scan"
              />

              {expectedTotal > 1 && (
                <div className="w-full max-w-[300px] mb-4">
                  <div
                    className="h-3 w-full rounded-full bg-[var(--bg-color)] border border-[var(--border-color)] overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={expectedTotal}
                    aria-valuenow={receivedCount}
                    aria-label={`${receivedCount} von ${expectedTotal} Datenteilen empfangen`}
                  >
                    <div
                      className="h-full bg-[var(--accent)] transition-all"
                      style={{ width: `${Math.round((receivedCount / expectedTotal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center font-bold text-[var(--text-muted)] mt-1.5">
                    {receivedCount} von {expectedTotal} Teilen
                  </p>
                </div>
              )}

              <p className="text-sm text-center text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <Camera className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                Zentrieren Sie den QR-Code des anderen Geräts im Rahmen. Der Fortschritt wird laufend angesagt.
              </p>
              <button
                onClick={resetState}
                className="text-sm text-[var(--accent)] font-semibold hover:underline cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          )}

          {mode === "confirm" && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 py-4 text-[var(--accent)]">
                <Monitor className="w-8 h-8" aria-hidden="true" />
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                <Smartphone className="w-8 h-8" aria-hidden="true" />
              </div>
              <p className="text-sm text-center font-medium">
                Daten vollständig empfangen. Beim Übernehmen werden die{" "}
                <strong>lokalen Daten dieses Geräts überschrieben</strong>.
              </p>

              <button
                onClick={applyImport}
                className="w-full py-3.5 px-4 rounded-xl font-bold bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 transition-all flex justify-center items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                Daten jetzt übernehmen
              </button>

              <button
                onClick={resetState}
                className="w-full text-sm text-[var(--text-muted)] font-semibold hover:underline cursor-pointer"
              >
                Verwerfen und zurück
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
