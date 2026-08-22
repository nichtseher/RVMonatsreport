export interface FieldConfig {
  id: string;
  label: string;
  step: number;
  isCustom?: boolean;
  icon?: string;
}

export interface SectionsConfig {
  s1: FieldConfig[];
  s2: FieldConfig[];
  s3: FieldConfig[];
  s4: FieldConfig[];
}

export interface TimeLog {
  id: string;
  date: string; // "YYYY-MM-DD"
  clockIn: string; // "HH:MM"
  clockOut: string; // "HH:MM"
  breakMinutes: number; // e.g. 45
  duration: number; // hours worked (excluding breaks, e.g. 7.75)
  officeRatio: number; // e.g. 0.5 (50% Office, 50% Field)
  officeHours: number; // e.g. 3.875
  fieldHours: number; // e.g. 3.875
  notes?: string;
}

export interface YearlyCarryover {
  regularVacationEntitlement: number; // e.g. 30
  additionalVacationEntitlement: number; // e.g. 5 (Zusatzurlaub)
  vacationCarryover: number; // e.g. 2 (Resturlaub / Übertrag)
  overtimeCarryover: number; // e.g. 15.5 (Überstunden-Übertrag in h)
  dailyTargetHours: number; // e.g. 8.0
  updatedAt?: string; // ISO-Zeitstempel für den Geräte-Sync (neuerer Stand gewinnt)
}

/**
 * Zeitstempel je Zählerfeld (Feld-ID -> ISO-Zeit der letzten Änderung).
 *
 * Warum feldweise: Beim Geräte-Abgleich gewann bisher pro Monat der gesamte
 * Datensatz mit dem jüngeren Zeitstempel. Tippten beide Geräte innerhalb
 * desselben Abgleich-Fensters etwas ein, verschwand die Eingabe des einen
 * Geräts vollständig und ohne Hinweis (reproduziert am 2026-08-02).
 * Mit Zeitstempeln je Feld werden nur noch Änderungen am *selben* Feld
 * gegeneinander abgewogen.
 */
export type ValueTimestamps = Record<string, string>;

export interface ReportData {
  month: string;
  name: string;
  notes: string;
  values: Record<string, number | "">;
  /** Fehlt bei Daten aus älteren Versionen -- dann gilt savedAt des Monats. */
  valuesUpdatedAt?: ValueTimestamps;
  timeLogs?: TimeLog[];
}

export interface HistoryRecord {
  month: string;
  name: string;
  notes: string;
  values: Record<string, number | "">;
  /** Fehlt bei Daten aus älteren Versionen -- dann gilt savedAt. */
  valuesUpdatedAt?: ValueTimestamps;
  fieldsSnapshot?: SectionsConfig;
  savedAt: string;
  timeLogs?: TimeLog[];

  /**
   * Wann der Monat an die Vertriebsleitung ging (ISO-Zeit). Fehlt = noch nicht
   * raus. Wird beim Export automatisch gesetzt -- aber nur, wenn die Datei
   * wirklich geteilt oder heruntergeladen wurde; ein abgebrochener
   * Teilen-Dialog markiert nichts.
   */
  sentAt?: string;
  /**
   * Wann die Versand-Markierung zuletzt geändert wurde.
   *
   * Warum ein EIGENER Zeitstempel und nicht `savedAt`: `savedAt` wandert bei
   * jeder Änderung am Monat weiter. Markiert Gerät A den Monat als versendet
   * und tippt Gerät B danach eine Zahl, hätte B den jüngeren `savedAt` -- und
   * die Markierung von A verschwände spurlos. Das ist derselbe Fehler, der bis
   * 0.9.0 die Zählerstände getroffen hat (siehe ValueTimestamps).
   */
  sentUpdatedAt?: string;
}

export type AccessibilityTheme =
  | "light"
  | "dark"
  | "high-contrast-dark"
  | "high-contrast-yellow";

export interface AccessibilitySettings {
  theme: AccessibilityTheme;
  fontSize: "normal" | "large" | "extra-large";
  screenReaderNarration: boolean;
  audioFeedback: boolean;
  speechRate: number;
  enableTimeTracking?: boolean;
  desktopLayout?: boolean;
}
