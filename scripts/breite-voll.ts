/**
 * Die volle Breitenmatrix -- `npm run check:breite`.
 *
 * `tests/vorlagen-breite.spec.ts` fährt im Gate (`check:ui`) nur eine schlanke Auswahl.
 * Hier laufen alle Breiten und Schriftgrößen in Chromium und WebKit (~45 min). Eigenes
 * Skript, weil sich `BREITE_VOLL=1 playwright …` in npm-Skripten unter Windows nicht
 * ohne Zusatzpaket setzen lässt.
 */
import { spawnSync } from "node:child_process";

const lauf = (projekt: string) =>
  spawnSync("npx", ["playwright", "test", "tests/vorlagen-breite.spec.ts", `--project=${projekt}`, "--reporter=line"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, BREITE_VOLL: "1" },
  }).status ?? 1;

const chromium = lauf("schreibtisch");
const webkit = lauf("handy-webkit");
process.exit(chromium === 0 && webkit === 0 ? 0 : 1);
