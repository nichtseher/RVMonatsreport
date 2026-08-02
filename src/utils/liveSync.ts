/**
 * Live-Sync als App-weiter Dienst (Modul-Singleton).
 *
 * Wichtig: Die WebRTC-Verbindung gehört bewusst NICHT dem Sync-Fenster.
 * Vorher wurde sie beim Schließen des Sync-Tabs abgebaut -- damit war die
 * Live-Verbindung praktisch nutzlos, weil man zum Eintragen von Zahlen
 * genau dieses Fenster verlassen muss. Jetzt bleibt sie bestehen, bis der
 * Nutzer ausdrücklich trennt oder die App geschlossen wird.
 *
 * DSGVO bleibt gewahrt: weiterhin keine ICE-/STUN-/TURN-Server, die
 * Verbindung läuft direkt zwischen den Geräten im selben (W)LAN.
 */

const CHANNEL_PART_SIZE = 60000; // Zeichen pro DataChannel-Nachricht
const LIVE_SEND_INTERVAL_MS = 3000; // Abgleich-Intervall

export interface LiveSyncState {
  connected: boolean;
  /** true, sobald eine Kopplung begonnen, aber noch nicht verbunden ist */
  pairing: boolean;
  lastSyncTime: string | null;
  failed: boolean;
}

type Listener = () => void;

let pc: RTCPeerConnection | null = null;
let channel: RTCDataChannel | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastSent: string | null = null;
let incoming: { id: string; total: number; parts: Map<number, string> } | null = null;

let exportFn: (() => string) | null = null;
let mergeFn: ((data: string) => void) | null = null;

const state: LiveSyncState = {
  connected: false,
  pairing: false,
  lastSyncTime: null,
  failed: false,
};
// Stabile Referenz für useSyncExternalStore: nur bei echter Änderung neu.
let snapshot: LiveSyncState = { ...state };
const listeners = new Set<Listener>();

function notify() {
  snapshot = { ...state };
  listeners.forEach((l) => l());
}

export function subscribeLiveSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLiveSyncSnapshot(): LiveSyncState {
  return snapshot;
}

/**
 * App registriert die aktuellen Export-/Merge-Funktionen. Muss bei jeder
 * relevanten Zustandsänderung erneut aufgerufen werden, damit der
 * Hintergrund-Abgleich immer den aktuellen Datenstand sendet.
 */
export function registerLiveSyncHandlers(
  exp: () => string,
  merge: (data: string) => void,
) {
  exportFn = exp;
  mergeFn = merge;
}

function frameId(): string {
  const random = new Uint8Array(4);
  crypto.getRandomValues(random);
  return Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Aktuellen Datenstand senden -- nur wenn er sich geändert hat (konvergiert). */
export function sendNow() {
  if (!channel || channel.readyState !== "open" || !exportFn) return;
  let data: string;
  try {
    data = exportFn();
  } catch (err) {
    console.error("Live-Sync: Export fehlgeschlagen", err);
    return;
  }
  if (data === lastSent) return;
  lastSent = data;
  const id = frameId();
  const total = Math.max(1, Math.ceil(data.length / CHANNEL_PART_SIZE));
  try {
    for (let i = 0; i < total; i++) {
      channel.send(
        JSON.stringify({
          type: "full",
          id,
          seq: i + 1,
          total,
          data: data.slice(i * CHANNEL_PART_SIZE, (i + 1) * CHANNEL_PART_SIZE),
        }),
      );
    }
  } catch (err) {
    // z. B. Kanal wurde zwischenzeitlich geschlossen
    console.error("Live-Sync: Senden fehlgeschlagen", err);
    lastSent = null;
  }
}

function handleMessage(raw: string) {
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  if (!msg || msg.type !== "full" || typeof msg.data !== "string") return;

  if (!incoming || incoming.id !== msg.id) {
    incoming = { id: msg.id, total: msg.total, parts: new Map() };
  }
  incoming.parts.set(msg.seq, msg.data);
  if (incoming.parts.size < incoming.total) return;

  const fullData = Array.from(
    { length: incoming.total },
    (_, i) => incoming!.parts.get(i + 1) || "",
  ).join("");
  incoming = null;

  // Zusammenführen; der eigene neue Stand wird vom Intervall zurückgesendet.
  // Identische Stände werden nicht erneut übertragen -> konvergiert.
  try {
    mergeFn?.(fullData);
  } catch (err) {
    console.error("Live-Sync: Zusammenführen fehlgeschlagen", err);
    return;
  }
  state.lastSyncTime = new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  notify();
}

function closePeerOnly() {
  if (channel) {
    // Handler zuerst abhängen: Sonst meldet das Schließen von Hand den
    // Verlust der Verbindung -- und der Nutzer bekäme eine Abbruch-Warnung
    // für etwas, das er selbst ausgelöst hat.
    channel.onopen = null;
    channel.onmessage = null;
    channel.onclose = null;
    try {
      channel.close();
    } catch {
      /* ignore */
    }
    channel = null;
  }
  if (pc) {
    pc.onconnectionstatechange = null;
    try {
      pc.close();
    } catch {
      /* ignore */
    }
    pc = null;
  }
  lastSent = null;
  incoming = null;
}

/**
 * Die Verbindung ist von selbst weggebrochen (WLAN weg, anderes Gerät zu,
 * Bildschirmsperre). Bewusstes Trennen läuft hier nicht durch, weil
 * closePeerOnly() die Handler vorher abhängt.
 */
function verbindungVerloren() {
  state.connected = false;
  state.pairing = false;
  state.failed = true;
  stopPoll();
  notify();
}

/** Neue Kopplung: alte Verbindung verwerfen und diese übernehmen. */
export function adoptPeer(newPc: RTCPeerConnection) {
  closePeerOnly();
  stopPoll();
  state.connected = false;
  state.pairing = true;
  state.failed = false;
  pc = newPc;
  pc.onconnectionstatechange = () => {
    if (!pc) return;
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      verbindungVerloren();
    }
  };
  notify();
}

export function adoptChannel(ch: RTCDataChannel) {
  channel = ch;
  ch.onopen = () => {
    state.connected = true;
    state.pairing = false;
    state.failed = false;
    notify();
    sendNow();
    stopPoll();
    pollTimer = setInterval(sendNow, LIVE_SEND_INTERVAL_MS);
  };
  ch.onmessage = (ev) => {
    if (typeof ev.data === "string") handleMessage(ev.data);
  };
  // Schließt die Gegenseite den Kanal (App dort geschlossen, Gerät gesperrt),
  // war das aus Sicht dieses Geräts ein Abbruch -- vorher verschwand dabei
  // nur stillschweigend das grüne Abzeichen im Kopfbereich.
  ch.onclose = () => {
    verbindungVerloren();
  };
}

export function getPeer(): RTCPeerConnection | null {
  return pc;
}

/** Ausdrückliches Trennen (Button "Verbindung trennen"). */
export function disconnectLiveSync() {
  closePeerOnly();
  stopPoll();
  state.connected = false;
  state.pairing = false;
  state.lastSyncTime = null;
  state.failed = false;
  notify();
}

/**
 * Beim Schließen des Sync-Fensters aufrufen: bricht nur eine noch nicht
 * fertige Kopplung ab. Eine bestehende Live-Verbindung bleibt bewusst
 * erhalten, damit im Hintergrund weiter abgeglichen wird.
 */
export function abortPairingOnly() {
  if (!state.connected) {
    disconnectLiveSync();
  }
}
