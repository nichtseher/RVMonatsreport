import React, { useState, useEffect } from "react";
import { Clock, Play, Square, Trash2 } from "lucide-react";
import { TimeLog } from "../types";

interface TimeTrackerProps {
  clockInTime: string | null;
  onClockIn: () => void;
  onClockOut: (log: TimeLog) => void;
  onDeleteLog: (log: TimeLog) => void;
  logs: TimeLog[];
}

export function TimeTracker({ clockInTime, onClockIn, onClockOut, onDeleteLog, logs }: TimeTrackerProps) {
  const [elapsed, setElapsed] = useState<string>("00:00:00");

  useEffect(() => {
    if (!clockInTime) {
      setElapsed("00:00:00");
      return;
    }
    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(clockInTime);
      const diffMs = now.getTime() - start.getTime();
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [clockInTime]);

  const handleStop = () => {
    if (!clockInTime) return;
    const end = new Date();
    const start = new Date(clockInTime);
    
    // Default values for completion
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / 3600000;
    
    const newLog: TimeLog = {
      id: `log_${Date.now()}`,
      date: start.toISOString().split("T")[0],
      clockIn: start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      clockOut: end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      breakMinutes: 0,
      duration: Math.round(durationHours * 100) / 100,
      officeRatio: 0.5,
      officeHours: Math.round((durationHours * 0.5) * 100) / 100,
      fieldHours: Math.round((durationHours * 0.5) * 100) / 100,
    };
    onClockOut(newLog);
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="hidden sm:flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Zeiterfassung</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Erfassen Sie Ihre tägliche Arbeitszeit per Stempeluhr.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-6 shadow-sm">
        <div className="flex items-center gap-4 text-zinc-400">
          <Clock className="w-8 h-8" />
          <span className="text-xl font-medium uppercase tracking-widest">Stempeluhr</span>
        </div>
        
        <div className="text-6xl sm:text-7xl font-mono font-bold tabular-nums text-zinc-900 dark:text-white tracking-tighter">
          {elapsed}
        </div>

        {clockInTime ? (
          <button
            onClick={handleStop}
            className="mt-4 flex items-center gap-3 px-8 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-semibold text-lg hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Square className="w-5 h-5 fill-current" />
            Ausstempeln
          </button>
        ) : (
          <button
            onClick={onClockIn}
            className="mt-4 flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-full font-semibold text-lg hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Play className="w-5 h-5 fill-current" />
            Einstempeln
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 mt-8">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Letzte Schichten</h3>
        {logs.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500">
            Noch keine Schichten in diesem Monat erfasst.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.slice().reverse().map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <div className="flex flex-col">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {new Date(log.date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {log.clockIn} - {log.clockOut} Uhr ({log.duration} h)
                  </span>
                </div>
                <button
                  onClick={() => onDeleteLog(log)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
