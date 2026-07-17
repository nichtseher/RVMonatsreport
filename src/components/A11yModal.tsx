import React, { useRef, useState, useEffect } from "react";
import { AccessibilitySettings, AccessibilityTheme, SectionsConfig } from "../types";
import { Type, Eye, Volume2, VolumeX, Sparkles, HelpCircle, Lock, Settings2, ChevronRight, ArrowLeft, Clock, Sliders, Smartphone, Bell, BellOff, Monitor } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
  onOpenChangelog
}: A11yModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<"main" | "a11y" | "form">("main");

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsPushEnabled(!!sub);
        });
      });
    }
  }, []);

  const handleTogglePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.');
      return;
    }
    
    setIsPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      
      if (isPushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint })
          });
        }
        setIsPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Die Berechtigung für Benachrichtigungen wurde verweigert.');
          setIsPushLoading(false);
          return;
        }
        
        const response = await fetch('/api/push/public-key');
        if (!response.ok) throw new Error('Could not fetch public key');
        const { publicKey } = await response.json();
        
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub)
        });
        
        setIsPushEnabled(true);
        alert('Erfolgreich! Sie werden am 8. jedes Monats an Ihren Monatsbericht erinnert.');
      }
    } catch (err) {
      console.error('Push toggle error:', err);
      alert('Fehler beim Ändern der Push-Benachrichtigungen.');
    } finally {
      setIsPushLoading(false);
    }
  };

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const designThemes: { id: AccessibilityTheme; label: string; bg: string; text: string; border: string }[] = [
    { id: "light", label: "Hell (Standard)", bg: "bg-white", text: "text-slate-900", border: "border-slate-300" },
    { id: "dark", label: "Dunkel (Augenschonend)", bg: "bg-slate-900", text: "text-white", border: "border-slate-700" }
  ];

  const contrastThemes: { id: AccessibilityTheme; label: string; bg: string; text: string; border: string }[] = [
    { id: "high-contrast-dark", label: "Weiß auf Schwarz", bg: "bg-black", text: "text-white", border: "border-white" },
    { id: "high-contrast-yellow", label: "Gelb auf Schwarz", bg: "bg-black", text: "text-yellow-400", border: "border-yellow-400" },
  ];

  const renderMainMenu = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6 px-2">
        <Settings2 className="w-8 h-8 text-[var(--accent)]" aria-hidden="true" />
        <div>
          <h2 id="a11y-modal-title" className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Optionen
          </h2>
          <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">App anpassen und verwalten</p>
        </div>
      </div>

      <div className="space-y-3">
        {onOpenHelp && (
          <button
            type="button"
            onClick={onOpenHelp}
            className="w-full flex items-center justify-between p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left group active:scale-95 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="block font-black text-[var(--text-color)] text-lg">Hilfe & Anleitung</span>
                <span className="block text-sm font-semibold text-[var(--text-muted)] mt-0.5">Handbuch und Richtlinien</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-blue-500 transition-colors" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveMenu("a11y")}
          className="w-full flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-all text-left group active:scale-95 cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--input-bg)] text-[var(--accent)] flex items-center justify-center border border-[var(--border-color)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-black text-[var(--text-color)] text-lg">App-Einstellungen</span>
              <span className="block text-sm font-semibold text-[var(--text-muted)] mt-0.5">Zeiterfassung, Kontrast, Ansagen</span>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
        </button>

        <button
          type="button"
          onClick={() => setActiveMenu("form")}
          className="w-full flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-all text-left group active:scale-95 cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--input-bg)] text-[var(--accent)] flex items-center justify-center border border-[var(--border-color)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-black text-[var(--text-color)] text-lg">Formular anpassen</span>
              <span className="block text-sm font-semibold text-[var(--text-muted)] mt-0.5">Eigene Felder hinzufügen</span>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
        </button>
        
        <button
          type="button"
          onClick={onOpenManage}
          className="w-full flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-all text-left group active:scale-95 cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--input-bg)] text-[var(--accent)] flex items-center justify-center border border-[var(--border-color)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-black text-[var(--text-color)] text-lg">Kategorien löschen</span>
              <span className="block text-sm font-semibold text-[var(--text-muted)] mt-0.5">Selbst erstellte Felder entfernen</span>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
        </button>

        {onOpenBackup && (
          <button
            type="button"
            onClick={onOpenBackup}
            className="w-full flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-all text-left group active:scale-95 cursor-pointer shadow-sm mt-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="block font-black text-[var(--text-color)] text-lg">Datensicherung</span>
                <span className="block text-sm font-semibold text-[var(--text-muted)] mt-0.5">Backup erstellen & wiederherstellen</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-slate-800 transition-colors" />
          </button>
        )}

        {onOpenSync && (
          <button
            type="button"
            onClick={onOpenSync}
            className="w-full flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-all text-left group active:scale-95 cursor-pointer shadow-sm mt-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <span className="block font-black text-[var(--text-color)] text-lg">Geräte-Sync (QR Code)</span>
                <span className="block text-sm font-semibold text-[var(--text-muted)] mt-0.5">PC und Handy verbinden</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-blue-600 transition-colors" />
          </button>
        )}

        {onOpenChangelog && (
          <button
            type="button"
            onClick={onOpenChangelog}
            className="w-full flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-all text-left group active:scale-95 cursor-pointer shadow-sm mt-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="block font-black text-[var(--text-color)] text-lg">Was gibt's Neues?</span>
                <span className="block text-sm font-semibold text-[var(--text-muted)] mt-0.5">Version 0.2.0 Beta</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-purple-600 transition-colors" />
          </button>
        )}
      </div>
    </div>
  );

  const renderA11yMenu = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
        <button 
          onClick={() => setActiveMenu("main")}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors active:scale-95 cursor-pointer"
          aria-label="Zurück zum Hauptmenü Optionen"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Barrierefreiheit</h2>
        </div>
      </div>

      <div className="space-y-6">
        {/* Font Size Selection */}
        <div className="space-y-3">
          <label id="label-fontsize" className="block text-base font-extrabold text-[var(--text-color)]">
            <span className="flex items-center gap-2">
              <Type className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" /> Schriftgröße anpassen:
            </span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3" role="group" aria-labelledby="label-fontsize">
            {(["normal", "large", "extra-large"] as const).map((size) => {
              const labelMap = { normal: "Standard", large: "Groß", "extra-large": "Sehr groß" };
              const isActive = settings.fontSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateSetting("fontSize", size)}
                  aria-pressed={isActive}
                  className={`py-4 px-4 text-base font-bold rounded-2xl border-2 transition-all cursor-pointer text-center active:scale-95 ${
                    isActive
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white font-black shadow-md shadow-indigo-500/20"
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
        <div className="space-y-5">
          <div className="space-y-3">
            <span className="block text-sm font-black uppercase tracking-wider text-[var(--text-color)]">
              🎨 Kreative & Klassische Designs
            </span>
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Kreative & Klassische Designs">
              {designThemes.map((t) => {
                const isActive = settings.theme === t.id;
                return (
                  <label
                    key={t.id}
                    className={`relative py-4 px-5 text-base font-bold rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? "border-[var(--border-focus)] ring-4 ring-[var(--border-focus)]/20 shadow-md"
                        : "border-[var(--border-color)] hover:border-[var(--border-focus)]"
                    } ${t.bg} ${t.text}`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={t.id}
                      checked={isActive}
                      onChange={() => updateSetting("theme", t.id)}
                      className="sr-only"
                    />
                    <span className="font-extrabold">{t.label}</span>
                    <span className={`w-5 h-5 rounded-full border-2 ${t.border} flex items-center justify-center flex-shrink-0 ml-3`}>
                      {isActive && <span className="w-3 h-3 rounded-full bg-current" />}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-black uppercase tracking-wider text-[var(--text-color)]">
              👁️ Barrierefreie Kontrast-Themen
            </span>
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Barrierefreie Kontrast-Themen">
              {contrastThemes.map((t) => {
                const isActive = settings.theme === t.id;
                return (
                  <label
                    key={t.id}
                    className={`relative py-4 px-5 text-base font-bold rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? "border-[var(--border-focus)] ring-4 ring-[var(--border-focus)]/20 shadow-md"
                        : "border-[var(--border-color)] hover:border-[var(--border-focus)]"
                    } ${t.bg} ${t.text}`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={t.id}
                      checked={isActive}
                      onChange={() => updateSetting("theme", t.id)}
                      className="sr-only"
                    />
                    <span className="font-extrabold">{t.label}</span>
                    <span className={`w-5 h-5 rounded-full border-2 ${t.border} flex items-center justify-center flex-shrink-0 ml-3`}>
                      {isActive && <span className="w-3 h-3 rounded-full bg-current" />}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </div>
        </div>

        {/* Voice Feedback */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label id="label-desktop-layout" className="block text-base font-extrabold text-[var(--text-color)]">
              PC/Desktop Layout:
            </label>
            <button
              type="button"
              onClick={() => updateSetting("desktopLayout", !settings.desktopLayout)}
              aria-pressed={!!settings.desktopLayout}
              className={`w-full py-5 px-5 rounded-2xl border-2 transition-all cursor-pointer font-extrabold flex items-center justify-center gap-3 active:scale-95 shadow-sm ${
                settings.desktopLayout
                  ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                  : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
              }`}
            >
              <Monitor className="w-6 h-6" aria-hidden="true" />
              <span className="text-base">{settings.desktopLayout ? "Responsive (Aktiv)" : "Immer Mobile-Ansicht"}</span>
            </button>
            <p className="text-sm font-semibold text-[var(--text-muted)] leading-relaxed">
              Wenn aktiviert, nutzt die App am PC den großen Bildschirm besser aus (Sidebar & Spalten-Layout).
            </p>
          </div>

          <div className="space-y-3">
            <label id="label-timetracking" className="block text-base font-extrabold text-[var(--text-color)]">
              Modul: Zeiterfassung (Stempeluhr)
            </label>
            <button
              type="button"
              onClick={() => updateSetting("enableTimeTracking", settings.enableTimeTracking === false ? true : false)}
              aria-pressed={settings.enableTimeTracking !== false}
              className={`w-full py-5 px-5 rounded-2xl border-2 transition-all cursor-pointer font-extrabold flex items-center justify-center gap-3 active:scale-95 shadow-sm ${
                settings.enableTimeTracking !== false
                  ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                  : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
              }`}
            >
              {settings.enableTimeTracking !== false ? (
                <>
                  <Clock className="w-6 h-6" aria-hidden="true" />
                  <span className="text-base">Zeiterfassung AKTIV</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-6 h-6" aria-hidden="true" />
                  <span className="text-base">Zeiterfassung INAKTIV</span>
                </>
              )}
            </button>
            <p id="timetracking-description" className="text-sm font-semibold text-[var(--text-muted)] leading-relaxed">
              Stempeluhr und Pausenerfassung aktivieren. Falls deaktiviert, können Bürozeiten manuell im Monatsreport erfasst werden.
            </p>
          </div>

          <div className="space-y-3">
            <label id="label-narration" className="block text-base font-extrabold text-[var(--text-color)]">
              Sprach-Feedback (Ansage):
            </label>
            <button
              type="button"
              onClick={() => updateSetting("screenReaderNarration", !settings.screenReaderNarration)}
              aria-pressed={settings.screenReaderNarration}
              aria-describedby="narration-description"
              className={`w-full py-5 px-5 rounded-2xl border-2 transition-all cursor-pointer font-extrabold flex items-center justify-center gap-3 active:scale-95 shadow-sm ${
                settings.screenReaderNarration
                  ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                  : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
              }`}
            >
              {settings.screenReaderNarration ? (
                <>
                  <Volume2 className="w-6 h-6" aria-hidden="true" />
                  <span className="text-base">Sprachansage AKTIV</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-6 h-6" aria-hidden="true" />
                  <span className="text-base">Sprachansage INAKTIV</span>
                </>
              )}
            </button>
            <p id="narration-description" className="text-sm font-semibold text-[var(--text-muted)] leading-relaxed">
              App liest Zählerstände und Buttons laut vor. 
              <strong className="block mt-1 text-[var(--danger)]">Hinweis:</strong> 
              Bitte DEAKTIVIERT lassen, falls ein Screenreader (wie VoiceOver) aktiv ist.
            </p>
          </div>

          <div className="space-y-3">
            <label id="label-audiofeedback" className="block text-base font-extrabold text-[var(--text-color)]">
              Tastentöne (Zähler-Beep):
            </label>
            <button
              type="button"
              onClick={() => updateSetting("audioFeedback", !settings.audioFeedback)}
              aria-pressed={settings.audioFeedback}
              aria-describedby="audiofeedback-description"
              className={`w-full py-5 px-5 rounded-2xl border-2 transition-all cursor-pointer font-extrabold flex items-center justify-center gap-3 active:scale-95 shadow-sm ${
                settings.audioFeedback
                  ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                  : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
              }`}
            >
              {settings.audioFeedback ? (
                <>
                  <Volume2 className="w-6 h-6" aria-hidden="true" />
                  <span className="text-base">Tastentöne AKTIV</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-6 h-6" aria-hidden="true" />
                  <span className="text-base">Tastentöne INAKTIV</span>
                </>
              )}
            </button>
            <p id="audiofeedback-description" className="text-sm font-semibold text-[var(--text-muted)] leading-relaxed">
              Spielt akustisches Klick-Feedback bei Betätigung der Zählertasten.
            </p>
          </div>
        </div>

        {/* Speech Rate Control */}
        <div className="p-5 md:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)] space-y-4 shadow-sm">
          <label htmlFor="speech-rate-range" className="flex justify-between items-center text-sm font-black text-[var(--text-color)] uppercase tracking-wider">
            <span>🗣️ Vorlese-Geschwindigkeit</span>
            <span className="bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-xl font-black text-sm">
              {(settings.speechRate || 1.0).toFixed(1)}x
            </span>
          </label>
          <div className="flex items-center gap-4 py-2">
            <span className="text-xs font-black uppercase text-[var(--text-muted)]">Langsam</span>
            <input
              id="speech-rate-range"
              type="range"
              min="0.6"
              max="2.4"
              step="0.2"
              value={settings.speechRate || 1.0}
              onChange={(e) => updateSetting("speechRate", parseFloat(e.target.value))}
              className="flex-1 h-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
            />
            <span className="text-xs font-black uppercase text-[var(--text-muted)]">Schnell</span>
          </div>
        </div>

        {/* Push Notifications Setup */}
        <div className="space-y-3">
          <label id="label-pushnotifications" className="block text-base font-extrabold text-[var(--text-color)]">
            Erinnerung für Monatsbericht (Push):
          </label>
          <button
            type="button"
            onClick={handleTogglePush}
            disabled={!isPushSupported || isPushLoading}
            aria-pressed={isPushEnabled}
            aria-describedby="pushnotifications-description"
            className={`w-full py-5 px-5 rounded-2xl border-2 transition-all cursor-pointer font-extrabold flex items-center justify-center gap-3 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isPushEnabled
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--border-focus)]"
            }`}
          >
            {isPushEnabled ? (
              <>
                <Bell className="w-6 h-6" aria-hidden="true" />
                <span className="text-base">{isPushLoading ? "Wird geladen..." : "Erinnerung AKTIV"}</span>
              </>
            ) : (
              <>
                <BellOff className="w-6 h-6" aria-hidden="true" />
                <span className="text-base">{!isPushSupported ? "Nicht unterstützt" : isPushLoading ? "Wird geladen..." : "Erinnerung INAKTIV"}</span>
              </>
            )}
          </button>
          <p id="pushnotifications-description" className="text-sm font-semibold text-[var(--text-muted)] leading-relaxed">
            Aktivieren Sie diese Option, um am 8. des Monats eine Push-Benachrichtigung als Erinnerung zur Abgabe des Monatsberichts zu erhalten. 
            {!isPushSupported && <strong className="block mt-1 text-[var(--danger)]">Ihr Browser oder Gerät unterstützt leider keine Push-Benachrichtigungen.</strong>}
          </p>
        </div>
      </div>
    </div>
  );

  const renderFormMenu = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
        <button 
          onClick={() => setActiveMenu("main")}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors active:scale-95 cursor-pointer"
          aria-label="Zurück zum Hauptmenü Optionen"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Formular anpassen</h2>
        </div>
      </div>

      <div className="p-6 md:p-8 rounded-3xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-color)] space-y-6">
        <div className="space-y-2">
          <h3 className="text-base font-black tracking-tight text-[var(--text-color)]">
            Neue Felder hinzufügen
          </h3>
          <p className="text-sm text-[var(--text-muted)] font-semibold leading-relaxed">
            Fügen Sie neue Zähler-Kategorien oder Stundenerfassungen direkt hinzu, um das Formular an Ihre Region anzupassen.
          </p>
        </div>

        <form onSubmit={(e) => {
          onAddCustomField(e);
          setActiveMenu("main");
        }} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label htmlFor="new-field-name" className="text-xs font-black text-[var(--text-muted)] block uppercase tracking-wider">
                Kategorie-Name:
              </label>
              <input
                id="new-field-name"
                type="text"
                placeholder="z.B. Schulung, Messe"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="w-full p-4 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-2xl font-bold focus:border-[var(--border-focus)] outline-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="new-field-section" className="text-xs font-black text-[var(--text-muted)] block uppercase tracking-wider">
                Bereich:
              </label>
              <select
                id="new-field-section"
                value={newFieldSection}
                onChange={(e) => setNewFieldSection(e.target.value as keyof SectionsConfig)}
                className="w-full p-4 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-2xl font-bold focus:border-[var(--border-focus)] outline-none text-sm cursor-pointer"
              >
                <option value="s1">1. Vorführungen & Auslieferungen</option>
                <option value="s2">2. Schulung & Akquise</option>
                <option value="s3">3. Spezialprodukte (Fokus)</option>
                <option value="s4">4. Arbeitszeit & Büro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="new-field-step" className="text-xs font-black text-[var(--text-muted)] block uppercase tracking-wider">
                Schrittweite:
              </label>
              <select
                id="new-field-step"
                value={newFieldStep}
                onChange={(e) => setNewFieldStep(parseFloat(e.target.value))}
                className="w-full p-4 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-2xl font-bold focus:border-[var(--border-focus)] outline-none text-sm cursor-pointer"
              >
                <option value="1">+1er Schritte (Anzahl)</option>
                <option value="0.5">+0,5er Schritte (Stunden)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="new-field-icon" className="text-xs font-black text-[var(--text-muted)] block uppercase tracking-wider">
                Symbol / Icon:
              </label>
              <select
                id="new-field-icon"
                value={newFieldIcon}
                onChange={(e) => setNewFieldIcon(e.target.value)}
                className="w-full p-4 border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-2xl font-bold focus:border-[var(--border-focus)] outline-none text-sm cursor-pointer"
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

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-4 px-6 font-black bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 rounded-2xl cursor-pointer text-base transition-all active:scale-95 shadow-md shadow-[var(--primary)]/20"
            >
              + Kategorie hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div
      ref={modalRef}
      className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-3xl w-full border border-[var(--border-color)] p-5 md:p-8 relative shadow-lg flex flex-col gap-6 animate-fade-in"
    >
      {activeMenu === "main" && renderMainMenu()}
      {activeMenu === "a11y" && renderA11yMenu()}
      {activeMenu === "form" && renderFormMenu()}
    </div>
  );
}
