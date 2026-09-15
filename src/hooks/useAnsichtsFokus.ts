import { useEffect, useRef } from "react";

/**
 * Markierung an der Überschrift, die eine Ansicht als ihren Titel ausweist.
 *
 * Jede der zwölf Ansichten trägt sie genau einmal; `scripts/checks/ansichtsfokus.ts`
 * zählt nach. Die Markierung steht bewusst NICHT an einer beliebigen Überschrift,
 * sondern an der obersten der jeweiligen Ansicht -- sie ist das, was ein
 * Screenreader nach dem Wechsel vorliest.
 */
export const ANSICHTS_TITEL = "data-ansicht-titel";

/**
 * Setzt den Fokus nach jedem Ansichtswechsel auf die Überschrift der neuen Ansicht.
 *
 * Warum das gebraucht wird -- gemessen am 2026-09-15 auf 0.9.40, vor dieser Änderung:
 *
 * | Weg                                   | Fokus danach                        |
 * |---------------------------------------|-------------------------------------|
 * | untere Leiste -> alle fünf Ansichten  | blieb auf der Navigationstaste      |
 * | Optionen -> Changelog, Datensicherung | `document.body` -- gar kein Fokus   |
 * | Optionen -> fünf weitere Ansichten    | auf „Zurück zu den Optionen"        |
 * | „Zurück" aus der Hilfe                | `document.body` -- gar kein Fokus   |
 *
 * Alle drei Ergebnisse sind schlecht, jedes auf eigene Weise: Die Navigationsleiste
 * steht im Dokument HINTER dem Inhalt, wer also dort stehenbleibt, erreicht die
 * neue Ansicht per Tabulator gar nicht mehr, sondern nur rückwärts. `document.body`
 * bedeutet Dokumentanfang und keinerlei Ansage. Und die Zurück-Taste sagt „Zurück",
 * also ausgerechnet das Gegenteil dessen, was der Nutzer gerade wollte.
 *
 * Die Überschrift dagegen beantwortet die einzige Frage, die nach einem Wechsel
 * offen ist: Wo bin ich? Der nächste Tabulatorschritt führt von dort in den Inhalt.
 * `OnboardingModal` macht das seit jeher bei jedem Schrittwechsel und ist laut
 * CLAUDE.md die Referenz für Fokusarbeit in diesem Projekt.
 *
 * Zwei Dinge, die hier nicht offensichtlich sind:
 *
 * 1. **Kein fester Zeitwert.** `DeviceSyncModal` und `SecureBackupModal` sind
 *    `React.lazy`; beim ersten Öffnen steht erst der Ladeplatzhalter im Dokument
 *    und die echte Ansicht kommt später. Ein `setTimeout(..., 50)` -- der Zeitwert,
 *    den die Ansichten bisher einzeln benutzt haben -- griffe dort ins Leere.
 *    Also wird gesucht, bis die Überschrift da ist, mit einer Frist von zwei
 *    Sekunden und Abbruch, sobald die Ansicht schon wieder gewechselt hat.
 *
 * 2. **Der Seitenaufbau bleibt aus.** Ein Schnellzugriff aus dem Startmenü öffnet
 *    die App direkt in einer Ansicht (`?tab=history`); dort den Fokus zu
 *    versetzen wäre ein Eingriff in den normalen Seitenaufbau, nicht eine
 *    Antwort auf eine Nutzerhandlung.
 *
 *    Gemerkt wird dafür die **vorige Ansicht**, nicht ein „war schon mal dran"-
 *    Schalter. Der erste Entwurf hatte den Schalter, und das Prüfnetz hat ihn
 *    sofort widerlegt: `StrictMode` führt Effekte in der Entwicklung zweimal
 *    aus, der erste Lauf verbrauchte den Schalter, der zweite setzte den Fokus.
 *    In der gebauten Fassung wäre es nicht aufgefallen -- dort gibt es kein
 *    StrictMode --, also hätte sich Entwicklung und Produktion unterschiedlich
 *    verhalten. Der Vergleich mit der vorigen Ansicht ist von beidem
 *    unabhängig und sagt ausserdem genau das, was gemeint ist: Fokus wandert
 *    bei einem WECHSEL, nicht bei einem Durchlauf.
 */
export function useAnsichtsFokus(
  activeTab: string,
  /**
   * Kennung des Bedienelements, auf das der Fokus **stattdessen** gehört —
   * gesetzt, wenn der Nutzer eine Ansicht über ihre Zurück-Taste verlässt
   * (0.9.43). Existiert das Element nicht, gilt wieder die Überschrift; die
   * Kennung wird in jedem Fall nur einmal verbraucht.
   */
  rueckkehrRef?: React.RefObject<string | null>,
) {
  const vorigeAnsicht = useRef<string | null>(null);

  useEffect(() => {
    const vorher = vorigeAnsicht.current;
    vorigeAnsicht.current = activeTab;
    const rueckkehr = rueckkehrRef?.current ?? null;
    if (rueckkehrRef) rueckkehrRef.current = null;
    // null = Seitenaufbau; gleich = derselbe Effekt lief erneut, ohne dass sich
    // die Ansicht geändert hat.
    if (vorher === null || vorher === activeTab) return;

    let abgebrochen = false;
    let anforderung = 0;
    const frist = performance.now() + 2000;

    const suche = () => {
      if (abgebrochen) return;
      // Der Rückweg zuerst: Wer aus der Hilfe zurückkommt, soll wieder auf der
      // Zeile „Hilfe & Anleitung" stehen, nicht am Anfang des Menüs.
      if (rueckkehr) {
        const zeile = document.getElementById(rueckkehr);
        if (zeile) {
          zeile.focus();
          return;
        }
      }
      const titel = document.querySelector<HTMLElement>(`[${ANSICHTS_TITEL}]`);
      if (titel) {
        // Ohne preventScroll: Die Überschrift soll auch sichtbar sein, nicht nur
        // fokussiert -- das ist für die Sehrest-Nutzung der Zielgruppe der
        // eigentliche Nutzen.
        titel.focus();
        return;
      }
      if (performance.now() > frist) return;
      anforderung = requestAnimationFrame(suche);
    };

    anforderung = requestAnimationFrame(suche);
    return () => {
      abgebrochen = true;
      cancelAnimationFrame(anforderung);
    };
  }, [activeTab]);
}
