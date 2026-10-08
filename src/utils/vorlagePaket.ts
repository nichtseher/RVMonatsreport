import type JSZip from "jszip";

/**
 * Eine Vorlage ausfuellen, ohne sie neu zu schreiben (ab 0.9.73).
 *
 * Eine .xlsx ist ein zip-Paket. Hier wird NUR geaendert:
 *   - die Werte der genannten Zellen in der Blattdatei,
 *   - die Zeichenketten, die diese Werte brauchen (sharedStrings),
 *   - zwischengespeicherte Ergebnisse von SUM-Formeln,
 *   - Titel, Betreff, Beschreibung, Firma, "zuletzt geaendert von" und
 *     Aenderungszeit in den Dokumenteigenschaften.
 * Alles andere -- Formatvorlagen, Spaltenbreiten, Seitenlayout, Druckereinstellungen,
 * Theme, Berechnungskette -- bleibt Byte fuer Byte das Original. Das ist der
 * Grund fuer diese Datei: Ein Umlauf durch ExcelJS aenderte die Standardschrift
 * und die Standardspaltenbreite des Blatts (gemessen mit Excel, 2026-10-08), und
 * die Vertriebsleitung erwartet "genau ihr Formular".
 *
 * Zellen muessen in der Vorlage als Element existieren (`<c r="D6" s=".."/>`),
 * also eine Formatierung tragen -- jede Eingabezelle der Vorlagen tut das. Fehlt
 * eine, wird laut abgebrochen statt ein Element an der falschen Stelle
 * einzufuegen.
 */

export type ZellWert = string | number;

export interface PaketEigenschaften {
  title: string;
  subject: string;
  description: string;
  company: string;
  zuletztGeaendertVon: string;
}

const alsXmlText = (roh: string): string =>
  roh
    // Zeichen, die in XML 1.0 verboten sind (Steuerzeichen ausser Tab/Zeilenumbruch)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Excel nimmt hoechstens 32.767 Zeichen je Zelle. */
const MAX_ZEICHEN = 32767;

const spaltenNummer = (s: string): number =>
  [...s].reduce((summe, z) => summe * 26 + (z.charCodeAt(0) - 64), 0);

/** Pfad der Blattdatei zu einem Blattnamen, ueber workbook.xml und deren Beziehungen. */
export const findeBlattPfad = async (zip: JSZip, blattName: string): Promise<string> => {
  const wb = await zip.file("xl/workbook.xml")!.async("string");
  const rels = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
  const blaetter = wb.match(/<sheet\b[^>]*\/>/g) || [];
  const wert = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
  const tag = blaetter.find((b) => wert(b, "name") === alsXmlText(blattName));
  const rid = tag && wert(tag, "r:id");
  if (!rid) throw new Error(`Blatt "${blattName}" steht nicht in der Vorlage.`);
  const beziehung = (rels.match(/<Relationship\b[^>]*\/>/g) || []).find((r) => wert(r, "Id") === rid);
  const ziel = beziehung && wert(beziehung, "Target");
  if (!ziel) throw new Error(`Blatt "${blattName}": Beziehung ${rid} fehlt.`);
  return ziel.startsWith("/") ? ziel.slice(1) : `xl/${ziel}`;
};

const ersetzeOderErgaenze = (xml: string, tag: string, inhalt: string, wurzel: string): string => {
  const zeile = `<${tag}>${alsXmlText(inhalt)}</${tag}>`;
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>|<${tag}\\s*/>`);
  return re.test(xml) ? xml.replace(re, () => zeile) : xml.replace(`</${wurzel}>`, () => `${zeile}</${wurzel}>`);
};

export const fuellePaket = async (
  vorlage: Uint8Array,
  werte: Record<string, ZellWert>,
  eigenschaften: PaketEigenschaften,
  blattName: string,
  jetzt: Date = new Date(),
): Promise<Uint8Array> => {
  const JSZipKlasse = (await import("jszip")).default;
  const zip = await JSZipKlasse.loadAsync(vorlage);
  const blattPfad = await findeBlattPfad(zip, blattName);
  let blatt = await zip.file(blattPfad)!.async("string");

  // --- gemeinsame Zeichenketten ----------------------------------------
  const sstPfad = "xl/sharedStrings.xml";
  let sst = await zip.file(sstPfad)!.async("string");
  const neueZeichenketten: string[] = [];
  let naechsterIndex = (sst.match(/<si>[\s\S]*?<\/si>|<si\/>/g) || []).length;

  // --- Werte -------------------------------------------------------------
  for (const [adr, roh] of Object.entries(werte)) {
    const re = new RegExp(`<c r="${adr}"((?:\\s+[\\w:]+="[^"]*")*)\\s*(?:/>|>([\\s\\S]*?)</c>)`);
    const treffer = re.exec(blatt);
    if (!treffer) throw new Error(`Zelle ${adr} fehlt in der Vorlage.`);
    if (/<f[ >/]/.test(treffer[0])) throw new Error(`Zelle ${adr} enthaelt eine Formel und wird nicht ueberschrieben.`);
    const attribute = treffer[1].replace(/\s+t="[^"]*"/, "");
    let neu: string;
    if (typeof roh === "number") {
      neu = `<c r="${adr}"${attribute}><v>${Number.isFinite(roh) ? String(roh) : "0"}</v></c>`;
    } else {
      const text = roh.length > MAX_ZEICHEN ? roh.slice(0, MAX_ZEICHEN) : roh;
      if (text === "") {
        neu = `<c r="${adr}"${attribute}/>`;
      } else {
        neueZeichenketten.push(`<si><t xml:space="preserve">${alsXmlText(text)}</t></si>`);
        neu = `<c r="${adr}"${attribute} t="s"><v>${naechsterIndex++}</v></c>`;
      }
    }
    blatt = blatt.replace(treffer[0], () => neu);
  }

  // --- Summenformeln: Ergebnis mitschreiben ------------------------------
  // Ohne zwischengespeichertes Ergebnis zeigen Vorschauen (Mail, Handy,
  // Schnellansicht) eine leere Zelle, bis Excel rechnet.
  let ungeloest = false;
  const zahl = (adr: string): number => {
    const v = werte[adr];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  };
  blatt = blatt.replace(
    /<c r="([A-Z]+\d+)"((?:\s+[\w:]+="[^"]*")*)>(<f(?:\s[^>]*)?>[^<]*<\/f>|<f(?:\s[^>]*)?\/>)(?:<v>[^<]*<\/v>)?<\/c>/g,
    (alt, adr: string, attribute: string, formel: string) => {
      const summe = /<f[^>]*>\s*SUM\(\s*([A-Z]+)(\d+):([A-Z]+)(\d+)\s*\)\s*<\/f>/.exec(formel);
      if (!summe) { ungeloest = true; return alt.replace(/<v>[^<]*<\/v>/, ""); }
      const [, s1, z1, s2, z2] = summe;
      let ergebnis = 0;
      for (let sp = spaltenNummer(s1); sp <= spaltenNummer(s2); sp++) {
        for (let z = Number(z1); z <= Number(z2); z++) {
          let name = "";
          for (let n = sp; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
          ergebnis += zahl(`${name}${z}`);
        }
      }
      return `<c r="${adr}"${attribute.replace(/\s+t="[^"]*"/, "")}>${formel}<v>${String(ergebnis)}</v></c>`;
    },
  );
  zip.file(blattPfad, blatt);

  if (neueZeichenketten.length > 0) {
    const kopf = /<sst[^>]*>/.exec(sst)![0];
    const alt = Number(/\scount="(\d+)"/.exec(kopf)?.[1] ?? NaN);
    let neuerKopf = kopf.replace(/\suniqueCount="\d+"/, ` uniqueCount="${naechsterIndex}"`);
    if (!Number.isNaN(alt)) neuerKopf = neuerKopf.replace(/\scount="\d+"/, ` count="${alt + neueZeichenketten.length}"`);
    sst = sst.replace(kopf, () => neuerKopf).replace("</sst>", () => `${neueZeichenketten.join("")}</sst>`);
    zip.file(sstPfad, sst);
  }

  // Konnte eine Formel nicht ausgerechnet werden, soll Excel es beim Oeffnen tun.
  if (ungeloest) {
    const wbPfad = "xl/workbook.xml";
    const wb = await zip.file(wbPfad)!.async("string");
    zip.file(wbPfad, wb.replace(/<calcPr\b([^>]*?)\/>/, (_t, a: string) => `<calcPr${a.replace(/\sfullCalcOnLoad="[^"]*"/, "")} fullCalcOnLoad="1"/>`));
  }

  // --- Dokumenteigenschaften ----------------------------------------------
  const kernPfad = "docProps/core.xml";
  let kern = await zip.file(kernPfad)!.async("string");
  kern = ersetzeOderErgaenze(kern, "dc:title", eigenschaften.title, "cp:coreProperties");
  kern = ersetzeOderErgaenze(kern, "dc:subject", eigenschaften.subject, "cp:coreProperties");
  kern = ersetzeOderErgaenze(kern, "dc:description", eigenschaften.description, "cp:coreProperties");
  kern = ersetzeOderErgaenze(kern, "cp:lastModifiedBy", eigenschaften.zuletztGeaendertVon, "cp:coreProperties");
  const zeit = jetzt.toISOString().replace(/\.\d+Z$/, "Z");
  kern = /<dcterms:modified/.test(kern)
    ? kern.replace(/(<dcterms:modified[^>]*>)[^<]*(<\/dcterms:modified>)/, (_t, a: string, b: string) => `${a}${zeit}${b}`)
    : kern.replace("</cp:coreProperties>", () => `<dcterms:modified xsi:type="dcterms:W3CDTF">${zeit}</dcterms:modified></cp:coreProperties>`);
  zip.file(kernPfad, kern);

  const appPfad = "docProps/app.xml";
  const appDatei = zip.file(appPfad);
  if (appDatei) {
    zip.file(appPfad, ersetzeOderErgaenze(await appDatei.async("string"), "Company", eigenschaften.company, "Properties"));
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
};
