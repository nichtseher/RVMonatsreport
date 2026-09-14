import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Package, Plus, Trash2, Volume2, Pencil, Info } from "lucide-react";
import { Bestandsposten } from "../types";
import { rueckfrageOffen } from "../utils/rueckfrage";
import { ConfirmRequest } from "./ConfirmDialog";

interface BestandModalProps {
  isOpen: boolean;
  onClose: () => void;
  posten: Bestandsposten[];
  onSave: (posten: Bestandsposten[]) => void;
  announceToAriaAndSpeech: (message: string, immediate?: boolean) => void;
  /**
   * Die Rueckfrage laeuft ueber den EINEN Dialog in App.tsx. Begruendung wie
   * in HistoryModal: Die Fokusfalle ist in diesem Projekt dreimal geschrieben
   * und zweimal falsch gewesen.
   */
  setConfirmRequest: (anfrage: ConfirmRequest) => void;
}

/**
 * "Meine Demogeräte" -- eine Liste der Geraete, die man gerade dabei hat.
 *
 * BEWUSST EIN NOTIZZETTEL, KEIN VERWALTUNGSSYSTEM. Ein erster Entwurf hatte
 * Zustaende ("beim Kunden", "unterwegs"), Uebergabe-Codes und Erinnerungen an
 * ueberfaellige Sendungen. Das war am Bedarf vorbei: Sobald die Liste etwas
 * NACHWEISEN soll, wird sie zur Pflicht -- und Pflichtlisten werden nicht
 * gepflegt, sie veralten und luegen dann. Siehe KONZEPT-INVENTAR.md.
 *
 * Ein freies Textfeld statt eines Formulars, weil die Geraete keine scanbaren
 * Etiketten tragen: Jedes Pflichtfeld waere blind getippte Mehrarbeit fuer
 * einen Nutzen, den niemand verlangt hat. "Tactonom Pro, SN 4711, mit
 * Netzteil" und "grosser Koffer, grauer Griff" sind beide richtig.
 *
 * Das Vorlesen ist der eigentliche Gewinn gegenueber einem Zettel: Wer nicht
 * sehen kann, kann eine Liste sonst nur abtippen oder auswendig lernen.
 */
export default function BestandModal({
  isOpen,
  onClose,
  posten,
  onSave,
  announceToAriaAndSpeech,
  setConfirmRequest,
}: BestandModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const textFeldRef = useRef<HTMLInputElement>(null);

  const [entwurf, setEntwurf] = useState("");
  const [notizEntwurf, setNotizEntwurf] = useState("");
  const [bearbeitet, setBearbeitet] = useState<string | null>(null);

  /*
    `onClose` in einer Ref, damit der Fokus-Effekt nicht daran haengt -- die
    ausfuehrliche Begruendung steht in `ConfirmDialog.tsx`. Ohne das warf jeder
    App-Render den Fokus zurueck auf die Zurueck-Taste, und eine Ansage genuegt
    als Ausloeser.
  */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const previouslyActive = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => closeButtonRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Solange eine Rueckfrage steht, ruhen die Tastenkuerzel dieser Ansicht.
      if (rueckfrageOffen()) return;
      if (e.key === "Escape") onCloseRef.current();
    };

    /*
      Keine Fokusfalle: Diese Ansicht ist kein modaler Dialog, sondern eine
      Karte im Seitenfluss. Die untere Navigationsleiste bleibt sichtbar und
      anklickbar -- sie per Tastatur auszusperren waere WCAG 2.1.1. Siehe die
      ausfuehrliche Begruendung in CarryoverModal.tsx.
    */
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      previouslyActive?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const zuruecksetzen = () => {
    setEntwurf("");
    setNotizEntwurf("");
    setBearbeitet(null);
  };

  const uebernehmen = (e: React.FormEvent) => {
    e.preventDefault();
    const text = entwurf.trim();
    if (!text) {
      announceToAriaAndSpeech("Bitte tragen Sie zuerst ein, was Sie dabeihaben.", true);
      textFeldRef.current?.focus();
      return;
    }
    const notiz = notizEntwurf.trim();

    if (bearbeitet) {
      onSave(
        posten.map((p) => (p.id === bearbeitet ? { ...p, text, notiz: notiz || undefined } : p)),
      );
      announceToAriaAndSpeech(`Eintrag geändert: ${text}`, true);
    } else {
      const neu: Bestandsposten = {
        id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        text,
        notiz: notiz || undefined,
      };
      onSave([...posten, neu]);
      announceToAriaAndSpeech(`Hinzugefügt: ${text}. ${posten.length + 1} Einträge.`, true);
    }
    zuruecksetzen();
    textFeldRef.current?.focus();
  };

  const bearbeiten = (p: Bestandsposten) => {
    setBearbeitet(p.id);
    setEntwurf(p.text);
    setNotizEntwurf(p.notiz || "");
    announceToAriaAndSpeech(`Eintrag wird bearbeitet: ${p.text}`, true);
    setTimeout(() => textFeldRef.current?.focus(), 50);
  };

  const loeschen = (p: Bestandsposten) => {
    setConfirmRequest({
      title: "Eintrag löschen?",
      message: `„${p.text}" wird aus Ihrem Bestand entfernt.`,
      confirmLabel: "Löschen",
      tone: "danger",
      onConfirm: () => {
        onSave(posten.filter((x) => x.id !== p.id));
        if (bearbeitet === p.id) zuruecksetzen();
        announceToAriaAndSpeech(`Gelöscht: ${p.text}.`, true);
      },
    });
  };

  const vorlesen = () => {
    if (posten.length === 0) {
      announceToAriaAndSpeech("Ihr Bestand ist leer.", true);
      return;
    }
    const teile = posten.map((p, i) => `${i + 1}. ${p.text}${p.notiz ? `, ${p.notiz}` : ""}`);
    announceToAriaAndSpeech(
      `Ihr Bestand, ${posten.length} ${posten.length === 1 ? "Eintrag" : "Einträge"}: ${teile.join(". ")}`,
      true,
    );
  };

  return (
    <div className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-3xl w-full border border-[var(--border-color)] p-6 md:p-8 relative shadow-lg animate-fade-in [overflow-wrap:anywhere]">
      {/* Kopfzeile mit Zurück-Pfeil (einheitliches Navigationsmuster) */}
      <div className="flex items-center gap-3 mb-4">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Zurück zu den Optionen"
          className="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer transition-colors active:scale-95"
        >
          <ArrowLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <Package className="w-8 h-8 text-[var(--accent)] flex-shrink-0" aria-hidden="true" />
        {/* min-w-0: sonst gibt das Flex-Element seine Breite nicht unter den
            Inhalt preis und die Überschrift schiebt die Seite waagerecht auf. */}
        <h2 className="text-2xl md:text-3xl font-black min-w-0 break-words">Meine Demogeräte</h2>
      </div>

      <div className="p-3.5 mb-5 rounded-xl bg-[var(--cat-4-soft)] border border-[var(--cat-4)]/10 flex gap-2.5 items-start text-xs font-bold leading-relaxed">
        <Info className="w-4 h-4 flex-shrink-0 text-[var(--cat-4-text)] mt-0.5" aria-hidden="true" />
        <p className="flex-1">
          Ihre eigene Liste der Vorführgeräte, die Sie gerade dabeihaben – damit Sie
          nachsehen können, wenn jemand fragt. Schreiben Sie hinein, was Ihnen hilft;
          es gibt keine Vorgaben. Die Liste bleibt auf diesem Gerät.
        </p>
      </div>

      <form onSubmit={uebernehmen} className="space-y-3 mb-6">
        <div>
          <label htmlFor="bestand-text" className="block text-sm font-black mb-1.5">
            {bearbeitet ? "Eintrag ändern" : "Was haben Sie dabei?"}
          </label>
          <input
            id="bestand-text"
            ref={textFeldRef}
            type="text"
            value={entwurf}
            onChange={(e) => setEntwurf(e.target.value)}
            placeholder="z. B. Tactonom Pro mit Netzteil"
            autoComplete="off"
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] font-bold focus-visible:ring-4"
          />
        </div>
        <div>
          <label htmlFor="bestand-notiz" className="block text-sm font-black mb-1.5">
            Notiz <span className="font-bold text-[var(--text-muted)]">(freiwillig)</span>
          </label>
          <input
            id="bestand-notiz"
            type="text"
            value={notizEntwurf}
            onChange={(e) => setNotizEntwurf(e.target.value)}
            placeholder="z. B. seit KW 37, geht danach an Kollegin"
            autoComplete="off"
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] font-bold focus-visible:ring-4"
          />
        </div>
        {/* Stapeln bis sm: Drei Elemente nebeneinander unterschreiten bei
            "Extra groß" die 44 px Mindestbreite nicht, aber die Zeile bricht. */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="submit"
            className="flex-1 min-h-[44px] py-3 px-4 rounded-xl font-black bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            <span>{bearbeitet ? "Änderung übernehmen" : "Zur Liste hinzufügen"}</span>
          </button>
          {bearbeitet && (
            <button
              type="button"
              onClick={() => {
                zuruecksetzen();
                announceToAriaAndSpeech("Bearbeitung abgebrochen.", true);
              }}
              className="flex-1 min-h-[44px] py-3 px-4 rounded-xl font-bold border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-all cursor-pointer"
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-3">
        <h3 className="text-lg font-black min-w-0 flex-1">
          {posten.length === 0
            ? "Noch nichts eingetragen"
            : `${posten.length} ${posten.length === 1 ? "Eintrag" : "Einträge"}`}
        </h3>
        <button
          type="button"
          onClick={vorlesen}
          className="min-h-[44px] py-3 px-4 rounded-xl font-bold border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-all cursor-pointer flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Volume2 className="w-5 h-5" aria-hidden="true" />
          <span>Liste vorlesen</span>
        </button>
      </div>

      {posten.length === 0 ? (
        <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          Tragen Sie oben ein, was Sie gerade dabeihaben. Die Liste ist freiwillig –
          sie soll Ihnen helfen, nicht Sie kontrollieren.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {posten.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] p-3.5 flex flex-col sm:flex-row sm:items-start gap-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm break-words">{p.text}</p>
                {p.notiz && (
                  <p className="text-xs font-bold text-[var(--text-muted)] mt-1 break-words">
                    {p.notiz}
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => bearbeiten(p)}
                  aria-label={`Bearbeiten: ${p.text}`}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
                >
                  <Pencil className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => loeschen(p)}
                  aria-label={`Eintrag löschen: ${p.text}`}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border border-[var(--danger-text)] bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--danger-bg)] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
