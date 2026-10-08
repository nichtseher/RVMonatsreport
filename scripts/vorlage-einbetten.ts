/**
 * Bettet eine Excel-Vorlage in die App ein: Werte leeren, sonst NICHTS anfassen.
 *
 *   npx tsx scripts/vorlage-einbetten.ts <quelle.xlsx> <ziel.ts> <Blattname> <Zelle,Zelle,...>
 *
 * Die Zellliste nennt alles, was ein Mensch ausgefuellt hat und was in der
 * leeren Vorlage leer sein muss (Monat, Name, Zaehler, Kommentar). Formeln,
 * Beschriftungen und der Fassungsvermerk bleiben stehen.
 *
 * WARUM KEIN EXCELJS HIER (und im Export): Gemessen am 2026-10-08 mit Excel
 * selbst -- ein Umlauf durch ExcelJS aendert die Standardschrift (Arial 10 ->
 * Calibri 11) und die Standardspaltenbreite (10,71 -> 8,43) und laesst die
 * Druckereinstellungen fallen. Das ist nicht "genau das Formular". Hier wird
 * deshalb nur das Paket (zip) geoeffnet, in `sheet1.xml` werden die Werte der
 * genannten Zellen entfernt, und die uebrigen Teile bleiben Byte fuer Byte.
 *
 * Aufraeumen, weil die Quelle meist ein ausgefuellter Bericht ist:
 * - Texte der geleerten Zellen verschwinden auch aus den gemeinsamen
 *   Zeichenketten (sharedStrings), sonst stuende der Name der Person weiter
 *   in der Datei.
 * - Der Pfad des Rechners in `workbook.xml` (x15ac:absPath) wird entfernt.
 */
import JSZip from "jszip";
import { readFileSync, writeFileSync } from "node:fs";
import { findeBlattPfad } from "../src/utils/vorlagePaket";

const [quelle, ziel, blattName, zellListe] = process.argv.slice(2);
if (!quelle || !ziel || !blattName || !zellListe) {
  console.error("Aufruf: tsx scripts/vorlage-einbetten.ts <quelle.xlsx> <ziel.ts> <Blattname> <Zelle,Zelle,...>");
  process.exit(1);
}
const leeren = zellListe.split(",").map((z) => z.trim()).filter(Boolean);

(async () => {
  const zip = await JSZip.loadAsync(readFileSync(quelle));
  const blattPfad = await findeBlattPfad(zip, blattName);
  let blatt = await zip.file(blattPfad)!.async("string");

  for (const adr of leeren) {
    const re = new RegExp(`<c r="${adr}"((?:\\s+[\\w:]+="[^"]*")*)\\s*(?:/>|>[\\s\\S]*?</c>)`);
    const m = re.exec(blatt);
    if (!m) throw new Error(`Zelle ${adr} steht nicht in ${blattPfad}`);
    if (/<f[ >]/.test(m[0])) throw new Error(`Zelle ${adr} enthaelt eine Formel -- die wird nicht geleert`);
    const attr = m[1].replace(/\s+t="[^"]*"/, "");
    blatt = blatt.replace(m[0], `<c r="${adr}"${attr}/>`);
  }

  // Gemeinsame Zeichenketten: nur behalten, was das Blatt noch benutzt.
  const sstPfad = "xl/sharedStrings.xml";
  const sst = await zip.file(sstPfad)!.async("string");
  const kopf = /^[\s\S]*?<sst[^>]*>/.exec(sst)![0];
  const eintraege = sst.slice(kopf.length).match(/<si>[\s\S]*?<\/si>|<si\/>/g) || [];
  const alt2neu = new Map<number, number>();
  const behalten: string[] = [];
  blatt = blatt.replace(/<c r="([A-Z]+\d+)"((?:\s+[\w:]+="[^"]*")*?)\s+t="s"((?:\s+[\w:]+="[^"]*")*)>\s*<v>(\d+)<\/v>\s*<\/c>/g,
    (_t, adr, a1, a2, idx) => {
      const alt = Number(idx);
      if (!alt2neu.has(alt)) { alt2neu.set(alt, behalten.length); behalten.push(eintraege[alt]); }
      return `<c r="${adr}"${a1}${a2} t="s"><v>${alt2neu.get(alt)}</v></c>`;
    });
  const neuerKopf = kopf
    .replace(/\scount="\d+"/, ` count="${alt2neu.size}"`)
    .replace(/\suniqueCount="\d+"/, ` uniqueCount="${behalten.length}"`);
  zip.file(sstPfad, neuerKopf + behalten.join("") + "</sst>");
  zip.file(blattPfad, blatt);

  // Rechnerpfad entfernen
  const wbPfad = "xl/workbook.xml";
  const wbXml = await zip.file(wbPfad)!.async("string");
  zip.file(wbPfad, wbXml.replace(/<mc:AlternateContent[^>]*>\s*<mc:Choice Requires="x15">\s*<x15ac:absPath[^>]*\/>\s*<\/mc:Choice>\s*<\/mc:AlternateContent>/, ""));

  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const b64 = Buffer.from(bytes).toString("base64");
  const zeilen = b64.match(/.{1,100}/g)!.map((z) => `  "${z}"`).join(" +\n");
  const kopfText = `/**
 * Eingebettete Vorlage -- erzeugt mit scripts/vorlage-einbetten.ts.
 *
 * Quelle: ${quelle.split(/[\\/]/).pop()} (Blatt "${blattName}"). Geleert wurden nur die Werte von
 * ${leeren.join(", ")}; sonst ist das Paket unveraendert.
 * Nicht von Hand bearbeiten -- neu erzeugen. Beschreibung: utils/vorlagen.ts.
 */
export const VORLAGE_BASE64 =
`;
  writeFileSync(ziel, kopfText + zeilen + ";\n", "utf8");
  console.log(`geschrieben: ${ziel} (${bytes.length} Bytes, ${behalten.length} Zeichenketten behalten, ${eintraege.length - behalten.length} entfernt)`);
})();
