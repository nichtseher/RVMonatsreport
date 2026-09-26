import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gruppe, pruefe, gleich, wahr } from "../helfer";

/*
  Gestaltungs-Wächter (0.9.65).

  Entstanden aus zwei Funden am selben Tag, beide vom selben Muster: Ein
  Token-System stand vollständig und gemessen in `index.css`, wurde aber in
  den Komponenten an keiner einzigen Stelle benutzt.

  1. `--rv-radius-*` / `--rv-shadow-*`: null Treffer in allen 19 Komponenten.
     Stattdessen fünf konkurrierende Tailwind-Radien und sechs Schattenstufen
     ohne jede Regel, welche Form was bedeutet -- und die Hochkontrast-Themes
     (`--rv-shadow-*: none`) wurden von jeder rohen `shadow-*`-Klasse
     umgangen, weil Tailwinds eigene Schattenskala davon unberuehrt bleibt.
  2. `animate-fade-in` (22 Stellen) und `animate-slide-up` (5 Stellen) ohne
     jedes zugehoerige CSS -- Tailwind 4 kennt von Haus aus nur
     spin/ping/pulse/bounce. Die Modale sollten einblenden und erschienen
     stattdessen.

  Beides waere durch eine Suche wie diese sofort aufgefallen. Wie bei
  `typografie.ts`: gesucht wird ausschliesslich innerhalb von Klassenlisten,
  nicht im Kommentar, der die Ausnahme begruendet -- sonst meldet die Pruefung
  ihre eigene Begruendung als Verstoss.
*/

const PROJEKT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ENDUNGEN = [".tsx"];

function dateien(verzeichnis: string, treffer: string[] = []): string[] {
  for (const name of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, name);
    if (statSync(pfad).isDirectory()) dateien(pfad, treffer);
    else if (ENDUNGEN.some((e) => name.endsWith(e))) treffer.push(pfad);
  }
  return treffer;
}

function klassenlisten(text: string): string[] {
  const raus: string[] = [];
  for (const m of text.matchAll(/className=("|')([^"']*)\1/g)) raus.push(m[2]);
  for (const m of text.matchAll(/className=\{`([^`]*)`\}/g)) raus.push(m[1]);
  return raus;
}

const quellen = dateien(join(PROJEKT, "src")).map((pfad) => ({
  name: pfad.slice(PROJEKT.length).replace(/\\/g, "/"),
  text: readFileSync(pfad, "utf8"),
}));

const klassenJeDatei = quellen.map((q) => ({ name: q.name, klassen: klassenlisten(q.text) }));

gruppe("Gestaltung");

pruefe("der Suchlauf erreicht die Oberfläche überhaupt", () => {
  wahr(quellen.length > 15, `nur ${quellen.length} .tsx-Dateien gefunden — falscher Pfad?`);
  const mitKlassen = klassenJeDatei.filter((q) => q.klassen.length > 0).length;
  wahr(mitKlassen > 10, `nur ${mitKlassen} Dateien mit Klassenlisten — Suchmuster falsch?`);
  const alleKlassen = klassenJeDatei.flatMap((q) => q.klassen).join(" ");
  wahr(alleKlassen.includes("rounded-[var(--rv-radius-"), "keine einzige rv-radius-Klasse gefunden — Muster falsch?");
});

function verstoesse(muster: RegExp): string[] {
  const treffer: string[] = [];
  for (const q of klassenJeDatei) {
    for (const liste of q.klassen) {
      for (const _ of liste.matchAll(muster)) treffer.push(q.name);
    }
  }
  return [...new Set(treffer)];
}

pruefe("Radien laufen ausschließlich über --rv-radius-*, nicht über Tailwinds Skala", () => {
  gleich(
    verstoesse(/\brounded-(lg|xl|2xl|3xl)\b/g),
    [],
    "diese Dateien verwenden wieder Tailwinds rounded-lg/xl/2xl/3xl statt rounded-[var(--rv-radius-*)] " +
      "(rounded-full ist keine Skalenstufe und bleibt erlaubt)",
  );
});

pruefe("Schatten laufen ausschließlich über --rv-shadow-*, nicht über Tailwinds Skala", () => {
  /*
    (?<!--rv-): Ohne den Lookbehind trifft dasselbe Muster auch innerhalb der
    eigenen CSS-Variable "--rv-shadow-md" auf den Teilstring "shadow-md" --
    genau der Fehler, vor dem sich das Umbenennungs-Skript schon gehuetet
    hatte (CLAUDE.md-Sitzung 2026-09-20). Der erste Lauf dieser Pruefung
    schlug damit an allen 19 Dateien fehl, die die Skala bereits richtig
    benutzten. "inner" steht bewusst nicht in der Liste -- die Ausnahme dafuer
    ist die naechste Pruefung.
  */
  gleich(
    verstoesse(/(?<!--rv-)\bshadow-(xs|sm|md|lg|xl|2xl)\b/g),
    [],
    "diese Dateien verwenden wieder Tailwinds shadow-xs/sm/md/lg/xl/2xl statt shadow-[var(--rv-shadow-*)]",
  );
});

/*
  Bis 0.9.67 gab es hier eine Ausnahme: das Fragezeichen-Symbol im Kopf der
  Hilfe mit Innenschatten. Mit dem gemeinsamen AnsichtsKopf (0.9.68) ist
  der Fall entfallen -- und eine Ausnahme ohne Fall ist eine offene Tür.
  Wer wieder eine braucht, begründet sie an der Stelle selbst und trägt
  die Datei hier ein.
*/
pruefe("kein shadow-inner", () => {
  gleich(
    verstoesse(/\bshadow-inner\b/g),
    [],
    "shadow-inner ist aufgetaucht -- Schatten laufen über --rv-shadow-*",
  );
});

/*
  Jede genutzte animate-*-Klasse braucht eine --animate-*-Definition im
  @theme-Block. Tailwinds eigene (spin/ping/pulse/bounce) sind ausgenommen --
  die liefert das Framework selbst, ohne eigenen Eintrag.
*/
pruefe("jede animate-*-Klasse hat eine zugehörige @theme-Definition", () => {
  const eingebaut = new Set(["spin", "ping", "pulse", "bounce", "none"]);
  const genutzt = new Set<string>();
  for (const q of klassenJeDatei) {
    for (const liste of q.klassen) {
      for (const m of liste.matchAll(/\banimate-([a-z][a-z0-9-]*)\b/g)) {
        if (!eingebaut.has(m[1])) genutzt.add(m[1]);
      }
    }
  }
  wahr(genutzt.size > 0, "keine einzige eigene animate-*-Klasse gefunden — Suchmuster falsch?");

  const css = readFileSync(join(PROJEKT, "src/index.css"), "utf8");
  const fehlend = [...genutzt].filter((name) => !css.includes(`--animate-${name}:`));
  gleich(fehlend, [], "diese animate-*-Klassen werden benutzt, ohne dass index.css ein passendes --animate-* definiert");
});
