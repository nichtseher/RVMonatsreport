/*
  Base64 ⇄ Bytes, an genau einer Stelle.

  WARUM ES DIESE DATEI GIBT — und warum hier `atob`/`btoa` steht und nicht
  `fetch("data:…")`:

  Ein `fetch` auf eine `data:`-URL wird von der CSP-Direktive `connect-src`
  geprüft. Die ausgelieferte Richtlinie lautet `connect-src 'self'` (siehe
  `vite.config.ts`), und eine `data:`-URL hat eine opake Herkunft — sie passt
  nicht auf `'self'`. Gemessen am 2026-09-19 im Browser gegen ein gebautes
  `dist/`:

      fetch("data:application/octet-stream;base64,AAECAwQF")
      → TypeError: Failed to fetch
      → "Refused to connect because it violates the document's CSP"
      atob("AAECAwQF")  → funktioniert

  Daran ist das Zurückspielen verschlüsselter Sicherungen und verschlüsselter
  Textcodes (`RVC2:`) von 0.9.34 bis 0.9.47 in der PRODUKTION gescheitert —
  und nur dort. Die Richtlinie wird erst beim Bauen eingehängt
  (`apply: "build"` in `vite.config.ts`), also sehen weder der Dev-Server noch
  `npm run check:ui` sie je. `npm run check` lief grün, weil Node einen
  globalen `fetch` ohne CSP mitbringt: Der Umlauf in
  `scripts/checks/backup.ts` bewies die Kryptografie und konnte über die
  Auslieferung nichts sagen.

  `scripts/checks/inhaltsrichtlinie.ts` hält den Weg zurück offen.

  Warum eine eigene Datei und keine Hilfsfunktion in `crypto.ts`: `syncCode.ts`
  importiert bereits aus `crypto.ts`; die umgekehrte Richtung wäre ein
  Ringschluss. Beide brauchen dieselbe Umwandlung, und zwei Kopien davon hat
  dieses Projekt schon einmal bezahlt (`formatMonthGerman`).
*/

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  // In Blöcken: `String.fromCharCode(...)` mit sehr vielen Argumenten
  // sprengt den Aufrufstapel.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
