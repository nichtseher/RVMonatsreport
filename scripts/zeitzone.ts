/**
 * Zeitzone für den Prüflauf festnageln.
 *
 * Warum als eigenes Modul und nicht als Zeile in `pruefen.ts`: ES-Module
 * werten ihre Importe **vor** dem eigenen Rumpf aus. Eine Zuweisung oben in
 * `pruefen.ts` liefe also nach dem Laden aller Prüfmodule — was hier zwar
 * gutginge (die Prüfungen registrieren sich nur und rechnen erst später), aber
 * aus dem falschen Grund. Als erster Import läuft es nachweislich zuerst.
 *
 * Warum überhaupt: Dieser Entwicklungsrechner steht auf Europe/Berlin, der
 * CI-Läufer auf UTC. In UTC gibt es keine Sommerzeit — die Prüffälle zur
 * Zeitumstellung wären dort nicht vorhanden und meldeten grün, ohne etwas
 * geprüft zu haben. Das ist die unangenehmste Sorte Prüfung: eine, die nur zu
 * Hause etwas misst.
 */
process.env.TZ = "Europe/Berlin";

/** Damit ein Prüffall belegen kann, dass die Zeitzone wirklich greift. */
export const ERWARTETE_ZEITZONE = "Europe/Berlin";
