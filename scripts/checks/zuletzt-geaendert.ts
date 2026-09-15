import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { formatiereZuletzt } from "../../src/utils/zuletztGeaendert";

/*
  „zuletzt: heute, 11:40" am Zähler (0.9.45).

  Die Funktion ist klein, aber sie beantwortet die Frage, wegen der die Zeile
  überhaupt existiert: „Habe ich diesen Termin schon gezählt?" Eine falsche
  Antwort darauf ist schlimmer als keine -- wer „heute" liest, obwohl es
  gestern war, zählt nicht nach.

  Der Bezugszeitpunkt ist deshalb ein Argument und kein `new Date()` im
  Inneren: Sonst wäre die Prüfung von der Uhr des Rechners abhängig und um
  Mitternacht zufällig rot.
*/

const jetzt = new Date(2026, 8, 15, 14, 30); // Di, 15.09.2026, 14:30

gruppe("Zuletzt geändert");

pruefe("ohne Zeitstempel steht keine Zeile da", () => {
  gleich(formatiereZuletzt(undefined, jetzt), null);
  gleich(formatiereZuletzt(null, jetzt), null);
  gleich(formatiereZuletzt("", jetzt), null);
});

pruefe("ein unlesbarer Zeitstempel erzeugt keine Zeile statt 'Invalid Date'", () => {
  gleich(formatiereZuletzt("kein Datum", jetzt), null);
});

pruefe("heute", () => {
  const t = formatiereZuletzt(new Date(2026, 8, 15, 11, 40).toISOString(), jetzt);
  gleich(t?.sichtbar, "zuletzt: heute, 11:40");
  gleich(t?.gesprochen, "zuletzt geändert heute um 11 Uhr 40");
});

pruefe("gestern -- auch wenn keine 24 Stunden dazwischen liegen", () => {
  // 23:50 gestern gegen 14:30 heute: 14,7 Stunden. Gezählt werden Kalendertage,
  // nicht Stunden -- sonst hiesse es "heute", und das wäre schlicht falsch.
  const t = formatiereZuletzt(new Date(2026, 8, 14, 23, 50).toISOString(), jetzt);
  gleich(t?.sichtbar, "zuletzt: gestern, 23:50");
});

pruefe("zwei bis sechs Tage: Wochentag und Datum", () => {
  const t = formatiereZuletzt(new Date(2026, 8, 11, 9, 5).toISOString(), jetzt);
  gleich(t?.sichtbar, "zuletzt: Fr, 11.09.");
});

pruefe("ab einer Woche nur noch das Datum", () => {
  const t = formatiereZuletzt(new Date(2026, 8, 1, 9, 5).toISOString(), jetzt);
  gleich(t?.sichtbar, "zuletzt: 01.09.");
});

pruefe("eine Uhr aus der Zukunft behauptet nicht 'heute'", () => {
  // Kommt vor, wenn das zweite Gerät falsch gestellt ist. Der Wert wandert
  // über den Geräteabgleich mit, und "heute" wäre dann eine Zusicherung, die
  // die App nicht halten kann.
  const t = formatiereZuletzt(new Date(2026, 8, 20, 8, 0).toISOString(), jetzt);
  wahr(
    t !== null && !t.sichtbar.includes("heute"),
    `Ein Zeitstempel fünf Tage in der Zukunft wurde als "${t?.sichtbar}" angezeigt.`,
  );
});

pruefe("die gesprochene Fassung nennt nie einen Doppelpunkt", () => {
  const faelle = [
    new Date(2026, 8, 15, 11, 40),
    new Date(2026, 8, 14, 23, 50),
    new Date(2026, 8, 11, 9, 5),
    new Date(2026, 8, 1, 9, 5),
  ];
  for (const fall of faelle) {
    const t = formatiereZuletzt(fall.toISOString(), jetzt);
    wahr(
      !!t && !t.gesprochen.includes(":"),
      `"${t?.gesprochen}" enthält einen Doppelpunkt -- Screenreader lesen das ` +
        `je nach Stimme als Datum oder als "Doppelpunkt".`,
    );
  }
});
