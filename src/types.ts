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
}

export interface ReportData {
  month: string;
  name: string;
  notes: string;
  values: Record<string, number | "">;
  timeLogs?: TimeLog[];
}

export interface HistoryRecord {
  month: string;
  name: string;
  notes: string;
  values: Record<string, number | "">;
  fieldsSnapshot?: SectionsConfig;
  savedAt: string;
  timeLogs?: TimeLog[];
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
}
