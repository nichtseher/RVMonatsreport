import { useEffect, useRef } from "react";
import { AppWindow } from "lucide-react";

/**
 * Hinweis im älteren von zwei offenen Fenstern (0.9.67).
 *
 * Dieses Fenster schreibt nichts mehr -- sein Stand ist veraltet und würde
 * sonst die Einträge des neueren Fensters überschreiben (siehe
 * utils/einFenster.ts). „Hier weiterarbeiten" lädt neu: Beim Laden liest die
 * App den aktuellen Stand und übernimmt, das andere Fenster zeigt dann diesen
 * Hinweis.
 *
 * `role="alert"`, weil der Wechsel ohne Zutun des Nutzers passiert, und der
 * Fokus auf die Überschrift, damit ein Screenreader nicht in einem leeren
 * Bereich steht.
 */
export default function FensterHinweis() {
  const ueberschrift = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    ueberschrift.current?.focus();
  }, []);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--bg-color)] p-4">
      <div
        role="alert"
        className="w-full max-w-md rounded-[var(--rv-radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-color)] p-6 shadow-[var(--rv-shadow-md)] flex flex-col gap-4"
      >
        <span
          className="w-12 h-12 rounded-[var(--rv-radius-md)] bg-[var(--primary)] text-[var(--primary-text)] flex items-center justify-center"
          aria-hidden="true"
        >
          <AppWindow className="w-6 h-6" />
        </span>
        <h1
          ref={ueberschrift}
          tabIndex={-1}
          className="text-xl font-black min-w-0 [overflow-wrap:anywhere] outline-none"
        >
          RV Mobil ist in einem anderen Fenster geöffnet
        </h1>
        <p className="text-base leading-relaxed text-[var(--text-muted)]">
          Damit keine Einträge verloren gehen, arbeitet immer nur ein Fenster: das zuletzt
          geöffnete. Dieses Fenster speichert nichts mehr.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[48px] px-5 py-3 rounded-[var(--rv-radius-lg)] font-black bg-[var(--primary)] text-[var(--primary-text)] hover:brightness-110 transition-all cursor-pointer focus-visible:ring-4"
        >
          Hier weiterarbeiten
        </button>
        <p className="text-sm text-[var(--text-muted)]">
          Das andere Fenster zeigt danach diesen Hinweis. Ihre Einträge von dort bleiben erhalten.
        </p>
      </div>
    </div>
  );
}
