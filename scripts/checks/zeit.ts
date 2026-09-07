import { gruppe, pruefe, gleich } from "../helfer";
import { ERWARTETE_ZEITZONE } from "../zeitzone";
import { berechneNettoStunden, teileArbeitszeit } from "../../src/utils/timeUtils";
import { formatMonthGerman } from "../../src/utils/dateUtils";

gruppe("Arbeitszeit");

pruefe("normale Schicht mit Pause", () => {
  gleich(berechneNettoStunden("08:00", "16:30", 45), 7.75);
});

pruefe("Schicht über Mitternacht", () => {
  gleich(berechneNettoStunden("22:00", "06:00", 0), 8);
  gleich(berechneNettoStunden("23:30", "07:15", 30), 7.25);
});

pruefe("Pause länger als die Schicht ergibt 0, nicht negativ", () => {
  gleich(berechneNettoStunden("09:00", "09:30", 60), 0);
});

pruefe("gleiche Zeit ergibt 0 Stunden", () => {
  gleich(berechneNettoStunden("08:00", "08:00", 0), 0);
});

pruefe("auf zwei Nachkommastellen gerundet", () => {
  // 10 Minuten = 0,1666… Stunden
  gleich(berechneNettoStunden("08:00", "08:10", 0), 0.17);
});

/*
  Zeitumstellung. Die Rechnung bekommt seit 2026-09-01 optional das Datum des
  Schichtbeginns; ohne Datum bleibt es beim reinen Rechnen mit "HH:MM".

  Die Roadmap nannte hier bis dahin die falschen Tage ("am 25.10. neun
  Stunden"). Nachgemessen: Betroffen ist die Nacht, die IN die Umstellung
  läuft, also die Schicht, die am Abend VOR dem Umstellungssonntag beginnt.
  Eine Schicht, die am Sonntag selbst um 22:00 beginnt, hat wieder acht
  Stunden.

  Diese Fälle setzen voraus, dass der Prozess auf Europe/Berlin steht --
  siehe scripts/zeitzone.ts. Der erste Prüffall weist das nach, damit die
  übrigen nicht stillschweigend auf einem UTC-Läufer durchrutschen.
*/
pruefe("Zeitzone des Prüflaufs ist wirklich Europe/Berlin", () => {
  gleich(Intl.DateTimeFormat().resolvedOptions().timeZone, ERWARTETE_ZEITZONE);
  // Und die Sommerzeit existiert dort auch wirklich.
  const januar = new Date(2026, 0, 15).getTimezoneOffset();
  const juli = new Date(2026, 6, 15).getTimezoneOffset();
  gleich(januar - juli, 60);
});

pruefe("Herbst: die Nacht mit 25 Stunden zählt neun statt acht", () => {
  // Umstellung in der Nacht 24.10. -> 25.10.2026 (letzter Sonntag im Oktober)
  gleich(berechneNettoStunden("22:00", "06:00", 0, "2026-10-24"), 9);
  gleich(berechneNettoStunden("22:00", "06:00", 30, "2026-10-24"), 8.5);
});

pruefe("Frühjahr: die Nacht mit 23 Stunden zählt sieben statt acht", () => {
  // Umstellung in der Nacht 28.03. -> 29.03.2026 (letzter Sonntag im März)
  gleich(berechneNettoStunden("22:00", "06:00", 0, "2026-03-28"), 7);
  gleich(berechneNettoStunden("22:00", "06:00", 45, "2026-03-28"), 6.25);
});

pruefe("die Umstellungssonntage selbst sind wieder normal", () => {
  gleich(berechneNettoStunden("22:00", "06:00", 0, "2026-10-25"), 8);
  gleich(berechneNettoStunden("22:00", "06:00", 0, "2026-03-29"), 8);
});

pruefe("Tagschicht am Umstellungstag bleibt unberührt", () => {
  gleich(berechneNettoStunden("08:00", "16:30", 45, "2026-10-25"), 7.75);
  gleich(berechneNettoStunden("08:00", "16:30", 45, "2026-03-29"), 7.75);
});

pruefe("mit Datum sonst identisch zur Rechnung ohne Datum", () => {
  gleich(berechneNettoStunden("08:00", "16:30", 45, "2026-06-15"), 7.75);
  gleich(berechneNettoStunden("22:00", "06:00", 0, "2026-06-15"), 8);
  gleich(berechneNettoStunden("09:00", "09:30", 60, "2026-06-15"), 0);
});

pruefe("unbrauchbares Datum fällt auf die reine Rechnung zurück", () => {
  gleich(berechneNettoStunden("22:00", "06:00", 0, ""), 8);
  gleich(berechneNettoStunden("22:00", "06:00", 0, "24.10.2026"), 8);
  gleich(berechneNettoStunden("22:00", "06:00", 0, "2026-13-99"), 8);
});

pruefe("unbrauchbare Eingaben ergeben 0 statt NaN", () => {
  gleich(berechneNettoStunden("", "16:00", 0), 0);
  gleich(berechneNettoStunden("08:00", "", 0), 0);
  gleich(berechneNettoStunden("25:00", "16:00", 0), 0);
  gleich(berechneNettoStunden("08:00", "16:99", 0), 0);
  gleich(berechneNettoStunden("08:00", "16:00", NaN), 8);
});

gruppe("Monatsnamen");

pruefe("formatiert deutsche Monate", () => {
  gleich(formatMonthGerman("2026-08"), "August 2026");
  gleich(formatMonthGerman("2026-01"), "Januar 2026");
  gleich(formatMonthGerman("2026-12"), "Dezember 2026");
});

pruefe("gibt unbrauchbare Eingaben unverändert zurück", () => {
  gleich(formatMonthGerman(""), "");
  gleich(formatMonthGerman("2026"), "2026");
  gleich(formatMonthGerman("2026-13"), "2026-13");
});

/*
  AUFTEILUNG AUF BUERO UND AUSSENDIENST

  Bis 0.9.22 rundete `ClockInWidget` beide Haelften unabhaengig und bildete die
  Dauer der Schicht aus ihrer Summe. Gemessen an der laufenden App am
  2026-09-07: 08:00 bis 16:30 mit 45 Minuten Pause sind 7,75 Stunden, verbucht
  wurden 3,88 + 3,88 = 7,76. Die Abweichung ging immer nach oben und landete
  als Arbeitszeit im Bericht an die Vertriebsleitung.

  Die Pruefung dreht sich deshalb um EINE Zusicherung: Die beiden Teile
  ergeben zusammen exakt die Netto-Zeit -- bei jedem Anteil.
*/
gruppe("Arbeitszeit aufteilen");

  pruefe("halbe-halbe bei 7,75 Stunden ergibt wieder 7,75", () => {
    const t = teileArbeitszeit(7.75, 0.5);
    gleich(t.buero, 3.88);
    gleich(t.aussendienst, 3.87);
    gleich(Math.round((t.buero + t.aussendienst) * 100) / 100, 7.75, "Summe weicht ab");
  });

  pruefe("die Summe stimmt bei jedem Anteil und jeder Viertelstunde", () => {
    for (let viertel = 1; viertel <= 40; viertel++) {
      const netto = viertel * 0.25;
      for (let prozent = 0; prozent <= 100; prozent += 5) {
        const t = teileArbeitszeit(netto, prozent / 100);
        const summe = Math.round((t.buero + t.aussendienst) * 100) / 100;
        gleich(summe, netto, `Anteil ${prozent} % bei ${netto} h`);
      }
    }
  });

  pruefe("Randfaelle: ganz Buero, ganz Aussendienst, nichts", () => {
    gleich(teileArbeitszeit(7.75, 1), { buero: 7.75, aussendienst: 0 });
    gleich(teileArbeitszeit(7.75, 0), { buero: 0, aussendienst: 7.75 });
    gleich(teileArbeitszeit(0, 0.5), { buero: 0, aussendienst: 0 });
    gleich(teileArbeitszeit(-3, 0.5), { buero: 0, aussendienst: 0 });
    gleich(teileArbeitszeit(NaN, 0.5), { buero: 0, aussendienst: 0 });
  });

  pruefe("unbrauchbarer Anteil gilt als halbe-halbe", () => {
    gleich(teileArbeitszeit(8, NaN), { buero: 4, aussendienst: 4 });
    gleich(teileArbeitszeit(8, 5), { buero: 8, aussendienst: 0 }, "ueber 1 wird gekappt");
    gleich(teileArbeitszeit(8, -2), { buero: 0, aussendienst: 8 }, "unter 0 wird gekappt");
  });
