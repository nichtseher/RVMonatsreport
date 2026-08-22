import "../browserShim";
import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { pruefeSyncPaket, monateImPaket, PAKET_APP } from "../../src/utils/syncSchema";
import type { FieldConfig, TimeLog } from "../../src/types";

const { buildTextCode, parseTextCode, istVerschluesselterCode, buildChunks, parseChunk } =
  await import("../../src/utils/syncCode");

const gueltigesPaket = {
  app: PAKET_APP,
  fmt: 1,
  appFields: {
    s1: [{ id: "vf_schule", label: "Vorführungen Schule", step: 1 }],
    s2: [] as FieldConfig[],
    s3: [] as FieldConfig[],
    s4: [] as FieldConfig[],
  },
  history: {
    "2026-08": {
      month: "2026-08",
      name: "Marc Petry",
      notes: "Messe",
      values: { vf_schule: 4 },
      savedAt: "2026-08-31T10:00:00.000Z",
      timeLogs: [] as TimeLog[],
    },
  },
  carryover: {
    regularVacationEntitlement: 30,
    additionalVacationEntitlement: 0,
    vacationCarryover: 0,
    overtimeCarryover: 0,
    dailyTargetHours: 8,
  },
  reportData: { month: "2026-09", name: "Marc Petry", notes: "", values: { vf_schule: 2 } },
};

gruppe("Struktur-Prüfung empfangener Pakete");

pruefe("ein gültiges Paket wird angenommen", () => {
  const e = pruefeSyncPaket(gueltigesPaket);
  wahr(e.ok, e.ok ? "" : e.grund);
  gleich(monateImPaket(gueltigesPaket), 1);
});

pruefe("altes Paket ohne Kennung bleibt lesbar", () => {
  const { app, fmt, ...ohneKennung } = gueltigesPaket;
  wahr(pruefeSyncPaket(ohneKennung).ok, "Pakete vor 0.9.5 müssen weiter funktionieren");
});

// Genau der Fall, der am 2026-08-03 den Fehlerbildschirm ausgelöst hat
pruefe("der reproduzierte Unsinns-Fall wird abgelehnt", () => {
  const e = pruefeSyncPaket({ appFields: "kaputt", history: 12345, carryover: "nein", reportData: 42 });
  wahr(!e.ok, "Unsinn wurde angenommen");
});

pruefe("einzelne beschädigte Teile werden erkannt", () => {
  const faelle: Array<[string, unknown]> = [
    ["kein Objekt", "nur ein Text"],
    ["leeres Objekt ohne Inhalt", {}],
    ["Kategorien-Bereich fehlt", { appFields: { s1: [], s2: [], s3: [] } }],
    ["Kategorie ohne id", { appFields: { s1: [{ label: "ohne id" }], s2: [], s3: [], s4: [] } }],
    ["Archiv ist eine Liste", { history: [] }],
    ["Archiv-Schlüssel ist kein Monat", { history: { August: { values: {} } } }],
    ["Zählerstand ist Text", { history: { "2026-08": { values: { x: "viel" } } } }],
    ["Schichten sind kein Array", { history: { "2026-08": { values: {}, timeLogs: 5 } } }],
    ["laufender Monat ohne Berichtsmonat", { reportData: { values: {} } }],
    ["Jahreskonto mit Text statt Zahl", { history: {}, carryover: { dailyTargetHours: "acht" } }],
  ];
  const durchgerutscht = faelle.filter(([, paket]) => pruefeSyncPaket(paket).ok).map(([name]) => name);
  gleich(durchgerutscht, [], "diese Fälle wurden fälschlich angenommen");
});

pruefe("Kopplungscodes werden als solche erkannt", () => {
  const e = pruefeSyncPaket({ k: "rvw-offer", sdp: {} });
  wahr(!e.ok, "Kopplungscode wurde als Datenpaket angenommen");
  wahr(!e.ok && /Live-Verbindung/.test(e.grund), "Meldung nennt die Live-Verbindung nicht");
});

pruefe("Paket einer fremden Anwendung wird abgelehnt", () => {
  wahr(!pruefeSyncPaket({ app: "andere-app", history: {} }).ok);
});

pruefe("unbekannte Zusatzfelder stören nicht", () => {
  // Damit eine spätere Fassung Felder ergänzen kann, ohne ältere zu brechen
  wahr(pruefeSyncPaket({ ...gueltigesPaket, neuesFeldAusDerZukunft: { a: 1 } }).ok);
});

gruppe("Übertragungscodes");

const inhalt = JSON.stringify(gueltigesPaket);

pruefe("Textcode ohne Passwort: Umlauf", async () => {
  const code = await buildTextCode(inhalt);
  wahr(code.startsWith("RVC1:"), "falsches Präfix: " + code.slice(0, 8));
  wahr(!istVerschluesselterCode(code));
  const e = await parseTextCode(code);
  gleich(e.ok && e.inhalt, inhalt);
});

pruefe("Textcode mit Passwort: Umlauf", async () => {
  const code = await buildTextCode(inhalt, "GeheimesTestPasswort");
  wahr(code.startsWith("RVC2:"), "falsches Präfix: " + code.slice(0, 8));
  wahr(istVerschluesselterCode(code));
  const e = await parseTextCode(code, "GeheimesTestPasswort");
  gleich(e.ok && e.inhalt, inhalt);
});

pruefe("verschlüsselter Code ohne Passwort meldet 'passwort-noetig'", async () => {
  const code = await buildTextCode(inhalt, "pw");
  const e = await parseTextCode(code);
  gleich(e.ok, false);
  gleich(e.grund, "passwort-noetig");
});

pruefe("falsches Passwort meldet 'passwort-falsch'", async () => {
  const code = await buildTextCode(inhalt, "richtig");
  const e = await parseTextCode(code, "falsch");
  gleich(e.ok, false);
  gleich(e.grund, "passwort-falsch");
});

pruefe("fremder Text meldet 'kein-code'", async () => {
  gleich((await parseTextCode("Hallo Welt")).grund, "kein-code");
  gleich((await parseTextCode("")).grund, "kein-code");
});

pruefe("verschlüsselter Code verrät den Inhalt nicht im Klartext", async () => {
  const code = await buildTextCode(inhalt, "pw");
  wahr(!code.includes("Marc"), "Name steht lesbar im Code");
  wahr(!code.includes("vf_schule"), "Feld-ID steht lesbar im Code");
});

pruefe("QR-Teilstücke lassen sich zerlegen und wieder zusammensetzen", async () => {
  const teile = await buildChunks(inhalt);
  wahr(teile.length >= 1);
  const zerlegt = teile.map(parseChunk);
  wahr(zerlegt.every((t) => t !== null), "ein Teilstück ließ sich nicht lesen");
  gleich(zerlegt.map((t) => t!.seq), teile.map((_, i) => i + 1));
  gleich(new Set(zerlegt.map((t) => t!.id)).size, 1, "alle Teile brauchen dieselbe Transfer-ID");
  gleich(zerlegt[0]!.total, teile.length);
});

pruefe("beschädigte QR-Teilstücke werden abgelehnt", () => {
  gleich(parseChunk("kein RV-Code"), null);
  gleich(parseChunk("RV1|ABCD|0|3|z|daten"), null, "Teil 0 darf es nicht geben");
  gleich(parseChunk("RV1|ABCD|4|3|z|daten"), null, "Teil 4 von 3 darf es nicht geben");
  gleich(parseChunk("RV1|ABCD|1"), null, "zu wenige Felder");
});
