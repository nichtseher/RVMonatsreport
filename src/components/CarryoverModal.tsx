import React, { useEffect, useRef, useState } from "react";
import { X, Calendar, Clock, Sparkles, Save, Info } from "lucide-react";
import { YearlyCarryover } from "../types";

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

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const previouslyActive = document.activeElement as HTMLElement;

    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex="0"]'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyActive) {
        previouslyActive.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
      className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-3xl w-full border border-[var(--border-color)] p-6 md:p-8 relative shadow-lg animate-fade-in"
    >
      {/* Close Button */}
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Zurück"
        className="absolute top-5 right-5 w-12 h-12 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer z-10 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-8 h-8 text-[var(--accent)]" aria-hidden="true" />
        <h2 id="carryover-modal-title" className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Jahreskonto & Einstellungen
        </h2>
      </div>

        {/* Info text */}
        <div className="p-3.5 mb-5 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-2.5 items-start text-xs font-semibold leading-relaxed">
          <Info className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" aria-hidden="true" />
          <p className="flex-1">
            Hier können Sie Ihre Startwerte für Urlaub und Überstunden eintragen.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Section 1: Urlaubskonto */}
          <div className="space-y-3 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)]">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
              🌴 Urlaubskonto-Konfiguration
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
                  className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-lg outline-none focus:border-[var(--border-focus)]"
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
                  className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-lg outline-none focus:border-[var(--border-focus)]"
                />
                <span className="text-[9px] text-[var(--text-muted)] block font-medium leading-none">
                  (z.B. 5 Tage für Schwerbehinderte)
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-1.5 border-t border-[var(--border-color)]">
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
                className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-lg outline-none focus:border-[var(--border-focus)]"
              />
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                Tragen Sie hier den Resturlaub aus dem Vorjahr oder die bereits genommene Urlaubs-Kompensation ein (z.B. positive/negative Tage beim Start-Vortrag).
              </p>
            </div>
          </div>

          {/* Section 2: Arbeitszeit & Überstunden */}
          <div className="space-y-3 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)]">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
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
                  className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-lg outline-none focus:border-[var(--border-focus)]"
                />
                <span className="text-[9px] text-[var(--text-muted)] block font-medium leading-none">
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
                  className="w-full p-2.5 border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold rounded-lg outline-none focus:border-[var(--border-focus)]"
                />
                <span className="text-[9px] text-[var(--text-muted)] block font-medium leading-none">
                  (z.B. 8 Stunden bei Vollzeit)
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-[var(--border-color)] flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 font-bold border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--bg-color)] rounded-xl cursor-pointer text-sm transition-all focus-visible:ring-4"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 font-black bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 rounded-xl cursor-pointer text-sm transition-all focus-visible:ring-4 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Speichern</span>
            </button>
          </div>
        </form>
    </div>
  );
}
