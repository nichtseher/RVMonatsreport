/**
 * Die gemeinsame Dateiauslieferung -- und nichts sonst.
 *
 * Beide Excel-Ausgaben liegen seit 0.9.33 in utils/vorlageExport.ts:
 * der Monatsreport in der Firmenvorlage (seit 0.9.11) und der separate
 * Stundenzettel (neu). Bis dahin baute dieser Ort den Stundenzettel ein
 * zweites Mal mit SheetJS -- dieselbe Tabelle, andere Bibliothek, 500 KB.
 *
 * Warum SheetJS ganz entfallen ist: Es konnte ohnehin nur den Stundenzettel,
 * weil es in der Community-Fassung keine Zellformatierung schreibt (gemessen
 * 2026-08-19 -- nach einem Umlauf war die gelbe Markierung der Eingabefelder
 * vollstaendig verschwunden, als .xls zusaetzlich die Formel in D10). ExcelJS
 * war also schon fuer den wichtigeren der beiden Wege gesetzt und kann den
 * anderen auch. Nebenbei faellt damit die einzige Abhaengigkeit weg, die
 * `npm audit` nicht sehen konnte: `xlsx` kam als Tarball von cdn.sheetjs.com
 * und lag ausserhalb der Registry.
 */

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Wie die Datei beim Nutzer gelandet ist. */
export type ExportDelivery = "geteilt" | "heruntergeladen" | "abgebrochen";

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
