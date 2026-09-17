# Erklärung zur Barrierefreiheit — RV Monatsreport („RV Mobil")

| | |
|---|---|
| **Betrifft** | die Anwendung *RV Monatsreport* („RV Mobil"), erreichbar unter `https://nichtseher.github.io/RVMonatsreport/` und als installierte App auf Smartphone, Tablet und Rechner |
| **Fassung** | 0.9.47 (Beta) |
| **Erstellt am** | 2026-09-17 |
| **Letzte Überprüfung** | 2026-09-17 |
| **Einordnung** | **Arbeitsmittel für Beschäftigte** (Festlegung des Projektinhabers vom 2026-09-17) |
| **Grundlage** | Selbstbewertung nach EN 301 549 V3.2.1, Abschnitt 9 (→ WCAG 2.1 Stufe A und AA); Einzelnachweise in [KONFORMITAET.md](KONFORMITAET.md) |
| **Ansprechpartner** | Marc Petry Stramov (Entwicklung), für alle Belange der App |

> **Diese Datei ist die Fassung fürs Repository.** Den Nutzern gegenüber gilt
> derselbe Text in der App selbst: **Optionen → Erklärung zur
> Barrierefreiheit** (`src/components/BarrierefreiheitModal.tsx`). Damit beide
> nicht auseinanderlaufen, vergleicht `scripts/checks/erklaerung.ts` die
> tragenden Angaben bei jedem Prüflauf.

---

## 0. Was diese Erklärung rechtlich ist

Sie ist **freiwillig** und folgt dem Aufbau, den § 12b BITV 2.0 für öffentliche
Stellen vorschreibt — weil das der etablierte Rahmen ist, nicht weil er hier
gälte.

RV Mobil ist ein **Arbeitsmittel für Beschäftigte**. Damit greift

- **nicht** das Barrierefreiheitsstärkungsgesetz (BFSG) — es betrifft Produkte
  und Dienstleistungen für *Verbraucher*,
- **nicht** die BITV 2.0 — sie betrifft *öffentliche Stellen*,
- **sehr wohl** die Pflicht des Arbeitgebers zur barrierefreien Gestaltung des
  Arbeitsplatzes, insbesondere **§ 164 Abs. 4 SGB IX** und **§ 3a Abs. 2
  ArbStättV**.

Eine veröffentlichte Erklärung ist dort nicht vorgeschrieben. Sie steht hier
trotzdem, auf ausdrücklichen Wunsch — und sie ist damit das einzige Dokument,
das den betroffenen Kolleginnen und Kollegen in der App selbst sagt, woran sie
sind.

**Was diese Erklärung nicht ist:** kein Rechtsgutachten, keine Prüfung durch
eine unabhängige Stelle, keine Zertifizierung. Sollte die App später Dritten
außerhalb des Betriebs zugänglich gemacht werden, ändert das die Einordnung —
und damit diesen Abschnitt.

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
Bedienbarkeit ohne Zeigegerät, Fokusführung, der Hauptbereich als eigene
Landmarke, Kontrast in allen vier Farbschemata, Textvergrößerung über drei
Stufen, Umbruch bei 320 und 360 Pixel Breite, Trefferflächen von mindestens
44 × 44 Pixel für **jedes** Bedienelement (Stufe AAA, 2.5.5) und
Statusmeldungen über eine zentrale Ansage.

---

## 2. Nicht barrierefreie Inhalte

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

- **198 Prüfungen** der Rechenkerne (Zusammenführen, Zeitrechnung,
  Verschlüsselung, Excel-Ausgabe, Textkodierung, Typografie-Regeln).
- **Über 590 Oberflächenprüfungen** je Lauf über drei Geräteprofile
  (360 × 780 mit Touch, 1280 × 900, sowie WebKit als Motor der iPhones),
  drei Schriftgrößen und alle Ansichten: axe-core je Ansicht, Kontrastprüfung
  zusätzlich in allen drei Nicht-Standard-Farbschemata, Trefferflächen,
  waagerechter Überlauf, Tastaturerreichbarkeit, Fokusfallen in Dialogen.
- Beide Prüfläufe laufen **vor** jeder Veröffentlichung; schlagen sie fehl,
  bleibt die vorherige Fassung online.

**Was dieses Vorgehen ausdrücklich nicht leistet:** Ein automatisches Werkzeug
findet einen Teil der Verstöße, nie alle. Ein bestandener Prüflauf ist keine
Konformitätsaussage. Am 2026-09-15 hat genau das sich gezeigt: Bei großer
Schrift waren alle fünf Beschriftungen der Bedienleiste abgeschnitten, und
keiner der über 1.000 Prüfschritte hat angeschlagen. Deshalb steht der
Durchlauf mit echten Hilfsmitteln durch betroffene Nutzer als Bedingung für die
Freigabe 1.0 — und deshalb steht in Abschnitt 1 „teilweise".

---

## 4. Datenschutz — weil er hier zur Barrierefreiheit gehört

Die Anwendung arbeitet **ohne Server**. Alle Berichtsdaten bleiben im Browser
des Geräts; es gibt keine Nutzerkonten, keine Cloud, keine externen Schriften
oder Analysedienste. Der Geräteabgleich läuft direkt zwischen zwei Geräten.

Das steht hier, weil es die Wahlfreiheit betrifft: Wer ein Hilfsmittel nutzt,
soll dafür nicht mehr Daten preisgeben müssen als andere.

---

## 5. Rückmeldungen und Kontakt

**Ansprechpartner für alle Belange dieser App: Marc Petry Stramov (Entwicklung).**
Rückmeldungen laufen auf dem üblichen innerbetrieblichen Weg — ein eigener
Meldekanal ist bewusst nicht eingerichtet, weil die App im Betrieb und nicht
gegenüber Dritten eingesetzt wird.

Melden Sie Barrieren bitte auch dann, wenn sie klein wirken. Hilfreich sind
vier Angaben: welche Ansicht, welches Hilfsmittel (NVDA, JAWS, VoiceOver,
Vergrößerung), welche Schriftgröße und welches Farbschema eingestellt waren.
Diese vier entscheiden meistens darüber, ob sich ein Fehler nachstellen lässt.

---

## 6. Überprüfung dieser Erklärung

Zuständig ist **Marc Petry Stramov**. Die Erklärung ist fortzuschreiben:

- bei jeder Fassung, die Ansichten, Bedienwege oder Ansagen ändert,
- nach jedem Screenreader-Durchlauf,
- ansonsten mindestens **einmal jährlich**.

---

## 7. Wenn eine Rückmeldung nicht weiterhilft

Als Arbeitsmittel unterliegt die App keinem der Durchsetzungsverfahren nach
BFSG oder BITV. Offen stehen die innerbetrieblichen Wege: **Vorgesetzte,
Schwerbehindertenvertretung, Betriebsrat** und der **Inklusionsbeauftragte des
Arbeitgebers** (§ 181 SGB IX).

Das ist die schwächere Stelle dieser Erklärung, und sie steht hier als solche:
Ein benannter externer Beschwerdeweg existiert nicht, weil die gesetzliche
Grundlage dafür bei einem betrieblichen Arbeitsmittel fehlt.

---

## 8. Was noch aussteht (Stand 0.9.47)

| Punkt | Stand |
|---|---|
| Screenreader-Durchlauf auf aktueller Fassung (NVDA, VoiceOver) | ausstehend; letzter vollständiger Durchlauf auf 0.9.22 |
| Geräteabgleich mit Screenreader durchgespielt | seit dem Umbau in 0.9.17 nie bestätigt |
| Gerätetest auf echten Geräten, einzeln belegt | offen; Liste in [GERAETETEST.md](GERAETETEST.md) |
| TalkBack / Android | ungeprüft, mangels Geräten in der Zielgruppe |
| 1.3.2, 1.3.3 (Reihenfolge, sensorische Eigenschaften) | nicht erhoben |
| Prüfung durch eine unabhängige Stelle | nicht erfolgt; ob gewünscht, ist offen |
