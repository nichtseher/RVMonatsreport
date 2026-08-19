import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { clear as clearIndexedDb } from "idb-keyval";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  // BEWUSSTE AUSNAHME: Überall sonst in der App ist window.confirm() durch
  // den barrierefreien ConfirmDialog ersetzt (siehe components/ConfirmDialog.tsx).
  // Hier NICHT: Das ist der Absturz-Bildschirm. Wenn der React-Zustand bereits
  // beschaedigt ist, muss der Not-Reset ohne eigene Komponenten funktionieren.
  // Das eingebaute confirm() des Browsers ist hier die robustere Wahl.
  private handleHardReset = async () => {
    if (confirm("Möchten Sie die App wirklich komplett zurücksetzen? Alle gespeicherten Daten (inkl. RV Archiv) werden gelöscht!")) {
      // Der Bericht und das RV Archiv liegen in IndexedDB (idb-keyval), nicht
      // in localStorage -- ohne clearIndexedDb() waere diese Meldung falsch
      // UND ein Absturz durch beschaedigte Archivdaten wuerde nach dem Reset
      // sofort wiederkehren.
      localStorage.clear();
      try {
        await clearIndexedDb();
      } catch (err) {
        console.error("IndexedDB-Reset fehlgeschlagen", err);
      }
      window.location.reload();
    }
  };

  private handleSoftReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-color)] flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--card-bg)] rounded-3xl shadow-2xl p-6 md:p-8 text-center border border-[var(--danger-border)]">
            <div className="w-16 h-16 bg-[var(--danger-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-[var(--danger-text)]" />
            </div>
            
            <h1 className="text-xl font-black text-[var(--text-color)] mb-2 tracking-tight">
              Ein unerwarteter Fehler ist aufgetreten
            </h1>
            
            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
              Die App konnte leider nicht ordnungsgemäß geladen werden. Bitte versuchen Sie, die Seite neu zu laden.
            </p>

            <div className="bg-[var(--bg-color)] p-3 rounded-xl text-left mb-6 overflow-auto max-h-32 border border-[var(--border-color)]">
              <code className="text-[0.75rem] text-[var(--danger-text)] font-mono">
                {this.state.errorMsg || "Unknown render error"}
              </code>
            </div>

            <div className="space-y-3">
              <button 
                onClick={this.handleSoftReset}
                className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--primary-text)] font-bold py-3.5 px-4 rounded-xl hover:opacity-90 transition-all active:scale-95 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>App neu laden</span>
              </button>

              <button 
                onClick={this.handleHardReset}
                className="w-full flex items-center justify-center gap-2 bg-[var(--danger-bg)] text-[var(--danger-text)] font-bold py-3.5 px-4 rounded-xl border border-[var(--danger-border)] hover:brightness-110 transition-all active:scale-95 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Kompletten Reset durchführen</span>
              </button>
            </div>
            
            <p className="mt-5 text-[0.75rem] text-[var(--text-muted)] font-normal">
              Ein kompletter Reset löscht alle lokalen Daten, kann aber helfen, wenn die App in einer Endlosschleife hängt.
            </p>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}
