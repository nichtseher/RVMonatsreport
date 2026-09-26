import { Fragment, useState } from "react";
import { Zap, Settings2, Sparkles, Plus } from "lucide-react";
import { FieldConfig, SectionsConfig, HistoryRecord } from "../types";
import { getIconForString } from "../utils/iconMap";
import { playAudioFeedback } from "../utils/audioFeedback";

export interface QuickEntryConfig {
  mode: "auto" | "custom";
  ids: string[];
}

export const DEFAULT_QUICK_CONFIG: QuickEntryConfig = { mode: "auto", ids: [] };

const MAX_QUICK_FIELDS = 8;

/*
  Kachelfarbe je Bereich (0.9.66). Die Reihenfolge der Kacheln bleibt die
  gewählte bzw. die meistgenutzte -- deshalb keine Gruppen, sondern eine
  Tönung je Kachel. Die Farbe ist dabei Zusatz, nicht Träger: Welches Feld
  eine Kachel zählt, sagt ihre Beschriftung (WCAG 1.4.1).
*/
const KACHEL_FARBE: Record<number, { flaeche: string; zahl: string; symbol: string; plus: string }> = {
  1: { flaeche: "bg-[var(--cat-1-tile)]", zahl: "text-[var(--cat-1-text)]", symbol: "text-[var(--cat-1)]", plus: "bg-[var(--cat-1)]" },
  2: { flaeche: "bg-[var(--cat-2-tile)]", zahl: "text-[var(--cat-2-text)]", symbol: "text-[var(--cat-2)]", plus: "bg-[var(--cat-2)]" },
  3: { flaeche: "bg-[var(--cat-3-tile)]", zahl: "text-[var(--cat-3-text)]", symbol: "text-[var(--cat-3)]", plus: "bg-[var(--cat-3)]" },
  4: { flaeche: "bg-[var(--cat-4-tile)]", zahl: "text-[var(--cat-4-text)]", symbol: "text-[var(--cat-4)]", plus: "bg-[var(--cat-4)]" },
};

/*
  Umbruch nach dem Schrägstrich (0.9.66). Chromium und WebKit brechen
  „Schulungen/Support" nicht am Schrägstrich um; mit `break-words` wurde
  daraus bei 360 px „Schulungen/Supp-ort". Ein <wbr> nach jedem Schrägstrich
  erlaubt den Umbruch genau dort, ohne den Text zu verändern -- vorgelesen
  und kopiert wird er wie vorher.
*/
function mitUmbruchNachSchraegstrich(text: string) {
  const teile = text.split("/");
  return teile.map((teil, i) => (
    <Fragment key={i}>
      {teil}
      {i < teile.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </Fragment>
  ));
}
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
  /** "YYYY-MM" -- ein Monatswechsel berechnet die automatische Reihenfolge neu. */
  monat: string;
}

/*
  Die automatische Reihenfolge wird EINMAL berechnet und dann festgehalten
  (0.9.66). Bis dahin lief die Berechnung bei jedem Rendern und zählte den
  Tipp mit, den man gerade gemacht hatte: Die getippte Kachel rückte nach
  vorn, und der nächste Tipp auf dieselbe Stelle traf ein anderes Feld --
  gemessen am 2026-09-26, zweimal auf die zweite Kachel, zwei verschiedene
  Felder gezählt. Im Auto ist das die gefährlichste Stelle der App.

  Eine Modulvariable statt eines Zustands der Komponente, und das ist der
  Kern: Die Tafel wird beim Wechsel in eine andere Ansicht ausgehängt. Ein
  useState oder useRef wäre danach weg, und die Kacheln sprängen beim
  Zurückkommen aus „Zeit" doch. Auch ein useMemo ohne die Werte des Monats
  reicht nicht -- der Archiv-Spiegel schreibt `history` rund eine Sekunde
  nach jedem Tipp neu, die Kacheln sprängen dann eben verzögert.

  Neu berechnet wird beim Start der App, beim Monatswechsel und wenn sich
  die Felder ändern. Die eigene Auswahl („custom") ist davon unberührt; ihre
  Reihenfolge legt der Nutzer fest.
*/
let eingefroreneReihenfolge: { schluessel: string; ids: string[] } | null = null;

/**
 * Schnell-Erfassung: Die meistgenutzten Kategorien als große Tasten –
 * ein Tipp direkt nach dem Termin genügt (+1 mit Ton und Vibration).
 *
 * Auswahl der Tasten:
 * - "auto": aus dem Archiv + aktuellem Monat berechnet, was der/die
 *   Mitarbeitende tatsächlich am meisten nutzt -- einmal je Sitzung und
 *   Monat, nicht nach jedem Tipp (siehe oben).
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
  monat,
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

  const bereichVon = (id: string): number =>
    appFields.s1.some((f) => f.id === id)
      ? 1
      : appFields.s2.some((f) => f.id === id)
        ? 2
        : appFields.s3.some((f) => f.id === id)
          ? 3
          : 4;

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

  const reihenfolgeSchluessel = `${monat}|${allFields.map((f) => f.id).join(",")}`;
  let autoIds: string[];
  if (eingefroreneReihenfolge && eingefroreneReihenfolge.schluessel === reihenfolgeSchluessel) {
    autoIds = eingefroreneReihenfolge.ids;
  } else {
    autoIds = computeAutoFields().map((f) => f.id);
    eingefroreneReihenfolge = { schluessel: reihenfolgeSchluessel, ids: autoIds };
  }

  const quickFields: FieldConfig[] =
    config.mode === "custom" && config.ids.length > 0
      ? (config.ids.map(fieldById).filter(Boolean) as FieldConfig[])
      : (autoIds.map(fieldById).filter(Boolean) as FieldConfig[]);

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

  const renderIcon = (field: FieldConfig, farbe: string) => {
    const Icon = getIconForString(field.icon);
    if (Icon) return <Icon className={`w-6 h-6 flex-shrink-0 ${farbe}`} aria-hidden="true" />;
    if (field.icon) return <span className="text-2xl flex-shrink-0" aria-hidden="true">{field.icon}</span>;
    return <Zap className={`w-6 h-6 flex-shrink-0 ${farbe}`} aria-hidden="true" />;
  };

  return (
    <section
      className="p-4 sm:p-5 mb-4 rounded-[var(--rv-radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--rv-shadow-sm)]"
      aria-labelledby="quick-entry-heading"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2
          id="quick-entry-heading"
          className="text-base font-black text-[var(--text-color)] flex items-center gap-2 flex-wrap min-w-0"
        >
          <Zap className="w-5 h-5 text-[var(--accent)] flex-shrink-0" aria-hidden="true" />
          Schnell-Erfassung
          <span className="text-[0.75rem] font-black px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success-text)]">
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
          className="px-2.5 py-2 min-h-[44px] rounded-[var(--rv-radius-sm)] text-xs font-bold border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 flex-shrink-0"
        >
          <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
          Anpassen
        </button>
      </div>

      <p className="text-sm text-[var(--text-muted)] mb-3 leading-relaxed">
        Ein Tipp = direkt nach dem Termin verbucht. Kein Suchen, kein Scrollen.
      </p>

      {/*
        Rasterbreite in rem statt fester zwei Spalten (0.9.66): Die Kacheln
        tragen jetzt 14 px statt 12 px Schrift und eine große Zahl. Bei „Groß"
        und „Extra groß" passen zwei Spalten nicht mehr in ein Handy -- dann
        stehen die Kacheln untereinander, statt ihre Beschriftung abzuschneiden.
        Derselbe Weg wie die Kacheln der Analyse. 9rem statt 7.5rem seit 0.9.69: Mit
        7.5rem entstanden ab 600 px Fensterbreite so viele Spalten, dass
        „Vorführungen" und „Auslieferungen" mitten im Wort brachen.
      */}
      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2.5"
        role="group"
        aria-label="Schnell-Erfassungs-Tasten"
      >
        {quickFields.map((field) => {
          const val = typeof values[field.id] === "number" ? (values[field.id] as number) : 0;
          const farbe = KACHEL_FARBE[bereichVon(field.id)];
          return (
            <button
              key={field.id}
              type="button"
              onClick={() => handleTap(field)}
              aria-label={`${field.label}. Aktueller Stand ${val}. Tippen erhöht um ${field.step}.`}
              className={`min-h-[112px] px-2.5 py-3 rounded-[var(--rv-radius-xl)] border border-[var(--card-border)] ${farbe.flaeche} hover:border-[var(--border-focus)] transition-all cursor-pointer flex flex-col items-start justify-between gap-2 text-left active:scale-95 focus-visible:ring-4 touch-manipulation`}
            >
              <div className="flex items-start justify-between w-full gap-1">
                <span className="w-10 h-10 rounded-[var(--rv-radius-md)] bg-[var(--card-bg)] shadow-[var(--rv-shadow-sm)] flex items-center justify-center flex-shrink-0">
                  {renderIcon(field, farbe.symbol)}
                </span>
                {/* Zeigt, was ein Tipp tut. Die Kachel selbst ist die Taste. */}
                <span
                  className={`w-8 h-8 rounded-full ${farbe.plus} text-[var(--card-bg)] flex items-center justify-center flex-shrink-0`}
                  aria-hidden="true"
                >
                  <Plus className="w-5 h-5" strokeWidth={2.6} />
                </span>
              </div>
              <span className="w-full" aria-hidden="true">
                <span className={`block text-3xl font-black leading-none tabular-nums ${farbe.zahl}`}>
                  {val}
                </span>
                {/* hyphens-auto: Lange deutsche Wörter passen bei 14 px und breiter
                    Schrift knapp nicht in eine halbe Handybreite -- gemessen bei
                    360 px: „Auslieferungen" braucht in DejaVu Sans 120 px, die
                    Kachel bot mit 12 px Innenabstand genau 120 (jetzt 124, daher
                    px-2.5). In Arial-artiger Schrift sind es 102 px.
                    Mit Silbentrennung wird daraus „Auslie-ferungen" statt
                    „Auslieferunge-n"; break-words bleibt nur der letzte Ausweg
                    für Browser ohne deutsches Trennwörterbuch. */}
                <span className="block mt-1.5 hyphens-auto break-words text-sm font-bold text-[var(--text-color)] leading-tight line-clamp-3">
                  {mitUmbruchNachSchraegstrich(field.label.replace(/^Anzahl\s+/i, ""))}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {isEditorOpen && (
        <div
          className="mt-4 pt-4 border-t border-[var(--card-border)] space-y-3 animate-fade-in"
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
              className={`px-4 min-h-[44px] rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:ring-4 ${
                config.mode === "auto" || config.ids.length === 0
                  ? "bg-[var(--accent)] text-[var(--accent-text)]"
                  : "bg-[var(--bg-color)] text-[var(--text-color)] border border-[var(--border-color)]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Automatisch (meistgenutzt)
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              oder bis zu {MAX_QUICK_FIELDS} Kategorien selbst wählen:
            </span>
          </div>

          {/* overflow-x-hidden ist Absicht: `overflow-y: auto` zieht die
              x-Achse mit, und bei „Extra groß" entstand daraus ein
              verstecktes Seitwärtsscrollen (gemessen 2026-09-07). Die
              Beschriftungen brechen um, statt zu schieben. */}
          <ul className="space-y-1.5 list-none p-0 m-0 max-h-64 overflow-y-auto overflow-x-hidden pr-1">
            {allFields.map((field) => {
              const pos = config.ids.indexOf(field.id);
              const checked = pos !== -1;
              const disabled = !checked && config.ids.length >= MAX_QUICK_FIELDS;
              return (
                <li key={field.id}>
                  {/* min-h-[44px] am LABEL, nicht am Kästchen: Ein Klick
                      irgendwo in der Zeile schaltet die Auswahl, also ist die
                      Zeile die Trefferfläche (WCAG 2.5.5). Gemessen wurde sie
                      mit 34 px Höhe. */}
                  <label
                    className={`flex items-center gap-2.5 p-2 min-h-[44px] rounded-[var(--rv-radius-sm)] border cursor-pointer transition-all ${
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
                    <span className="text-xs font-bold text-[var(--text-color)] flex-1 min-w-0 [overflow-wrap:anywhere] leading-tight">
                      {field.label}
                    </span>
                    {/* aria-label auf einem <span> ohne Rolle ist unzulässig
                        (axe: aria-prohibited-attr) -- dieselbe Stelle, die im
                        Geräte-Sync schon einmal aufgefallen ist. Der sichtbare
                        Kurztext bleibt, die Vorlesefassung steht daneben. */}
                    {checked && (
                      <span className="text-[0.75rem] font-black text-[var(--accent)] flex-shrink-0">
                        <span aria-hidden="true">#{pos + 1}</span>
                        <span className="sr-only">Position {pos + 1}</span>
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
