import { set } from "idb-keyval";

/**
 * Die beiden Speicher-Helfer, die aus `App.tsx` herausgeloest wurden.
 *
 * Sie lagen dort auf Modulebene und wurden quer durch die Datei benutzt. Mit
 * dem Aufteilen in Hooks (0.9.14) braucht sie mehr als eine Stelle -- und ein
 * Import ist ehrlicher als ein durchgereichter Rueckruf.
 *
 * Inhaltlich unveraendert uebernommen.
 */

/**
 * Kein throw, kein "as any" -- nur eine gemeinsame Stelle fuer den Fehlerfall,
 * damit alle Archiv-Speicherpunkte gleich reagieren.
 */
export type OnPersistFailure = (context: string, err: unknown) => void;

/**
 * JEDER Schreibzugriff aufs Archiv laeuft hierueber.
 *
 * Ein verschlucktes `.catch(() => {})` bedeutet: Die Oberflaeche meldet Erfolg,
 * und nach dem naechsten Neuladen sind die Daten weg. Genau dieser Fehler
 * existierte zweimal (Backup-Wiederherstellung und Sync-Zusammenfuehrung) bis
 * 0.9.3.
 */
export const persistHistory = (
  data: Record<string, unknown>,
  onFailure: OnPersistFailure,
  context: string,
) => {
  set("aussendienst_pwa_history", data).catch((err) => onFailure(context, err));
};

/**
 * localStorage-Schreibzugriff, der ein volles Speicherkontingent nicht
 * verschluckt. Auf iOS ist das Kontingent klein genug, dass es vorkommt.
 */
export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    console.error(`Error saving to localStorage (key: ${key}):`, e);
    if (e.name === "QuotaExceededError" || e.code === 22) {
      alert(
        "Speicherlimit erreicht! Bitte exportieren Sie Ihre Daten und löschen Sie alte Monate aus dem Archiv, da sonst keine neuen Daten gespeichert werden können.",
      );
    }
  }
};
