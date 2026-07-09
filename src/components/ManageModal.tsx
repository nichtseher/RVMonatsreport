import React, { useEffect, useRef } from "react";
import { X, Trash2, Settings, RotateCcw } from "lucide-react";
import { SectionsConfig, FieldConfig } from "../types";

interface ManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appFields: SectionsConfig;
  onDeleteField: (sectionKey: keyof SectionsConfig, fieldId: string, label: string) => void;
  onFactoryReset: () => void;
}

export default function ManageModal({
  isOpen,
  onClose,
  appFields,
  onDeleteField,
  onFactoryReset,
}: ManageModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const previouslyActive = document.activeElement as HTMLElement;

    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex="0"]'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyActive) {
        previouslyActive.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sectionLabels: Record<keyof SectionsConfig, string> = {
    s1: "1. Vorführungen & Auslieferungen",
    s2: "2. Schulung, Support & Akquise",
    s3: "3. Spezialprodukte (Fokus)",
    s4: "4. Arbeitszeit & Büro",
  };

  // Check if there are any fields to show
  const hasFields = Object.values(appFields).some((list) => list.length > 0);

  return (
    <div
      ref={modalRef}
      className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-3xl w-full border border-[var(--border-color)] p-6 md:p-8 relative shadow-lg animate-fade-in"
    >
      {/* Close Button */}
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Zurück"
        className="absolute top-5 right-5 w-12 h-12 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer z-10 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-[var(--accent)]" aria-hidden="true" />
        <h2 id="manage-modal-title" className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Formularfelder verwalten
        </h2>
      </div>

        <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
          Hier können Sie Kategorien löschen. <strong>Vorsicht:</strong> Wenn Sie eine Kategorie löschen, werden auch die eingetragenen Zahlen dafür gelöscht.
        </p>

        {/* Categories List */}
        <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2">
          {hasFields ? (
            (Object.keys(appFields) as Array<keyof SectionsConfig>).map((secKey) => {
              const list = appFields[secKey];
              if (list.length === 0) return null;

              return (
                <div key={secKey} className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-color)] pb-1">
                    {sectionLabels[secKey]}
                  </h3>
                  <div className="space-y-1.5">
                    {list.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-3.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl"
                      >
                        <span className="font-semibold text-sm leading-snug pr-3">
                          {field.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteField(secKey, field.id, field.label)}
                          aria-label={`Kategorie "${field.label}" unwiderruflich löschen`}
                          className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-[var(--danger)] cursor-pointer transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm italic text-center py-6 text-[var(--text-muted)]">
              Keine Felder im Formular konfiguriert.
            </p>
          )}
        </div>

        {/* Factory Reset */}
        <div className="border-t border-dashed border-[var(--border-color)] mt-8 pt-6">
          <button
            type="button"
            onClick={onFactoryReset}
            className="w-full py-4 px-4 rounded-xl font-bold border-2 border-dashed border-[var(--danger)] text-[var(--danger)] hover:bg-red-50/20 dark:hover:bg-red-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Formular auf Standard-Felder zurücksetzen</span>
          </button>
          <p className="text-[11px] text-[var(--text-muted)] text-center mt-2 leading-relaxed">
            Warnung: Dies stellt den Anfangszustand der App wieder her. Ihre selbst erstellten Kategorien werden dabei gelöscht.
          </p>
        </div>
    </div>
  );
}
