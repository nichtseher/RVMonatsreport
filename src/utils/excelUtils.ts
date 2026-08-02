import { ReportData, HistoryRecord, SectionsConfig } from "../types";
import { formatMonthGerman } from "./dateUtils";

/**
 * Einzige Quelle fuer alle Excel-Exporte.
 *
 * Vorher gab es die Logik zweimal: einmal hier (fuer das RV Archiv) und einmal
 * direkt in App.tsx (fuer den laufenden Monat). Beide Fassungen waren
 * auseinandergelaufen -- der Export desselben Monats sah verschieden aus, je
 * nachdem ob er aus dem Formular oder aus dem Archiv angestossen wurde:
 * andere Summenbeschriftung ("Gesamt" statt "Gesamt (Bereich 1)"), im
 * Archiv-Export fehlte der Kommentarblock, wenn kein Kommentar vorhanden war,
 * andere Spaltenbreiten und ein anderer Blattname. Fuer die Vertriebsleitung
 * bedeutet das zwei unterschiedlich aussehende Dokumente fuer denselben
 * Sachverhalt.
 *
 * Massgeblich ist ab jetzt die Fassung, die bisher der laufende Monat
 * erzeugt hat -- das ist das Dokument, das die VL tatsaechlich bekommt.
 */

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Wie die Datei beim Nutzer gelandet ist. */
export type ExportDelivery = "geteilt" | "heruntergeladen" | "abgebrochen";

export const exportReportToExcel = async (
  data: ReportData | HistoryRecord,
  appFields: SectionsConfig,
  isArchive: boolean = false
) => {
  const XLSX = await import("xlsx");

  const monthVal = data.month || "Monat";
  const nameVal = data.name || "Mitarbeitende_r";

  const getVal = (id: string) => {
    const val = (data.values || {})[id];
    return typeof val === "number" ? val : 0;
  };

  // Archivierte Monate bringen ihren eigenen Feld-Aufbau mit: Kategorien
  // koennen sich seither geaendert haben.
  const fields =
    "fieldsSnapshot" in data && data.fieldsSnapshot ? data.fieldsSnapshot : appFields;

  const excelRows: any[][] = [];
  excelRows.push([
    isArchive
      ? "MONATSÜBERSICHT AUßENDIENST - HISTORISCH"
      : "MONATSÜBERSICHT AUßENDIENST - BARRIEREFREI",
  ]);
  excelRows.push([
    `Erstellt mit der barrierefreien RV Mobil App${isArchive ? " (Archiv)" : ""}`,
  ]);
  excelRows.push([]);
  excelRows.push(["Monat / Jahr:", formatMonthGerman(monthVal)]);
  excelRows.push(["Name (Mitarbeiter/in):", nameVal]);
  excelRows.push([]);

  /** Einen Bereich anlegen und die 1-basierte Excel-Zeile der Summe zurueckgeben. */
  const addSection = (
    title: string,
    valueHeader: string,
    totalLabel: string,
    sectionFields: { id: string; label: string }[]
  ): number => {
    excelRows.push([title, valueHeader]);
    const startRow = excelRows.length + 1;
    sectionFields.forEach((i) => {
      excelRows.push([i.label, getVal(i.id)]);
    });
    const endRow = excelRows.length;
    excelRows.push([totalLabel, { t: "n", f: `SUM(B${startRow}:B${endRow})` }]);
    const totalRow = excelRows.length;
    excelRows.push([]);
    return totalRow;
  };

  const totalS1Row = addSection(
    "1. VORFÜHRUNGEN & AUSLIEFERUNGEN",
    "Anzahl / Zählerstand",
    "Gesamt (Bereich 1)",
    fields.s1
  );
  const totalS2Row = addSection(
    "2. SCHULUNG, SUPPORT & AKQUISE",
    "Anzahl / Zählerstand",
    "Gesamt (Bereich 2)",
    fields.s2
  );
  const totalS3Row = addSection(
    "3. SPEZIALPRODUKTE (DETAILS)",
    "Anzahl / Zählerstand",
    "Gesamt (Bereich 3)",
    fields.s3
  );
  addSection(
    "4. ARBEITSZEIT & BÜRO",
    "Wert / Stunden",
    "Gesamt (Bereich 4)",
    fields.s4
  );

  // Summary section
  excelRows.push(["GESAMT-ZUSAMMENFASSUNG"]);
  excelRows.push([
    "Gesamt-Aktivitäten (Bereich 1 + 2 + 3)",
    { t: "n", f: `B${totalS1Row}+B${totalS2Row}+B${totalS3Row}` },
  ]);
  excelRows.push([]);

  excelRows.push(["Anmerkungen & Kommentare:"]);
  excelRows.push([data.notes || "Keine Anmerkungen eingetragen."]);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  ws["!cols"] = [{ wch: 54 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monatsreport");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return { wbout, monthVal, nameVal };
};

export const exportTimeLogsToExcel = async (
  data: ReportData | HistoryRecord,
  isArchive: boolean = false
) => {
  const XLSX = await import("xlsx");
  const monthVal = data.month || "Monat";
  const nameVal = data.name || "Mitarbeitende_r";

  const logs = (
    Array.isArray(data.timeLogs) ? [...data.timeLogs] : []
  ).sort((a, b) => a.date.localeCompare(b.date));

  if (logs.length === 0) {
    return null; // Signals no data
  }

  const excelRows: any[][] = [];
  excelRows.push([
    `ARBEITSZEITERFASSUNG & STEMPELUHR - RV AUßENDIENST${isArchive ? " (HISTORISCH)" : ""}`,
  ]);
  excelRows.push([
    `Erstellt mit der barrierefreien RV Mobil App${isArchive ? " (Archiv)" : ""}`,
  ]);
  excelRows.push([]);
  excelRows.push(["Mitarbeiter/in:", nameVal]);
  excelRows.push(["Berichtsmonat:", formatMonthGerman(monthVal)]);
  excelRows.push([]);

  // Table Headers
  excelRows.push([
    "Datum",
    "Kommen",
    "Gehen",
    "Abzug Pause (Min)",
    "Netto-Stunden (h)",
    "Anteil Büro (h)",
    "Anteil Außendienst (h)",
    "Kommentar / Ort / Besuchte Schule",
  ]);

  const startRow = excelRows.length + 1;

  logs.forEach((log) => {
    const [y, m, d] = log.date.split("-");
    const formattedDate = y && m && d ? `${d}.${m}.${y}` : log.date;
    excelRows.push([
      formattedDate,
      log.clockIn,
      log.clockOut,
      log.breakMinutes,
      log.duration,
      log.officeHours,
      log.fieldHours,
      log.notes || "",
    ]);
  });

  const endRow = excelRows.length;

  // Sums Row
  excelRows.push([
    "GESAMT",
    "",
    "",
    "",
    { t: "n", f: `SUM(E${startRow}:E${endRow})` },
    { t: "n", f: `SUM(F${startRow}:F${endRow})` },
    { t: "n", f: `SUM(G${startRow}:G${endRow})` },
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  ws["!cols"] = [
    { wch: 12 }, // Datum
    { wch: 10 }, // Kommen
    { wch: 10 }, // Gehen
    { wch: 18 }, // Pause
    { wch: 18 }, // Netto
    { wch: 16 }, // Büro
    { wch: 22 }, // Außendienst
    { wch: 45 }, // Kommentar
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Arbeitszeiten");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return { wbout, monthVal, nameVal };
};

/**
 * Datei ausliefern: bevorzugt ueber das Teilen-Menue des Geraets (auf dem
 * Handy landet die Datei so direkt in Mail/Teams), sonst als Download.
 *
 * Bricht der Nutzer das Teilen-Menue ab, wird bewusst NICHTS heruntergeladen
 * und auch kein Fehler gemeldet -- "abgebrochen" ist ein normaler Ausgang.
 * (Vorher lud der Formular-Export nach einem Abbruch ueberraschend doch noch
 * herunter, waehrend der Archiv-Export "Fehler beim Exportieren" meldete.)
 */
export const triggerFileDownload = async (
  wbout: any,
  fileName: string,
  shareText?: string
): Promise<ExportDelivery> => {
  const file = new File([wbout], fileName, { type: XLSX_MIME });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: fileName,
        text: shareText || fileName,
        files: [file],
      });
      return "geteilt";
    } catch (err: any) {
      if (err && err.name === "AbortError") return "abgebrochen";
      console.warn("Teilen nicht möglich, Datei wird heruntergeladen.", err);
    }
  }

  const blob = new Blob([wbout], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return "heruntergeladen";
};
