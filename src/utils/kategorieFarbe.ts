import type { CSSProperties } from "react";

/**
 * Eigene Farben fuer Kategorien (ab 0.9.74) -- optional, fuer sehende Kolleginnen
 * und Kollegen.
 *
 * DIE FARBE IST NUR ZUSATZ. Name und Zahl einer Kategorie tragen weiter allein die
 * Information (WCAG 1.4.1); die Farbe taucht in keinem Namen auf, den Hilfstechniken
 * vorlesen. In den beiden Hochkontrast-Schemata wird sie NICHT angezeigt -- diese
 * Schemata gibt es fuer Menschen, die ihre Farben nicht selbst waehlen koennen, und
 * eine fremde Farbe darin waere genau der Fall, den sie verhindern sollen.
 *
 * FREI WAEHLBAR UND TROTZDEM LESBAR: Gespeichert wird, was die Person gewaehlt hat
 * (`#rrggbb`). Angezeigt wird eine daraus errechnete Fassung, die je Schema
 * (hell, dunkel) vier Zusagen einhaelt -- `npm run check` prueft sie fuer die
 * Palette, zwei Extremfaelle und 2000 Zufallsfarben:
 *   - Akzent (Rand, Symbol, Plus-Kreis) hat gegen Karte UND Grund mindestens 3:1
 *     (WCAG 1.4.11, Nicht-Text-Kontrast);
 *   - die getoente Flaeche laesst die normale Schriftfarbe auf mindestens 4,5:1
 *     (1.4.3);
 *   - das Plus im Kreis hat gegen den Akzent mindestens 3:1;
 *   - die Zahlenfarbe bleibt die des Schemas (nie die gewaehlte).
 *
 * Die Grundwerte unten muessen zu `index.css` passen -- `npm run check` vergleicht.
 */

export const FARB_PALETTE = [
  { name: "Rot", hex: "#d64545" },
  { name: "Orange", hex: "#e07b00" },
  { name: "Gelb", hex: "#d4a800" },
  { name: "Grün", hex: "#2e9e5b" },
  { name: "Türkis", hex: "#129aa6" },
  { name: "Blau", hex: "#3b6fd4" },
  { name: "Violett", hex: "#8a4fd1" },
  { name: "Rosa", hex: "#d6458f" },
] as const;

export type FarbModus = "hell" | "dunkel";

/** Die Werte der beiden Schemata aus index.css (--card-bg, --bg-color, --text-color). */
export const SCHEMA_WERTE: Record<FarbModus, { karte: string; grund: string; text: string }> = {
  hell: { karte: "#ffffff", grund: "#f4f1ea", text: "#1d1c1a" },
  dunkel: { karte: "#171e1b", grund: "#0e1311", text: "#edf2ef" },
};

/** Nur sechsstelliges Hex. Alles andere -- auch "red", "url(...)" -- wird nie als Stil gesetzt. */
export const istFarbe = (x: unknown): x is string => typeof x === "string" && /^#[0-9a-fA-F]{6}$/.test(x);

type Rgb = [number, number, number];

const zuRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const zuHex = ([r, g, b]: Rgb): string =>
  "#" + [r, g, b].map((k) => Math.max(0, Math.min(255, Math.round(k))).toString(16).padStart(2, "0")).join("");

/** Relative Leuchtdichte nach WCAG 2. */
const leuchtdichte = (hex: string): number => {
  const [r, g, b] = zuRgb(hex).map((k) => {
    const c = k / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const kontrast = (a: string, b: string): number => {
  const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
  return (hell + 0.05) / (dunkel + 0.05);
};

const mische = (a: string, b: string, anteilA: number): string => {
  const [ra, rb] = [zuRgb(a), zuRgb(b)];
  return zuHex([0, 1, 2].map((i) => ra[i] * anteilA + rb[i] * (1 - anteilA)) as Rgb);
};

const zuHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = zuRgb(hex).map((k) => k / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};

const vonHsl = (h: number, s: number, l: number): string => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return zuHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
};

export interface FarbWerte {
  akzent: string;
  flaeche: string;
  plusText: string;
}

/** Die angezeigte Fassung einer gewaehlten Farbe fuer ein Schema. */
export const farbWerte = (gewaehlt: string, modus: FarbModus): FarbWerte => {
  const { karte, grund, text } = SCHEMA_WERTE[modus];
  const [h, s, l0] = zuHsl(gewaehlt);

  // Akzent: Helligkeit in kleinen Schritten dorthin schieben, wo 3:1 erreicht wird
  // (im hellen Schema dunkler, im dunklen heller). Ton und Saettigung bleiben.
  const richtung = modus === "hell" ? -1 : 1;
  let l = l0;
  let akzent = vonHsl(h, s, l);
  for (let i = 0; i < 60 && Math.min(kontrast(akzent, karte), kontrast(akzent, grund)) < 3; i++) {
    l = Math.max(0, Math.min(1, l + richtung * 0.02));
    akzent = vonHsl(h, s, l);
  }

  // Flaeche: nur ein Hauch des Akzents. Die Schriftfarbe des Schemas muss darauf lesbar
  // bleiben; wird es knapp, wird der Anteil kleiner.
  let anteil = modus === "hell" ? 0.14 : 0.2;
  let flaeche = mische(akzent, karte, anteil);
  while (kontrast(text, flaeche) < 4.5 && anteil > 0) {
    anteil = Math.max(0, anteil - 0.02);
    flaeche = mische(akzent, karte, anteil);
  }

  const plusText = kontrast("#ffffff", akzent) >= kontrast("#000000", akzent) ? "#ffffff" : "#000000";
  return { akzent, flaeche, plusText };
};

/**
 * Die CSS-Variablen fuer eine Kategorie -- beide Schemata, die Auswahl trifft `index.css`
 * (und blendet sie in den Hochkontrast-Schemata ganz aus). `undefined` ohne gueltige Farbe.
 */
export const kategorieFarbStil = (gewaehlt: unknown): CSSProperties | undefined => {
  if (!istFarbe(gewaehlt)) return undefined;
  const h = farbWerte(gewaehlt, "hell");
  const d = farbWerte(gewaehlt, "dunkel");
  return {
    "--kf-akzent-hell": h.akzent,
    "--kf-flaeche-hell": h.flaeche,
    "--kf-plus-hell": h.plusText,
    "--kf-akzent-dunkel": d.akzent,
    "--kf-flaeche-dunkel": d.flaeche,
    "--kf-plus-dunkel": d.plusText,
  } as CSSProperties;
};

/** Name der naechsten Palettenfarbe -- fuer die Ansage ("Farbe: Blau"). */
export const farbName = (hex: string | undefined): string => {
  if (!istFarbe(hex)) return "Standard";
  const treffer = FARB_PALETTE.find((f) => f.hex.toLowerCase() === hex.toLowerCase());
  return treffer ? treffer.name : `eigene Farbe ${hex.toUpperCase()}`;
};
