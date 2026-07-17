import { ReportData, HistoryRecord, SectionsConfig, TimeLog } from "../types";
import { formatMonthGerman } from "./dateUtils";

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

  const fields = ("fieldsSnapshot" in data && data.fieldsSnapshot) ? data.fieldsSnapshot : appFields;

  const excelRows: any[][] = [];
  excelRows.push([isArchive ? "MONATSÜBERSICHT AUßENDIENST - HISTORISCH" : "MONATSÜBERSICHT AUßENDIENST - BARRIEREFREI"]);
  excelRows.push([`Erstellt mit der barrierefreien RV Mobil App${isArchive ? " (Archiv)" : ""}`]);
  excelRows.push([]);
  excelRows.push(["Monat / Jahr:", isArchive ? formatMonthGerman(monthVal) : monthVal]);
  excelRows.push(["Name (Mitarbeiter/in):", nameVal]);
  excelRows.push([]);

  const addSection = (title: string, sectionFields: any[]) => {
    excelRows.push([title, "Anzahl / Zählerstand"]);
    const startRow = excelRows.length + 1;
    sectionFields.forEach((i) => {
      excelRows.push([i.label, getVal(i.id)]);
    });
    const endRow = excelRows.length;
    excelRows.push([
      `Gesamt`,
      { t: "n", f: `SUM(B${startRow}:B${endRow})` },
    ]);
    excelRows.push([]);
    return excelRows.length - 1; // row index for the sum
  };

  const totalS1Row = addSection("1. VORFÜHRUNGEN & AUSLIEFERUNGEN", fields.s1);
  const totalS2Row = addSection("2. SCHULUNG, SUPPORT & AKQUISE", fields.s2);
  const totalS3Row = addSection("3. SPEZIALPRODUKTE (DETAILS)", fields.s3);
  
  excelRows.push(["4. ARBEITSZEIT & BÜRO", "Wert / Stunden"]);
  const startRowS4 = excelRows.length + 1;
  fields.s4.forEach((i) => {
    excelRows.push([i.label, getVal(i.id)]);
  });
  const endRowS4 = excelRows.length;
  excelRows.push([
    "Gesamt (Bereich 4)",
    { t: "n", f: `SUM(B${startRowS4}:B${endRowS4})` },
  ]);
  excelRows.push([]);

  // Summary section
  excelRows.push(["GESAMT-ZUSAMMENFASSUNG"]);
  excelRows.push([
    "Gesamt-Aktivitäten (Bereich 1 + 2 + 3)",
    { t: "n", f: `B${totalS1Row}+B${totalS2Row}+B${totalS3Row}` },
  ]);
  if (data.notes) {
    excelRows.push([]);
    excelRows.push(["Notizen / Bemerkungen:"]);
    excelRows.push([data.notes]);
  }

  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  ws["!cols"] = [{ wch: 45 }, { wch: 25 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monatsbericht");
  
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
  excelRows.push([`ARBEITSZEITERFASSUNG & STEMPELUHR - RV AUßENDIENST${isArchive ? " (HISTORISCH)" : ""}`]);
  excelRows.push([`Erstellt mit der barrierefreien RV Mobil App${isArchive ? " (Archiv)" : ""}`]);
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
  XLSX.utils.book_append_sheet(wb, ws, "Zeiterfassung");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return { wbout, monthVal, nameVal };
};

export const triggerFileDownload = (wbout: any, fileName: string) => {
  const file = new File([wbout], fileName, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    return navigator.share({
      title: fileName,
      text: fileName,
      files: [file],
    });
  } else {
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return Promise.resolve();
  }
};
