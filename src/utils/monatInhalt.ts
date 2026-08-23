import { TimeLog } from "../types";

/**
 * Hat dieser Monat echten Inhalt -- also etwas, das verloren gehen koennte?
 *
 * Entscheidet, ob ein Monat ueberhaupt ins RV Archiv wandert. Wird an zwei
 * Stellen gebraucht (automatisches Spiegeln und Monatswechsel), lag bis 0.9.15
 * auf Modulebene in `App.tsx`.
 *
 * DER NAME ZAEHLT BEWUSST NICHT DAZU: Er wird beim Monatswechsel automatisch
 * mitgenommen, dadurch galt jeder frische Monat sofort als "hat Daten" und
 * landete leer im Archiv. Die Liste fuellte sich mit Eintraegen "Zaehler: 0",
 * und ein Rueckgaengig nach dem Monatsabschluss haette einen leeren Monat
 * zurueckgelassen.
 *
 * Geprueft wird auf `!== 0`, nicht auf `> 0`: Ein negativer Wert ist zwar nicht
 * vorgesehen, aber wenn einer entsteht, ist er erst recht etwas, das nicht
 * stillschweigend verschwinden darf.
 */
export const monthHasContent = (
  data?: {
    notes?: string;
    values?: Record<string, number | "">;
    timeLogs?: TimeLog[];
  } | null,
): boolean => {
  if (!data) return false;
  if (typeof data.notes === "string" && data.notes.trim() !== "") return true;
  if (Object.values(data.values || {}).some((v) => typeof v === "number" && v !== 0))
    return true;
  return Array.isArray(data.timeLogs) && data.timeLogs.length > 0;
};
