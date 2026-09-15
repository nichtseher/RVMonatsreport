/**
 * Welche Kategorie welche Zelle der Firmenvorlage füllt.
 *
 * **Warum das in einer eigenen Datei steht und nicht in `vorlageExport.ts`:**
 * Dort liegt die eingebettete Vorlage als base64-Blob. Ein statischer Import
 * aus `App.tsx` zöge sie ins Startbündel — genau die Falle, die 0.9.35 für
 * `VORLAGE_STAND` gemessen hat (581.777 → 598.106 Bytes, und der Blob wanderte
 * aus dem Export-Teil heraus, den nur lädt, wer wirklich exportiert).
 *
 * Gebraucht wird die Zuordnung seit 0.9.45 an zwei Stellen: beim Füllen der
 * Vorlage und in der Rückfrage vor dem Löschen einer Kategorie. Wer eine
 * Kategorie löscht, die hier steht, erzeugt eine Zeile, die **in jedem
 * künftigen Bericht leer bleibt** — und eine leere Zeile sieht aus wie eine
 * Null. Genau dieser Fehler ist 0.9.11 schon einmal aufgetreten (D22 fehlte,
 * jeder bis dahin erzeugte Bericht war an der Stelle leer).
 *
 * Die Zuordnung laeuft ueber die Feld-ID, nicht ueber die Beschriftung: Die
 * Wortlaute weichen an mehreren Stellen leicht voneinander ab (die Vorlage
 * sagt "Anzahl Schulungen / Support vor Ort (ohne Auslieferung)", die App
 * "Anzahl Schulungen/Support (ohne Auslieferung)"), und Beschriftungen sind
 * vom Nutzer aenderbar. IDs sind es nicht.
 *
 * Die Zellen stammen nicht aus dem Augenmass: In der Vorlage sind genau 20
 * Zellen gelb hinterlegt (FFFF99) -- das sind die vorgesehenen Eingabefelder.
 * D10 ist bewusst NICHT dabei, dort steht die Formel SUM(D6:D9).
 */
export const FELD_ZU_ZELLE: Record<string, string> = {
  vf_schule: "D6",
  vf_arbeit: "D7",
  aus_schule: "D8",
  aus_arbeit: "D9",
  schul_vorort: "D12",
  schul_tel: "D13",
  akquise: "D14",
  messen: "D16",
  tage_arbeit: "D18",
  std_buero: "D19",
  tac_vf: "D21",
  envision_vf: "D22",
  feel_vf: "D23",
  wewalk_vf: "D24",
  wewalk_tel: "D25",
};
