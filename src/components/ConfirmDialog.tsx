import React, { useEffect, useRef } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

export interface ConfirmRequest {
  title: string;
  message: string;
  /** Zusatzpunkte, die als Liste dargestellt werden (z. B. Pruefergebnisse) */
  details?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  request: ConfirmRequest | null;
  onClose: () => void;
  announce?: (message: string, immediate?: boolean) => void;
}

/**
 * Barrierefreier Ersatz fuer window.confirm().
 *
 * Warum: Das Browser-confirm() wird von NVDA/JAWS unzuverlaessig vorgelesen,
 * laesst sich nicht gestalten (kein Hochkontrast-Theme, keine Schriftgroesse)
 * und wirkt auf dem Handy wie ein Fremdkoerper. Dieser Dialog nutzt
 * role="alertdialog" mit Fokusfalle, Escape-Abbruch und Fokus-Rueckgabe.
 *
 * Der Startfokus liegt bewusst auf "Abbrechen": Bei destruktiven Aktionen
 * soll ein versehentliches Enter nichts loeschen.
 */
export default function ConfirmDialog({ request, onClose, announce }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyActiveRef = useRef<HTMLElement | null>(null);

  /*
    `onClose` liegt in einer Ref, damit der Fokus-Effekt unten NICHT davon
    abhaengen muss.

    Warum das kein Schoenheitsfehler ist, sondern der Grund fuer einen echten
    Defekt war: Alle Aufrufer uebergeben `onClose` als Inline-Pfeil
    (`onClose={() => setConfirmRequest(null)}`). Die Identitaet wechselt damit
    bei JEDEM Render des Elternteils. Stand `onClose` in der Abhaengigkeitsliste,
    lief der Effekt bei jedem Render neu -- der Aufraeumer holte den Fokus zurueck
    auf das ausloesende Element, der neue Lauf setzte ihn 50 ms spaeter wieder auf
    "Abbrechen", und `previouslyActiveRef` zeigte danach auf eine Taste des
    Dialogs statt auf die des Nutzers.
  */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const isOpen = request !== null;

  useEffect(() => {
    if (!isOpen) return;
    previouslyActiveRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = setTimeout(() => cancelRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;

        /*
          Liegt der Fokus ueberhaupt nicht im Dialog, holt ihn dieser Zweig
          zurueck. Ohne ihn greift die Falle nur, wenn der Fokus zufaellig
          genau auf dem ersten oder letzten Element sitzt -- liegt er
          irgendwo im Hintergrund, laeuft der Tabulator kommentarlos durch
          die Seite HINTER der Rueckfrage. Genau das war am 2026-09-12
          messbar, und genau davor warnt `CLAUDE.md` seit Laengerem.
          `OnboardingModal` hat diesen Zweig; ausgerechnet der Dialog, den
          `CLAUDE.md` als Referenz nennt, hatte ihn nicht.
        */
        if (!active || !dialogRef.current.contains(active)) {
          (e.shiftKey ? last : first).focus();
          e.preventDefault();
          return;
        }
        if (e.shiftKey && active === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && active === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      // Fokus dorthin zurueck, wo der Nutzer war
      previouslyActiveRef.current?.focus();
    };
  }, [isOpen]);

  // Inhalt zusaetzlich per Sprachausgabe ansagen (role="alertdialog" allein
  // wird nicht von jedem Screenreader zuverlaessig komplett vorgelesen).
  useEffect(() => {
    if (!request || !announce) return;
    const parts = [request.title, request.message, ...(request.details || [])];
    announce(parts.join(" "), true);
  }, [request, announce]);

  if (!request) return null;

  const danger = request.tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div
        ref={dialogRef}
        className="bg-[var(--card-bg)] w-full max-w-md rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                danger
                  ? "bg-[var(--danger-bg)] text-[var(--danger-text)]"
                  : "bg-[var(--success-bg)] text-[var(--success-text)]"
              }`}
            >
              {danger ? (
                <AlertTriangle className="w-6 h-6" aria-hidden="true" />
              ) : (
                <HelpCircle className="w-6 h-6" aria-hidden="true" />
              )}
            </div>
            <h2
              id="confirm-dialog-title"
              className="text-lg font-black text-[var(--text-color)] leading-snug pt-1.5"
            >
              {request.title}
            </h2>
          </div>

          <div id="confirm-dialog-desc" className="space-y-2">
            <p className="text-sm font-normal text-[var(--text-color)] leading-relaxed">
              {request.message}
            </p>
            {request.details && request.details.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-sm font-bold text-[var(--text-muted)]">
                {request.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-all cursor-pointer"
            >
              {request.cancelLabel || "Abbrechen"}
            </button>
            <button
              type="button"
              onClick={() => {
                request.onConfirm();
                onClose();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-black transition-all cursor-pointer ${
                danger
                  /* text-white war hier ein Blindgänger: --danger-solid ist im
                     Schema "Weiß auf Schwarz" selbst #ffffff und in "Gelb auf
                     Schwarz" #ffff00. Die Beschriftung der bestätigenden Taste
                     stand also mit 1,0:1 bzw. 1,07:1 auf ihrem eigenen
                     Hintergrund -- unsichtbar, und zwar in genau den beiden
                     Schemata, die für diese Zielgruppe gebaut sind. Betroffen
                     waren alle vier zerstörenden Rückfragen (löschen,
                     zurücksetzen, Schicht löschen, alles ersetzen): Der Nutzer
                     sah zwei Tasten, eine davon leer, und musste raten.
                     --danger-solid-text existiert genau dafür und ist an jeder
                     anderen Stelle auch benutzt. */
                  ? "bg-[var(--danger-solid)] text-[var(--danger-solid-text)] hover:bg-[var(--danger-solid)]"
                  : "bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90"
              }`}
            >
              {request.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
