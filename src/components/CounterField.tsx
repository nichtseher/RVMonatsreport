import React, { useRef } from "react";
import { FieldConfig } from "../types";
import { Plus, Minus } from "lucide-react";

interface CounterFieldProps {
  key?: React.Key;
  config: FieldConfig;
  value: number | "";
  onChange: (val: number | "") => void;
  onAnnounce: (message: string, immediate?: boolean, fieldId?: string, newValue?: number | "") => void;
  audioFeedbackEnabled: boolean;
  isCompact?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function CounterField({ 
  config, 
  value, 
  onChange, 
  onAnnounce, 
  audioFeedbackEnabled, 
  isCompact = false,
  onFocus,
  onBlur
}: CounterFieldProps) {
  const inputId = `input-${config.id}`;
  const displayVal = value === "" ? "" : value;

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
  };

  const playAudioFeedback = (type: "up" | "down" | "clear", currentNumVal?: number) => {
    if (!audioFeedbackEnabled) return;
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Calculate pitch modifier (higher value = slightly higher base pitch)
      const val = typeof currentNumVal === "number" ? currentNumVal : 0;
      const pitchOffset = Math.min(val * 15, 300); // Caps the pitch shift at +300Hz
      
      if (type === "up") {
        osc.type = "sine";
        const startFreq = 523.25 + pitchOffset; // C5 + pitch offset
        const endFreq = 880 + pitchOffset; // A5 + pitch offset
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.06); 
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === "down") {
        osc.type = "sine";
        const startFreq = 329.63 + pitchOffset; // E4 + pitch offset
        const endFreq = 220 + pitchOffset; // A3 + pitch offset
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.06); 
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
      } else {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      // Audio context might be suspended until user interaction
    }
  };

  const handleIncrement = () => {
    triggerHaptic();
    const current = typeof value === "number" ? value : 0;
    const newVal = Math.max(0, parseFloat((current + config.step).toFixed(1)));
    playAudioFeedback("up", newVal);
    onChange(newVal);
    onAnnounce(`${config.label}: erhöht auf ${newVal}`, false, config.id, newVal);
  };

  const handleDecrement = () => {
    triggerHaptic();
    const current = typeof value === "number" ? value : 0;
    const newVal = Math.max(0, parseFloat((current - config.step).toFixed(1)));
    const finalVal = newVal === 0 ? "" : newVal;
    playAudioFeedback("down", newVal);
    onChange(finalVal);
    onAnnounce(`${config.label}: verringert auf ${newVal === 0 ? "null" : newVal}`, false, config.id, finalVal);
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
    const current = typeof value === "number" ? value : 0;
    const amount = dir * 5 * config.step;
    const newVal = Math.max(0, parseFloat((current + amount).toFixed(1)));
    const finalVal = newVal === 0 ? "" : newVal;
    playAudioFeedback(dir > 0 ? "up" : "down", newVal);
    onChange(finalVal);
    onAnnounce(`${config.label}: Schnelländerung auf ${newVal === 0 ? "null" : newVal}`, false, config.id, finalVal);
  };

  const parentPadding = isCompact ? "py-1.5 gap-2" : "py-4 gap-3";
  const labelSize = isCompact ? "text-sm font-semibold" : "text-base font-semibold";
  const buttonSize = isCompact ? "w-10 h-10" : "w-14 h-14";
  const iconSize = isCompact ? "w-4 h-4" : "w-6 h-6";
  const inputSize = isCompact ? "w-16 py-1.5 text-base rounded-lg" : "w-20 py-3 text-xl rounded-xl";

  return (
    <div 
      className={`flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 last:border-b-0 ${parentPadding}`}
    >
      <div className="flex-1 pr-2">
        <label 
          id={`label-${config.id}`} 
          htmlFor={inputId} 
          className={`${labelSize} text-[var(--text-color)] flex items-start gap-2.5 leading-snug`}
        >
          {config.icon && <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">{config.icon}</span>}
          <span>{config.label}</span>
        </label>
        {config.isCustom && (
          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            Eigene Kategorie
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto select-none">
        {/* Quick -5 Button (Hidden from screen-readers to avoid cluttering tab order/swipe sequence for blind users) */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => handleQuickChange(-1)}
          className={`${isCompact ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-xs"} rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500 font-extrabold transition-all cursor-pointer active:scale-95 flex items-center justify-center touch-manipulation`}
        >
          -5
        </button>

        {/* Decrement Button (Optimized for Touch-Only) */}
        <button
          type="button"
          onClick={handleDecrement}
          aria-label="Verringern"
          className={`${buttonSize} rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-[var(--text-color)] font-bold transition-all cursor-pointer focus-visible:ring-4 active:scale-95 active:bg-slate-300 dark:active:bg-slate-700 touch-manipulation shadow-sm`}
        >
          <Minus className={iconSize} aria-hidden="true" />
        </button>

        {/* Input Spinbox (Optimized Keyboard for Touch) */}
        <div className="relative">
          <input
            id={inputId}
            type="number"
            step={config.step}
            inputMode={config.step % 1 === 0 ? "numeric" : "decimal"}
            min="0"
            max="999"
            value={displayVal}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              e.target.select();
              if (onFocus) onFocus();
            }}
            onBlur={onBlur}
            placeholder="0"
            className={`${inputSize} text-center font-black border-2 border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)] focus:border-[var(--border-focus)] outline-none touch-manipulation`}
          />
        </div>

        {/* Increment Button (Optimized for Touch-Only) */}
        <button
          type="button"
          onClick={handleIncrement}
          aria-label="Erhöhen"
          className={`${buttonSize} rounded-full flex items-center justify-center bg-[var(--primary)] text-[var(--primary-text)] font-bold transition-all cursor-pointer focus-visible:ring-4 active:scale-95 active:opacity-85 touch-manipulation shadow-sm`}
        >
          <Plus className={iconSize} aria-hidden="true" />
        </button>

        {/* Quick +5 Button (Hidden from screen-readers to avoid cluttering tab order/swipe sequence for blind users) */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => handleQuickChange(1)}
          className={`${isCompact ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-xs"} rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-emerald-500 font-extrabold transition-all cursor-pointer active:scale-95 flex items-center justify-center touch-manipulation`}
        >
          +5
        </button>
      </div>
    </div>
  );
}
