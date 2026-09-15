/**
 * „zuletzt: heute, 11:40" — die Antwort auf den Zweifel, der im Auto entsteht.
 *
 * Die App schreibt seit 0.9.0 je Kategorie einen Zeitstempel mit
 * (`valuesUpdatedAt`), benutzt ihn aber ausschließlich für den Geräteabgleich.
 * Angezeigt wurde er nie. Wer nach einem Termin unterbrochen wird, kann
 * deshalb nicht nachsehen, ob er schon gezählt hat — und zählt dann lieber
 * doppelt oder gar nicht.
 *
 * Zwei Fassungen je Zeitpunkt, und das ist kein Zierrat:
 *
 * - `sichtbar` steht klein unter dem Zahlenfeld: „heute, 11:40".
 * - `gesprochen` hängt über `aria-describedby` am Eingabefeld: „zuletzt
 *   geändert heute um 11 Uhr 40". Screenreader lesen „11:40" je nach Stimme
 *   als „elf Doppelpunkt vierzig" oder als Datum; „11 Uhr 40" wird überall
 *   als Uhrzeit gesprochen.
 */

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export interface ZuletztText {
  sichtbar: string;
  gesprochen: string;
}

/** Kalendertage zwischen zwei Zeitpunkten, ohne Uhrzeitanteil. */
function tageDazwischen(frueher: Date, spaeter: Date): number {
  const a = new Date(frueher.getFullYear(), frueher.getMonth(), frueher.getDate());
  const b = new Date(spaeter.getFullYear(), spaeter.getMonth(), spaeter.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const zweistellig = (n: number) => String(n).padStart(2, "0");

/**
 * @param iso   Zeitstempel aus `valuesUpdatedAt`, oder undefined
 * @param jetzt Bezugszeitpunkt (für die Prüfungen setzbar)
 * @returns     null, wenn nichts anzuzeigen ist — dann steht die Zeile nicht da
 */
export function formatiereZuletzt(
  iso: string | undefined | null,
  jetzt: Date = new Date(),
): ZuletztText | null {
  if (!iso) return null;
  const zeitpunkt = new Date(iso);
  if (Number.isNaN(zeitpunkt.getTime())) return null;

  /*
    Ein Zeitstempel aus der Zukunft ist kein Fehler des Nutzers, sondern
    meistens eine falsch gestellte Uhr auf dem zweiten Gerät. Ihn als
    „heute" zu zeigen wäre falsch, ihn zu verschweigen auch -- also das
    Datum, ohne Behauptung über die Nähe.
  */
  const tage = tageDazwischen(zeitpunkt, jetzt);
  const uhrzeit = `${zweistellig(zeitpunkt.getHours())}:${zweistellig(zeitpunkt.getMinutes())}`;
  const gesprocheneZeit = `${zeitpunkt.getHours()} Uhr ${zweistellig(zeitpunkt.getMinutes())}`;
  const datum = `${zweistellig(zeitpunkt.getDate())}.${zweistellig(zeitpunkt.getMonth() + 1)}.`;

  if (tage === 0) {
    return {
      sichtbar: `zuletzt: heute, ${uhrzeit}`,
      gesprochen: `zuletzt geändert heute um ${gesprocheneZeit}`,
    };
  }
  if (tage === 1) {
    return {
      sichtbar: `zuletzt: gestern, ${uhrzeit}`,
      gesprochen: `zuletzt geändert gestern um ${gesprocheneZeit}`,
    };
  }
  /*
    Ab zwei Tagen der Wochentag davor: „Fr, 12.09." beantwortet die Frage
    „war das noch in dieser Woche" ohne Rechnen. Ab einer Woche sagt der
    Wochentag nichts mehr, das Datum trägt dann allein.
  */
  const wochentag = tage >= 2 && tage <= 6 ? `${WOCHENTAGE[zeitpunkt.getDay()]}, ` : "";
  return {
    sichtbar: `zuletzt: ${wochentag}${datum}`,
    gesprochen: `zuletzt geändert am ${zeitpunkt.getDate()}. ${zeitpunkt.getMonth() + 1}. um ${gesprocheneZeit}`,
  };
}
