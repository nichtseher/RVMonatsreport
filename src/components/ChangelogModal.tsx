import React from "react";
import { ArrowLeft, Sparkles, ShieldCheck, Activity, Bug } from "lucide-react";
import { APP_VERSION } from "../version";

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
            Installierte Version: {APP_VERSION} (Beta)
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Version 0.8.1: Farbschemata repariert & einheitliche Navigation
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li><strong>Wichtiger Fehler behoben – Farbschemata wirkten nur halb:</strong> Ein Teil der Oberfläche richtete sich nach der Einstellung Ihres Geräts statt nach dem in der App gewählten Farbschema. Dadurch konnte Text nahezu unlesbar werden – etwa wenn Sie „Hell“ wählten, Ihr Handy aber im Dunkelmodus lief. Besonders betroffen waren die Hochkontrast-Schemata. Jetzt folgt die gesamte App Ihrer Wahl.</li>
            <li><strong>Alle vier Farbschemata geprüft:</strong> In Hell, Dunkel, Hoher Kontrast und Gelb auf Schwarz erfüllen jetzt sämtliche Texte den geforderten Mindestkontrast.</li>
            <li><strong>Einheitliches Zurück:</strong> Überall führt jetzt derselbe Zurück-Pfeil oben links eine Ebene zurück. Vorher gab es teils ein Schließen-Kreuz, teils einen Pfeil – bei drei Ansichten zeigte das Symbol sogar etwas anderes an, als der Screenreader vorlas.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Version 0.8.0: Mehr Platz auf dem Handy & geführter Einstieg
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li><strong>Deutlich mehr Platz auf dem Handy:</strong> Der Kopfbereich ist nur noch halb so hoch. Dadurch sind jetzt <strong>alle Schnell-Erfassungs-Tasten sofort sichtbar</strong>, ohne zu scrollen – vorher musste man dafür erst nach unten wischen.</li>
            <li><strong>Fehler auf schmalen Android-Geräten behoben:</strong> Die Seite ließ sich seitlich verschieben, weil einzelne Elemente über den Rand hinausragten.</li>
            <li><strong>Geführter Einstieg:</strong> Beim ersten Öffnen richtet Sie die App in fünf Schritten ein – Name, Schriftgröße, Farben und Sprachansagen lassen sich sofort einstellen, statt sie in den Optionen zu suchen. Jederzeit überspringbar.</li>
            <li><strong>Größere Eingabefelder:</strong> Monat und Name sind jetzt bequemer mit dem Daumen zu treffen.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-cyan-500" />
            Version 0.7.0: Besser lesbar, besser am PC
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li><strong>Wichtiger Fehler behoben:</strong> Bei neu installierter App wurden Umlaute und Symbole falsch dargestellt („Anzahl VorfÃ¼hrungen“). Betroffen waren nur neue Installationen – vorhandene Daten blieben unberührt.</li>
            <li><strong>Schrift-Einstellung wirkt jetzt überall:</strong> Rund 80 kleine Beschriftungen hatten eine feste Größe und wuchsen nicht mit, wenn Sie „Groß“ oder „Extra groß“ einstellten. Das ist behoben – zusätzlich ist die kleinste Schrift generell größer geworden.</li>
            <li><strong>Am PC deutlich brauchbarer:</strong> Die Desktop-Ansicht mit Seitenleiste schaltet sich bei breiten Fenstern von selbst ein (vorher blieb rund zwei Drittel des Bildschirms ungenutzt). Außerdem lässt sich Text wieder markieren und kopieren, und es gibt wieder sichtbare Scrollbalken.</li>
            <li><strong>Barrierefreie Rückfragen:</strong> Sicherheitsabfragen (z. B. vor dem Löschen) nutzen keine Browser-Fenster mehr, sondern eigene Dialoge – zuverlässig vom Screenreader vorgelesen, mit Escape abbrechbar und im gewählten Farbschema. Der Startfokus liegt bewusst auf „Abbrechen“.</li>
            <li><strong>Klarere Umrandungen:</strong> Rahmen und Trennlinien waren kaum sichtbar und erfüllen jetzt die Kontrast-Norm.</li>
            <li>Neu in der Hilfe: eine Übersicht aller Tastenkürzel.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-rose-500" />
            Version 0.6.0: Verlässlicheres Zählen & Sync im Hintergrund
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li><strong>Wichtiger Fehler behoben:</strong> Bei schnellem mehrfachem Tippen auf die Plus- oder Minus-Tasten gingen Zählungen verloren (fünf Tipps zählten teilweise nur eins). Jetzt wird jeder einzelne Tipp zuverlässig erfasst – in der Schnell-Erfassung wie im Formular.</li>
            <li><strong>Live-Verbindung bleibt bestehen:</strong> Die Verbindung wird nicht mehr getrennt, wenn Sie das Sync-Fenster verlassen. Sie koppeln einmal und tragen danach ganz normal Zahlen ein – beide Geräte gleichen sich im Hintergrund ab. Ein Hinweis „Live verbunden“ oben zeigt den Status und führt zurück zur Verwaltung.</li>
            <li><strong>Hilfe korrigiert:</strong> Mehrere veraltete Beschreibungen (Namen von Knöpfen, Dateiendung des Backups, automatische Übernahme von Urlaubs- und Krankheitstagen) entsprachen nicht mehr der App und wurden richtiggestellt.</li>
            <li>Die angezeigte Versionsnummer stammt jetzt direkt aus der App und kann nicht mehr veralten.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-sky-500" />
            Version 0.5.0: Sync ohne Kamera & Abschluss-Check
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li><strong>Sync ohne Kamera:</strong> Jeder Kopplungs- und Datencode lässt sich jetzt auch kopieren und am anderen Gerät einfügen – ideal für PCs ohne Webcam (z. B. über die geteilte Zwischenablage der Windows-Handy-Kopplung).</li>
            <li><strong>Entspannte Kopplung:</strong> Der Verbindungscode hat keinen Zeitdruck; läuft der Antwort-Code ab, genügt ein Tipp auf „Neuen Antwort-Code erzeugen".</li>
            <li><strong>Monatsabschluss-Check:</strong> Vor „Bericht an VL senden" prüft die App auf typische Fehler (fehlender Name, leerer Report, Stunden passen nicht zur Stempeluhr) und fragt nach.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Version 0.4.0: Schnell-Erfassung
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li><strong>Schnell-Erfassung:</strong> Ihre meistgenutzten Kategorien als große Tasten ganz oben im Report – ein Tipp direkt nach dem Termin genügt (+1 mit Ton und Vibration). Kein Suchen, kein Scrollen.</li>
            <li><strong>Selbst konfigurierbar:</strong> Unter „Anpassen" wählen Sie automatisch (meistgenutzt) oder bis zu 8 eigene Kategorien in Wunsch-Reihenfolge.</li>
            <li><strong>App-Shortcuts:</strong> App-Symbol gedrückt halten → direkt „Zahlen erfassen" oder „Stempeluhr" öffnen.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            Version 0.3.0: Live-Sync & Zusammenführen
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-semibold text-[var(--text-muted)]">
            <li><strong>Live-Verbindung:</strong> PC und Handy koppeln sich per QR-Code und gleichen sich dann automatisch ab – Sie können an beiden Geräten gleichzeitig arbeiten (gleiches WLAN, direkt von Gerät zu Gerät, ohne Server).</li>
            <li><strong>Intelligentes Zusammenführen:</strong> Der Sync überschreibt nicht mehr alles – Archiv, Schichten und eigene Kategorien beider Geräte werden vereinigt. Beim QR-Empfang können Sie zwischen Zusammenführen (empfohlen) und Ersetzen wählen.</li>
            <li><strong>Fehlerbehebungen:</strong> Importierte Daten bleiben jetzt auch nach dem Neuladen erhalten; Stempeluhr bucht Nachtschichten auf das richtige Datum; Sicherheitsupdate der Excel-Bibliothek.</li>
          </ul>
        </div>

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
