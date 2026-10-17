import { AlertTriangle } from "lucide-react";
import type { SpeicherUrteil, SicherungsUrteil } from "../utils/speicherSchutz";

/**
 * Die Hinweisleisten oben im Formular: Speicher-Schutz, Sicherungs-Erinnerung,
 * Speicher-Fehler und Abbruch der Live-Verbindung (aus `App.tsx` herausgeloest,
 * 0.9.83). Die Zustaende bleiben in `App.tsx`; hier wird nur gezeichnet.
 *
 * Abgesichert ueber `tests/hinweisleisten.spec.ts`: Dort werden alle vier
 * Leisten tatsaechlich erzeugt -- der Speicherzustand per Stub,
 * der Schreibfehler per defektem IndexedDB-Schreiben, der Verbindungsabbruch
 * ueber ein Fake-Peer im echten `liveSync`-Modul.
 */
interface Props {
  speicherUrteil: SpeicherUrteil | null;
  speicherAusgeblendet: boolean;
  onSpeicherAusblenden: () => void;
  sicherungUrteil: SicherungsUrteil | null;
  sicherungAusgeblendet: boolean;
  onSicherungAusblenden: () => void;
  storageWriteFailed: boolean;
  liveFailed: boolean;
  syncAusgeblendet: boolean;
  onSyncAusblenden: () => void;
  onNeuVerbinden: () => void;
  onBackup: () => void;
}

export default function Hinweisleisten({
  speicherUrteil,
  speicherAusgeblendet,
  onSpeicherAusblenden,
  sicherungUrteil,
  sicherungAusgeblendet,
  onSicherungAusblenden,
  storageWriteFailed,
  liveFailed,
  syncAusgeblendet,
  onSyncAusblenden,
  onNeuVerbinden,
  onBackup,
}: Props) {
  return (
    <>
      {/* SPEICHER-SCHUTZ (0.9.16)
          Der Browser darf "best effort"-Speicher jederzeit raeumen -- auf
          iOS bei nicht installierten Seiten nach sieben Tagen ohne
          Nutzung. Ohne diesen Hinweis verliert jemand einen ganzen Monat,
          ohne etwas falsch gemacht zu haben.
          Kein role="alert": Der Effekt sagt den Text bereits ueber
          announceToAriaAndSpeech an, das ergaebe sonst eine Dopplung. */}
      {speicherUrteil &&
        speicherUrteil.stufe !== "sicher" &&
        !(speicherUrteil.stufe !== "kritisch" && speicherAusgeblendet) && (
          <div
            className={`p-4 mb-4 rounded-[var(--rv-radius-lg)] border-2 flex flex-col sm:flex-row sm:items-center gap-3 ${
              speicherUrteil.stufe === "kritisch"
                ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]"
                : "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]"
            }`}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm font-medium leading-relaxed">
                {speicherUrteil.ansage}
                {speicherUrteil.rat ? " " + speicherUrteil.rat : ""}
              </p>
            </div>
            {/* Kein `whitespace-nowrap` und auf schmalen Geraeten
                gestapelt: Nebeneinander ragten die beiden Knoepfe bei
                Schriftgroesse "Extra groß" 51 px aus dem 360-px-Bildschirm
                (nachgemessen 2026-08-31). */}
            <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
              <button
                type="button"
                onClick={onBackup}
                className="px-4 py-2 min-h-[44px] flex-[1_1_auto] sm:flex-none rounded-[var(--rv-radius-md)] font-black text-sm bg-[var(--primary)] text-[var(--primary-text)] hover:brightness-110 transition-all cursor-pointer"
              >
                Jetzt sichern
              </button>
              {speicherUrteil.stufe !== "kritisch" && (
                <button
                  type="button"
                  onClick={onSpeicherAusblenden}
                  aria-label="Hinweis zum Speicherzustand ausblenden"
                  className="px-4 py-2 min-h-[44px] flex-[1_1_auto] sm:flex-none rounded-[var(--rv-radius-md)] font-black text-sm border-2 border-current hover:brightness-110 transition-all cursor-pointer"
                >
                  Ausblenden
                </button>
              )}
            </div>
          </div>
        )}

      {/* SICHERUNGS-ERINNERUNG (0.9.16)
          Getrennt von der Abgabe-Erinnerung: Die erinnert daran, den
          Bericht an die VL zu schicken -- nicht daran, die Daten gegen
          Geraeteverlust zu sichern. Fuer Letzteres gab es bis 0.9.16
          nichts. */}
      {sicherungUrteil && !sicherungAusgeblendet && (
        <div className="p-4 mb-4 rounded-[var(--rv-radius-lg)] border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium leading-relaxed">{sicherungUrteil.ansage}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
            <button
              type="button"
              onClick={onBackup}
              className="px-4 py-2 min-h-[44px] flex-[1_1_auto] sm:flex-none rounded-[var(--rv-radius-md)] font-black text-sm bg-[var(--primary)] text-[var(--primary-text)] hover:brightness-110 transition-all cursor-pointer"
            >
              Jetzt sichern
            </button>
            <button
              type="button"
              onClick={onSicherungAusblenden}
              aria-label="Später. Erinnerung an die Datensicherung ausblenden."
              className="px-4 py-2 min-h-[44px] flex-[1_1_auto] sm:flex-none rounded-[var(--rv-radius-md)] font-black text-sm border-2 border-current hover:brightness-110 transition-all cursor-pointer"
            >
              Später
            </button>
          </div>
        </div>
      )}

      {/* SPEICHER-FEHLER BANNER: bleibt sichtbar, bis ein Speichervorgang wieder klappt */}
      {storageWriteFailed && (
        <div
          role="alert"
          className="p-4 mb-4 rounded-[var(--rv-radius-lg)] border-2 border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex items-start gap-2.5 flex-1">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium leading-relaxed">
              Speichern fehlgeschlagen! Ihre letzten Änderungen sind eventuell nicht dauerhaft
              gesichert. Bitte erstellen Sie jetzt ein Backup, bevor Sie weiterarbeiten.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackup}
            className="px-4 py-2.5 min-h-[44px] rounded-[var(--rv-radius-md)] font-black text-sm bg-[var(--danger-solid)] text-[var(--danger-solid-text)] hover:brightness-110 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap"
          >
            Jetzt Backup erstellen
          </button>
        </div>
      )}

      {/* ABBRUCH DER LIVE-VERBINDUNG: sichtbarer Hinweis, weil sonst nur
          das grüne Abzeichen verschwindet und niemand es bemerkt. */}
      {liveFailed && !syncAusgeblendet && (
        <div
          role="alert"
          className="p-4 mb-4 rounded-[var(--rv-radius-lg)] border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)] flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium leading-relaxed">
              Live-Verbindung unterbrochen. Ihre Eingaben werden weiter auf
              diesem Gerät gespeichert, aber nicht mehr auf das andere Gerät
              übertragen.
            </p>
          </div>
          {/* Gestapelt auf schmalen Geraeten: Nebeneinander brauchten die
              beiden Knoepfe bei "Extra groß" 390 px in einem 356 px
              breiten Band -- 34 px Ueberlauf (nachgemessen 2026-08-31).
              Faellt nur auf, wenn eine Live-Verbindung tatsaechlich
              abreisst, und war deshalb nie jemandem aufgefallen. */}
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
            <button
              type="button"
              onClick={onNeuVerbinden}
              className="min-h-[44px] px-4 py-2 flex-[1_1_auto] sm:flex-none rounded-[var(--rv-radius-md)] font-black text-sm bg-[var(--warning-solid)] text-[var(--warning-solid-text)] hover:brightness-110 transition-all cursor-pointer focus-visible:ring-4"
            >
              Neu verbinden
            </button>
            <button
              type="button"
              onClick={onSyncAusblenden}
              aria-label="Hinweis zur unterbrochenen Live-Verbindung ausblenden"
              className="min-h-[44px] px-4 py-2 flex-[1_1_auto] sm:flex-none rounded-[var(--rv-radius-md)] font-bold text-sm border border-[var(--warning-border)] bg-[var(--bg-color)] text-[var(--text-color)] hover:bg-[var(--warning-bg)] transition-all cursor-pointer focus-visible:ring-4"
            >
              Ausblenden
            </button>
          </div>
        </div>
      )}
    </>
  );
}
