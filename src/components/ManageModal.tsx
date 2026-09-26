import { useEffect, useRef } from "react";
import { Trash2, Settings, RotateCcw } from "lucide-react";
import AnsichtsKopf from "./AnsichtsKopf";
import { SectionsConfig } from "../types";
import { rueckfrageOffen } from "../utils/rueckfrage";

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

  /*
    `onClose` in einer Ref, damit der Effekt unten nicht daran haengt -- siehe
    die ausfuehrliche Begruendung in `ConfirmDialog.tsx`.

    Gemessen am 2026-09-12: `App.tsx` uebergibt `onClose={() => setActiveTab(
    "options")}`, also bei jedem App-Render eine neue Identitaet. Der Effekt
    lief damit staendig neu, und sein Aufraeumer setzte den Fokus jedes Mal auf
    die Zurueck-Taste. Wer hier mitten in der Liste stand und irgendwo in der
    App loeste einen Render aus (eine Ansage genuegt), landete wieder ganz oben.
    Bei der Rueckfrage "Kategorie loeschen?" gewann dieser Effekt sogar gegen
    den Startfokus des Dialogs: Der Fokus sass auf der Zurueck-Taste hinter der
    Rueckfrage, und der Tabulator lief durch den Hintergrund.
  */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Escape schliesst; eine Fokusfalle waere hier falsch (Begruendung unten).
  useEffect(() => {
    if (!isOpen) return;

    /*
      Startfokus und Wiederherstellung sind mit 0.9.41 entfallen -- den Fokus
      setzt jetzt zentral `useAnsichtsFokus` auf die Ueberschrift dieser
      Ansicht, und die Wiederherstellung war wirkungslos: Das gemerkte Element
      haengt beim Schliessen nicht mehr im Dokument (gemessen).
    */

    const handleKeyDown = (e: KeyboardEvent) => {
      /*
        Solange eine Rueckfrage steht, ruhen die Tastenkuerzel dieser Ansicht.
        Ohne diese Zeile schloss ein Escape, das die Rueckfrage abbrechen
        sollte, zugleich die Ansicht dahinter -- Begruendung und Messung in
        `utils/rueckfrage.ts`.
      */
      if (rueckfrageOffen()) return;
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }

      /*
        Hier stand bis 0.9.21 eine Fokusfalle -- dieselbe, die am 2026-09-02
        aus `CarryoverModal` entfernt wurde und die hier überlebt hat, weil
        keine Prüfung diese Ansicht je erreichte.

        Sie war falsch, weil diese Ansicht **kein modaler Dialog ist.** Ihre
        Wurzel ist eine gewöhnliche Karte im Seitenfluss -- kein `fixed
        inset-0`, keine abdunkelnde Fläche, kein `aria-modal`. Die untere
        Navigationsleiste bleibt sichtbar und mit der Maus anklickbar; mit der
        Tastatur war sie es nicht mehr. Das ist WCAG 2.1.2, eine Tastaturfalle.

        Escape schließt weiterhin -- das ist eine Abkürzung, keine Falle.
      */
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  /* `handleBackdropClick` stand hier bis 0.9.21 und war nirgends angebunden --
     ein Überbleibsel aus der Zeit, als diese Ansicht ein Overlay war. Es war
     zugleich der beste Beleg dafür, dass sie keines mehr ist. */

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
      className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-[var(--rv-radius-xl)] w-full border border-[var(--card-border)] p-6 md:p-8 relative shadow-[var(--rv-shadow-lg)] animate-fade-in"
    >
      <AnsichtsKopf
        id="manage-modal-title"
        titel="Eigene Felder löschen"
        symbol={Settings}
        zurueck={{ beschriftung: "Zurück zu den Optionen", onClick: onClose, ref: closeButtonRef }}
      />

        <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
          Hier können Sie Kategorien löschen. <strong>Vorsicht:</strong> Wenn Sie eine Kategorie löschen, werden auch die eingetragenen Zahlen dafür gelöscht.
        </p>

        {/*
          Der Bereich scrollt -- also muss er mit der Tastatur erreichbar sein.
          `tabIndex={0}` plus `role="region"` und Beschriftung ist dasselbe
          Muster, mit dem 0.9.20 die Hilfe repariert hat: Ohne das konnte man
          zwar mit der Maus scrollen, mit der Tastatur aber an nichts unterhalb
          der sichtbaren Kante heran.
        */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Liste der Kategorien"
          className="space-y-6 max-h-[40vh] overflow-y-auto pr-2"
        >
          {hasFields ? (
            (Object.keys(appFields) as Array<keyof SectionsConfig>).map((secKey) => {
              const list = appFields[secKey];
              if (list.length === 0) return null;

              return (
                <div key={secKey} className="space-y-2">
                  {/* [overflow-wrap:anywhere]: „AUSLIEFERUNGEN" in Versalien mit
                      Sperrung ist bei „Extra groß" und breiter Schrift ein
                      einzelnes, nicht umbrechbares Wort. Es zwang dem
                      scrollenden Bereich 245 px Mindestbreite auf, wo nur 174
                      zur Verfügung standen -- der Bereich wurde damit still
                      seitwärts scrollbar. `break-words` genügt dagegen nicht,
                      es ändert die intrinsische Mindestbreite nicht. */}
                  <h3 className="text-sm font-bold text-[var(--text-muted)] border-b border-[var(--card-border)] pb-1 [overflow-wrap:anywhere]">
                    {sectionLabels[secKey]}
                  </h3>
                  <div className="space-y-1.5">
                    {list.map((field) => (
                      /*
                        min-w-0 am Text, flex-shrink-0 an der Taste: Ein
                        Flex-Kind gibt seine Breite standardmäßig nicht unter
                        seinen Inhalt preis. Mit langen Kategorienamen und
                        breiter Schrift sprengte die Zeile das Fenster --
                        gemessen 531 px Inhalt bei 360 px Fenster, bei 320 px
                        derselbe Wert, und das Papierkorb-Symbol stand 95 px
                        außerhalb. Zusätzlich `overflow-wrap:anywhere`, weil
                        `break-words` die intrinsische Mindestbreite nicht
                        ändert.
                      */
                      <div
                        key={field.id}
                        className="flex items-center justify-between gap-2 p-3.5 bg-[var(--bg-color)] border border-[var(--card-border)] rounded-[var(--rv-radius-md)]"
                      >
                        <span className="font-bold text-sm leading-snug min-w-0 [overflow-wrap:anywhere]">
                          {field.label}
                        </span>
                        {/* 40 px war unter den 44 px aus WCAG 2.5.5 -- unentdeckt,
                            weil diese Ansicht bis 0.9.21 von keiner Prüfung
                            erreicht wurde. */}
                        <button
                          type="button"
                          onClick={() => onDeleteField(secKey, field.id, field.label)}
                          aria-label={`Kategorie "${field.label}" unwiderruflich löschen`}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 rounded-[var(--rv-radius-md)] flex items-center justify-center bg-[var(--danger-bg)] hover:brightness-110 text-[var(--danger)] cursor-pointer transition-all"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
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
        <div className="border-t border-dashed border-[var(--card-border)] mt-8 pt-6">
          <button
            type="button"
            onClick={onFactoryReset}
            className="w-full py-4 px-4 rounded-[var(--rv-radius-md)] font-bold border-2 border-dashed border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-bg)] flex items-center justify-center gap-2 cursor-pointer transition-all text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Formular auf Standard-Felder zurücksetzen</span>
          </button>
          <p className="text-[0.75rem] text-[var(--text-muted)] text-center mt-2 leading-relaxed">
            Warnung: Dies stellt den Anfangszustand der App wieder her. Ihre selbst erstellten Kategorien werden dabei gelöscht.
          </p>
        </div>
    </div>
  );
}
