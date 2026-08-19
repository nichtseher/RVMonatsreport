import React, { useRef } from "react";
import { FieldConfig } from "../types";
import { Plus, Minus } from "lucide-react";
import { getIconForString } from "../utils/iconMap";
import { playAudioFeedback as playAudioFeedbackShared } from "../utils/audioFeedback";

interface CounterFieldProps {
  key?: React.Key;
  config: FieldConfig;
  value: number | "";
  onChange: (val: number | "") => void;
  /** Ändert den Zähler und gibt den neuen Wert synchron zurück (verlustfrei bei schnellem Tippen) */
  onDelta: (delta: number) => number;
  onAnnounce: (message: string, immediate?: boolean, fieldId?: string, newValue?: number | "") => void;
  audioFeedbackEnabled: boolean;
  isCompact?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default React.memo(function CounterField({
  config,
  value,
  onChange,
  onDelta,
  onAnnounce,
  audioFeedbackEnabled,
  isCompact = false,
  onFocus,
  onBlur
}: CounterFieldProps) {
  const inputId = `input-${config.id}`;
  const instructionsId = `${inputId}-instructions`;
  const displayVal = value === "" ? "" : value;
  const currentNumericValue = typeof value === "number" ? value : 0;

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
  };

  const playAudioFeedback = (type: "up" | "down" | "clear", currentNumVal?: number) => {
    playAudioFeedbackShared(audioFeedbackEnabled, type, currentNumVal);
  };

  const handleIncrement = () => {
    triggerHaptic();
    // Wert kommt synchron zurück, damit auch schnelles Tippen jede Zählung erfasst
    const newVal = onDelta(config.step);
    playAudioFeedback("up", newVal);
    onAnnounce(`${config.label}: erhöht auf ${newVal}`, false, config.id, newVal);
  };

  const handleDecrement = () => {
    triggerHaptic();
    const newVal = onDelta(-config.step);
    playAudioFeedback("down", newVal);
    onAnnounce(
      `${config.label}: verringert auf ${newVal === 0 ? "null" : newVal}`,
      false,
      config.id,
      newVal === 0 ? "" : newVal,
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === "") {
      onChange("");
      playAudioFeedback("clear");
      onAnnounce(`${config.label}: geleert`, false, config.id, "");
      return;
    }
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed >= 0) {
      const fixedVal = parseFloat(parsed.toFixed(1));
      onChange(fixedVal);
      playAudioFeedback("up", fixedVal);
      onAnnounce(`${config.label}: geändert auf ${fixedVal}`, false, config.id, fixedVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleDecrement();
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Find all spinbuttons currently visible on the page
      const inputs = Array.from(document.querySelectorAll('input[role="spinbutton"]')) as HTMLInputElement[];
      const currentIndex = inputs.indexOf(e.currentTarget);
      if (currentIndex !== -1) {
        if (e.shiftKey) {
          // Shift + Enter: previous input
          const prevInput = inputs[currentIndex - 1] || inputs[inputs.length - 1];
          if (prevInput) {
            prevInput.focus();
            prevInput.select();
          }
        } else {
          // Enter: next input
          const nextInput = inputs[currentIndex + 1] || inputs[0];
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }
      }
    }
  };

  const handleQuickChange = (dir: 1 | -1) => {
    triggerHaptic();
    const newVal = onDelta(dir * 5 * config.step);
    playAudioFeedback(dir > 0 ? "up" : "down", newVal);
    onAnnounce(
      `${config.label}: Schnelländerung auf ${newVal === 0 ? "null" : newVal}`,
      false,
      config.id,
      newVal === 0 ? "" : newVal,
    );
  };

  const parentPadding = isCompact ? "py-1.5 gap-2" : "py-4 gap-3";
  const labelSize = isCompact ? "text-sm font-bold" : "text-base font-bold";
  // Bedienflaechen bewusst in festen Pixeln statt in rem: Sie enthalten nur
  // Symbole, keinen Text. Mit rem wuchsen sie bei "Grosse Schrift" mit --
  // die Zeile wurde dann breiter als die Karte und die Minus-Taste rutschte
  // auf einem 360-px-Handy bis zu 163 px aus dem Bildschirm heraus (gemessen).
  // min-w: Auf sehr schmalen Geraeten (320 px) duerfen auch Plus und Minus
  // etwas nachgeben, statt aus der Karte zu ragen. Ueberall sonst 56 px.
  const buttonSize = isCompact
    ? "w-[44px] h-[44px] min-w-[44px]"
    : "w-[64px] h-[56px] min-w-[52px]";
  /*
    Die Fuenferschritte duerfen als Einzige schrumpfen (44 -> 36 px), damit die
    Zeile auch bei "Extra grosse Schrift" auf einem schmalen Handy EINE Zeile
    bleibt. Sie sind reine Bequemlichkeit fuer sehende Touch-Nutzer
    (aria-hidden, nicht im Tab-Lauf) -- ein Umbruch dort ist schlimmer als
    36 px, und die verbindliche WCAG-Grenze von 24 px bleibt weit uebertroffen.
    Wo Platz ist, sind es unveraendert 44 px.
  */
  const quickButtonSize = isCompact
    ? "w-[36px] h-[36px] min-w-[32px] text-[0.75rem]"
    : "w-[48px] h-[56px] min-w-[40px] text-xs";
  const iconSize = isCompact ? "w-4 h-4" : "w-6 h-6";
  // Die Zahl selbst ist Text und MUSS mitwachsen (WCAG 1.4.4), darf dafuer
  // aber schrumpfen, wenn der Platz knapp wird.
  // Feste Hoehe statt Innenabstand: Mit py-3 wuchs das Zahlenfeld mit der
  // Schriftgroesse mit (gemessen 52 / 64 / 76 px) und war dadurch mal
  // niedriger, mal deutlich hoeher als die Tasten daneben -- die Zeile wirkte
  // dadurch unruhig. Die Zahl selbst skaliert weiterhin.
  const inputSize = isCompact ? "h-[44px] text-base rounded-lg" : "h-[56px] text-xl rounded-xl";

  return (
    <div 
      /* Innenabstand in Pixeln: Er muss nicht mit der Schriftgroesse wachsen
         und nahm der Bedienzeile sonst genau den Platz weg, den sie braucht. */
      /* Flaeche und Rahmen aus dem Theme statt aus fester Palette: Die
         Rahmenfarbe der Bedienelemente ist gegen --bg-color auf 3:1 abgestimmt
         (WCAG 1.4.11). Auf dem alten slate-Hintergrund kam sie nur auf
         2,55-2,98:1 -- die Tastenumrisse waren zu schwach. */
      className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl bg-[var(--bg-color)] p-[10px] sm:p-4 border border-[var(--border-color)]/40 transition-all focus-within:ring-2 focus-within:ring-[var(--border-focus)] hover:border-[var(--border-focus)] gap-3`}
    >
      <div className="flex-1 pr-2 min-w-0">
        <label 
          id={`label-${config.id}`} 
          htmlFor={inputId} 
          className={`${labelSize} text-[var(--text-color)] flex items-start gap-2.5 leading-snug`}
        >
          {(() => {
            const Icon = getIconForString(config.icon);
            {/* Theme-Farbe statt fester Palettenfarbe: Das Symbol soll dem
                gewählten Farbschema folgen -- gerade im Hochkontrast-Modus. */}
            if (Icon) return <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--accent)]" aria-hidden="true" />;
            if (config.icon) return <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">{config.icon}</span>;
            return null;
          })()}
          <span className="min-w-0 break-words">{config.label}</span>
        </label>
        {config.isCustom && (
          <span className="inline-block mt-1 text-[0.75rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--cat-3-soft)] text-[var(--cat-3-text)]">
            Eigene Kategorie
          </span>
        )}
      </div>

      {/*
        Bedienzeile: "-5  -  Zahl  +  +5" -- auf JEDEM Geraet in derselben
        Reihenfolge.

        Bis 0.9.6 waren die Fuenferschritte auf dem Handy per CSS-order ans
        Ende gestellt (-, Zahl, +, -5, +5), damit ein Umbruch sauber trennt.
        Praxis-Rueckmeldung vom iPhone: Es bricht bei ueblicher Schriftgroesse
        gar nicht um, man sah nur eine andere Reihenfolge als am PC -- das
        "-5" stand rechts vom Plus. Deshalb jetzt ueberall gleich; der Umbruch
        bleibt als Notnagel fuer sehr schmale Geraete mit sehr grosser Schrift.
      */}
      <div className="flex flex-nowrap items-center justify-center gap-[4px] sm:gap-2 w-full sm:w-auto sm:justify-end select-none">
        {/* Quick -5 Button (Hidden from screen-readers to avoid cluttering tab order/swipe sequence for blind users) */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => handleQuickChange(-1)}
          className={`${quickButtonSize} rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--danger)] font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center touch-manipulation`}
        >
          -5
        </button>

        {/* Decrement Button (Optimized for Touch-Only) */}
        <button
          type="button"
          onClick={handleDecrement}
          aria-label="Verringern"
          /* Gleiche Form und gleiches Gewicht wie die uebrigen Tasten. Vorher
             ein dunkler Kreis aus fester Palettenfarbe (slate-800): Im dunklen
             Schema war das Minus kaum vom Kartenhintergrund zu unterscheiden,
             waehrend das Plus als leuchtender Kreis danebenstand. */
          className={`${buttonSize} rounded-xl flex items-center justify-center border-2 border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] font-bold transition-all cursor-pointer focus-visible:ring-4 active:scale-95 active:bg-[var(--border-color)] touch-manipulation`}
        >
          <Minus className={iconSize} aria-hidden="true" />
        </button>

        {/* Input Spinbox (Optimized Keyboard for Touch) */}
        {/* Grenzen in Pixeln, nicht in rem: rem waechst mit der
            Schrifteinstellung mit, dadurch sprengte gerade "Extra gross" die
            Zeile. Die Zahl selbst skaliert weiterhin (WCAG 1.4.4). */}
        <div className="relative flex-1 min-w-[56px] max-w-[72px] sm:flex-none sm:w-20 sm:max-w-none">
          <input
            id={inputId}
            type="number"
            role="spinbutton"
            step={config.step}
            inputMode={config.step % 1 === 0 ? "numeric" : "decimal"}
            min="0"
            max="999"
            value={displayVal}
            aria-label={config.label}
            aria-describedby={instructionsId}
            aria-valuemin={0}
            aria-valuemax={999}
            aria-valuenow={typeof value === "number" ? value : undefined}
            aria-valuetext={displayVal === "" ? "leer" : `${displayVal} Einheiten`}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              e.target.select();
              if (onFocus) onFocus();
            }}
            onBlur={onBlur}
            placeholder="0"
            className={`${inputSize} w-full text-center font-black border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] focus:border-[var(--border-focus)] outline-none touch-manipulation`}
          />
          <p id={instructionsId} className="sr-only">
            {`Eingabefeld für ${config.label}. Verwenden Sie die Pfeiltasten oder die Plus- und Minus-Tasten. Mit Enter springen Sie zum nächsten Feld.`}
          </p>
        </div>

        {/* Increment Button (Optimized for Touch-Only) */}
        <button
          type="button"
          onClick={handleIncrement}
          aria-label="Erhöhen"
          /* Einzige gefuellte Taste der Zeile: Ein Tipp = plus eins ist die
             haeufigste Handlung und darf als einzige hervorstechen. */
          className={`${buttonSize} rounded-xl flex items-center justify-center border-2 border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-text)] font-bold transition-all cursor-pointer focus-visible:ring-4 active:scale-95 active:opacity-85 touch-manipulation`}
        >
          <Plus className={iconSize} aria-hidden="true" />
        </button>

        {/* Quick +5 Button (Hidden from screen-readers to avoid cluttering tab order/swipe sequence for blind users) */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => handleQuickChange(1)}
          className={`${quickButtonSize} rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--accent)] font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center touch-manipulation`}
        >
          +5
        </button>
      </div>
    </div>
  );
});
