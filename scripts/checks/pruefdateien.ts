import { readFileSync, readdirSync } from "node:fs";
import { gruppe, pruefe, gleich } from "../helfer";

/*
  Jede Datei in scripts/checks/ muss von scripts/pruefen.ts eingebunden sein.

  Eine Prüfdatei, die dort fehlt, läuft nie -- und nichts meldet es: Das Gate
  bleibt grün, die Prüfung existiert nur auf der Festplatte. pruefen.ts führt
  seine Importe von Hand; genau diese Bauart ist in diesem Projekt mehrfach
  stillschweigend veraltet (siehe CLAUDE.md, „A hand-maintained list of states
  is not a safety net"). Diese Prüfung zählt nach.
*/

const WURZEL = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

gruppe("Prüfdateien");

pruefe("jede Datei in scripts/checks/ wird von pruefen.ts eingebunden", () => {
  const dateien = readdirSync(`${WURZEL}scripts/checks`)
    .filter((n) => n.endsWith(".ts"))
    .map((n) => n.replace(/\.ts$/, ""))
    .sort();
  const quelle = readFileSync(`${WURZEL}scripts/pruefen.ts`, "utf8");
  const eingebunden = Array.from(quelle.matchAll(/^import\s+"\.\/checks\/([^"]+)";/gm))
    .map((m) => m[1])
    .sort();
  gleich(
    dateien.filter((d) => !eingebunden.includes(d)),
    [],
  );
  gleich(
    eingebunden.filter((d) => !dateien.includes(d)),
    [],
  );
});
