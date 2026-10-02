import {
  HistoryRecord,
  Loeschmarken,
  SectionsConfig,
  TimeLog,
  YearlyCarryover,
  ReportData,
  ValueTimestamps,
} from "../types";
import { monthHasContent } from "./monatInhalt";
import { baueArchivEintrag, spiegleMonat } from "./archivEintrag";
import { stableStringify } from "./stableJson";

/**
 * Zusammenführen zweier Datenstände (statt Überschreiben).
 *
 * Regeln:
 * - Zähler: feldweise, je Feld entscheidet dessen eigener Zeitstempel.
 * - Name und Notiz: ebenfalls feldweise (0.9.72). Vorher entschied der
 *   Zeitstempel des ganzen Datensatzes -- und der wandert bei JEDER Änderung
 *   weiter. Zählte Gerät B am Dienstag nur einen Zähler, gewann sein Datensatz
 *   und löschte die Notiz, die Gerät A am Montag geschrieben hatte, auf beiden
 *   Geräten.
 * - Schichten (TimeLogs) beider Geräte werden per ID vereinigt, gelöschte
 *   Schichten (Löschmarken) bleiben gelöscht.
 * - Archiv: pro Monat wird zusammengeführt; ein gelöschter Monat bleibt
 *   gelöscht, sofern er danach nicht neu bearbeitet wurde.
 * - Der laufende Monat des EMPFÄNGERS zählt als frischester lokaler Stand
 *   (0.9.72). Sein Archiv-Abbild hinkt bis zu eine Sekunde hinterher; wer
 *   währenddessen tippte, wurde vom Abgleich zurückgesetzt.
 * - Kategorien/Felder: Vereinigung – eigene Kategorien beider Geräte bleiben erhalten.
 *   Bewusst OHNE Löschmarken, Begründung in der ROADMAP (Feldkonfiguration und
 *   Archiv-Schnappschuss teilen sich eine Variable).
 * - Jahreskonto: der zuletzt geänderte Stand gewinnt (updatedAt).
 * Das Ergebnis ist idempotent: mehrfaches Mergen desselben Stands ändert nichts.
 */

export interface SyncPayload {
  appFields?: SectionsConfig;
  history?: Record<string, HistoryRecord>;
  carryover?: YearlyCarryover;
  reportData?: ReportData;
  /** Gelöschte Archivmonate (Monat -> Löschzeitpunkt), seit 0.9.72. */
  geloeschteMonate?: Loeschmarken;
}

/** Nur echte Objekte mit Text-Werten -- alles andere gilt als "keine Marken". */
function alsMarken(wert: unknown): Loeschmarken {
  if (!wert || typeof wert !== "object" || Array.isArray(wert)) return {};
  const aus: Loeschmarken = {};
  for (const [schluessel, zeit] of Object.entries(wert as Record<string, unknown>)) {
    if (typeof zeit === "string") aus[schluessel] = zeit;
  }
  return aus;
}

/** Löschmarken vereinigen; bei zwei Marken für dieselbe ID gilt die jüngere. */
export function mergeLoeschmarken(a?: Loeschmarken, b?: Loeschmarken): Loeschmarken {
  const aus: Loeschmarken = {};
  for (const quelle of [alsMarken(a), alsMarken(b)]) {
    for (const [id, zeit] of Object.entries(quelle)) {
      if (!aus[id] || zeit > aus[id]) aus[id] = zeit;
    }
  }
  return aus;
}

/**
 * Löschmarken um die genannten Schichten erweitern. Eine vorhandene Marke
 * bleibt, wie sie ist. Ohne Marken kommt `undefined` zurück, nicht `{}`: Ein
 * leeres Objekt ist ein anderer Text als ein fehlendes Feld und liesse den
 * Live-Abgleich senden, obwohl sich nichts geändert hat.
 */
export function markiereGeloescht(
  marken: Loeschmarken | undefined,
  schichten: TimeLog[] | undefined,
  zeit: string,
): Loeschmarken | undefined {
  const aus = { ...alsMarken(marken) };
  for (const schicht of schichten || []) {
    if (schicht?.id && !aus[schicht.id]) aus[schicht.id] = zeit;
  }
  return Object.keys(aus).length > 0 ? aus : undefined;
}

/** Textvergleich ohne Locale: Beide Geräte müssen dieselbe Reihenfolge bilden. */
const vergleiche = (p: string, q: string): number => (p < q ? -1 : p > q ? 1 : 0);

/**
 * Schichten vereinigen. `geloescht`: Schichten mit einer Löschmarke fallen
 * heraus, gleichgültig von welcher Seite sie kommen.
 *
 * Sortiert nach Tag, dann Beginn, dann ID. Vorher nur nach Tag: Zwei Schichten
 * desselben Tages standen je nachdem, welches Gerät zusammenführte, in anderer
 * Reihenfolge -- ein anderer Text, den der Live-Abgleich dann als Änderung
 * erneut sendete.
 */
export function mergeTimeLogs(a?: TimeLog[], b?: TimeLog[], geloescht?: Loeschmarken): TimeLog[] {
  const map = new Map<string, TimeLog>();
  [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach((log) => {
    if (!log || !log.id) return;
    if (geloescht && geloescht[log.id]) return;
    map.set(log.id, log);
  });
  return Array.from(map.values()).sort(
    (x, y) =>
      vergleiche(x.date || "", y.date || "") ||
      vergleiche(x.clockIn || "", y.clockIn || "") ||
      vergleiche(x.id, y.id),
  );
}

/**
 * Zählerstände feldweise zusammenführen.
 *
 * Vorher gewann der komplette Datensatz mit dem jüngeren `savedAt`. Wurde auf
 * beiden Geräten im selben Abgleich-Fenster je ein *anderes* Feld getippt,
 * verschwand eine der beiden Eingaben spurlos (zweimal reproduziert).
 * Jetzt entscheidet je Feld sein eigener Zeitstempel; nur wenn dasselbe Feld
 * auf beiden Seiten geändert wurde, gewinnt die jüngere Änderung.
 *
 * Rückfallebene für Daten aus älteren Versionen: Fehlt der Feld-Zeitstempel,
 * gilt der Zeitstempel des Monats (`savedAt`) -- damit verhält sich alter
 * Bestand exakt wie bisher.
 */
export function mergeValues(
  a: Pick<HistoryRecord, "values" | "valuesUpdatedAt" | "savedAt">,
  b: Pick<HistoryRecord, "values" | "valuesUpdatedAt" | "savedAt">,
): { values: Record<string, number | "">; valuesUpdatedAt: ValueTimestamps } {
  const zeitVon = (
    r: Pick<HistoryRecord, "valuesUpdatedAt" | "savedAt">,
    id: string,
  ) => r.valuesUpdatedAt?.[id] || r.savedAt || "";

  const values: Record<string, number | ""> = {};
  const valuesUpdatedAt: ValueTimestamps = {};
  const ids = new Set([
    ...Object.keys(a.values || {}),
    ...Object.keys(b.values || {}),
  ]);

  ids.forEach((id) => {
    const inA = Object.prototype.hasOwnProperty.call(a.values || {}, id);
    const inB = Object.prototype.hasOwnProperty.call(b.values || {}, id);
    // Nur eine Seite kennt das Feld -> diese gewinnt.
    const gewinner = !inB ? a : !inA ? b : zeitVon(a, id) >= zeitVon(b, id) ? a : b;
    values[id] = gewinner.values[id];
    // Immer einen Stempel setzen -- nach dem Zusammenführen ist die Liste
    // damit vollständig und kann nicht mehr auf den wandernden
    // Monats-Zeitstempel zurückfallen.
    const stempel = zeitVon(gewinner, id);
    if (stempel) valuesUpdatedAt[id] = stempel;
  });

  return { values, valuesUpdatedAt };
}

/** Ein Textfeld (Name oder Notiz) mit seinem Änderungszeitpunkt. */
interface Textstand {
  text: string;
  zeit?: string;
  /** Zeitstempel des ganzen Datensatzes -- nur der letzte Ausweg, siehe unten. */
  savedAt: string;
}

/**
 * Name bzw. Notiz zusammenführen (0.9.72).
 *
 * 1. Gleicher Text: dieser, mit dem jüngeren Zeitpunkt.
 * 2. Verschiedene Zeitpunkte: Die jüngere Änderung gewinnt. Ein FEHLENDER
 *    Zeitpunkt zählt als der älteste -- ausdrücklich nicht als `savedAt`, der
 *    mit jeder Änderung an irgendeinem Feld weiterwandert und einem alten Text
 *    einen frischen Stempel verliehe (dieselbe Falle wie bei den Zählern).
 * 3. Gleicher oder fehlender Zeitpunkt auf beiden Seiten: Ein Text schlägt
 *    einen leeren. Im Zweifel geht nie Text verloren. Eine BEWUSST geleerte
 *    Notiz trägt einen Zeitpunkt und setzt sich über Punkt 2 durch.
 *    Sind beide gefüllt und verschieden, bleibt es beim bisherigen Verhalten
 *    (der jüngere Datensatz), bei Gleichstand entscheidet der Text -- damit
 *    beide Geräte dasselbe wählen, egal wer "lokal" ist.
 */
function mergeText(a: Textstand, b: Textstand): { text: string; zeit?: string } {
  const za = a.zeit || "";
  const zb = b.zeit || "";
  const spaeter = za >= zb ? za : zb;
  const ergebnis = (gewinner: Textstand) => ({
    text: gewinner.text,
    ...(spaeter ? { zeit: spaeter } : {}),
  });

  if (a.text === b.text) return ergebnis(a);
  if (za !== zb) return ergebnis(za > zb ? a : b);

  const aLeer = a.text.trim() === "";
  const bLeer = b.text.trim() === "";
  if (aLeer !== bLeer) return ergebnis(aLeer ? b : a);
  if (aLeer && bLeer) return ergebnis(a.text <= b.text ? a : b);
  if (a.savedAt !== b.savedAt) return ergebnis(a.savedAt > b.savedAt ? a : b);
  return ergebnis(a.text >= b.text ? a : b);
}

/**
 * Versand-Markierung zusammenführen.
 *
 * Läuft bewusst NICHT über `savedAt`: Der wandert bei jeder Änderung am Monat
 * weiter. Markiert Gerät A den Monat als versendet und tippt Gerät B danach
 * eine Zahl, hätte B den jüngeren `savedAt` -- und die Markierung von A wäre
 * weg. Entscheidend ist deshalb `sentUpdatedAt`, der sich nur ändert, wenn
 * jemand die Markierung selbst anfasst.
 *
 * Zurücknehmen muss möglich sein (man markiert sich auch mal falsch), deshalb
 * gewinnt die jüngere ÄNDERUNG -- nicht einfach "Markierung schlägt keine".
 */
export function mergeVersand(
  a: Pick<HistoryRecord, "sentAt" | "sentUpdatedAt">,
  b: Pick<HistoryRecord, "sentAt" | "sentUpdatedAt">,
): Pick<HistoryRecord, "sentAt" | "sentUpdatedAt"> {
  const zeitA = a.sentUpdatedAt || "";
  const zeitB = b.sentUpdatedAt || "";

  // Altbestand ohne Änderungsstempel (vor 0.9.12): Dort kann es keine
  // Zurücknahme gegeben haben, also schlägt eine vorhandene Markierung keine.
  if (!zeitA && !zeitB) {
    const vorhanden = a.sentAt || b.sentAt;
    return vorhanden ? { sentAt: vorhanden } : {};
  }

  const gewinner = zeitA >= zeitB ? a : b;
  return gewinner.sentAt
    ? { sentAt: gewinner.sentAt, sentUpdatedAt: gewinner.sentUpdatedAt }
    : { sentUpdatedAt: gewinner.sentUpdatedAt };
}

/**
 * Welcher von zwei Datensätzen ist der jüngere? Bei exaktem Gleichstand
 * entscheidet der Inhalt -- nicht die Frage, wer "lokal" ist. Vorher gewann bei
 * Gleichstand stets der lokale, und zwei Geräte behielten dadurch je ihren
 * eigenen Stand.
 */
function juengerer(a: HistoryRecord, b: HistoryRecord): { newer: HistoryRecord; other: HistoryRecord } {
  const sa = a.savedAt || "";
  const sb = b.savedAt || "";
  if (sa !== sb) return sa > sb ? { newer: a, other: b } : { newer: b, other: a };
  return stableStringify(a) >= stableStringify(b) ? { newer: a, other: b } : { newer: b, other: a };
}

function mergeRecord(a?: HistoryRecord, b?: HistoryRecord): HistoryRecord | undefined {
  if (!a) return b;
  if (!b) return a;
  // Für alles ausser Zählern, Name, Notiz und Schichten (Feld-Aufbau) bleibt es
  // beim jüngeren Datensatz -- dort ist ein Feld-Zeitstempel nicht sinnvoll.
  const { newer, other } = juengerer(a, b);
  const { values, valuesUpdatedAt } = mergeValues(a, b);
  const versand = mergeVersand(a, b);
  const name = mergeText(
    { text: a.name || "", zeit: a.nameUpdatedAt, savedAt: a.savedAt || "" },
    { text: b.name || "", zeit: b.nameUpdatedAt, savedAt: b.savedAt || "" },
  );
  const notiz = mergeText(
    { text: a.notes || "", zeit: a.notesUpdatedAt, savedAt: a.savedAt || "" },
    { text: b.notes || "", zeit: b.notesUpdatedAt, savedAt: b.savedAt || "" },
  );
  const marken = mergeLoeschmarken(a.geloeschteSchichten, b.geloeschteSchichten);
  // Alles, was gleich neu gesetzt wird, erst aus dem Gewinner entfernen --
  // sonst zöge `...newer` einen veralteten Wert wieder herein.
  const {
    sentAt: _weg1,
    sentUpdatedAt: _weg2,
    nameUpdatedAt: _weg3,
    notesUpdatedAt: _weg4,
    geloeschteSchichten: _weg5,
    ...rest
  } = newer;
  return {
    ...rest,
    ...versand,
    name: name.text,
    notes: notiz.text,
    ...(name.zeit ? { nameUpdatedAt: name.zeit } : {}),
    ...(notiz.zeit ? { notesUpdatedAt: notiz.zeit } : {}),
    values,
    valuesUpdatedAt,
    timeLogs: mergeTimeLogs(other.timeLogs, newer.timeLogs, marken),
    ...(Object.keys(marken).length > 0 ? { geloeschteSchichten: marken } : {}),
  };
}

/**
 * Archive zusammenführen.
 *
 * `geloeschteMonate`: Ein Datensatz, der nicht NACH dem Löschen gespeichert
 * wurde (`savedAt` <= Löschzeitpunkt), gilt als gelöscht. Das wird je SEITE vor
 * dem Zusammenführen angewendet, nicht auf das Ergebnis: Sonst flösse der alte
 * Inhalt der Gegenseite in einen Monat zurück, der nach dem Löschen neu
 * angelegt wurde.
 */
export function mergeHistories(
  local?: Record<string, HistoryRecord>,
  remote?: Record<string, HistoryRecord>,
  geloeschteMonate?: Loeschmarken,
): Record<string, HistoryRecord> {
  const marken = alsMarken(geloeschteMonate);
  const ueberlebt = (monat: string, datensatz?: HistoryRecord): HistoryRecord | undefined => {
    if (!datensatz) return undefined;
    const grab = marken[monat];
    return grab && (datensatz.savedAt || "") <= grab ? undefined : datensatz;
  };

  const out: Record<string, HistoryRecord> = {};
  const months = new Set([
    ...Object.keys(local || {}),
    ...Object.keys(remote || {}),
  ]);
  months.forEach((month) => {
    const merged = mergeRecord(ueberlebt(month, local?.[month]), ueberlebt(month, remote?.[month]));
    if (merged) out[month] = merged;
  });
  return out;
}

export function mergeFields(local: SectionsConfig, remote?: SectionsConfig): SectionsConfig {
  if (!remote) return local;
  const out = {} as SectionsConfig;
  (["s1", "s2", "s3", "s4"] as const).forEach((sec) => {
    const loc = Array.isArray(local?.[sec]) ? local[sec] : [];
    const rem = Array.isArray(remote?.[sec]) ? remote[sec] : [];
    const known = new Set(loc.map((f) => f.id));
    out[sec] = [...loc, ...rem.filter((f) => f && f.id && !known.has(f.id))];
  });
  return out;
}

export function mergeCarryover(
  local?: YearlyCarryover,
  remote?: YearlyCarryover,
): YearlyCarryover | undefined {
  if (!remote) return local;
  if (!local) return remote;
  return (remote.updatedAt || "") > (local.updatedAt || "") ? remote : local;
}

/**
 * Fasst einen empfangenen Sync-Datenstand mit dem lokalen zusammen.
 * Der aktuell bearbeitete Monat des Empfängers bleibt der aktive Monat.
 *
 * `jetzt` ist nur für die Prüfungen setzbar: Der laufende Monat des Empfängers
 * bekommt, wenn er sich vom Archiv-Abbild unterscheidet, diesen Zeitpunkt.
 */
export function mergeSyncPayload(
  local: {
    appFields: SectionsConfig;
    history: Record<string, HistoryRecord>;
    carryover: YearlyCarryover;
    reportData: ReportData | null;
    geloeschteMonate?: Loeschmarken;
  },
  remote: SyncPayload,
  jetzt: string = new Date().toISOString(),
): {
  appFields: SectionsConfig;
  history: Record<string, HistoryRecord>;
  carryover: YearlyCarryover;
  reportData: ReportData | null;
  geloeschteMonate: Loeschmarken;
} {
  const geloeschteMonate = mergeLoeschmarken(local.geloeschteMonate, remote.geloeschteMonate);
  const remoteHistory: Record<string, HistoryRecord> = { ...(remote.history || {}) };

  // Fallback für ältere Datenstände, in denen der aktive Monat des Senders
  // noch nicht im Archiv gespiegelt war: als "ältesten" Stand einreihen,
  // damit er nur greift, wenn lokal nichts existiert.
  /*
    ...aber nur, wenn dieser Monat ueberhaupt etwas enthaelt.

    Ohne die Inhaltspruefung spiegelt jeder Sync den aktiven Monat des Senders
    ins Archiv des Empfaengers -- auch einen vollstaendig leeren. Gemessen am
    2026-09-07 mit zwei gekoppelten Browserkontexten: Nach dem Zusammenfuehren
    stand im Archiv des Empfaengers ein Eintrag "2026-09" mit leeren `values`,
    leeren Notizen und ohne Schichten.

    Genau dieses Symptom beschreibt `monatInhalt.ts` als Grund fuer
    `monthHasContent`: "Die Liste fuellte sich mit Eintraegen 'Zaehler: 0'".
    Wer am Monatsanfang synchronisiert -- also bevor die erste Zahl steht --
    handelte sich das bei jedem Abgleich neu ein.

    Die Absicht des Spiegelns bleibt unangetastet: Ein Sender, dessen
    Arbeitsstand noch nicht im Archiv liegt, soll ihn nicht verlieren. Nur
    gibt es an einem leeren Monat nichts zu verlieren.
  */
  const remoteReport = remote.reportData;
  if (remoteReport?.month && !remoteHistory[remoteReport.month] && monthHasContent(remoteReport)) {
    remoteHistory[remoteReport.month] = baueArchivEintrag(
      remoteReport,
      remote.appFields,
      undefined,
      new Date(0).toISOString(),
    );
  } else if (remoteReport?.month && remoteHistory[remoteReport.month]) {
    /*
      Dasselbe fuer die Gegenseite: Ihr Archiv-Abbild hinkt ihrem Bericht
      ebenso hinterher. Mit dem Zeitpunkt des vorhandenen Eintrags, nicht mit
      "jetzt" -- der Stempel gehoert zur Gegenseite, und ihre Aenderungen
      tragen ohnehin eigene Feld-Zeitstempel. Ohne diese Zeile erfuhr der
      Empfaenger Tipp-Stand erst mit der naechsten Nachricht.
    */
    const ueberlagert = spiegleMonat(
      remoteHistory,
      remoteReport,
      remote.appFields,
      remoteHistory[remoteReport.month].savedAt,
      false,
    );
    if (ueberlagert) remoteHistory[remoteReport.month] = ueberlagert[remoteReport.month];
  }

  /*
    Der laufende Monat des Empfaengers ist sein frischester Stand (0.9.72).

    `local.history` hinkt dem laufenden Bericht bis zu eine Sekunde hinterher
    (Bremse des Archiv-Spiegels), beim Dauertippen in die Notiz sogar
    durchgehend. Der Bericht wird unten aus dem zusammengefuehrten Archiv neu
    gebaut -- ohne diese Zeile wurde dabei zurueckgesetzt, was gerade getippt
    worden war. Nachgestellt am 2026-10-02 mit zwei gekoppelten Fenstern: Von
    einer Notiz mit 91 Zeichen fehlten die ersten 12, auf BEIDEN Geraeten.

    Nur bei echtem Unterschied und ohne den Feld-Aufbau zu vergleichen: Sonst
    waere jedes Zusammenfuehren eine Aenderung (neues savedAt), und der
    Live-Abgleich liefe endlos.
  */
  const lokalesArchiv =
    (local.reportData &&
      spiegleMonat(local.history, local.reportData, local.appFields, jetzt, false)) ||
    local.history;

  const history = mergeHistories(lokalesArchiv, remoteHistory, geloeschteMonate);
  const appFields = mergeFields(local.appFields, remote.appFields);
  const carryover = mergeCarryover(local.carryover, remote.carryover) || local.carryover;

  let reportData = local.reportData;
  const activeMonth = local.reportData?.month;
  if (activeMonth && history[activeMonth]) {
    const rec = history[activeMonth];
    reportData = {
      month: activeMonth,
      name: rec.name || "",
      notes: rec.notes || "",
      values: rec.values || {},
      valuesUpdatedAt: rec.valuesUpdatedAt,
      timeLogs: rec.timeLogs || [],
      ...(rec.nameUpdatedAt ? { nameUpdatedAt: rec.nameUpdatedAt } : {}),
      ...(rec.notesUpdatedAt ? { notesUpdatedAt: rec.notesUpdatedAt } : {}),
      ...(rec.geloeschteSchichten ? { geloeschteSchichten: rec.geloeschteSchichten } : {}),
    };
  }

  return { appFields, history, carryover, reportData, geloeschteMonate };
}
