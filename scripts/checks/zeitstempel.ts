import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { stempeln, stempelNachtragen, stempelnGeaenderte } from "../../src/utils/zeitstempel";

/*
  Die Zeitstempel je Zaehlerfeld. Sie entscheiden beim Geraete-Abgleich,
  welche Eingabe gewinnt -- ein falscher Stempel loescht die Arbeit des
  anderen Geraets, ohne dass jemand etwas bemerkt.

  Lagen bis 0.9.14 auf Modulebene in App.tsx und waren nur mittelbar ueber
  mergeValues geprueft.
*/

const T1 = "2026-08-01T10:00:00.000Z";
const T2 = "2026-08-02T10:00:00.000Z";

gruppe("Zeitstempel je Feld");

pruefe("stempeln setzt nur die genannten Felder", () => {
  const vorher = { a: T1, b: T1 };
  gleich(stempeln(vorher, ["b"], T2), { a: T1, b: T2 });
});

pruefe("stempeln verändert die Vorlage nicht", () => {
  // Sonst wuerde React die Aenderung nicht bemerken -- und schlimmer: Der
  // alte Stand im Archiv bekaeme rueckwirkend neue Stempel.
  const vorher = { a: T1 };
  const nachher = stempeln(vorher, ["a"], T2);
  gleich(vorher, { a: T1 });
  gleich(nachher, { a: T2 });
  wahr(vorher !== nachher, "dasselbe Objekt zurueckgegeben");
});

pruefe("stempeln kommt ohne Vorlage aus", () => {
  gleich(stempeln(undefined, ["a"], T1), { a: T1 });
});

pruefe("nachtragen füllt nur Lücken", () => {
  // Ein vorhandener Stempel darf NICHT ueberschrieben werden -- er ist
  // genauer als der Monats-Zeitstempel, mit dem hier aufgefuellt wird.
  gleich(
    stempelNachtragen({ a: 1, b: 2 }, { a: T2 }, T1),
    { a: T2, b: T1 },
  );
});

pruefe("nachtragen ignoriert Felder ohne Wert", () => {
  gleich(stempelNachtragen({}, undefined, T1), {});
  gleich(stempelNachtragen(undefined, { a: T2 }, T1), { a: T2 });
});

pruefe("nur tatsächlich geänderte Felder werden gestempelt", () => {
  /*
    Der eigentliche Zweck: Beim Laden einer Monatsvorlage werden ALLE Werte
    neu gesetzt. Wuerden dabei alle Felder gestempelt, bekaeme jedes einen
    taufrischen Stempel -- und beim naechsten Abgleich schluege dieser
    unveraenderte Wert die echte Aenderung des anderen Geraets.
  */
  const vorher = { a: T1, b: T1, c: T1 };
  const alt = { a: 1, b: 2, c: 3 };
  const neu = { a: 1, b: 99, c: 3 };
  const ergebnis = stempelnGeaenderte(vorher, alt, neu);
  gleich(ergebnis.a, T1, "a war unveraendert und wurde trotzdem gestempelt");
  gleich(ergebnis.c, T1, "c war unveraendert und wurde trotzdem gestempelt");
  wahr(ergebnis.b !== T1, "b hat sich geaendert, aber keinen neuen Stempel");
});

pruefe("ein entferntes Feld gilt als geändert", () => {
  // Loeschen ist eine Aenderung: Ohne Stempel wuerde der alte Wert vom
  // anderen Geraet zurueckkommen.
  const ergebnis = stempelnGeaenderte({ a: T1 }, { a: 5 }, {});
  wahr(ergebnis.a !== T1, "Loeschen wurde nicht gestempelt");
});

pruefe("ein neu hinzugekommenes Feld wird gestempelt", () => {
  const ergebnis = stempelnGeaenderte({}, {}, { neu: 3 });
  wahr(!!ergebnis.neu, "neues Feld ohne Stempel");
});

pruefe("ohne jede Änderung bleibt alles stehen", () => {
  const vorher = { a: T1, b: T1 };
  gleich(stempelnGeaenderte(vorher, { a: 1, b: 2 }, { a: 1, b: 2 }), vorher);
});
