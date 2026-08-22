import { FieldConfig, ReportData, SectionsConfig } from "../types";
import { formatMonthGerman } from "./dateUtils";

/**
 * Der Text, den die Vorlesefunktion spricht.
 *
 * Das ist die Kontrollinstanz fuer blinde Nutzerinnen und Nutzer: Sie hoeren
 * sich den Monat an, bevor er zur Vertriebsleitung geht. Faellt hier still ein
 * Bereich heraus, wird ein falscher Bericht im guten Glauben verschickt --
 * anders als auf dem Bildschirm gibt es keine zweite Wahrnehmung, die den
 * Fehler bemerkt.
 *
 * Lag bis 0.9.14 mitten in `handleReadSummaryAloud` in `App.tsx` und war damit
 * ungeprueft. Als reine Funktion herausgeloest, Wortlaut unveraendert.
 */

/** Die Bereichsueberschriften, wie sie vorgelesen werden. */
export const BEREICHS_TITEL: Record<keyof SectionsConfig, string> = {
  s1: "Vorführungen und Auslieferungen",
  s2: "Schulung, Support und Akquise",
  s3: "Spezialprodukte",
  s4: "Arbeitszeit und Büro",
};

export function baueZusammenfassung(
  daten: ReportData | null,
  felder: SectionsConfig,
): string {
  const teile: string[] = [];
  teile.push(`Zusammenfassung für ${formatMonthGerman(daten?.month || "")}.`);
  if (daten?.name) teile.push(`Mitarbeiter: ${daten.name}.`);

  // Nur Felder mit echtem Wert vorlesen. Alles aufzuzaehlen -- auch die
  // Nullen -- ergaebe eine Minute Text, in der die relevanten Zahlen untergehen.
  let etwasGefunden = false;

  const bereichsText = (titel: string, bereichsFelder: FieldConfig[]): string => {
    const stuecke: string[] = [];
    (bereichsFelder || []).forEach((f) => {
      const wert = (daten?.values || {})[f.id];
      if (typeof wert === "number" && wert > 0) {
        stuecke.push(`${f.label}: ${wert}`);
        etwasGefunden = true;
      }
    });
    return stuecke.length > 0 ? `Im Bereich ${titel}: ${stuecke.join(". ")}.` : "";
  };

  (["s1", "s2", "s3", "s4"] as (keyof SectionsConfig)[]).forEach((bereich) => {
    const text = bereichsText(BEREICHS_TITEL[bereich], felder[bereich]);
    if (text) teile.push(text);
  });

  if (daten?.notes && daten.notes.trim()) {
    teile.push(`Notizen: ${daten.notes}.`);
    etwasGefunden = true;
  }

  // Der Schlusssatz ist kein Beiwerk: Ohne ihn weiss man beim Zuhoeren nicht,
  // ob der Bericht zu Ende ist oder die Ausgabe abgebrochen wurde.
  teile.push(
    etwasGefunden
      ? "Bericht vollständig vorgelesen."
      : "Es wurden noch keine Werte für diesen Monat eingetragen.",
  );

  return teile.join(" ");
}
