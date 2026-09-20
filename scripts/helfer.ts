/**
 * Minimales Prüfgerüst — bewusst ohne Test-Framework.
 *
 * Das Projekt hat keine Testabhängigkeiten und soll auch keine bekommen; die
 * Prüfungen laufen mit `npx tsx`, das ohnehin für den Dev-Server da ist.
 * Geprüft werden nur reine Funktionen, an denen ein Fehler echten Schaden
 * anrichtet: Zusammenführen beim Geräte-Sync, Excel-Summen, Arbeitszeit,
 * Backup-Verschlüsselung, Textkodierung.
 */
import { stableStringify } from "../src/utils/stableJson";

type Fall = { name: string; fn: () => void | Promise<void> };

const faelle: Fall[] = [];
let aktuelleGruppe = "";

export function gruppe(name: string) {
  aktuelleGruppe = name;
}

export function pruefe(name: string, fn: () => void | Promise<void>) {
  faelle.push({ name: aktuelleGruppe ? `${aktuelleGruppe}: ${name}` : name, fn });
}

export function gleich(ist: unknown, soll: unknown, was = "") {
  const a = stableStringify(ist);
  const b = stableStringify(soll);
  if (a !== b) {
    throw new Error(`${was ? was + " — " : ""}erwartet ${b}, war ${a}`);
  }
}

export function wahr(bedingung: boolean, was = "Bedingung nicht erfüllt") {
  if (!bedingung) throw new Error(was);
}

export async function wirft(fn: () => Promise<unknown>, was = "sollte fehlschlagen") {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error(was + " — es wurde aber kein Fehler ausgelöst");
}

/**
 * Entfernt Zeilenkommentare und Blockkommentare, damit eine quelltextsuchende
 * Prüfung nicht ausgerechnet den Kommentar findet, der erklärt, warum ein
 * Muster entfernt wurde -- und den "Verstoß" damit dauerhaft verteidigt,
 * statt ihn zu finden.
 *
 * Extrahiert aus `checks/inhaltsrichtlinie.ts` (0.9.58), weil
 * `checks/ansichtsfokus.ts` (0.9.60) genau denselben Fehler zeigte: Ein
 * Kommentar, der die verbotene Rolle UND das dazugehörige Panel als Text
 * nennt, um zu erklären, warum das Muster entfernt wurde, ließ die Prüfung
 * dort "eine Datei mit der Rolle, eine mit dem Panel" zählen und damit
 * dauerhaft grün bleiben -- unabhängig davon, ob irgendwo im echten Code
 * ein unvollständiges Reiter-Muster steht.
 *
 * `offen` meldet, ob die Datei innerhalb eines Blockkommentars endet --
 * dann hat die Kommentarentfernung selbst versagt, und das Ergebnis ist
 * nicht belastbar.
 */
export function nurCode(zeilen: string[]): { code: string[]; offen: boolean } {
  let imBlock = false;
  const code = zeilen.map((zeile) => {
    let rest = zeile;
    let raus = "";
    while (rest.length > 0) {
      if (imBlock) {
        const ende = rest.indexOf("*/");
        if (ende === -1) break;
        rest = rest.slice(ende + 2);
        imBlock = false;
        continue;
      }
      const block = rest.indexOf("/*");
      const zeilenKommentar = rest.indexOf("//");
      if (zeilenKommentar !== -1 && (block === -1 || zeilenKommentar < block)) {
        raus += rest.slice(0, zeilenKommentar);
        break;
      }
      if (block !== -1) {
        raus += rest.slice(0, block);
        rest = rest.slice(block + 2);
        imBlock = true;
        continue;
      }
      raus += rest;
      break;
    }
    return raus;
  });
  return { code, offen: imBlock };
}

export async function alleLaufen(): Promise<number> {
  let fehler = 0;
  for (const f of faelle) {
    try {
      await f.fn();
      console.log(`  OK   ${f.name}`);
    } catch (e) {
      fehler++;
      console.log(`  FEHL ${f.name}`);
      console.log(`       ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log("");
  console.log(
    fehler === 0
      ? `Alle ${faelle.length} Pruefungen bestanden.`
      : `${fehler} von ${faelle.length} Pruefungen fehlgeschlagen.`,
  );
  return fehler;
}
