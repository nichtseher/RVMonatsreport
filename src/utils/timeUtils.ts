/**
 * Arbeitszeit-Berechnung für eine Schicht.
 *
 * Lag bis 0.9.4 als lokale Funktion in ClockInWidget.tsx (gut 1000 Zeilen) und
 * war dadurch nicht prüfbar — obwohl hier ein Fehler unmittelbar in falschen
 * Stundenzahlen im Bericht landet. Reine Funktion, keine Abhängigkeiten:
 * siehe scripts/checks/zeit.ts.
 */

/** "HH:MM" -> Minuten seit Mitternacht, oder null bei unbrauchbarer Eingabe. */
function minutenSeitMitternacht(zeit: string): number | null {
  if (typeof zeit !== "string") return null;
  const teile = zeit.split(":");
  if (teile.length < 2) return null;
  const stunden = Number(teile[0]);
  const minuten = Number(teile[1]);
  if (!Number.isFinite(stunden) || !Number.isFinite(minuten)) return null;
  if (stunden < 0 || stunden > 23 || minuten < 0 || minuten > 59) return null;
  return stunden * 60 + minuten;
}

/** "YYYY-MM-DD" -> [Jahr, Monat, Tag], oder null bei unbrauchbarer Eingabe. */
function datumsteile(datum: string): [number, number, number] | null {
  if (typeof datum !== "string") return null;
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum.trim());
  if (!treffer) return null;
  const jahr = Number(treffer[1]);
  const monat = Number(treffer[2]);
  const tag = Number(treffer[3]);
  if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
  return [jahr, monat, tag];
}

/**
 * Netto-Arbeitsstunden zwischen zwei Uhrzeiten, abzüglich Pause.
 *
 * Liegt die Endzeit vor der Startzeit, wird eine Schicht über Mitternacht
 * angenommen (22:00–06:00 = 8 Stunden).
 *
 * Unbrauchbare Eingaben ergeben 0 statt NaN — vorher konnte während des
 * Ausfüllens NaN durch die Oberfläche wandern.
 *
 * ZEITUMSTELLUNG (`datum`, optional, "YYYY-MM-DD" = Beginn der Schicht)
 *
 * Ohne Datum wird schlicht gerechnet, und an zwei Nächten im Jahr ist das
 * falsch. Nachgemessen für 2026 (Europe/Berlin):
 *
 *   24.10. 22:00 -> 25.10. 06:00   tatsächlich 9 Stunden   ohne Datum: 8
 *   28.03. 22:00 -> 29.03. 06:00   tatsächlich 7 Stunden   ohne Datum: 8
 *
 * Betroffen ist die Nacht, die *in* die Umstellung läuft — also die Schicht,
 * die am Abend **vor** dem Umstellungssonntag beginnt. Eine Schicht, die am
 * Umstellungssonntag selbst um 22:00 beginnt, hat wieder normale 8 Stunden.
 *
 * Mit Datum wird über echte Zeitpunkte gerechnet, womit die Umstellung von
 * selbst herauskommt. Bewusst in der Zeitzone des Geräts: Die App notiert
 * Uhrzeiten so, wie sie auf der Uhr des Nutzers standen.
 *
 * Zwei Randfälle, die dazugehören: In der Frühjahrsnacht gibt es die Stunde
 * von 02:00 bis 03:00 nicht — eine dort eingetragene Uhrzeit verschiebt der
 * Browser nach vorn. In der Herbstnacht gibt es 02:30 zweimal; gemeint ist
 * dann die erste. Beides ist der Zeitumstellung eigen und nicht auflösbar,
 * ohne den Nutzer zu fragen.
 *
 * Ohne `datum` bleibt das alte Verhalten unverändert — die Echtzeit-Stempeluhr
 * rechnet ohnehin mit echten Zeitstempeln und war nie betroffen.
 */
export function berechneNettoStunden(
  kommen: string,
  gehen: string,
  pauseMinuten: number,
  datum?: string,
): number {
  const von = minutenSeitMitternacht(kommen);
  const bis = minutenSeitMitternacht(gehen);
  if (von === null || bis === null) return 0;

  const pause = Number.isFinite(pauseMinuten) ? Math.max(0, pauseMinuten) : 0;
  // Schicht über Mitternacht
  const ueberMitternacht = bis < von;

  const teile = datum === undefined ? null : datumsteile(datum);
  if (teile) {
    const [jahr, monat, tag] = teile;
    const start = new Date(jahr, monat - 1, tag, Math.floor(von / 60), von % 60);
    const ende = new Date(
      jahr,
      monat - 1,
      tag + (ueberMitternacht ? 1 : 0),
      Math.floor(bis / 60),
      bis % 60,
    );
    const bruttoMinuten = (ende.getTime() - start.getTime()) / 60000;
    if (Number.isFinite(bruttoMinuten)) {
      const netto = Math.max(0, bruttoMinuten - pause);
      return Math.round((netto / 60) * 100) / 100;
    }
  }

  const bisKorrigiert = ueberMitternacht ? bis + 24 * 60 : bis;
  const nettoMinuten = Math.max(0, bisKorrigiert - von - pause);
  return Math.round((nettoMinuten / 60) * 100) / 100;
}
