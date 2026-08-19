import ExcelJS from "exceljs";
import { gruppe, pruefe, gleich, wahr } from "../helfer";
import {
  erzeugeVorlagenDatei,
  FELD_ZU_ZELLE,
  ZELLE_MONAT,
  ZELLE_NAME,
  ZELLE_KOMMENTAR,
  BLATT_ZUSATZ,
  BLATT_ZEITEN,
  monatFuerVorlage,
} from "../../src/utils/vorlageExport";
import { VORLAGE_BLATTNAME } from "../../src/utils/vorlageMonatsinfo";
import type { SectionsConfig, ReportData, HistoryRecord } from "../../src/types";

/*
  Diese Pruefungen sichern die Zusage an die Vertriebsleitung ab: Blatt 1 IST
  ihre Vorlage, nicht ein Nachbau. Verrutscht die Feldzuordnung -- etwa weil
  jemand die Reihenfolge der Standardfelder aendert -- landen Zahlen in den
  falschen Zeilen, und das faellt in einer fertigen Excel-Datei niemandem auf.
*/

const felder: SectionsConfig = {
  s1: [
    { id: "vf_schule", label: "Anzahl Vorführungen Schule/Bildung", step: 1 },
    { id: "vf_arbeit", label: "Anzahl Vorführungen Arbeitsplatz", step: 1 },
    { id: "aus_schule", label: "Anzahl Auslieferungen Schule/Bildung", step: 1 },
    { id: "aus_arbeit", label: "Anzahl Auslieferungen Arbeitsplatz", step: 1 },
  ],
  s2: [
    { id: "schul_vorort", label: "Anzahl Schulungen/Support", step: 1 },
    { id: "schul_tel", label: "Anzahl Schulung/Support Telefon", step: 1 },
    { id: "akquise", label: "Anzahl Akquisetermine", step: 1 },
    { id: "messen", label: "Anzahl Teilnahme Veranstaltungen", step: 1 },
  ],
  s3: [
    { id: "tac_vf", label: "Anzahl Vorführungen Tactonom", step: 1 },
    { id: "envision_vf", label: "Anzahl Vorführungen Envision", step: 1 },
    { id: "feel_vf", label: "Anzahl Vorführungen Feelspace", step: 1 },
    { id: "wewalk_vf", label: "Anzahl Vorführungen WeWalk", step: 1 },
    { id: "wewalk_tel", label: "Anzahl telefonische Einweisungen WeWalk", step: 1 },
  ],
  s4: [
    { id: "tage_arbeit", label: "Arbeitstage (ohne Urlaub/Krankheit)", step: 1 },
    { id: "std_buero", label: "Stunden Büro/Innendienst", step: 0.5 },
    { id: "std_aussendienst", label: "Stunden Außendienst/Reisezeit", step: 0.5 },
    { id: "tage_urlaub", label: "Genommene Urlaubstage", step: 1 },
    { id: "eigenes", label: "Eigenes Zusatzfeld", step: 1, isCustom: true },
  ],
};

const werte: Record<string, number> = {
  vf_schule: 3, vf_arbeit: 5, aus_schule: 2, aus_arbeit: 1,
  schul_vorort: 7, schul_tel: 12, akquise: 4, messen: 1,
  tac_vf: 2, envision_vf: 6, feel_vf: 0, wewalk_vf: 3, wewalk_tel: 9,
  tage_arbeit: 20, std_buero: 38.5,
  std_aussendienst: 42.5, tage_urlaub: 2, eigenes: 11,
};

const schichten = [
  { id: "t1", date: "2026-08-09", clockIn: "08:00", clockOut: "16:30", breakMinutes: 45, duration: 7.75, officeRatio: 0.5, officeHours: 3.875, fieldHours: 3.875 },
  { id: "t2", date: "2026-08-03", clockIn: "09:00", clockOut: "17:00", breakMinutes: 30, duration: 7.5, officeRatio: 0.5, officeHours: 3.75, fieldHours: 3.75 },
];

const laufend: ReportData = {
  month: "2026-08",
  name: "Marc Petry",
  notes: "Messe Frankfurt, Umlaute äöüß.",
  values: werte,
  timeLogs: schichten,
};

const archiviert: HistoryRecord = {
  ...laufend,
  fieldsSnapshot: felder,
  savedAt: "2026-08-31T10:00:00.000Z",
};

const lade = async (data: ReportData | HistoryRecord) => {
  const bytes = await erzeugeVorlagenDatei(data, felder);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes.buffer as ArrayBuffer);
  return wb;
};

gruppe("Export in der Firmenvorlage");

pruefe("Monatsformat folgt der Vorgabe MM/JJJJ aus D3", () => {
  gleich(monatFuerVorlage("2026-08"), "08/2026");
  gleich(monatFuerVorlage("2026-12"), "12/2026");
  // Unbrauchbare Eingabe unveraendert durchreichen statt etwas zu erfinden
  gleich(monatFuerVorlage("Unsinn"), "Unsinn");
  gleich(monatFuerVorlage(""), "");
});

pruefe("die drei Blätter heißen wie vereinbart", async () => {
  const wb = await lade(laufend);
  gleich(wb.worksheets.map((w) => w.name), [VORLAGE_BLATTNAME, BLATT_ZUSATZ, BLATT_ZEITEN]);
});

pruefe("jeder Zähler landet in seiner Zelle der Vorlage", async () => {
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(VORLAGE_BLATTNAME)!;
  const gefunden: Record<string, unknown> = {};
  const erwartet: Record<string, unknown> = {};
  for (const [id, zelle] of Object.entries(FELD_ZU_ZELLE)) {
    gefunden[zelle] = ws.getCell(zelle).value;
    erwartet[zelle] = werte[id];
  }
  gleich(gefunden, erwartet);
});

pruefe("Monat, Name und Kommentar stehen an der richtigen Stelle", async () => {
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(VORLAGE_BLATTNAME)!;
  gleich(ws.getCell(ZELLE_MONAT).value, "08/2026");
  gleich(ws.getCell(ZELLE_NAME).value, "Marc Petry");
  gleich(ws.getCell(ZELLE_KOMMENTAR).value, "Messe Frankfurt, Umlaute äöüß.");
});

pruefe("die Summenformel in D10 bleibt eine Formel", async () => {
  // Nicht durch eine ausgerechnete Zahl ersetzen: Die Vertriebsleitung
  // erwartet ein rechnendes Blatt. Als .xls geschrieben ginge sie verloren --
  // deshalb ist .xlsx gesetzt.
  const wb = await lade(laufend);
  const zelle = wb.getWorksheet(VORLAGE_BLATTNAME)!.getCell("D10");
  gleich((zelle.value as { formula?: string })?.formula, "SUM(D6:D9)");
});

pruefe("die gelbe Markierung der Eingabefelder überlebt", async () => {
  // Genau das kann die sonst genutzte Bibliothek nicht -- gemessen: nach einem
  // SheetJS-Umlauf kam FFFF99 in der Datei nirgends mehr vor.
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(VORLAGE_BLATTNAME)!;
  const ohneFuellung = [ZELLE_MONAT, ZELLE_NAME, ZELLE_KOMMENTAR, ...Object.values(FELD_ZU_ZELLE)]
    .filter((adr) => {
      const f = ws.getCell(adr).fill as { type?: string; pattern?: string } | undefined;
      return !f || f.pattern !== "solid";
    });
  gleich(ohneFuellung, []);
});

pruefe("Fettdruck, Rahmen und verbundene Bereiche bleiben erhalten", async () => {
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(VORLAGE_BLATTNAME)!;
  wahr(ws.getCell("B1").font?.bold === true, "Überschrift B1 ist nicht mehr fett");
  const rahmen = ws.getCell("D6").border;
  wahr(!!(rahmen?.top && rahmen?.bottom && rahmen?.left && rahmen?.right), "D6 hat keinen Rahmen mehr");
  gleich((ws.model.merges || []).length, 22);
});

pruefe("Spaltenbreiten und Zeilenhöhen der Vorlage bleiben stehen", async () => {
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(VORLAGE_BLATTNAME)!;
  // C ist die breite Beschriftungsspalte, D die Wertespalte
  wahr(Math.round(ws.getColumn(3).width || 0) === 56, `Spalte C ist ${ws.getColumn(3).width}`);
  wahr(Math.round(ws.getColumn(4).width || 0) === 26, `Spalte D ist ${ws.getColumn(4).width}`);
  gleich(ws.getRow(6).height, 20.1);
});

pruefe("Felder ohne Zeile in der Vorlage stehen auf Blatt 2", async () => {
  const wb = await lade(laufend);
  const zusatz = wb.getWorksheet(BLATT_ZUSATZ)!;
  const text: string[] = [];
  zusatz.eachRow((zeile) => {
    text.push(zeile.values ? JSON.stringify(zeile.values) : "");
  });
  const alles = text.join("\n");
  for (const label of ["Stunden Außendienst/Reisezeit", "Genommene Urlaubstage", "Eigenes Zusatzfeld"]) {
    wahr(alles.includes(label), `"${label}" fehlt auf Blatt 2`);
  }
  // und ihre Werte
  for (const v of [42.5, 2, 11]) wahr(alles.includes(String(v)), `Wert ${v} fehlt auf Blatt 2`);
});

pruefe("kein Feld der Vorlage taucht zusätzlich auf Blatt 2 auf", async () => {
  // Sonst stünde dieselbe Zahl doppelt in der Datei und man weiß nicht, welche gilt.
  const wb = await lade(laufend);
  const zusatz = wb.getWorksheet(BLATT_ZUSATZ)!;
  const text: string[] = [];
  zusatz.eachRow((zeile) => text.push(JSON.stringify(zeile.values)));
  const alles = text.join("\n");
  for (const label of [
    "Anzahl Vorführungen Schule/Bildung",
    "Anzahl Vorführungen Envision",
    "Stunden Büro/Innendienst",
  ]) {
    wahr(!alles.includes(label), `"${label}" steht doppelt (Vorlage und Blatt 2)`);
  }
});

pruefe("Schichten stehen auf Blatt 3, nach Datum sortiert", async () => {
  const wb = await lade(laufend);
  const zeiten = wb.getWorksheet(BLATT_ZEITEN)!;
  const text: string[] = [];
  zeiten.eachRow((zeile) => text.push(JSON.stringify(zeile.values)));
  const alles = text.join("\n");
  wahr(alles.indexOf("03.08.2026") < alles.indexOf("09.08.2026"), "Reihenfolge stimmt nicht");
});

pruefe("Formular und Archiv erzeugen dieselbe Datei", async () => {
  // Bis 0.9.0 liefen beide Wege auseinander -- derselbe Monat sah je nach
  // Ausloeser anders aus.
  const ausFormular = await lade(laufend);
  const ausArchiv = await lade(archiviert);
  const zellen = (wb: ExcelJS.Workbook) => {
    const ws = wb.getWorksheet(VORLAGE_BLATTNAME)!;
    return [ZELLE_MONAT, ZELLE_NAME, ZELLE_KOMMENTAR, ...Object.values(FELD_ZU_ZELLE)]
      .map((a) => `${a}=${JSON.stringify(ws.getCell(a).value)}`);
  };
  gleich(zellen(ausArchiv), zellen(ausFormular));
});

pruefe("ein leerer Monat erzeugt Nullen statt leerer Zellen", async () => {
  // Eine leere Zelle liest sich in Excel wie "nicht ausgefüllt"; 0 ist eine
  // Aussage. Die Vertriebsleitung soll beides unterscheiden können.
  const wb = await lade({ month: "2026-09", name: "", notes: "", values: {} });
  const ws = wb.getWorksheet(VORLAGE_BLATTNAME)!;
  gleich(ws.getCell("D6").value, 0);
  gleich(ws.getCell("D25").value, 0);
  gleich(ws.getCell(ZELLE_MONAT).value, "09/2026");
});
