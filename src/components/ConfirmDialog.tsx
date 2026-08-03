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

  const isOpen = request !== null;

  useEffect(() => {
    if (!isOpen) return;
    previouslyActiveRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = setTimeout(() => cancelRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
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
  }, [isOpen, onClose]);

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
                  ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-[var(--accent)]/10 text-[var(--accent)]"
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
                  ? "bg-red-600 text-white hover:bg-red-700"
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
