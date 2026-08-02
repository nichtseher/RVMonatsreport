/**
 * JSON mit stabiler Schlüsselreihenfolge.
 *
 * Warum das nötig ist: Der Live-Abgleich sendet nur, wenn sich der Datenstand
 * geändert hat -- verglichen wird der erzeugte JSON-Text. Nach einem
 * Zusammenführen entstehen aber neue Objekte, deren Schlüssel in anderer
 * Reihenfolge stehen können. Inhaltlich identische Stände sahen dadurch
 * verschieden aus, und beide Geräte schickten sich im Dreisekundentakt
 * dauerhaft denselben Inhalt zu (gemessen am 2026-08-02: 7 Nachrichten je
 * Richtung in 20 Sekunden, ganz ohne Eingabe).
 *
 * Reihenfolgen innerhalb von Arrays bleiben erhalten -- dort ist die
 * Reihenfolge Teil der Bedeutung (z. B. Reihenfolge der Kategorien).
 */
export function stableStringify(wert: unknown): string {
  return JSON.stringify(normalisieren(wert));
}

function normalisieren(wert: unknown): unknown {
  if (Array.isArray(wert)) return wert.map(normalisieren);
  if (wert && typeof wert === "object") {
    const quelle = wert as Record<string, unknown>;
    const ziel: Record<string, unknown> = {};
    Object.keys(quelle)
      .sort()
      .forEach((k) => {
        if (quelle[k] !== undefined) ziel[k] = normalisieren(quelle[k]);
      });
    return ziel;
  }
  return wert;
}
