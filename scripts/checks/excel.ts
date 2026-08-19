import * as XLSX from "xlsx";
import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { exportTimeLogsToExcel } from "../../src/utils/excelUtils";
import type { SectionsConfig, ReportData, HistoryRecord } from "../../src/types";

/*
  Der Report-Export selbst wird nicht mehr hier geprueft, sondern in
  checks/vorlage.ts: Seit 0.9.11 ist Blatt 1 die Firmenvorlage der
  Vertriebsleitung und wird mit ExcelJS befuellt, weil SheetJS keine
  Zellformatierung schreibt (gemessen -- die gelbe Markierung der
  Eingabefelder ueberlebte den Umlauf nicht). Hier bleibt nur der
  Zeiterfassungs-Export, der weiterhin ueber SheetJS laeuft.
*/

const felder: SectionsConfig = {
  s1: [
    { id: "vf_schule", label: "Vorführungen Schule", step: 1 },
    { id: "vf_arbeit", label: "Vorführungen Arbeitsplatz", step: 1 },
  ],
  s2: [{ id: "aus_schule", label: "Auslieferungen Schule", step: 1 }],
  s3: [{ id: "spez_a", label: "Spezialprodukt A", step: 1 }],
  s4: [{ id: "std_buero", label: "Bürostunden", step: 0.5 }],
};

const werte = { vf_schule: 4, vf_arbeit: 8, aus_schule: 12, spez_a: 2, std_buero: 7.5 };
const schichten = [
  { id: "tl1", date: "2026-08-03", clockIn: "08:00", clockOut: "16:30", breakMinutes: 45, duration: 7.75, officeRatio: 0.5, officeHours: 3.875, fieldHours: 3.875 },
];

const laufend: ReportData = {
  month: "2026-08", name: "Marc Petry", notes: "Messe Frankfurt.", values: werte, timeLogs: schichten,
};
const archiviert: HistoryRecord = {
  month: "2026-08", name: "Marc Petry", notes: "Messe Frankfurt.", values: werte,
  fieldsSnapshot: felder, savedAt: "2026-08-31T10:00:00.000Z", timeLogs: schichten,
};

const alsText = (wbout: unknown) => {
  const wb = XLSX.read(wbout, { type: "array" });
  return wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: " | " })).join("\n");
};
/** ohne die ersten drei Kopfzeilen (dort steht die Archiv-Kennzeichnung) */
const rumpf = (t: string) => t.split("\n").slice(3).join("\n");

gruppe("Zeiterfassungs-Export");

pruefe("ohne Schichten kommt null zurück", async () => {
  gleich(await exportTimeLogsToExcel({ ...laufend, timeLogs: [] }, false), null);
});

pruefe("Formular und Archiv erzeugen dieselbe Datei", async () => {
  const ausFormular = await exportTimeLogsToExcel(laufend, false);
  const ausArchiv = await exportTimeLogsToExcel(archiviert, true);
  wahr(ausFormular !== null && ausArchiv !== null);
  gleich(rumpf(alsText(ausArchiv!.wbout)), rumpf(alsText(ausFormular!.wbout)));
});

pruefe("Schichten werden nach Datum sortiert", async () => {
  const unsortiert = [
    { ...schichten[0], id: "b", date: "2026-08-09" },
    { ...schichten[0], id: "a", date: "2026-08-01" },
  ];
  const r = await exportTimeLogsToExcel({ ...laufend, timeLogs: unsortiert }, false);
  const text = alsText(r!.wbout);
  wahr(text.indexOf("01.08.2026") < text.indexOf("09.08.2026"), "Reihenfolge stimmt nicht");
});
