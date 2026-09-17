# Erklärung zur Barrierefreiheit — RV Monatsreport („RV Mobil")

| | |
|---|---|
| **Betrifft** | die Webanwendung *RV Monatsreport* („RV Mobil"), erreichbar unter `https://nichtseher.github.io/RVMonatsreport/` und als installierte App auf Smartphone, Tablet und Rechner |
| **Fassung bei Erstellung** | 0.9.47 (Beta) |
| **Erstellt am** | *[Datum der Freigabe eintragen]* |
| **Grundlage** | Selbstbewertung nach EN 301 549 V3.2.1, Abschnitt 9 (→ WCAG 2.1 Stufe A und AA); Einzelnachweise in [KONFORMITAET.md](KONFORMITAET.md) |
| **Letzte Überprüfung** | *[Datum eintragen — siehe Abschnitt 6]* |
| **Status dieses Dokuments** | **ENTWURF.** Fünf Angaben fehlen und können nur vom Unternehmen ergänzt werden; sie sind im Text mit *[eckigen Klammern]* markiert. |

---

## 0. Vorbemerkung: Warum es diese Erklärung gibt, und was sie rechtlich ist

Diese Erklärung ist **freiwillig**. Sie folgt dem Aufbau, den § 12b BITV 2.0 für
öffentliche Stellen vorschreibt, weil das der etablierte Rahmen ist — nicht,
weil dieser Rahmen hier automatisch gilt.

Ob eine Erklärung **verpflichtend** ist, hängt daran, wie die App eingeordnet
wird. Das ist eine Rechtsfrage; hier steht nur, woran sie sich entscheidet:

- **Als internes Arbeitsmittel für Beschäftigte** greifen weder das
  Barrierefreiheitsstärkungsgesetz (BFSG — es betrifft Produkte und
  Dienstleistungen für *Verbraucher*) noch die BITV 2.0 (sie betrifft
  *öffentliche Stellen*). Einschlägig sind dann die Pflichten des Arbeitgebers
  zur barrierefreien Gestaltung des Arbeitsplatzes, insbesondere § 164 Abs. 4
  SGB IX und § 3a Abs. 2 ArbStättV. Eine veröffentlichte Erklärung ist dort
  nicht vorgeschrieben — sie bleibt aber das einzige Dokument, das den
  betroffenen Beschäftigten sagt, woran sie sind.
- **Als Dienstleistung gegenüber Dritten** (etwa wenn die App Kunden,
  Partnern oder anderen Unternehmen zugänglich gemacht wird) kann das BFSG
  greifen, mit eigenen Informationspflichten und einer Marktüberwachung.

> *[Einzutragen: Wie ordnet das Unternehmen die App ein? Von dieser einen
> Antwort hängen Abschnitt 5 und 7 ab.]*

**Was diese Erklärung nicht ist:** kein Rechtsgutachten, keine Prüfung durch
eine unabhängige Stelle, keine Zertifizierung.

---

## 1. Stand der Vereinbarkeit mit den Anforderungen

**Die Anwendung ist mit EN 301 549 V3.2.1 (Stufe AA) teilweise vereinbar.**
„Teilweise" steht hier aus einem bestimmten Grund, und der Grund ist nicht eine
bekannte Barriere:

Auf Stufe AA ist zum Stand 0.9.47 **kein Erfolgskriterium als nicht erfüllt
bekannt**. Der Selbstbewertung fehlt aber an drei Stellen der Nachweis, und ein
Kriterium ohne Nachweis wird in diesem Projekt nicht als erfüllt geführt:

1. **Der vollständige Screenreader-Durchlauf für die aktuelle Fassung steht
   aus.** Der letzte vollständige Durchlauf durch einen blinden Kollegen fand
   auf Fassung 0.9.22 statt (2026-09-07, NVDA und VoiceOver, ohne Befund).
   Seitdem hat sich die Anwendung erheblich geändert.
2. **Zwei Kriterien sind nicht erhoben** (1.3.2 Bedeutungstragende Reihenfolge,
   1.3.3 Sensorische Eigenschaften). Beide verlangen ein Menschenurteil, das
   ein automatisches Prüfwerkzeug nicht ersetzt.
3. **TalkBack unter Android ist ungeprüft.** Die blinden Kolleginnen und
   Kollegen im Team arbeiten ausschließlich mit iPhones; die Plattform ist mit
   der tatsächlichen Zielgruppe daher nicht prüfbar. Sie wird hier als
   ungeprüft ausgewiesen, nicht als erfüllt.

Was demgegenüber **belegt** ist, steht im Konformitätsbericht mit Messwerten:
Bedienbarkeit ohne Zeigegerät, Fokusführung, Kontrast in allen vier
Farbschemata, Textvergrößerung über drei Stufen, Umbruch bei 320 und 360 Pixel
Breite, Trefferflächen von mindestens 44 × 44 Pixel für **jedes** Bedienelement
(Stufe AAA, 2.5.5) und Statusmeldungen über eine zentrale Ansage.

---

## 2. Nicht barrierefreie Inhalte

**Bekannte Einschränkungen:**

1. **Der Kamera-Weg beim Geräteabgleich** (QR-Code abfilmen) setzt Sehen
   voraus. **Barrierefreie Alternative vorhanden:** Derselbe Abgleich läuft
   vollständig über einen kopierbaren Textcode und über eine dauerhafte
   Live-Verbindung; beide Wege sind ohne Kamera bedienbar und mit dem
   Screenreader vollständig erreichbar.
2. **Die Diktierfunktion** gibt Sprache an die Spracherkennung des Systems
   (Google bzw. Apple) weiter. Das ist eine Datenschutz-, keine
   Barrierefreiheitsfrage; sie ist abschaltbar und in der Hilfe offengelegt.
   Alle Eingaben sind vollständig über Tastatur möglich.
3. **Schutz gegen das Einbetten in fremde Seiten** (`X-Frame-Options`,
   `frame-ancestors`) lässt sich auf der eingesetzten Veröffentlichungsplattform
   nicht setzen. Das ist eine Eigenschaft des Hostings, keine Barriere.

**Keine Einschränkung ist mit „unverhältnismäßiger Belastung" begründet.**
Dieser Ausnahmegrund wird hier nicht in Anspruch genommen.

---

## 3. Wie diese Einschätzung zustande kam

**Selbstbewertung durch die Entwicklung**, gestützt auf laufende automatische
Prüfungen:

- **191 Prüfungen** der Rechenkerne (Zusammenführen, Zeitrechnung,
  Verschlüsselung, Excel-Ausgabe, Textkodierung, Typografie-Regeln).
- **Über 590 Oberflächenprüfungen** je Lauf über drei Geräteprofile
  (360 × 780 mit Touch, 1280 × 900, sowie WebKit als Motor der iPhones),
  drei Schriftgrößen und alle zwölf Ansichten: axe-core je Ansicht,
  Kontrastprüfung zusätzlich in allen drei Nicht-Standard-Farbschemata,
  Trefferflächen, waagerechter Überlauf, Tastaturerreichbarkeit,
  Fokusfallen in Dialogen.
- Beide Prüfläufe laufen **vor** jeder Veröffentlichung; schlagen sie fehl,
  bleibt die vorherige Fassung online.

**Was dieses Vorgehen ausdrücklich nicht leistet:** Ein automatisches Werkzeug
findet einen Teil der Verstöße, nie alle. Ein bestandener Prüflauf ist keine
Konformitätsaussage. Deshalb steht der Durchlauf mit echten Hilfsmitteln durch
betroffene Nutzer in diesem Projekt als Bedingung für die Freigabe 1.0 — und
deshalb steht in Abschnitt 1 „teilweise".

---

## 4. Datenschutz — weil er hier zur Barrierefreiheit gehört

Die Anwendung arbeitet **ohne Server**. Alle Berichtsdaten bleiben im Browser
des Geräts; es gibt keine Nutzerkonten, keine Cloud, keine externen Schriften
oder Analysedienste. Der Geräteabgleich läuft direkt zwischen zwei Geräten.

Das steht hier, weil es die Wahlfreiheit betrifft: Wer ein Hilfsmittel nutzt,
soll dafür nicht mehr Daten preisgeben müssen als andere.

---

## 5. Rückmeldungen und Kontakt (Feedback-Mechanismus)

Sie benutzen die App und stoßen auf eine Barriere? Melden Sie sie bitte — auch
Kleinigkeiten. Die App ist für genau diese Rückmeldungen gebaut worden.

> *[Einzutragen: Name der Ansprechperson oder Stelle, E-Mail-Adresse,
> Telefonnummer und — falls gewünscht — eine Postanschrift.]*

**Zugesagte Reaktionszeit:** *[Einzutragen; bei öffentlichen Stellen sind
vier Wochen der übliche Maßstab.]*

Bitte beschreiben Sie in der Rückmeldung möglichst: welche Ansicht, welches
Hilfsmittel (NVDA, JAWS, VoiceOver, TalkBack, Vergrößerung), welche
Schriftgröße und welches Farbschema eingestellt waren. Diese vier Angaben
entscheiden meistens darüber, ob sich ein Fehler nachstellen lässt.

---

## 6. Überprüfung dieser Erklärung

Die Erklärung ist zu überprüfen und fortzuschreiben:

- bei jeder Fassung, die Ansichten, Bedienwege oder Ansagen ändert,
- nach jedem Screenreader-Durchlauf,
- ansonsten mindestens **einmal jährlich**.

> *[Einzutragen: Wer ist dafür zuständig? Der Punkt gehört benannt — eine
> Erklärung ohne Zuständigkeit veraltet lautlos.]*

---

## 7. Durchsetzungsverfahren

> *[Einzutragen, abhängig von der Einordnung aus Abschnitt 0:]*
>
> - **Als Arbeitsmittel für Beschäftigte:** innerbetrieblicher Weg —
>   Vorgesetzte, Schwerbehindertenvertretung, Betriebsrat, Inklusionsbeauftragte
>   des Arbeitgebers (§ 181 SGB IX). *[Zuständige Stellen und Kontaktwege
>   eintragen.]*
> - **Als Dienstleistung im Sinne des BFSG:** zuständig ist die
>   Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten
>   und Dienstleistungen (MLBF). *[Aufnehmen, falls diese Einordnung zutrifft.]*
>
> Solange Abschnitt 0 offen ist, bleibt dieser Abschnitt offen. Eine erfundene
> Zuständigkeit wäre schlechter als eine sichtbare Lücke: Wer sich darauf
> verlässt, wendet sich an die falsche Stelle und verliert Zeit.

---

## 8. Was noch aussteht (Stand 0.9.47)

Offen und benannt, damit niemand es aus diesem Dokument herauslesen muss:

| Punkt | Stand |
|---|---|
| Screenreader-Durchlauf auf aktueller Fassung (NVDA, VoiceOver) | ausstehend; letzter vollständiger Durchlauf auf 0.9.22 |
| Geräteabgleich mit Screenreader durchgespielt | seit dem Umbau in 0.9.17 nie bestätigt |
| TalkBack / Android | ungeprüft, mangels Geräten in der Zielgruppe |
| 1.3.2, 1.3.3 (Reihenfolge, sensorische Eigenschaften) | nicht erhoben |
| Prüfung durch eine unabhängige Stelle | nicht erfolgt; ob gewünscht, ist offen |
| Die fünf *[eckigen Klammern]* in diesem Dokument | vom Unternehmen zu füllen |
