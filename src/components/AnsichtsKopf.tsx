import type { ReactNode, Ref } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";

/**
 * Der Kopf jeder Ansicht (0.9.68) -- einmal gebaut, überall benutzt.
 *
 * Bis 0.9.67 hatte jede Ansicht ihren eigenen Kopf, und es gab davon sechs
 * Spielarten: Symbol über oder neben der Überschrift, mit oder ohne grauen
 * Balken, Symbol grün, blau oder violett, Zurück-Taste mit 44 oder 48 px,
 * Untertitel fett oder normal. Nebeneinander fotografiert sah das aus wie
 * mehrere Apps. Die Unterschiede stehen jetzt in den Daten (Titel, Symbol,
 * Untertitel, Rückweg), nicht mehr im Markup.
 *
 * GESTAPELT, NICHT NEBENEINANDER -- und das ist gemessen, nicht Geschmack:
 * Die Zurück-Taste ist rem-basiert und wächst bei „Extra groß" von 48 auf
 * 72 px. Stand die Überschrift daneben, blieben ihr in einem 360-px-Fenster
 * 58 px, bei „Datensicherung" 34 px (CarryoverModal, SecureBackupModal,
 * 2026-09-20), und sie brach in eine senkrechte Buchstabenspalte. Oben
 * Taste und Symbol, darunter die Überschrift mit der vollen Breite -- bei
 * jeder Schriftgröße und jeder Fensterbreite dieselbe Anordnung.
 *
 * `markiert`: Die Überschrift trägt `data-ansicht-titel`, das Ziel von
 * `useAnsichtsFokus`. Pro Ansicht genau eine -- Untermenüs innerhalb einer
 * Ansicht (Optionen → Anzeige & Bedienung) setzen `markiert={false}`.
 * `scripts/checks/ansichtsfokus.ts` zählt beides.
 */
interface AnsichtsKopfProps {
  titel: ReactNode;
  symbol: LucideIcon;
  untertitel?: ReactNode;
  /** id der Überschrift, wo ein `aria-labelledby` auf sie zeigt. */
  id?: string;
  zurueck?: {
    beschriftung: string;
    onClick: () => void;
    ref?: Ref<HTMLButtonElement>;
  };
  /** Weitere Bedienelemente rechts in der oberen Zeile. */
  rechts?: ReactNode;
  markiert?: boolean;
  className?: string;
}

export default function AnsichtsKopf({
  titel,
  symbol: Icon,
  untertitel,
  id,
  zurueck,
  rechts,
  markiert = true,
  className = "mb-5",
}: AnsichtsKopfProps) {
  return (
    <header className={`pb-4 border-b border-[var(--card-border)] ${className}`}>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {zurueck && (
          <button
            ref={zurueck.ref}
            type="button"
            onClick={zurueck.onClick}
            aria-label={zurueck.beschriftung}
            className="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)] cursor-pointer transition-colors active:scale-95 focus-visible:ring-4"
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </button>
        )}
        <span
          className="w-12 h-12 flex-shrink-0 rounded-[var(--rv-radius-md)] bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] flex items-center justify-center"
          aria-hidden="true"
        >
          <Icon className="w-6 h-6" />
        </span>
        {rechts && <div className="ml-auto flex flex-wrap items-center gap-2 min-w-0 max-w-full [&>*]:max-w-full">{rechts}</div>}
      </div>
      {markiert ? (
        <h2
          id={id}
          tabIndex={-1}
          data-ansicht-titel=""
          className="text-xl md:text-2xl font-black text-[var(--text-color)] min-w-0 [overflow-wrap:anywhere] hyphens-auto"
        >
          {titel}
        </h2>
      ) : (
        <h2
          id={id}
          className="text-xl md:text-2xl font-black text-[var(--text-color)] min-w-0 [overflow-wrap:anywhere] hyphens-auto"
        >
          {titel}
        </h2>
      )}
      {untertitel && (
        <p className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">{untertitel}</p>
      )}
    </header>
  );
}
