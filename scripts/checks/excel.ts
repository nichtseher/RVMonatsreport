import ExcelJS from "exceljs";
import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { erzeugeZeitenDatei } from "../../src/utils/vorlageExport";
import type { SectionsConfig, ReportData, HistoryRecord } from "../../src/types";

/*
  Der separate Stundenzettel. Der Report-Export liegt in checks/vorlage.ts.

  Bis 0.9.32 lief dieser Weg ueber SheetJS und wurde hier auch so geprueft.
  Seit 0.9.33 baut ihn dieselbe Funktion, die auch Blatt 3 des Berichts baut
  (`baueZeitenBlatt`) -- eine Tabelle, eine Bibliothek. Genau deshalb bleiben
  diese Faelle bestehen: Sie sichern ab, dass der Stundenzettel dabei nicht
  stillschweigend ein anderer geworden ist.
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

/** Alle Zeilen des einzigen Blatts als Text, eine Zeile je Excel-Zeile. */
const alsText = async (wbout: Uint8Array) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(wbout.buffer as ArrayBuffer);
  const zeilen: string[] = [];
  wb.worksheets.forEach((ws) => {
    ws.eachRow((zeile) => zeilen.push(JSON.stringify(zeile.values)));
  });
  return zeilen.join("\n");
};
/** ohne die ersten drei Kopfzeilen (dort steht die Archiv-Kennzeichnung) */
const rumpf = (t: string) => t.split("\n").slice(3).join("\n");

gruppe("Zeiterfassungs-Export");

pruefe("ohne Schichten kommt null zurück", async () => {
  gleich(await erzeugeZeitenDatei({ ...laufend, timeLogs: [] }, false), null);
});

pruefe("das Blatt heißt weiterhin Arbeitszeiten", async () => {
  const r = await erzeugeZeitenDatei(laufend, false);
  wahr(r !== null);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(r!.wbout.buffer as ArrayBuffer);
  gleich(wb.worksheets.map((w) => w.name), ["Arbeitszeiten"]);
});

pruefe("Formular und Archiv erzeugen dieselbe Datei", async () => {
  const ausFormular = await erzeugeZeitenDatei(laufend, false);
  const ausArchiv = await erzeugeZeitenDatei(archiviert, true);
  wahr(ausFormular !== null && ausArchiv !== null);
  gleich(rumpf(await alsText(ausArchiv!.wbout)), rumpf(await alsText(ausFormular!.wbout)));
});

pruefe("Schichten werden nach Datum sortiert", async () => {
  const unsortiert = [
    { ...schichten[0], id: "b", date: "2026-08-09" },
    { ...schichten[0], id: "a", date: "2026-08-01" },
  ];
  const r = await erzeugeZeitenDatei({ ...laufend, timeLogs: unsortiert }, false);
  const text = await alsText(r!.wbout);
  wahr(text.indexOf("01.08.2026") < text.indexOf("09.08.2026"), "Reihenfolge stimmt nicht");
});

pruefe("die drei Summenformeln stehen in der GESAMT-Zeile", async () => {
  // Sie sind der Grund, warum der Stundenzettel ueberhaupt eine Excel-Datei
  // ist und keine Liste: Die Vertriebsleitung rechnet damit weiter.
  const r = await erzeugeZeitenDatei(laufend, false);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(r!.wbout.buffer as ArrayBuffer);
  const ws = wb.getWorksheet("Arbeitszeiten")!;
  let gesamt = 0;
  ws.eachRow((zeile, nr) => {
    if (String(zeile.getCell(1).value || "") === "GESAMT") gesamt = nr;
  });
  wahr(gesamt > 0, "keine GESAMT-Zeile gefunden");
  let kopfZeile = 0;
  ws.eachRow((zeile, nr) => {
    if (String(zeile.getCell(1).value || "") === "Datum") kopfZeile = nr;
  });
  wahr(kopfZeile > 0, "keine Kopfzeile gefunden");
  const formel = (spalte: number) => {
    const v = ws.getRow(gesamt).getCell(spalte).value as { formula?: string } | null;
    return v && typeof v === "object" ? v.formula : undefined;
  };
  // Der Bereich muss GENAU die Datenzeilen umfassen. Ein Abstand daneben
  // faellt in der fertigen Datei niemandem auf -- die Summe stimmt dann still
  // nicht, und die Vertriebsleitung rechnet damit weiter.
  const von = kopfZeile + 1;
  const bis = gesamt - 1;
  gleich(
    [formel(5), formel(6), formel(7)],
    [`SUM(E${von}:E${bis})`, `SUM(F${von}:F${bis})`, `SUM(G${von}:G${bis})`],
  );
});

pruefe("Umlaute überleben den Umlauf", async () => {
  // Der Kopf traegt "AUßENDIENST" und "Anteil Büro (h)". Ein doppelt
  // kodierter Umlauf faellt in einer fertigen Excel-Datei niemandem auf.
  const r = await erzeugeZeitenDatei(laufend, false);
  const text = await alsText(r!.wbout);
  wahr(text.includes("AUßENDIENST"), "Titelzeile verändert");
  wahr(text.includes("Anteil Büro (h)"), "Spaltenkopf verändert");
});
