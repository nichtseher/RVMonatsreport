import React, { useEffect, useRef, useState } from "react";
import { Calendar, Save } from "lucide-react";
import AnsichtsKopf from "./AnsichtsKopf";
import { YearlyCarryover } from "../types";
import { rueckfrageOffen } from "../utils/rueckfrage";

interface CarryoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  carryover: YearlyCarryover;
  onSave: (newCarryover: YearlyCarryover) => void;
  announceToAriaAndSpeech: (message: string, immediate?: boolean) => void;
}

export default function CarryoverModal({
  isOpen,
  onClose,
  carryover,
  onSave,
  announceToAriaAndSpeech
}: CarryoverModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Local state for editing carryover configurations
  const [localCarryover, setLocalCarryover] = useState<YearlyCarryover>({ ...carryover });

  // Update local state when prop changes
  useEffect(() => {
    setLocalCarryover({ ...carryover });
  }, [carryover, isOpen]);

  /*
    `onClose` in einer Ref, damit der Effekt unten nicht daran haengt -- die
    ausfuehrliche Begruendung steht in `ConfirmDialog.tsx`. Gemessen am
    2026-09-12: Ein App-Render warf den Fokus aus dem Jahreskonto zurueck auf
    "Zurueck zur Zeiterfassung".
  */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Escape schliesst; eine Fokusfalle waere hier falsch (Begruendung unten).
  useEffect(() => {
    if (!isOpen) return;

    /*
      Startfokus und Wiederherstellung sind mit 0.9.41 entfallen -- den Fokus
      setzt jetzt zentral `useAnsichtsFokus` auf die Ueberschrift dieser
      Ansicht, und die Wiederherstellung war wirkungslos: Das gemerkte Element
      haengt beim Schliessen nicht mehr im Dokument (gemessen).
    */

    const handleKeyDown = (e: KeyboardEvent) => {
      /*
        Solange eine Rueckfrage steht, ruhen die Tastenkuerzel dieser Ansicht.
        Ohne diese Zeile schloss ein Escape, das die Rueckfrage abbrechen
        sollte, zugleich die Ansicht dahinter -- Begruendung und Messung in
        `utils/rueckfrage.ts`.
      */
      if (rueckfrageOffen()) return;
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }

      /*
        Hier stand bis zum 2026-09-02 eine Fokusfalle: Der Tabulator wurde am
        letzten Bedienelement wieder auf das erste gesetzt.

        Sie war falsch, weil diese Ansicht **kein modaler Dialog ist.** Ihre
        Wurzel ist eine gewoehnliche Karte im Seitenfluss -- kein `fixed
        inset-0`, keine abdunkelnde Flaeche, kein `aria-modal`. Die untere
        Navigationsleiste bleibt sichtbar und ist mit der Maus anklickbar; mit
        der Tastatur war sie es nicht mehr. Genau das ist WCAG 2.1.1: eine
        sichtbare, bedienbare Funktion, die per Tastatur nicht erreichbar ist.

        Gefunden vom Tabulator-Durchlauf, der am selben Tag entstanden ist.
        Zum Vergleich: `DeviceSyncModal` ist ein echtes Overlay (`fixed
        inset-0`, abgedunkelt, `aria-modal="true"`) -- dort ist die Falle
        richtig und bleibt.

        Escape schliesst weiterhin; der Startfokus liegt seit 0.9.41 auf der
        Ueberschrift dieser Ansicht (`useAnsichtsFokus`).
      */
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (key: keyof YearlyCarryover, value: number) => {
    setLocalCarryover((prev) => ({
      ...prev,
      [key]: isNaN(value) ? 0 : value,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localCarryover);
    announceToAriaAndSpeech("Jahreskonto-Einstellungen erfolgreich gespeichert.", true);
    onClose();
  };

  return (
    <div
      ref={modalRef}
      className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-[var(--rv-radius-xl)] w-full border border-[var(--card-border)] p-6 md:p-8 relative shadow-[var(--rv-shadow-lg)] animate-fade-in"
    >
      <AnsichtsKopf
        id="carryover-modal-title"
        titel="Jahreskonto"
        untertitel="Hier tragen Sie Ihre Startwerte für Urlaub und Überstunden ein."
        symbol={Calendar}
        zurueck={{ beschriftung: "Zurück zur Zeiterfassung", onClick: onClose, ref: closeButtonRef }}
      />

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Section 1: Urlaubskonto */}
          <div className="space-y-3 p-4 rounded-[var(--rv-radius-md)] border border-[var(--card-border)] bg-[var(--bg-color)]">
            <h3 className="text-xs font-black text-[var(--accent)] flex items-center gap-1.5">
              Urlaubskonto-Konfiguration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label htmlFor="reg-vacation-input" className="text-xs font-bold text-[var(--text-muted)] block">
                  Regulärer Urlaubsanspruch (Tage):
                </label>
                <input
                  id="reg-vacation-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={localCarryover.regularVacationEntitlement || ""}
                  onChange={(e) => handleFieldChange("regularVacationEntitlement", parseFloat(e.target.value))}
                  className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-[var(--rv-radius-sm)] outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="add-vacation-input" className="text-xs font-bold text-[var(--text-muted)] block">
                  Zusatzurlaub (Tage):
                </label>
                <input
                  id="add-vacation-input"
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={localCarryover.additionalVacationEntitlement || ""}
                  onChange={(e) => handleFieldChange("additionalVacationEntitlement", parseFloat(e.target.value))}
                  className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-[var(--rv-radius-sm)] outline-none focus:border-[var(--border-focus)]"
                />
                <span className="text-[0.75rem] text-[var(--text-muted)] block font-normal leading-none">
                  (z.B. 5 Tage für Schwerbehinderte)
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-1.5 border-t border-[var(--card-border)]">
              <label htmlFor="vacation-carryover-input" className="text-xs font-bold text-[var(--text-muted)] block">
                Resturlaub / Start-Übertrag (Tage):
              </label>
              <input
                id="vacation-carryover-input"
                type="number"
                min="-50"
                max="100"
                step="0.5"
                value={localCarryover.vacationCarryover || ""}
                onChange={(e) => handleFieldChange("vacationCarryover", parseFloat(e.target.value))}
                className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-[var(--rv-radius-sm)] outline-none focus:border-[var(--border-focus)]"
              />
              <p className="text-[0.75rem] text-[var(--text-muted)] leading-relaxed">
                Tragen Sie hier den Resturlaub aus dem Vorjahr oder die bereits genommene Urlaubs-Kompensation ein (z.B. positive/negative Tage beim Start-Vortrag).
              </p>
            </div>
          </div>

          {/* Section 2: Arbeitszeit & Überstunden */}
          <div className="space-y-3 p-4 rounded-[var(--rv-radius-md)] border border-[var(--card-border)] bg-[var(--bg-color)]">
            <h3 className="text-xs font-black text-[var(--accent)] flex items-center gap-1.5">
              ⏱️ Überstunden & Sollarbeitszeit
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label htmlFor="overtime-carryover-input" className="text-xs font-bold text-[var(--text-muted)] block">
                  Überstunden-Startwert (Stunden):
                </label>
                <input
                  id="overtime-carryover-input"
                  type="number"
                  min="-200"
                  max="1000"
                  step="0.25"
                  value={localCarryover.overtimeCarryover || ""}
                  onChange={(e) => handleFieldChange("overtimeCarryover", parseFloat(e.target.value))}
                  className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-[var(--rv-radius-sm)] outline-none focus:border-[var(--border-focus)]"
                />
                <span className="text-[0.75rem] text-[var(--text-muted)] block font-normal leading-none">
                  (Negativwert für Minusstunden)
                </span>
              </div>

              <div className="space-y-1">
                <label htmlFor="target-hours-input" className="text-xs font-bold text-[var(--text-muted)] block">
                  Sollzeit pro Arbeitstag (Stunden):
                </label>
                <input
                  id="target-hours-input"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={localCarryover.dailyTargetHours || ""}
                  onChange={(e) => handleFieldChange("dailyTargetHours", parseFloat(e.target.value))}
                  className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-[var(--rv-radius-sm)] outline-none focus:border-[var(--border-focus)]"
                />
                <span className="text-[0.75rem] text-[var(--text-muted)] block font-normal leading-none">
                  (z.B. 8 Stunden bei Vollzeit)
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {/* flex-wrap + min-w-0: Zwei `flex-1`-Tasten geben ihre Breite nicht
              unter den Inhalt preis (`min-width: auto`). Bei "Extra gross"
              schob "Speichern" die Seite dadurch auf 442 px in einem
              360-px-Fenster. Jetzt brechen die Tasten untereinander um, statt
              die Seite zu verbreitern -- WCAG 1.4.10 Reflow. */}
          <div className="pt-4 border-t border-[var(--card-border)] flex flex-wrap gap-3 [&>button]:min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 font-bold border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--bg-color)] rounded-[var(--rv-radius-md)] cursor-pointer text-sm transition-all focus-visible:ring-4"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 font-black bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 rounded-[var(--rv-radius-md)] cursor-pointer text-sm transition-all focus-visible:ring-4 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Speichern</span>
            </button>
          </div>
        </form>
    </div>
  );
}
