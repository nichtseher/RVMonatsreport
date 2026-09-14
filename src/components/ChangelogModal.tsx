import { ArrowLeft, Sparkles, ShieldCheck, Activity, Bug } from "lucide-react";
import { APP_VERSION } from "../version";

interface ChangelogModalProps {
  onClose: () => void;
}

export function ChangelogModal({ onClose }: ChangelogModalProps) {
  return (
    /* break-words am Wurzelelement, weil `overflow-wrap` sich vererbt: Die
       langen Woerter stehen in den Listeneintraegen, nicht nur in den
       Ueberschriften. Gemessen mit erzwungener Verdana (Nachstellung des
       Linux-Laeufers, der "Segoe UI" nicht kennt): Einzelne <li> brauchten
       249 px in einer 164 px breiten Spalte -- "Veroeffentlichung" passt bei
       "Extra gross" nicht mehr in eine Zeile. Die Seite wuchs dadurch auf
       408 px in einem 360-px-Fenster, auf dem CI-Laeufer auf 412.
       WCAG 1.4.10 Reflow. */
    <div className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-3xl w-full border border-[var(--border-color)] p-5 md:p-8 relative shadow-lg flex flex-col gap-6 animate-fade-in pb-24 [overflow-wrap:anywhere]">
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
        <button
          onClick={onClose}
          /* flex-shrink-0: Ohne das schrumpfte die Taste als Flex-Element auf
             43 x 48 px und unterschritt damit die 44 px aus WCAG 2.5.5 -- bei
             "Extra gross" sogar auf 38 px Breite bei 72 px Hoehe. Die Breite
             war nie gewollt, sie war das Nachgeben im Flex-Container. */
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors active:scale-95 cursor-pointer"
          aria-label="Zurück"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-[var(--accent)]" />
            Was gibt's Neues?
          </h2>
          <p className="text-sm font-bold text-[var(--text-muted)] mt-1">
            Installierte Version: {APP_VERSION} (Beta)
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.40: Wartung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Interne Verbesserungen ohne sichtbare Änderung.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.39: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.9.38: Das Diktat fragt jetzt, bevor es einen fremden Dienst nutzt</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Wichtig, und wir hätten es früher sagen müssen:</strong> Das <strong>Diktat</strong> im Notizfeld läuft <strong>nicht</strong> auf Ihrem Gerät. Die Spracherkennung gehört zu Ihrem Browser, und Ihre Aufnahme wird dorthin übertragen – bei Chrome an Google, bei Safari an Apple. Die App hatte bisher an mehreren Stellen behauptet, sie nutze keine externen Dienste. Das stimmte für diesen einen Fall nicht.</li>
            <li><strong>Jetzt fragt die App einmal ausdrücklich nach</strong>, bevor das zum ersten Mal passiert – mit klarem Hinweis, was übertragen wird. Wenn Sie ablehnen, tippen Sie einfach; das Notizfeld kann alles, was das Diktat kann. Alles andere in der App bleibt weiterhin auf Ihrem Gerät.</li>
            <li><strong>Die Hilfe ist an vier weiteren Stellen richtiggestellt:</strong> wo Sie das Jahreskonto finden (auch wenn die Stempeluhr abgeschaltet ist), dass sich die Stempeluhr überhaupt abschalten lässt und wie Sie erfasste Schichten löschen, was das Tastenkürzel Alt+Umschalt+T bei abgeschalteter Uhr macht, und dass <strong>Meine Demogeräte</strong> beim Zusammenführen zweier Geräte nicht vermischt wird.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.37: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.9.36: Meine Demogeräte – Ihre eigene Geräteliste</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Neu unter Optionen → Meine Demogeräte:</strong> eine Liste der Vorführgeräte, die Sie gerade dabeihaben. Damit Sie nachsehen können, wenn jemand fragt – etwa weil ein Gerät weitergeschickt werden soll.</li>
            <li><strong>Ein freies Textfeld, keine Vorgaben.</strong> „Tactonom Pro mit Netzteil" ist genauso richtig wie „großer Koffer, grauer Griff". Dazu auf Wunsch eine Notiz. Die Liste ist <strong>freiwillig</strong> – sie soll Ihnen helfen, nicht Sie kontrollieren.</li>
            <li><strong>Die ganze Liste lässt sich vorlesen.</strong> Ein Knopf, und Sie hören, was drinsteht – der eigentliche Unterschied zu einem Zettel.</li>
            <li>Die Liste bleibt <strong>auf Ihrem Gerät</strong> und geht nicht in den Monatsreport. Sie wandert in die Datensicherung mit, damit sie einen Gerätewechsel übersteht.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.9.35: Jede Datei sagt jetzt, welches Formular drinsteckt</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Die App bringt das Formular der Vertriebsleitung in einer bestimmten Fassung mit – und sagt Ihnen jetzt, in welcher.</strong> Sie steht vor dem Senden in der Rückfrage, in der Hilfe, und in jeder erzeugten Datei: in den Dateieigenschaften und, wenn Sie alle Blätter mitschicken, sichtbar auf dem Blatt <strong>Zusatzangaben</strong>.</li>
            <li><strong>Warum das wichtig ist:</strong> Gibt die Vertriebsleitung ein <em>neues</em> Formular heraus, erkennt die App das nicht von selbst – sie würde weiter das alte ausfüllen, und die Datei sähe aus wie immer. Jetzt steht die Fassung schwarz auf weiß da, und es fällt auf. <strong>Bitte melden Sie sich, wenn Sie ein neues Formular bekommen.</strong></li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.34: Wartung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Interne Verbesserungen ohne sichtbare Änderung.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.9.33: Sie entscheiden jetzt, was die Vertriebsleitung bekommt</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Vor jedem Senden fragt die App, welche Tabellenblätter mitgehen sollen.</strong> <strong>Nur Vorlage senden</strong> schickt allein das gewohnte Formular der Vertriebsleitung – das ist die vorgeschlagene Antwort und reicht dort völlig. Mit <strong>Alle drei Blätter</strong> gehen zusätzlich Ihre Zusatzangaben und Ihre einzelnen Schichten mit. Bisher gingen immer alle drei Blätter mit, ohne dass jemand gefragt wurde. Die Frage kommt auf beiden Wegen – im Formular und beim Direkt-Export aus dem RV Archiv.</li>
            <li><strong>Warum das wichtig ist:</strong> Auf dem dritten Blatt stehen Ihre einzelnen Schichten mit Kommen, Gehen, Pause und Kommentar. Das Formular der Vertriebsleitung fragt dagegen nur nach <em>Arbeitstagen</em> und <em>Bürostunden</em> – also nach Summen. Was darüber hinausgeht, verlässt Ihr Gerät ab jetzt nur, wenn Sie es ausdrücklich möchten.</li>
            <li><strong>Das Jahreskonto war nicht mehr erreichbar, wenn Sie die Stempeluhr abgeschaltet hatten.</strong> Resturlaub und Überstunden lagen dann zwar noch auf dem Gerät, aber es führte kein Weg mehr hin – der einzige Zugang lag in der Ansicht „RV Zeit", und die wird mit der Stempeluhr ausgeblendet. Das Jahreskonto steht jetzt zusätzlich unter <strong>Optionen</strong> und hat mit der Stempeluhr nichts mehr zu tun.</li>
            <li><strong>„Stempeluhr aus" heißt jetzt wirklich aus.</strong> Bisher führte die Verknüpfung „Stempeluhr" auf dem Startbildschirm und das Tastenkürzel weiterhin in die abgeschaltete Ansicht. Beides landet jetzt im Bericht, mit Ansage.</li>
            <li><strong>Und Sie können erfasste Schichten löschen.</strong> Neu unter <strong>Optionen → Anzeige &amp; Bedienung</strong>, sobald die Stempeluhr ausgeschaltet ist: Alle Schicht-Aufzeichnungen werden vom Gerät entfernt – aus dem laufenden Monat und aus dem RV Archiv. <strong>Ihre Zählerstände im Bericht bleiben dabei unverändert</strong>, denn das sind die Zahlen, die Sie bereits gemeldet haben.</li>
            <li><strong>Unter der Haube:</strong> Die App trug zwei verschiedene Excel-Bibliotheken für dieselbe Aufgabe mit sich herum. Eine davon ist entfallen – rund 500 KB weniger, und die Zeiterfassungs-Datei sieht Zeile für Zeile unverändert aus (nachgemessen).</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.32: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.31: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.30: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.29: Verbesserungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Bedienung verbessert.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.28: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.27: Wartung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Interne Verbesserungen ohne sichtbare Änderung.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.9.26: Die Schnell-Erfassung und der Ein-Hand-Modus</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Die Kategorienliste unter „Anpassen" war kaum zu treffen.</strong> Jede Zeile war nur 34 Pixel hoch – bei einer Liste, in der Sie mit dem Finger genau die richtige Kategorie erwischen müssen. Jetzt sind alle Zeilen mindestens 44 Pixel hoch, ebenso die Schaltfläche „Automatisch (meistgenutzt)".</li>
            <li><strong>Bei „Extra groß" ließ sich diese Liste seitlich verschieben.</strong> Unbeabsichtigt und ohne sichtbaren Balken – lange Kategorienamen schoben den Inhalt zur Seite, statt umzubrechen. Jetzt brechen sie um.</li>
            <li><strong>Die vier Tasten des Ein-Hand-Modus waren zu klein.</strong> „Monat", „Name", „Notizen" und „Zeit" waren 38 Pixel hoch, „Zeit" dazu nur 53 breit. Ausgerechnet die Leiste, die das Bedienen mit einer Hand erleichtern soll. Jetzt alle in voller Größe.</li>
            <li><strong>Warum das erst jetzt auffiel:</strong> Beide Bereiche erscheinen nur nach einem Klick beziehungsweise nur, wenn der Ein-Hand-Modus eingeschaltet ist – und die automatische Prüfung hat sie deshalb nie zu Gesicht bekommen. Sie sind jetzt fest im Prüflauf.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.25: Verbesserungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Bedienung verbessert.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.24: Verbesserungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Bedienung verbessert.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.23: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.22: Verbesserungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Bedienung verbessert.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.21: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.20: Verbesserungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Bedienung verbessert.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          {/* [&>span]:min-w-0 — an allen 31 Versionsueberschriften gleich.
              Ein Flex-Element gibt seine Breite standardmaessig nicht unter
              den Inhalt preis (`min-width: auto`), die Ueberschrift konnte
              deshalb nicht umbrechen. Auf diesem Rechner fiel das nie auf:
              Mit einer breiteren Schrift -- wie sie der Linux-Laeufer statt
              "Segoe UI" waehlt -- schob sie die Seite bei "Extra gross" auf
              412 px in einem 360-px-Fenster. Nachgestellt mit erzwungener
              Verdana: 408 px. WCAG 1.4.10 Reflow. */}
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.19: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.18: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.9.17: Der Geräte-Abgleich ohne Kamera</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Das Feld zum Einfügen des Codes steht jetzt ganz oben.</strong> Bisher war es der vierte Abschnitt – unter Kamerabild, Fortschrittsbalken und Hinweistext. Wer sich die Seite vorlesen lässt, hatte dort längst aufgegeben, obwohl der Weg ohne Kamera vollständig vorhanden war.</li>
            <li><strong>Einfügen genügt.</strong> Ein gültiger Code wird sofort übernommen – Sie müssen danach keine Schaltfläche mehr suchen.</li>
            <li><strong>Die Schaltflächen heißen jetzt nach dem Ziel:</strong> „Daten an anderes Gerät senden" statt „Dieses Gerät zeigt QR-Codes an". Und der Abschnitt heißt „Einmal übertragen – auch ohne Kamera".</li>
            <li><strong>Die Ein-Minuten-Frist ist weg.</strong> Nachgemessen: Der Antwort-Code funktionierte noch nach drei Minuten. Die Frist war eine Vermutung und mit Screenreader nicht einzuhalten. Falls es doch einmal nicht klappt, erzeugen Sie einfach einen neuen Antwort-Code.</li>
            <li><strong>Eine Sicherung kann jetzt zusammengeführt werden.</strong> Bisher hat das Einspielen einer Backup-Datei alles auf dem Zielgerät überschrieben. Jetzt werden beide Stände standardmäßig vereinigt – Ersetzen bleibt möglich, ist aber eine bewusste Entscheidung mit Haken.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--danger)]" />
            <span>Version 0.9.16: Schutz vor Datenverlust</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Die App bittet den Browser jetzt darum, Ihre Daten dauerhaft zu behalten.</strong> Das hat sie vorher nie getan. Auf dem iPhone bedeutet das konkret: Wenn Sie RV Mobil nur über ein Lesezeichen benutzen, löscht Safari nach sieben Tagen ohne Nutzung alles – Bericht und Archiv. Die App sagt Ihnen das jetzt und bittet Sie, sie zum Home-Bildschirm hinzuzufügen. Danach bleiben die Daten erhalten.</li>
            <li><strong>Eine Erinnerung an die Datensicherung.</strong> Bisher gab es nur die Erinnerung, den Bericht an die VL zu schicken – nichts erinnerte daran, die Daten selbst zu sichern. Nach zwei Wochen ohne Sicherung werden Sie jetzt darauf hingewiesen.</li>
            <li><strong>Der Fehlerbildschirm löscht nicht mehr als Erstes.</strong> Wenn die App einmal abstürzt, stand dort bisher nur „alles zurücksetzen" – und das löscht sämtliche Daten. Jetzt steht darüber „Daten als Datei sichern". Die Datei lässt sich später ganz normal über Optionen → Backup wieder einspielen.</li>
            <li><strong>Nebenbei behoben:</strong> Bei der Schriftgröße „Extra groß" ragte der Hinweis auf eine abgerissene Live-Verbindung 34 Pixel über den Bildschirmrand hinaus. Die Knöpfe stehen dort jetzt untereinander.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.15: Wartung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Interne Verbesserungen ohne sichtbare Änderung.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.14: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.13: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.9.12: Sie sehen jetzt, welcher Monat noch offen ist</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Jeder Monat im RV Archiv trägt jetzt ein Abzeichen:</strong> „Gesendet" mit Datum oder „Noch offen". Es steht direkt in der Zeile – Sie müssen keinen Monat aufklappen, um zu sehen, was noch aussteht.</li>
            <li><strong>Das Abzeichen setzt sich von selbst</strong>, sobald Sie einen Monat exportiert und die Datei wirklich verschickt haben. Brechen Sie den Teilen-Dialog ab, bleibt der Monat offen – es wird nichts markiert, was Ihr Gerät nie verlassen hat.</li>
            <li><strong>Sie können es jederzeit von Hand korrigieren</strong>, in beide Richtungen. Beim Abgleich mit einem zweiten Gerät gewinnt immer die neuere Entscheidung – auch eine Rücknahme.</li>
            <li><strong>Die Löschen-Schaltfläche im RV Archiv war zu klein</strong> und bei großer Schrift nur noch 34 Pixel breit. Jetzt ist sie überall mindestens 44 Pixel groß; die Sicherheitsabfrage nimmt die ganze Zeile ein.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.9.11: Der Export ist jetzt das Formular der Vertriebsleitung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Das erste Tabellenblatt IST die Vorlage Ihrer Vertriebsleitung</strong> – nicht mehr eine eigene Darstellung davon. Gleiche Zeilen, gleiche Reihenfolge, gleiche gelbe Eingabefelder, gleiche Summenformel. Ihr Chef bekommt genau das Blatt, das er kennt.</li>
            <li><strong>Alles, wofür die Vorlage keine Zeile hat, steht auf einem zweiten Blatt</strong> – Urlaubs- und Krankheitstage, Reisezeit, Ihre eigenen Kategorien und die Summen je Bereich. So geht nichts verloren und lässt sich einzeln herauskopieren.</li>
            <li><strong>Ihre Schichten aus der Stempeluhr kommen als drittes Blatt mit</strong> in dieselbe Datei. Der getrennte Stundenzettel-Export bleibt zusätzlich bestehen.</li>
            <li><strong>Neues Feld „Anzahl Vorführungen Envision".</strong> Die Vorlage hat dafür eine eigene Zeile, in der App fehlte das Feld bisher. Es erscheint in Bereich 3 direkt hinter Tactonom – auch auf Geräten, auf denen Sie die Kategorien schon angepasst haben.</li>
            <li><strong>Der Monat steht jetzt als 08/2026 statt „August 2026"</strong>, weil die Vorlage dieses Format vorgibt.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.10: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.9: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.8: Verbesserungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Darstellung verbessert.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.7: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.6: Verbesserungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Darstellung verbessert.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.5: Wartung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Interne Verbesserungen ohne sichtbare Änderung.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.4: Wartung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Interne Verbesserungen ohne sichtbare Änderung.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.3: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.2: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.9.1: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--info-border)]" />
            <span>Version 0.9.0: Zähler bleiben erreichbar & Monatsabschluss mit Rückfrage</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Wichtiger Fehler behoben – Minus-Taste war nicht erreichbar:</strong> Mit „Große Schrift“ liefen die Zähler-Tasten auf schmalen Handys seitlich aus dem Bildschirm heraus; die Minus-Taste war dort gar nicht mehr zu sehen. Betroffen war ausgerechnet die Einstellung, die bei eingeschränktem Sehen gebraucht wird. Die Tastenreihe passt sich jetzt an und rückt bei Bedarf um.</li>
            <li><strong>Monat abschließen fragt jetzt nach:</strong> Vorher genügte ein Fehlgriff, und Sie waren im nächsten Monat. Jetzt zeigt eine Rückfrage, was gesichert wird (Zählungen, Schichten) – und danach lässt sich der Abschluss mit einem Tipp auf <strong>Rückgängig</strong> zurücknehmen.</li>
            <li><strong>Keine leeren Monate mehr im Archiv:</strong> Ein neuer Monat wurde bisher schon allein wegen des eingetragenen Namens archiviert. Ins Archiv kommt jetzt nur noch, wo wirklich etwas erfasst wurde.</li>
            <li><strong>Alle Bedienelemente mindestens 44 × 44 Pixel:</strong> 50 Schaltflächen waren kleiner als die empfohlene Fingergröße – vor allem die kleinen Umschalter und die ±5-Tasten.</li>
            <li><strong>Excel-Export vereinheitlicht:</strong> Derselbe Monat sah unterschiedlich aus, je nachdem ob Sie ihn aus dem Formular oder aus dem Archiv exportiert haben (andere Summen-Beschriftungen, fehlender Kommentarblock). Beide Wege erzeugen jetzt dieselbe Datei. Brechen Sie das Teilen ab, wird nichts mehr heimlich heruntergeladen und keine Fehlermeldung mehr angezeigt.</li>
            <li><strong>Erster Start mit Screenreader:</strong> Aus dem Einrichtungs-Assistenten konnte man mit der Tastatur versehentlich in den Hintergrund geraten. Der Fokus bleibt jetzt im Assistenten.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.8.1: Fehlerbehebungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Fehler behoben.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.8.0: Mehr Platz auf dem Handy & geführter Einstieg</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Deutlich mehr Platz auf dem Handy:</strong> Der Kopfbereich ist nur noch halb so hoch. Dadurch sind jetzt <strong>alle Schnell-Erfassungs-Tasten sofort sichtbar</strong>, ohne zu scrollen – vorher musste man dafür erst nach unten wischen.</li>
            <li><strong>Fehler auf schmalen Android-Geräten behoben:</strong> Die Seite ließ sich seitlich verschieben, weil einzelne Elemente über den Rand hinausragten.</li>
            <li><strong>Geführter Einstieg:</strong> Beim ersten Öffnen richtet Sie die App in fünf Schritten ein – Name, Schriftgröße, Farben und Sprachansagen lassen sich sofort einstellen, statt sie in den Optionen zu suchen. Jederzeit überspringbar.</li>
            <li><strong>Größere Eingabefelder:</strong> Monat und Name sind jetzt bequemer mit dem Daumen zu treffen.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.7.0: Verbesserungen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Darstellung verbessert.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.6.0: Verlässlicheres Zählen & Sync im Hintergrund</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Wichtiger Fehler behoben:</strong> Bei schnellem mehrfachem Tippen auf die Plus- oder Minus-Tasten gingen Zählungen verloren (fünf Tipps zählten teilweise nur eins). Jetzt wird jeder einzelne Tipp zuverlässig erfasst – in der Schnell-Erfassung wie im Formular.</li>
            <li><strong>Live-Verbindung bleibt bestehen:</strong> Die Verbindung wird nicht mehr getrennt, wenn Sie das Sync-Fenster verlassen. Sie koppeln einmal und tragen danach ganz normal Zahlen ein – beide Geräte gleichen sich im Hintergrund ab. Ein Hinweis „Live verbunden“ oben zeigt den Status und führt zurück zur Verwaltung.</li>
            <li><strong>Hilfe korrigiert:</strong> Mehrere veraltete Beschreibungen (Namen von Knöpfen, Dateiendung des Backups, automatische Übernahme von Urlaubs- und Krankheitstagen) entsprachen nicht mehr der App und wurden richtiggestellt.</li>
            <li>Die angezeigte Versionsnummer stammt jetzt direkt aus der App und kann nicht mehr veralten.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.5.0: Sync ohne Kamera & Abschluss-Check</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Sync ohne Kamera:</strong> Jeder Kopplungs- und Datencode lässt sich jetzt auch kopieren und am anderen Gerät einfügen – ideal für PCs ohne Webcam (z. B. über die geteilte Zwischenablage der Windows-Handy-Kopplung).</li>
            <li><strong>Entspannte Kopplung:</strong> Der Verbindungscode hat keinen Zeitdruck; läuft der Antwort-Code ab, genügt ein Tipp auf „Neuen Antwort-Code erzeugen".</li>
            <li><strong>Monatsabschluss-Check:</strong> Vor „Bericht an VL senden" prüft die App auf typische Fehler (fehlender Name, leerer Report, Stunden passen nicht zur Stempeluhr) und fragt nach.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.4.0: Schnell-Erfassung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Schnell-Erfassung:</strong> Ihre meistgenutzten Kategorien als große Tasten ganz oben im Report – ein Tipp direkt nach dem Termin genügt (+1 mit Ton und Vibration). Kein Suchen, kein Scrollen.</li>
            <li><strong>Selbst konfigurierbar:</strong> Unter „Anpassen" wählen Sie automatisch (meistgenutzt) oder bis zu 8 eigene Kategorien in Wunsch-Reihenfolge.</li>
            <li><strong>App-Shortcuts:</strong> App-Symbol gedrückt halten → direkt „Zahlen erfassen" oder „Stempeluhr" öffnen.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.3.0: Live-Sync & Zusammenführen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Live-Verbindung:</strong> PC und Handy koppeln sich per QR-Code und gleichen sich dann automatisch ab – Sie können an beiden Geräten gleichzeitig arbeiten (gleiches WLAN, direkt von Gerät zu Gerät, ohne Server).</li>
            <li><strong>Intelligentes Zusammenführen:</strong> Der Sync überschreibt nicht mehr alles – Archiv, Schichten und eigene Kategorien beider Geräte werden vereinigt. Beim QR-Empfang können Sie zwischen Zusammenführen (empfohlen) und Ersetzen wählen.</li>
            <li><strong>Fehlerbehebungen:</strong> Importierte Daten bleiben jetzt auch nach dem Neuladen erhalten; Stempeluhr bucht Nachtschichten auf das richtige Datum; Sicherheitsupdate der Excel-Bibliothek.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Version 0.2.0: Geräte-Synchronisation</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Sichere Datenübertragung:</strong> Neue direkte Geräte-Synchronisation zwischen Smartphone und PC über QR-Code.</li>
            <li><strong>Ende-zu-Ende-Verschlüsselung:</strong> Alle transferierten Daten werden verschlüsselt und sicher von Gerät zu Gerät (P2P-Relay) übertragen. Ohne Server-Speicherung!</li>
            <li>Keine Accounts oder Logindaten erforderlich.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <ShieldCheck className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Version 0.1.0: Wartung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Interne Verbesserungen ohne sichtbare Änderung.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Activity className="w-5 h-5 text-[var(--warning-border)]" />
            Neue Funktionen
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Vollständig barrierefreie Bedienung (Screenreader-optimiert).</li>
            <li>Neuer Changelog-Bereich (Was gibt's Neues).</li>
            <li>Lokale Erinnerung an die Abgabe am 8. des Monats (komplett ohne Push-Server).</li>
            <li>Geräte-Synchronisierung per QR-Code.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
            <Bug className="w-5 h-5 text-[var(--danger)]" />
            Fehlerbehebungen
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Stabilitätsverbesserungen in der Zeiterfassung.</li>
            <li>Verbesserter Kontrast für Sehbehinderte.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
