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
          <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
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
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <span>Version 0.9.6: Ruhigeres, einheitlicheres Erscheinungsbild</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Symbole folgen jetzt Ihrem Farbschema.</strong> Bisher standen an vielen Stellen Emojis. Die sehen auf jedem Gerät anders aus, bleiben im Hochkontrast-Modus bunt und werden vom Screenreader mitgelesen. Jetzt zeichnet die App überall dieselben klaren Symbole – in der Farbe Ihres gewählten Schemas und in der Größe Ihrer Schrift. <strong>Ihre Kategorien bleiben unverändert</strong>, auch selbst angelegte.</li>
            <li><strong>Weniger Unruhe in der Schrift:</strong> Statt fünf verschiedener Schriftstärken gibt es nur noch drei. Die Schrift wird dabei nirgends dünner – Überschriften und Zahlen bleiben am kräftigsten, Bedienelemente eine Stufe darunter.</li>
            <li><strong>Meldungen ohne Emojis:</strong> Hinweise wie „Eingestempelt“ enthielten Symbole, die Sprachausgaben vorgelesen haben. Die sind raus.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Version 0.9.5: Geräte-Sync abgesichert</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Fehlerhafte Codes stürzen die App nicht mehr ab:</strong> Ein unvollständig kopierter oder fremder Code führte bisher beim Übernehmen zum Fehlerbildschirm. Jetzt wird jedes empfangene Paket zuerst geprüft, und Sie bekommen im Klartext gesagt, was nicht stimmt.</li>
            <li><strong>„Alles ersetzen" fragt jetzt nach.</strong> Die folgenschwerste Aktion der App – sie überschreibt Ihr komplettes Archiv – ließ sich bisher mit einem einzigen Tipp auslösen. Die Rückfrage nennt jetzt konkret, wie viele Monate auf diesem Gerät liegen und wie viele im empfangenen Paket sind.</li>
            <li><strong>Neu: Passwortschutz für den kopierten Code.</strong> Der Textcode zum Kopieren war bisher <em>nicht</em> verschlüsselt – wer ihn hatte, konnte alle Daten lesen. Jetzt können Sie beim Senden ein Passwort vergeben; ohne das Passwort lässt sich der Code nicht mehr öffnen.</li>
            <li><strong>Ehrlichere Hinweise:</strong> Das Sync-Fenster empfahl, den Code per E-Mail zu verschicken, und versprach gleichzeitig, dass keine Daten auf fremde Server gelangen. Jetzt steht bei jedem Weg, was er wirklich bedeutet.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Version 0.9.4: Automatische Kontrolle vor jeder Veröffentlichung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>An dieser Version sehen Sie nichts – und das ist der Zweck.</strong> Bisher wurde jede Änderung unmittelbar veröffentlicht, ohne dass irgendetwas sie vorher geprüft hat. Ab jetzt laufen bei jeder Veröffentlichung 37 automatische Kontrollen; schlägt eine fehl, bleibt die bisherige Fassung online.</li>
            <li><strong>Geprüft werden die Stellen, an denen ein Fehler wirklich weh tut:</strong> das Zusammenführen zweier Geräte, die Summenformeln im Excel-Export, die Arbeitszeit-Berechnung (auch über Mitternacht) und die Verschlüsselung der Datensicherung.</li>
            <li><strong>Und der Fehler, der schon einmal unbemerkt live ging:</strong> Bei einem Bearbeitungsfehler wurden früher alle Umlaute und Symbole in den Kategorienamen zerstört – sichtbar nur für neu installierte Geräte. Genau darauf wird jetzt bei jeder Veröffentlichung geprüft.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-cyan-500" />
            <span>Version 0.9.3: Schnellerer Start, ehrlichere Meldungen, korrigierte Hilfe</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Die App startet spürbar schneller:</strong> Geräte-Sync und Datensicherung werden erst geladen, wenn Sie sie öffnen. Beim Start muss dadurch nur noch weniger als die Hälfte an Daten geladen werden – hilfreich bei schlechtem Empfang.</li>
            <li><strong>Wichtiger Fehler behoben:</strong> Beim Einspielen einer Datensicherung und beim Zusammenführen zweier Geräte meldete die App Erfolg, auch wenn das Archiv gar nicht gespeichert werden konnte (etwa bei vollem Speicher). Nach dem nächsten Öffnen wären die Daten weg gewesen. Jetzt erscheint eine deutliche Warnung.</li>
            <li><strong>Nur noch ein Passwortfeld in der Datensicherung:</strong> Bisher tauchten je nach Häkchen zwei verschiedene Felder auf – beim Wiederherstellen stand dort „Sicheres Passwort vergeben“, obwohl man ein vorhandenes eingeben sollte.</li>
            <li><strong>Hilfe korrigiert:</strong> Vier Stellen beschrieben noch ältere Stände – Monatsabschluss (Rückfrage und Rückgängig fehlten), Live-Verbindung, Schnell-Erfassung bei Stunden-Feldern und das Passwortfeld beim Backup.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-amber-500" />
            <span>Version 0.9.2: Abbruch der Live-Verbindung wird gemeldet</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Sie erfahren jetzt, wenn die Verbindung abreißt:</strong> Bricht die Live-Verbindung ab – WLAN weg, anderes Gerät zugeklappt oder gesperrt –, erscheint ein deutlicher Hinweis samt Sprachansage, mit einer Taste zum erneuten Verbinden. Bisher verschwand lediglich das grüne Zeichen oben; wer gerade Zahlen eintrug, bemerkte nichts und hielt beide Geräte für gleichauf. Trennen Sie selbst, kommt weiterhin keine Warnung.</li>
            <li><strong>Weniger Datenverkehr:</strong> Jede Übertragung enthielt eine Kopie der Schichten, die die Gegenseite nie ausgewertet hat. Sie entfällt.</li>
            <li>Datensicherung und Geräte-Sync verwenden intern jetzt denselben Weg – weniger Stellen, an denen sich ein Fehler einschleichen kann.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Bug className="w-5 h-5 text-red-500" />
            <span>Version 0.9.1: Live-Verbindung verliert keine Eingaben mehr</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Wichtiger Fehler behoben – Eingaben konnten spurlos verschwinden:</strong> Waren zwei Geräte live verbunden und wurde auf beiden kurz hintereinander etwas erfasst, überschrieb das eine Gerät sämtliche Zahlen des anderen. Die Eingabe war kurz zu sehen und wenige Sekunden später weg – ohne jeden Hinweis. Ab sofort wird <strong>jedes Feld einzeln</strong> abgeglichen: Zwei Erfassungen in verschiedenen Kategorien bleiben beide erhalten.</li>
            <li><strong>Die Verbindung ist jetzt ruhig:</strong> Bisher tauschten beide Geräte alle drei Sekunden ihren kompletten Datenbestand aus – auch wenn niemand etwas eintrug. Das kostete unnötig Akku und schrieb dauernd auf den Gerätespeicher. Jetzt wird nur noch übertragen, wenn sich wirklich etwas geändert hat.</li>
            <li><strong>„Zuletzt gespeichert" stimmt wieder:</strong> Die Zeitangabe sprang vorher im Sekundentakt, obwohl sich nichts geändert hatte.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Version 0.9.0: Zähler bleiben erreichbar & Monatsabschluss mit Rückfrage</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
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
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Version 0.8.1: Farbschemata repariert & einheitliche Navigation</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Wichtiger Fehler behoben – Farbschemata wirkten nur halb:</strong> Ein Teil der Oberfläche richtete sich nach der Einstellung Ihres Geräts statt nach dem in der App gewählten Farbschema. Dadurch konnte Text nahezu unlesbar werden – etwa wenn Sie „Hell“ wählten, Ihr Handy aber im Dunkelmodus lief. Besonders betroffen waren die Hochkontrast-Schemata. Jetzt folgt die gesamte App Ihrer Wahl.</li>
            <li><strong>Alle vier Farbschemata geprüft:</strong> In Hell, Dunkel, Hoher Kontrast und Gelb auf Schwarz erfüllen jetzt sämtliche Texte den geforderten Mindestkontrast.</li>
            <li><strong>Einheitliches Zurück:</strong> Überall führt jetzt derselbe Zurück-Pfeil oben links eine Ebene zurück. Vorher gab es teils ein Schließen-Kreuz, teils einen Pfeil – bei drei Ansichten zeigte das Symbol sogar etwas anderes an, als der Screenreader vorlas.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <span>Version 0.8.0: Mehr Platz auf dem Handy & geführter Einstieg</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Deutlich mehr Platz auf dem Handy:</strong> Der Kopfbereich ist nur noch halb so hoch. Dadurch sind jetzt <strong>alle Schnell-Erfassungs-Tasten sofort sichtbar</strong>, ohne zu scrollen – vorher musste man dafür erst nach unten wischen.</li>
            <li><strong>Fehler auf schmalen Android-Geräten behoben:</strong> Die Seite ließ sich seitlich verschieben, weil einzelne Elemente über den Rand hinausragten.</li>
            <li><strong>Geführter Einstieg:</strong> Beim ersten Öffnen richtet Sie die App in fünf Schritten ein – Name, Schriftgröße, Farben und Sprachansagen lassen sich sofort einstellen, statt sie in den Optionen zu suchen. Jederzeit überspringbar.</li>
            <li><strong>Größere Eingabefelder:</strong> Monat und Name sind jetzt bequemer mit dem Daumen zu treffen.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-cyan-500" />
            <span>Version 0.7.0: Besser lesbar, besser am PC</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Wichtiger Fehler behoben:</strong> Bei neu installierter App wurden Umlaute und Symbole falsch dargestellt („Anzahl VorfÃ¼hrungen“). Betroffen waren nur neue Installationen – vorhandene Daten blieben unberührt.</li>
            <li><strong>Schrift-Einstellung wirkt jetzt überall:</strong> Rund 80 kleine Beschriftungen hatten eine feste Größe und wuchsen nicht mit, wenn Sie „Groß“ oder „Extra groß“ einstellten. Das ist behoben – zusätzlich ist die kleinste Schrift generell größer geworden.</li>
            <li><strong>Am PC deutlich brauchbarer:</strong> Die Desktop-Ansicht mit Seitenleiste schaltet sich bei breiten Fenstern von selbst ein (vorher blieb rund zwei Drittel des Bildschirms ungenutzt). Außerdem lässt sich Text wieder markieren und kopieren, und es gibt wieder sichtbare Scrollbalken.</li>
            <li><strong>Barrierefreie Rückfragen:</strong> Sicherheitsabfragen (z. B. vor dem Löschen) nutzen keine Browser-Fenster mehr, sondern eigene Dialoge – zuverlässig vom Screenreader vorgelesen, mit Escape abbrechbar und im gewählten Farbschema. Der Startfokus liegt bewusst auf „Abbrechen“.</li>
            <li><strong>Klarere Umrandungen:</strong> Rahmen und Trennlinien waren kaum sichtbar und erfüllen jetzt die Kontrast-Norm.</li>
            <li>Neu in der Hilfe: eine Übersicht aller Tastenkürzel.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-rose-500" />
            <span>Version 0.6.0: Verlässlicheres Zählen & Sync im Hintergrund</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Wichtiger Fehler behoben:</strong> Bei schnellem mehrfachem Tippen auf die Plus- oder Minus-Tasten gingen Zählungen verloren (fünf Tipps zählten teilweise nur eins). Jetzt wird jeder einzelne Tipp zuverlässig erfasst – in der Schnell-Erfassung wie im Formular.</li>
            <li><strong>Live-Verbindung bleibt bestehen:</strong> Die Verbindung wird nicht mehr getrennt, wenn Sie das Sync-Fenster verlassen. Sie koppeln einmal und tragen danach ganz normal Zahlen ein – beide Geräte gleichen sich im Hintergrund ab. Ein Hinweis „Live verbunden“ oben zeigt den Status und führt zurück zur Verwaltung.</li>
            <li><strong>Hilfe korrigiert:</strong> Mehrere veraltete Beschreibungen (Namen von Knöpfen, Dateiendung des Backups, automatische Übernahme von Urlaubs- und Krankheitstagen) entsprachen nicht mehr der App und wurden richtiggestellt.</li>
            <li>Die angezeigte Versionsnummer stammt jetzt direkt aus der App und kann nicht mehr veralten.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-sky-500" />
            <span>Version 0.5.0: Sync ohne Kamera & Abschluss-Check</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Sync ohne Kamera:</strong> Jeder Kopplungs- und Datencode lässt sich jetzt auch kopieren und am anderen Gerät einfügen – ideal für PCs ohne Webcam (z. B. über die geteilte Zwischenablage der Windows-Handy-Kopplung).</li>
            <li><strong>Entspannte Kopplung:</strong> Der Verbindungscode hat keinen Zeitdruck; läuft der Antwort-Code ab, genügt ein Tipp auf „Neuen Antwort-Code erzeugen".</li>
            <li><strong>Monatsabschluss-Check:</strong> Vor „Bericht an VL senden" prüft die App auf typische Fehler (fehlender Name, leerer Report, Stunden passen nicht zur Stempeluhr) und fragt nach.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Version 0.4.0: Schnell-Erfassung</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Schnell-Erfassung:</strong> Ihre meistgenutzten Kategorien als große Tasten ganz oben im Report – ein Tipp direkt nach dem Termin genügt (+1 mit Ton und Vibration). Kein Suchen, kein Scrollen.</li>
            <li><strong>Selbst konfigurierbar:</strong> Unter „Anpassen" wählen Sie automatisch (meistgenutzt) oder bis zu 8 eigene Kategorien in Wunsch-Reihenfolge.</li>
            <li><strong>App-Shortcuts:</strong> App-Symbol gedrückt halten → direkt „Zahlen erfassen" oder „Stempeluhr" öffnen.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <span>Version 0.3.0: Live-Sync & Zusammenführen</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Live-Verbindung:</strong> PC und Handy koppeln sich per QR-Code und gleichen sich dann automatisch ab – Sie können an beiden Geräten gleichzeitig arbeiten (gleiches WLAN, direkt von Gerät zu Gerät, ohne Server).</li>
            <li><strong>Intelligentes Zusammenführen:</strong> Der Sync überschreibt nicht mehr alles – Archiv, Schichten und eigene Kategorien beider Geräte werden vereinigt. Beim QR-Empfang können Sie zwischen Zusammenführen (empfohlen) und Ersetzen wählen.</li>
            <li><strong>Fehlerbehebungen:</strong> Importierte Daten bleiben jetzt auch nach dem Neuladen erhalten; Stempeluhr bucht Nachtschichten auf das richtige Datum; Sicherheitsupdate der Excel-Bibliothek.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span>Version 0.2.0: Geräte-Synchronisation</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li><strong>Sichere Datenübertragung:</strong> Neue direkte Geräte-Synchronisation zwischen Smartphone und PC über QR-Code.</li>
            <li><strong>Ende-zu-Ende-Verschlüsselung:</strong> Alle transferierten Daten werden verschlüsselt und sicher von Gerät zu Gerät (P2P-Relay) übertragen. Ohne Server-Speicherung!</li>
            <li>Keine Accounts oder Logindaten erforderlich.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <span>Version 0.1.0: DevSecOps & Sicherheit</span>
            <span className="text-[0.6875rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Beta</span>
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)]">
            <li>Erweiterte Sicherheits-Header im Backend integriert.</li>
            <li>Sichere Datenspeicherung lokal mit IndexedDB (Local-First).</li>
            <li>XSS-Prävention durch strenge Content-Security-Policies.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)]">
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-blue-500" />
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
          <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3">
            <Bug className="w-5 h-5 text-red-500" />
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
