import { VORLAGEN } from "../utils/vorlagen";

interface VorlagenWahlProps {
  vorlageId: string;
  onChange: (id: string) => void;
}

/**
 * Auswahl der Berichtsvorlage -- in den Optionen und im Ersteinstieg.
 *
 * Eine Gruppe von Schaltern mit `aria-pressed` statt Radio-Eingaben: Das ist
 * die Muster-Wahl im Rest der App (Schriftgroesse, Farben im Ersteinstieg),
 * und ein Screenreader sagt "gedrueckt" bzw. "nicht gedrueckt" von selbst.
 * Name und Fassung stehen im Text des Schalters, sein zugaenglicher Name ist
 * also der sichtbare Text (WCAG 2.5.3).
 */
export default function VorlagenWahl({ vorlageId, onChange }: VorlagenWahlProps) {
  return (
    <div role="group" aria-label="Berichtsvorlage wählen" className="space-y-2">
      {VORLAGEN.map((v) => {
        const aktiv = v.id === vorlageId;
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={aktiv}
            onClick={() => onChange(v.id)}
            className={`w-full min-h-[44px] px-3 py-2.5 rounded-[var(--rv-radius-md)] text-left border-2 transition-all cursor-pointer ${
              aktiv
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-color)]"
                : "border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-muted)] hover:border-[var(--accent)]/50"
            }`}
          >
            <span className="block text-sm font-bold [overflow-wrap:anywhere]">{v.name}</span>
            <span className="block text-xs">Fassung {v.stand}</span>
          </button>
        );
      })}
    </div>
  );
}
