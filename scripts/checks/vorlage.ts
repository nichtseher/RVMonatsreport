import ExcelJS from "exceljs";
import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { findeBlattPfad } from "../../src/utils/vorlagePaket";
import {
  erzeugeVorlagenDatei,
  BLATT_ZUSATZ,
  BLATT_ZEITEN,
  monatFuerVorlage,
} from "../../src/utils/vorlageExport";
import type { BlattUmfang } from "../../src/utils/vorlageExport";
import {
  VORLAGEN,
  STANDARD_VORLAGE_ID,
  VORLAGE_TEAM_BLINDENHILFSMITTEL,
  findeVorlage,
  umfangRueckfrage,
} from "../../src/utils/vorlagen";
import type { SectionsConfig, ReportData, HistoryRecord } from "../../src/types";

/*
  Diese Pruefungen laufen fuer JEDE eingebettete Vorlage (utils/vorlagen.ts)
  und sichern die Zusage an die Vertriebsleitung ab: Blatt 1 IST ihre
  Vorlage, nicht ein Nachbau. Verrutscht die Feldzuordnung -- etwa weil
  jemand die Reihenfolge der Standardfelder aendert -- landen Zahlen in den
  falschen Zeilen, und das faellt in einer fertigen Excel-Datei niemandem auf.
*/

gruppe("Katalog der Vorlagen");

pruefe("Kennungen sind eindeutig, die Vorgabe ist eine davon", () => {
  const ids = VORLAGEN.map((v) => v.id);
  gleich(new Set(ids).size, ids.length);
  wahr(ids.includes(STANDARD_VORLAGE_ID), "STANDARD_VORLAGE_ID ist nicht im Katalog");
  wahr(ids.includes(VORLAGE_TEAM_BLINDENHILFSMITTEL), "Team Blindenhilfsmittel fehlt im Katalog");
});

pruefe("eine unbekannte oder fehlende Kennung ergibt die Vorgabe", () => {
  for (const id of ["gibt-es-nicht", "", null, undefined]) {
    gleich(findeVorlage(id).id, STANDARD_VORLAGE_ID);
  }
});

pruefe("Name und Fassung jeder Vorlage sind ausgefüllt", () => {
  for (const v of VORLAGEN) {
    wahr(v.name.trim().length > 0, `Vorlage ${v.id} hat keinen Namen`);
    wahr(/^\d{2}\.\d{4}$/.test(v.stand), `Vorlage ${v.id}: Fassung "${v.stand}" ist nicht MM.JJJJ`);
  }
});

pruefe("die Rückfrage vor dem Senden nennt Name und Fassung", () => {
  for (const v of VORLAGEN) {
    for (const mitZeiten of [true, false]) {
      const text = umfangRueckfrage(v, mitZeiten);
      wahr(text.includes(v.name) && text.includes(v.stand), `Rückfrage ohne Name/Fassung (${v.id})`);
    }
  }
});

gruppe("Export in der Firmenvorlage");

pruefe("Monatsformat folgt der Vorgabe MM/JJJJ aus D3", () => {
  gleich(monatFuerVorlage("2026-08"), "08/2026");
  gleich(monatFuerVorlage("2026-12"), "12/2026");
  // Unbrauchbare Eingabe unveraendert durchreichen statt etwas zu erfinden
  gleich(monatFuerVorlage("Unsinn"), "Unsinn");
  gleich(monatFuerVorlage(""), "");
});

for (const v of VORLAGEN) {
gruppe(`Vorlage: ${v.name}`);

/*
  Pruefdaten je Vorlage: ihre eigenen Kategorien, dazu eine eigene Kategorie des
  Nutzers, und fuer jede Kategorie eine ANDERE Zahl. Mit gleichen Zahlen faende
  man nicht, wenn zwei Kategorien die Zellen tauschen.
*/
const felder: SectionsConfig = JSON.parse(JSON.stringify(v.felder));
felder.s4.push({ id: "eigenes", label: "Eigenes Zusatzfeld", step: 1, isCustom: true });
const werte: Record<string, number> = {};
Object.values(felder).flat().forEach((fd, i) => { werte[fd.id] = 100 + i * 3; });
// Diese drei prueft der Blatt-2-Test namentlich.
Object.assign(werte, { std_aussendienst: 42.5, tage_urlaub: 2, eigenes: 11, std_buero: 38.5, tage_arbeit: 20 });

const schichten = [
  { id: "t1", date: "2026-08-09", clockIn: "08:00", clockOut: "16:30", breakMinutes: 45, duration: 7.75, officeRatio: 0.5, officeHours: 3.875, fieldHours: 3.875 },
  { id: "t2", date: "2026-08-03", clockIn: "09:00", clockOut: "17:00", breakMinutes: 30, duration: 7.5, officeRatio: 0.5, officeHours: 3.75, fieldHours: 3.75 },
];
const laufend: ReportData = {
  month: "2026-08",
  name: "Marc Petry",
  notes: "Messe Frankfurt, Umlaute äöüß.",
  values: werte,
  timeLogs: schichten,
};
const archiviert: HistoryRecord = {
  ...laufend,
  fieldsSnapshot: felder,
  savedAt: "2026-08-31T10:00:00.000Z",
};

const lade = async (
  data: ReportData | HistoryRecord,
  umfang: BlattUmfang = "alle",
  mitZeitenblatt = true,
) => {
  const bytes = await erzeugeVorlagenDatei(data, felder, umfang, v.id, mitZeitenblatt);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes.buffer as ArrayBuffer);
  return wb;
};

/** Die Vorlage selbst, unberuehrt -- Gegenstueck zu dem, was die App daraus macht. */
const ladeOriginal = async () => {
  const wb = new ExcelJS.Workbook();
  const roh = Buffer.from(await v.ladeDatei(), "base64");
  await wb.xlsx.load(roh.buffer.slice(roh.byteOffset, roh.byteOffset + roh.byteLength) as ArrayBuffer);
  return wb;
};

const eingabeZellen = [v.zellen.monat, v.zellen.name, v.zellen.kommentar, ...Object.values(v.feldZuZelle)];
const istTeam = v.id === VORLAGE_TEAM_BLINDENHILFSMITTEL;

pruefe("die Zuordnung trifft nur leere Eingabezellen, nie eine Formel", async () => {
  const ws = (await ladeOriginal()).getWorksheet(v.blattName);
  wahr(!!ws, `Blatt "${v.blattName}" fehlt in der Vorlage ${v.id}`);
  const mitFormel = eingabeZellen.filter((adr) => {
    const w = ws!.getCell(adr).value as { formula?: string } | null;
    return !!(w && typeof w === "object" && "formula" in w);
  });
  gleich(mitFormel, []);
  gleich(new Set(eingabeZellen).size, eingabeZellen.length);
});

pruefe("die drei Blätter heißen wie vereinbart", async () => {
  const wb = await lade(laufend);
  gleich(wb.worksheets.map((w) => w.name), [v.blattName, BLATT_ZUSATZ, BLATT_ZEITEN]);
});

/*
  Die Blattwahl (0.9.33). Sie entscheidet, was den Betrieb verlaesst: Blatt 3
  traegt die einzelnen Schichten mit Kommen, Gehen, Pause und Notiz -- die
  einzige Stelle, an der die Vertriebsleitung sie ueberhaupt zu sehen bekommt.
  Ein Fehler hier ist nicht "eine Datei sieht anders aus", sondern "es ging
  mehr raus als gewollt".
*/
pruefe("„nur Vorlage“ liefert Blatt 1 und sonst nichts", async () => {
  const wb = await lade(laufend, "vorlage");
  gleich(wb.worksheets.map((w) => w.name), [v.blattName]);
});

pruefe("„nur Vorlage“ befüllt Blatt 1 genau wie „alle“", async () => {
  // Die Wahl darf den Bericht selbst nicht antasten -- sonst bekaeme die
  // Vertriebsleitung je nach Knopfdruck andere Zahlen.
  const zellen = (wb: ExcelJS.Workbook) => {
    const ws = wb.getWorksheet(v.blattName)!;
    return eingabeZellen
      .map((a) => `${a}=${JSON.stringify(ws.getCell(a).value)}`);
  };
  gleich(zellen(await lade(laufend, "vorlage")), zellen(await lade(laufend, "alle")));
});

pruefe("„nur Vorlage“ enthält keine Schicht im Klartext", async () => {
  // Gegenprobe zur Blattzahl: Auch kein Rest in einem anderen Blatt.
  const wb = await lade(laufend, "vorlage");
  const text: string[] = [];
  wb.worksheets.forEach((ws) => ws.eachRow((z) => text.push(JSON.stringify(z.values))));
  const alles = text.join(String.fromCharCode(10));
  for (const spur of ["03.08.2026", "09.08.2026", "08:00", "16:30"]) {
    wahr(!alles.includes(spur), `"${spur}" steht trotz „nur Vorlage“ in der Datei`);
  }
});

pruefe("abgeschaltete Stempeluhr lässt Blatt 3 weg, Blatt 2 bleibt", async () => {
  const wb = await lade(laufend, "alle", false);
  gleich(wb.worksheets.map((w) => w.name), [v.blattName, BLATT_ZUSATZ]);
});

pruefe("jeder Zähler landet in seiner Zelle der Vorlage", async () => {
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(v.blattName)!;
  const gefunden: Record<string, unknown> = {};
  const erwartet: Record<string, unknown> = {};
  for (const [id, zelle] of Object.entries(v.feldZuZelle)) {
    gefunden[zelle] = ws.getCell(zelle).value;
    erwartet[zelle] = werte[id];
  }
  gleich(gefunden, erwartet);
});

pruefe("Monat, Name und Kommentar stehen an der richtigen Stelle", async () => {
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(v.blattName)!;
  gleich(ws.getCell(v.zellen.monat).value, "08/2026");
  gleich(ws.getCell(v.zellen.name).value, "Marc Petry");
  gleich(ws.getCell(v.zellen.kommentar).value, "Messe Frankfurt, Umlaute äöüß.");
});

if (istTeam) pruefe("die Summenformel in D10 bleibt eine Formel", async () => {
  // Nicht durch eine ausgerechnete Zahl ersetzen: Die Vertriebsleitung
  // erwartet ein rechnendes Blatt. Als .xls geschrieben ginge sie verloren --
  // deshalb ist .xlsx gesetzt.
  const wb = await lade(laufend);
  const zelle = wb.getWorksheet(v.blattName)!.getCell("D10");
  gleich((zelle.value as { formula?: string })?.formula, "SUM(D6:D9)");
});

if (istTeam) pruefe("die gelbe Markierung der Eingabefelder überlebt", async () => {
  // Genau das kann die sonst genutzte Bibliothek nicht -- gemessen: nach einem
  // SheetJS-Umlauf kam FFFF99 in der Datei nirgends mehr vor.
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(v.blattName)!;
  const ohneFuellung = eingabeZellen
    .filter((adr) => {
      const f = ws.getCell(adr).fill as { type?: string; pattern?: string } | undefined;
      return !f || f.pattern !== "solid";
    });
  gleich(ohneFuellung, []);
});

pruefe("jede erzeugte Datei nennt die Fassung des Formulars", async () => {
  /*
    Bis 0.9.34 stand die Fassung NUR in einem Quelltextkommentar. Gibt die
    Firma ein neues Formular heraus, produziert die App weiter das alte --
    und die Datei sieht aus wie das gewohnte Formular. Genau deshalb muss
    die Angabe in JEDER Ausgabe stehen, auch in der mit nur Blatt 1: Das
    ist der Weg, den die Vertriebsleitung regelmaessig bekommt.
  */
  for (const umfang of ["vorlage", "alle"] as const) {
    const wb = await lade(laufend, umfang);
    wahr(
      String(wb.subject || "").includes(v.stand),
      `Umfang "${umfang}": die Fassung ${v.stand} fehlt in den Dateieigenschaften`,
    );
    wahr(
      String(wb.description || "").includes(v.stand),
      `Umfang "${umfang}": die Fassung fehlt in der Beschreibung`,
    );
  }
  // Und sichtbar auf Blatt 2, wo es mitgesendet wird.
  const zusatz = (await lade(laufend, "alle")).getWorksheet(BLATT_ZUSATZ)!;
  const text: string[] = [];
  zusatz.eachRow((z) => text.push(JSON.stringify(z.values)));
  wahr(
    text.join(String.fromCharCode(10)).includes(v.stand),
    `Die Fassung ${v.stand} steht nicht sichtbar auf Blatt 2`,
  );
});

if (istTeam) pruefe("die gelbe Markierung überlebt auch bei „nur Vorlage“", async () => {
  /*
    Der Fall darüber prüft "alle Blätter". Seit 0.9.33 ist "nur Vorlage" die
    vorgeschlagene Antwort und damit der Weg, den die Vertriebsleitung
    tatsächlich zu sehen bekommt -- er braucht dieselbe Zusicherung. Die
    Blattwahl darf Blatt 1 nicht anfassen.
  */
  const ws = (await lade(laufend, "vorlage")).getWorksheet(v.blattName)!;
  const ohneFuellung = eingabeZellen
    .filter((adr) => {
      const f = ws.getCell(adr).fill as { type?: string; pattern?: string } | undefined;
      return !f || f.pattern !== "solid";
    });
  gleich(ohneFuellung, []);
  gleich((ws.getCell("D10").value as { formula?: string })?.formula, "SUM(D6:D9)");
  gleich((ws.model.merges || []).length, 22);
});

if (istTeam) pruefe("Fettdruck, Rahmen und verbundene Bereiche bleiben erhalten", async () => {
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(v.blattName)!;
  wahr(ws.getCell("B1").font?.bold === true, "Überschrift B1 ist nicht mehr fett");
  const rahmen = ws.getCell("D6").border;
  wahr(!!(rahmen?.top && rahmen?.bottom && rahmen?.left && rahmen?.right), "D6 hat keinen Rahmen mehr");
  gleich((ws.model.merges || []).length, 22);
});

if (istTeam) pruefe("Spaltenbreiten und Zeilenhöhen der Vorlage bleiben stehen", async () => {
  const wb = await lade(laufend);
  const ws = wb.getWorksheet(v.blattName)!;
  // C ist die breite Beschriftungsspalte, D die Wertespalte
  wahr(Math.round(ws.getColumn(3).width || 0) === 56, `Spalte C ist ${ws.getColumn(3).width}`);
  wahr(Math.round(ws.getColumn(4).width || 0) === 26, `Spalte D ist ${ws.getColumn(4).width}`);
  gleich(ws.getRow(6).height, 20.1);
});

pruefe("Felder ohne Zeile in der Vorlage stehen auf Blatt 2", async () => {
  const wb = await lade(laufend);
  const zusatz = wb.getWorksheet(BLATT_ZUSATZ)!;
  const text: string[] = [];
  zusatz.eachRow((zeile) => {
    text.push(zeile.values ? JSON.stringify(zeile.values) : "");
  });
  const alles = text.join("\n");
  for (const label of ["Stunden Außendienst/Reisezeit", "Genommene Urlaubstage", "Eigenes Zusatzfeld"]) {
    wahr(alles.includes(label), `"${label}" fehlt auf Blatt 2`);
  }
  // und ihre Werte
  for (const v of [42.5, 2, 11]) wahr(alles.includes(String(v)), `Wert ${v} fehlt auf Blatt 2`);
});

pruefe("kein Feld der Vorlage taucht zusätzlich auf Blatt 2 auf", async () => {
  // Sonst stünde dieselbe Zahl doppelt in der Datei und man weiß nicht, welche gilt.
  const wb = await lade(laufend);
  const zusatz = wb.getWorksheet(BLATT_ZUSATZ)!;
  const text: string[] = [];
  zusatz.eachRow((zeile) => text.push(JSON.stringify(zeile.values)));
  const alles = text.join("\n");
  const imFormular = Object.values(felder)
    .flat()
    .filter((fd) => fd.id in v.feldZuZelle)
    .map((fd) => fd.label);
  wahr(imFormular.length > 0, "Pruefdaten enthalten kein Feld dieser Vorlage");
  for (const label of imFormular) {
    wahr(!alles.includes(label), `"${label}" steht doppelt (Vorlage und Blatt 2)`);
  }
});

pruefe("Schichten stehen auf Blatt 3, nach Datum sortiert", async () => {
  const wb = await lade(laufend);
  const zeiten = wb.getWorksheet(BLATT_ZEITEN)!;
  const text: string[] = [];
  zeiten.eachRow((zeile) => text.push(JSON.stringify(zeile.values)));
  const alles = text.join("\n");
  wahr(alles.indexOf("03.08.2026") < alles.indexOf("09.08.2026"), "Reihenfolge stimmt nicht");
});

pruefe("Formular und Archiv erzeugen dieselbe Datei", async () => {
  // Bis 0.9.0 liefen beide Wege auseinander -- derselbe Monat sah je nach
  // Ausloeser anders aus.
  const ausFormular = await lade(laufend);
  const ausArchiv = await lade(archiviert);
  const zellen = (wb: ExcelJS.Workbook) => {
    const ws = wb.getWorksheet(v.blattName)!;
    return eingabeZellen
      .map((a) => `${a}=${JSON.stringify(ws.getCell(a).value)}`);
  };
  gleich(zellen(ausArchiv), zellen(ausFormular));
});

pruefe("ein leerer Monat erzeugt Nullen statt leerer Zellen", async () => {
  // Eine leere Zelle liest sich in Excel wie "nicht ausgefüllt"; 0 ist eine
  // Aussage. Die Vertriebsleitung soll beides unterscheiden können.
  const wb = await lade({ month: "2026-09", name: "", notes: "", values: {} });
  const ws = wb.getWorksheet(v.blattName)!;
  const zellen = Object.values(v.feldZuZelle);
  gleich(ws.getCell(zellen[0]).value, 0);
  gleich(ws.getCell(zellen[zellen.length - 1]).value, 0);
  gleich(ws.getCell(v.zellen.monat).value, "09/2026");
});

pruefe("Füllung und verbundene Bereiche entsprechen dem Original der Vorlage", async () => {
  // Fuer jede Vorlage, nicht nur die erste: Was die App aus dem Original macht,
  // darf Aussehen und Struktur von Blatt 1 nicht veraendern.
  const orig = (await ladeOriginal()).getWorksheet(v.blattName)!;
  const neu = (await lade(laufend, "vorlage")).getWorksheet(v.blattName)!;
  const fuellung = (ws: ExcelJS.Worksheet, adr: string) => JSON.stringify(ws.getCell(adr).fill ?? null);
  for (const adr of eingabeZellen) gleich(fuellung(neu, adr), fuellung(orig, adr));
  gleich((neu.model.merges || []).length, (orig.model.merges || []).length);
});

/*
  ORIGINALTREUE. Die Vertriebsleitung erwartet "genau ihr Formular". Gemessen
  mit Excel selbst (2026-10-08): ein Umlauf durch ExcelJS aenderte Standard-
  schrift und Standardspaltenbreite. Darum fuellt vorlagePaket.ts nur Werte in
  das Original-Paket ein. Diese Pruefung beweist es auf Paketebene: Jeder Teil
  ausser den vier erlaubten ist Byte fuer Byte gleich, und in der Blattdatei
  unterscheiden sich nur die Eingabezellen.
*/
pruefe("Originaltreue: ausser den Werten ist das Paket unverändert", async () => {
  const JSZip = (await import("jszip")).default;
  const original = await JSZip.loadAsync(Buffer.from(await v.ladeDatei(), "base64"));
  const bytes = await erzeugeVorlagenDatei(laufend, felder, "vorlage", v.id);
  const neu = await JSZip.loadAsync(bytes);

  const namenAlt = Object.keys(original.files).filter((n) => !original.files[n].dir).sort();
  const namenNeu = Object.keys(neu.files).filter((n) => !neu.files[n].dir).sort();
  gleich(namenNeu, namenAlt);

  const blattPfad = (await findeBlattPfad(original, v.blattName));
  const erlaubt = new Set([blattPfad, "xl/sharedStrings.xml", "docProps/core.xml", "docProps/app.xml"]);
  for (const name of namenAlt) {
    if (erlaubt.has(name)) continue;
    const a = await original.file(name)!.async("uint8array");
    const b = await neu.file(name)!.async("uint8array");
    wahr(Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0, `Teil "${name}" wurde veraendert`);
  }

  // Blattdatei: Eingabezellen und zwischengespeicherte Ergebnisse herausnehmen, Rest gleich.
  const ohneWerte = (xml: string) => {
    let r = xml;
    for (const adr of eingabeZellen) {
      r = r.replace(new RegExp(`<c r="${adr}"(?:\\s+[\\w:]+="[^"]*")*\\s*(?:/>|>[\\s\\S]*?</c>)`), `<c r="${adr}"/>`);
    }
    // Formelzellen: Formel und Format zaehlen; Ergebnis und Typkennung (t="n") sind Werte.
    return r.replace(
      /<c r="([A-Z]+\d+)"((?:\s+[\w:]+="[^"]*")*)>(<f[^>]*>[^<]*<\/f>|<f[^>]*\/>)(?:<v>[^<]*<\/v>)?<\/c>/g,
      (_t, adr: string, attr: string, formel: string) => `<c r="${adr}"${attr.replace(/\s+t="[^"]*"/, "")}>${formel}</c>`,
    );
  };
  const blattAlt = await original.file(blattPfad)!.async("string");
  const blattNeu = await neu.file(blattPfad)!.async("string");
  // Das Attribut t="s"/"inlineStr" der Eingabezellen faellt mit weg -- die Zellen sind ersetzt.
  gleich(ohneWerte(blattNeu), ohneWerte(blattAlt));

  // Zeichenketten: die alten bleiben unveraendert und in der Reihenfolge stehen, neue kommen hinten dazu.
  const eintraege = (x: string) => x.match(/<si>[\s\S]*?<\/si>|<si\/>/g) || [];
  const sstAlt = eintraege(await original.file("xl/sharedStrings.xml")!.async("string"));
  const sstNeu = eintraege(await neu.file("xl/sharedStrings.xml")!.async("string"));
  gleich(sstNeu.slice(0, sstAlt.length), sstAlt);
});

pruefe("Originaltreue: die leere Vorlage enthält keine fremden Personendaten", async () => {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(Buffer.from(await v.ladeDatei(), "base64"));
  let alles = "";
  for (const n of Object.keys(zip.files)) if (/\.(xml|rels)$/.test(n)) alles += await zip.file(n)!.async("string");
  // Der Rechnerpfad aus dem Umwandeln darf nicht im Paket stehen.
  wahr(!/absPath|AppData|Users\\/.test(alles), "Rechnerpfad im Paket");
  // Eingabezellen sind leer.
  const ws = (await ladeOriginal()).getWorksheet(v.blattName)!;
  const nichtLeer = eingabeZellen.filter((adr) => {
    const w = ws.getCell(adr).value;
    return w !== null && w !== undefined && w !== "" && w !== "MM/JJJJ";
  });
  gleich(nichtLeer, []);
});

pruefe("jede Eingabezelle der Vorlage hat eine Kategorie – und umgekehrt", async () => {
  // Zaehlpruefung gegen das haeufigste Versagen dieses Projekts: eine Liste,
  // die jemand pflegen muss. Eine Zelle ohne Kategorie bliebe leer -- und eine
  // leere Zeile sieht aus wie eine Null.
  const ws = (await ladeOriginal()).getWorksheet(v.blattName)!;
  const zugeordnet = new Set([v.zellen.monat, v.zellen.name, v.zellen.kommentar, ...Object.values(v.feldZuZelle)]);
  const kandidaten: string[] = [];
  ws.eachRow((zeile) => {
    const z = zeile.getCell("D");
    const w = z.value as unknown;
    if (z.isMerged && z.master.address !== z.address) return;
    const leer = w === null || w === undefined || w === "" || w === "MM/JJJJ";
    const rahmen = z.border;
    if (leer && rahmen?.top && rahmen?.bottom && rahmen?.left && rahmen?.right) kandidaten.push(z.address);
  });
  // Jede leere Eingabezelle ist zugeordnet ...
  gleich(kandidaten.filter((a) => !zugeordnet.has(a)), []);
  // ... und jede zugeordnete Kategorie-Zelle ist wirklich eine.
  for (const adr of Object.values(v.feldZuZelle)) {
    wahr(kandidaten.includes(adr), `${v.id}: ${adr} ist keine leere Eingabezelle der Vorlage`);
  }
});

pruefe("die Beschriftung jeder Kategorie ist die Beschriftung ihrer Zeile im Formular", async () => {
  // Die Beschriftungen der App sind der Wortlaut der Firma -- sonst erfasst
  // jemand "Besuche Augenaerzte" und sendet sie in einer Zeile mit anderem Namen.
  // Verglichen wird ohne "Anzahl", Gross-/Kleinschreibung und Sonderzeichen.
  const ws = (await ladeOriginal()).getWorksheet(v.blattName)!;
  const roh = (t: string) =>
    t.toLowerCase().replace(/anzahls+/g, "").replace(/[^a-zäöüß0-9]+/g, " ").trim();
  const text = (adr: string): string => {
    const z = ws.getCell(adr.replace(/^D/, "B"));
    const w = z.value as unknown;
    if (typeof w === "string") return w;
    if (w && typeof w === "object" && "richText" in (w as object)) {
      return (w as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
    }
    return "";
  };
  // Bereich 4 heisst in allen Vorlagen gleich (Stempeluhr), und die Team-Vorlage
  // hat historisch eigene App-Wortlaute -- dort gilt der Abgleich nicht.
  if (istTeam) return;
  const alle = Object.values({ s1: v.felder.s1, s2: v.felder.s2, s3: v.felder.s3 }).flat();
  for (const [id, adr] of Object.entries(v.feldZuZelle)) {
    const feld = alle.find((fd) => fd.id === id);
    if (!feld) continue;
    const zeile = roh(text(adr));
    const label = roh(feld.label);
    wahr(
      zeile.includes(label) || label.includes(zeile) || zeile.startsWith(label.slice(0, 18)),
      `${v.id}: Zeile ${adr} heisst "${text(adr)}", die Kategorie "${feld.label}"`,
    );
  }
});

}
