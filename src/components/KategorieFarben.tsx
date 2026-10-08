import { useId } from "react";
import { Palette } from "lucide-react";
import type { SectionsConfig } from "../types";
import { FARB_PALETTE, istFarbe } from "../utils/kategorieFarbe";
import { bereichsTitel, findeVorlage } from "../utils/vorlagen";

interface KategorieFarbenProps {
  appFields: SectionsConfig;
  vorlageId: string;
  /** `null` entfernt die eigene Farbe (zurueck zur Bereichsfarbe). */
  onChange: (fieldId: string, label: string, farbe: string | null) => void;
  onResetAll: () => void;
  /** In den Hochkontrast-Schemata werden eigene Farben nicht angezeigt -- das steht dann da. */
  farbenSichtbar: boolean;
}

/**
 * Optionale eigene Farben je Kategorie (0.9.74), fuer sehende Kolleginnen und Kollegen.
 *
 * Nichts ist hinter einer Klappe versteckt (siehe ROADMAP "Bewusst NICHT geplant"): Alle
 * Kategorien stehen untereinander, je Zeile die Auswahl. Jede Taste traegt einen Namen
 * ("Blau"), nicht nur eine Farbe, und `aria-pressed` sagt, welche gewaehlt ist -- ein
 * Screenreader meldet "Rot, Taste, nicht gedrueckt" statt Schweigen.
 * Die freie Wahl ist das native Farbfeld des Geraets. Was daraus angezeigt wird, ist eine
 * errechnete, lesbare Fassung (utils/kategorieFarbe.ts); gespeichert wird die Wahl.
 */
export default function KategorieFarben({ appFields, vorlageId, onChange, onResetAll, farbenSichtbar }: KategorieFarbenProps) {
  const vorlage = findeVorlage(vorlageId);
  const basis = useId();
  const gewaehlt = (["s1", "s2", "s3", "s4"] as const).flatMap((s) => appFields[s]).filter((f) => istFarbe(f.farbe)).length;

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-[var(--text-muted)] leading-snug">
        Freiwillig: Geben Sie einer Kategorie eine eigene Farbe, damit Sie sie auf einen Blick wiederfinden. Die Farbe erscheint
        am Rand der Zählerkarte und in der Schnell-Erfassung. Name und Zahl bleiben maßgeblich, und die Farbe gilt nur auf diesem
        Gerät.
      </p>
      {!farbenSichtbar && (
        <p className="text-xs font-bold text-[var(--text-color)] leading-snug p-3 rounded-[var(--rv-radius-md)] bg-[var(--info-bg)] border border-[var(--card-border)]">
          Ihr Farbschema ist ein Hochkontrast-Schema. Darin werden eigene Farben nicht angezeigt, damit nichts die Lesbarkeit
          stört. Ihre Auswahl bleibt gespeichert.
        </p>
      )}

      {(["s1", "s2", "s3", "s4"] as const).map((s) => (
        <section key={s} aria-labelledby={`${basis}-${s}`} className="space-y-2">
          <h4 id={`${basis}-${s}`} className="text-xs font-black text-[var(--text-muted)] [overflow-wrap:anywhere]">
            {bereichsTitel(vorlage, s)}
          </h4>
          <ul className="space-y-3 list-none p-0 m-0">
            {appFields[s].map((f) => {
              const eigene = istFarbe(f.farbe) ? f.farbe : null;
              const gruppe = `${basis}-${f.id}`;
              return (
                <li key={f.id} className="rounded-[var(--rv-radius-md)] border border-[var(--card-border)] bg-[var(--bg-color)] p-3 space-y-2">
                  <p id={gruppe} className="text-sm font-bold text-[var(--text-color)] [overflow-wrap:anywhere]">
                    {f.label}
                  </p>
                  <div role="group" aria-labelledby={gruppe} className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={!eigene}
                      onClick={() => onChange(f.id, f.label, null)}
                      className={`min-h-[44px] px-3 rounded-[var(--rv-radius-md)] border-2 text-sm font-bold cursor-pointer ${
                        !eigene
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-color)]"
                          : "border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-muted)]"
                      }`}
                    >
                      Standard
                    </button>
                    {FARB_PALETTE.map((p) => {
                      const aktiv = !!eigene && eigene.toLowerCase() === p.hex.toLowerCase();
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          aria-pressed={aktiv}
                          aria-label={p.name}
                          title={p.name}
                          onClick={() => onChange(f.id, f.label, p.hex)}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border-2 cursor-pointer flex items-center justify-center ${
                            aktiv ? "border-[var(--text-color)] ring-2 ring-[var(--border-focus)]" : "border-[var(--border-color)]"
                          }`}
                        >
                          <span aria-hidden="true" className="block w-7 h-7 rounded-full" style={{ background: p.hex }} />
                        </button>
                      );
                    })}
                    <label className="inline-flex flex-wrap items-center gap-x-2 max-w-full min-h-[44px] px-2 rounded-[var(--rv-radius-md)] border border-[var(--border-color)] bg-[var(--card-bg)] text-sm font-bold text-[var(--text-color)] cursor-pointer">
                      <Palette className="w-4 h-4" aria-hidden="true" />
                      Eigene
                      <input
                        type="color"
                        value={eigene ?? "#3b6fd4"}
                        aria-label={`Eigene Farbe für ${f.label}`}
                        onChange={(e) => onChange(f.id, f.label, e.target.value)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] p-0 border-0 bg-transparent cursor-pointer"
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <button
        type="button"
        onClick={onResetAll}
        disabled={gewaehlt === 0}
        className="w-full min-h-[44px] px-4 rounded-[var(--rv-radius-md)] border-2 border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-default"
      >
        {gewaehlt === 0 ? "Keine eigenen Farben gewählt" : `Alle ${gewaehlt} eigenen Farben zurücksetzen`}
      </button>
    </div>
  );
}

