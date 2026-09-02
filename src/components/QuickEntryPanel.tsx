import React, { useState } from "react";
import { Zap, Settings2, Sparkles } from "lucide-react";
import { FieldConfig, SectionsConfig, HistoryRecord } from "../types";
import { getIconForString } from "../utils/iconMap";
import { playAudioFeedback } from "../utils/audioFeedback";

export interface QuickEntryConfig {
  mode: "auto" | "custom";
  ids: string[];
}

export const DEFAULT_QUICK_CONFIG: QuickEntryConfig = { mode: "auto", ids: [] };

const MAX_QUICK_FIELDS = 8;
const AUTO_COUNT = 6;

interface QuickEntryPanelProps {
  appFields: SectionsConfig;
  history: Record<string, HistoryRecord>;
  values: Record<string, number | "">;
  config: QuickEntryConfig;
  onConfigChange: (config: QuickEntryConfig) => void;
  onIncrement: (field: FieldConfig) => void;
  audioFeedbackEnabled: boolean;
  announce: (message: string, immediate?: boolean) => void;
}

/**
 * Schnell-Erfassung: Die meistgenutzten Kategorien als große Tasten –
 * ein Tipp direkt nach dem Termin genügt (+1 mit Ton und Vibration).
 *
 * Auswahl der Tasten:
 * - "auto": aus dem Archiv + aktuellem Monat berechnet, was der/die
 *   Mitarbeitende tatsächlich am meisten nutzt.
 * - "custom": selbst gewählte Kategorien in Wunsch-Reihenfolge.
 */
export default function QuickEntryPanel({
  appFields,
  history,
  values,
  config,
  onConfigChange,
  onIncrement,
  audioFeedbackEnabled,
  announce,
}: QuickEntryPanelProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const allFields: FieldConfig[] = [
    ...appFields.s1,
    ...appFields.s2,
    ...appFields.s3,
    ...appFields.s4,
  ];

  const fieldById = (id: string): FieldConfig | undefined =>
    allFields.find((f) => f.id === id);

  // Nutzungs-Score: Summe der eingetragenen Werte über Archiv + aktuellen Monat.
  // Arbeitszeit-Felder (s4) werden im Auto-Modus ausgelassen – die füllt die Stempeluhr.
  const computeAutoFields = (): FieldConfig[] => {
    const score = new Map<string, number>();
    const addValues = (vals?: Record<string, number | "">) => {
      Object.entries(vals || {}).forEach(([id, v]) => {
        if (typeof v === "number" && v > 0) {
          score.set(id, (score.get(id) || 0) + v);
        }
      });
    };
    Object.values(history || {}).forEach((rec) => addValues(rec.values));
    addValues(values);

    const candidates = [...appFields.s1, ...appFields.s2, ...appFields.s3];
    const used = candidates
      .filter((f) => (score.get(f.id) || 0) > 0)
      .sort((a, b) => (score.get(b.id) || 0) - (score.get(a.id) || 0));
    const unused = candidates.filter((f) => !(score.get(f.id) || 0));
    return [...used, ...unused].slice(0, AUTO_COUNT);
  };

  const quickFields: FieldConfig[] =
    config.mode === "custom" && config.ids.length > 0
      ? (config.ids.map(fieldById).filter(Boolean) as FieldConfig[])
      : computeAutoFields();

  const toggleCustomId = (id: string) => {
    const selected = config.ids.includes(id);
    let ids: string[];
    if (selected) {
      ids = config.ids.filter((x) => x !== id);
    } else {
      if (config.ids.length >= MAX_QUICK_FIELDS) return;
      ids = [...config.ids, id];
    }
    onConfigChange({ mode: "custom", ids });
    const field = fieldById(id);
    if (field) {
      announce(
        selected
          ? `${field.label} aus der Schnell-Erfassung entfernt.`
          : `${field.label} zur Schnell-Erfassung hinzugefügt, Position ${ids.length}.`,
      );
    }
  };

  const handleTap = (field: FieldConfig) => {
    const current = typeof values[field.id] === "number" ? (values[field.id] as number) : 0;
    playAudioFeedback(audioFeedbackEnabled, "up", current + field.step);
    onIncrement(field);
  };

  const renderIcon = (field: FieldConfig) => {
    const Icon = getIconForString(field.icon);
    if (Icon) return <Icon className="w-6 h-6 flex-shrink-0 text-[var(--accent)]" aria-hidden="true" />;
    if (field.icon) return <span className="text-2xl flex-shrink-0" aria-hidden="true">{field.icon}</span>;
    return <Zap className="w-6 h-6 flex-shrink-0 text-[var(--accent)]" aria-hidden="true" />;
  };

  return (
    <section
      className="p-4 mb-4 rounded-2xl border-2 border-[var(--accent)]/30 bg-[var(--card-bg)] shadow-sm"
      aria-labelledby="quick-entry-heading"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2
          id="quick-entry-heading"
          className="text-base font-black text-[var(--text-color)] flex items-center gap-2 flex-wrap min-w-0"
        >
          <Zap className="w-5 h-5 text-[var(--accent)] flex-shrink-0" aria-hidden="true" />
          Schnell-Erfassung
          <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success-text)]">
            {config.mode === "custom" && config.ids.length > 0 ? "Eigene Auswahl" : "Automatisch"}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => {
            setIsEditorOpen((prev) => !prev);
            announce(
              isEditorOpen
                ? "Anpassung der Schnell-Erfassung geschlossen."
                : "Anpassung der Schnell-Erfassung geöffnet.",
            );
          }}
          aria-expanded={isEditorOpen}
          aria-label="Schnell-Erfassung anpassen"
          className="px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 flex-shrink-0"
        >
          <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
          Anpassen
        </button>
      </div>

      <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
        Ein Tipp = direkt nach dem Termin verbucht. Kein Suchen, kein Scrollen.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" role="group" aria-label="Schnell-Erfassungs-Tasten">
        {quickFields.map((field) => {
          const val = typeof values[field.id] === "number" ? (values[field.id] as number) : 0;
          return (
            <button
              key={field.id}
              type="button"
              onClick={() => handleTap(field)}
              aria-label={`${field.label}. Aktueller Stand ${val}. Tippen erhöht um ${field.step}.`}
              className="min-h-[76px] p-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all cursor-pointer flex flex-col items-start justify-between gap-1.5 text-left active:scale-95 focus-visible:ring-4 touch-manipulation"
            >
              <div className="flex items-center justify-between w-full gap-1">
                {renderIcon(field)}
                <span
                  className="min-w-[28px] h-7 px-1.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-sm font-black flex items-center justify-center"
                  aria-hidden="true"
                >
                  {val}
                </span>
              </div>
              <span className="w-full break-words text-[0.75rem] font-bold text-[var(--text-color)] leading-tight line-clamp-2">
                {field.label.replace(/^Anzahl\s+/i, "")}
              </span>
            </button>
          );
        })}
      </div>

      {isEditorOpen && (
        <div
          className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-3 animate-fade-in"
          role="group"
          aria-label="Schnell-Erfassung konfigurieren"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={config.mode === "auto" || config.ids.length === 0}
              onClick={() => {
                onConfigChange({ mode: "auto", ids: [] });
                announce("Automatische Auswahl aktiviert: Es werden die meistgenutzten Kategorien angezeigt.");
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                config.mode === "auto" || config.ids.length === 0
                  ? "bg-[var(--accent)] text-[var(--accent-text)]"
                  : "bg-[var(--bg-color)] text-[var(--text-color)] border border-[var(--border-color)]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Automatisch (meistgenutzt)
            </button>
            <span className="text-xs font-bold text-[var(--text-muted)]">
              oder bis zu {MAX_QUICK_FIELDS} Kategorien selbst wählen:
            </span>
          </div>

          <ul className="space-y-1.5 list-none p-0 m-0 max-h-64 overflow-y-auto pr-1">
            {allFields.map((field) => {
              const pos = config.ids.indexOf(field.id);
              const checked = pos !== -1;
              const disabled = !checked && config.ids.length >= MAX_QUICK_FIELDS;
              return (
                <li key={field.id}>
                  <label
                    className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      checked
                        ? "border-[var(--accent)] bg-[var(--accent)]/5"
                        : "border-[var(--border-color)] bg-[var(--bg-color)]"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleCustomId(field.id)}
                      className="w-4 h-4 accent-[var(--accent)]"
                    />
                    <span className="text-xs font-bold text-[var(--text-color)] flex-1 leading-tight">
                      {field.label}
                    </span>
                    {checked && (
                      <span className="text-[0.75rem] font-black text-[var(--accent)]" aria-label={`Position ${pos + 1}`}>
                        #{pos + 1}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>

          <p className="text-[0.75rem] text-[var(--text-muted)] leading-relaxed">
            Die Reihenfolge entspricht der Reihenfolge Ihrer Auswahl. „Automatisch"
            richtet sich danach, was Sie in den letzten Monaten am meisten eingetragen haben.
          </p>
        </div>
      )}
    </section>
  );
}
