/**
 * Kodierung der Übertragungscodes für den Geräte-Sync.
 *
 * Lag bis 0.9.5 in DeviceSyncModal.tsx (gut 1000 Zeilen) und war dadurch
 * nicht prüfbar. Reine Funktionen, keine Oberfläche — siehe
 * scripts/checks/synccode.ts.
 *
 * Zwei Formate teilen sich denselben Inhalt:
 *   QR-Teilstück   RV1|<id>|<nr>|<gesamt>|<z|u>|<daten>
 *   Textcode       RVC1:<z|u>:<base64>        (unverschlüsselt)
 *                  RVC2:<base64>              (mit Passwort, AES-GCM)
 *
 * RVC1 ist ausdrücklich NICHT verschlüsselt — nur komprimiert und
 * base64-kodiert. Wer den Code besitzt, liest die Daten. Deshalb gibt es
 * seit 0.9.5 RVC2 als Angebot für Wege, die man nicht kontrolliert.
 */
import { encryptData, decryptData } from "./crypto";

export const PROTOCOL = "RV1";
export const CHUNK_SIZE = 450; // Zeichen pro QR-Code (zuverlässig scannbar)

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

export async function compressString(
  input: string,
): Promise<{ data: string; compressed: boolean }> {
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

export async function decompressString(base64: string, compressed: boolean): Promise<string> {
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
export function secureTransferId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint8Array(4);
  crypto.getRandomValues(random);
  return Array.from(random, (b) => alphabet[b % alphabet.length]).join("");
}

export interface ParsedChunk {
  id: string;
  seq: number;
  total: number;
  compressed: boolean;
  data: string;
}

export function parseChunk(text: string): ParsedChunk | null {
  if (!text.startsWith(PROTOCOL + "|")) return null;
  const parts = text.split("|");
  if (parts.length < 6) return null;
  const seq = parseInt(parts[2], 10);
  const total = parseInt(parts[3], 10);
  if (!Number.isFinite(seq) || !Number.isFinite(total) || seq < 1 || total < 1 || seq > total) {
    return null;
  }
  return {
    id: parts[1],
    seq,
    total,
    compressed: parts[4] === "z",
    data: parts.slice(5).join("|"),
  };
}

export async function buildChunks(payload: string): Promise<string[]> {
  const { data, compressed } = await compressString(payload);
  const id = secureTransferId();
  const total = Math.max(1, Math.ceil(data.length / CHUNK_SIZE));
  const flag = compressed ? "z" : "u";
  const parts: string[] = [];
  for (let i = 0; i < total; i++) {
    parts.push(
      `${PROTOCOL}|${id}|${i + 1}|${total}|${flag}|${data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)}`,
    );
  }
  return parts;
}

/**
 * Textcode erzeugen. Mit Passwort entsteht ein RVC2-Code (AES-GCM), ohne
 * Passwort der bisherige, unverschlüsselte RVC1-Code.
 */
export async function buildTextCode(payload: string, passwort?: string): Promise<string> {
  if (passwort && passwort.length > 0) {
    return `RVC2:${await encryptData(payload, passwort)}`;
  }
  const { data, compressed } = await compressString(payload);
  return `RVC1:${compressed ? "z" : "u"}:${data}`;
}

/** Braucht dieser Code ein Passwort? */
export function istVerschluesselterCode(text: string): boolean {
  return text.trim().startsWith("RVC2:");
}

/* Beide Zweige führen beide Felder auf -- siehe Begründung in syncSchema.ts
   (ohne `strictNullChecks` grenzt TypeScript die Union sonst nicht ein). */
export type TextCodeErgebnis =
  | { ok: true; inhalt: string; grund?: undefined }
  | {
      ok: false;
      grund: "kein-code" | "passwort-noetig" | "passwort-falsch" | "unlesbar";
      inhalt?: undefined;
    };

/**
 * Textcode auflösen. Gibt statt zu werfen einen Grund zurück, damit die
 * Oberfläche unterscheiden kann zwischen "kein RV-Mobil-Code",
 * "Passwort fehlt" und "Passwort falsch".
 */
export async function parseTextCode(text: string, passwort?: string): Promise<TextCodeErgebnis> {
  const trimmed = text.trim();

  if (trimmed.startsWith("RVC2:")) {
    if (!passwort) return { ok: false, grund: "passwort-noetig" };
    try {
      return { ok: true, inhalt: await decryptData(trimmed.slice(5).replace(/\s+/g, ""), passwort) };
    } catch {
      return { ok: false, grund: "passwort-falsch" };
    }
  }

  if (!trimmed.startsWith("RVC1:")) return { ok: false, grund: "kein-code" };

  const ersterDoppelpunkt = trimmed.indexOf(":");
  const zweiterDoppelpunkt = trimmed.indexOf(":", ersterDoppelpunkt + 1);
  if (zweiterDoppelpunkt === -1) return { ok: false, grund: "kein-code" };

  const flag = trimmed.slice(ersterDoppelpunkt + 1, zweiterDoppelpunkt);
  const data = trimmed.slice(zweiterDoppelpunkt + 1).replace(/\s+/g, "");
  try {
    return { ok: true, inhalt: await decompressString(data, flag === "z") };
  } catch {
    return { ok: false, grund: "unlesbar" };
  }
}
