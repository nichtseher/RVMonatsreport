import { readFileSync } from "node:fs";
import { gruppe, pruefe, gleich, wahr } from "../helfer";
import {
  FARB_PALETTE,
  SCHEMA_WERTE,
  farbName,
  farbWerte,
  istFarbe,
  kategorieFarbStil,
  kontrast,
  type FarbModus,
} from "../../src/utils/kategorieFarbe";

/*
  Eigene Kategoriefarben (0.9.74). Die Person waehlt FREI -- die App muss trotzdem lesbar
  bleiben. Darum wird nicht die gewaehlte, sondern eine errechnete Fassung angezeigt, und
  diese Pruefung belegt die Zusagen fuer die Palette, Extremfaelle und 2000 Zufallsfarben.
*/

const MODI: FarbModus[] = ["hell", "dunkel"];

// Deterministisch: dieselben Farben bei jedem Lauf, sonst ist ein Fehler nicht wiederholbar.
const zufallsFarben = (n: number): string[] => {
  let z = 20261008;
  const naechste = () => (z = (z * 1664525 + 1013904223) >>> 0);
  return Array.from({ length: n }, () => "#" + [0, 1, 2].map(() => (naechste() >>> 24).toString(16).padStart(2, "0")).join(""));
};
const EXTREME = ["#000000", "#ffffff", "#ffff00", "#808080", "#00ff00", "#0000ff", "#ff0000", "#fffff0", "#010101", "#f4f1ea"];
const ALLE = [...FARB_PALETTE.map((f) => f.hex), ...EXTREME, ...zufallsFarben(2000)];

gruppe("Eigene Kategoriefarben");

pruefe("nur sechsstelliges Hex wird als Farbe angenommen (nichts, was als CSS etwas anderes tun könnte)", () => {
  for (const ok of ["#000000", "#FFFFFF", "#1a2B3c"]) wahr(istFarbe(ok), ok);
  for (const schlecht of ["red", "#fff", "#12345", "#1234567", "#12345g", "url(x)", "#fff;x", "", null, undefined, 5, {}]) {
    wahr(!istFarbe(schlecht), `"${String(schlecht)}" wurde angenommen`);
  }
  gleich(kategorieFarbStil("red"), undefined);
  gleich(kategorieFarbStil(undefined), undefined);
});

pruefe("Akzent: gegen Karte UND Grund mindestens 3:1 – in beiden Schemata, für jede Farbe", () => {
  for (const modus of MODI) {
    const { karte, grund } = SCHEMA_WERTE[modus];
    for (const f of ALLE) {
      const { akzent } = farbWerte(f, modus);
      const k = Math.min(kontrast(akzent, karte), kontrast(akzent, grund));
      wahr(k >= 3, `${modus} ${f} -> ${akzent}: ${k.toFixed(2)}:1 < 3:1`);
    }
  }
});

pruefe("getönte Fläche: die Schriftfarbe des Schemas bleibt darauf mindestens 4,5:1", () => {
  for (const modus of MODI) {
    const { text } = SCHEMA_WERTE[modus];
    for (const f of ALLE) {
      const { flaeche } = farbWerte(f, modus);
      const k = kontrast(text, flaeche);
      wahr(k >= 4.5, `${modus} ${f} -> Fläche ${flaeche}: ${k.toFixed(2)}:1 < 4,5:1`);
    }
  }
});

pruefe("Plus im Kreis: gegen den Akzent mindestens 3:1", () => {
  for (const modus of MODI) {
    for (const f of ALLE) {
      const { akzent, plusText } = farbWerte(f, modus);
      const k = kontrast(plusText, akzent);
      wahr(k >= 3, `${modus} ${f}: Plus ${plusText} auf ${akzent} ${k.toFixed(2)}:1 < 3:1`);
    }
  }
});

pruefe("die Farbe bleibt erkennbar: Der Farbton ändert sich nicht (außer bei Grau)", () => {
  // Wer Blau wählt, soll Blau sehen -- die Anpassung verschiebt nur die Helligkeit.
  const blau = farbWerte("#3b6fd4", "hell").akzent;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(blau.slice(i, i + 2), 16));
  wahr(b > r && b > g, `Blau wurde ${blau}`);
  const gelb = farbWerte("#d4a800", "hell").akzent;
  const [gr, gg, gb] = [1, 3, 5].map((i) => parseInt(gelb.slice(i, i + 2), 16));
  wahr(gr > gb && gg > gb, `Gelb wurde ${gelb}`);
});

pruefe("die Grundwerte der Schemata stimmen mit index.css überein", () => {
  const css = readFileSync(new URL("../../src/index.css", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "utf8");
  const block = (kopf: RegExp): string => {
    const m = kopf.exec(css);
    if (!m) throw new Error(`Block ${kopf} nicht gefunden`);
    const start = m.index;
    return css.slice(start, css.indexOf("\n}", start));
  };
  const wert = (b: string, name: string): string => {
    const m = new RegExp(`${name}: *(#[0-9a-fA-F]{6})`).exec(b);
    if (!m) throw new Error(`${name} fehlt`);
    return m[1].toLowerCase();
  };
  const hell = block(/^:root \{\s*\n\s*\/\* Default Light/m);
  const dunkel = block(/^\[data-theme="dark"\] \{/m);
  gleich({ karte: wert(hell, "--card-bg"), grund: wert(hell, "--bg-color"), text: wert(hell, "--text-color") }, SCHEMA_WERTE.hell);
  gleich({ karte: wert(dunkel, "--card-bg"), grund: wert(dunkel, "--bg-color"), text: wert(dunkel, "--text-color") }, SCHEMA_WERTE.dunkel);
});

pruefe("die Stilvariablen enthalten beide Schemata, und nur diese", () => {
  const stil = kategorieFarbStil("#3b6fd4") as Record<string, string>;
  gleich(Object.keys(stil).sort(), [
    "--kf-akzent-dunkel", "--kf-akzent-hell", "--kf-flaeche-dunkel", "--kf-flaeche-hell", "--kf-plus-dunkel", "--kf-plus-hell",
  ]);
  for (const v of Object.values(stil)) wahr(/^#[0-9a-f]{6}$/.test(v), `unerwarteter Wert ${v}`);
});

pruefe("Farbnamen für die Ansage: Palette beim Namen, eigene mit Hex, ohne Wahl „Standard“", () => {
  gleich(farbName("#3b6fd4"), "Blau");
  gleich(farbName("#3B6FD4"), "Blau");
  gleich(farbName("#123456"), "eigene Farbe #123456");
  gleich(farbName(undefined), "Standard");
  gleich(farbName("quatsch"), "Standard");
});
