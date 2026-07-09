import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
  confirmReset: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: "",
    confirmReset: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message, confirmReset: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleHardReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  private handleSoftReset = () => {
    window.location.reload();
  };

  private handleCancelReset = () => {
    (this as any).setState({ confirmReset: false });
  };

  private handleTriggerConfirm = () => {
    (this as any).setState({ confirmReset: true });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 md:p-8 text-center border border-red-200 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
              Ein unerwarteter Fehler ist aufgetreten
            </h1>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Die App konnte leider nicht ordnungsgemäß geladen werden. Bitte versuchen Sie, die Seite neu zu laden.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-left mb-6 overflow-auto max-h-32 border border-slate-200 dark:border-slate-700">
              <code className="text-[10px] text-red-600 dark:text-red-400 font-mono">
                {this.state.errorMsg || "Unknown render error"}
              </code>
            </div>

            <div className="space-y-3">
              <button 
                onClick={this.handleSoftReset}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 px-4 rounded-xl hover:opacity-90 transition-all active:scale-95 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>App neu laden</span>
              </button>

              {this.state.confirmReset ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={this.handleHardReset}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3.5 px-4 rounded-xl border border-red-700 hover:bg-red-700 transition-all active:scale-95 text-sm"
                  >
                    <span>Sicher? Alles wird gelöscht</span>
                  </button>
                  <button 
                    onClick={this.handleCancelReset}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold py-3.5 px-4 rounded-xl hover:opacity-90 transition-all active:scale-95 text-sm"
                  >
                    <span>Abbruch</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={this.handleTriggerConfirm}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold py-3.5 px-4 rounded-xl border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-95 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Kompletten Reset durchführen</span>
                </button>
              )}
            </div>
            
            <p className="mt-5 text-[10px] text-slate-400 font-medium">
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
