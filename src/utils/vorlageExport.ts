import { ReportData, HistoryRecord, SectionsConfig, FieldConfig } from "../types";
import { VORLAGE_MONATSINFO_BASE64, VORLAGE_BLATTNAME } from "./vorlageMonatsinfo";
import { VORLAGE_STAND } from "./vorlageStand";
// Nur der Typ -- ExcelJS selbst wird erst beim Export nachgeladen (271 KB).
import type { Workbook as ExcelWorkbook } from "exceljs";
import { formatMonthGerman } from "./dateUtils";

/**
 * Export in der Firmenvorlage der Vertriebsleitung.
 *
 * Blatt 1 IST die Vorlage -- nicht ein Nachbau davon. Die Originaldatei wird
 * geladen und nur an den vorgesehenen Stellen befuellt; Beschriftungen,
 * gelbe Eingabefelder, Rahmen, verbundene Bereiche, Spaltenbreiten und die
 * Summenformel in D10 bleiben unangetastet.
 *
 * WARUM EXCELJS: Gemessen am 2026-08-19 -- das frueher hier genutzte
 * SheetJS schreibt in der Community-Fassung keine Zellformatierung. Nach einem
 * Lesen-und-Schreiben-Umlauf kam die Farbe FFFF99 in der Datei NIRGENDS mehr
 * vor, die styles.xml enthielt eine Schrift, keinen Fettdruck und zwei Rahmen.
 * Als .xls geschrieben ging zusaetzlich die Formel in D10 verloren. Damit ist
 * die Anforderung "Vorlage genau so verwenden" mit SheetJS nicht erfuellbar.
 *
 * Alles, was in der Vorlage keinen Platz hat, steht auf Blatt 2 und 3 -- damit
 * die Vertriebsleitung ihr gewohntes Blatt behaelt und die uebrigen Zahlen
 * trotzdem einzeln herauskopieren kann.
 */

/**
 * Welches Zaehlerfeld gehoert in welche Zelle der Vorlage.
 *
 * Die Zuordnung laeuft ueber die Feld-ID, nicht ueber die Beschriftung: Die
 * Wortlaute weichen an mehreren Stellen leicht voneinander ab (die Vorlage
 * sagt "Anzahl Schulungen / Support vor Ort (ohne Auslieferung)", die App
 * "Anzahl Schulungen/Support (ohne Auslieferung)"), und Beschriftungen sind
 * vom Nutzer aenderbar. IDs sind es nicht.
 *
 * Die Zellen stammen nicht aus dem Augenmass: In der Vorlage sind genau 20
 * Zellen gelb hinterlegt (FFFF99) -- das sind die vorgesehenen Eingabefelder.
 * D10 ist bewusst NICHT dabei, dort steht die Formel SUM(D6:D9).
 */
export const FELD_ZU_ZELLE: Record<string, string> = {
  vf_schule: "D6",
  vf_arbeit: "D7",
  aus_schule: "D8",
  aus_arbeit: "D9",
  schul_vorort: "D12",
  schul_tel: "D13",
  akquise: "D14",
  messen: "D16",
  tage_arbeit: "D18",
  std_buero: "D19",
  tac_vf: "D21",
  envision_vf: "D22",
  feel_vf: "D23",
  wewalk_vf: "D24",
  wewalk_tel: "D25",
};

/** Zellen ausserhalb der Zaehlerfelder. */
export const ZELLE_MONAT = "D3";
export const ZELLE_NAME = "D4";
export const ZELLE_KOMMENTAR = "B28";

export const BLATT_ZUSATZ = "RV Mobil - Zusatzangaben";
export const BLATT_ZEITEN = "RV Mobil - Arbeitszeiten";

/**
 * "2026-08" -> "08/2026".
 *
 * Die Vorlage gibt das Format in D3 selbst vor: Dort steht als Platzhalter
 * "MM/JJJJ". Der bisherige Export schrieb an dieser Stelle den ausgeschriebenen
 * Monat ("August 2026") -- das passt nicht zur Vorgabe und laesst sich in Excel
 * nicht als Datum weiterverarbeiten.
 */
export const monatFuerVorlage = (monat: string): string => {
  const treffer = /^(\d{4})-(\d{2})$/.exec(monat || "");
  if (!treffer) return monat || "";
  return `${treffer[2]}/${treffer[1]}`;
};

/** Base64 -> Bytes, ohne Umweg ueber fetch (die App muss offline koennen). */
const base64ZuBytes = (b64: string): Uint8Array => {
  const roh = atob(b64);
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return bytes;
};

/** Alle Felder aller vier Bereiche, in Anzeigereihenfolge. */
const alleFelder = (felder: SectionsConfig): FieldConfig[] => [
  ...(felder.s1 || []),
  ...(felder.s2 || []),
  ...(felder.s3 || []),
  ...(felder.s4 || []),
];

/**
 * Wie viel der Bericht enthalten soll.
 *
 * "vorlage" ist Blatt 1 allein -- das gewohnte Formular der Vertriebsleitung
 * und sonst nichts. "alle" haengt die beiden RV-Mobil-Blaetter an.
 *
 * Bewusst OHNE Vorgabewert an `erzeugeVorlagenDatei`: Ein stiller Standard,
 * der alles mitschickt, ist genau der Fehler, den die Wahl verhindern soll.
 * So muss jeder Aufrufer sich entscheiden, und der Compiler merkt es an.
 */
export type BlattUmfang = "vorlage" | "alle";

/** Die ersten sieben Spalten des Schichtenblatts -- auf beiden Wegen gleich. */
const ZEITEN_SPALTEN = [
  "Datum",
  "Kommen",
  "Gehen",
  "Abzug Pause (Min)",
  "Netto-Stunden (h)",
  "Anteil Büro (h)",
  "Anteil Außendienst (h)",
];

interface ZeitenBlattOptionen {
  blattName: string;
  /** Zeilen ueber der Tabelle; die erste wird als Titel gesetzt. */
  kopfZeilen: (string | number)[][];
  /** Die achte Spalte heisst auf den beiden Wegen unterschiedlich. */
  kommentarSpalte: string;
  /** Spaltenbreiten in Excel-Zeichen, acht Stueck. */
  breiten: number[];
}

/**
 * Das Schichtenblatt -- einmal als Blatt 3 des Berichts, einmal als eigene
 * Datei (Stundenzettel).
 *
 * Bis 0.9.32 stand diese Tabelle ZWEIMAL im Quelltext: hier mit ExcelJS und
 * in utils/excelUtils.ts noch einmal mit SheetJS. Dieselben acht Spalten,
 * dieselben drei Summenformeln, zwei Bibliotheken, 1,44 MB. Die zweite
 * Fassung ist mit 0.9.33 entfallen.
 */
const baueZeitenBlatt = (
  wb: ExcelWorkbook,
  data: ReportData | HistoryRecord,
  optionen: ZeitenBlattOptionen,
) => {
  const schichten = (Array.isArray(data.timeLogs) ? [...data.timeLogs] : []).sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  const blatt = wb.addWorksheet(optionen.blattName);
  blatt.columns = optionen.breiten.map((width) => ({ width }));

  optionen.kopfZeilen.forEach((inhalt, i) => {
    const zeile = blatt.addRow(inhalt);
    if (i === 0) zeile.font = { bold: true, size: 13 };
  });

  if (schichten.length === 0) {
    blatt.addRow(["Keine Schichten erfasst."]);
    return blatt;
  }

  const kopf = blatt.addRow([...ZEITEN_SPALTEN, optionen.kommentarSpalte]);
  kopf.font = { bold: true };

  const ersteZeile = blatt.rowCount + 1;
  schichten.forEach((s) => {
    const [j, m, t] = s.date.split("-");
    blatt.addRow([
      j && m && t ? `${t}.${m}.${j}` : s.date,
      s.clockIn,
      s.clockOut,
      s.breakMinutes,
      s.duration,
      s.officeHours,
      s.fieldHours,
      s.notes || "",
    ]);
  });
  const letzteZeile = blatt.rowCount;

  const summe = blatt.addRow(["GESAMT", "", "", "", null, null, null, ""]);
  summe.font = { bold: true };
  summe.getCell(5).value = { formula: `SUM(E${ersteZeile}:E${letzteZeile})` };
  summe.getCell(6).value = { formula: `SUM(F${ersteZeile}:F${letzteZeile})` };
  summe.getCell(7).value = { formula: `SUM(G${ersteZeile}:G${letzteZeile})` };
  return blatt;
};

/** Blatt 2: alles, was in der Vorlage keine Zeile hat. */
const baueZusatzBlatt = (
  wb: ExcelWorkbook,
  data: ReportData | HistoryRecord,
  felder: SectionsConfig,
  belegteFelder: Set<string>,
  wert: (id: string) => number,
) => {
  const uebrig = alleFelder(felder).filter((f) => !belegteFelder.has(f.id));

  const zusatz = wb.addWorksheet(BLATT_ZUSATZ);
  zusatz.columns = [{ width: 58 }, { width: 18 }];

  zusatz.addRow(["Zusatzangaben aus RV Mobil", ""]);
  zusatz.getRow(1).font = { bold: true, size: 13 };
  zusatz.addRow([
    "Diese Werte haben in der Vorlage der Vertriebsleitung keine Zeile.",
    "",
  ]);
  zusatz.addRow([`Formularfassung der Vorlage: ${VORLAGE_STAND}`, ""]);
  zusatz.addRow([`Monat: ${monatFuerVorlage(data.month)}`, ""]);
  zusatz.addRow([`Name: ${data.name || ""}`, ""]);
  zusatz.addRow([]);

  if (uebrig.length === 0) {
    zusatz.addRow(["Keine zusätzlichen Angaben erfasst.", ""]);
  } else {
    const kopf = zusatz.addRow(["Angabe", "Wert"]);
    kopf.font = { bold: true };
    uebrig.forEach((f) => zusatz.addRow([f.label, wert(f.id)]));
  }

  // Bereichssummen mitgeben: In der Vorlage gibt es nur die eine Summe D10.
  zusatz.addRow([]);
  const summenKopf = zusatz.addRow(["Summen je Bereich", "Wert"]);
  summenKopf.font = { bold: true };
  const bereichsNamen: Record<keyof SectionsConfig, string> = {
    s1: "1. Vorführungen & Auslieferungen",
    s2: "2. Schulung, Support & Akquise",
    s3: "3. Spezialprodukte",
    s4: "4. Arbeitszeit & Büro",
  };
  (["s1", "s2", "s3", "s4"] as (keyof SectionsConfig)[]).forEach((s) => {
    const summe = (felder[s] || []).reduce((a, f) => a + wert(f.id), 0);
    zusatz.addRow([bereichsNamen[s], summe]);
  });
  return zusatz;
};

export const erzeugeVorlagenDatei = async (
  data: ReportData | HistoryRecord,
  appFields: SectionsConfig,
  umfang: BlattUmfang,
  /**
   * Blatt 3 weglassen, obwohl `umfang` "alle" ist. Genau ein Fall: Die
   * Stempeluhr ist abgeschaltet -- dann ist ein Schichtenblatt (leer oder
   * mit Altbestand) keine Angabe, sondern ein Missverstaendnis.
   */
  mitZeitenblatt: boolean = true,
): Promise<Uint8Array> => {
  const ExcelJS = (await import("exceljs")).default;

  // Archivierte Monate bringen ihren eigenen Feldaufbau mit.
  const felder =
    "fieldsSnapshot" in data && data.fieldsSnapshot ? data.fieldsSnapshot : appFields;

  const wert = (id: string): number => {
    const v = (data.values || {})[id];
    return typeof v === "number" ? v : 0;
  };

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(base64ZuBytes(VORLAGE_MONATSINFO_BASE64).buffer as ArrayBuffer);

  /*
    Die Fassung des Formulars gehoert in JEDE erzeugte Datei, auch in die
    mit nur Blatt 1 -- sonst traegt gerade der Weg, den die
    Vertriebsleitung regelmaessig bekommt, keine Angabe darueber, welches
    Formular sie da vor sich hat. Die Dokumenteigenschaften sind dafuer der
    einzige Ort, der unabhaengig vom Blattumfang existiert; Blatt 1 selbst
    bleibt unangetastet, das ist die Zusage.
  */
  wb.title = `RV Monatsreport ${data.month || ""}`.trim();
  wb.subject = `Formularfassung ${VORLAGE_STAND}`;
  wb.company = "Reinecker Vision GmbH";
  wb.description =
    `Erzeugt mit RV Mobil. Blatt 1 ist die Firmenvorlage in der Fassung ${VORLAGE_STAND}.`;

  const ws = wb.getWorksheet(VORLAGE_BLATTNAME);
  if (!ws) {
    // Kann nur passieren, wenn die eingebettete Vorlage ausgetauscht wurde und
    // dabei der Blattname abgewichen ist. Lieber laut scheitern als still ein
    // leeres Blatt ausliefern.
    throw new Error(`Vorlage beschädigt: Blatt "${VORLAGE_BLATTNAME}" fehlt.`);
  }

  // --- Blatt 1: die Vorlage befuellen -----------------------------------
  ws.getCell(ZELLE_MONAT).value = monatFuerVorlage(data.month);
  ws.getCell(ZELLE_NAME).value = data.name || "";

  const belegteFelder = new Set<string>();
  for (const [id, zelle] of Object.entries(FELD_ZU_ZELLE)) {
    ws.getCell(zelle).value = wert(id);
    belegteFelder.add(id);
  }

  // Der Kommentarbereich ist B28:D28 verbunden -- der Wert gehoert in die
  // linke obere Zelle, sonst zeigt Excel ihn nicht an.
  ws.getCell(ZELLE_KOMMENTAR).value = data.notes || "";

  if (umfang === "alle") {
    baueZusatzBlatt(wb, data, felder, belegteFelder, wert);
    if (mitZeitenblatt) {
      baueZeitenBlatt(wb, data, {
        blattName: BLATT_ZEITEN,
        kopfZeilen: [
          ["Arbeitszeiten aus RV Mobil"],
          [`Monat: ${monatFuerVorlage(data.month)}`],
          [`Name: ${data.name || ""}`],
          [],
        ],
        kommentarSpalte: "Kommentar / Ort",
        breiten: [12, 10, 10, 16, 16, 14, 20, 42],
      });
    }
  }

  const puffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(puffer as ArrayBuffer);
};

/**
 * Der separate Stundenzettel -- eine Datei, ein Blatt, keine Vorlage.
 *
 * Lag bis 0.9.32 in utils/excelUtils.ts und lief ueber SheetJS. Gibt `null`
 * zurueck, wenn es nichts zu berichten gibt; das ist kein Fehler, und die
 * Aufrufer melden es als "Keine Zeiterfassungsdaten vorhanden".
 */
export const erzeugeZeitenDatei = async (
  data: ReportData | HistoryRecord,
  istArchiv: boolean = false,
) => {
  const monthVal = data.month || "Monat";
  const nameVal = data.name || "Mitarbeitende_r";

  const schichten = Array.isArray(data.timeLogs) ? data.timeLogs : [];
  if (schichten.length === 0) return null;

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  baueZeitenBlatt(wb, data, {
    blattName: "Arbeitszeiten",
    kopfZeilen: [
      [`ARBEITSZEITERFASSUNG & STEMPELUHR - RV AUßENDIENST${istArchiv ? " (HISTORISCH)" : ""}`],
      [`Erstellt mit der barrierefreien RV Mobil App${istArchiv ? " (Archiv)" : ""}`],
      [],
      ["Mitarbeiter/in:", nameVal],
      ["Berichtsmonat:", formatMonthGerman(monthVal)],
      [],
    ],
    kommentarSpalte: "Kommentar / Ort / Besuchte Schule",
    breiten: [12, 10, 10, 18, 18, 16, 22, 45],
  });

  const puffer = await wb.xlsx.writeBuffer();
  return { wbout: new Uint8Array(puffer as ArrayBuffer), monthVal, nameVal };
};
