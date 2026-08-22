import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { baueZusammenfassung } from "../../src/utils/zusammenfassung";
import type { ReportData, SectionsConfig } from "../../src/types";

/*
  Der Text der Vorlesefunktion. Fuer blinde Nutzerinnen und Nutzer ist das die
  Kontrolle vor dem Senden -- sie hoeren sich den Monat an und entscheiden
  danach. Faellt hier still ein Bereich heraus, geht ein falscher Bericht im
  guten Glauben zur Vertriebsleitung; anders als auf dem Bildschirm gibt es
  keine zweite Wahrnehmung, die den Fehler bemerkt.

  Lag bis 0.9.14 mitten in App.tsx und war ungeprueft.
*/

const felder: SectionsConfig = {
  s1: [
    { id: "vf_schule", label: "Anzahl Vorführungen Schule/Bildung", step: 1 },
    { id: "vf_arbeit", label: "Anzahl Vorführungen Arbeitsplatz", step: 1 },
  ],
  s2: [{ id: "akquise", label: "Anzahl Akquisetermine", step: 1 }],
  s3: [{ id: "tac_vf", label: "Anzahl Vorführungen Tactonom", step: 1 }],
  s4: [{ id: "std_buero", label: "Stunden Büro/Innendienst", step: 0.5 }],
};

const basis: ReportData = {
  month: "2026-08",
  name: "Marc Petry",
  notes: "",
  values: {},
  timeLogs: [],
};

gruppe("Vorgelesene Zusammenfassung");

pruefe("Monat und Name stehen am Anfang", () => {
  const t = baueZusammenfassung(basis, felder);
  wahr(t.startsWith("Zusammenfassung für August 2026."), t.slice(0, 60));
  wahr(t.includes("Mitarbeiter: Marc Petry."), t.slice(0, 90));
});

pruefe("ohne Werte wird das ausdrücklich gesagt", () => {
  // Nicht einfach schweigen: Wer nur "Zusammenfassung fuer August" hoert,
  // weiss nicht, ob nichts erfasst ist oder die Ausgabe abbrach.
  const t = baueZusammenfassung(basis, felder);
  wahr(t.includes("Es wurden noch keine Werte für diesen Monat eingetragen."), t);
});

pruefe("nur Felder mit echtem Wert werden vorgelesen", () => {
  const t = baueZusammenfassung(
    { ...basis, values: { vf_schule: 3, vf_arbeit: 0 } },
    felder,
  );
  wahr(t.includes("Anzahl Vorführungen Schule/Bildung: 3"), t);
  // Die Null darf NICHT vorkommen -- sonst geht die relevante Zahl in einer
  // Minute Text unter.
  wahr(!t.includes("Anzahl Vorführungen Arbeitsplatz"), t);
});

pruefe("jeder der vier Bereiche wird mit seinem Namen angesagt", () => {
  const t = baueZusammenfassung(
    { ...basis, values: { vf_schule: 1, akquise: 2, tac_vf: 3, std_buero: 4 } },
    felder,
  );
  for (const titel of [
    "Im Bereich Vorführungen und Auslieferungen",
    "Im Bereich Schulung, Support und Akquise",
    "Im Bereich Spezialprodukte",
    "Im Bereich Arbeitszeit und Büro",
  ]) {
    wahr(t.includes(titel), `"${titel}" fehlt in: ${t}`);
  }
});

pruefe("die Reihenfolge folgt den Bereichen 1 bis 4", () => {
  // Sonst hoert man die Zahlen in wechselnder Ordnung und kann sie nicht
  // gegen das Formular abgleichen.
  const t = baueZusammenfassung(
    { ...basis, values: { vf_schule: 1, akquise: 2, tac_vf: 3, std_buero: 4 } },
    felder,
  );
  const pos = [
    t.indexOf("Vorführungen und Auslieferungen"),
    t.indexOf("Schulung, Support und Akquise"),
    t.indexOf("Spezialprodukte"),
    t.indexOf("Arbeitszeit und Büro"),
  ];
  gleich(pos, [...pos].sort((a, b) => a - b));
});

pruefe("Notizen werden mit vorgelesen", () => {
  const t = baueZusammenfassung({ ...basis, notes: "Messe Frankfurt" }, felder);
  wahr(t.includes("Notizen: Messe Frankfurt."), t);
});

pruefe("ein Monat mit nur Notizen gilt nicht als leer", () => {
  const t = baueZusammenfassung({ ...basis, notes: "Nur ein Vermerk" }, felder);
  wahr(t.includes("Bericht vollständig vorgelesen."), t);
  wahr(!t.includes("keine Werte"), t);
});

pruefe("Leerzeichen-Notizen zählen nicht als Inhalt", () => {
  const t = baueZusammenfassung({ ...basis, notes: "   " }, felder);
  wahr(t.includes("Es wurden noch keine Werte"), t);
});

pruefe("es endet immer mit einem Schlusssatz", () => {
  // Ohne ihn weiss man beim Zuhoeren nicht, ob der Bericht zu Ende ist.
  for (const daten of [basis, { ...basis, values: { vf_schule: 5 } }]) {
    const t = baueZusammenfassung(daten, felder);
    wahr(
      t.endsWith("Bericht vollständig vorgelesen.") ||
        t.endsWith("Es wurden noch keine Werte für diesen Monat eingetragen."),
      t.slice(-60),
    );
  }
});

pruefe("ohne Daten wird nichts geworfen", () => {
  const t = baueZusammenfassung(null, felder);
  wahr(t.length > 0 && t.includes("keine Werte"), t);
});

pruefe("eigene Kategorien werden mit vorgelesen", () => {
  // Ein selbst angelegtes Feld darf nicht stillschweigend fehlen.
  const eigene: SectionsConfig = {
    ...felder,
    s4: [...felder.s4, { id: "eigenes", label: "Eigene Kategorie", step: 1, isCustom: true }],
  };
  const t = baueZusammenfassung({ ...basis, values: { eigenes: 7 } }, eigene);
  wahr(t.includes("Eigene Kategorie: 7"), t);
});
