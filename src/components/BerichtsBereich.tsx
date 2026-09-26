import type { ReactNode } from "react";
import CounterField from "./CounterField";
import type { FieldConfig } from "../types";

/** Feste, vollstaendige Klassenstrings je Kategorie -- Tailwind scannt den
    Quelltext auf woertliche Klassennamen, eine zur Laufzeit zusammengesetzte
    Zeichenkette (`bg-[var(--cat-${n}-soft)]`) waere fuer den Scanner nicht
    auffindbar und erzeugte kein CSS. */
/*
  Gefülltes Symbolfeld je Bereich (0.9.66, vorher weiche Fläche mit Rand):
  Der Bereich soll auf einen Blick seine Farbe zeigen. Das Symbol steht in
  der Kartenfarbe darauf -- weiß im hellen, dunkel im dunklen Schema,
  schwarz auf Weiß/Gelb im Hochkontrast; als Nicht-Text je über 3:1.
*/
const KATEGORIE_BADGE: Record<number, string> = {
  1: "bg-[var(--cat-1)] text-[var(--card-bg)] border-[var(--cat-1)]",
  2: "bg-[var(--cat-2)] text-[var(--card-bg)] border-[var(--cat-2)]",
  3: "bg-[var(--cat-3)] text-[var(--card-bg)] border-[var(--cat-3)]",
  4: "bg-[var(--cat-4)] text-[var(--card-bg)] border-[var(--cat-4)]",
};

interface BerichtsBereichProps {
  /** 1–4. Bestimmt die id der Überschrift und damit das `aria-labelledby`. */
  nummer: number;
  titel: string;
  /** Kategorie-Icon fuer das Badge vor der Ueberschrift (rein dekorativ,
      aria-hidden -- die Unterscheidung traegt der Ueberschriftstext). In den
      beiden Hochkontrast-Themes faellt die Badge-Farbe fuer alle vier
      Bereiche auf dasselbe Paar zusammen; das Icon-Symbol bleibt dort der
      einzige zusaetzliche Unterschied. */
  icon: ReactNode;
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
  icon,
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
      className="p-4 sm:p-5 mb-5 rounded-[var(--rv-radius-xl)] border bg-[var(--card-bg)] border-[var(--card-border)] shadow-[var(--rv-shadow-sm)]"
      aria-labelledby={ueberschriftId}
    >
      {/* flex-wrap: min-w-0 am Titel-Span (unten) reichte allein nicht --
          bei 320 px/"Extra groß"/breiter Schrift blieb ein Rest-Überlauf, der
          document.documentElement.scrollWidth auf 352 px trieb (window.innerWidth
          wuchs mit auf 352, waehrend clientWidth bei den echten 320 blieb) und
          darüber die feste untere Navigationsleiste (width:96%) faelschlich
          gegen 352 statt 320 skalierte -- der eigentliche Fehler lag hier,
          nicht in der Navigationsleiste. Mit flex-wrap kann die ganze Zeile
          (Badge + Titel) statt nur der Titeltext umbrechen; gemessen: 0
          überstehende Elemente, scrollWidth = clientWidth = 320. */}
      <h2
        id={ueberschriftId}
        className="flex flex-wrap items-center gap-3 pb-3.5 mb-4 border-b border-[var(--card-border)]"
      >
        <span
          className={`w-10 h-10 rounded-[var(--rv-radius-md)] border flex items-center justify-center flex-shrink-0 ${KATEGORIE_BADGE[nummer] ?? ""}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        {/* min-w-0: ohne das gibt das Flex-Kind seine Breite nicht unter den
            Inhalt preis (`min-width: auto`) -- bei 320 px schob "3.
            Spezialprodukte (Fokus)" die Seite auf 352 px, achter Fall dieser
            Klasse in diesem Projekt. */}
        <span className="text-lg font-black text-[var(--text-color)] min-w-0">{titel}</span>
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
