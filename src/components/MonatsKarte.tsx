import { CircleCheck, CircleDashed } from "lucide-react";
import { FieldConfig } from "../types";
import { formatMonthGerman } from "../utils/dateUtils";
import { findeLetzteAenderung, formatiereZuletzt, ohneZuletzt } from "../utils/zuletztGeaendert";

interface MonatsKarteProps {
  /** "YYYY-MM" */
  monat: string;
  /** Summe der Bereiche 1–3 -- derselbe Rechenweg wie „Aktivitäten" in der Analyse. */
  aktivitaeten: number;
  /** Alle aktuell konfigurierten Felder, für Namen und Zuordnung. */
  felder: FieldConfig[];
  /** `valuesUpdatedAt` des laufenden Monats */
  zeitstempel?: Record<string, string>;
}

/**
 * Monatskarte (0.9.66): der Überblick über dem Formular.
 *
 * Sie beantwortet die zwei Fragen, mit denen man die App nach einem Termin
 * öffnet: Wo stehe ich in diesem Monat -- und ist das, was ich eben
 * eingetragen habe, drin? Die zweite Antwort gab es bisher nur einzeln am
 * Zähler („zuletzt: heute, 11:40"); wer nicht mehr wusste, WELCHEN Zähler er
 * angetippt hatte, musste suchen.
 *
 * Kein `aria-live`: Jede Änderung wird bereits über announceToAriaAndSpeech
 * angesagt. Eine zweite Ansage an dieser Stelle wäre eine Dopplung.
 */
export default function MonatsKarte({ monat, aktivitaeten, felder, zeitstempel }: MonatsKarteProps) {
  const letzte = findeLetzteAenderung(
    zeitstempel,
    felder.map((f) => f.id),
  );
  const zeit = letzte ? formatiereZuletzt(letzte.iso) : null;
  const zeitOhne = zeit ? ohneZuletzt(zeit) : null;
  const feld = letzte?.feldId ? felder.find((f) => f.id === letzte.feldId) : undefined;
  // Wie auf den Schnell-Kacheln: „Anzahl" steht vor fast jedem Feld und
  // unterscheidet nichts.
  const feldName = feld ? feld.label.replace(/^Anzahl\s+/i, "") : null;

  return (
    <section
      aria-labelledby="monatskarte-titel"
      className="mb-4 p-4 sm:p-5 rounded-[var(--rv-radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--rv-shadow-sm)]"
    >
      {/* flex-wrap statt fester Zeile: Monat und Summe stehen nebeneinander,
          solange sie passen, und untereinander bei „Extra groß" -- ohne dass
          ein Geschwister flex-1 trägt, das den Umbruch verhindern würde. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="monatskarte-titel"
          className="text-xl font-black text-[var(--text-color)] min-w-0 [overflow-wrap:anywhere]"
        >
          {formatMonthGerman(monat)}
        </h2>
        <p className="text-base text-[var(--text-muted)]">
          <span className="text-2xl font-black text-[var(--text-color)] tabular-nums">
            {aktivitaeten}
          </span>{" "}
          {aktivitaeten === 1 ? "Aktivität" : "Aktivitäten"}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex items-center gap-3">
        {/* Ein Haken bei leerem Monat hiesse „erledigt" -- das Gegenteil. */}
        {zeit ? (
          <CircleCheck className="w-6 h-6 flex-shrink-0 text-[var(--accent)]" aria-hidden="true" />
        ) : (
          <CircleDashed className="w-6 h-6 flex-shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
        )}
        {zeitOhne ? (
          <p className="min-w-0">
            {/* Sichtbar „heute, 11:40", gesprochen „heute um 11 Uhr 40" --
                dieselbe Aufteilung wie am Zähler, aus demselben Grund. */}
            <span className="block text-sm text-[var(--text-muted)]" aria-hidden="true">
              Zuletzt geändert · {zeitOhne.sichtbar}
            </span>
            <span className="sr-only">
              {`Zuletzt geändert ${zeitOhne.gesprochen}${feldName ? `: ${feldName}` : ""}.`}
            </span>
            {feldName && (
              <span
                className="block text-base font-bold text-[var(--text-color)] [overflow-wrap:anywhere]"
                aria-hidden="true"
              >
                {feldName}
              </span>
            )}
          </p>
        ) : (
          <p className="min-w-0 text-sm text-[var(--text-muted)]">
            In diesem Monat ist noch nichts eingetragen.
          </p>
        )}
      </div>
    </section>
  );
}
