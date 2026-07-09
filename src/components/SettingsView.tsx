import React from "react";
import { Moon, Sun, Trash2 } from "lucide-react";
import { AccessibilitySettings } from "../types";

interface SettingsProps {
  settings: AccessibilitySettings;
  onUpdateSettings: (settings: AccessibilitySettings) => void;
  onFactoryReset: () => void;
}

export function SettingsView({ settings, onUpdateSettings, onFactoryReset }: SettingsProps) {
  const toggleTheme = () => {
    onUpdateSettings({
      ...settings,
      theme: settings.theme === "dark" ? "light" : "dark",
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="hidden sm:flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Einstellungen</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Verwalten Sie Ansicht und Anwendungseinstellungen.</p>
      </div>

      <div className="flex flex-col gap-4">
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Erscheinungsbild</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Dunkler Modus</span>
              <span className="text-sm text-zinc-500">Augenschonendes dunkles Theme aktivieren.</span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {settings.theme === "dark" ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Gefahrenzone</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 rounded-2xl">
            <div className="flex flex-col">
              <span className="font-medium text-red-900 dark:text-red-400">Werkseinstellungen</span>
              <span className="text-sm text-red-700/80 dark:text-red-400/80">Alle eigenen Felder und Einstellungen löschen.</span>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Wirklich alles auf Standard zurücksetzen?")) {
                  onFactoryReset();
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Zurücksetzen
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
