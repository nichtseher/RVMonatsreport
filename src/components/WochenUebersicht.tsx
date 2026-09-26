import { TimeLog } from "../types";

interface WochenUebersichtProps {
  timeLogs: TimeLog[];
  /** Sollstunden je Woche (Jahreskonto: Tagessoll × 5). */
  sollWoche: number;
  /** Für Prüfungen und Vorschau; sonst „jetzt". */
  heute?: Date;
}

const TAGE = [
  { kurz: "Mo", lang: "Montag" },
  { kurz: "Di", lang: "Dienstag" },
  { kurz: "Mi", lang: "Mittwoch" },
  { kurz: "Do", lang: "Donnerstag" },
  { kurz: "Fr", lang: "Freitag" },
  { kurz: "Sa", lang: "Samstag" },
  { kurz: "So", lang: "Sonntag" },
];

const zahl = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/** Lokales Datum als "YYYY-MM-DD" -- dasselbe Format wie `TimeLog.date`. */
const alsTag = (d: Date) => d.toLocaleDateString("sv-SE");

/**
 * „Diese Woche" (0.9.71, Entwurf „Warmes Grün"): die verbuchten Stunden von
 * Montag bis Freitag als Balken, Samstag und Sonntag nur, wenn dort gearbeitet
 * wurde.
 *
 * BARRIEREFREIHEIT ZUERST: Die Balken sind reine Form (`aria-hidden`). Was ein
 * Screenreader liest, ist eine echte Liste mit einem Eintrag je Tag
 * („Montag: 8,2 Stunden, heute") und darüber die Wochensumme als Satz. Kein
 * `role="img"` mit einer langen Beschreibung: Eine Liste lässt sich Tag für Tag
 * durchgehen, ein Bild nur am Stück anhören.
 *
 * Gezählt werden nur die Schichten, die dem Formular vorliegen -- also die des
 * eingestellten Monats. Eine Woche über den Monatswechsel zeigt die Tage des
 * Vormonats deshalb leer; das steht dann auch so da („nicht in diesem Monat"),
 * statt eine falsche Null zu behaupten.
 */
export default function WochenUebersicht({ timeLogs, sollWoche, heute = new Date() }: WochenUebersichtProps) {
  const montag = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
  montag.setDate(montag.getDate() - ((montag.getDay() + 6) % 7));
  const heuteTag = alsTag(heute);
  const monatSchluessel = heuteTag.slice(0, 7);
  const vorhandeneMonate = new Set(timeLogs.map((l) => l.date.slice(0, 7)));
  const monatDerSchichten = vorhandeneMonate.size ? [...vorhandeneMonate][0] : monatSchluessel;

  const tage = TAGE.map((t, i) => {
    const d = new Date(montag);
    d.setDate(montag.getDate() + i);
    const tag = alsTag(d);
    const stunden = timeLogs
      .filter((l) => l.date === tag)
      .reduce((summe, l) => summe + (Number(l.duration) || 0), 0);
    return {
      ...t,
      tag,
      stunden: Math.round(stunden * 10) / 10,
      istHeute: tag === heuteTag,
      ausserhalb: tag.slice(0, 7) !== monatDerSchichten,
      wochenende: i >= 5,
    };
  }).filter((t) => !t.wochenende || t.stunden > 0);

  const summe = Math.round(tage.reduce((s, t) => s + t.stunden, 0) * 10) / 10;
  const tagesSoll = sollWoche > 0 ? sollWoche / 5 : 8;
  const skala = Math.max(tagesSoll, ...tage.map((t) => t.stunden), 1);

  return (
    <section
      aria-labelledby="woche-titel"
      className="p-4 sm:p-5 rounded-[var(--rv-radius-xl)] border border-[var(--card-border)] bg-[var(--bg-color)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="woche-titel" className="text-lg font-black text-[var(--text-color)]">
          Diese Woche
        </h3>
        <p className="text-base text-[var(--text-muted)]">
          <span className="text-xl font-black text-[var(--text-color)] tabular-nums">{zahl(summe)}</span>
          {sollWoche > 0 ? ` von ${zahl(sollWoche)} Std.` : " Std."}
        </p>
      </div>

      <ul
        className="mt-5 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${tage.length}, minmax(0, 1fr))` }}
        aria-label="Verbuchte Stunden je Tag"
      >
        {tage.map((t) => {
          const hoehe = t.stunden > 0 ? Math.max(8, (t.stunden / skala) * 100) : 0;
          return (
            <li key={t.tag} className="flex flex-col items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold text-[var(--text-color)] tabular-nums" aria-hidden="true">
                {t.stunden > 0 ? zahl(t.stunden) : "–"}
              </span>
              <span className="relative w-full max-w-[3.5rem] h-28 flex items-end" aria-hidden="true">
                <span
                  className={`w-full rounded-[var(--rv-radius-md)] ${
                    t.stunden > 0 ? "bg-[var(--accent)]" : "bg-[var(--hover-bg)]"
                  } ${t.istHeute ? "outline outline-2 outline-offset-2 outline-[var(--accent)]" : ""}`}
                  style={{ height: t.stunden > 0 ? `${hoehe}%` : "6px" }}
                />
              </span>
              <span
                className={`text-sm ${t.istHeute ? "font-black text-[var(--text-color)]" : "text-[var(--text-muted)]"}`}
                aria-hidden="true"
              >
                {t.kurz}
              </span>
              <span className="sr-only">
                {`${t.lang}: ${
                  t.ausserhalb
                    ? "nicht in diesem Monat"
                    : t.stunden > 0
                      ? `${zahl(t.stunden)} ${t.stunden === 1 ? "Stunde" : "Stunden"}`
                      : "keine Stunden verbucht"
                }${t.istHeute ? ", heute" : ""}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
