import React, { useEffect, useRef, useState } from "react";
import {
  Zap,
  User,
  Eye,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Type,
} from "lucide-react";
import { AccessibilitySettings, AccessibilityTheme } from "../types";

interface OnboardingModalProps {
  name: string;
  onNameChange: (name: string) => void;
  settings: AccessibilitySettings;
  onSettingsChange: (settings: AccessibilitySettings) => void;
  onFinish: () => void;
  announce: (message: string, immediate?: boolean) => void;
}

/**
 * Interaktiver Einstieg bei der ersten Nutzung.
 *
 * Bewusst KEIN reiner Begruessungs-Bildschirm: Jeder Schritt stellt etwas
 * ein, das sonst in den Optionen gesucht werden muesste. Besonders wichtig
 * fuer die Zielgruppe: Sprachansagen, Schriftgroesse und Farbschema lassen
 * sich hier sofort setzen, statt sie erst muehsam zu finden.
 *
 * Barrierefreiheit: role="dialog" mit Fokusfalle, jeder Schrittwechsel wird
 * angesagt, Fortschritt ist als Text vorhanden (nicht nur als Punkte),
 * und der Einstieg laesst sich jederzeit ueberspringen.
 */

const STEP_COUNT = 5;

export default function OnboardingModal({
  name,
  onNameChange,
  settings,
  onSettingsChange,
  onFinish,
  announce,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Fokusfalle + Fokus auf die Ueberschrift bei jedem Schrittwechsel,
  // damit Screenreader-Nutzer den neuen Inhalt sofort hoeren.
  useEffect(() => {
    const t = setTimeout(() => headingRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, select, [tabindex="0"]',
      );
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
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(STEP_COUNT - 1, next));
    setStep(clamped);
    announce(`Schritt ${clamped + 1} von ${STEP_COUNT}.`, true);
  };

  const update = (patch: Partial<AccessibilitySettings>) =>
    onSettingsChange({ ...settings, ...patch });

  const titles = [
    "Willkommen bei RV Mobil",
    "Wie heißen Sie?",
    "Sehen und Hören",
    "So erfassen Sie am schnellsten",
    "Ihre Daten bleiben bei Ihnen",
  ];

  const OptionButton = ({
    active,
    onClick,
    children,
    ariaLabel,
  }: {
    key?: React.Key;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    ariaLabel?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-color)]"
          : "border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-muted)] hover:border-[var(--accent)]/50"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-[var(--modal-bg)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        ref={dialogRef}
        className="bg-[var(--card-bg)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[92vh]"
      >
        {/* Fortschritt: als Text UND als Balken, nicht nur als Punkte */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-[0.75rem] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Schritt {step + 1} von {STEP_COUNT}
          </p>
          <div
            className="h-2 w-full rounded-full bg-[var(--bg-color)] border border-[var(--border-color)] overflow-hidden"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEP_COUNT}
            aria-valuenow={step + 1}
            aria-label={`Einrichtung: Schritt ${step + 1} von ${STEP_COUNT}`}
          >
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
            />
          </div>
        </div>

        <div className="px-5 pb-2 overflow-y-auto flex-1">
          <h2
            id="onboarding-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-black tracking-tight text-[var(--text-color)] mb-3 outline-none"
          >
            {titles[step]}
          </h2>

          {step === 0 && (
            <div className="space-y-3 text-sm text-[var(--text-color)] leading-relaxed">
              <div className="flex justify-center py-2">
                <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                  <Zap className="w-8 h-8" aria-hidden="true" />
                </div>
              </div>
              <p>
                Diese App ersetzt den Monatsreport in Excel. Sie tragen Ihre Zahlen{" "}
                <strong>direkt nach dem Termin</strong> ein – auf dem Handy, in wenigen
                Sekunden.
              </p>
              <p className="text-[var(--text-muted)]">
                Am Monatsende müssen Sie nichts mehr zusammensuchen: Der Bericht ist
                fertig und geht per Excel-Datei an die Vertriebsleitung.
              </p>
              <p className="text-[var(--text-muted)]">
                Die Einrichtung dauert etwa eine Minute. Sie können alles später unter
                „Optionen“ ändern.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex justify-center py-1">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                  <User className="w-7 h-7" aria-hidden="true" />
                </div>
              </div>
              <p className="text-sm text-[var(--text-color)] leading-relaxed">
                Ihr Name erscheint auf jedem Bericht, den Sie an die Vertriebsleitung
                senden. Sie müssen ihn nur einmal eintragen.
              </p>
              <label
                htmlFor="onboarding-name"
                className="block text-[0.75rem] font-black uppercase tracking-wider text-[var(--text-muted)]"
              >
                Name (Mitarbeiter/in)
              </label>
              <input
                id="onboarding-name"
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Vor- und Nachname"
                autoComplete="name"
                className="w-full px-3 py-3 min-h-[48px] rounded-xl border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] font-bold focus:border-[var(--border-focus)] outline-none"
              />
              <p className="text-[0.75rem] text-[var(--text-muted)]">
                Der Name bleibt auf diesem Gerät. Sie können ihn später jederzeit oben im
                Formular ändern.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-color)] leading-relaxed">
                Stellen Sie die App so ein, wie Sie am besten damit arbeiten.
              </p>

              <div>
                <p className="text-[0.75rem] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" aria-hidden="true" /> Schriftgröße
                </p>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Schriftgröße wählen">
                  {([
                    ["normal", "Normal"],
                    ["large", "Groß"],
                    ["extra-large", "Extra groß"],
                  ] as const).map(([val, label]) => (
                    <OptionButton
                      key={val}
                      active={settings.fontSize === val}
                      onClick={() => {
                        update({ fontSize: val });
                        announce(`Schriftgröße ${label} gewählt.`, true);
                      }}
                    >
                      {label}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[0.75rem] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Farben
                </p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Farbschema wählen">
                  {([
                    ["light", "Hell"],
                    ["dark", "Dunkel"],
                    ["high-contrast-dark", "Hoher Kontrast"],
                    ["high-contrast-yellow", "Gelb auf Schwarz"],
                  ] as const).map(([val, label]) => (
                    <OptionButton
                      key={val}
                      active={settings.theme === val}
                      onClick={() => {
                        update({ theme: val as AccessibilityTheme });
                        announce(`Farbschema ${label} gewählt.`, true);
                      }}
                    >
                      {label}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[0.75rem] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" /> Sprachansagen
                </p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Sprachansagen wählen">
                  <OptionButton
                    active={settings.screenReaderNarration === true}
                    onClick={() => {
                      update({ screenReaderNarration: true });
                      announce("Sprachansagen eingeschaltet.", true);
                    }}
                  >
                    An
                  </OptionButton>
                  <OptionButton
                    active={settings.screenReaderNarration === false}
                    onClick={() => {
                      update({ screenReaderNarration: false });
                      announce("Sprachansagen ausgeschaltet.", true);
                    }}
                  >
                    Aus
                  </OptionButton>
                </div>
                <p className="text-[0.75rem] text-[var(--text-muted)] mt-2">
                  Die App liest Eingaben dann zusätzlich laut vor. Wenn Sie bereits einen
                  Screenreader wie NVDA, JAWS oder VoiceOver nutzen, lassen Sie dies
                  normalerweise <strong>aus</strong> – sonst hören Sie alles doppelt.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm text-[var(--text-color)] leading-relaxed">
              <div className="flex justify-center py-1">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                  <Zap className="w-7 h-7" aria-hidden="true" />
                </div>
              </div>
              <p>
                Ganz oben im Bericht finden Sie die <strong>Schnell-Erfassung</strong>:
                große Tasten für Ihre wichtigsten Kategorien.
              </p>
              <p>
                <strong>Ein Tipp = plus eins</strong>, mit Ton und kurzer Vibration als
                Bestätigung. Mehr braucht es nach einem Termin nicht.
              </p>
              <p className="text-[var(--text-muted)]">
                Welche Tasten dort erscheinen, richtet sich automatisch danach, was Sie am
                häufigsten nutzen. Sie können sie aber auch selbst festlegen.
              </p>
              <div className="p-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-[0.75rem] text-[var(--text-muted)]">
                <strong className="text-[var(--text-color)]">Tipp:</strong> Wenn Sie die App
                auf dem Startbildschirm installieren und das Symbol gedrückt halten, springen
                Sie direkt zur Erfassung oder zur Stempeluhr.
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 text-sm text-[var(--text-color)] leading-relaxed">
              <div className="flex justify-center py-1">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-7 h-7" aria-hidden="true" />
                </div>
              </div>
              <p>
                Alle Daten bleiben <strong>ausschließlich auf diesem Gerät</strong>. Es gibt
                keinen Server, kein Konto und keine Übertragung im Hintergrund.
              </p>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 text-[var(--text-color)]">
                <p className="font-bold mb-1">Das bedeutet aber auch:</p>
                <p className="text-[0.8125rem]">
                  Wenn Sie die Browserdaten löschen oder das Gerät verlieren, sind die Daten
                  weg. Erstellen Sie deshalb ab und zu ein Backup unter{" "}
                  <strong>Optionen → Datensicherung</strong>.
                </p>
              </div>
              <p className="text-[var(--text-muted)]">
                Wenn Sie am PC und am Handy arbeiten möchten, können Sie beide Geräte unter
                <strong> Optionen → Geräte-Sync</strong> koppeln – ebenfalls ohne Server.
              </p>
            </div>
          )}
        </div>

        {/* Steuerung */}
        <div className="p-5 pt-3 border-t border-[var(--border-color)] space-y-2.5">
          <div className="flex gap-2.5">
            {step > 0 && (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                className="min-h-[48px] px-4 rounded-xl font-bold border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Zurück
              </button>
            )}
            {step < STEP_COUNT - 1 ? (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                className="flex-1 min-h-[48px] px-4 rounded-xl font-black bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Weiter
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinish}
                className="flex-1 min-h-[48px] px-4 rounded-xl font-black bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                Los geht's
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onFinish}
            className="w-full min-h-[44px] text-sm font-semibold text-[var(--text-muted)] hover:underline cursor-pointer"
          >
            Einrichtung überspringen
          </button>
        </div>
      </div>
    </div>
  );
}
