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
