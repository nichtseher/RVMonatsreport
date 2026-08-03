import { gruppe, pruefe, gleich } from "../helfer";
import { berechneNettoStunden } from "../../src/utils/timeUtils";
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
