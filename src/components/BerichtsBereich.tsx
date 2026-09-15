import type { ReactNode } from "react";
import CounterField from "./CounterField";
import type { FieldConfig } from "../types";

interface BerichtsBereichProps {
  /** 1–4. Bestimmt die id der Überschrift und damit das `aria-labelledby`. */
  nummer: number;
  titel: string;
  /** Bereits nach der Suche gefiltert — diese Komponente entscheidet nichts über Sichtbarkeit. */
  felder: FieldConfig[];
  werte: Record<string, number | "">;
  /** Zeitstempel je Feld (`valuesUpdatedAt`) -- fuer "zuletzt: heute, 11:40". */
  zeitstempel?: Record<string, string>;
  isDesktop: boolean;
  isCompact: boolean;
  audioFeedbackEnabled: boolean;
  onChange: (id: string, val: number | "") => void;
  onDelta: (id: string, delta: number) => number;
  onAnnounce: (
    message: string,
    immediate?: boolean,
    fieldId?: string,
    newValue?: number | "",
  ) => void;
  onFocusField: (id: string) => void;
  onBlurField: (id: string) => void;
  /** Steht zwischen Überschrift und Raster. Nur Bereich 4 nutzt das. */
  hinweis?: ReactNode;
  /** Steht unter dem Raster. Nur Bereich 1 nutzt das: die Bereichssumme. */
  fuss?: ReactNode;
}

/**
 * Ein Bereich des Monatsberichts (s1–s4).
 *
 * Bis 0.9.41 stand dieses JSX **viermal** in `App.tsx`, rund 200 Zeilen für
 * vier Blöcke, die sich in genau drei Dingen unterschieden: Bereich 1 trug
 * zusätzlich die Bereichssumme, Bereich 4 einen Hinweiskasten über dem Raster,
 * die Bereiche 2 und 3 nichts davon. Alles andere — Rahmen, Überschrift,
 * Raster und die neun Eigenschaften je `CounterField` — war wortgleich.
 *
 * Genau das ist die Bauart, bei der eine Änderung an drei von vier Stellen
 * ankommt. Die beiden Unterschiede sind deshalb als Einschübe (`hinweis`,
 * `fuss`) erhalten geblieben und nicht wegvereinheitlicht: Sie sind echt.
 */
export default function BerichtsBereich({
  nummer,
  titel,
  felder,
  werte,
  zeitstempel,
  isDesktop,
  isCompact,
  audioFeedbackEnabled,
  onChange,
  onDelta,
  onAnnounce,
  onFocusField,
  onBlurField,
  hinweis,
  fuss,
}: BerichtsBereichProps) {
  const ueberschriftId = `section${nummer}-heading`;

  return (
    <section
      className="p-4 sm:p-5 mb-5 rounded-2xl border bg-[var(--card-bg)] border-[var(--border-color)]"
      aria-labelledby={ueberschriftId}
    >
      <h2
        id={ueberschriftId}
        className="text-lg md:text-xl font-black pb-3 mb-4 border-b-2 border-[var(--border-color)] text-[var(--text-color)]"
      >
        {titel}
      </h2>
      {hinweis}
      {/*
        `auto-fit` statt fester zwei Spalten -- gemessen am 2026-09-01 bei
        1280 px Fensterbreite:

          Schriftgröße   Bedienzeile braucht   Karte bot
          normal         336 px                418 px
          large          364 px                364 px   <- genau null Reserve
          extra-large    392 px                364 px   <- Überlauf

        Die Zähler-Tasten stehen bewusst in festen Pixeln, aber Polsterung und
        Zahlenfeld wachsen mit der Schrift -- die Karte schrumpft also genau
        dann, wenn ihr Inhalt wächst. Mit `minmax(20rem, 1fr)` entscheidet die
        verfügbare Breite selbst über die Spaltenzahl. Nachgemessen bei 1280 px:

          normal        Raster 855 px  ->  2 Spalten à 417 px
          large         Raster 753 px  ->  1 Spalte
          extra-large   Raster 651 px  ->  1 Spalte

        Dass „Groß" auf eine Spalte fällt, ist Absicht und kein
        Kollateralschaden: Zwei Spalten ergäben dort je 364 px — exakt den
        Bedarf der Zeile, also wieder null Reserve. Auf einem breiteren
        Bildschirm bleiben es dort zwei.
      */}
      <div
        className={`grid grid-cols-1 ${isDesktop ? "lg:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] lg:gap-5" : "gap-3"}`}
      >
        {felder.map((field) => (
          <CounterField
            key={field.id}
            config={field}
            value={werte[field.id] ?? ""}
            zuletztISO={zeitstempel?.[field.id]}
            onChange={(val) => onChange(field.id, val)}
            onDelta={(delta) => onDelta(field.id, delta)}
            onAnnounce={onAnnounce}
            audioFeedbackEnabled={audioFeedbackEnabled}
            isCompact={isCompact}
            onFocus={() => onFocusField(field.id)}
            onBlur={() => onBlurField(field.id)}
          />
        ))}
      </div>
      {fuss}
    </section>
  );
}
