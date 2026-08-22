import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { verrechneSchicht } from "../../src/utils/schichtVerrechnung";
import type { TimeLog } from "../../src/types";

/*
  Die Stempeluhr fuehrt drei Werte im Bericht automatisch mit: Buerostunden,
  Aussendienststunden und Arbeitstage. Genau diese drei gehen zur
  Vertriebsleitung -- eine falsche Verrechnung faellt dort auf und muss
  nachgefragt werden.

  Dieselbe Rechnung stand bis 0.9.14 DREIMAL in App.tsx (Ausstempeln,
  Loeschen, Nachtragen) und war ungeprueft.
*/

const schicht = (buero: number, feld: number): Pick<TimeLog, "officeHours" | "fieldHours"> => ({
  officeHours: buero,
  fieldHours: feld,
});

gruppe("Schicht auf den Bericht verrechnen");

pruefe("eine Schicht erhöht Stunden und Arbeitstage", () => {
  const raus = verrechneSchicht(
    { std_buero: 10, std_aussendienst: 20, tage_arbeit: 3 },
    schicht(4, 3.5),
    "hinzufuegen",
  );
  gleich(raus.std_buero, 14);
  gleich(raus.std_aussendienst, 23.5);
  gleich(raus.tage_arbeit, 4);
});

pruefe("das Löschen einer Schicht rechnet sie wieder heraus", () => {
  const raus = verrechneSchicht(
    { std_buero: 14, std_aussendienst: 23.5, tage_arbeit: 4 },
    schicht(4, 3.5),
    "entfernen",
  );
  gleich(raus.std_buero, 10);
  gleich(raus.std_aussendienst, 20);
  gleich(raus.tage_arbeit, 3);
});

pruefe("Hinzufügen und Entfernen heben sich auf", () => {
  /*
    Wer eine Schicht anlegt und wieder loescht, muss danach exakt dieselben
    Zahlen im Bericht haben. Das gilt nur, solange die Schichtstunden zwei
    Nachkommastellen haben -- sonst rundet jeder Schritt einzeln und der Rest
    bleibt haengen: 7,25 + 3,875 = 11,13, davon 3,875 ab = 7,26.

    Genau das war bis 0.9.14 erreichbar: ClockInWidget uebernahm getippte
    Stunden UNGERUNDET in die Schicht. Dort wird jetzt gerundet -- diese
    Pruefung deckt beide Seiten ab.
  */
  const start = { std_buero: 7.25, std_aussendienst: 12.75, tage_arbeit: 5 };
  const s = schicht(3.88, 3.88);
  const hin = verrechneSchicht(start, s, "hinzufuegen");
  const zurueck = verrechneSchicht(hin, s, "entfernen");
  gleich(zurueck.std_buero, start.std_buero);
  gleich(zurueck.std_aussendienst, start.std_aussendienst);
  gleich(zurueck.tage_arbeit, start.tage_arbeit);
});

pruefe("mit drei Nachkommastellen bliebe ein Rest hängen", () => {
  // Dokumentiert die Grenze der Umkehrbarkeit -- und begruendet, warum
  // ClockInWidget getippte Stunden rundet, bevor sie in die Schicht gehen.
  const start = { std_buero: 7.25, std_aussendienst: 0, tage_arbeit: 0 };
  const s = schicht(3.875, 0);
  const zurueck = verrechneSchicht(
    verrechneSchicht(start, s, "hinzufuegen"),
    s,
    "entfernen",
  );
  wahr(zurueck.std_buero !== start.std_buero, "unerwartet umkehrbar");
  gleich(zurueck.std_buero, 7.26);
});

pruefe("es wird auf zwei Nachkommastellen gerundet", () => {
  // Die Stempeluhr teilt Schichten haelftig auf und erzeugt dabei Werte wie
  // 3,875. Ohne Rundung stuenden im Excel-Export Zahlen mit zehn Stellen.
  const raus = verrechneSchicht(
    { std_buero: 0, std_aussendienst: 0, tage_arbeit: 0 },
    schicht(3.875, 3.875),
    "hinzufuegen",
  );
  gleich(raus.std_buero, 3.88);
  gleich(raus.std_aussendienst, 3.88);
});

pruefe("Entfernen rutscht nicht ins Negative", () => {
  /*
    Der Fall tritt ein, wenn jemand die Stunden von Hand nach unten korrigiert
    und danach die Schicht loescht. Eine negative Stundenzahl im Bericht waere
    schlimmer als eine zu niedrige: Sie ist offensichtlich falsch und stellt
    alles andere in Frage.
  */
  const raus = verrechneSchicht(
    { std_buero: 1, std_aussendienst: 0, tage_arbeit: 0 },
    schicht(5, 5),
    "entfernen",
  );
  gleich(raus.std_buero, 0);
  gleich(raus.std_aussendienst, 0);
  gleich(raus.tage_arbeit, 0);
});

pruefe("fehlende oder leere Ausgangswerte gelten als null", () => {
  const raus = verrechneSchicht({ std_buero: "" }, schicht(2, 3), "hinzufuegen");
  gleich(raus.std_buero, 2);
  gleich(raus.std_aussendienst, 3);
  gleich(raus.tage_arbeit, 1);
});

pruefe("andere Zählerstände bleiben unangetastet", () => {
  // Die Verrechnung darf nur ihre drei Felder anfassen.
  const raus = verrechneSchicht(
    { vf_schule: 7, eigenes: 3, std_buero: 1, std_aussendienst: 1, tage_arbeit: 1 },
    schicht(2, 2),
    "hinzufuegen",
  );
  gleich(raus.vf_schule, 7);
  gleich(raus.eigenes, 3);
});

pruefe("die Vorlage wird nicht verändert", () => {
  const start = { std_buero: 5, std_aussendienst: 5, tage_arbeit: 1 };
  const raus = verrechneSchicht(start, schicht(1, 1), "hinzufuegen");
  gleich(start, { std_buero: 5, std_aussendienst: 5, tage_arbeit: 1 });
  wahr(raus !== start, "dasselbe Objekt zurueckgegeben");
});

pruefe("eine Schicht ohne Stunden zählt trotzdem als Arbeitstag", () => {
  // Reiner Fahrtag oder eine Schicht, die komplett als Pause gebucht wurde.
  const raus = verrechneSchicht(
    { std_buero: 0, std_aussendienst: 0, tage_arbeit: 2 },
    schicht(0, 0),
    "hinzufuegen",
  );
  gleich(raus.tage_arbeit, 3);
});
