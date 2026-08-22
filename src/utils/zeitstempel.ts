import { ValueTimestamps } from "../types";

/**
 * Zeitstempel je Zaehlerfeld -- die Grundlage des feldweisen Abgleichs.
 *
 * Lagen bis 0.9.14 auf Modulebene in `App.tsx`. Es sind reine Funktionen und
 * sie gehoeren neben `merge.ts`, das sie auswertet.
 *
 * Warum es sie ueberhaupt gibt: Beim Geraete-Abgleich gewann bis 0.9.0 pro
 * Monat der gesamte Datensatz mit dem juengeren `savedAt`. Tippten beide
 * Geraete im selben Fenster je ein *anderes* Feld, verschwand eine Eingabe
 * spurlos. Mit Stempeln je Feld werden nur noch Aenderungen am SELBEN Feld
 * gegeneinander abgewogen.
 */

/** Zeitstempel fuer die genannten Felder setzen. */
export const stempeln = (
  vorher: ValueTimestamps | undefined,
  ids: string[],
  zeit: string = new Date().toISOString(),
): ValueTimestamps => {
  const out: ValueTimestamps = { ...(vorher || {}) };
  ids.forEach((id) => {
    out[id] = zeit;
  });
  return out;
};

/**
 * Fehlende Feld-Zeitstempel nachtragen (fuer Daten aus Versionen vor 0.9.1).
 *
 * WICHTIG und beim Testen teuer gelernt: Ein Feld ohne eigenen Zeitstempel
 * faellt beim Zusammenfuehren auf den Monats-Zeitstempel zurueck. Der springt
 * aber nach vorn, sobald irgendein *anderes* Feld getippt wird -- damit
 * bekaeme ein unveraendert alter Wert ploetzlich einen taufrischen Stempel und
 * wuerde die echte Aenderung des anderen Geraets ueberschreiben (genau der
 * Fehler, der behoben werden sollte, nur subtiler).
 *
 * Deshalb werden fehlende Stempel *einmal beim Laden* mit dem damaligen
 * Speicherzeitpunkt nachgetragen, bevor er sich weiterbewegen kann.
 */
export const stempelNachtragen = (
  values: Record<string, number | ""> | undefined,
  vorhanden: ValueTimestamps | undefined,
  zeitpunkt: string,
): ValueTimestamps => {
  const out: ValueTimestamps = { ...(vorhanden || {}) };
  Object.keys(values || {}).forEach((id) => {
    if (!out[id]) out[id] = zeitpunkt;
  });
  return out;
};

/** Wie stempeln(), aber nur fuer Felder, deren Wert sich tatsaechlich geaendert hat. */
export const stempelnGeaenderte = (
  vorher: ValueTimestamps | undefined,
  alteWerte: Record<string, number | "">,
  neueWerte: Record<string, number | "">,
): ValueTimestamps => {
  const ids = new Set([
    ...Object.keys(alteWerte || {}),
    ...Object.keys(neueWerte || {}),
  ]);
  const geaendert = Array.from(ids).filter(
    (id) => (alteWerte || {})[id] !== (neueWerte || {})[id],
  );
  return stempeln(vorher, geaendert);
};
