/**
 * Arbeitszeit-Berechnung für eine Schicht.
 *
 * Lag bis 0.9.4 als lokale Funktion in ClockInWidget.tsx (gut 1000 Zeilen) und
 * war dadurch nicht prüfbar — obwohl hier ein Fehler unmittelbar in falschen
 * Stundenzahlen im Bericht landet. Reine Funktion, keine Abhängigkeiten:
 * siehe scripts/checks/zeit.ts.
 */

/** "HH:MM" -> Minuten seit Mitternacht, oder null bei unbrauchbarer Eingabe. */
function minutenSeitMitternacht(zeit: string): number | null {
  if (typeof zeit !== "string") return null;
  const teile = zeit.split(":");
  if (teile.length < 2) return null;
  const stunden = Number(teile[0]);
  const minuten = Number(teile[1]);
  if (!Number.isFinite(stunden) || !Number.isFinite(minuten)) return null;
  if (stunden < 0 || stunden > 23 || minuten < 0 || minuten > 59) return null;
  return stunden * 60 + minuten;
}

/**
 * Netto-Arbeitsstunden zwischen zwei Uhrzeiten, abzüglich Pause.
 *
 * Liegt die Endzeit vor der Startzeit, wird eine Schicht über Mitternacht
 * angenommen (22:00–06:00 = 8 Stunden).
 *
 * Unbrauchbare Eingaben ergeben 0 statt NaN — vorher konnte während des
 * Ausfüllens NaN durch die Oberfläche wandern.
 */
export function berechneNettoStunden(
  kommen: string,
  gehen: string,
  pauseMinuten: number,
): number {
  const von = minutenSeitMitternacht(kommen);
  const bis = minutenSeitMitternacht(gehen);
  if (von === null || bis === null) return 0;

  // Schicht über Mitternacht
  const bisKorrigiert = bis < von ? bis + 24 * 60 : bis;
  const pause = Number.isFinite(pauseMinuten) ? Math.max(0, pauseMinuten) : 0;

  const nettoMinuten = Math.max(0, bisKorrigiert - von - pause);
  return Math.round((nettoMinuten / 60) * 100) / 100;
}
