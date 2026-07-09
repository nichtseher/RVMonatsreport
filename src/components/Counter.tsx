import React from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "../utils";

interface CounterProps {
  label: string;
  icon?: string;
  value: number;
  step: number;
  onChange: (val: number) => void;
}

export function Counter({ label, icon, value, step, onChange }: CounterProps) {
  const handleInc = () => onChange(value + step);
  const handleDec = () => onChange(Math.max(0, value - step));

  return (
    <div className="flex flex-col p-3 sm:p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl sm:rounded-2xl shadow-sm transition-all hover:shadow-md relative overflow-hidden">
      <div className="flex items-start gap-2 mb-4">
        {icon && <span className="text-xl sm:text-2xl mt-0.5" aria-hidden="true">{icon}</span>}
        <h3 className="text-[13px] sm:text-sm font-medium leading-tight text-zinc-900 dark:text-zinc-100 flex-1">{label}</h3>
      </div>
      
      <div className="flex items-center justify-between mt-auto bg-zinc-50 dark:bg-zinc-950 p-1 rounded-2xl">
        <button
          onClick={handleDec}
          disabled={value <= 0}
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
          aria-label={`${label} verringern`}
        >
          <Minus className="w-5 h-5" />
        </button>
        
        <div className="text-xl sm:text-2xl font-bold tabular-nums text-zinc-900 dark:text-white px-1 sm:px-2">
          {value}
        </div>
        
        <button
          onClick={handleInc}
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shrink-0 shadow-sm"
          aria-label={`${label} erhöhen`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
