import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { pruefeMonatsabschluss } from "../../src/utils/abschlussCheck";
import type { ReportData, TimeLog } from "../../src/types";

/*
  Die Plausibilitaetspruefung vor dem Senden an die Vertriebsleitung. Sie
  entscheidet, worauf der Nutzer VOR dem Absenden hingewiesen wird -- eine
  falsch-negative Regel laesst einen leeren oder widerspruechlichen Bericht
  durchgehen, eine falsch-positive nervt jeden Monat mit einem Hinweis, den
  man wegklickt (und dann auch die echten wegklickt).

  Lag bis 0.9.14 als getReportWarnings mitten in App.tsx und war damit
  ungeprueft.
*/

const anAus = { enableTimeTracking: true };
const uhrAus = { enableTimeTracking: false };

const schicht = (datum: string, buero: number, feld: number): TimeLog => ({
  id: "t" + datum, date: datum, clockIn: "08:00", clockOut: "16:30",
  breakMinutes: 30, duration: buero + feld, officeRatio: 0.5,
  officeHours: buero, fieldHours: feld,
});

const basis: ReportData = {
  month: "2026-08",
  name: "Marc Petry",
  notes: "",
  values: { vf_schule: 3, tage_arbeit: 20, std_buero: 40, std_aussendienst: 40 },
  timeLogs: [],
};

gruppe("Monatsabschluss-Check");

pruefe("ein vollständiger Bericht erzeugt keine Warnung", () => {
  gleich(pruefeMonatsabschluss(basis, anAus), []);
});

pruefe("fehlender Name wird gemeldet", () => {
  const w = pruefeMonatsabschluss({ ...basis, name: "" }, anAus);
  wahr(w.some((t) => t.includes("Name")), JSON.stringify(w));
  // Leerzeichen zaehlen nicht als Name
  wahr(pruefeMonatsabschluss({ ...basis, name: "   " }, anAus).some((t) => t.includes("Name")));
});

pruefe("ein leerer Bericht wird gemeldet", () => {
  const w = pruefeMonatsabschluss({ ...basis, values: {} }, anAus);
  wahr(w.some((t) => t.includes("leer")), JSON.stringify(w));
});

pruefe("Nullwerte gelten als leer", () => {
  // Sonst haette ein Bericht mit lauter Nullen den Check bestanden.
  const w = pruefeMonatsabschluss({ ...basis, values: { vf_schule: 0, tage_arbeit: 0 } }, anAus);
  wahr(w.some((t) => t.includes("leer")), JSON.stringify(w));
});

pruefe("zu wenige Arbeitstage gegenüber den Schichten werden gemeldet", () => {
  const daten: ReportData = {
    ...basis,
    values: { ...basis.values, tage_arbeit: 2 },
    timeLogs: [schicht("2026-08-03", 4, 4), schicht("2026-08-04", 4, 4), schicht("2026-08-05", 4, 4)],
  };
  const w = pruefeMonatsabschluss(daten, anAus);
  wahr(w.some((t) => t.includes("2 Arbeitstage") && t.includes("3 Tagen")), JSON.stringify(w));
});

pruefe("mehrere Schichten am selben Tag zählen als ein Tag", () => {
  // Sonst meldete der Check bei geteilten Diensten grundlos.
  const daten: ReportData = {
    ...basis,
    values: { ...basis.values, tage_arbeit: 1, std_buero: 8, std_aussendienst: 8 },
    timeLogs: [schicht("2026-08-03", 4, 4), schicht("2026-08-03", 4, 4)],
  };
  const w = pruefeMonatsabschluss(daten, anAus);
  wahr(!w.some((t) => t.includes("Arbeitstage")), JSON.stringify(w));
});

pruefe("abweichende Stundensummen werden gemeldet", () => {
  const daten: ReportData = {
    ...basis,
    values: { ...basis.values, tage_arbeit: 1, std_buero: 2, std_aussendienst: 2 },
    timeLogs: [schicht("2026-08-03", 4, 4)],
  };
  const w = pruefeMonatsabschluss(daten, anAus);
  wahr(w.some((t) => t.includes("4.0 h") && t.includes("8.0 h")), JSON.stringify(w));
});

pruefe("eine Abweichung von genau einer Stunde wird noch geduldet", () => {
  // Die Toleranz gibt es, weil die Stempeluhr auf zwei Nachkommastellen
  // rundet und von Hand nachgetragene Zeiten selten exakt passen.
  const daten: ReportData = {
    ...basis,
    values: { ...basis.values, tage_arbeit: 1, std_buero: 4, std_aussendienst: 3 },
    timeLogs: [schicht("2026-08-03", 4, 4)],
  };
  wahr(!pruefeMonatsabschluss(daten, anAus).some((t) => t.includes("weichen")));
});

pruefe("bei abgeschalteter Stempeluhr entfallen die Schicht-Regeln", () => {
  // Wer die Uhr nicht nutzt, traegt die Stunden von Hand ein -- ein Abgleich
  // gegen eine leere Uhr waere dann nur laestig.
  const daten: ReportData = {
    ...basis,
    values: { ...basis.values, tage_arbeit: 1, std_buero: 0, std_aussendienst: 0 },
    timeLogs: [schicht("2026-08-03", 4, 4), schicht("2026-08-04", 4, 4)],
  };
  wahr(pruefeMonatsabschluss(daten, anAus).length > 0, "mit Uhr sollte es warnen");
  gleich(pruefeMonatsabschluss(daten, uhrAus), []);
});

pruefe("ohne Daten wird gewarnt statt zu werfen", () => {
  const w = pruefeMonatsabschluss(null, anAus);
  wahr(w.length >= 2, JSON.stringify(w));
});
