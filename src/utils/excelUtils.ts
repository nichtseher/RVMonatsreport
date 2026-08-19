import { ReportData, HistoryRecord, SectionsConfig } from "../types";
import { formatMonthGerman } from "./dateUtils";

/**
 * Zeiterfassungs-Export und die gemeinsame Dateiauslieferung.
 *
 * Der MONATSREPORT liegt seit 0.9.11 nicht mehr hier, sondern in
 * utils/vorlageExport.ts: Blatt 1 ist dort die Firmenvorlage der
 * Vertriebsleitung selbst, befuellt mit ExcelJS. Grund ist gemessen und nicht
 * verhandelbar -- SheetJS in der Community-Fassung schreibt keine
 * Zellformatierung, nach einem Umlauf war die gelbe Markierung der
 * Eingabefelder vollstaendig verschwunden.
 *
 * Hier bleibt der separate Stundenzettel-Export (reine Datentabelle, keine
 * Vorlage) und `triggerFileDownload`, das beide Wege gemeinsam nutzen.
 */

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Wie die Datei beim Nutzer gelandet ist. */
export type ExportDelivery = "geteilt" | "heruntergeladen" | "abgebrochen";

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
