import { gruppe, pruefe, gleich, wahr } from "../helfer";
import { mergeVersand, mergeHistories } from "../../src/utils/merge";
import type { HistoryRecord } from "../../src/types";

/*
  Die Versand-Markierung ("ging schon an die Vertriebsleitung") ist Zustand, den
  BEIDE Geraete setzen koennen. Sie laeuft deshalb ueber einen eigenen
  Zeitstempel und nicht ueber savedAt -- der wandert bei jeder Zahleneingabe
  weiter und wuerde die Markierung des anderen Geraets ueberschreiben. Genau
  dieser Fehler hat bis 0.9.0 die Zaehlerstaende getroffen.
*/

const T1 = "2026-09-01T09:00:00.000Z";
const T2 = "2026-09-01T09:05:00.000Z";
const T3 = "2026-09-01T09:10:00.000Z";

const monat = (zusatz: Partial<HistoryRecord>): HistoryRecord => ({
  month: "2026-08",
  name: "Marc Petry",
  notes: "",
  values: { vf_schule: 3 },
  savedAt: T1,
  ...zusatz,
});

gruppe("Versandstand je Monat");

pruefe("eine Markierung schlägt keine Markierung", () => {
  gleich(mergeVersand({ sentAt: T1, sentUpdatedAt: T1 }, {}), {
    sentAt: T1,
    sentUpdatedAt: T1,
  });
  gleich(mergeVersand({}, { sentAt: T1, sentUpdatedAt: T1 }), {
    sentAt: T1,
    sentUpdatedAt: T1,
  });
});

pruefe("die jüngere Entscheidung gewinnt, auch wenn sie eine Rücknahme ist", () => {
  // Gerät A markiert um T1, Gerät B nimmt um T2 zurück -> zurückgenommen.
  const r = mergeVersand({ sentAt: T1, sentUpdatedAt: T1 }, { sentUpdatedAt: T2 });
  wahr(!r.sentAt, "Die Rücknahme wurde ignoriert");
  gleich(r.sentUpdatedAt, T2);
});

pruefe("eine erneute Markierung nach einer Rücknahme gewinnt wieder", () => {
  const r = mergeVersand({ sentUpdatedAt: T2 }, { sentAt: T3, sentUpdatedAt: T3 });
  gleich(r, { sentAt: T3, sentUpdatedAt: T3 });
});

pruefe("Altbestand ohne Änderungsstempel verliert die Markierung nicht", () => {
  // Vor 0.9.12 gab es beide Felder nicht. Kann es dort keine Rücknahme gegeben
  // haben, darf eine vorhandene Markierung auch nicht verschwinden.
  gleich(mergeVersand({ sentAt: T1 }, {}), { sentAt: T1 });
  gleich(mergeVersand({}, {}), {});
});

pruefe("das Zusammenführen ist idempotent", () => {
  const a = mergeVersand({ sentAt: T1, sentUpdatedAt: T1 }, { sentUpdatedAt: T2 });
  const b = mergeVersand(a, a);
  gleich(b, a);
});

pruefe("eine spätere Zahleneingabe löscht die Markierung nicht", () => {
  /*
    Der eigentliche Grund fuer den eigenen Zeitstempel, als Ablauf nachgestellt:

      1. Geraet A exportiert den Monat  -> sentAt gesetzt, savedAt bleibt alt
      2. Geraet B tippt danach eine Zahl -> savedAt von B ist juenger
      3. Abgleich

    Wuerde die Markierung an savedAt haengen, gewaenne B (ohne Markierung) und
    der Monat stuende wieder als offen da -- obwohl er nachweislich raus ist.
  */
  const geraetA = monat({ sentAt: T1, sentUpdatedAt: T1, savedAt: T1 });
  const geraetB = monat({ values: { vf_schule: 4 }, savedAt: T3 });

  const zusammen = mergeHistories({ "2026-08": geraetA }, { "2026-08": geraetB });
  const rec = zusammen["2026-08"];

  gleich(rec.sentAt, T1);
  // und die juengere Zahl von B ist trotzdem angekommen
  gleich(rec.values.vf_schule, 4);
  // savedAt bleibt der juengere Stand
  gleich(rec.savedAt, T3);
});

pruefe("eine Rücknahme überlebt eine spätere Zahleneingabe des anderen Geräts", () => {
  // Gegenprobe zum Fall oben: Diesmal ist die Ruecknahme die juengere
  // Entscheidung und darf nicht von einer alten Markierung ueberholt werden.
  const geraetA = monat({ sentAt: T1, sentUpdatedAt: T1, savedAt: T3 });
  const geraetB = monat({ sentUpdatedAt: T2, savedAt: T1 });

  const rec = mergeHistories({ "2026-08": geraetA }, { "2026-08": geraetB })["2026-08"];
  wahr(!rec.sentAt, "Die Rücknahme wurde von der älteren Markierung überholt");
});

pruefe("Monate ohne Markierung bleiben unverändert", () => {
  const a = monat({});
  const rec = mergeHistories({ "2026-08": a }, { "2026-08": a })["2026-08"];
  wahr(!("sentAt" in rec) || rec.sentAt === undefined, "sentAt aus dem Nichts erzeugt");
});
