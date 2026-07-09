import React from "react";
import { LayoutGrid, Clock, History, Settings } from "lucide-react";
import { cn } from "../utils";

interface NavigationProps {
  activeTab: "dashboard" | "time" | "archive" | "settings";
  onChange: (tab: "dashboard" | "time" | "archive" | "settings") => void;
}

export function Navigation({ activeTab, onChange }: NavigationProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "time", label: "Zeit", icon: Clock },
    { id: "archive", label: "Archiv", icon: History },
    { id: "settings", label: "Setup", icon: Settings },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 sm:relative sm:w-64 sm:border-t-0 sm:border-r sm:h-screen sm:bg-white dark:sm:bg-zinc-950 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] sm:py-0">
      <div className="flex sm:h-full sm:flex-col sm:p-4">
        <div className="hidden sm:block px-4 py-6">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Aussendienst</h1>
        </div>
        
        <div className="flex flex-1 sm:flex-col justify-around sm:justify-start px-2 sm:px-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 flex-1 sm:flex-none p-2 sm:px-4 sm:py-3 rounded-2xl sm:rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-zinc-900 dark:text-zinc-50 sm:bg-zinc-100 sm:dark:bg-zinc-900" 
                    : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 sm:hover:bg-zinc-50 sm:dark:hover:bg-zinc-900/50"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <div className={cn(
                  "flex items-center justify-center w-12 h-8 sm:w-auto sm:h-auto rounded-full transition-all duration-200",
                  isActive && "bg-zinc-100 dark:bg-zinc-800 sm:bg-transparent sm:dark:bg-transparent"
                )}>
                  <Icon className={cn("w-5 h-5 sm:w-5 sm:h-5 transition-transform duration-200", isActive && "scale-110 sm:scale-100")} />
                </div>
                <span className={cn(
                  "text-[10px] sm:text-sm font-semibold transition-all",
                  isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                )}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
