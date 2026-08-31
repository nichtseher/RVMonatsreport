import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2, Download } from "lucide-react";
import { clear as clearIndexedDb } from "idb-keyval";
import { ladeRettungsPaketHerunter } from "./utils/speicherSchutz";

interface Props {
  children?: ReactNode;
}

type Rettung = "bereit" | "laeuft" | "fertig" | "fehler";

interface State {
  hasError: boolean;
  errorMsg: string;
  rettung: Rettung;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: "",
    rettung: "bereit"
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message, rettung: "bereit" };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  // BEWUSSTE AUSNAHME: Überall sonst in der App ist window.confirm() durch
  // den barrierefreien ConfirmDialog ersetzt (siehe components/ConfirmDialog.tsx).
  // Hier NICHT: Das ist der Absturz-Bildschirm. Wenn der React-Zustand bereits
  // beschaedigt ist, muss der Not-Reset ohne eigene Komponenten funktionieren.
  // Das eingebaute confirm() des Browsers ist hier die robustere Wahl.
  /**
   * Daten retten, bevor irgendetwas gelöscht wird (0.9.16).
   *
   * Bis dahin bot dieser Bildschirm als einzigen Ausweg das Löschen aller
   * Daten an -- und für einen blinden Nutzer war das die einzige erreichbare
   * Taste. Gelesen wird direkt aus IndexedDB: Der React-Zustand ist hier
   * moeglicherweise beschaedigt, die gespeicherten Daten sind es meistens
   * nicht.
   */
  private handleRettung = async () => {
    this.setState({ rettung: "laeuft" });
    try {
      await ladeRettungsPaketHerunter();
      this.setState({ rettung: "fertig" });
    } catch (err) {
      console.error("Rettung der Daten fehlgeschlagen", err);
      this.setState({ rettung: "fehler" });
    }
  };

  private handleHardReset = async () => {
    if (confirm("Möchten Sie die App wirklich komplett zurücksetzen? Alle gespeicherten Daten (inkl. RV Archiv) werden gelöscht! Sichern Sie vorher Ihre Daten über die Schaltfläche \"Daten als Datei sichern\".")) {
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
              {/* STEHT BEWUSST GANZ OBEN. Wer hier landet, hat unter Umstaenden
                  einen kompletten Monat im Speicher -- und darunter stand bis
                  0.9.16 als einziger Ausweg die Taste, die alles loescht. */}
              <button
                onClick={this.handleRettung}
                disabled={this.state.rettung === "laeuft"}
                className="w-full flex items-center justify-center gap-2 bg-[var(--card-bg)] text-[var(--text-color)] font-bold py-3.5 px-4 rounded-xl border-2 border-[var(--primary)] hover:brightness-110 disabled:opacity-60 transition-all active:scale-95 text-sm"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>
                  {this.state.rettung === "laeuft"
                    ? "Daten werden gesichert…"
                    : "Daten als Datei sichern"}
                </span>
              </button>

              <p role="status" className="text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
                {this.state.rettung === "fertig" &&
                  "Ihre Daten wurden als Datei gespeichert. Sie können sie später über Optionen, Backup, Backup einspielen wieder laden."}
                {this.state.rettung === "fehler" &&
                  "Die Daten konnten nicht gesichert werden. Bitte setzen Sie die App NICHT zurück, sondern laden Sie sie zuerst neu."}
                {this.state.rettung === "bereit" &&
                  "Sichern Sie Ihre Daten, bevor Sie etwas anderes versuchen."}
              </p>

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
