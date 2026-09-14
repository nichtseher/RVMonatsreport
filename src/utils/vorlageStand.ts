/**
 * Fassung des eingebetteten Firmenformulars (`vorlageMonatsinfo.ts`).
 *
 * WARUM EINE EIGENE DATEI FUER EINE KONSTANTE -- zwei gemessene Gruende, beide
 * am 2026-09-14:
 *
 * 1. NICHT neben die Vorlage selbst. Ein Import aus `vorlageMonatsinfo.ts` zog
 *    die 16 KB grosse base64-Vorlage ins STARTBUENDEL (581.777 -> 598.106
 *    Bytes) und nahm sie zugleich aus dem Export-Chunk heraus. Damit laedt sie
 *    jeder beim Start, statt nur wer exportiert.
 * 2. NICHT in `version.ts`. Die Datei liest `__APP_VERSION__`, das Vite erst
 *    zur Bauzeit einsetzt -- die Pruefungen laufen unter `tsx` ohne das und
 *    brachen mit "ReferenceError: __APP_VERSION__ is not defined" ab.
 *
 * WOFUER: Bis 0.9.34 stand diese Angabe AUSSCHLIESSLICH in einem
 * Quelltextkommentar. Gibt die Firma ein neues Formular heraus, produziert die
 * App weiter das alte -- und die erzeugte Datei sieht aus wie das gewohnte
 * Formular. Das trifft die Kernzusage des Produkts ("Blatt 1 IST die Vorlage")
 * und faellt am Monatsende auf, wenn ueberhaupt.
 *
 * Sie erscheint deshalb in jeder erzeugten Datei (Dokumenteigenschaften und,
 * sofern mitgesendet, Blatt 2), in der Rueckfrage vor dem Senden und in der
 * Hilfe. `scripts/checks/vorlage.ts` sichert das ab.
 *
 * Wer eine neue Vorlage einbettet, aendert hier die Fassung mit.
 */
export const VORLAGE_STAND = "01.2026";
