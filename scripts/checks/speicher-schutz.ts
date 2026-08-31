import { gruppe, pruefe, gleich, wahr } from "../helfer";
import {
  beurteileSpeicher,
  beurteileSicherung,
  SICHERUNG_FAELLIG_NACH_TAGEN,
  SpeicherLage,
} from "../../src/utils/speicherSchutz";

/**
 * Prüfungen zum Datenverlust-Schutz (0.9.16).
 *
 * Der Anlass: `navigator.storage.persist()` fehlte in diesem Projekt
 * vollständig. Die Beurteilung entscheidet, ob jemand gewarnt wird, bevor der
 * Browser einen kompletten Monat löscht — sie darf sich also weder
 * fälschlich beruhigen noch bei jedem Start dramatisieren.
 */

gruppe("Speicherlage");

const lage = (teil: Partial<SpeicherLage>): SpeicherLage => ({
  unterstuetzt: true,
  dauerhaft: false,
  installiert: false,
  webkit: false,
  ...teil,
});

pruefe("dauerhafter Speicher ist sicher und rät zu nichts", () => {
  const urteil = beurteileSpeicher(lage({ dauerhaft: true }));
  gleich(urteil.stufe, "sicher");
  gleich(urteil.rat, null);
});

pruefe("dauerhaft schlägt jede andere Bedingung", () => {
  // Auch auf iOS ohne Installation: Wenn der Browser den Speicher bestätigt
  // hat, gilt die Sieben-Tage-Regel nicht mehr.
  const urteil = beurteileSpeicher(
    lage({ dauerhaft: true, webkit: true, installiert: false }),
  );
  gleich(urteil.stufe, "sicher");
});

pruefe("iOS ohne Installation ist kritisch, nicht bloß gefährdet", () => {
  const urteil = beurteileSpeicher(lage({ webkit: true, installiert: false }));
  gleich(urteil.stufe, "kritisch");
  wahr(urteil.ansage.includes("sieben Tage"), "Frist muss in der Ansage stehen");
  wahr(
    (urteil.rat || "").includes("Home-Bildschirm"),
    "Der Rat muss die Handlung nennen, die tatsächlich hilft",
  );
});

pruefe("iOS als installierte App ist nur gefährdet", () => {
  gleich(beurteileSpeicher(lage({ webkit: true, installiert: true })).stufe, "gefaehrdet");
});

pruefe("Android/Desktop ohne Zusage ist gefährdet", () => {
  gleich(beurteileSpeicher(lage({ webkit: false, installiert: false })).stufe, "gefaehrdet");
  gleich(beurteileSpeicher(lage({ webkit: false, installiert: true })).stufe, "gefaehrdet");
});

pruefe("fehlende Browser-Unterstützung führt nicht zur Entwarnung", () => {
  const urteil = beurteileSpeicher(lage({ unterstuetzt: false }));
  gleich(urteil.stufe, "unbekannt");
  wahr(urteil.rat !== null, "Auch ohne Auskunft muss ein Rat kommen");
});

pruefe("jede Stufe außer sicher hat eine Ansage und einen Rat", () => {
  const faelle: SpeicherLage[] = [
    lage({ unterstuetzt: false }),
    lage({ webkit: true, installiert: false }),
    lage({ webkit: true, installiert: true }),
    lage({ webkit: false, installiert: false }),
  ];
  for (const f of faelle) {
    const u = beurteileSpeicher(f);
    wahr(u.ansage.length > 0, `Ansage fehlt bei ${JSON.stringify(f)}`);
    wahr(u.rat !== null && u.rat.length > 0, `Rat fehlt bei ${JSON.stringify(f)}`);
    wahr(u.kurz.length > 0, `Kurzform fehlt bei ${JSON.stringify(f)}`);
  }
});

gruppe("Sicherungs-Erinnerung");

const JETZT = new Date("2026-08-31T10:00:00.000Z");
const vorTagen = (n: number) =>
  new Date(JETZT.getTime() - n * 86400000).toISOString();

pruefe("ohne Inhalt wird nicht erinnert", () => {
  // Sonst fordert eine frische Installation ohne einen einzigen Eintrag zur
  // Sicherung auf -- dieselbe Ueberlegung wie bei monthHasContent.
  gleich(beurteileSicherung(null, JETZT, false).faellig, false);
  gleich(beurteileSicherung(vorTagen(99), JETZT, false).faellig, false);
});

pruefe("noch nie gesichert ist mit Inhalt fällig", () => {
  const u = beurteileSicherung(null, JETZT, true);
  gleich(u.faellig, true);
  gleich(u.tage, null);
  wahr(u.ansage.length > 0, "Ansage fehlt");
});

pruefe("frische Sicherung ist nicht fällig", () => {
  gleich(beurteileSicherung(vorTagen(0), JETZT, true).faellig, false);
  gleich(beurteileSicherung(vorTagen(1), JETZT, true).faellig, false);
});

pruefe("die Grenze liegt bei 14 Tagen", () => {
  gleich(SICHERUNG_FAELLIG_NACH_TAGEN, 14);
  gleich(beurteileSicherung(vorTagen(13), JETZT, true).faellig, false);
  gleich(beurteileSicherung(vorTagen(14), JETZT, true).faellig, true);
});

pruefe("die Tageszahl steht in der Ansage", () => {
  const u = beurteileSicherung(vorTagen(20), JETZT, true);
  gleich(u.tage, 20);
  wahr(u.ansage.includes("20"), "Die Ansage muss die Tageszahl nennen");
});

pruefe("unlesbarer Zeitpunkt führt nicht zur Entwarnung", () => {
  // Ein kaputter Wert im Speicher darf nicht wie "gerade eben gesichert"
  // wirken -- das waere genau die stille Beruhigung, die hier vermieden wird.
  const u = beurteileSicherung("kein-datum", JETZT, true);
  gleich(u.faellig, true);
  gleich(u.tage, null);
});

pruefe("nicht fällige Fälle sagen nichts an", () => {
  gleich(beurteileSicherung(vorTagen(2), JETZT, true).ansage, "");
  gleich(beurteileSicherung(null, JETZT, false).ansage, "");
});
