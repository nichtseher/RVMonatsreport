import { clear as clearIndexedDb } from "idb-keyval";

/**
 * Löscht **alles**, was diese App auf dem Gerät hält.
 *
 * Zwei Speicher, nicht einer: Die Einstellungen liegen in `localStorage`, der
 * Bericht und das Archiv in IndexedDB (`idb-keyval`). Wer nur den ersten
 * leert, hinterlässt die eigentlichen Daten — und die Zusage „alles gelöscht"
 * wäre falsch.
 *
 * Bis 0.9.42 stand dieser Ablauf nur im Absturzbildschirm (`ErrorBoundary`),
 * also ausgerechnet dort, wo man ihn nicht sucht: Es gab keinen Weg, das
 * Gerät bewusst zu leeren, bevor man es zurückgibt. Seit 0.9.43 rufen ihn
 * beide Stellen auf, damit sie nicht auseinanderlaufen können.
 *
 * `localStorage.clear()` statt einer Schlüsselliste ist Absicht: Eine Liste
 * müsste gepflegt werden, und in diesem Projekt sind handgepflegte Listen
 * mehrfach vergessen worden. Die Adresse gehört allein dieser App.
 */
export async function loescheAllesLokal(): Promise<void> {
  /*
    Reihenfolge: erst IndexedDB, dann localStorage -- und das ist kein Zufall.
    IndexedDB ist der Teil, der scheitern kann (gesperrte Datenbank, privater
    Modus). Schlägt er zu, ist noch nichts weg, und der Aufrufer darf ehrlich
    „es wurde nichts gelöscht" melden. Andersherum stünde die App nach einem
    Fehler ohne Einstellungen, aber mit vollem Archiv da -- und die Meldung
    wäre in beiden Richtungen falsch.
  */
  try {
    await clearIndexedDb();
  } catch (err) {
    // Bewusst nicht verschluckt: Wer „alles gelöscht" gesagt bekommt, während
    // das Archiv noch liegt, trifft danach falsche Entscheidungen.
    console.error("IndexedDB-Löschung fehlgeschlagen", err);
    throw err;
  }
  localStorage.clear();
}
