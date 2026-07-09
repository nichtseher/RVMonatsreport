import React from "react";
import { HistoryRecord } from "../types";
import { formatMonthGerman } from "../utils";
import { FileDown, RefreshCw, Trash2 } from "lucide-react";

interface ArchiveProps {
  history: Record<string, HistoryRecord>;
  onLoadMonth: (month: string) => void;
  onDeleteMonth: (month: string) => void;
  onExport: () => void;
}

export function Archive({ history, onLoadMonth, onDeleteMonth, onExport }: ArchiveProps) {
  const months = Object.values(history).sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="hidden sm:flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Archiv</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Vergangene Monate und Exporte verwalten.</p>
        </div>
        <button
          onClick={onExport}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-4 sm:py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl sm:rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg sm:shadow-sm"
        >
          <FileDown className="w-5 h-5" />
          Als Excel Exportieren
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {months.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500">
            Es sind noch keine vergangenen Monate archiviert.
          </div>
        ) : (
          months.map((record) => (
            <div key={record.month} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatMonthGerman(record.month)}
                </span>
                <span className="text-sm text-zinc-500">
                  Zuletzt gespeichert: {new Date(record.savedAt).toLocaleDateString("de-DE")}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLoadMonth(record.month)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Laden
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Diesen Monat wirklich löschen?")) {
                      onDeleteMonth(record.month);
                    }
                  }}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
