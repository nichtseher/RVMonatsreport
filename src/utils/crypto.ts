import { base64ToBytes } from "./base64";

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: string, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(data)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return new Promise((resolve, reject) => {
    const blob = new Blob([combined]);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result.split(",")[1]);
      } else {
        reject(new Error("Failed to read blob as data URL"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function decryptData(encryptedBase64: string, password: string): Promise<string> {
  /*
    HIER STAND BIS 0.9.48 EIN `fetch("data:application/octet-stream;base64," + …)`.

    Das sah symmetrisch zum FileReader-Weg in `encryptData` aus und war von
    0.9.34 bis 0.9.47 der Grund, warum sich eine verschlüsselte Sicherung in
    der PRODUKTION nicht mehr zurückspielen liess: Ein `fetch` auf eine
    `data:`-URL wird gegen `connect-src` geprüft, die ausgelieferte Richtlinie
    lautet `connect-src 'self'` (siehe `vite.config.ts`), und eine `data:`-URL
    hat eine opake Herkunft. Der Browser wies die Anfrage ab, der Nutzer bekam
    unten „Falsches Passwort oder beschädigte Datei." — für ein richtiges
    Passwort.

    Gemessen am 2026-09-19 im Browser gegen ein gebautes `dist/`. Dieselbe
    Messung zeigt, dass `atob` unter derselben Richtlinie funktioniert.
    Einzelheiten und der Wächter dagegen: `src/utils/base64.ts` und
    `scripts/checks/inhaltsrichtlinie.ts`.
  */
  let combined: Uint8Array;
  try {
    combined = base64ToBytes(encryptedBase64);
  } catch {
    // `atob` wirft bei ungültigem Base64. Für den Nutzer ist das derselbe
    // Fall wie ein beschädigter Chiffretext -- also dieselbe Meldung.
    throw new Error("Falsches Passwort oder beschädigte Datei.");
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);

  const key = await deriveKey(password, salt);
  const dec = new TextDecoder();

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );
    return dec.decode(decrypted);
  } catch (e) {
    throw new Error("Falsches Passwort oder beschädigte Datei.");
  }
}
