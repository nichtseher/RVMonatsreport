import type { FieldConfig, SectionsConfig } from "../types";

/**
 * Katalog der eingebetteten Berichtsvorlagen (ab 0.9.73).
 *
 * Bis 0.9.72 gab es genau eine Vorlage. Jetzt arbeiten drei Teams mit drei
 * Formularen, und in jedem Team sind ANDERE Zahlen gefragt. Darum bestimmt die
 * gewaehlte Vorlage nicht nur die Excel-Datei, sondern auch die Oberflaeche:
 * welche Kategorien erfasst werden und wie die vier Bereiche heissen.
 * Alles, was eine Vorlage ausmacht, steht deshalb an EINER Stelle: hier.
 *
 * DIESE DATEI MUSS LEICHT BLEIBEN -- sie wird vom Startbuendel importiert
 * (Auswahl, Kategorien, Bereichsnamen, Rueckfragen). Die eigentlichen
 * Excel-Dateien liegen als base64 in `utils/vorlagen/*.ts` und werden NUR ueber
 * `ladeDatei` (dynamischer Import) geholt. Ein statischer Import einer Vorlage
 * hier zoeg 16 KB je Vorlage ins Startbuendel (gemessen 2026-09-14: 581.777 ->
 * 598.106 Bytes). Pruefung: im gebauten Startbuendel nach `UEsDB` (der
 * PK-Signatur einer .xlsx) suchen. Aus demselben Grund darf diese Datei weder
 * `version.ts` (liest `__APP_VERSION__`, das nur Vite setzt -- die Pruefungen
 * laufen unter `tsx`) noch eine Vorlagendatei statisch importieren.
 *
 * KATEGORIEN: Jede Zeile einer Vorlage ist eine Kategorie (`felder`) und hat
 * eine Zelle (`feldZuZelle`). Die Zuordnung laeuft ueber die Feld-ID, nicht
 * ueber die Beschriftung: Beschriftungen sind vom Nutzer aenderbar, IDs nicht.
 * Dieselbe ID in zwei Vorlagen bedeutet dieselbe Taetigkeit -- nur dann wird
 * sie geteilt (so bleibt eine erfasste Zahl beim Wechsel sichtbar). Eine
 * Zeile mit nur "aehnlicher" Bedeutung bekommt eine eigene ID.
 * Der vierte Bereich (Arbeitszeit) ist in allen Vorlagen derselbe: Stempeluhr,
 * Jahreskonto und Abschlusspruefung rechnen mit genau diesen IDs.
 * Eine leere Zeile sieht in Excel aus wie eine Null (0.9.11: D22 fehlte) --
 * `npm run check` verlangt deshalb, dass JEDE Eingabezelle der Vorlage eine
 * Kategorie hat und jede Kategorie der Bereiche 1 bis 3 eine Zelle.
 *
 * `stand` erscheint in JEDER erzeugten Datei (Dokumenteigenschaften, Blatt 2,
 * Rueckfrage vor dem Senden, Hilfe): Gibt die Firma ein neues Formular heraus,
 * produziert die App sonst weiter das alte, und die Datei sieht aus wie das
 * gewohnte Formular. Wer eine Vorlage austauscht, aendert ihren `stand` mit.
 *
 * NEUE VORLAGE EINBETTEN: Datei nach .xlsx wandeln, mit
 * `scripts/vorlage-einbetten.ts` leeren und als `utils/vorlagen/<name>.ts`
 * ablegen, hier einen Eintrag mit Kategorien und Zuordnung ergaenzen. Die
 * Pruefungen laufen fuer jede Vorlage.
 */

export type Bereichsschluessel = "s1" | "s2" | "s3" | "s4";

export interface BereichsName {
  /** Ueberschrift im Formular, ohne Nummer: "Vorfuehrungen & Auslieferungen". */
  name: string;
  /** Kurzform fuer die Monatsziele (Chips): "Vorfuehrungen". */
  kurz: string;
  /** Ansage beim Wechsel des Bereichs: "Vorfuehrungen". */
  bereich: string;
  /** Eine Zeile Erklaerung in der Analyse. */
  beschreibung: string;
}

export interface VorlageMeta {
  /** Stabile Kennung, wird auf dem Geraet gespeichert. Nie umbenennen. */
  id: string;
  /** Name, wie ihn die Mitarbeitenden sehen. */
  name: string;
  /** Fassung des Formulars (Monat.Jahr), wie die Firma sie ausgibt. */
  stand: string;
  /** Name des Blatts in der Datei, in das geschrieben wird. */
  blattName: string;
  zellen: { monat: string; name: string; kommentar: string };
  /** Die Kategorien dieser Vorlage in den vier Bereichen. */
  felder: SectionsConfig;
  /** Feld-ID -> Zelle. Die Summenformel-Zellen gehoeren NICHT hierher. */
  feldZuZelle: Record<string, string>;
  bereiche: Record<Bereichsschluessel, BereichsName>;
  /** Liefert die Vorlage als base64. Dynamischer Import, siehe oben. */
  ladeDatei: () => Promise<string>;
}

const feld = (id: string, label: string, icon: string, step = 1): FieldConfig => ({ id, label, step, icon });

/** Bereich 4 in JEDER Vorlage gleich -- Stempeluhr und Jahreskonto haengen an diesen IDs. */
const ARBEITSZEIT: FieldConfig[] = [
  feld("tage_arbeit", "Arbeitstage (ohne Urlaub/Krankheit)", "🗓️"),
  feld("std_buero", "Stunden Büro/Innendienst", "⌨️", 0.5),
  feld("std_aussendienst", "Stunden Außendienst/Reisezeit", "🚗", 0.5),
  feld("tage_urlaub", "Genommene Urlaubstage", "🌴", 0.5),
  feld("tage_krank", "Krankheitstage (bezahlt)", "🤒", 0.5),
  feld("tage_feiertag", "Feiertage (arbeitsfrei)", "🎉"),
];

const BEREICH_ARBEITSZEIT: BereichsName = {
  name: "Arbeitszeit & Büro",
  kurz: "Büro",
  bereich: "Arbeitszeit",
  beschreibung: "Bürostunden aus der Stempeluhr",
};

export const VORLAGE_TEAM_BLINDENHILFSMITTEL = "team-blindenhilfsmittel-monatsinfo";

/**
 * Herkunft: 2600_apa_pd.xls (Stand 01.2026), von der Vertriebsleitung
 * vorgegeben, einmalig mit Excel nach .xlsx gewandelt -- verlustfrei geprueft.
 * D10 steht bewusst NICHT in `feldZuZelle`: dort liegt die Formel SUM(D6:D9).
 */
const TEAM_BLINDENHILFSMITTEL: VorlageMeta = {
  id: VORLAGE_TEAM_BLINDENHILFSMITTEL,
  name: "Team Blindenhilfsmittel Monatsinfo",
  stand: "01.2026",
  blattName: "Monatsinfo",
  zellen: { monat: "D3", name: "D4", kommentar: "B28" },
  felder: {
    s1: [
      feld("vf_schule", "Anzahl Vorführungen Schule/Bildung", "🏫"),
      feld("vf_arbeit", "Anzahl Vorführungen Arbeitsplatz", "💼"),
      feld("aus_schule", "Anzahl Auslieferungen Schule/Bildung", "🎒"),
      feld("aus_arbeit", "Anzahl Auslieferungen Arbeitsplatz", "🏢"),
    ],
    s2: [
      feld("schul_vorort", "Anzahl Schulungen/Support (ohne Auslieferung)", "👨‍🏫"),
      feld("schul_tel", "Anzahl Schulung/Support Telefon", "📞"),
      feld("akquise", "Anzahl Akquisetermine / Beratungsstellen / Multiplikator/innen", "🤝"),
      feld("messen", "Anzahl Teilnahme Veranstaltungen/Messen/Ausstellungen", "🎪"),
    ],
    s3: [
      feld("tac_vf", "Anzahl Vorführungen Tactonom", "🎯"),
      feld("envision_vf", "Anzahl Vorführungen Envision", "👓"),
      feld("feel_vf", "Anzahl Vorführungen Feelspace", "🌍"),
      feld("wewalk_vf", "Anzahl Vorführungen WeWalk", "🦯"),
      feld("wewalk_tel", "Anzahl telefonische Einweisungen WeWalk", "☎️"),
    ],
    s4: ARBEITSZEIT,
  },
  feldZuZelle: {
    vf_schule: "D6",
    vf_arbeit: "D7",
    aus_schule: "D8",
    aus_arbeit: "D9",
    schul_vorort: "D12",
    schul_tel: "D13",
    akquise: "D14",
    messen: "D16",
    tage_arbeit: "D18",
    std_buero: "D19",
    tac_vf: "D21",
    envision_vf: "D22",
    feel_vf: "D23",
    wewalk_vf: "D24",
    wewalk_tel: "D25",
  },
  bereiche: {
    s1: { name: "Vorführungen & Auslieferungen", kurz: "Vorführungen", bereich: "Vorführungen", beschreibung: "Besuche an Schulen & Arbeitsplätzen" },
    s2: { name: "Schulung, Support & Akquise", kurz: "Schulungen", bereich: "Schulungen & Support", beschreibung: "Einweisungen, Telefonate & Messen" },
    s3: { name: "Spezialprodukte (Fokus)", kurz: "Spezial", bereich: "Spezialprodukte", beschreibung: "Tactonom, Envision, Feelspace, WeWalk" },
    s4: BEREICH_ARBEITSZEIT,
  },
  ladeDatei: async () => (await import("./vorlagen/teamBlindenhilfsmittel")).VORLAGE_BASE64,
};

export const VORLAGE_APA_AUSSENDIENST = "apa-monatsinfo-aussendienst";

/**
 * Herkunft: apa_monatsinfo.xls (Stand 01.2025, Titel "Monatsinfo Aussendienst").
 * Mit Excel nach .xlsx gewandelt, Werte der Eingabezellen geleert (eingebettet
 * mit scripts/vorlage-einbetten.ts). D11 ist die Summe SUM(D6:D10).
 * `akq_kontakte` hat eine eigene ID: "Akquisekontakte/-gespraeche" ist nicht
 * dasselbe wie die "Akquisetermine" des Team-Formulars.
 */
const APA_AUSSENDIENST: VorlageMeta = {
  id: VORLAGE_APA_AUSSENDIENST,
  name: "APA Monatsinfo Außendienst",
  stand: "01.2025",
  blattName: "Monatsinfo",
  zellen: { monat: "D3", name: "D4", kommentar: "B28" },
  felder: {
    s1: [
      feld("vf_schule", "Anzahl Vorführungen Schule/Bildung", "🏫"),
      feld("vf_arbeit", "Anzahl Vorführungen Arbeitsplatz", "💼"),
      feld("aus_schule", "Anzahl Auslieferungen Schule/Bildung", "🎒"),
      feld("aus_arbeit", "Anzahl Auslieferungen Arbeitsplatz", "🏢"),
      feld("sonst_termine", "Sonstige Kundentermine (z.B. Nacheinweisungen, Service, Reklamation)", "🛠️"),
    ],
    s2: [
      feld("gespr_techberater", "Anzahl Gespräche Technische Berater", "🧑‍🔧"),
      feld("gespr_beratungsstellen", "Anzahl Gespräche Beratungsstellen/Blindenverbände", "🤝"),
      feld("akq_kontakte", "Anzahl Akquisekontakte/-gespräche", "📞"),
      feld("messen", "Anzahl durchgeführte Veranstaltungen/Messen/Ausstellungen", "🎪"),
    ],
    s3: [
      feld("tac_vf", "Vorführungen Tactonom", "🎯"),
      feld("envision_vf", "Vorführungen Envision", "👓"),
      feld("feel_vf", "Vorführungen Feelspace", "🌍"),
      feld("wewalk_vf", "Vorführungen Wewalk", "🦯"),
    ],
    s4: ARBEITSZEIT,
  },
  feldZuZelle: {
    vf_schule: "D6",
    vf_arbeit: "D7",
    aus_schule: "D8",
    aus_arbeit: "D9",
    sonst_termine: "D10",
    gespr_techberater: "D13",
    gespr_beratungsstellen: "D14",
    akq_kontakte: "D15",
    messen: "D17",
    tage_arbeit: "D19",
    std_buero: "D20",
    tac_vf: "D22",
    envision_vf: "D23",
    feel_vf: "D24",
    wewalk_vf: "D25",
  },
  bereiche: {
    s1: { name: "Vorführungen, Auslieferungen & Kundentermine", kurz: "Vorführungen", bereich: "Vorführungen", beschreibung: "Vorführungen, Auslieferungen & sonstige Kundentermine" },
    s2: { name: "Gespräche, Akquise & Veranstaltungen", kurz: "Gespräche", bereich: "Gespräche & Akquise", beschreibung: "Technische Berater, Beratungsstellen, Akquise & Messen" },
    s3: { name: "Spezialprodukte (Fokus)", kurz: "Spezial", bereich: "Spezialprodukte", beschreibung: "Tactonom, Envision, Feelspace, WeWalk" },
    s4: BEREICH_ARBEITSZEIT,
  },
  ladeDatei: async () => (await import("./vorlagen/apaMonatsinfo")).VORLAGE_BASE64,
};

export const VORLAGE_VERTRIEB = "vertrieb-monatsinfo";

/**
 * Herkunft: "Vertrieb monatsinfo .xlsx" (Stand 01.2024, von LibreOffice Calc
 * geschrieben), Werte der Eingabezellen geleert. D10 ist SUM(D6:D9)
 * ("Anzahl Endkunden gesamt").
 */
const VERTRIEB: VorlageMeta = {
  id: VORLAGE_VERTRIEB,
  name: "Vertrieb Monatsinfo",
  stand: "01.2024",
  blattName: "Monatsinfo",
  zellen: { monat: "D3", name: "D4", kommentar: "B30" },
  felder: {
    s1: [
      feld("ek_zuhause", "Endkundenberatungen zuhause", "🏠"),
      feld("ek_fachberatung", "Endkundenberatungen in Fachberatungen/Sprechstunden", "🩺"),
      feld("ek_optiker", "Endkundenberatungen bei Augenoptikern", "👓"),
      feld("ek_niederlassung", "Endkundenberatungen in Niederlassung/Vorführraum", "🏢"),
    ],
    s2: [
      feld("besuch_optiker", "Allgemeine Besuche Augenoptiker", "🚪"),
      feld("akq_optiker", "Akquisebesuche Augenoptiker", "🤝"),
      feld("besuch_augenarzt", "Allgemeine Besuche Augenärzte", "⚕️"),
      feld("akq_augenarzt", "Akquisebesuche Augenärzte", "📋"),
      feld("besuch_beratungsstellen", "Besuche bei Beratungsstellen", "🏛️"),
      feld("messen", "Durchgeführte Messen/Veranstaltungen", "🎪"),
      feld("messe_besucher", "Anzahl Besucher bei Messen/Veranstaltungen", "👥"),
    ],
    s3: [
      feld("fachberatungen", "Anzahl Fachberatungen/Sprechstunden", "🩺"),
      feld("orcam_vf", "Anzahl Vorführungen Orcam", "📷"),
      feld("envision_vf", "Anzahl Vorführungen Envision", "👓"),
      feld("feel_vf", "Anzahl Vorführungen Feelspace", "🌍"),
      feld("mono_vf", "Anzahl Vorführungen Monokulare/Doppler", "🔭"),
    ],
    s4: ARBEITSZEIT,
  },
  feldZuZelle: {
    ek_zuhause: "D6",
    ek_fachberatung: "D7",
    ek_optiker: "D8",
    ek_niederlassung: "D9",
    besuch_optiker: "D12",
    akq_optiker: "D13",
    besuch_augenarzt: "D14",
    akq_augenarzt: "D15",
    besuch_beratungsstellen: "D16",
    messen: "D18",
    messe_besucher: "D19",
    tage_arbeit: "D21",
    fachberatungen: "D22",
    std_buero: "D23",
    orcam_vf: "D25",
    envision_vf: "D26",
    feel_vf: "D27",
    mono_vf: "D28",
  },
  bereiche: {
    s1: { name: "Endkundenberatungen", kurz: "Beratungen", bereich: "Endkundenberatungen", beschreibung: "Beratungen zuhause, in Fachberatungen, bei Augenoptikern & in der Niederlassung" },
    s2: { name: "Besuche & Veranstaltungen", kurz: "Besuche", bereich: "Besuche & Veranstaltungen", beschreibung: "Augenoptiker, Augenärzte, Beratungsstellen & Messen" },
    s3: { name: "Fachberatung & Vorführungen", kurz: "Vorführungen", bereich: "Fachberatung & Vorführungen", beschreibung: "Sprechstunden, Orcam, Envision, Feelspace, Monokulare" },
    s4: BEREICH_ARBEITSZEIT,
  },
  ladeDatei: async () => (await import("./vorlagen/vertriebMonatsinfo")).VORLAGE_BASE64,
};

/** Reihenfolge = Reihenfolge in der Auswahl. */
export const VORLAGEN: readonly VorlageMeta[] = [TEAM_BLINDENHILFSMITTEL, APA_AUSSENDIENST, VERTRIEB];

/**
 * Wer vorher schon exportiert hat, hat im Grunde diese Vorlage benutzt --
 * sie bleibt Vorgabe, bis jemand etwas anderes waehlt.
 */
export const STANDARD_VORLAGE_ID = VORLAGE_TEAM_BLINDENHILFSMITTEL;

export const VORLAGE_SCHLUESSEL = "aussendienst_pwa_vorlage_v1";

/**
 * Unbekannte Kennung (aus einem anderen Stand, beschaedigt) -> Vorgabe.
 * Lieber die Vorgabe als ein Export, der an einer fehlenden Vorlage scheitert.
 */
export const findeVorlage = (id: string | null | undefined): VorlageMeta =>
  VORLAGEN.find((v) => v.id === id) ?? VORLAGEN.find((v) => v.id === STANDARD_VORLAGE_ID)!;

/** Gespeicherte Wahl lesen; ein gesperrter oder leerer Speicher ergibt die Vorgabe. */
export const ladeVorlagenWahl = (): string => {
  try {
    return findeVorlage(localStorage.getItem(VORLAGE_SCHLUESSEL)).id;
  } catch {
    return STANDARD_VORLAGE_ID;
  }
};

/** Titel mit Nummer, wie im Formular: "1. Vorfuehrungen & Auslieferungen". */
export const bereichsTitel = (vorlage: VorlageMeta, s: Bereichsschluessel): string =>
  `${s.slice(1)}. ${vorlage.bereiche[s].name}`;

/** Fuer die Sprachausgabe: "&" wird "und", eine Klammer entfaellt. */
export const bereichsAnsage = (vorlage: VorlageMeta, s: Bereichsschluessel): string =>
  vorlage.bereiche[s].name.replace(/\s*\([^)]*\)/g, "").replace(/\s*&\s*/g, " und ");

/**
 * Text der Rueckfrage "Was soll gesendet werden?" -- fuer Formular UND Archiv.
 * Stand zweimal woertlich im Quelltext; mit mehreren Vorlagen waeren das zwei
 * Stellen, die auseinanderlaufen koennen.
 */
export const umfangRueckfrage = (vorlage: VorlageMeta, mitZeiten: boolean): string =>
  `Blatt 1 ist das Formular „${vorlage.name}“ (Fassung ${vorlage.stand}). ` +
  (mitZeiten
    ? "Auf Wunsch kommen zwei weitere Blätter dazu: Ihre Zusatzangaben und Ihre einzelnen Schichten. Beides ist für das Formular selbst nicht nötig."
    : "Auf Wunsch kommt ein Blatt mit Ihren Zusatzangaben dazu, für die es im Formular keine Zeile gibt.");
