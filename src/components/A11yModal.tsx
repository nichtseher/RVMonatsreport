import React, { useRef, useState } from "react";
import { AccessibilitySettings, AccessibilityTheme, SectionsConfig } from "../types";
import {
  Type, Volume2, Sparkles, HelpCircle, Lock, Settings2, ChevronRight,
  ArrowLeft, Clock, Sliders, Smartphone, Bell, Monitor, Palette,
} from "lucide-react";

interface A11yModalProps {
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
  onOpenBackup?: () => void;
  onOpenSync?: () => void;
  onOpenChangelog?: () => void;
}

/* ---------- Wiederverwendbare, kompakte Bausteine ---------- */

/** Kompakte Menüzeile für das Hauptmenü (ersetzt die großen Karten-Buttons). */
function MenuRow({
  icon,
  iconClass,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left group hover:bg-[var(--input-bg)] transition-colors active:scale-[0.99] cursor-pointer first:rounded-t-2xl last:rounded-b-2xl"
    >
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`} aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-black text-[var(--text-color)] text-sm leading-tight">{label}</span>
        <span className="block text-xs font-semibold text-[var(--text-muted)] truncate">{hint}</span>
      </span>
      <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" aria-hidden="true" />
    </button>
  );
}

/** Kompakter Schalter (echter Switch statt riesigem Button). */
function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onToggle,
  describedById,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  describedById?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="w-9 h-9 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--accent)] flex items-center justify-center flex-shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-black text-[var(--text-color)] text-sm leading-tight">{label}</span>
        {hint && (
          <span id={describedById} className="block text-xs font-semibold text-[var(--text-muted)] leading-snug mt-0.5">
            {hint}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={describedById}
        onClick={onToggle}
        className={`relative w-14 h-8 rounded-full border-2 transition-colors cursor-pointer flex-shrink-0 ${
          checked
            ? "bg-[var(--accent)] border-[var(--accent)]"
            : "bg-[var(--input-bg)] border-[var(--border-color)]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${
            checked ? "left-[26px]" : "left-0.5"
          }`}
        />
        <span className="sr-only">{checked ? "Aktiv" : "Inaktiv"}</span>
      </button>
    </div>
  );
}

/** Abschnitts-Karte mit Titel; gruppiert zusammengehörige Zeilen. */
function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)] shadow-sm overflow-hidden">
      {title && (
        <h3 className="px-4 pt-3 pb-1 text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </h3>
      )}
      <div className="divide-y divide-[var(--border-color)]">{children}</div>
    </section>
  );
}

/* ---------- Hauptkomponente ---------- */

export default function A11yModal({
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
  onOpenManage,
  onOpenBackup,
  onOpenSync,
  onOpenChangelog,
}: A11yModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<"main" | "a11y" | "form">("main");

  // Lokale Erinnerung (serverlos): Die App erinnert ab dem 8. des Monats beim
  // Öffnen an den Monatsbericht. Es wird bewusst KEIN Push-Server verwendet.
  const [isReminderEnabled, setIsReminderEnabled] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("aussendienst_pwa_reminder") === "true"
  );

  const handleToggleReminder = async () => {
    if (isReminderEnabled) {
      localStorage.setItem("aussendienst_pwa_reminder", "false");
      setIsReminderEnabled(false);
      return;
    }
    // Optional: System-Benachrichtigung zusätzlich zur In-App-Erinnerung.
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // In-App-Erinnerung funktioniert auch ohne Benachrichtigungs-Erlaubnis.
      }
    }
    localStorage.setItem("aussendienst_pwa_reminder", "true");
    setIsReminderEnabled(true);
  };

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  // Alle Designs in EINER Gruppe (statt zwei getrennte Fieldsets)
  const themes: { id: AccessibilityTheme; label: string; swatch: string; swatchText: string }[] = [
    { id: "light", label: "Hell", swatch: "bg-white border-slate-300", swatchText: "text-slate-900" },
    { id: "dark", label: "Dunkel", swatch: "bg-slate-900 border-slate-700", swatchText: "text-white" },
    { id: "high-contrast-dark", label: "Weiß auf Schwarz", swatch: "bg-black border-white", swatchText: "text-white" },
    { id: "high-contrast-yellow", label: "Gelb auf Schwarz", swatch: "bg-black border-yellow-400", swatchText: "text-yellow-400" },
  ];

  /* ----- Hauptmenü: DSGVO-Hinweis + 2 gruppierte Karten statt 7 großer Buttons ----- */
  const renderMainMenu = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 px-1">
        <Settings2 className="w-7 h-7 text-[var(--accent)]" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h2 id="a11y-modal-title" className="text-xl md:text-2xl font-extrabold tracking-tight">
            Optionen
          </h2>
        </div>
        {onOpenChangelog && (
          <button
            type="button"
            onClick={onOpenChangelog}
            className="text-xs font-black px-3 py-1.5 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-600/30 hover:bg-purple-600/20 transition-colors cursor-pointer flex-shrink-0"
          >
            v0.2.0 – Neues
          </button>
        )}
      </div>

      <p className="flex items-start gap-2 px-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 leading-relaxed">
        <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>
          DSGVO-konform: Alle Daten bleiben lokal auf dem Gerät. Der Geräte-Sync läuft
          offline per QR-Code – ohne Server und ohne Internet.
        </span>
      </p>

      <SectionCard title="Einstellungen">
        <MenuRow
          icon={<Sliders className="w-5 h-5" />}
          iconClass="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--accent)]"
          label="Anzeige & Bedienung"
          hint="Schrift, Design, Ansagen, Erinnerung, Module"
          onClick={() => setActiveMenu("a11y")}
        />
        <MenuRow
          icon={<Sparkles className="w-5 h-5" />}
          iconClass="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--accent)]"
          label="Formular anpassen"
          hint="Eigene Zähler-Felder hinzufügen oder löschen"
          onClick={() => setActiveMenu("form")}
        />
      </SectionCard>

      <SectionCard title="Daten & Hilfe">
        {onOpenSync && (
          <MenuRow
            icon={<Smartphone className="w-5 h-5" />}
            iconClass="bg-blue-600 text-white"
            label="Geräte-Sync (QR-Code)"
            hint="Daten offline auf ein zweites Gerät übertragen"
            onClick={onOpenSync}
          />
        )}
        {onOpenBackup && (
          <MenuRow
            icon={<Lock className="w-5 h-5" />}
            iconClass="bg-slate-700 text-white"
            label="Datensicherung"
            hint="Verschlüsseltes Backup erstellen & einspielen"
            onClick={onOpenBackup}
          />
        )}
        {onOpenHelp && (
          <MenuRow
            icon={<HelpCircle className="w-5 h-5" />}
            iconClass="bg-blue-500 text-white"
            label="Hilfe & Anleitung"
            hint="Handbuch, FAQ und Richtlinien"
            onClick={onOpenHelp}
          />
        )}
      </SectionCard>
    </div>
  );

  /* ----- Einstellungen: kompakte Gruppen mit Switches ----- */
  const renderA11yMenu = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
        <button
          onClick={() => setActiveMenu("main")}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors active:scale-95 cursor-pointer flex-shrink-0"
          aria-label="Zurück zum Hauptmenü Optionen"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg md:text-xl font-extrabold tracking-tight">Anzeige & Bedienung</h2>
      </div>

      {/* Schriftgröße: eine kompakte Segment-Reihe */}
      <SectionCard title="Schriftgröße">
        <div className="p-3" role="group" aria-label="Schriftgröße anpassen">
          <div className="grid grid-cols-3 gap-2">
            {(["normal", "large", "extra-large"] as const).map((size) => {
              const labelMap = { normal: "Standard", large: "Groß", "extra-large": "Sehr groß" };
              const isActive = settings.fontSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateSetting("fontSize", size)}
                  aria-pressed={isActive}
                  className={`py-3 px-2 text-sm font-black rounded-xl border-2 transition-all cursor-pointer text-center active:scale-95 flex items-center justify-center gap-1.5 ${
                    isActive
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                      : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
                  }`}
                >
                  <Type className={size === "normal" ? "w-3.5 h-3.5" : size === "large" ? "w-4 h-4" : "w-5 h-5"} aria-hidden="true" />
                  {labelMap[size]}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Design: EINE Gruppe mit 4 Optionen (2×2) */}
      <SectionCard title="Design & Kontrast">
        <fieldset className="p-3 grid grid-cols-2 gap-2" aria-label="Design und Kontrast wählen">
          {themes.map((t) => {
            const isActive = settings.theme === t.id;
            return (
              <label
                key={t.id}
                className={`py-3 px-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-2.5 ${t.swatch} ${t.swatchText} ${
                  isActive
                    ? "ring-4 ring-[var(--border-focus)]/40 border-[var(--border-focus)]"
                    : "hover:border-[var(--border-focus)]"
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={t.id}
                  checked={isActive}
                  onChange={() => updateSetting("theme", t.id)}
                  className="sr-only"
                />
                <Palette className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="font-extrabold text-sm leading-tight">{t.label}</span>
                {isActive && <span className="ml-auto w-2.5 h-2.5 rounded-full bg-current flex-shrink-0" aria-hidden="true" />}
              </label>
            );
          })}
        </fieldset>
      </SectionCard>

      {/* Audio & Sprache: 2 Switches + Tempo-Slider in EINER Karte */}
      <SectionCard title="Audio & Sprache">
        <ToggleRow
          icon={<Volume2 className="w-5 h-5" />}
          label="Sprachansage"
          hint="Liest Zähler und Buttons vor. Bei aktivem Screenreader (z. B. VoiceOver) bitte AUS lassen."
          describedById="narration-hint"
          checked={!!settings.screenReaderNarration}
          onToggle={() => updateSetting("screenReaderNarration", !settings.screenReaderNarration)}
        />
        <ToggleRow
          icon={<Volume2 className="w-5 h-5" />}
          label="Tastentöne"
          hint="Klick-Feedback bei den Zählertasten"
          describedById="audio-hint"
          checked={!!settings.audioFeedback}
          onToggle={() => updateSetting("audioFeedback", !settings.audioFeedback)}
        />
        <div className="px-4 py-3.5">
          <label htmlFor="speech-rate-range" className="flex justify-between items-center text-sm font-black text-[var(--text-color)]">
            <span>Vorlese-Tempo</span>
            <span className="bg-[var(--accent)]/10 text-[var(--accent)] px-2.5 py-0.5 rounded-lg font-black text-xs">
              {(settings.speechRate || 1.0).toFixed(1)}x
            </span>
          </label>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Langsam</span>
            <input
              id="speech-rate-range"
              type="range"
              min="0.6"
              max="2.4"
              step="0.2"
              value={settings.speechRate || 1.0}
              onChange={(e) => updateSetting("speechRate", parseFloat(e.target.value))}
              className="flex-1 h-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
            />
            <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Schnell</span>
          </div>
        </div>
      </SectionCard>

      {/* App-Verhalten: 3 Switches in EINER Karte */}
      <SectionCard title="App-Verhalten">
        <ToggleRow
          icon={<Bell className="w-5 h-5" />}
          label="Erinnerung Monatsbericht"
          hint="Ab dem 8. des Monats beim Öffnen der App – lokal, ohne Server"
          describedById="reminder-hint"
          checked={isReminderEnabled}
          onToggle={handleToggleReminder}
        />
        <ToggleRow
          icon={<Clock className="w-5 h-5" />}
          label="Zeiterfassung (Stempeluhr)"
          hint="Falls AUS: Bürozeiten manuell im Report erfassen"
          describedById="timetracking-hint"
          checked={settings.enableTimeTracking !== false}
          onToggle={() => updateSetting("enableTimeTracking", settings.enableTimeTracking === false ? true : false)}
        />
        <ToggleRow
          icon={<Monitor className="w-5 h-5" />}
          label="Desktop-Layout am PC"
          hint="Sidebar & Spalten auf großen Bildschirmen"
          describedById="desktop-hint"
          checked={!!settings.desktopLayout}
          onToggle={() => updateSetting("desktopLayout", !settings.desktopLayout)}
        />
      </SectionCard>
    </div>
  );

  /* ----- Formular anpassen (inkl. Link zu "Felder löschen") ----- */
  const renderFormMenu = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
        <button
          onClick={() => setActiveMenu("main")}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors active:scale-95 cursor-pointer flex-shrink-0"
          aria-label="Zurück zum Hauptmenü Optionen"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg md:text-xl font-extrabold tracking-tight">Formular anpassen</h2>
      </div>

      <SectionCard title="Neues Feld hinzufügen">
        <form
          onSubmit={(e) => {
            onAddCustomField(e);
            setActiveMenu("main");
          }}
          className="p-4 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="new-field-name" className="text-xs font-black text-[var(--text-muted)] block uppercase tracking-wider">
                Kategorie-Name:
              </label>
              <input
                id="new-field-name"
                type="text"
                placeholder="z.B. Schulung, Messe"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="w-full p-3.5 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-bold focus:border-[var(--border-focus)] outline-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-field-section" className="text-xs font-black text-[var(--text-muted)] block uppercase tracking-wider">
                Bereich:
              </label>
              <select
                id="new-field-section"
                value={newFieldSection}
                onChange={(e) => setNewFieldSection(e.target.value as keyof SectionsConfig)}
                className="w-full p-3.5 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-bold focus:border-[var(--border-focus)] outline-none text-sm cursor-pointer"
              >
                <option value="s1">1. Vorführungen & Auslieferungen</option>
                <option value="s2">2. Schulung & Akquise</option>
                <option value="s3">3. Spezialprodukte (Fokus)</option>
                <option value="s4">4. Arbeitszeit & Büro</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-field-step" className="text-xs font-black text-[var(--text-muted)] block uppercase tracking-wider">
                Schrittweite:
              </label>
              <select
                id="new-field-step"
                value={newFieldStep}
                onChange={(e) => setNewFieldStep(parseFloat(e.target.value))}
                className="w-full p-3.5 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-bold focus:border-[var(--border-focus)] outline-none text-sm cursor-pointer"
              >
                <option value="1">+1er Schritte (Anzahl)</option>
                <option value="0.5">+0,5er Schritte (Stunden)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-field-icon" className="text-xs font-black text-[var(--text-muted)] block uppercase tracking-wider">
                Symbol / Icon:
              </label>
              <select
                id="new-field-icon"
                value={newFieldIcon}
                onChange={(e) => setNewFieldIcon(e.target.value)}
                className="w-full p-3.5 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-xl font-bold focus:border-[var(--border-focus)] outline-none text-sm cursor-pointer"
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

          <button
            type="submit"
            className="w-full py-3.5 px-6 font-black bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 rounded-xl cursor-pointer text-sm transition-all active:scale-95 shadow-md shadow-[var(--primary)]/20"
          >
            + Kategorie hinzufügen
          </button>
        </form>
      </SectionCard>

      <SectionCard>
        <MenuRow
          icon={<Settings2 className="w-5 h-5" />}
          iconClass="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--danger)]"
          label="Eigene Felder löschen"
          hint="Selbst erstellte Kategorien wieder entfernen"
          onClick={onOpenManage}
        />
      </SectionCard>
    </div>
  );

  return (
    <div
      ref={modalRef}
      className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-3xl w-full border border-[var(--border-color)] p-4 md:p-6 relative shadow-lg flex flex-col gap-4 animate-fade-in"
    >
      {activeMenu === "main" && renderMainMenu()}
      {activeMenu === "a11y" && renderA11yMenu()}
      {activeMenu === "form" && renderFormMenu()}
    </div>
  );
}
