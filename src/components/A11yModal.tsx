import React, { useEffect, useRef } from "react";
import { AccessibilitySettings, AccessibilityTheme, SectionsConfig } from "../types";
import { Type, Eye, Volume2, VolumeX, X, HelpCircle, Sparkles } from "lucide-react";

interface A11yModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onChange: (settings: AccessibilitySettings) => void;
  onOpenHelp?: () => void;

  // Custom field creation props
  newFieldName: string;
  setNewFieldName: (val: string) => void;
  newFieldSection: keyof SectionsConfig;
  setNewFieldSection: (val: keyof SectionsConfig) => void;
  newFieldStep: number;
  setNewFieldStep: (val: number) => void;
  newFieldIcon: string;
  setNewFieldIcon: (val: string) => void;
  onAddCustomField: (e: React.FormEvent) => void;
  onOpenManage: () => void;
}

export default function A11yModal({
  isOpen,
  onClose,
  settings,
  onChange,
  onOpenHelp,
  newFieldName,
  setNewFieldName,
  newFieldSection,
  setNewFieldSection,
  newFieldStep,
  setNewFieldStep,
  newFieldIcon,
  setNewFieldIcon,
  onAddCustomField,
  onOpenManage
}: A11yModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

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

  const designThemes: { id: AccessibilityTheme; label: string; bg: string; text: string; border: string }[] = [
    { id: "light", label: "Hell (Standard)", bg: "bg-white", text: "text-slate-900", border: "border-slate-300" },
    { id: "dark", label: "Dunkel (Augenschonend)", bg: "bg-slate-900", text: "text-white", border: "border-slate-700" },
    { id: "forest", label: "🌿 Waldgrün (Bio-Vibe)", bg: "bg-[#f4f6f4]", text: "text-[#14532d]", border: "border-[#14532d]/30" },
    { id: "ocean", label: "🌊 Ozeanblau (Modern)", bg: "bg-[#1c2541]", text: "text-sky-400", border: "border-sky-500/30" },
    { id: "sunset", label: "🌅 Terrakotta (Warm)", bg: "bg-[#fdfaf7]", text: "text-[#c2410c]", border: "border-[#c2410c]/30" },
    { id: "cyberpunk", label: "⚡ Cyberpunk (Futurisch)", bg: "bg-[#141424]", text: "text-[#00f0ff]", border: "border-[#ff007f]" },
  ];

  const contrastThemes: { id: AccessibilityTheme; label: string; bg: string; text: string; border: string }[] = [
    { id: "high-contrast-dark", label: "Weiß auf Schwarz", bg: "bg-black", text: "text-white", border: "border-white" },
    { id: "high-contrast-yellow", label: "Gelb auf Schwarz", bg: "bg-black", text: "text-yellow-400", border: "border-yellow-400" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-[var(--border-color)] p-6 md:p-8 relative shadow-2xl flex flex-col gap-6"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Einstellungen schließen"
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Eye className="w-8 h-8 text-[var(--accent)]" aria-hidden="true" />
          <h2 id="a11y-modal-title" className="text-2xl font-extrabold tracking-tight">
            Barrierefreiheit & Anzeige
          </h2>
        </div>

        <div className="space-y-6">
          {/* Font Size Selection */}
          <div className="space-y-2.5">
            <label id="label-fontsize" className="block text-sm font-extrabold text-[var(--text-muted)]">
              <span className="flex items-center gap-2">
                <Type className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" /> Schriftgröße anpassen:
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="label-fontsize">
              {(["normal", "large", "extra-large"] as const).map((size) => {
                const labelMap = { normal: "Standard", large: "Groß", "extra-large": "Sehr groß" };
                const isActive = settings.fontSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateSetting("fontSize", size)}
                    aria-pressed={isActive}
                    className={`py-3 px-2 text-sm font-bold rounded-xl border-2 transition-all cursor-pointer text-center ${
                      isActive
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white font-black"
                        : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
                    }`}
                  >
                    {labelMap[size]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                🎨 Kreative & Klassische Designs:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Kreative & Klassische Designs">
                {designThemes.map((t) => {
                  const isActive = settings.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSetting("theme", t.id)}
                      className={`py-2.5 px-3.5 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer text-left flex items-center justify-between h-12 ${
                        isActive
                          ? "border-[var(--border-focus)] ring-2 ring-[var(--border-focus)]"
                          : "border-[var(--border-color)] hover:border-[var(--border-focus)]"
                      } ${t.bg} ${t.text}`}
                    >
                      <span className="font-extrabold">{t.label}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border ${t.border} flex items-center justify-center flex-shrink-0 ml-2`}>
                        {isActive && <span className="w-2 h-2 rounded-full bg-current" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                👁️ Barrierefreie Kontrast-Themen:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Barrierefreie Kontrast-Themen">
                {contrastThemes.map((t) => {
                  const isActive = settings.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSetting("theme", t.id)}
                      className={`py-2.5 px-3.5 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer text-left flex items-center justify-between h-12 ${
                        isActive
                          ? "border-[var(--border-focus)] ring-2 ring-[var(--border-focus)]"
                          : "border-[var(--border-color)] hover:border-[var(--border-focus)]"
                      } ${t.bg} ${t.text}`}
                    >
                      <span className="font-extrabold">{t.label}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border ${t.border} flex items-center justify-center flex-shrink-0 ml-2`}>
                        {isActive && <span className="w-2 h-2 rounded-full bg-current" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Voice Feedback */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <label id="label-narration" className="block text-sm font-extrabold text-[var(--text-muted)]">
                Sprach-Feedback (Ansage):
              </label>
              <button
                type="button"
                onClick={() => updateSetting("screenReaderNarration", !settings.screenReaderNarration)}
                aria-pressed={settings.screenReaderNarration}
                aria-describedby="narration-description"
                className={`w-full py-4 px-4 rounded-xl border-2 transition-all cursor-pointer font-extrabold flex items-center justify-center gap-2.5 ${
                  settings.screenReaderNarration
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
                }`}
              >
                {settings.screenReaderNarration ? (
                  <>
                    <Volume2 className="w-5 h-5" aria-hidden="true" />
                    <span>Sprachansage AKTIV</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-5 h-5" aria-hidden="true" />
                    <span>Sprachansage INAKTIV</span>
                  </>
                )}
              </button>
              <p id="narration-description" className="text-xs text-[var(--text-muted)] leading-normal">
                Liest jeden geänderten Wert laut vor (hilfreich bei Sehbehinderung).
              </p>
            </div>

            <div className="space-y-2.5">
              <label id="label-audiofeedback" className="block text-sm font-extrabold text-[var(--text-muted)]">
                Tastentöne (Zähler-Beep):
              </label>
              <button
                type="button"
                onClick={() => updateSetting("audioFeedback", !settings.audioFeedback)}
                aria-pressed={settings.audioFeedback}
                aria-describedby="audiofeedback-description"
                className={`w-full py-4 px-4 rounded-xl border-2 transition-all cursor-pointer font-extrabold flex items-center justify-center gap-2.5 ${
                  settings.audioFeedback
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
                }`}
              >
                {settings.audioFeedback ? (
                  <>
                    <Volume2 className="w-5 h-5" aria-hidden="true" />
                    <span>Tastentöne AKTIV</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-5 h-5" aria-hidden="true" />
                    <span>Tastentöne INAKTIV</span>
                  </>
                )}
              </button>
              <p id="audiofeedback-description" className="text-xs text-[var(--text-muted)] leading-normal">
                Spielt akustisches Klick-Feedback bei Betätigung der Zählertasten.
              </p>
            </div>
          </div>

          {/* Speech Rate Control */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] space-y-3">
            <label htmlFor="speech-rate-range" className="block text-xs font-black text-[var(--text-color)] uppercase tracking-wider flex justify-between items-center">
              <span>🗣️ Vorlese-Geschwindigkeit (TTS)</span>
              <span className="bg-[var(--accent)]/10 text-[var(--accent)] px-2.5 py-0.5 rounded-lg font-black text-xs">
                {(settings.speechRate || 1.0).toFixed(1)}x
              </span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Langsam (0.6x)</span>
              <input
                id="speech-rate-range"
                type="range"
                min="0.6"
                max="2.4"
                step="0.2"
                value={settings.speechRate || 1.0}
                onChange={(e) => updateSetting("speechRate", parseFloat(e.target.value))}
                className="flex-1 h-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Schnell (2.4x)</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Reguliert das Sprechtempo der automatischen Zähleransagen sowie des Audio-Auditors. Erfahrene Screenreader-Nutzer können hiermit die Verarbeitungsgeschwindigkeit deutlich erhöhen.
            </p>
          </div>
        </div>

        {/* FORM CUSTOMIZER SECTION */}
        <div className="p-4 rounded-xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-color)] space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
            <h3 className="text-xs font-black tracking-tight text-[var(--text-color)] uppercase">
              Formular anpassen & erweitern
            </h3>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Fügen Sie neue Zähler-Kategorien oder Stundenerfassungen direkt hinzu, um das Formular an Ihre Region anzupassen.
          </p>

          <form onSubmit={onAddCustomField} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="new-field-name" className="text-[10px] font-black text-[var(--text-muted)] block uppercase tracking-wider">
                  Kategorie-Name:
                </label>
                <input
                  id="new-field-name"
                  type="text"
                  placeholder="z.B. Schulung, Messe"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-full p-2.5 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-bold focus:border-[var(--border-focus)] outline-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="new-field-section" className="text-[10px] font-black text-[var(--text-muted)] block uppercase tracking-wider">
                  Bereich:
                </label>
                <select
                  id="new-field-section"
                  value={newFieldSection}
                  onChange={(e) => setNewFieldSection(e.target.value as keyof SectionsConfig)}
                  className="w-full p-2.5 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-bold focus:border-[var(--border-focus)] outline-none text-xs cursor-pointer"
                >
                  <option value="s1">1. Vorführungen & Auslieferungen</option>
                  <option value="s2">2. Schulung & Akquise</option>
                  <option value="s3">3. Spezialprodukte (Fokus)</option>
                  <option value="s4">4. Arbeitszeit & Büro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="new-field-step" className="text-[10px] font-black text-[var(--text-muted)] block uppercase tracking-wider">
                  Schrittweite:
                </label>
                <select
                  id="new-field-step"
                  value={newFieldStep}
                  onChange={(e) => setNewFieldStep(parseFloat(e.target.value))}
                  className="w-full p-2.5 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-bold focus:border-[var(--border-focus)] outline-none text-xs cursor-pointer"
                >
                  <option value="1">+1er Schritte (Anzahl)</option>
                  <option value="0.5">+0,5er Schritte (Stunden)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="new-field-icon" className="text-[10px] font-black text-[var(--text-muted)] block uppercase tracking-wider">
                  Symbol / Icon:
                </label>
                <select
                  id="new-field-icon"
                  value={newFieldIcon}
                  onChange={(e) => setNewFieldIcon(e.target.value)}
                  className="w-full p-2.5 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-bold focus:border-[var(--border-focus)] outline-none text-xs cursor-pointer"
                >
                  <option value="⭐">⭐ Standard / Spezial</option>
                  <option value="🏫">🏫 Schule / Bildung</option>
                  <option value="💼">💼 Arbeitsplatz / Büro</option>
                  <option value="🎒">🎒 Auslieferung Schule</option>
                  <option value="🏢">🏢 Auslieferung Beruf</option>
                  <option value="👨‍🏫">👨‍🏫 Schulung / Vor-Ort</option>
                  <option value="📞">📞 Telefonisch / Support</option>
                  <option value="🤝">🤝 Beratung / Akquise</option>
                  <option value="🎪">🎪 Messe / Event</option>
                  <option value="🎯">🎯 Fokus-Ziel</option>
                  <option value="🌍">🌍 Feelspace / Orientierung</option>
                  <option value="🦯">🦯 WeWalk / Hilfsmittel</option>
                  <option value="🗓️">🗓️ Arbeitstage / Kalender</option>
                  <option value="⌨️">⌨️ Bürozeit / Computer</option>
                  <option value="🚗">🚗 Autofahrt / Außendienst</option>
                  <option value="👥">👥 Kundentermin / Meeting</option>
                  <option value="📦">📦 Paket / Lieferung</option>
                  <option value="💡">💡 Idee / Kreatives</option>
                  <option value="🛠️">🛠️ Werkstatt / Reparatur</option>
                  <option value="💬">💬 Chat / Absprache</option>
                </select>
              </div>
            </div>

            <div className="pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="submit"
                className="py-2.5 px-4 font-black bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 rounded-xl cursor-pointer text-xs transition-all active:scale-95"
              >
                + Kategorie hinzufügen
              </button>
              <button
                type="button"
                onClick={onOpenManage}
                aria-label="Formular verwalten, Kategorien löschen"
                className="py-2.5 px-4 font-extrabold border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] rounded-xl cursor-pointer text-xs transition-all active:scale-95"
              >
                ⚙️ Kategorien löschen
              </button>
            </div>
          </form>
        </div>

        {/* Help & Backup Integration */}
        {onOpenHelp && (
          <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10 space-y-2.5">
            <h4 className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              <span>Anleitung &amp; Datensicherung (Backup)</span>
            </h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed font-semibold">
              Hier finden Sie die detaillierten Richtlinien des Außendienstes, nützliche Tastenkombinationen und die Möglichkeit, Ihre lokalen Daten sicher in eine Textdatei zu sichern oder zu übertragen.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHelp();
              }}
              className="w-full py-2.5 px-4 rounded-xl font-extrabold bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-blue-500/10"
            >
              Anleitung &amp; Backup öffnen
            </button>
          </div>
        )}

        {/* Footer-like closing action */}
        <div className="mt-8 pt-4 border-t border-[var(--border-color)] text-right">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 font-extrabold bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 rounded-xl cursor-pointer text-sm transition-all focus-visible:ring-4"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
