import "../browserShim";
import { gruppe, pruefe, gleich, wirft } from "../helfer";

const { encryptData, decryptData } = await import("../../src/utils/crypto");

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
