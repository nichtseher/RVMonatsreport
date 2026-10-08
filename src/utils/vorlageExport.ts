import { ReportData, HistoryRecord, SectionsConfig, FieldConfig } from "../types";
import { findeVorlage, bereichsTitel, type VorlageMeta } from "./vorlagen";
import { fuellePaket } from "./vorlagePaket";
// Nur der Typ -- ExcelJS selbst wird erst beim Export nachgeladen (271 KB).
import type { Workbook as ExcelWorkbook } from "exceljs";
import { formatMonthGerman } from "./dateUtils";

/**
 * Export in der Firmenvorlage der Vertriebsleitung.
 *
 * Blatt 1 IST die Vorlage -- nicht ein Nachbau davon. Seit 0.9.73 wird das
 * Original-PAKET geoeffnet und nur an den vorgesehenen Zellen befuellt
 * (`vorlagePaket.ts`); alles andere bleibt Byte fuer Byte. Der Umweg ueber
 * ExcelJS blieb nur fuer "alle Blaetter", wo Blaetter angehaengt werden muessen.
 *
 * WARUM EXCELJS (fuer die angehaengten Blaetter): Gemessen am 2026-08-19 -- das frueher hier genutzte
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
  vorlage: VorlageMeta,
) => {
  const uebrig = alleFelder(felder).filter((f) => !belegteFelder.has(f.id));

  const zusatz = wb.addWorksheet(BLATT_ZUSATZ);
  zusatz.columns = [{ width: 58 }, { width: 18 }];

  zusatz.addRow(["Zusatzangaben aus RV Mobil", ""]);
  zusatz.getRow(1).font = { bold: true, size: 13 };
  zusatz.addRow([
    "Diese Werte haben in der gewählten Vorlage keine Zeile.",
    "",
  ]);
  zusatz.addRow([`Vorlage: ${vorlage.name} (Fassung ${vorlage.stand})`, ""]);
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

  /*
    Bereichssummen mitgeben: In der Vorlage gibt es nur die eine Summe D10.

    NUR s1-s3, NICHT s4. Die drei ersten Bereiche sind in der Voreinstellung
    homogene "Anzahl"-Zaehler (Vorfuehrungen, Schulungen, Spezialprodukte) --
    eine Summe zaehlt dort sinnvoll Vorgaenge. Bereich 4 mischt Tage
    (tage_arbeit, tage_urlaub, tage_krank, tage_feiertag) mit Stunden
    (std_buero, std_aussendienst); "Summe" addierte bislang beides zu einer
    Zahl ohne Einheit und ohne Bedeutung (gemessen 2026-09-19: 21+40+120+2+
    1+3 = 187, unter der Ueberschrift "4. Arbeitszeit & Buero" -- in der
    Datei, die bei "Alle drei Blaetter" an die Vertriebsleitung geht).

    `FieldConfig` (types.ts) traegt keine Einheit -- ein allgemeiner Schutz
    ("nur gleichartige Felder summieren") liesse sich damit nicht bauen, auch
    nicht fuer eigene Felder, die ein Nutzer zu s1-s3 hinzufuegt. Diese
    Aenderung behebt den konkret gemessenen Fall (die sechs Standardfelder in
    s4), nicht die allgemeine Lücke. Alle sechs Werte stehen dem Empfaenger
    trotzdem zur Verfuegung: tage_arbeit/std_buero auf Blatt 1 (D18/D19), die
    uebrigen vier einzeln in der Liste "Zusatzangaben" oben auf diesem Blatt.
  */
  zusatz.addRow([]);
  const summenKopf = zusatz.addRow(["Summen je Bereich", "Wert"]);
  summenKopf.font = { bold: true };
  const bereichsNamen: Record<"s1" | "s2" | "s3", string> = {
    s1: bereichsTitel(vorlage, "s1"),
    s2: bereichsTitel(vorlage, "s2"),
    s3: bereichsTitel(vorlage, "s3"),
  };
  (["s1", "s2", "s3"] as const).forEach((s) => {
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
   * Kennung der Vorlage (siehe `vorlagen.ts`). Bewusst OHNE Vorgabewert, aus
   * demselben Grund wie `umfang`: Welches Formular rausgeht, soll jeder
   * Aufrufer entscheiden muessen, nicht ein stiller Standard.
   */
  vorlageId: string,
  /**
   * Blatt 3 weglassen, obwohl `umfang` "alle" ist. Genau ein Fall: Die
   * Stempeluhr ist abgeschaltet -- dann ist ein Schichtenblatt (leer oder
   * mit Altbestand) keine Angabe, sondern ein Missverstaendnis.
   */
  mitZeitenblatt: boolean = true,
): Promise<Uint8Array> => {
  const vorlage = findeVorlage(vorlageId);

  // Archivierte Monate bringen ihren eigenen Feldaufbau mit.
  const felder =
    "fieldsSnapshot" in data && data.fieldsSnapshot ? data.fieldsSnapshot : appFields;

  const wert = (id: string): number => {
    const v = (data.values || {})[id];
    return typeof v === "number" ? v : 0;
  };

  /*
    Blatt 1 ist das ORIGINAL der Vorlage mit eingesetzten Werten -- nicht eine
    Neufassung (siehe vorlagePaket.ts). Eingesetzt wird nur, was die App auch
    wirklich kennt: Monat, Name, Kommentar und die Zaehler, die in
    `feldZuZelle` stehen; jede Zeile des Formulars hat eine Kategorie (geprueft).

    Die Fassung des Formulars gehoert in JEDE erzeugte Datei, auch in die mit
    nur Blatt 1 -- sonst traegt gerade der Weg, den die Vertriebsleitung
    regelmaessig bekommt, keine Angabe darueber, welches Formular sie da vor
    sich hat. Die Dokumenteigenschaften sind dafuer der einzige Ort, der
    unabhaengig vom Blattumfang existiert.
  */
  const werte: Record<string, string | number> = {
    [vorlage.zellen.monat]: monatFuerVorlage(data.month),
    [vorlage.zellen.name]: data.name || "",
    // Der Kommentarbereich ist verbunden (Team: B28:D28) -- der Wert gehoert in
    // die linke obere Zelle, sonst zeigt Excel ihn nicht an.
    [vorlage.zellen.kommentar]: data.notes || "",
  };
  const belegteFelder = new Set<string>();
  for (const [id, zelle] of Object.entries(vorlage.feldZuZelle)) {
    werte[zelle] = wert(id);
    belegteFelder.add(id);
  }

  const paket = await fuellePaket(
    base64ZuBytes(await vorlage.ladeDatei()),
    werte,
    {
      // „RV Mobil" und nicht „RV Monatsreport": Die App heisst seit 0.9.44
      // ueberall gleich -- Fenstertitel, Startbildschirm, Systemmeldung und hier.
      title: `RV Mobil ${data.month || ""}`.trim(),
      subject: `${vorlage.name}, Formularfassung ${vorlage.stand}`,
      description: `Erzeugt mit RV Mobil. Blatt 1 ist die Vorlage „${vorlage.name}“ in der Fassung ${vorlage.stand}.`,
      company: "Reinecker Vision GmbH",
      zuletztGeaendertVon: "RV Mobil",
    },
    vorlage.blattName,
  );

  // "Nur Vorlage": das Paket ist fertig, Byte fuer Byte das Original plus Werte.
  if (umfang === "vorlage") return paket;

  /*
    "Alle Blaetter": zwei weitere Blaetter muessen angehaengt werden, und das
    kann nur eine Tabellenbibliothek. Blatt 1 behaelt dabei seine Zellen,
    Rahmen, Farben und Zusammenfuehrungen; gemessen ist aber, dass ExcelJS die
    Standardschrift und Standardspaltenbreite NEBEN dem Formular veraendert und
    die Druckereinstellungen fallen laesst. Wer das Formular exakt braucht,
    schickt "nur Vorlage" -- und das ist die vorgeschlagene Antwort.
  */
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(paket.buffer.slice(paket.byteOffset, paket.byteOffset + paket.byteLength) as ArrayBuffer);

  baueZusatzBlatt(wb, data, felder, belegteFelder, wert, vorlage);
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
