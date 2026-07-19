import React from "react";
import { ArrowLeft, Sparkles, ShieldCheck, Activity, Bug } from "lucide-react";

interface ChangelogModalProps {
  onClose: () => void;
}

export function ChangelogModal({ onClose }: ChangelogModalProps) {
  return (
    <div className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-3xl w-full border border-[var(--border-color)] p-5 md:p-8 relative shadow-lg flex flex-col gap-6 animate-fade-in pb-24">
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
        <button
          onClick={onClose}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors active:scale-95 cursor-pointer"
          aria-label="Zurück"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-[var(--accent)]" />
            Was gibt's Neues?
          </h2>
          <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">
            Version 0.2.0 Beta
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Version 0.2.0: Geräte-Synchronisation
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li><strong>Sichere Datenübertragung:</strong> Neue direkte Geräte-Synchronisation zwischen Smartphone und PC über QR-Code.</li>
            <li><strong>Ende-zu-Ende-Verschlüsselung:</strong> Alle transferierten Daten werden verschlüsselt und sicher von Gerät zu Gerät (P2P-Relay) übertragen. Ohne Server-Speicherung!</li>
            <li>Keine Accounts oder Logindaten erforderlich.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            Version 0.1.0: DevSecOps & Sicherheit
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li>Erweiterte Sicherheits-Header im Backend integriert.</li>
            <li>Sichere Datenspeicherung lokal mit IndexedDB (Local-First).</li>
            <li>XSS-Prävention durch strenge Content-Security-Policies.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-blue-500" />
            Neue Funktionen
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li>Vollständig barrierefreie Bedienung (Screenreader-optimiert).</li>
            <li>Neuer Changelog-Bereich (Was gibt's Neues).</li>
            <li>Lokale Erinnerung an die Abgabe am 8. des Monats (komplett ohne Push-Server).</li>
            <li>Geräte-Synchronisierung per QR-Code.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <Bug className="w-5 h-5 text-red-500" />
            Fehlerbehebungen
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li>Stabilitätsverbesserungen in der Zeiterfassung.</li>
            <li>Verbesserter Kontrast für Sehbehinderte.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
