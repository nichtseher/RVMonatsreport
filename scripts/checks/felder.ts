import { gruppe, pruefe, gleich, wahr } from "../helfer";
import {
  VORLAGEN,
  STANDARD_VORLAGE_ID,
  VORLAGE_TEAM_BLINDENHILFSMITTEL,
  VORLAGE_APA_AUSSENDIENST,
  VORLAGE_VERTRIEB,
  bereichsAnsage,
  bereichsTitel,
  findeVorlage,
} from "../../src/utils/vorlagen";
import {
  anVorlage,
  feldSchluessel,
  istFremd,
  ladeFelder,
  quickSchluessel,
  standardFelder,
} from "../../src/utils/felder";
import type { FieldConfig, SectionsConfig } from "../../src/types";

/*
  Die Kategorien je Vorlage (0.9.73). In jedem Team sind andere Zahlen gefragt;
  die Oberflaeche zeigt deshalb genau die Zeilen des gewaehlten Formulars.
  Hier steht, was dabei nie schiefgehen darf: eine Zeile ohne Kategorie, eine
  Kategorie ohne Zeile, ein Wechsel, der Zahlen vernichtet, ein fremder Satz,
  der die Einstellung verdraengt.
*/

const BEREICHE = ["s1", "s2", "s3", "s4"] as const;
const alle = (f: SectionsConfig): FieldConfig[] => BEREICHE.flatMap((s) => f[s]);
const ZEIT_IDS = ["tage_arbeit", "std_buero", "std_aussendienst", "tage_urlaub", "tage_krank", "tage_feiertag"];

gruppe("Kategorien je Vorlage");

for (const v of VORLAGEN) {
  pruefe(`${v.name}: Kennungen der Kategorien sind eindeutig, jede hat Namen, Schritt und Symbol`, () => {
    const felder = alle(v.felder);
    const ids = felder.map((f) => f.id);
    gleich(new Set(ids).size, ids.length);
    for (const f of felder) {
      wahr(f.label.trim().length > 0, `${v.id}: ${f.id} ohne Beschriftung`);
      wahr(f.step > 0, `${v.id}: ${f.id} ohne Schritt`);
      wahr(!!f.icon, `${v.id}: ${f.id} ohne Symbol`);
      wahr(!f.isCustom, `${v.id}: ${f.id} ist als eigene Kategorie markiert`);
    }
  });

  pruefe(`${v.name}: jede Kategorie der Bereiche 1 bis 3 hat eine Zeile im Formular`, () => {
    // Sonst erfasst jemand eine Zahl, die nie beim Chef ankommt.
    for (const s of ["s1", "s2", "s3"] as const) {
      for (const f of v.felder[s]) {
        wahr(f.id in v.feldZuZelle, `${v.id}: "${f.label}" (${f.id}) hat keine Zelle`);
      }
    }
  });

  pruefe(`${v.name}: jede zugeordnete Zelle gehört zu einer Kategorie dieser Vorlage`, () => {
    const ids = new Set(alle(v.felder).map((f) => f.id));
    for (const id of Object.keys(v.feldZuZelle)) wahr(ids.has(id), `${v.id}: Zelle für unbekannte Kategorie ${id}`);
    const zellen = Object.values(v.feldZuZelle);
    gleich(new Set(zellen).size, zellen.length);
  });

  pruefe(`${v.name}: Bereich 4 trägt die Arbeitszeit-Kategorien, auf denen Stempeluhr und Jahreskonto beruhen`, () => {
    gleich(v.felder.s4.map((f) => f.id), ZEIT_IDS);
  });

  pruefe(`${v.name}: Bereichsnamen sind ausgefüllt, Titel und Ansage sind lesbar`, () => {
    for (const s of BEREICHE) {
      const b = v.bereiche[s];
      for (const text of [b.name, b.kurz, b.bereich, b.beschreibung]) wahr(text.trim().length > 0, `${v.id} ${s}`);
      wahr(bereichsTitel(v, s).startsWith(`${s.slice(1)}. `), `${v.id} ${s}: Titel ohne Nummer`);
      wahr(!/[&()]/.test(bereichsAnsage(v, s)), `${v.id} ${s}: Ansage enthält & oder Klammer`);
    }
  });

  pruefe(`${v.name}: die Standardkategorien sind eine Kopie, nie das gemeinsame Objekt`, () => {
    const kopie = standardFelder(v);
    kopie.s1[0].label = "GEÄNDERT";
    kopie.s4.pop();
    gleich(alle(v.felder).some((f) => f.label === "GEÄNDERT"), false);
    gleich(v.felder.s4.length, ZEIT_IDS.length);
    // Bereich 4 wird von allen Vorlagen geteilt: Eine Aenderung darf keine andere Vorlage treffen.
    for (const w of VORLAGEN) gleich(w.felder.s4.length, ZEIT_IDS.length);
  });
}

pruefe("gleiche Kategorie-IDs bedeuten in allen Vorlagen dieselbe Tätigkeit (gleiche Zeile)", () => {
  // Wer dieselbe ID in zwei Formularen nutzt, uebernimmt beim Wechsel die Zahl.
  // Das darf nur gelten, wo die Zeile auch dasselbe verlangt -- die Beschriftung
  // ist der Wortlaut der Zeile, also muss sie bis auf Kleinigkeiten gleich sein.
  const normal = (t: string) => t.toLowerCase().replace(/^anzahl\s+/, "").replace(/[^a-zäöüß]+/g, " ").trim();
  const gesehen = new Map<string, { label: string; vorlage: string }>();
  for (const v of VORLAGEN) {
    for (const f of [...v.felder.s1, ...v.felder.s2, ...v.felder.s3]) {
      const frueher = gesehen.get(f.id);
      if (frueher) {
        // Ausnahme: dieselbe Taetigkeit, aber der Wortlaut der Firma unterscheidet sich im Zusatz.
        const a = normal(frueher.label);
        const b = normal(f.label);
        wahr(
          a === b || a.includes(b) || b.includes(a) || ["messen"].includes(f.id),
          `ID ${f.id} heißt in ${frueher.vorlage} "${frueher.label}", in ${v.id} "${f.label}"`,
        );
      } else gesehen.set(f.id, { label: f.label, vorlage: v.id });
    }
  }
});

gruppe("Kategorien beim Laden, Wechseln und bei fremden Sätzen");

const team = findeVorlage(VORLAGE_TEAM_BLINDENHILFSMITTEL);
const apa = findeVorlage(VORLAGE_APA_AUSSENDIENST);
const vertrieb = findeVorlage(VORLAGE_VERTRIEB);

pruefe("Speicherplatz: die Vorgabevorlage behält den alten Schlüssel, die anderen haben eigene", () => {
  gleich(feldSchluessel(STANDARD_VORLAGE_ID), "aussendienst_pwa_fields");
  const schluessel = VORLAGEN.map((v) => feldSchluessel(v.id));
  gleich(new Set(schluessel).size, VORLAGEN.length);
});

pruefe("ein leerer oder beschädigter Speicher ergibt die Kategorien der Vorlage", () => {
  for (const v of VORLAGEN) {
    const fehler = console.error;
    console.error = () => {}; // der beschaedigte Text wird gemeldet -- hier erwuenscht
    try {
      for (const roh of [null, "", "{kaputt", "42", JSON.stringify({ s1: [] })]) {
        gleich(ladeFelder(v, roh), standardFelder(v));
      }
    } finally {
      console.error = fehler;
    }
  }
});

pruefe("ein gespeicherter Satz bleibt unverändert, auch mit gelöschter Standardkategorie", () => {
  const eigener = standardFelder(apa);
  eigener.s2 = eigener.s2.filter((f) => f.id !== "gespr_techberater");
  eigener.s1[0].label = "Meine Schulvorführungen";
  const geladen = ladeFelder(apa, JSON.stringify(eigener));
  // Die Nachruestung aus 0.9.x darf eine Kategorie nur nachtragen, wenn die Vorlage sie kennt.
  gleich(geladen.s2.some((f) => f.id === "gespr_techberater"), false);
  gleich(geladen.s1[0].label, "Meine Schulvorführungen");
});

pruefe("die Nachrüstungen aus 0.9.x gelten nur dort, wo die Vorlage die Kategorie kennt", () => {
  const alt = standardFelder(team);
  alt.s3 = alt.s3.filter((f) => f.id !== "envision_vf" && f.id !== "wewalk_tel");
  alt.s4 = alt.s4.filter((f) => !["tage_urlaub", "tage_krank"].includes(f.id));
  const geladen = ladeFelder(team, JSON.stringify(alt));
  gleich(geladen.s3.map((f) => f.id), ["tac_vf", "envision_vf", "feel_vf", "wewalk_vf", "wewalk_tel"]);
  gleich(geladen.s4.map((f) => f.id).sort(), [...ZEIT_IDS].sort());
  // APA kennt wewalk_tel nicht und bekommt es nicht.
  gleich(ladeFelder(apa, JSON.stringify(standardFelder(apa))).s3.some((f) => f.id === "wewalk_tel"), false);
});

pruefe("fremd ist, was eine Standardkategorie einer anderen Vorlage enthält – eigene zählen nicht", () => {
  gleich(istFremd(standardFelder(team), team), false);
  gleich(istFremd(standardFelder(team), apa), true);
  gleich(istFremd(standardFelder(vertrieb), team), true);
  const mitEigener = standardFelder(apa);
  mitEigener.s2.push({ id: "eigen_1", label: "Mein Feld", step: 1, isCustom: true });
  gleich(istFremd(mitEigener, apa), false);
});

pruefe("ein fremder Satz verdrängt die Einstellung nicht: Kategorien der Vorlage plus eigene", () => {
  // Fall: ein Archivmonat der anderen Vorlage, ein gekoppeltes Geraet oder eine Sicherung.
  const fremd = standardFelder(team);
  fremd.s1.push({ id: "eigen_7", label: "Eigene Taste", step: 1, isCustom: true });
  const angepasst = anVorlage(fremd, apa);
  gleich(angepasst.s1.map((f) => f.id), [...apa.felder.s1.map((f) => f.id), "eigen_7"]);
  gleich(angepasst.s2.map((f) => f.id), apa.felder.s2.map((f) => f.id));
  gleich(istFremd(angepasst, apa), false);
  // Idempotent: nochmal angewendet aendert sich nichts.
  gleich(anVorlage(angepasst, apa), angepasst);
});

pruefe("ein Satz, der schon zur Vorlage gehört, wird nicht angefasst (identisches Objekt)", () => {
  const s = standardFelder(vertrieb);
  wahr(anVorlage(s, vertrieb) === s, "anVorlage hat einen eigenen Satz kopiert");
});

pruefe("beim bewussten Wechsel gibt es die Kategorien der neuen Vorlage, eigene Kategorien bleiben", () => {
  const aktuell = standardFelder(team);
  aktuell.s2.push({ id: "eigen_2", label: "Eigene", step: 1, isCustom: true });
  // Auch wenn der Satz zufaellig "nicht fremd" aussieht (alle Team-Sonderfelder geloescht):
  const nurGemeinsame = standardFelder(team);
  nurGemeinsame.s2 = [];
  nurGemeinsame.s3 = nurGemeinsame.s3.filter((f) => f.id === "tac_vf");
  nurGemeinsame.s2.push({ id: "eigen_3", label: "Eigene", step: 1, isCustom: true });
  for (const satz of [aktuell, nurGemeinsame]) {
    const neu = anVorlage(satz, apa, true);
    const ids = alle(neu).map((f) => f.id);
    for (const f of alle(apa.felder)) wahr(ids.includes(f.id), `${f.id} fehlt nach dem Wechsel`);
    wahr(ids.some((i) => i.startsWith("eigen_")), "eigene Kategorie verloren");
    wahr(!ids.includes("schul_vorort"), "Kategorie der alten Vorlage ist noch sichtbar");
  }
});

pruefe("beim Wechsel steht die Beschriftung der neuen Vorlage, nicht die der alten", () => {
  const neu = anVorlage(standardFelder(team), apa, true);
  const messen = alle(neu).find((f) => f.id === "messen")!;
  gleich(messen.label, apa.felder.s2.find((f) => f.id === "messen")!.label);
});

pruefe("eine Kategorie, die keine Vorlage kennt, bleibt erhalten – auch ohne Markierung „eigen“", () => {
  // Fall aus der Oberflaechenpruefung: Eine Kategorie des Nutzers ohne isCustom
  // (aeltere Staende, Handarbeit in der Sicherung) darf nicht still verschwinden.
  const satz = standardFelder(apa);
  satz.s1.push({ id: "s1_eigen_pruef", label: "Eigene Prüfkategorie", step: 1, icon: "" });
  gleich(istFremd(satz, apa), false);
  gleich(anVorlage(satz, apa) === satz, true);
  // Auch bei einem erzwungenen Wechsel bleibt sie.
  const nachWechsel = anVorlage(satz, team, true);
  wahr(nachWechsel.s1.some((f) => f.id === "s1_eigen_pruef"), "unmarkierte eigene Kategorie verloren");
  // Eine Standardkategorie der anderen Vorlage ist dagegen fremd.
  const mitFremder = standardFelder(apa);
  mitFremder.s2.push(team.felder.s2[0]);
  gleich(istFremd(mitFremder, apa), true);
});

pruefe("Schnell-Erfassung: die eigene Auswahl liegt je Vorlage, die Vorgabe behält den alten Schlüssel", () => {
  gleich(quickSchluessel(STANDARD_VORLAGE_ID), "aussendienst_pwa_quick_v1");
  const schluessel = VORLAGEN.map((v) => quickSchluessel(v.id));
  gleich(new Set(schluessel).size, VORLAGEN.length);
  // Auswahl und Kategorien einer Vorlage duerfen nie denselben Schluessel haben.
  for (const v of VORLAGEN) wahr(quickSchluessel(v.id) !== feldSchluessel(v.id), `${v.id}: gleicher Schlüssel`);
});
