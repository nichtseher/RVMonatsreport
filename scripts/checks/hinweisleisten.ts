import { readFileSync } from "node:fs";
import { gruppe, pruefe, gleich, nurCode } from "../helfer";

/*
  Jede Hinweisleiste braucht einen Schritt in tests/hinweisleisten.spec.ts.

  Die Spec fuehrt vier Zustaende nacheinander vor. Eine fuenfte Leiste
  (erkennbar am Warnsymbol) ohne fuenften Schritt bliebe ungeprueft und
  faelle in keinem Lauf auf -- derselbe Fehler wie bei EINSTIEGE und
  RUECKFRAGEN (siehe CLAUDE.md). Deshalb zaehlt diese Pruefung nach.
*/

const WURZEL = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function code(datei: string): string {
  const { code: z } = nurCode(readFileSync(WURZEL + "/" + datei, "utf8").split("\n"));
  return z.join("\n");
}

gruppe("Hinweisleisten");

pruefe("jede Leiste hat einen Schritt in der Spec", () => {
  const leisten = (code("src/components/Hinweisleisten.tsx").match(/<AlertTriangle/g) ?? []).length;
  const schritte = (code("tests/hinweisleisten.spec.ts").match(/await pruefeLeiste\(page,/g) ?? []).length;
  gleich(leisten, 4, "Leisten in Hinweisleisten.tsx");
  gleich(schritte, leisten, "Schritte in tests/hinweisleisten.spec.ts");
});
