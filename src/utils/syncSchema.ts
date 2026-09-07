/**
 * Struktur-Prüfung für empfangene Datenpakete (Geräte-Sync und Backup).
 *
 * Anlass (2026-08-03 reproduziert): Der Import prüfte nur, ob sich der Text
 * als JSON lesen lässt. Ein Paket mit gültigem JSON, aber unsinniger Struktur
 * — etwa `{"appFields":"kaputt","history":12345}` — wurde angenommen, und
 * "Alles ersetzen" führte danach direkt in den Fehlerbildschirm
 * ("Cannot read properties of undefined").
 *
 * Geprüft wird bewusst nur so viel, dass die Oberfläche nicht abstürzt und
 * das Zusammenführen sinnvoll arbeiten kann — keine vollständige
 * Schema-Validierung. Unbekannte Zusatzfelder sind erlaubt, damit ältere und
 * neuere Fassungen zusammenarbeiten können.
 */
import type { SectionsConfig, HistoryRecord, ReportData, YearlyCarryover } from "../types";

/** Kennung im Paket, seit 0.9.5 mitgeschrieben. Ältere Pakete haben keine. */
export const PAKET_APP = "rvmobil";
export const PAKET_FORMAT = 1;

export interface SyncPaket {
  app?: string;
  fmt?: number;
  appFields?: SectionsConfig;
  history?: Record<string, HistoryRecord>;
  carryover?: YearlyCarryover;
  reportData?: ReportData;
}

/*
  Beide Zweige führen beide Felder auf -- mit `grund?: undefined` bzw.
  `paket?: undefined`. Damit lässt sich an der Aufrufstelle sowohl
  `ergebnis.paket` als auch `ergebnis.grund` ohne Umweg lesen.

  Die frühere Begründung hier lautete, `strict` sei im Projekt „noch aus
  (bekannte Schuld Richtung 1.0)". Das stimmt seit 0.9.13 nicht mehr:
  `tsconfig.json` steht auf `"strict": true`, und `npm run lint` ist genau
  dieser Durchlauf. Eine Erklärung, die sich auf eine Lage beruft, die es nicht
  mehr gibt, ist schlimmer als keine -- sie lädt dazu ein, darauf zu planen.
*/
export type PruefErgebnis =
  | { ok: true; paket: SyncPaket; grund?: undefined }
  | { ok: false; grund: string; paket?: undefined };

const istObjekt = (w: unknown): w is Record<string, unknown> =>
  typeof w === "object" && w !== null && !Array.isArray(w);

const MONAT = /^\d{4}-\d{2}$/;

function feldListePruefen(liste: unknown, bereich: string): string | null {
  if (!Array.isArray(liste)) return `Der Bereich ${bereich} der Kategorien fehlt oder ist beschädigt.`;
  for (const feld of liste) {
    if (!istObjekt(feld) || typeof feld.id !== "string" || typeof feld.label !== "string") {
      return `Eine Kategorie in Bereich ${bereich} ist unvollständig.`;
    }
  }
  return null;
}

/**
 * Schichten prüfen -- die Einträge, nicht nur die Liste.
 *
 * Bis 0.9.21 wurde nur `Array.isArray` geprüft. Ein Paket mit
 * `timeLogs: [{ id: "a" }]` kam damit durch und riss anschließend das
 * Zusammenführen ab: `mergeTimeLogs` sortiert über `x.date.localeCompare(...)`
 * und lief auf `undefined`. Nachgestellt am 2026-09-07 mit `npx tsx`:
 * `pruefeSyncPaket` sagte ANGENOMMEN, `mergeSyncPayload` warf
 * "TypeError: Cannot read properties of undefined (reading 'localeCompare')".
 * Das ist genau die Fehlerklasse, für die diese Datei angelegt wurde.
 *
 * Geprüft wird weiterhin nur so viel, wie das Weiterverarbeiten braucht:
 * `id` ist der Schlüssel beim Vereinigen, `date` die Sortiergrundlage, und
 * `duration` wird in der Schichtliste mit `.toFixed(2)` angezeigt. Die übrigen
 * Zahlen laufen über tolerante Leser (`schicht.officeHours || 0`) und bleiben
 * deshalb ungeprüft -- unbekannte Zusatzfelder ohnehin.
 */
function schichtenPruefen(schichten: unknown, wo: string): string | null {
  if (!Array.isArray(schichten)) return `Die Schichten ${wo} sind beschädigt.`;
  for (const schicht of schichten) {
    if (!istObjekt(schicht) || typeof schicht.id !== "string") {
      return `Eine Schicht ${wo} hat keine gültige Kennung.`;
    }
    if (typeof schicht.date !== "string") {
      return `Einer Schicht ${wo} fehlt das Datum.`;
    }
    if (typeof schicht.duration !== "number") {
      return `Einer Schicht ${wo} fehlt die Dauer.`;
    }
  }
  return null;
}

function werteObjektPruefen(werte: unknown, wo: string): string | null {
  if (!istObjekt(werte)) return `Die Zählerstände ${wo} fehlen oder sind beschädigt.`;
  for (const [id, wert] of Object.entries(werte)) {
    if (wert !== "" && typeof wert !== "number") {
      return `Der Zählerstand „${id}“ ${wo} ist keine Zahl.`;
    }
  }
  return null;
}

export function pruefeSyncPaket(unbekannt: unknown): PruefErgebnis {
  if (!istObjekt(unbekannt)) {
    return { ok: false, grund: "Der Code enthält keine RV-Mobil-Daten." };
  }

  // Kopplungscodes der Live-Verbindung sind gültiges JSON, aber keine Daten.
  if (unbekannt.k === "rvw-offer" || unbekannt.k === "rvw-answer") {
    return {
      ok: false,
      grund:
        "Das war ein Kopplungscode für die Live-Verbindung. Bitte nutzen Sie dafür den Punkt „Live-Verbindung beitreten“.",
    };
  }

  if (typeof unbekannt.app === "string" && unbekannt.app !== PAKET_APP) {
    return { ok: false, grund: "Dieser Code stammt aus einer anderen Anwendung." };
  }

  const hatInhalt =
    "appFields" in unbekannt || "history" in unbekannt || "reportData" in unbekannt;
  if (!hatInhalt) {
    return { ok: false, grund: "Der Code enthält keine übertragbaren Daten." };
  }

  if (unbekannt.appFields !== undefined) {
    if (!istObjekt(unbekannt.appFields)) {
      return { ok: false, grund: "Die Kategorien im Paket sind beschädigt." };
    }
    for (const bereich of ["s1", "s2", "s3", "s4"] as const) {
      const fehler = feldListePruefen((unbekannt.appFields as Record<string, unknown>)[bereich], bereich);
      if (fehler) return { ok: false, grund: fehler };
    }
  }

  if (unbekannt.history !== undefined) {
    if (!istObjekt(unbekannt.history)) {
      return { ok: false, grund: "Das Archiv im Paket ist beschädigt." };
    }
    for (const [monat, datensatz] of Object.entries(unbekannt.history)) {
      if (!MONAT.test(monat)) {
        return { ok: false, grund: `Im Archiv steht „${monat}“ statt eines Monats im Format JJJJ-MM.` };
      }
      if (!istObjekt(datensatz)) {
        return { ok: false, grund: `Der Archiv-Eintrag für ${monat} ist beschädigt.` };
      }
      const fehler = werteObjektPruefen(datensatz.values, `im Archiv-Eintrag ${monat}`);
      if (fehler) return { ok: false, grund: fehler };
      if (datensatz.timeLogs !== undefined) {
        const schichtFehler = schichtenPruefen(datensatz.timeLogs, `im Archiv-Eintrag ${monat}`);
        if (schichtFehler) return { ok: false, grund: schichtFehler };
      }
    }
  }

  if (unbekannt.reportData !== undefined && unbekannt.reportData !== null) {
    if (!istObjekt(unbekannt.reportData)) {
      return { ok: false, grund: "Der laufende Monat im Paket ist beschädigt." };
    }
    if (typeof unbekannt.reportData.month !== "string" || !MONAT.test(unbekannt.reportData.month)) {
      return { ok: false, grund: "Dem laufenden Monat im Paket fehlt ein gültiger Berichtsmonat." };
    }
    const fehler = werteObjektPruefen(unbekannt.reportData.values, "im laufenden Monat");
    if (fehler) return { ok: false, grund: fehler };
    // Wurde bis 0.9.21 gar nicht geprüft: `timeLogs: "kaputt"` kam durch.
    if (unbekannt.reportData.timeLogs !== undefined) {
      const schichtFehler = schichtenPruefen(unbekannt.reportData.timeLogs, "im laufenden Monat");
      if (schichtFehler) return { ok: false, grund: schichtFehler };
    }
  }

  if (unbekannt.carryover !== undefined && unbekannt.carryover !== null) {
    if (!istObjekt(unbekannt.carryover)) {
      return { ok: false, grund: "Das Jahreskonto im Paket ist beschädigt." };
    }
    for (const schluessel of [
      "regularVacationEntitlement",
      "additionalVacationEntitlement",
      "vacationCarryover",
      "overtimeCarryover",
      "dailyTargetHours",
    ]) {
      const wert = (unbekannt.carryover as Record<string, unknown>)[schluessel];
      if (wert !== undefined && typeof wert !== "number") {
        return { ok: false, grund: "Die Werte des Jahreskontos im Paket sind keine Zahlen." };
      }
    }
  }

  return { ok: true, paket: unbekannt as SyncPaket };
}

/** Wie viele Monate bringt ein geprüftes Paket mit? (für die Rückfrage vor dem Ersetzen) */
export function monateImPaket(paket: SyncPaket): number {
  return Object.keys(paket.history || {}).length;
}
