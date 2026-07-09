import React from "react";
import { SectionsConfig, ReportData } from "../types";
import { Counter } from "./Counter";
import { formatMonthGerman } from "../utils";

interface DashboardProps {
  fields: SectionsConfig;
  reportData: ReportData;
  onValueChange: (id: string, value: number) => void;
  onNotesChange: (notes: string) => void;
}

const SECTION_TITLES = {
  s1: "Vorführungen & Auslieferungen",
  s2: "Schulung & Support",
  s3: "Spezialprodukte",
  s4: "Arbeitszeit & Büro",
};

export function Dashboard({ fields, reportData, onValueChange, onNotesChange }: DashboardProps) {
  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="hidden sm:flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {formatMonthGerman(reportData.month)}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Erfassen Sie Ihre Daten für den aktuellen Monat.
        </p>
      </div>

      {(Object.keys(fields) as Array<keyof SectionsConfig>).map((sectionKey) => {
        const sectionFields = fields[sectionKey];
        if (!sectionFields || sectionFields.length === 0) return null;

        return (
          <section key={sectionKey} className="flex flex-col gap-3 sm:gap-4">
            <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 px-1">
              {SECTION_TITLES[sectionKey] || "Weitere Felder"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {sectionFields.map((field) => (
                <Counter
                  key={field.id}
                  label={field.label}
                  icon={field.icon}
                  step={field.step}
                  value={(reportData.values[field.id] as number) || 0}
                  onChange={(val) => onValueChange(field.id, val)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="flex flex-col gap-3 sm:gap-4 mt-4">
        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 px-1">
          Notizen
        </h3>
        <textarea
          value={reportData.notes || ""}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Zusätzliche Anmerkungen oder Besonderheiten..."
          className="w-full min-h-[120px] p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl resize-y text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 transition-all text-base"
        />
      </section>
    </div>
  );
}
