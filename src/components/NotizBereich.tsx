import type { RefObject } from "react";
import { Calendar, Mic, MicOff } from "lucide-react";

interface NotizBereichProps {
  notizen: string;
  onNotizenChange: (wert: string) => void;
  /** Zeigt das Mikrofon als aktiv und ändert die Beschriftung. */
  isDictating: boolean;
  onDiktat: () => void;
  onDatumstempel: () => void;
  onVorlage: (text: string) => void;
  notesInputRef: RefObject<HTMLTextAreaElement | null>;
}

/**
 * „Anmerkungen & Kommentare" -- das Freitextfeld des Monatsberichts samt
 * Diktat, Datumstempel und den vier Textvorlagen.
 *
 * Bis 0.9.42 stand dieser Block mitten in `App.tsx`. Er ist der einzige Teil
 * der Formularansicht, der ohne Umwege herauslösbar war: Er braucht sieben
 * Eigenschaften und keinen weiteren Zustand.
 */
export default function NotizBereich({
  notizen,
  onNotizenChange,
  isDictating,
  onDiktat,
  onDatumstempel,
  onVorlage,
  notesInputRef,
}: NotizBereichProps) {
  return (
    <>
  {/* SECTION 5: NOTES & ANMERKUNGEN */}
  <section
    className={`p-4 sm:p-5 mb-5 rounded-[var(--rv-radius-lg)] border bg-[var(--card-bg)] border-[var(--card-border)]`}
    aria-labelledby="notes-heading"
  >
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b-2 border-[var(--card-border)]">
      <h2
        id="notes-heading"
        className="text-lg md:text-xl font-black text-[var(--text-color)]"
      >
        Anmerkungen & Kommentare
      </h2>
      {/* flex-wrap: Bei grosser Schrift passten "Diktieren" und
          "Datumstempel" nicht mehr nebeneinander und schoben die Seite
          waagerecht aus dem Bildschirm (gemessen: 430 px Inhalt auf einem
          360-px-Handy). */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Dictate Speech Input button */}
        <button
          type="button"
          onClick={onDiktat}
          aria-label={
            isDictating
              ? "Sprachaufnahme stoppen"
              : "Notiz per Sprache diktieren"
          }
          className={`py-2 px-3.5 rounded-[var(--rv-radius-md)] border-2 transition-all cursor-pointer font-black text-sm flex items-center gap-1.5 focus-visible:ring-4 ${
            isDictating
              ? "bg-[var(--danger-solid)] border-[var(--danger-border)] text-[var(--danger-solid-text)] animate-pulse"
              : "bg-[var(--bg-color)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
          }`}
        >
          {isDictating ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          <span>{isDictating ? "Stopp" : "Diktieren"}</span>
        </button>

        {/* Timestamp */}
        <button
          type="button"
          onClick={onDatumstempel}
          aria-label="Datumstempel in Kommentare einfügen"
          className="py-2 px-3.5 rounded-[var(--rv-radius-md)] border-2 border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:border-[var(--border-focus)] transition-all cursor-pointer font-black text-sm focus-visible:ring-4"
        >
          <Calendar className="w-4 h-4" aria-hidden="true" />
          <span>Datumstempel</span>
        </button>
      </div>
    </div>

    <label
      htmlFor="meta-notes-textarea"
      className="text-xs font-bold text-[var(--text-muted)] block mb-2 leading-relaxed"
    >
      Tragen Sie hier wichtige Notizen ein:{" "}
      {/* emerald-700 statt -600: erreicht auf weissem Grund 4,5:1 */}
      <span className="text-[var(--success-text)] font-black">
        Wird nur auf Ihrem Gerät gespeichert
      </span>
    </label>

    {/* Quick templates for notes (excellent usability for sales reps on mobile) */}
    <div
      className="flex flex-wrap gap-1.5 mb-3"
      aria-label="Schnell-Vorlagen für Notizen"
    >
      {[
        {
          label: "Alles planmäßig",
          text: "Alles planmäßig verlaufen. Keine besonderen Vorkommnisse.",
        },
        {
          label: "Messewoche",
          text: "Fokus auf Repräsentanz, Messestand-Betreuung und Neukunden-Akquise vor Ort.",
        },
        {
          label: "Erfolgreiche Schulungen",
          text: "Kundenschulungen wurden sehr erfolgreich absolviert mit durchweg positivem Feedback.",
        },
        {
          label: "Urlaubszeit",
          text: "Erhöhte Abwesenheiten im Berichtszeitraum wegen Urlaubs-/Ferienzeit.",
        },
      ].map((tpl, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onVorlage(tpl.text)}
          className="inline-flex items-center px-2.5 min-h-[44px] rounded-[var(--rv-radius-sm)] border border-[var(--border-color)] bg-[var(--bg-color)] hover:border-[var(--border-focus)] hover:bg-[var(--bg-color)] text-[0.75rem] font-black text-[var(--text-color)] transition-all cursor-pointer active:scale-95 focus-visible:ring-2"
          /* Aus title wurde aria-label, und das ist mehr als ein Tausch:
             Der Tooltip zeigte den vollen Text nur sehenden Maus-Nutzern
             -- auf dem Handy erscheint er nie, und der Screenreader las
             bloss die Kurzform ("Messewoche"), ohne zu verraten, was
             eingefuegt wird. Jetzt hoert man es.

             Die sichtbare Beschriftung steht bewusst VORNE: WCAG 2.5.3
             verlangt, dass der zugaengliche Name die sichtbare Aufschrift
             enthaelt. Bei "Messewoche" kommt das Wort im eingefuegten Text
             gar nicht vor -- ohne das Voranstellen waere die
             Sprachsteuerung unbedienbar geworden. */
          aria-label={`${tpl.label}. Text einfügen: "${tpl.text}"`}
        >
          {tpl.label}
        </button>
      ))}
    </div>

              <textarea
      ref={notesInputRef}
      id="meta-notes-textarea"
      value={notizen}
      onChange={(e) => onNotizenChange(e.target.value)}
      placeholder="Tragen Sie hier z.B. besondere Vorkommnisse oder Messeergebnisse ein..."
      className="w-full h-36 p-4 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-[var(--rv-radius-md)] font-normal focus:border-[var(--border-focus)] outline-none resize-y leading-relaxed"
    />
  </section>

    </>
  );
}
