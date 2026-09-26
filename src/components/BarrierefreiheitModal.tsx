import { ArrowLeft, Accessibility } from "lucide-react";
import { APP_VERSION } from "../version";

interface BarrierefreiheitModalProps {
  onClose: () => void;
}

/**
 * Erklärung zur Barrierefreiheit (0.9.47).
 *
 * WARUM ALS EIGENE ANSICHT UND NICHT ALS ABSCHNITT DER HILFE
 *
 * Entscheidung des Projektinhabers vom 2026-09-17. Die Hilfe beantwortet
 * Bedienfragen; dieses Dokument sagt zu, was die Anwendung leistet und was
 * nicht. Wer es sucht, sucht es nicht zwischen „Wie lege ich ein Backup an?".
 *
 * WARUM ES DIESE ERKLÄRUNG ÜBERHAUPT GIBT
 *
 * Die App ist ein Arbeitsmittel für Beschäftigte (Einordnung des
 * Projektinhabers, ebenfalls 2026-09-17). Damit greift weder das BFSG (es
 * betrifft Dienstleistungen für Verbraucher) noch die BITV 2.0 (sie betrifft
 * öffentliche Stellen); einschlägig sind § 164 Abs. 4 SGB IX und § 3a Abs. 2
 * ArbStättV. Eine veröffentlichte Erklärung ist dort NICHT vorgeschrieben.
 * Sie steht hier trotzdem, auf ausdrücklichen Wunsch — und sie ist damit das
 * einzige Dokument, das den betroffenen Kolleginnen und Kollegen in der App
 * selbst sagt, woran sie sind.
 *
 * DER TEXT STEHT ZWEIMAL, UND DAS IST ABSICHT
 *
 * `BARRIEREFREIHEITSERKLAERUNG.md` ist die Fassung fürs Repository (lesbar
 * ohne laufende App, verlinkbar aus ROADMAP und Konformitätsbericht), diese
 * Datei die Fassung für die Nutzer. Gegen das Auseinanderlaufen steht
 * `scripts/checks/erklaerung.ts`: Es vergleicht die tragenden Angaben
 * (Einordnung, Stand der Vereinbarkeit, Ansprechpartner, die drei fehlenden
 * Nachweise) Zeichen für Zeichen.
 */
export default function BarrierefreiheitModal({ onClose }: BarrierefreiheitModalProps) {
  return (
    /* [overflow-wrap:anywhere] am Wurzelelement, weil `overflow-wrap` sich
       vererbt und die langen Wörter hier in den Absätzen stehen:
       „Barrierefreiheitserklärung" ist mit 26 Zeichen länger als alles, was
       die Changelog-Ansicht 2026-09-14 auf 408 px getrieben hat. */
    <div className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-[var(--rv-radius-xl)] w-full border border-[var(--card-border)] p-5 md:p-8 relative shadow-[var(--rv-shadow-lg)] flex flex-col gap-6 animate-fade-in pb-24 [overflow-wrap:anywhere]">
      {/* flex-col sm:flex-row: siehe CarryoverModal -- "Barrierefreiheitserklärung"
          ist mit 26 Zeichen laenger als alles, was die Changelog-Ansicht schon
          auf 408 px getrieben hat, und brach bei "Extra gross" trotz
          flex-1/min-w-0 in eine senkrechte Buchstabenspalte. */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 border-b border-[var(--card-border)] pb-4">
        <button
          onClick={onClose}
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)] transition-colors active:scale-95 cursor-pointer"
          aria-label="Zurück"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h2
            tabIndex={-1}
            data-ansicht-titel=""
            className="text-xl md:text-2xl font-black flex items-center gap-2 min-w-0 [overflow-wrap:anywhere]"
          >
            <Accessibility className="w-7 h-7 flex-shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <span className="min-w-0">Erklärung zur Barrierefreiheit</span>
          </h2>
          <p className="text-sm font-bold text-[var(--text-muted)] mt-1">
            Stand: 17.09.2026 · Fassung {APP_VERSION} · Selbstauskunft
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <p className="text-base font-normal leading-relaxed">
          Diese Erklärung gilt für die Anwendung <strong>RV Mobil</strong> (RV Monatsreport) — im Browser
          und als installierte App auf Smartphone, Tablet und Rechner.
        </p>
        <div className="p-4 rounded-[var(--rv-radius-lg)] bg-[var(--bg-color)] border border-[var(--card-border)] space-y-2">
          <p className="text-sm font-black">Kurz gesagt</p>
          <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
            Die Anwendung ist <strong>teilweise vereinbar</strong> mit EN 301 549 (Stufe AA). Auf dieser
            Stufe ist <strong>keine Barriere bekannt</strong>. „Teilweise" steht hier, weil an drei
            Stellen der Nachweis fehlt — nicht, weil etwas kaputt wäre. Welche das sind, steht weiter
            unten.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Was erfüllt ist — und nachgemessen</h3>
        <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          <li>Jede Funktion ist ohne Maus und ohne Zeigegerät erreichbar.</li>
          <li>
            Nach jedem Wechsel der Ansicht steht die Tastatur auf deren Überschrift; der Hauptbereich
            ist zusätzlich als Bereich ausgezeichnet (NVDA: <strong>D</strong>, VoiceOver: Rotor).
          </li>
          <li>
            Jedes Bedienelement ist mindestens 44 × 44 Pixel groß — das ist die <em>strengere</em> der
            beiden Vorgaben (Stufe AAA), ohne Ausnahme.
          </li>
          <li>
            Kontrast in allen vier Farbschemata geprüft, drei Schriftgrößen, Umbruch ab 320 Pixel
            Bildschirmbreite.
          </li>
          <li>Jede Rückmeldung der App wird angesagt, wahlweise zusätzlich vorgelesen.</li>
        </ul>
        <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          Geprüft wird das bei <strong>jeder</strong> Veröffentlichung: 198 Prüfungen der Rechenkerne und
          über 590 Prüfungen der Oberfläche über drei Geräteprofile, darunter die Browser-Engine der
          iPhones. Schlägt eine fehl, bleibt die vorherige Fassung online.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Was nicht barrierefrei ist</h3>
        <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          <li>
            <strong>Der Kamera-Weg beim Geräteabgleich</strong> (QR-Code abfilmen) setzt Sehen voraus.
            <strong> Es gibt zwei gleichwertige Wege ohne Kamera:</strong> den kopierbaren Textcode und
            die Live-Verbindung. Beide sind mit dem Screenreader vollständig bedienbar.
          </li>
          <li>
            <strong>Das Diktat</strong> gibt Ihre Sprache an die Spracherkennung von Google bzw. Apple
            weiter. Das ist eine Datenschutzfrage, keine Barriere: Es ist abschaltbar, und jede Eingabe
            geht auch über die Tastatur.
          </li>
        </ul>
        <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          Kein Punkt ist mit „unverhältnismäßiger Belastung" begründet. Diesen Ausnahmegrund nimmt diese
          Erklärung nicht in Anspruch.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Was noch nicht nachgewiesen ist</h3>
        <ul className="list-disc list-inside space-y-2 text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          <li>
            <strong>Der vollständige Durchlauf mit Screenreader auf der aktuellen Fassung steht aus.</strong>{" "}
            Der letzte vollständige Durchlauf durch einen blinden Kollegen lief auf Fassung 0.9.22 und
            verlief ohne Befund.
          </li>
          <li>
            <strong>Zwei Kriterien sind nicht erhoben</strong> (sinnvolle Vorlesereihenfolge;
            Anweisungen, die ohne Farbe, Form oder Position verständlich bleiben). Beides beurteilt ein
            Mensch, kein Prüfprogramm.
          </li>
          <li>
            <strong>TalkBack unter Android ist ungeprüft</strong> — im Team wird ausschließlich mit
            iPhones gearbeitet. Ausgewiesen als ungeprüft, nicht als erfüllt.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Ihre Daten bleiben auf Ihrem Gerät</h3>
        <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          Die App arbeitet ohne Server: keine Nutzerkonten, keine Cloud, keine externen Schriften, keine
          Auswertung. Der Geräteabgleich läuft direkt zwischen zwei Geräten. Das steht in dieser
          Erklärung, weil es zur Wahlfreiheit gehört: Wer ein Hilfsmittel nutzt, soll dafür nicht mehr
          von sich preisgeben müssen als andere.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Eine Barriere melden</h3>
        <div className="p-4 rounded-[var(--rv-radius-lg)] bg-[var(--bg-color)] border border-[var(--card-border)] space-y-2">
          <p className="text-sm font-bold leading-relaxed">
            Ansprechpartner für alle Belange dieser App ist <strong>Marc Petry Stramov</strong> (Entwicklung).
            Melden Sie Barrieren bitte auf dem üblichen innerbetrieblichen Weg — auch Kleinigkeiten.
          </p>
          <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
            Hilfreich sind vier Angaben: welche Ansicht, welches Hilfsmittel (NVDA, JAWS, VoiceOver,
            Vergrößerung), welche Schriftgröße und welches Farbschema eingestellt waren. Sie entscheiden
            meistens darüber, ob sich ein Fehler nachstellen lässt.
          </p>
        </div>
        <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          Hilft das nicht weiter, stehen Ihnen die innerbetrieblichen Stellen offen: Vorgesetzte,
          Schwerbehindertenvertretung, Betriebsrat und der Inklusionsbeauftragte des Arbeitgebers
          (§ 181 SGB IX).
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--card-border)] pt-5">
        <h3 className="text-lg font-black">Rechtlicher Rahmen und Grenzen dieser Erklärung</h3>
        <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          RV Mobil ist ein <strong>Arbeitsmittel für Beschäftigte</strong>. Damit gilt weder das
          Barrierefreiheitsstärkungsgesetz (es betrifft Dienstleistungen für Verbraucher) noch die BITV
          2.0 (sie betrifft öffentliche Stellen); maßgeblich sind die Pflichten des Arbeitgebers zur
          barrierefreien Gestaltung des Arbeitsplatzes, insbesondere § 164 Abs. 4 SGB IX und § 3a Abs. 2
          ArbStättV. Diese Erklärung ist deshalb <strong>freiwillig</strong> und folgt dem Aufbau, den
          § 12b BITV 2.0 für öffentliche Stellen vorschreibt.
        </p>
        <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
          Sie ist eine <strong>Selbstauskunft der Entwicklung</strong>, kein Gutachten und keine Prüfung
          durch eine unabhängige Stelle. Grundlage ist eine Selbstbewertung nach EN 301 549 V3.2.1,
          Abschnitt 9 (WCAG 2.1, Stufen A und AA). Sie wird bei jeder Fassung überprüft, die Ansichten,
          Bedienwege oder Ansagen ändert, nach jedem Screenreader-Durchlauf und ansonsten mindestens
          einmal im Jahr; zuständig dafür ist Marc Petry Stramov.
        </p>
      </section>
    </div>
  );
}
