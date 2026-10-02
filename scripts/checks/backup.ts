import "../browserShim";
import { gruppe, pruefe, gleich, wahr, wirft } from "../helfer";
import { ALT_BLOB, ALT_KLARTEXT, ALT_PASSWORT } from "../vektoren";

const { encryptData, decryptData, encryptBackup, ITERATIONEN_SICHERUNG } = await import(
  "../../src/utils/crypto"
);
const { base64ToBytes, bytesToBase64 } = await import("../../src/utils/base64");

gruppe("Backup-Verschlüsselung");

const inhalt = JSON.stringify({
  appFields: { s1: [{ id: "vf_schule", label: "Vorführungen Schule/Bildung 🏫", step: 1 }] },
  reportData: { month: "2026-08", name: "Marc Petry", notes: "Umlaute: äöüß – und Emoji 🎯" },
});

pruefe("verschlüsseln und wieder entschlüsseln ergibt denselben Text", async () => {
  const verschluesselt = await encryptData(inhalt, "GeheimesTestPasswort");
  gleich(await decryptData(verschluesselt, "GeheimesTestPasswort"), inhalt);
});

pruefe("Umlaute und Emojis überleben den Umlauf", async () => {
  const verschluesselt = await encryptData(inhalt, "pw");
  const zurueck = await decryptData(verschluesselt, "pw");
  gleich(JSON.parse(zurueck).reportData.notes, "Umlaute: äöüß – und Emoji 🎯");
});

pruefe("falsches Passwort schlägt fehl statt Unsinn zu liefern", async () => {
  const verschluesselt = await encryptData(inhalt, "richtig");
  await wirft(() => decryptData(verschluesselt, "falsch"));
});

pruefe("beschädigte Datei schlägt fehl", async () => {
  const verschluesselt = await encryptData(inhalt, "pw");
  const kaputt = verschluesselt.slice(0, verschluesselt.length - 8) + "AAAAAAAA";
  await wirft(() => decryptData(kaputt, "pw"));
});

pruefe("zweimal verschlüsseln ergibt verschiedene Chiffren (eigenes Salt/IV)", async () => {
  const eins = await encryptData(inhalt, "pw");
  const zwei = await encryptData(inhalt, "pw");
  gleich(eins === zwei, false);
});

gruppe("Sicherungsdatei RVB2 (0.9.72)");

/*
  Eine Sicherungsdatei liegt dauerhaft in einem Postfach oder Messenger. Wer sie
  dort findet, kann offline beliebig lange raten -- deshalb die teure
  Schluesselableitung. Und genau deshalb darf KEINE vorhandene Sicherung dabei
  unlesbar werden: Der Pruefvektor unten ist mit dem Code von 0.9.71 erzeugt
  und bleibt fuer immer lesbar.
*/
// Der Vektor steht in scripts/vektoren.ts: Der gebaute Stand (tests/produktion.spec.ts)
// liest dieselbe Datei -- eine Wahrheit, nicht zwei Kopien.
pruefe("eine Sicherung aus 0.9.71 (Altformat) bleibt lesbar", async () => {
  gleich(await decryptData(ALT_BLOB, ALT_PASSWORT), ALT_KLARTEXT);
});

pruefe("eine Sicherung aus 0.9.71 mit Zeilenumbruch am Dateiende bleibt lesbar", async () => {
  gleich(await decryptData(ALT_BLOB + "\n", ALT_PASSWORT), ALT_KLARTEXT);
});

pruefe("Umlauf im neuen Format", async () => {
  const datei = await encryptBackup(inhalt, "GeheimesTestPasswort");
  gleich(await decryptData(datei, "GeheimesTestPasswort"), inhalt);
});

pruefe("das neue Format trägt Kennung, Version und die Rundenzahl im Kopf", async () => {
  const datei = await encryptBackup(inhalt, "pw12345678");
  wahr(datei.startsWith("RVB2:"), "Kennung fehlt");
  const kopf = base64ToBytes(datei.slice(5));
  gleich(kopf[0], 2, "Version");
  gleich(new DataView(kopf.buffer).getUint32(1, false), ITERATIONEN_SICHERUNG, "Rundenzahl");
  gleich(ITERATIONEN_SICHERUNG >= 600000, true, "Rundenzahl unter der OWASP-Empfehlung");
});

pruefe("das Altformat wird weiter für die Textcodes verwendet (kein RVB2)", async () => {
  // Textcodes (RVC2) bleiben bewusst beim Altformat -- sonst meldete eine neue
  // Fassung gegenueber einer noch nicht aktualisierten "Falsches Passwort".
  const code = await encryptData(inhalt, "pw");
  wahr(!code.startsWith("RVB2:"), "encryptData erzeugt das neue Format");
});

pruefe("falsches Passwort scheitert im neuen Format", async () => {
  const datei = await encryptBackup(inhalt, "richtig-richtig");
  await wirft(() => decryptData(datei, "falsch-falsch"));
});

pruefe("eine beschädigte Datei scheitert im neuen Format", async () => {
  const datei = await encryptBackup(inhalt, "pw12345678");
  const kaputt = datei.slice(0, datei.length - 8) + "AAAAAAAA";
  await wirft(() => decryptData(kaputt, "pw12345678"));
});

pruefe("zweimal verschlüsseln ergibt im neuen Format verschiedene Dateien", async () => {
  const eins = await encryptBackup(inhalt, "pw12345678");
  const zwei = await encryptBackup(inhalt, "pw12345678");
  gleich(eins === zwei, false);
});

async function mitKopf(datei: string, aendere: (b: Uint8Array) => void): Promise<string> {
  const bytes = base64ToBytes(datei.slice(5));
  aendere(bytes);
  return "RVB2:" + bytesToBase64(bytes);
}

pruefe("eine herabgesetzte Rundenzahl öffnet die Datei nicht (anderer Schlüssel)", async () => {
  const datei = await encryptBackup(inhalt, "pw12345678");
  const manipuliert = await mitKopf(datei, (b) => new DataView(b.buffer).setUint32(1, 100000, false));
  await wirft(() => decryptData(manipuliert, "pw12345678"));
});

pruefe("eine absurde Rundenzahl wird VOR der Ableitung abgelehnt (kein eingefrorener Tab)", async () => {
  const datei = await encryptBackup(inhalt, "pw12345678");
  const manipuliert = await mitKopf(datei, (b) => new DataView(b.buffer).setUint32(1, 4000000000, false));
  const start = Date.now();
  await wirft(() => decryptData(manipuliert, "pw12345678"));
  wahr(Date.now() - start < 1000, `die Ablehnung dauerte ${Date.now() - start} ms -- die Ableitung lief offenbar an`);
});

pruefe("eine neuere Version meldet das ehrlich, nicht 'falsches Passwort'", async () => {
  const datei = await encryptBackup(inhalt, "pw12345678");
  const neuer = await mitKopf(datei, (b) => {
    b[0] = 3;
  });
  try {
    await decryptData(neuer, "pw12345678");
    throw new Error("wurde angenommen");
  } catch (e) {
    wahr(/neueren Fassung/.test(e instanceof Error ? e.message : ""), "Meldung nennt die neuere Fassung nicht");
  }
});

pruefe("eine abgeschnittene Datei wird abgelehnt statt abzustürzen", async () => {
  await wirft(() => decryptData("RVB2:AAAA", "pw12345678"));
});
