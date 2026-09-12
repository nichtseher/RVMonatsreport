/**
 * Steht gerade eine Rueckfrage (`ConfirmDialog`) offen?
 *
 * WARUM ES DAS GIBT (gemessen am 2026-09-12):
 *
 * Die Rueckfrage und die Ansicht dahinter hoeren beide auf `keydown` am
 * `window`. Ein Escape, das die Rueckfrage abbrechen soll, hat deshalb
 * BEIDES geschlossen:
 *
 *   Feldverwaltung: „Kategorie loeschen?" -> Escape -> zurueck in den
 *   Optionen. Die Liste, in der der Nutzer gerade stand, war weg.
 *
 *   Geraete-Sync: „Alle Daten dieses Geraets ersetzen?" -> Escape -> das
 *   Sync-Fenster schloss, und mit ihm verfiel das bereits EMPFANGENE Paket
 *   (`resetView` beim Schliessen). Wer die folgenschwerste Aktion der App
 *   verneint, musste die ganze Uebertragung wiederholen.
 *
 * `preventDefault` hilft dagegen nicht -- es unterbindet die Standardaktion,
 * nicht die anderen Zuhoerer. `stopImmediatePropagation` waere von der
 * Registrierungsreihenfolge abhaengig, und die faellt hier je nach Ansicht
 * anders aus: `ManageModal` registriert NACH dem Dialog, `DeviceSyncModal`
 * lange davor. Eine Loesung, die an dieser Reihenfolge haengt, haelt den
 * naechsten Umbau nicht aus.
 *
 * Deshalb die ausdrueckliche Abfrage: Solange eine modale Rueckfrage steht,
 * ruhen die Tastaturkuerzel der Ansichten dahinter. Das ist zugleich das, was
 * `aria-modal="true"` dem Screenreader ohnehin verspricht.
 *
 * `role="alertdialog"` traegt in dieser App ausschliesslich `ConfirmDialog`
 * (geprueft ueber `src/`); `OnboardingModal` und `DeviceSyncModal` tragen
 * `role="dialog"` und sind hier bewusst nicht gemeint.
 */
export function rueckfrageOffen(): boolean {
  return document.querySelector('[role="alertdialog"]') !== null;
}
