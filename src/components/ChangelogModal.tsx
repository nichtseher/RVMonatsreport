import type { ReactNode } from "react";
import { Sparkles, ShieldCheck, Bug, Zap, type LucideIcon } from "lucide-react";
import { APP_VERSION } from "../version";
import AnsichtsKopf from "./AnsichtsKopf";

interface ChangelogModalProps {
  onClose: () => void;
}

/*
  Ein Eintrag der Liste (0.9.76). Vorher stand dieser Kopf -- Kasten, Überschrift,
  Symbol, „Beta“-Plakette -- bei jeder der 85 Versionen einzeln ausgeschrieben.

  HÖCHSTENS ZEHN EINTRÄGE. Kommt ein neuer dazu, fällt der älteste heraus; der
  Verlauf davor steht in Git. `scripts/checks/changelog.ts` zählt nach. Zehn
  Versionen sind bei dem Tempo, in dem hier veröffentlicht wird, ungefähr der
  Zeitraum, nach dem sich die App ohnehin selbst aktualisiert -- und eine Liste
  mit 85 Überschriften ist für einen Screenreader vor allem Umweg.

  Die Beta-Plakette kommt nicht als Eigenschaft herein: Jede Version ist eine Beta.
*/
function Eintrag({
  nr,
  titel,
  symbol: Icon,
  children,
}: {
  nr: string;
  titel: string;
  symbol: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="p-5 rounded-[var(--rv-radius-lg)] bg-[var(--bg-color)] border border-[var(--card-border)]">
      <h3 className="text-lg font-black flex flex-wrap items-center gap-2 mb-3 [&>span]:min-w-0 [&>span]:break-words">
        <Icon className="w-5 h-5 text-[var(--text-muted)]" />
        <span>{`Version ${nr}: ${titel}`}</span>
        <span className="text-[0.75rem] font-black px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">Beta</span>
      </h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-[var(--text-muted)]">{children}</ul>
    </div>
  );
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
    <div className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-[var(--rv-radius-xl)] w-full border border-[var(--card-border)] p-6 md:p-8 relative shadow-[var(--rv-shadow-lg)] flex flex-col gap-6 animate-fade-in pb-24 [overflow-wrap:anywhere] [&_p]:max-w-[75ch] [&_li]:max-w-[75ch]">
      <AnsichtsKopf
        titel="Was gibt's Neues?"
        untertitel={`Installierte Version: ${APP_VERSION} (Beta)`}
        symbol={Sparkles}
        zurueck={{ beschriftung: "Zurück zu den Optionen", onClick: onClose }}
        className=""
      />

      <div className="space-y-6">
        {/* Eine Zeile je Kategorie (Regel seit 0.9.40): nichts, was man neu tun oder wissen muss. */}
        {/* Eine Zeile: Wartung, nichts Neues zu tun oder zu wissen (Regel seit 0.9.40). */}
        <Eintrag nr="0.9.82" titel="Wartung" symbol={ShieldCheck}>
          <li>
            Der Monatsabschluss ist technisch aufgeräumt und zusätzlich abgesichert. Die Rückfrage, der Rücksprung
            und das Archiv verhalten sich unverändert.
          </li>
        </Eintrag>

        {/* Eine Zeile: Wartung, nichts Neues zu tun oder zu wissen (Regel seit 0.9.40). */}
        <Eintrag nr="0.9.81" titel="Wartung" symbol={ShieldCheck}>
          <li>
            Das Laden eines Monats beim Wechsel ist technisch aufgeräumt und zusätzlich abgesichert. Aussehen und
            Bedienung bleiben gleich.
          </li>
        </Eintrag>

        {/* Eine Zeile: Wartung, nichts Neues zu tun oder zu wissen (Regel seit 0.9.40). */}
        <Eintrag nr="0.9.80" titel="Wartung" symbol={ShieldCheck}>
          <li>
            Das Formular für die Monatsziele ist technisch aufgeräumt. Aussehen und Bedienung bleiben gleich.
          </li>
        </Eintrag>

        {/* Eine Zeile: Wartung, nichts Neues zu tun oder zu wissen (Regel seit 0.9.40). */}
        <Eintrag nr="0.9.79" titel="Wartung" symbol={ShieldCheck}>
          <li>
            Die beiden Formulare der Stempeluhr („Ausstempeln“ und „Vergessene Schicht nachtragen“) teilen sich jetzt
            ihre Felder. Aussehen und Rechnung bleiben gleich, die Zeit-Ansicht lädt etwas weniger Daten nach.
          </li>
        </Eintrag>

        <Eintrag nr="0.9.78" titel="Fehlerbehebungen" symbol={Bug}>
          <li>
            Eine Schicht wird nur noch in den Monat gebucht, zu dem ihr Datum gehört; zeigt der Bericht einen anderen
            Monat, sagt die App das, und Ihre Eingaben bleiben erhalten. Die Live-Verbindung übersteht kurze Funklöcher
            und gleicht danach weiter ab. Fehlt beim Löschen aller Daten ein Teil, meldet die App das ehrlich. Zwei
            Tasten haben bessere Namen für Screenreader und Sprachsteuerung.
          </li>
        </Eintrag>

        <Eintrag nr="0.9.77" titel="Fehlerbehebungen" symbol={Bug}>
          <li>
            Beim Abgleich zweier Geräte zählen die Stunden und Arbeitstage jetzt beide Schichten. Eine gerettete
            Eingabe nach einem Absturz bleibt erhalten, bis sie sicher gespeichert ist. Die Rückfrage „Vorlage laden?“
            warnt deutlicher, und der Schalter für die Monatsziele zeigt beim Tastaturbedienen den Fokus.
          </li>
        </Eintrag>

        {/* Eine Zeile: Wartung, nichts Neues zu tun oder zu wissen (Regel seit 0.9.40). */}
        <Eintrag nr="0.9.76" titel="Wartung" symbol={ShieldCheck}>
          <li>
            Die App lädt für Geräte-Sync, Datensicherung und diese Liste weniger Daten nach. Die Einblendungen in
            Geräte-Sync und Datensicherung folgen jetzt der Systemeinstellung zum Reduzieren von Bewegung.
          </li>
        </Eintrag>

        {/* Ausgeschrieben (Regel seit 0.9.40): sichtbar anders -- Tasten in Vollfarbe, immer zu zweit. */}
        <Eintrag nr="0.9.75" titel="Kräftigere Schnell-Tasten, immer zu zweit" symbol={Zap}>
          <li>
            <strong>Schnell-Erfassung:</strong> Die Tasten sind jetzt in kräftiger Vollfarbe statt in blassem Pastell, mit
            weißer oder schwarzer Schrift darauf, je nachdem, was besser lesbar ist. Eigene Kategoriefarben erscheinen
            ebenfalls als Vollfarbe. In den Hochkontrast-Farbschemata bleibt alles wie bisher.
          </li>
          <li>
            Es stehen immer mindestens zwei Tasten nebeneinander – auch bei „Groß“ und „Extra groß“ auf schmalen Handys. Vorher
            stand dort teils nur eine Taste je Reihe. Lange Namen sind nicht mehr gekürzt.
          </li>
        </Eintrag>

        {/* Ausgeschrieben (Regel seit 0.9.40): eine neue, freiwillige Einstellung -- man muss wissen, dass es sie gibt. */}
        <Eintrag nr="0.9.74" titel="Eigene Kategoriefarben und Fehlerbehebungen" symbol={Bug}>
          <li>
            <strong>Neu, freiwillig – eigene Farben für Kategorien:</strong> Unter <strong>Optionen → Formular anpassen →
            Farben der Kategorien</strong> geben Sie jeder Kategorie eine Farbe (acht Vorschläge oder eine frei gewählte).
            Sie erscheint am Rand der Zählerkarte und an der Schnell-Taste. Die App rechnet die Farbe so um, dass der Text
            lesbar bleibt; in den Hochkontrast-Schemata wird sie nicht angezeigt. Ohne Wahl bleibt alles wie bisher.
          </li>
          <li>
            Die selbst gewählten Schnell-Tasten gelten jetzt je Vorlage; vorher blieb das Feld nach einem Wechsel der
            Vorlage leer.
          </li>
          <li>
            Auf schmalen Handys mit großer Schrift wurde im Zähler die dritte Ziffer abgeschnitten (aus „100“ wurde „10“).
            Außerdem wurden Hinweise in den Optionen, Notizen im Schichtprotokoll und Legenden in der Analyse mit „…“
            gekürzt, Texte in Geräte-Sync und Datensicherung verschwanden am Rand, und auf Tablets konnte die untere
            Leiste die letzte Zeile verdecken. Alles behoben: Texte brechen um, nichts wird mehr abgeschnitten.
          </li>
        </Eintrag>

        {/*
          Ausgeschrieben (Regel seit 0.9.40): Es gibt eine neue Wahl in den
          Optionen. Die Vorlage heißt jetzt „Team Blindenhilfsmittel
          Monatsinfo“, und weitere folgen.
        */}
        <Eintrag nr="0.9.73" titel="Berichtsvorlage wählbar" symbol={ShieldCheck}>
          <li>
            <strong>Eigene Vorlage:</strong> Das bisherige Formular heißt jetzt „Team Blindenhilfsmittel
            Monatsinfo“. Unter <strong>Optionen → Berichtsvorlage</strong> sehen Sie, welche Vorlage und welche
            Fassung Ihr Bericht verwendet. Es gibt jetzt drei: Team Blindenhilfsmittel Monatsinfo, APA Monatsinfo
            Außendienst und Vertrieb Monatsinfo. Auch die Einrichtung beim ersten Start fragt danach.
          </li>
          <li>
            <strong>Das Formular kommt unverändert beim Empfänger an:</strong> Bei „Nur Vorlage senden“ wird die
            Originaldatei geöffnet und nur Ihre Zahlen werden eingesetzt – Schrift, Breiten, Rahmen und Druckeinstellungen
            bleiben, wie die Firma sie vorgibt.
          </li>
          <li>
            <strong>Das Formular der App passt sich an:</strong> Jedes Team erfasst andere Zahlen. Nach der Wahl zeigt die
            App genau die Kategorien Ihres Formulars, mit den Überschriften der Bereiche, und jede Zahl landet in der
            passenden Zeile der Excel-Datei. Beim Wechsel geht nichts verloren: Erfasste Zahlen bleiben gespeichert, und
            beim Zurückwechseln sind auch Ihre Kategorien wieder da.
          </li>
          <li>
            Die Wahl gilt für diesen Browser und wird nicht mit anderen Geräten abgeglichen. Bis Sie etwas anderes
            wählen, ändert sich an Ihren Berichten nichts.
          </li>
        </Eintrag>

        <p className="text-sm text-[var(--text-muted)]">
          Ältere Versionen sind hier nicht mehr aufgeführt.
        </p>
      </div>
    </div>
  );
}
