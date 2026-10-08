import type { FieldConfig, SectionsConfig } from "../types";
import { STANDARD_VORLAGE_ID, VORLAGEN, type VorlageMeta } from "./vorlagen";

/**
 * Die Kategorien eines Geraets, je Vorlage (ab 0.9.73).
 *
 * Jede Vorlage bringt ihre eigenen Kategorien mit (`VorlageMeta.felder`). Die
 * Einstellung eines Geraets -- umbenannte, geloeschte und eigene Kategorien --
 * liegt deshalb je Vorlage in einem eigenen Schluessel. Die Vorgabevorlage
 * behaelt den alten Schluessel: Wer schon Kategorien eingestellt hat, findet
 * sie unveraendert wieder, ohne dass etwas umgezogen werden muss.
 *
 * Zwei Dinge sollen nie passieren:
 *  - Beim Wechsel der Vorlage geht keine erfasste Zahl verloren. Zahlen
 *    haengen an der Kategorie-ID im Bericht; Kategorien, die die neue Vorlage
 *    nicht kennt, sind dann nur nicht sichtbar -- beim Zurueckwechseln sind
 *    sie samt Zahl wieder da.
 *  - Ein fremder Kategoriesatz (aus einem Archivmonat der anderen Vorlage, aus
 *    einem Geraeteabgleich, aus der Datensicherung) darf die Einstellung der
 *    gewaehlten Vorlage nicht verdraengen. `anVorlage` faengt das ab.
 */

export const FELD_SCHLUESSEL_BASIS = "aussendienst_pwa_fields";

export const feldSchluessel = (vorlageId: string): string =>
  vorlageId === STANDARD_VORLAGE_ID ? FELD_SCHLUESSEL_BASIS : `${FELD_SCHLUESSEL_BASIS}__${vorlageId}`;

/**
 * Die selbst gewaehlten Kacheln der Schnell-Erfassung gehoeren zu einer Vorlage:
 * Sie bestehen aus Kategorie-IDs, und die kennt nur diese Vorlage. Bis 0.9.74 lag
 * die Auswahl in EINEM Schluessel -- nach einem Wechsel zeigte sie ins Leere und
 * das Feld blieb leer. Die Vorgabevorlage behaelt den alten Schluessel.
 */
export const QUICK_SCHLUESSEL_BASIS = "aussendienst_pwa_quick_v1";

export const quickSchluessel = (vorlageId: string): string =>
  vorlageId === STANDARD_VORLAGE_ID ? QUICK_SCHLUESSEL_BASIS : `${QUICK_SCHLUESSEL_BASIS}__${vorlageId}`;

const BEREICHE = ["s1", "s2", "s3", "s4"] as const;

const kopie = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Die Kategorien der Vorlage als frische Kopie -- nie das gemeinsame Objekt. */
export const standardFelder = (vorlage: VorlageMeta): SectionsConfig => kopie(vorlage.felder);

const sindFelder = (x: unknown): x is SectionsConfig =>
  !!x && typeof x === "object" && BEREICHE.every((s) => Array.isArray((x as SectionsConfig)[s]));

const alleIds = (vorlage: VorlageMeta): Set<string> =>
  new Set(BEREICHE.flatMap((s) => vorlage.felder[s].map((f) => f.id)));

/**
 * Gehoert diese Kategorie einer ANDEREN Vorlage? Nur dann ist sie fremd.
 *
 * Bewusst nicht "kennt die Vorlage nicht": Eine Kategorie, die gar keine
 * Vorlage kennt, ist eine des Nutzers -- auch ohne `isCustom` (aeltere
 * Staende, Handarbeit in der Sicherung). Sie zu verwerfen hiesse, Eingaben des
 * Nutzers still zu loeschen; die Absicherung soll nur fremde Standardsaetze
 * abfangen.
 */
const istStandardAndererVorlage = (f: FieldConfig, vorlage: VorlageMeta): boolean => {
  if (f.isCustom || alleIds(vorlage).has(f.id)) return false;
  return VORLAGEN.some((v) => v.id !== vorlage.id && alleIds(v).has(f.id));
};

/** Gehoert dieser Satz zu einer anderen Vorlage? Ja, sobald eine Kategorie einer anderen darin steckt. */
export const istFremd = (felder: SectionsConfig, vorlage: VorlageMeta): boolean =>
  BEREICHE.some((s) => felder[s].some((f) => istStandardAndererVorlage(f, vorlage)));

/**
 * Passt einen Kategoriesatz an die Vorlage an.
 *
 * Ein Satz, der schon zur Vorlage gehoert, bleibt unveraendert -- sonst kaeme
 * jede geloeschte Standardkategorie bei jedem Laden zurueck. Ein fremder Satz
 * (oder `erzwingen`, beim bewussten Wechsel) wird ersetzt durch: die
 * Kategorien der Vorlage in ihrer Reihenfolge, plus die eigenen Kategorien.
 *
 * Umbenennungen werden dabei bewusst NICHT mitgenommen: Dieselbe ID heisst in
 * zwei Vorlagen oft anders (die Beschriftung IST der Wortlaut der jeweiligen
 * Zeile), und eine Beschriftung der alten Vorlage unter dem Formular der
 * neuen zu zeigen waere falsch.
 */
export const anVorlage = (felder: SectionsConfig, vorlage: VorlageMeta, erzwingen = false): SectionsConfig => {
  if (!erzwingen && !istFremd(felder, vorlage)) return felder;
  const ergebnis = standardFelder(vorlage);
  BEREICHE.forEach((s) => {
    // Behalten wird alles, was nicht zu einer Vorlage gehoert: die Kategorien des Nutzers.
    const eigene = felder[s].filter((f) => !alleIds(vorlage).has(f.id) && !istStandardAndererVorlage(f, vorlage));
    ergebnis[s].push(...kopie(eigene));
  });
  return ergebnis;
};

/**
 * Kategorien beim Start oder beim Wechsel zu einer Vorlage lesen.
 *
 * `roh` ist der gespeicherte Text dieser Vorlage (oder `null`). Ein
 * beschaedigter Text ergibt die Vorgabe -- die App muss starten.
 * Die Nachruestungen unten stammen aus 0.9.x und gelten nur dort, wo die
 * Vorlage die Kategorie auch kennt: Ohne diese Einschraenkung bekaeme die
 * APA-Vorlage ploetzlich "WeWalk Einweisungen".
 */
export const ladeFelder = (vorlage: VorlageMeta, roh: string | null): SectionsConfig => {
  let felder: SectionsConfig | null = null;
  if (roh) {
    try {
      const gelesen: unknown = JSON.parse(roh);
      if (sindFelder(gelesen)) felder = gelesen;
    } catch (e) {
      console.error("Failed to parse fields config", e);
    }
  }
  if (!felder) felder = standardFelder(vorlage);

  const standard = standardFelder(vorlage);
  const standardFeld = (id: string): FieldConfig | undefined =>
    BEREICHE.flatMap((s) => standard[s]).find((f) => f.id === id);

  // Ohne diese Nachruestung bekaemen es nur Neuinstallationen -- bestehende
  // Geraete haben ihre Feldliste in localStorage.
  const wewalkTel = standardFeld("wewalk_tel");
  if (wewalkTel && !felder.s3.some((f) => f.id === "wewalk_tel")) felder.s3.push(wewalkTel);

  const envision = standardFeld("envision_vf");
  if (envision && !felder.s3.some((f) => f.id === "envision_vf")) {
    // Einsortiert direkt hinter Tactonom, wie in der Vorlage.
    const nachTactonom = felder.s3.findIndex((f) => f.id === "tac_vf");
    if (nachTactonom === -1) felder.s3.push(envision);
    else felder.s3.splice(nachTactonom + 1, 0, envision);
  }

  // Urlaub, Krankheit, Reisezeit, Feiertage: Stempeluhr und Jahreskonto brauchen sie.
  for (const id of ["std_aussendienst", "tage_urlaub", "tage_krank", "tage_feiertag"]) {
    const def = standardFeld(id);
    if (def && !felder.s4.some((f) => f.id === id)) felder.s4.push(def);
  }
  felder.s4 = felder.s4.map((f) => (f.id === "std_buero" ? { ...f, label: "Stunden Büro/Innendienst" } : f));

  // Jede Kategorie braucht ein Symbol: erst das der Vorlage, sonst ein Stern.
  BEREICHE.forEach((s) => {
    felder![s] = felder![s].map((f) => (f.icon ? f : { ...f, icon: standardFeld(f.id)?.icon || "⭐" }));
  });

  return anVorlage(felder, vorlage);
};
