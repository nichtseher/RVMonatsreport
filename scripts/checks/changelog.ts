import { readFileSync } from "node:fs";
import { gruppe, pruefe, gleich, wahr, nurCode } from "../helfer";

/*
  Der Changelog in der App zeigt höchstens zehn Versionen (0.9.76).

  Bis dahin waren es 85 -- 1.419 Zeilen, ein 100-KB-Paket und 85 Überschriften
  in der Überschriftenliste eines Screenreaders. Der Verlauf davor steht in Git.
  Eine solche Obergrenze hält genau so lange, bis jemand beim nächsten Eintrag
  vergisst, den ältesten zu entfernen: Sie ist eine Liste, die von Hand
  nachgeführt wird, und davon ist in diesem Projekt schon dreimal eine
  stillschweigend veraltet (siehe CLAUDE.md, „A hand-maintained list of states
  is not a safety net"). Deshalb zählt diese Prüfung nach.

  Geprüft werden drei Dinge: die Obergrenze, dass der oberste Eintrag zur
  installierten Version gehört (ein Release ohne Eintrag fiele sonst erst den
  Kollegen auf), und die Reihenfolge -- „Zwei Changelog-Einträge standen an der
  falschen Stelle" war der Fehler von 0.9.64.

  Gezählt wird im Code ohne Kommentare, damit ein auskommentierter Eintrag
  weder mitzählt noch die Obergrenze verdeckt.
*/

const WURZEL = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const MAX_EINTRAEGE = 10;

const quelle = readFileSync(WURZEL + "/src/components/ChangelogModal.tsx", "utf8");
const paket = JSON.parse(readFileSync(WURZEL + "/package.json", "utf8")) as { version: string };

const { code, offen } = nurCode(quelle.split("\n"));
const text = code.join("\n");
const nummern = [...text.matchAll(/<Eintrag\s+nr="(\d+\.\d+\.\d+)"/g)].map((t) => t[1]);

function teile(version: string): number[] {
  return version.split(".").map(Number);
}

/** Negativ, wenn a älter ist als b. */
function vergleiche(a: string, b: string): number {
  const x = teile(a);
  const y = teile(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

gruppe("Changelog");

pruefe("die Quelle ist lesbar und die Kommentarentfernung ist aufgegangen", () => {
  wahr(quelle.length > 1000, `ChangelogModal.tsx nur ${quelle.length} Zeichen — falscher Pfad?`);
  wahr(!offen, "ein Blockkommentar bleibt offen — das Zählen wäre nicht belastbar");
  wahr(nummern.length > 0, "kein einziger `<Eintrag nr=\"…\">` gefunden — Muster falsch oder Komponente umbenannt?");
});

pruefe(`höchstens ${MAX_EINTRAEGE} Einträge`, () => {
  wahr(
    nummern.length <= MAX_EINTRAEGE,
    `${nummern.length} Einträge (${nummern.join(", ")}). Beim Hinzufügen eines neuen den ältesten entfernen — ` +
      `der Verlauf steht in Git.`,
  );
});

pruefe("der oberste Eintrag gehört zur installierten Version", () => {
  gleich(nummern[0], paket.version, "oberster Changelog-Eintrag gegen package.json");
});

pruefe("die Versionen stehen absteigend, keine doppelt", () => {
  for (let i = 1; i < nummern.length; i++) {
    wahr(
      vergleiche(nummern[i - 1], nummern[i]) > 0,
      `${nummern[i]} steht hinter ${nummern[i - 1]} — Reihenfolge oder Doppelung (${nummern.join(", ")})`,
    );
  }
});

/*
  Ein von Hand ausgeschriebener Kopf („Version 0.9.x: …" in einem eigenen
  <span>) würde an der Hilfskomponente vorbei zählen -- und damit auch an der
  Obergrenze und an der Beta-Plakette.
*/
pruefe("kein Eintrag umgeht die Hilfskomponente", () => {
  const handgemacht = [...text.matchAll(/>\s*Version\s+\d+\.\d+\.\d+/g)];
  gleich(handgemacht.length, 0, "von Hand ausgeschriebene Versionsüberschriften");
});
