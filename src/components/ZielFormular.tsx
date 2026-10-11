import type { GoalsConfig } from "../hooks/useEinstellungen";
import type { Bereichsschluessel, BereichsName } from "../utils/vorlagen";

/**
 * Das Formular für die Monatsziele (aufklappbar unter den Schnell-Optionen
 * der Formular-Ansicht). Bis 0.9.79 stand es als gut 130 Zeilen inline in
 * `App.tsx`, mit vier fast gleichen Eingabefeldern.
 *
 * Die Beschriftungen kommen aus der gewählten Vorlage (`bereiche`): Jedes Team
 * nennt seine Bereiche anders.
 */

interface Props {
  goalsConfig: GoalsConfig;
  updateGoalsConfig: (neu: GoalsConfig) => void;
  bereiche: Record<Bereichsschluessel, BereichsName>;
  triggerHaptic: (dauer?: number) => void;
  announceToAriaAndSpeech: (nachricht: string, sofort?: boolean) => void;
}

export default function ZielFormular({
  goalsConfig,
  updateGoalsConfig,
  bereiche,
  triggerHaptic,
  announceToAriaAndSpeech,
}: Props) {
  // Bereich 4 ist in jeder Vorlage dieselbe Arbeitszeit.
  const felder: { schluessel: Bereichsschluessel; beschriftung: string }[] = [
    { schluessel: "s1", beschriftung: bereiche.s1.kurz },
    { schluessel: "s2", beschriftung: bereiche.s2.kurz },
    { schluessel: "s3", beschriftung: bereiche.s3.bereich },
    { schluessel: "s4", beschriftung: "Bürozeit (h)" },
  ];

  return (
    <div
      className="pt-2.5 mt-2.5 border-t border-[var(--card-border)] space-y-2.5 animate-slide-up"
      role="group"
      aria-label="Ziele-Konfiguration"
    >
      {/*
        EIN <label> umschliesst die ganze Zeile. Früher waren es zwei Elemente:
        eine sichtbare Überschrift ausserhalb des Labels und ein <label>, dessen
        Text nur "Aktiviert"/"Deaktiviert" enthielt -- der zugängliche Name der
        Checkbox war dadurch wörtlich "Deaktiviert" (gemessen 2026-09-19). Jetzt
        enthält der Name jeden sichtbaren Text der klickbaren Fläche (WCAG 2.5.3),
        und min-h-[44px] hält die Trefferfläche ein.
      */}
      <label className="flex items-center justify-between min-h-[44px] cursor-pointer select-none">
        <span className="text-xs font-bold text-[var(--text-color)]">Monatsziele festlegen</span>
        <span className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={goalsConfig.enabled}
            onChange={(e) => {
              triggerHaptic(15);
              updateGoalsConfig({ ...goalsConfig, enabled: e.target.checked });
              announceToAriaAndSpeech(
                e.target.checked
                  ? "Monatsziele in den Kacheln aktiviert"
                  : "Monatsziele in den Kacheln ausgeblendet",
              );
            }}
            className="sr-only peer"
          />
          <span className="w-8 h-4 bg-[var(--border-color)] peer-focus-visible:[outline:3px_solid_var(--border-focus)] peer-focus-visible:[outline-offset:2px] peer-focus-visible:[box-shadow:0_0_0_7px_var(--focus-glow)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--card-bg)] after:border-[var(--border-color)] after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-[var(--accent)]"></span>
          <span className="ml-1.5 text-[0.75rem] font-bold text-[var(--text-muted)]">
            {goalsConfig.enabled ? "Aktiviert" : "Deaktiviert"}
          </span>
        </span>
      </label>

      <p className="text-[0.75rem] text-[var(--text-muted)] leading-relaxed">
        Tragen Sie hier Ihre persönlichen Monatsziele ein. Wenn die Ziele aktiviert sind, zeigt Ihnen
        das Dashboard in den Kacheln Ihren aktuellen Fortschritt mit farbigen Balken an.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/*
          Jedes Feld hat sein <label> mit htmlFor und eine id. Früher waren es
          vier <label> ohne Verbindung zu vier <input> ohne id: Der zugängliche
          Name aller Felder war leer, NVDA/VoiceOver lasen nur "Bearbeiten, Zahl"
          (gemessen 2026-09-19).
        */}
        {felder.map(({ schluessel, beschriftung }) => (
          <div key={schluessel}>
            <label
              htmlFor={`goal-${schluessel}-input`}
              className="block text-[0.75rem] font-bold text-[var(--text-muted)] mb-1"
            >
              {beschriftung}
            </label>
            <input
              id={`goal-${schluessel}-input`}
              type="number"
              min="1"
              max="999"
              value={goalsConfig[schluessel] || ""}
              onChange={(e) => {
                const wert = Math.max(1, parseInt(e.target.value) || 0);
                updateGoalsConfig({ ...goalsConfig, [schluessel]: wert });
              }}
              className="w-full min-h-[44px] px-3 py-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-base font-bold rounded-[var(--rv-radius-md)] outline-none focus:border-[var(--border-focus)]"
              disabled={!goalsConfig.enabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
