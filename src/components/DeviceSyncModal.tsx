import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import {
  ArrowLeft,
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
  Radio,
  Link2,
  Unplug,
  GitMerge,
  Copy,
  ClipboardPaste,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { motion } from "framer-motion";
import {
  buildChunks,
  buildTextCode,
  parseChunk,
  parseTextCode,
  istVerschluesselterCode,
  decompressString,
} from "../utils/syncCode";
import type { ParsedChunk } from "../utils/syncCode";
import { pruefeSyncPaket, monateImPaket } from "../utils/syncSchema";
import ConfirmDialog, { ConfirmRequest } from "./ConfirmDialog";

import {
  subscribeLiveSync,
  getLiveSyncSnapshot,
  adoptPeer,
  adoptChannel,
  getPeer,
  disconnectLiveSync,
  abortPairingOnly,
} from "../utils/liveSync";

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => string;
  onImport: (data: string, strategy: "merge" | "replace") => void | boolean;
  /** Monate im Archiv dieses Geräts -- für die Rückfrage vor dem Ersetzen. */
  lokaleMonate?: number;
}

/**
 * Serverloser Geräte-Sync:
 *
 * 1. Einmal-Übertragung per QR-Code (Bildschirm → Kamera, komplett offline).
 *    Beim Empfang kann gewählt werden: Zusammenführen (empfohlen) oder Ersetzen.
 *
 * 2. Live-Verbindung (WebRTC): Beide Geräte koppeln sich per QR-Code und
 *    verbinden sich dann DIREKT miteinander (Peer-to-Peer, DTLS-verschlüsselt).
 *    Bewusst ohne STUN-/TURN-Server konfiguriert: Es werden keine externen
 *    Dienste kontaktiert, die Verbindung funktioniert im gleichen (W)LAN –
 *    auch ganz ohne Internet. Solange die Verbindung steht, gleichen sich
 *    beide Geräte automatisch ab (Zusammenführen, kein Überschreiben).
 */

const CYCLE_MS = 650; // Rotationsgeschwindigkeit der QR-Codes

// --- Komponente --------------------------------------------------------
type ScanPurpose = "data" | "offer" | "answer";
type LiveStep = "offer" | "scan-answer" | "scan-offer" | "answer";

export default function DeviceSyncModal({
  isOpen,
  onClose,
  onExport,
  onImport,
  lokaleMonate = 0,
}: DeviceSyncModalProps) {
  const [mode, setMode] = useState<"select" | "send" | "receive" | "confirm" | "live-host" | "live-join">("select");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Sender-Zustand (QR-Anzeige, auch für Live-Kopplungscodes)
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Empfänger-Zustand
  const [receivedCount, setReceivedCount] = useState(0);
  const [expectedTotal, setExpectedTotal] = useState(0);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [eingehendeMonate, setEingehendeMonate] = useState(0);

  // Live-Verbindung: Zustand liegt im App-weiten Dienst (liveSync.ts),
  // damit die Verbindung das Schließen dieses Fensters überlebt.
  const live = useSyncExternalStore(subscribeLiveSync, getLiveSyncSnapshot);
  const liveConnected = live.connected;
  const lastSyncTime = live.lastSyncTime;
  const [liveStep, setLiveStep] = useState<LiveStep | null>(null);

  // Kameraloser Weg: Text-Code kopieren / einfügen
  const [textCode, setTextCode] = useState<string | null>(null);
  const [pasteValue, setPasteValue] = useState("");
  // BEWUSST OHNE Auto-Fokus: Das Feld steht seit 0.9.17 an erster Stelle, das
  // genuegt fuer die Lesereihenfolge. Ein automatischer Fokus wuerde auf dem
  // Handy die Bildschirmtastatur hochklappen und damit ausgerechnet die
  // Kameravorschau verdecken, die sehende Nutzer hier brauchen.
  const einfuegeRef = useRef<HTMLTextAreaElement>(null);
  // Optionaler Passwortschutz des Textcodes (seit 0.9.5). Betrifft NUR die
  // Datenübertragung -- die Kopplungscodes der Live-Verbindung bleiben offen,
  // sie enthalten keine Berichtsdaten.
  const [sendePasswort, setSendePasswort] = useState("");
  const [empfangsPasswort, setEmpfangsPasswort] = useState("");
  const [brauchtPasswort, setBrauchtPasswort] = useState(false);
  // Rückfrage vor dem Ersetzen (barrierefreier Dialog statt sofortiger Aktion)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const lastOfferRef = useRef<any>(null);
  /** Rohdaten der Einmal-Übertragung; nur gesetzt, wenn Daten gesendet werden. */
  const sendPayloadRef = useRef<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanPurposeRef = useRef<ScanPurpose>("data");
  const receivedRef = useRef<Map<number, ParsedChunk>>(new Map());
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyActiveRef = useRef<HTMLElement | null>(null);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        // stop() wirft synchron, wenn die Kamera nie gestartet wurde
        // (z. B. PC ohne Webcam) – darf den Einfüge-Weg nicht abbrechen.
        scannerRef.current.stop().catch(() => {});
      } catch {
        /* Scanner lief nicht */
      }
      try {
        scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
  }, []);

  /** Nur die Fenster-Ansicht zurücksetzen -- die Verbindung bleibt unberührt. */
  const resetView = useCallback(() => {
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
    setTextCode(null);
    setPasteValue("");
    setSendePasswort("");
    setEmpfangsPasswort("");
    setBrauchtPasswort(false);
    setEingehendeMonate(0);
    setConfirmRequest(null);
    setLiveStep(null);
    lastOfferRef.current = null;
    sendPayloadRef.current = null;
  }, [stopScanner]);

  /** Abbrechen im Live-Ablauf: laufende Kopplung verwerfen, Ansicht zurück. */
  const cancelPairing = useCallback(() => {
    abortPairingOnly();
    resetView();
  }, [resetView]);

  /** Ausdrückliches Trennen einer bestehenden Live-Verbindung. */
  const disconnectLive = useCallback(() => {
    disconnectLiveSync();
    resetView();
  }, [resetView]);

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

  // Aufräumen beim Schließen: Ansicht zurücksetzen und eine noch nicht
  // fertige Kopplung abbrechen. Eine BESTEHENDE Live-Verbindung bleibt
  // bewusst erhalten -- sonst wäre sie nutzlos, weil man dieses Fenster
  // verlassen muss, um überhaupt Zahlen einzutragen.
  useEffect(() => {
    if (!isOpen) {
      abortPairingOnly();
      resetView();
    }
  }, [isOpen, resetView]);

  // Beim Unmount nur die Kamera freigeben (Verbindung läuft weiter).
  useEffect(() => {
    return () => {
      stopScanner();
      abortPairingOnly();
    };
  }, [stopScanner]);

  // QR-Code-Rotation (für Daten- und Kopplungscodes)
  useEffect(() => {
    if (chunks.length <= 1 || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentChunk((prev) => (prev + 1) % chunks.length);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [chunks.length, isPlaying]);

  // --- Sender (Einmal-Übertragung) ---
  const startSend = async () => {
    try {
      setStatus({ type: "info", msg: "Daten werden vorbereitet..." });
      const payload = onExport();
      sendPayloadRef.current = payload;
      setTextCode(await buildTextCode(payload));
      const parts = await buildChunks(payload);
      setChunks(parts);
      setCurrentChunk(0);
      setIsPlaying(true);
      setMode("send");
      setStatus({
        type: "info",
        msg:
          parts.length === 1
            ? "Bereit. Scannen Sie den QR-Code mit dem anderen Gerät (dort: Sync → Daten empfangen). Keine Kamera zur Hand? Nutzen Sie stattdessen 'Code kopieren' weiter unten."
            : `Bereit. ${parts.length} QR-Codes rotieren automatisch. Halten Sie die Kamera des anderen Geräts ruhig davor, bis alle Teile empfangen wurden. Keine Kamera zur Hand? Nutzen Sie stattdessen 'Code kopieren' weiter unten.`,
      });
    } catch (err) {
      console.error("Sync prepare error", err);
      setStatus({ type: "error", msg: "Fehler beim Vorbereiten der Daten." });
    }
  };

  // --- Scanner (gemeinsam für Daten, Verbindungs- und Antwort-Codes) ---
  const beginScan = (purpose: ScanPurpose) => {
    scanPurposeRef.current = purpose;
    receivedRef.current = new Map();
    setReceivedCount(0);
    setExpectedTotal(0);
    setStatus({
      type: "info",
      msg: "Kamera wird gestartet... Kein Zugriff oder keine Kamera vorhanden? Nutzen Sie einfach das Feld 'Code einfügen' weiter unten.",
    });

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
          msg:
            purpose === "data"
              ? "Kamera aktiv. Richten Sie sie auf den QR-Code des sendenden Geräts."
              : purpose === "offer"
                ? "Kamera aktiv. Richten Sie sie auf den Verbindungscode von Gerät A."
                : "Kamera aktiv. Richten Sie sie auf den Antwort-Code von Gerät B.",
        });
      } catch (err) {
        console.error("Camera error", err);
        setStatus({
          type: "error",
          msg: "Keine Kamera verfügbar oder Berechtigung fehlt. Kein Problem: Nutzen Sie unten das Feld 'Code einfügen' – ganz ohne Kamera.",
        });
      }
    }, 100);
  };

  // --- Kameraloser Weg: Code kopieren / einfügen ---
  const copyTextCode = async () => {
    // Der Code wird erst beim Kopieren gebaut. Grund: Das Verschlüsseln
    // (PBKDF2, 100 000 Runden) darf nicht bei jedem Tastendruck im
    // Passwortfeld laufen. Kopplungscodes der Live-Verbindung haben keine
    // Nutzdaten und bleiben wie sie sind.
    const rohdaten = sendPayloadRef.current;
    const zuKopieren = rohdaten
      ? await buildTextCode(rohdaten, sendePasswort || undefined)
      : textCode;
    if (!zuKopieren) return;
    try {
      await navigator.clipboard.writeText(zuKopieren);
      setStatus({
        type: "success",
        msg: sendePasswort
          ? "Verschlüsselter Code kopiert. Am anderen Gerät unter „Code einfügen“ einsetzen – dort wird dasselbe Passwort abgefragt."
          : "Code kopiert. Am anderen Gerät unter „Code einfügen“ einsetzen. Achtung: Dieser Code ist NICHT verschlüsselt – geben Sie ihn nur über Wege weiter, denen Sie Ihre Daten anvertrauen würden.",
      });
    } catch (err) {
      console.error("Clipboard error", err);
      setStatus({ type: "error", msg: "Kopieren nicht möglich. Bitte Browser-Berechtigung für die Zwischenablage prüfen." });
    }
  };

  /**
   * Code übernehmen.
   *
   * Der Text kann direkt übergeben werden, statt aus `pasteValue` zu kommen:
   * Beim Einfügen ist der State noch nicht gesetzt, und genau dort soll der
   * Code sofort übernommen werden, ohne dass jemand anschließend eine
   * Schaltfläche suchen muss (0.9.17).
   */
  const submitPastedCode = async (direkt?: string) => {
    const roh = direkt ?? pasteValue;
    if (!roh.trim()) return;
    try {
      const ergebnis = await parseTextCode(roh, empfangsPasswort || undefined);
      if (!ergebnis.ok) {
        const texte: Record<string, string> = {
          "kein-code":
            "Das ist kein gültiger Code. Bitte den vollständigen Code einfügen (er beginnt mit RVC1: oder RVC2:).",
          "passwort-noetig":
            "Dieser Code ist mit einem Passwort geschützt. Bitte tragen Sie es unten ein und übernehmen Sie den Code erneut.",
          "passwort-falsch":
            "Das Passwort passt nicht zu diesem Code. Bitte prüfen Sie es und versuchen Sie es erneut.",
          unlesbar:
            "Der Code konnte nicht gelesen werden. Bitte erneut vollständig kopieren und einfügen.",
        };
        setStatus({ type: "error", msg: texte[ergebnis.grund] || texte.unlesbar });
        // Passwortfeld einblenden, sobald klar ist, dass eines gebraucht wird
        if (ergebnis.grund === "passwort-noetig") setBrauchtPasswort(true);
        return;
      }
      stopScanner();
      setPasteValue("");
      setBrauchtPasswort(false);
      setEmpfangsPasswort("");
      handleAssembled(ergebnis.inhalt);
    } catch (err) {
      console.error("Paste code error", err);
      setStatus({ type: "error", msg: "Code konnte nicht gelesen werden. Bitte erneut vollständig kopieren und einfügen." });
    }
  };

  const startReceive = () => {
    setPendingImport(null);
    setMode("receive");
    beginScan("data");
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
        const sorted = (Array.from(map.values()) as ParsedChunk[]).sort((a, b) => a.seq - b.seq);
        const base64 = sorted.map((c) => c.data).join("");
        const jsonStr = await decompressString(base64, sorted[0].compressed);
        handleAssembled(jsonStr);
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

  const handleAssembled = (jsonStr: string) => {
    const purpose = scanPurposeRef.current;
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      setStatus({ type: "error", msg: "Daten konnten nicht gelesen werden. Bitte Vorgang neu starten." });
      setMode("select");
      return;
    }

    if (purpose === "data") {
      // Struktur prüfen, BEVOR etwas angeboten wird. Vorher wurde jedes
      // gültige JSON angenommen; ein Paket mit unsinnigem Inhalt führte beim
      // Ersetzen direkt in den Fehlerbildschirm (reproduziert am 2026-08-03).
      const geprueft = pruefeSyncPaket(parsed);
      if (!geprueft.ok) {
        setStatus({ type: "error", msg: geprueft.grund });
        setMode("select");
        return;
      }
      setPendingImport(jsonStr);
      setEingehendeMonate(monateImPaket(geprueft.paket));
      setMode("confirm");
      setStatus({
        type: "success",
        msg: "Alle Daten vollständig empfangen. Bitte wählen Sie, wie die Daten übernommen werden sollen.",
      });
    } else if (purpose === "offer") {
      void handleOfferScanned(parsed);
    } else {
      void handleAnswerScanned(parsed);
    }
  };

  // --- Bestätigen (Einmal-Übertragung) ---
  const applyImport = (strategy: "merge" | "replace") => {
    if (!pendingImport) return;
    onImport(pendingImport, strategy);
    setPendingImport(null);
  };

  /**
   * Ersetzen ist die folgenschwerste Aktion der App -- sie überschreibt das
   * gesamte Archiv dieses Geräts. Bis 0.9.4 löste ein einziger Tipp sie aus,
   * während der weit harmlosere Monatsabschluss längst eine Rückfrage hatte.
   */
  const ersetzenAnfragen = () => {
    const monatWort = (n: number) => `${n} ${n === 1 ? "Monat" : "Monate"}`;
    setConfirmRequest({
      title: "Alle Daten dieses Geräts ersetzen?",
      message:
        "Der gesamte Bestand dieses Geräts wird durch die empfangenen Daten überschrieben.",
      details: [
        `Auf diesem Gerät: ${monatWort(lokaleMonate)} im Archiv (plus der laufende Monat)`,
        `Im empfangenen Paket: ${monatWort(eingehendeMonate)}`,
        "Alles, was nur auf diesem Gerät steht, geht dabei verloren.",
        "Rückgängig machen lässt sich das nicht.",
      ],
      confirmLabel: "Endgültig ersetzen",
      cancelLabel: "Abbrechen",
      tone: "danger",
      onConfirm: () => applyImport("replace"),
    });
  };

  // --- Live-Verbindung (WebRTC, Peer-to-Peer, ohne externe Server) ---

  const createPeer = (): RTCPeerConnection => {
    // Bewusst OHNE STUN/TURN: keine externen Dienste (DSGVO).
    // Dadurch funktioniert die Verbindung im gleichen (W)LAN – auch offline.
    // Die Verbindung selbst gehört dem App-weiten Dienst (liveSync.ts).
    const pc = new RTCPeerConnection({ iceServers: [] });
    adoptPeer(pc);
    return pc;
  };

  const waitForIce = (pc: RTCPeerConnection): Promise<void> =>
    new Promise((resolve) => {
      if (pc.iceGatheringState === "complete") {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 2500);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          resolve();
        }
      };
    });

  const setupChannel = useCallback(
    (ch: RTCDataChannel) => {
      adoptChannel(ch);
      // Zusätzlich zur Dienst-Logik nur die Fenster-Anzeige aktualisieren.
      const serviceOnOpen = ch.onopen;
      ch.onopen = (ev) => {
        serviceOnOpen?.call(ch, ev as Event);
        setChunks([]);
        setTextCode(null);
        stopScanner();
        setStatus({
          type: "success",
          msg: "Live-Verbindung hergestellt! Sie können dieses Fenster jetzt schließen und normal weiterarbeiten – die Verbindung bleibt bestehen.",
        });
      };
    },
    [stopScanner]
  );

  // Verbindungsverlust im Fenster sichtbar machen (Zustand kommt vom Dienst)
  useEffect(() => {
    if (live.failed) {
      setStatus({
        type: "error",
        msg: "Verbindung nicht zustande gekommen oder getrennt. Prüfen Sie, ob beide Geräte im gleichen WLAN sind. Auf Gerät B genügt ein Tipp auf 'Neuen Antwort-Code erzeugen', auf Gerät A ggf. die Kopplung neu starten.",
      });
    }
  }, [live.failed]);

  // Erfolgreichen Hintergrund-Abgleich anzeigen, solange das Fenster offen ist
  useEffect(() => {
    if (live.connected && live.lastSyncTime) {
      setStatus({
        type: "success",
        msg: `Änderungen vom anderen Gerät übernommen (${live.lastSyncTime} Uhr). Beide Geräte sind auf dem gleichen Stand.`,
      });
    }
  }, [live.connected, live.lastSyncTime]);

  /** Gerät A: Verbindung anbieten */
  const startLiveHost = async () => {
    try {
      setMode("live-host");
      setLiveStep("offer");
      setStatus({ type: "info", msg: "Verbindungscode wird erstellt..." });
      const pc = createPeer();
      setupChannel(pc.createDataChannel("rvsync"));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      const payload = JSON.stringify({ k: "rvw-offer", sdp: pc.localDescription });
      setTextCode(await buildTextCode(payload));
      const parts = await buildChunks(payload);
      setChunks(parts);
      setCurrentChunk(0);
      setIsPlaying(true);
      setStatus({
        type: "info",
        msg: "Schritt 1: Übertragen Sie diesen Verbindungscode auf das andere Gerät – am einfachsten mit „Code kopieren“, eine Kamera ist nicht nötig. Zeitdruck gibt es hier keinen. Wählen Sie danach „Antwort-Code empfangen“.",
      });
    } catch (err) {
      console.error("Live host error", err);
      setStatus({ type: "error", msg: "Live-Verbindung konnte nicht vorbereitet werden." });
      cancelPairing();
    }
  };

  /** Gerät A: Antwort von Gerät B empfangen (Scan oder Einfügen) */
  const startScanAnswer = () => {
    setChunks([]);
    setTextCode(null);
    setLiveStep("scan-answer");
    beginScan("answer");
  };

  const handleAnswerScanned = async (parsed: any) => {
    if (!parsed || parsed.k !== "rvw-answer" || !parsed.sdp) {
      setStatus({
        type: "error",
        msg: "Das war kein Antwort-Code. Bitte scannen Sie den Code, den Gerät B nach dem Beitreten anzeigt.",
      });
      return;
    }
    try {
      await getPeer()?.setRemoteDescription(parsed.sdp as RTCSessionDescriptionInit);
      setStatus({ type: "info", msg: "Verbindung wird aufgebaut... einen Moment bitte." });
    } catch (err) {
      console.error("setRemoteDescription (answer) failed", err);
      setStatus({ type: "error", msg: "Verbindung fehlgeschlagen. Bitte Kopplung neu starten." });
    }
  };

  /** Gerät B: Verbindung beitreten */
  const startLiveJoin = () => {
    setMode("live-join");
    setLiveStep("scan-offer");
    beginScan("offer");
  };

  const handleOfferScanned = async (parsed: any) => {
    if (!parsed || parsed.k !== "rvw-offer" || !parsed.sdp) {
      setStatus({
        type: "error",
        msg: "Das war kein Verbindungscode. Bitte den Code von Gerät A übertragen (Live-Verbindung starten).",
      });
      return;
    }
    // Verbindungscode merken: Damit lässt sich jederzeit mit einem Tipp
    // ein frischer Antwort-Code erzeugen, falls die Kopplung abläuft.
    lastOfferRef.current = parsed;
    try {
      const pc = createPeer();
      pc.ondatachannel = (ev) => setupChannel(ev.channel);
      await pc.setRemoteDescription(parsed.sdp as RTCSessionDescriptionInit);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);
      const payload = JSON.stringify({ k: "rvw-answer", sdp: pc.localDescription });
      setTextCode(await buildTextCode(payload));
      const parts = await buildChunks(payload);
      setChunks(parts);
      setCurrentChunk(0);
      setIsPlaying(true);
      setLiveStep("answer");
      // KEINE FRIST MEHR IM TEXT (0.9.17). Hier stand "am besten innerhalb von
      // einer Minute". Nachgemessen am 2026-08-31: Der Antwort-Code wurde nach
      // 117 Sekunden eingesetzt und die Verbindung kam sofort zustande; bis
      // dahin hatte keine Seite abgebrochen. Die Frist war also keine
      // technische Grenze, sondern eine Vermutung -- und mit Screenreader eine
      // unerfuellbare. Ein Zeitlimit ohne Verlaengerung verstoesst zudem gegen
      // WCAG 2.2.1. Vorbehalt: gemessen mit zwei Gegenstellen auf demselben
      // Rechner, nicht mit zwei echten Geraeten.
      setStatus({
        type: "info",
        msg: "Schritt 2: Übertragen Sie diesen Antwort-Code auf Gerät A – dort „Antwort-Code empfangen“ wählen. Lassen Sie sich dabei Zeit. Sollte die Verbindung nicht zustande kommen, tippen Sie hier auf „Neuen Antwort-Code erzeugen“ und übertragen Sie den neuen Code.",
      });
    } catch (err) {
      console.error("Live join error", err);
      setStatus({ type: "error", msg: "Beitritt fehlgeschlagen. Bitte Kopplung neu starten." });
    }
  };

  /** Gerät B: Frischen Antwort-Code auf denselben Verbindungscode erzeugen */
  const regenerateAnswer = async () => {
    const offer = lastOfferRef.current;
    if (!offer) return;
    // createPeer() -> adoptPeer() verwirft die alte Kopplung ohnehin;
    // hier nur den Status setzen und neu aufsetzen.
    setStatus({ type: "info", msg: "Neuer Antwort-Code wird erzeugt..." });
    await handleOfferScanned(offer);
  };

  // --- Anzeige-Bausteine -------------------------------------------------

  const renderSyncSteps = () => {
    const currentStep = mode === "select" ? 1 : mode === "confirm" ? 3 : 2;
    return (
      <ol className="mb-5 grid grid-cols-3 gap-2 text-[0.75rem] uppercase font-black tracking-[0.18em] text-[var(--text-muted)] list-none p-0">
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
            <div className="text-[0.6875rem] font-black mb-1">{step.label}</div>
            <div className="text-[0.75rem] font-bold">{step.help}</div>
          </li>
        ))}
      </ol>
    );
  };

  const renderChunkDisplay = (label: string) => (
    <div className="flex flex-col items-center justify-center py-2">
      {/* bg-white ist hier Absicht und darf NICHT auf eine Theme-Variable
          umgestellt werden: Ein QR-Code braucht eine weisse Ruhezone mit
          maximalem Kontrast zum schwarzen Muster, sonst erkennt ihn die Kamera
          des anderen Geraets nicht. Gilt auch in den Hochkontrast-Themes. */}
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

      <p className="text-sm text-center text-[var(--text-muted)] max-w-[300px]">{label}</p>

      {textCode && (
        <div className="mt-4 w-full max-w-[300px] space-y-3">
          {/* Passwortschutz nur für Nutzdaten -- Kopplungscodes enthalten keine. */}
          {sendPayloadRef.current && (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] p-3 space-y-2">
              <p className="text-[0.75rem] font-bold text-[var(--text-color)] leading-snug">
                Der QR-Code bleibt auf dem Bildschirm – er verlässt das Gerät nicht.
                Der <strong>kopierte Textcode</strong> dagegen ist ohne Passwort
                <strong> nicht verschlüsselt</strong>: Wer ihn hat, kann alle Daten lesen.
              </p>
              <label htmlFor="sync-passwort" className="block text-[0.75rem] font-black text-[var(--text-color)]">
                Passwort für den Textcode (freiwillig)
              </label>
              <input
                id="sync-passwort"
                type="password"
                value={sendePasswort}
                onChange={(e) => setSendePasswort(e.target.value)}
                placeholder="leer lassen = ohne Schutz"
                className="w-full px-3 min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm focus:border-[var(--border-focus)] outline-none"
                aria-describedby="sync-passwort-hinweis"
              />
              <p id="sync-passwort-hinweis" className="text-[0.6875rem] text-[var(--text-muted)] leading-snug">
                Mit Passwort wird der Textcode verschlüsselt. Am anderen Gerät muss
                dasselbe Passwort eingegeben werden – ohne es sind die Daten verloren.
              </p>
            </div>
          )}
          <button
            onClick={copyTextCode}
            className="w-full py-3 px-4 rounded-xl font-bold border border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all flex justify-center items-center gap-2 cursor-pointer"
          >
            <Copy className="w-5 h-5" aria-hidden="true" />
            {sendPayloadRef.current && sendePasswort
              ? "Verschlüsselten Code kopieren"
              : "Code kopieren (ohne Kamera)"}
          </button>
        </div>
      )}
    </div>
  );

  /**
   * Der kameralose Weg: Code einfügen.
   *
   * Eigener Baustein, seit er im Empfangsbildschirm NACH OBEN gewandert ist.
   * Vorher war er der vierte Block — hinter Kamerabild, Fortschrittsbalken und
   * Hinweistext. Wer sich die Seite vorlesen lässt, hatte dort längst
   * aufgegeben, obwohl der Weg vollständig gebaut war. Genau das war die
   * Rückmeldung aus dem Außendienst (2026-08-31): „zu komplex" hieß nicht
   * „fehlt", sondern „nicht auffindbar".
   */
  const renderEinfuegeBlock = () => (
    <div className="w-full max-w-[300px] mb-4 p-3 rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-color)]">
      <label htmlFor="paste-code-input" className="block text-xs font-black text-[var(--text-color)] mb-2">
        Ohne Kamera: Code einfügen
      </label>
      <textarea
        id="paste-code-input"
        ref={einfuegeRef}
        value={pasteValue}
        onChange={(e) => {
          setPasteValue(e.target.value);
          if (istVerschluesselterCode(e.target.value)) setBrauchtPasswort(true);
        }}
        // Einfuegen genuegt: Ein gueltiger, unverschluesselter Code wird sofort
        // uebernommen. Das Suchen nach der Schaltflaeche danach war der Schritt,
        // an dem mit Screenreader die Zeit verloren ging.
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (!text || !text.trim().startsWith("RVC")) return;
          if (istVerschluesselterCode(text)) {
            setBrauchtPasswort(true);
            return;
          }
          e.preventDefault();
          setPasteValue(text);
          void submitPastedCode(text);
        }}
        placeholder="Code hier einfügen (beginnt mit RVC1: oder RVC2:)..."
        rows={3}
        className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] text-xs font-mono focus:border-[var(--border-focus)] outline-none resize-y"
      />

      {brauchtPasswort && (
        <div className="mt-2">
          <label htmlFor="paste-passwort" className="block text-xs font-black text-[var(--text-color)] mb-1">
            Passwort des Codes
          </label>
          <input
            id="paste-passwort"
            type="password"
            value={empfangsPasswort}
            onChange={(e) => setEmpfangsPasswort(e.target.value)}
            placeholder="Passwort eingeben"
            className="w-full px-3 min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] text-sm focus:border-[var(--border-focus)] outline-none"
          />
        </div>
      )}

      <button
        onClick={() => void submitPastedCode()}
        disabled={!pasteValue.trim()}
        className="mt-2 w-full py-2.5 px-4 min-h-[44px] rounded-lg font-bold bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 cursor-pointer text-sm"
      >
        <ClipboardPaste className="w-4 h-4" aria-hidden="true" />
        Code übernehmen
      </button>
    </div>
  );

  const renderScannerView = (hint: string) => (
    <div className="flex flex-col items-center justify-center">
      {renderEinfuegeBlock()}

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
        {hint}
      </p>


      <button
        onClick={cancelPairing}
        className="text-sm text-[var(--accent)] font-bold hover:underline cursor-pointer"
      >
        Abbrechen
      </button>
    </div>
  );

  const renderConnectedView = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-4 py-3 text-[var(--cat-1-text)]">
        <Monitor className="w-8 h-8" aria-hidden="true" />
        <Link2 className="w-6 h-6 animate-pulse" aria-hidden="true" />
        <Smartphone className="w-8 h-8" aria-hidden="true" />
      </div>
      <div className="p-4 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-sm text-[var(--success-text)] font-bold text-center">
        Live verbunden – beide Geräte gleichen sich automatisch ab.
        {lastSyncTime && (
          <span className="block mt-1 text-xs font-bold">Letzter Abgleich: {lastSyncTime} Uhr</span>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
        Sie können dieses Fenster jetzt schließen und normal weiterarbeiten – die Verbindung
        bleibt im Hintergrund bestehen. Änderungen werden alle paar Sekunden zusammengeführt:
        Pro Monat gewinnt der zuletzt gespeicherte Stand, erfasste Schichten beider Geräte
        bleiben erhalten. Die Verbindung endet erst, wenn Sie unten trennen oder die App
        schließen.
      </p>
      <button
        onClick={disconnectLive}
        className="w-full py-3 px-4 rounded-xl font-bold border border-[var(--danger-border)] text-[var(--danger-text)] hover:brightness-110 transition-all flex justify-center items-center gap-2 cursor-pointer"
      >
        <Unplug className="w-5 h-5" aria-hidden="true" />
        Verbindung trennen
      </button>
    </div>
  );

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
        {/* Kopfzeile mit Zurück-Pfeil (einheitliches Navigationsmuster) */}
        <div className="p-3 border-b border-[var(--border-color)] flex items-center gap-2.5 bg-[var(--bg-color)]">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Zurück zu den Optionen"
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--border-color)] transition-colors cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h2 id="sync-modal-title" className="font-bold text-lg flex items-center gap-2 min-w-0">
            <ArrowRightLeft className="w-5 h-5 text-[var(--accent)] flex-shrink-0" aria-hidden="true" />
            <span className="truncate">Geräte-Synchronisation</span>
          </h2>
        </div>

        <div className="p-6 overflow-y-auto">
          {(mode === "select" || mode === "send" || mode === "receive" || mode === "confirm") &&
            renderSyncSteps()}

          {/* Statusmeldung: für Screenreader live mitgelesen */}
          <div role="status" aria-live="polite" aria-atomic="true">
            {status && (
              <div
                className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-3 ${
                  status.type === "success"
                    ? "bg-[var(--success-bg)] text-[var(--success-text)]"
                    : status.type === "error"
                      ? "bg-[var(--danger-bg)] text-[var(--danger-text)]"
                      : "bg-[var(--info-bg)] text-[var(--info-text)]"
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

          {/* Bestehende Live-Verbindung: beim erneuten Öffnen direkt anzeigen,
              statt das Startmenü zu zeigen (die Verbindung läuft im Hintergrund). */}
          {mode === "select" && liveConnected && renderConnectedView()}

          {mode === "select" && !liveConnected && (
            <div className="space-y-4">
              <div className="mb-6 p-4 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-[var(--accent)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-[var(--text-muted)]">
                  <strong className="text-[var(--text-color)]">100 % serverlos &amp; DSGVO-konform:</strong>{" "}
                  Übertragung nur von Gerät zu Gerät – ohne Cloud, ohne Konten, ohne
                  Zwischenspeicherung auf fremden Servern.
                </p>
              </div>

              {/* Ueberschrift und Beschriftungen nennen seit 0.9.17 das ZIEL,
                  nicht die Technik. Vorher hiess der Abschnitt "Einmal-
                  Uebertragung per QR-Code" und die Knoepfe "zeigt QR-Codes an"
                  bzw. "scannt mit der Kamera" -- der kameralose Weg lag damit
                  innerhalb von etwas, das sich ausdruecklich "per QR-Code"
                  nennt. Wer linear liest, uebersprang ihn zu Recht. */}
              <p className="text-[0.75rem] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Einmal übertragen — auch ohne Kamera
              </p>

              <button
                onClick={startSend}
                className="w-full p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all flex items-center gap-4 text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                  <Monitor className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-bold text-[var(--text-color)]">Daten an anderes Gerät senden</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Erzeugt einen Code zum Kopieren – oder QR-Codes zum Scannen
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
                  <div className="font-bold text-[var(--text-color)]">Daten von anderem Gerät übernehmen</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Code einfügen – oder mit der Kamera scannen
                  </div>
                </div>
              </button>

              <p className="text-[0.75rem] font-black uppercase tracking-[0.18em] text-[var(--text-muted)] pt-2">
                Live-Verbindung (beide Geräte gleichzeitig)
              </p>

              <button
                onClick={startLiveHost}
                className="w-full p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--cat-1)] hover:bg-[var(--cat-1-soft)] transition-all flex items-center gap-4 text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--cat-1-soft)] flex items-center justify-center text-[var(--cat-1-text)] group-hover:scale-110 transition-transform">
                  <Radio className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-bold text-[var(--text-color)]">Live-Verbindung starten (Gerät A)</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Zeigt den Verbindungscode an – z. B. am PC/Laptop
                  </div>
                </div>
              </button>

              <button
                onClick={startLiveJoin}
                className="w-full p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--cat-1)] hover:bg-[var(--cat-1-soft)] transition-all flex items-center gap-4 text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--cat-1-soft)] flex items-center justify-center text-[var(--cat-1-text)] group-hover:scale-110 transition-transform">
                  <Link2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-bold text-[var(--text-color)]">Live-Verbindung beitreten (Gerät B)</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Scannt den Code von Gerät A – z. B. mit dem Handy
                  </div>
                </div>
              </button>

              <p className="text-xs text-[var(--text-muted)] pt-2 leading-relaxed">
                Live-Verbindung: beide Geräte im gleichen WLAN. Eine Kamera ist{" "}
                <strong>nicht</strong> nötig – jeder Code lässt sich auch kopieren und am
                anderen Gerät einfügen. Die Verbindung läuft direkt von Gerät zu Gerät und ist
                verschlüsselt. Tipp: Bei sehr großen Datenmengen können Sie alternativ die
                verschlüsselte Backup-Datei nutzen (Optionen → Backup).
              </p>
            </div>
          )}

          {mode === "send" && chunks.length > 0 && (
            <div>
              {renderChunkDisplay(
                "Öffnen Sie auf dem anderen Gerät die App, wählen Sie Sync → Daten empfangen und halten Sie die Kamera vor diesen Bildschirm."
              )}
              <div className="flex justify-center">
                <button
                  onClick={resetView}
                  className="mt-4 text-sm text-[var(--accent)] font-bold hover:underline cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {mode === "receive" &&
            renderScannerView(
              "Zentrieren Sie den QR-Code des anderen Geräts im Rahmen. Der Fortschritt wird laufend angesagt."
            )}

          {mode === "confirm" && (
            <div className="space-y-5">
              <div className="flex items-center justify-center gap-4 py-3 text-[var(--accent)]">
                <Monitor className="w-8 h-8" aria-hidden="true" />
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                <Smartphone className="w-8 h-8" aria-hidden="true" />
              </div>
              <p className="text-sm text-center font-normal">
                Daten vollständig empfangen. Wie sollen sie übernommen werden?
              </p>

              <button
                onClick={() => applyImport("merge")}
                className="w-full py-3.5 px-4 rounded-xl font-bold bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 transition-all flex justify-center items-center gap-2 cursor-pointer"
              >
                <GitMerge className="w-5 h-5" aria-hidden="true" />
                Zusammenführen (empfohlen)
              </button>
              <p className="text-xs text-[var(--text-muted)] text-center -mt-2 leading-relaxed">
                Vereinigt die Daten beider Geräte: Jede Kategorie wird einzeln abgeglichen –
                bei Änderungen an derselben Kategorie gilt die jüngere. Erfasste Schichten und
                eigene Kategorien beider Geräte bleiben erhalten.
              </p>

              <button
                onClick={ersetzenAnfragen}
                className="w-full py-3 px-4 rounded-xl font-bold border border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--bg-color)] transition-all flex justify-center items-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                Alles ersetzen
              </button>
              <p className="text-xs text-[var(--text-muted)] text-center -mt-2 leading-relaxed">
                Überschreibt <strong>alle</strong> lokalen Daten dieses Geräts
                ({lokaleMonate === 1 ? "1 Monat" : `${lokaleMonate} Monate`} im Archiv) mit den
                empfangenen Daten. Es kommt vorher eine Rückfrage.
              </p>

              <button
                onClick={resetView}
                className="w-full text-sm text-[var(--text-muted)] font-bold hover:underline cursor-pointer"
              >
                Verwerfen und zurück
              </button>
            </div>
          )}

          {mode === "live-host" &&
            (liveConnected
              ? renderConnectedView()
              : liveStep === "offer" && chunks.length > 0
                ? (
                  <div>
                    {renderChunkDisplay(
                      "Scannen Sie diesen Verbindungscode mit dem anderen Gerät (Sync → Live-Verbindung beitreten)."
                    )}
                    <div className="space-y-3 mt-4">
                      <button
                        onClick={startScanAnswer}
                        className="w-full py-3.5 px-4 rounded-xl font-bold bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 transition-all flex justify-center items-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-5 h-5" aria-hidden="true" />
                        Antwort-Code empfangen (Schritt 2)
                      </button>
                      <button
                        onClick={cancelPairing}
                        className="w-full text-sm text-[var(--text-muted)] font-bold hover:underline cursor-pointer"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )
                : liveStep === "scan-answer"
                  ? renderScannerView("Richten Sie die Kamera auf den Antwort-Code, den Gerät B jetzt anzeigt.")
                  : (
                    <p className="text-sm text-center text-[var(--text-muted)]">Verbindung wird vorbereitet...</p>
                  ))}

          {mode === "live-join" &&
            (liveConnected
              ? renderConnectedView()
              : liveStep === "scan-offer"
                ? renderScannerView("Richten Sie die Kamera auf den Verbindungscode von Gerät A.")
                : liveStep === "answer" && chunks.length > 0
                  ? (
                    <div>
                      {renderChunkDisplay(
                        "Übertragen Sie diesen Antwort-Code auf Gerät A (dort „Antwort-Code empfangen“ wählen). Die Verbindung startet dann von selbst. Klappt es nicht, erzeugen Sie unten einfach einen neuen Antwort-Code."
                      )}
                      <div className="space-y-3 mt-4">
                        <button
                          onClick={regenerateAnswer}
                          className="w-full py-3 px-4 rounded-xl font-bold border border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all flex justify-center items-center gap-2 cursor-pointer"
                        >
                          <RefreshCw className="w-5 h-5" aria-hidden="true" />
                          Neuen Antwort-Code erzeugen
                        </button>
                        <button
                          onClick={cancelPairing}
                          className="w-full text-sm text-[var(--text-muted)] font-bold hover:underline cursor-pointer"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )
                  : (
                    <p className="text-sm text-center text-[var(--text-muted)]">Antwort-Code wird erstellt...</p>
                  ))}
        </div>
      </motion.div>

      {/* Rückfrage vor dem Ersetzen -- derselbe barrierefreie Dialog wie beim
          Monatsabschluss (Fokusfalle, Escape, Startfokus auf Abbrechen). */}
      <ConfirmDialog
        request={confirmRequest}
        onClose={() => setConfirmRequest(null)}
      />
    </div>
  );
}
