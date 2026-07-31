/**
 * Akustisches Feedback für Zähler-Interaktionen (aus CounterField extrahiert,
 * damit auch die Schnell-Erfassung dieselben Töne nutzt).
 */
export const playAudioFeedback = (
  enabled: boolean,
  type: "up" | "down" | "clear",
  currentNumVal?: number,
) => {
  if (!enabled) return;
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
