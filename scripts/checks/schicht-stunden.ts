import { gruppe, pruefe, gleich } from "../helfer";
import { berechneSchichtzahlen, bueroAnteil, aufZwei } from "../../src/utils/schichtStunden";

/*
  Die Stundenrechnung hinter „Ausstempeln" und „Nachtragen". Sie stand zweimal in
  ClockInWidget.tsx (0.9.78 zusammengeführt); diese Fälle sind die Messlatte,
  gegen die der Umbau lief.
*/

gruppe("Schichtstunden (Ausstempeln und Nachtragen)");

pruefe("Voreinstellungen: Büro-Anteil", () => {
  gleich(bueroAnteil("half", 90), 0.5);
  gleich(bueroAnteil("office", 90), 1);
  gleich(bueroAnteil("field", 90), 0);
  gleich(bueroAnteil("custom", 30), 0.3);
});

pruefe("50/50 bei 7,75 Stunden: die Summe bleibt 7,75", () => {
  const z = berechneSchichtzahlen(7.75, "half", 50, "", "");
  gleich(z.buero + z.aussendienst, 7.75);
  gleich(z.gesamt, 7.75);
  gleich(z.vorschlag, { buero: z.buero, aussendienst: z.aussendienst });
});

pruefe("100 % Büro und 100 % Außendienst", () => {
  gleich(berechneSchichtzahlen(8, "office", 50, "", "").aussendienst, 0);
  gleich(berechneSchichtzahlen(8, "field", 50, "", "").buero, 0);
  gleich(berechneSchichtzahlen(8, "field", 50, "", "").bueroAnteil, 0);
  gleich(berechneSchichtzahlen(8, "office", 50, "", "").bueroAnteil, 1);
});

pruefe("eigene Prozent: 30 % Büro", () => {
  const z = berechneSchichtzahlen(10, "custom", 30, "", "");
  gleich(z.buero, 3);
  gleich(z.aussendienst, 7);
  gleich(z.bueroAnteil, 0.3);
});

pruefe("getippte Stunden haben Vorrang und werden auf zwei Stellen gerundet", () => {
  const z = berechneSchichtzahlen(8, "half", 50, "3.875", "");
  gleich(z.buero, aufZwei(3.875));
  gleich(z.aussendienst, 4); // Vorschlag bleibt, wo nichts getippt wurde
  gleich(z.vorschlag.buero, 4); // der Platzhalter bleibt der Vorschlag
});

pruefe("nur Außendienst getippt, Büro bleibt beim Vorschlag", () => {
  const z = berechneSchichtzahlen(6, "office", 50, "", "2.5");
  gleich(z.buero, 6);
  gleich(z.aussendienst, 2.5);
  gleich(z.gesamt, 8.5);
});

pruefe("Rundungsfalle von 0.9.22: Anlegen und Entfernen ist umkehrbar", () => {
  // 7,25 + 3,875 darf nicht 11,13 - 3,875 = 7,26 ergeben.
  const z = berechneSchichtzahlen(0, "half", 50, "3.875", "");
  gleich(z.buero, 3.88);
  gleich(aufZwei(aufZwei(7.25 + z.buero) - z.buero), 7.25);
});

pruefe("unbrauchbare Eingaben ergeben 0 statt NaN", () => {
  const z = berechneSchichtzahlen(8, "half", 50, "abc", "");
  gleich(z.buero, 0);
  gleich(Number.isNaN(z.gesamt), false);
});

pruefe("Schicht ohne Dauer: Anteil 0,5, nichts negativ", () => {
  const z = berechneSchichtzahlen(0, "half", 50, "", "");
  gleich(z.gesamt, 0);
  gleich(z.bueroAnteil, 0.5);
  const n = berechneSchichtzahlen(-3, "half", 50, "", "");
  gleich(n.buero, 0);
  gleich(n.aussendienst, 0);
});
