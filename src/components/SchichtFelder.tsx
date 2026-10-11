import type { SchichtFormular } from "../hooks/useSchichtFormular";
import type { Aufteilung } from "../utils/schichtStunden";

/**
 * Die gemeinsamen Felder der beiden Schicht-Formulare der Stempeluhr:
 * Pause, Aufteilung Büro/Außendienst, eigene Prozent, getippte Stunden und
 * Kommentar. „Ausstempeln" und „Vergessene Schicht nachtragen" setzen dieses
 * Stück in ihr jeweils eigenes `<form>` (0.9.78) -- vorher standen die rund 230
 * Zeilen zweimal in `ClockInWidget.tsx`, zu 76–78 % gleich. Ein
 * Überlauf-Fix (`min-w-0`, `flex-wrap`) musste deshalb zweimal gemacht werden.
 *
 * Die Unterschiede zwischen den beiden Formularen sind Daten, keine Zweige:
 * die Kennungen der Felder (`ids`, jede muss im Dokument einmalig bleiben), der
 * Name der Auswahlgruppe und der Pausenhinweis.
 */

export interface SchichtFelderKennungen {
  pause: string;
  regler: string;
  buero: string;
  aussendienst: string;
  notiz: string;
}

interface Props {
  f: SchichtFormular;
  ids: SchichtFelderKennungen;
  /** Zugänglicher Name der Auswahlgruppe für die Aufteilung. */
  gruppenName: string;
  /** Vorschlag aus der Aufteilung -- steht als Platzhalter in den Stundenfeldern. */
  vorschlag: { buero: number; aussendienst: number };
  /** Der gesetzliche Pausenhinweis; nur das Ausstempeln zeigt ihn. */
  pauseHinweis?: boolean;
}

const AUFTEILUNGEN: { id: Aufteilung; label: string }[] = [
  { id: "half", label: "50% / 50%" },
  { id: "office", label: "100% Büro" },
  { id: "field", label: "100% Außen" },
  { id: "custom", label: "Eigene %" },
];

export default function SchichtFelder({ f, ids, gruppenName, vorschlag, pauseHinweis }: Props) {
  const getippt = f.getipptBuero !== "" || f.getipptAussendienst !== "";
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Break input */}
        <div className="space-y-1">
          <label htmlFor={ids.pause} className="text-xs font-bold text-[var(--text-muted)] block">
            Pause abziehen (Minuten):
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => f.setPause((prev) => Math.max(0, prev - 15))}
              className="px-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded bg-[var(--card-bg)] border border-[var(--border-color)] text-xs font-bold cursor-pointer hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)] active:scale-90"
              aria-label="-15: Pause um 15 Minuten verringern"
            >
              -15
            </button>
            <input
              id={ids.pause}
              type="number"
              min="0"
              max="240"
              step="5"
              value={f.pause}
              onChange={(e) => f.setPause(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 min-w-[64px] min-h-[44px] p-1.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-xs font-bold rounded text-center outline-none"
            />
            <button
              type="button"
              onClick={() => f.setPause((prev) => Math.min(240, prev + 15))}
              className="px-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded bg-[var(--card-bg)] border border-[var(--border-color)] text-xs font-bold cursor-pointer hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)] active:scale-90"
              aria-label="+15: Pause um 15 Minuten erhöhen"
            >
              +15
            </button>
          </div>
          {pauseHinweis && (
            <span className="text-[0.75rem] text-[var(--text-muted)] block font-normal">
              (Vorgeschrieben: 30 Min ab 6h, 45 Min ab 9h)
            </span>
          )}
        </div>

        {/* Split ratio selector (ACCESSIBLE Presets) */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-[var(--text-muted)] block">
            Aufteilung der Stunden:
          </label>
          <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label={gruppenName}>
            {AUFTEILUNGEN.map((p) => {
              const isActive = f.aufteilung === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => f.setAufteilung(p.id)}
                  className={`p-1.5 min-h-[44px] inline-flex items-center justify-center rounded border text-[0.75rem] font-black cursor-pointer transition-all ${
                    isActive
                      ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]"
                      : "bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom ratio slider if selected */}
      {f.aufteilung === "custom" && (
        <div className="p-3 rounded-[var(--rv-radius-sm)] border border-[var(--card-border)] bg-[var(--card-bg)] space-y-2 animate-slide-up">
          <label
            htmlFor={ids.regler}
            className="text-[0.75rem] font-black text-[var(--text-muted)] flex justify-between"
          >
            <span>
              Aufteilung: {f.eigenProzent}% Büro / {100 - f.eigenProzent}% Außendienst
            </span>
          </label>
          <input
            id={ids.regler}
            type="range"
            min="0"
            max="100"
            step="5"
            value={f.eigenProzent}
            aria-valuetext={`${f.eigenProzent} Prozent Büro, ${100 - f.eigenProzent} Prozent Außendienst`}
            onChange={(e) => f.setEigenProzent(parseInt(e.target.value))}
            /* `rv-slider` statt `h-1.5 appearance-none`: Nachgemessen am
               2026-09-01 hatte dieser Regler eine Trefferfläche von
               168 × 6 px -- weit unter den 24 px aus WCAG 2.5.8 -- und
               `appearance: none` ohne eigenen Griff, womit Chrome gar
               keinen zeichnet. Genau diese Kombination beschreibt der
               Kommentar zu `.rv-slider` in index.css als behoben. */
            className="rv-slider w-full accent-[var(--accent)]"
          />
        </div>
      )}

      {/* Direct manual hours entry */}
      <div className="p-3 rounded-[var(--rv-radius-md)] border border-[var(--card-border)] bg-[var(--card-bg)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[0.75rem] font-black text-[var(--text-color)] flex items-center gap-1">
            Büro vs. Außendienst h
          </span>
          {getippt && (
            <button
              type="button"
              onClick={f.tippenLeeren}
              className="text-[0.75rem] text-[var(--danger)] hover:underline font-black cursor-pointer"
            >
              Zurücksetzen auf Automatik
            </button>
          )}
        </div>
        <p className="text-[0.75rem] text-[var(--text-muted)] font-normal leading-relaxed">
          Tragen Sie die Stunden bei Bedarf direkt manuell ein (mit 2 Nachkommastellen):
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor={ids.buero}
              className="text-[0.75rem] font-bold text-[var(--text-muted)] block"
            >
              Stunden Büro (h):
            </label>
            <input
              id={ids.buero}
              type="number"
              step="0.01"
              min="0"
              placeholder={vorschlag.buero.toFixed(2)}
              value={f.getipptBuero}
              onChange={(e) => f.setGetipptBuero(e.target.value)}
              className="w-full min-w-0 min-h-[44px] p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-bold outline-none focus:border-[var(--border-focus)]"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={ids.aussendienst}
              className="text-[0.75rem] font-bold text-[var(--text-muted)] block"
            >
              Stunden Außendienst (h):
            </label>
            <input
              id={ids.aussendienst}
              type="number"
              step="0.01"
              min="0"
              placeholder={vorschlag.aussendienst.toFixed(2)}
              value={f.getipptAussendienst}
              onChange={(e) => f.setGetipptAussendienst(e.target.value)}
              className="w-full min-w-0 min-h-[44px] p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-bold outline-none focus:border-[var(--border-focus)]"
            />
          </div>
        </div>
        {/* min-w-0 + flex-wrap: Die Beschriftung ist ein langes deutsches
            Wortband und gibt ihre Breite sonst nicht unter ihren Inhalt preis.
            Auf dem CI-Läufer, der weder "Segoe UI" noch dessen Mono-Pendant
            hat, sprengte diese Zeile bei "Extra groß" das 360-px-Fenster
            (368 bzw. 369 px gemessen) -- hier unsichtbar, weil die Schriften
            vorhanden sind. Früher in beiden Formularen einzeln, jetzt einmal. */}
        <div className="text-[0.75rem] font-black text-[var(--text-muted)] flex flex-wrap justify-between gap-x-2 bg-[var(--bg-color)] p-2 rounded-[var(--rv-radius-sm)]">
          <span className="min-w-0 [overflow-wrap:anywhere]">Gesamtstunden dieser Schicht:</span>
          <span className="font-mono text-[var(--total-text)] flex-shrink-0">
            {(getippt
              ? (parseFloat(f.getipptBuero) || 0) + (parseFloat(f.getipptAussendienst) || 0)
              : vorschlag.buero + vorschlag.aussendienst
            ).toFixed(2)}
            h
          </span>
        </div>
      </div>

      {/* Quick shift commentary/notes */}
      <div className="space-y-1">
        <label htmlFor={ids.notiz} className="text-xs font-bold text-[var(--text-muted)] block">
          Kurzkommentar / besuchte Schule / Ort (optional):
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={ids.notiz}
            type="text"
            placeholder="z.B. Schulung an blindenschule Hannover, wewalk vorführung..."
            value={f.notiz}
            onChange={(e) => f.setNotiz(e.target.value)}
            className="flex-1 min-w-[64px] min-h-[44px] p-2 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded text-xs font-bold outline-none focus:border-[var(--border-focus)]"
          />
        </div>
      </div>
    </>
  );
}
