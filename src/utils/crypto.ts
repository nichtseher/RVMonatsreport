import { base64ToBytes } from "./base64";

/**
 * Verschlüsselung für Sicherungsdateien und Textcodes.
 *
 * ZWEI FORMATE, MIT ABSICHT:
 *
 * - `RVB2:` -- Sicherungsdateien seit 0.9.72. Trägt Version und Rundenzahl im
 *   Kopf und leitet den Schlüssel mit 600.000 PBKDF2-Runden ab. Eine Datei
 *   liegt dauerhaft in einem Postfach oder Messenger; wer sie dort findet,
 *   kann offline beliebig lange raten. Deshalb hier die teure Ableitung.
 * - Altformat (ohne Kennung) -- Sicherungsdateien bis 0.9.71 und die
 *   Textcodes `RVC2:`. Bleibt für Sicherungen lesbar, ohne Ablaufdatum.
 *   Die Textcodes bleiben bewusst dabei: Sie leben Minuten, und eine neue
 *   Fassung hätte gegenüber einer noch nicht aktualisierten (die Zwangsfrist
 *   liegt bei 14 Tagen) "Falsches Passwort" gemeldet -- für ein RICHTIGES
 *   Passwort, genau die Fehlerklasse von 0.9.48.
 */

/** Altformat, Textcodes. */
export const ITERATIONEN_ALT = 100000;
/** Sicherungsdateien ab 0.9.72 (OWASP-Empfehlung für PBKDF2-HMAC-SHA256). */
export const ITERATIONEN_SICHERUNG = 600000;
/**
 * Obergrenze für eine Rundenzahl aus dem Dateikopf. Der Kopf ist Eingabe von
 * außen: Ohne Grenze fröre eine präparierte Datei den Tab ein.
 */
const ITERATIONEN_MAX = 2000000;

const KENNUNG_SICHERUNG = "RVB2:";
const VERSION_SICHERUNG = 2;
/** Version (1) + Runden (4) + Salt (16) + IV (12) */
const KOPF_SICHERUNG = 33;
const GCM_TAG = 16;

export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = ITERATIONEN_ALT,
): Promise<CryptoKey> {
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
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function alsBase64(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes as BlobPart]);
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

/**
 * Altformat: base64(salt | iv | chiffre), 100.000 Runden. Für die Textcodes
 * `RVC2:` -- siehe oben, warum sie dabei bleiben.
 */
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

  return alsBase64(combined);
}

/**
 * Sicherungsdatei (0.9.72): `RVB2:` + base64(Version | Runden | salt | iv | chiffre).
 *
 * Jede Verschlüsselung zieht ein neues Salt UND einen neuen IV; der Schlüssel
 * hängt am Salt, also wiederholt sich nie ein (Schlüssel, IV)-Paar. Version und
 * Runden stehen ausserhalb des GCM-Tags -- ändert jemand die Rundenzahl, ergibt
 * sich ein anderer Schlüssel und die Entschlüsselung scheitert. Den Schlüssel
 * schwächen kann er damit nicht, nur die Datei unlesbar machen.
 */
export async function encryptBackup(data: string, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONEN_SICHERUNG);

  const chiffre = new Uint8Array(
    await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(data)),
  );

  const kopf = new Uint8Array(KOPF_SICHERUNG);
  kopf[0] = VERSION_SICHERUNG;
  new DataView(kopf.buffer).setUint32(1, ITERATIONEN_SICHERUNG, false);
  kopf.set(salt, 5);
  kopf.set(iv, 21);

  const alles = new Uint8Array(kopf.length + chiffre.length);
  alles.set(kopf, 0);
  alles.set(chiffre, kopf.length);
  return KENNUNG_SICHERUNG + (await alsBase64(alles));
}

const FALSCHES_PASSWORT = "Falsches Passwort oder beschädigte Datei.";

async function entschluessele(
  passwort: string,
  salt: Uint8Array,
  iv: Uint8Array,
  chiffre: Uint8Array,
  runden: number,
): Promise<string> {
  const key = await deriveKey(passwort, salt, runden);
  try {
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, chiffre);
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error(FALSCHES_PASSWORT);
  }
}

/** Erkennt beide Formate: `RVB2:` und das Altformat ohne Kennung. */
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
  const text = encryptedBase64.trim();

  if (text.startsWith(KENNUNG_SICHERUNG)) {
    let alles: Uint8Array;
    try {
      alles = base64ToBytes(text.slice(KENNUNG_SICHERUNG.length).replace(/\s+/g, ""));
    } catch {
      throw new Error(FALSCHES_PASSWORT);
    }
    if (alles.length < KOPF_SICHERUNG + GCM_TAG) throw new Error(FALSCHES_PASSWORT);
    // Eine neuere Fassung der App darf hier nicht als "falsches Passwort"
    // erscheinen -- das Passwort stimmt dann ja.
    if (alles[0] !== VERSION_SICHERUNG) {
      throw new Error(
        "Diese Sicherung stammt aus einer neueren Fassung der App. Bitte aktualisieren Sie die App und versuchen Sie es erneut.",
      );
    }
    const runden = new DataView(alles.buffer, alles.byteOffset, alles.byteLength).getUint32(1, false);
    if (runden < ITERATIONEN_ALT || runden > ITERATIONEN_MAX) throw new Error(FALSCHES_PASSWORT);
    return entschluessele(
      password,
      alles.slice(5, 21),
      alles.slice(21, 33),
      alles.slice(KOPF_SICHERUNG),
      runden,
    );
  }

  let combined: Uint8Array;
  try {
    combined = base64ToBytes(text);
  } catch {
    // `atob` wirft bei ungültigem Base64. Für den Nutzer ist das derselbe
    // Fall wie ein beschädigter Chiffretext -- also dieselbe Meldung.
    throw new Error(FALSCHES_PASSWORT);
  }

  return entschluessele(
    password,
    combined.slice(0, 16),
    combined.slice(16, 28),
    combined.slice(28),
    ITERATIONEN_ALT,
  );
}
