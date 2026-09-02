# Devlog — RV Monatsreport (RV Mobil)

Chronologisches Entwicklungsprotokoll. Jeder Eintrag ab dem 2026-07-31-Block
ist von Claude verifiziert (Code gelesen, `tsc --noEmit` + `npm run build`
ausgeführt, betroffene Abläufe im Browser getestet) — nicht nur aus
Commit-Nachrichten übernommen. Ältere Einträge (bis 2026-07-19) sind aus der
Git-Historie rekonstruiert, bevor diese Zusammenarbeit begann; dort ist nur
dokumentiert, was der Commit-Verlauf objektiv zeigt (Datum, Umfang, Titel),
nicht die Beweggründe dahinter.

---

## 2026-09-02 — Zwei Regelwerke abgeglichen, und die eigene Rechnung widerlegt

Auftrag war ein Abgleich: vier neue Grundregeln gegen den Bestand aus
`CLAUDE.md`, `ROADMAP.md` und dem Code. Drei davon waren im Projekt längst
schärfer umgesetzt, als sie formuliert waren — Offline-First, ARIA, Fokus. Der
Rest war es wert.

### Vier Widersprüche, vier Entscheidungen

| Widerspruch | Entscheidung |
|---|---|
| „Strenger WCAG-Fokus" gegen die 43,5-px-Regel, die der eigene Nachtrag für unerfüllbar erklärte — und gegen den Test, der 24 px prüfte | **Stufe AAA** (2.5.5), gemessen gegen 43,5 px |
| „Etablierte UI-Patterns" gegen das Akkordeon-Verbot | Verbot bleibt und schlägt die Regel |
| „Framework-Standard nutzen" gegen 278 entfernte Tailwind-Farbklassen | Geteilt: Tailwind für Layout, Variablen für Farbe, Radius, Schatten |
| Sequential Thinking gegen die Token-Sparsamkeit aus Abschnitt 1 | Vor jeder Code-Ausgabe; die Sparsamkeit betrifft Dateien und Antwortlänge, nicht die Gründlichkeit davor |

Der erste Punkt ist der eigentliche Befund. **Die Regel im Dokument und der
Wert im Test standen seit 0.9.18 auseinander** — 44 px in `CLAUDE.md`, 24 px in
`oberflaeche.spec.ts`. Beide Seiten für sich plausibel begründet, deshalb fiel
es niemandem auf. Ein Prüfgate, das etwas anderes durchsetzt als das Dokument
verlangt, ist schlimmer als eines, das fehlt: Es erzeugt das Gefühl von
Deckung.

### Die eigene Überschlagsrechnung war falsch — an beiden Enden

Vor der Messung habe ich am Quelltext gerechnet und daraus zwei Aussagen
abgeleitet. Die Messung (360 px, Standardlayout, fünf Ansichten, drei
Schriftgrößen) hat beide kassiert:

- **„Der Code erfüllt AAA nicht."** Falsch — aber nur zur Hälfte, und die
  zweite Hälfte ist die interessantere. Bei 360 px lag kein einziges
  fokussierbares Element unter 43,5 px; allein das Formular hat 93 davon, das
  kleinste misst 44 px. Für das Handy war AAA längst erfüllt, nur wusste es
  niemand, weil nichts es prüfte.
- **„Die Fünferschritte sind 36 px, nicht 40."** Irreführend. Es gibt zwei
  Zweige; Standard ist der Komfortzweig, und dort sind es exakt die 40,0 px,
  die der alte Nachtrag nannte. Die 36 px gehören zum kompakten Layout, das
  per Default aus ist.

Beides sind Fehler derselben Art: aus dem Quelltext geschlossen statt am
laufenden Gerät nachgesehen. Die Projektregel dazu steht seit Monaten in
`CLAUDE.md`, und ich bin trotzdem hineingelaufen.

### Ein echter Fund, den keine Rechnung hergegeben hätte

Bei „Extra groß" war die Bedienzeile **253,9 px breit und mit 256,0 px
belegt** — 2,1 px Überstand, und alle fünf Elemente lagen bereits auf ihrer
`min-width`. Unsichtbar, weil die Seite nicht seitwärts scrollte
(`scrollWidth` = `innerWidth` = 360). Aber ohne jede Reserve: Der nächste
Zusatz in dieser Zeile hätte sichtbar abgeschnitten.

Die Behebung kostete keine einzige Trefferfläche — der Innenabstand der
Zählerkarte von 10 auf 6 px, also aus dem Weißraum. Die 8 px sind vollständig
in die Tasten geflossen:

| bei 360 px | vorher | nachher |
|---|---|---|
| Zeilenbreite („Extra groß") | 253,9 px | **260,0 px** |
| Überstand | +2,1 px | **0** |
| `±1` („Extra groß") | 52,0 px | **53,6 px** |
| `±5` („Extra groß") | 40,0 px | 40,4 px |
| `±5` („Groß") | 41,7 px | **43,3 px** |
| `±5` („Normal") | 44,6 px | **46,3 px** |

### Die Ausnahme, die begründet werden musste

Die `±5`-Tasten bleiben bei „Groß" und „Extra groß" unter 44 px. Sie laufen
unter der Gleichwertigkeitsausnahme in 2.5.5: `tabIndex={-1}`, `aria-hidden`,
und ihre Funktion ist über `±1` und das Zahlenfeld vollständig erreichbar —
beide deutlich über 44 px. Für Screenreader-Nutzer existieren sie ohnehin
nicht.

Sie zu vergrößern wäre machbar und trotzdem falsch: 44 px sind dort bei „Extra
groß" nur zu haben, indem `±1` von 53,6 auf rund 45 px schrumpft. Das
verkleinert die wichtigste Taste zugunsten der unwichtigsten, ausgerechnet in
der Schriftgröße für sehbehinderte Nutzer. Die Begründung steht jetzt im
Quelltext an der Stelle selbst — eine Ausnahme, die man nur im Konzept findet,
wird beim nächsten Umbau übersehen.

### Was bewusst unterblieb

Geplant war zusätzlich ein **größerer Abstand zwischen `±5` und `±1`** gegen
den Fehlgriff. Die Messung hat den Plan widerlegt, bevor er Code wurde: Bei
„Normal" sind die `±5`-Tasten mit 46,3 px heute AAA-konform, und weil die
Zeile in jeder Schriftgröße randvoll ist, wird jeder zusätzliche Abstand aus
den Tastenbreiten bezahlt. Vier Pixel Abstand hätten dort rund drei Pixel
Trefferfläche gekostet und die Tasten unter 44 px gedrückt — der Fehlgriff
wäre gegen einen Normverstoß getauscht worden. Das ist kein guter Tausch, und
es ist eine Produktentscheidung, keine Umsetzungsfrage.

### Das Prüfgate hat die eigene Messung widerlegt — im ersten Lauf

`oberflaeche.spec.ts` prüft jetzt zwei Klassen statt einer Pauschale: **43,5 px
für alles im Tab-Lauf, 24 px für das, was per `aria-hidden` / `tabIndex={-1}`
außerhalb liegt.** Ich hatte dazugeschrieben, die Schwelle fordere nichts
Neues und sichere nur einen erreichten Stand. Der erste Lauf hat das widerlegt:

| gefunden | Maß | Ansicht / Profil |
|---|---|---|
| Reiter „Stempeluhr & Schichten" | 287 × **38** px | Zeit / Schreibtisch |
| Reiter „Jahreskonto (2026)" | 287 × **38** px | Zeit / Schreibtisch |
| „Jahreskonto-Einstellungen bearbeiten" | 540 × **42** px | Zeit / Schreibtisch |

Meine Handmessung hatte bei 360 px stattgefunden — und **nur** dort. Die drei
Verstöße liegen im Schreibtisch-Profil, wo die Reiter nicht umbrechen und
deshalb flacher bleiben. Eine Breite geprüft zu haben heißt nicht, die App
geprüft zu haben; genau dafür gibt es das Tor. Behoben mit `min-h-[44px]` an
allen dreien, dazu an einer vierten Taste im Reiter „Jahreskonto", die das
Gate gar nicht sieht — es prüft nur den beim Öffnen aktiven Reiter.

Das ist derselbe Mechanismus, durch den die 168 × 6 px des Schiebereglers
monatelang durchkamen: Nicht die Prüfung war zu lasch, sie sah nur an der
falschen Stelle hin.

Nach der Behebung: `lint` sauber, **142** Funktionsprüfungen bestanden,
**62 bestanden / 1 übersprungen / 0 fehlgeschlagen** in 1,8 min.

### Ein zweiter Fehlschlag, der keiner war

Derselbe Lauf meldete zusätzlich einen axe-Verstoß in der Optionen-Ansicht.
Die Fehlermeldung lautete `Execution context was destroyed, most likely
because of a navigation` — das ist kein Barrierefreiheitsbefund, sondern exakt
die Störung, die im Kopf von `playwright.config.ts` als Grund für den
seriellen Lauf steht. Ursache diesmal nicht Parallelität, sondern ich selbst:
`reuseExistingServer` griff auf den bereits laufenden Vorschau-Server zu, an
dem noch ein Browser-Client hing, und ich habe während des Laufs Dateien
gespeichert. Vite hat daraufhin neu geladen und Playwright die Seite unter den
Füßen weggezogen.

Nach dem Beenden des Vorschau-Servers war der Fehlschlag weg. Festgehalten in
`CLAUDE.md`, weil er sich als etwas ausgibt, das er nicht ist: Wer diese
Meldung für einen axe-Verstoß hält, sucht den Fehler in der Ansicht.

### Nachtrag: NVDA und VoiceOver sind durchgelaufen

Rückmeldung des Projektinhabers am selben Tag: Beide Durchläufe sind erfolgt,
ohne Befund.

**Das ist eine Fremdangabe, keine Messung.** Der Kopf dieses Devlogs behauptet
für Einträge ab dem 2026-07-31, sie seien von Claude verifiziert — für diesen
Absatz gilt das ausdrücklich nicht. Ich war an keinem der beiden Durchläufe
beteiligt, habe kein Protokoll gesehen und kann das Ergebnis nicht
nachvollziehen. Es steht hier, weil es die Grundlage für den nächsten Schritt
ist, nicht weil es geprüft wäre.

Nach der eigenen Liste im 1.0-Abschnitt bleibt damit offen:

- **TalkBack (Android)** — bleibt vorerst unbestätigt, und der Grund ist
  sachlich: Die blinden Kollegen nutzen ausschließlich iPhones. Die Plattform
  ist mit der Zielgruppe nicht prüfbar; ein sehender Durchlauf erfüllt den
  Maßstab der ROADMAP nicht. Im Konformitätsbericht wird sie als **ungeprüft**
  geführt, nicht als erfüllt.
- **Der Sync-Umbau aus 0.9.17**, den die ROADMAP ausdrücklich einem der
  blinden Kollegen zuweist. Ob er Teil der Durchläufe war, ist nicht bestätigt
  — und er ist der Teil, bei dem die Liste sagt, dass raten hier niemand will.

Außerdem eine Korrektur an einer Aussage, die im Beratungsverlauf zu diesem
Eintrag stand: **Der Screenreader-Durchlauf entscheidet die offene
`±5`-Frage nicht.** Diese Tasten sind `aria-hidden` und außerhalb des
Tab-Laufs — ein Screenreader-Nutzer begegnet ihnen nie. Die Frage betrifft
sehende und sehbehinderte Touch-Nutzer und braucht jemanden, der mit
Restsehvermögen tippt, nicht jemanden, der mit Sprachausgabe navigiert.

---

## 2026-09-01 — WebKit im Deploy-Tor: nichts gefunden, und das ist der Punkt

Die Konfiguration behauptete bis heute, ein zweiter Motor verdopple die
Laufzeit, „ohne die Fehlerklasse zu erweitern". Für Firefox stimmt das. Für
WebKit nicht: **Das ist die Engine von iOS-Safari** — die Engine, auf der die
Kollegen arbeiten, und die mit der Sieben-Tage-Speicherregel, wegen der 0.9.16
überhaupt entstanden ist. Ein Layoutfehler, den nur WebKit zeigt, trifft hier
nicht irgendeinen Nutzer, sondern den typischen.

Drittes Profil `handy-webkit`, bewusst mit **derselben Fenstergröße** wie das
Chromium-Handy. Damit ist ein Fehlschlag eindeutig dem Motor zuzuordnen und
nicht der Breite — sonst hätte man wieder zwei Erklärungen für einen Befund.

| | vorher | nachher |
|---|---|---|
| Prüfungen | 41 | **62** |
| Laufzeit | 1,2 min | 1,8 min |

### Das Ergebnis: kein einziger Fund

Kein Überlauf, kein verstecktes Seitwärtsscrollen, keine zu kleine
Trefferfläche, kein axe-Verstoß. Das ist ein Ergebnis und keine Enttäuschung —
der Wert liegt darin, dass ein *künftiger* Fehler auf der richtigen Engine
auffällt, nicht darin, heute einen zu liefern. Es wäre unredlich, das als
Erfolg zu verkaufen; es ist eine Versicherung.

### Ein Unterschied kam doch heraus — im Werkzeug, nicht in der App

Der Touch-Nachweis schlug in WebKit fehl. Nachgemessen, gleiches Profil,
gleiche Fenstergröße:

| | `pointer: coarse` | `hover` | `ontouchstart` | `maxTouchPoints` |
|---|---|---|---|---|
| Chromium | true | false | true | **1** |
| WebKit | true | false | true | **0** |

Die Medienabfrage, an der die Touch-Zweige im CSS hängen, stimmt in beiden
Motoren — der für die App entscheidende Teil ist also gleich. Nur
`maxTouchPoints` setzt Playwrights WebKit-Bau nicht. Das ist eine Grenze des
Prüfwerkzeugs und **keine** Aussage über iOS-Safari; ein echtes iPhone meldet
dort 5.

Naheliegend wäre gewesen, die Zeile weich zu machen, damit sie überall
durchläuft. Stattdessen prüft sie weiterhin scharf, aber nur dort, wo sie
etwas misst — und die Medienabfragen werden jetzt in beiden Motoren geprüft,
also mehr als vorher.

### Was das nicht ist

Playwrights WebKit ist nicht Safari auf einem iPhone. Bildschirmtastatur,
Safe-Areas, die Sieben-Tage-Regel und das Anhalten der App im Hintergrund
bleiben Handarbeit für 1.0.

---

## 2026-09-01 — Zeitumstellung: kleiner als gedacht, an anderen Tagen als notiert

Der Punkt stand mit Frist in der Roadmap („vor dem 25.10.2026 entscheiden").
Beim Nachmessen war der Eintrag in **zwei** Punkten falsch — beides Korrekturen,
die den Aufwand verkleinert haben.

### Erstens: die Tage stimmten nicht

Notiert war „22:00–06:00 sind am 25.10.2026 tatsächlich 9 Stunden". Die
Umstellung liegt aber in der Nacht **von Samstag 24.10. auf Sonntag 25.10.**
Betroffen ist also die Schicht, die am Abend *vor* dem Umstellungssonntag
beginnt:

| Schicht | tatsächlich |
|---|---|
| **24.10.2026** 22:00 → 06:00 | **9,00 h** |
| 25.10.2026 22:00 → 06:00 | 8,00 h |
| **28.03.2026** 22:00 → 06:00 | **7,00 h** |
| 29.03.2026 22:00 → 06:00 | 8,00 h |

Wer nach dem alten Eintrag geprüft hätte, hätte am 25.10. eine korrekte 8 sehen
und den Fehler für behoben halten können.

### Zweitens: die Stempeluhr war nie betroffen

`getCalculatedActiveShiftValues` rechnet mit echten Zeitstempeln
(`ClockInWidget.tsx:177`) — dort kommt die Umstellung von selbst heraus. Falsch
war ausschließlich die **manuelle Nachtragung**, die über
`berechneNettoStunden` mit „HH:MM" ohne Datum lief. Das Datum lag die ganze
Zeit daneben: `TimeLog.date` gibt es seit jeher, es wurde nur nicht
durchgereicht.

### Die Korrektur

`berechneNettoStunden(kommen, gehen, pause, datum?)` — mit Datum wird über
echte Zeitpunkte gerechnet, ohne Datum bleibt alles wie bisher. Bewusst in der
Zeitzone des Geräts: Die App notiert Uhrzeiten so, wie sie auf der Uhr des
Nutzers standen.

Zwei Randfälle stehen als Kommentar in der Funktion, weil sie nicht auflösbar
sind: In der Frühjahrsnacht existiert die Stunde von 02:00 bis 03:00 nicht, in
der Herbstnacht gibt es 02:30 zweimal.

### Eine Prüfung, die nur zu Hause etwas gemessen hätte

Der Entwicklungsrechner steht auf Europe/Berlin, der CI-Läufer auf **UTC** —
und in UTC gibt es keine Sommerzeit. Die neuen Prüffälle wären dort grün
gewesen, ohne irgendetwas zu prüfen. Deshalb setzt `scripts/zeitzone.ts` die
Zeitzone als **erster Import** des Prüflaufs, und ein eigener Prüffall weist
nach, dass sie greift (Januar-Offset minus Juli-Offset = 60 Minuten).

Das eigene Modul statt einer Zeile in `pruefen.ts` hat einen Grund: ES-Module
werten ihre Importe vor dem eigenen Rumpf aus. Eine Zuweisung oben in
`pruefen.ts` liefe erst *nach* dem Laden aller Prüfmodule — hier zwar folgenlos,
aber aus dem falschen Grund.

### Nachgemessen, im Formular und nicht nur in der Funktion

| Nachgetragene Schicht 22:00 → 06:00 | angezeigt (30 Min Pause) |
|---|---|
| 24.10.2026 (Umstellungsnacht) | **8,50 h** |
| 15.06.2026 (gewöhnlich) | 7,50 h |
| 28.03.2026 (Umstellungsnacht) | **6,50 h** |

Prüfungen **135 → 142**.

---

## 2026-09-01 — WCAG 2.5.7 und 3.2.6 nachgewiesen, und dabei ein 6-px-Regler gefunden

Die letzten beiden offenen 2.2-Kriterien standen in der Roadmap als „zu
prüfen, vermutlich erfüllt". Vermutlich ist keine Aussage, also nachgemessen.

### 2.5.7 Dragging Movements — erfüllt

Zwei Stellen setzen aufs Ziehen. Beide haben eine Ein-Klick-Alternative, und
zwar nachgewiesen, nicht behauptet:

| Stelle | Nachweis |
|---|---|
| Wischen wechselt den Abschnitt | Einzelklick auf „Bereich 2" filtert von **6 sichtbaren Abschnitten auf 3**, ein zweiter Klick stellt 6 wieder her |
| Schieberegler „Aufteilung der Stunden" | Einzelner Klick auf die Spur ändert den Wert **50 → 85**, Pfeiltaste ändert 85 → 80, daneben vier Vorwahl-Schaltflächen |

### 3.2.6 Consistent Help — erfüllt

Die Hilfe hängt an genau einem Einstieg (Optionen → Hilfe). Gemessen über alle
fünf Ansichten **und beide Geräteprofile**: dieselbe Leiste, dieselbe
Reihenfolge, „Optionen" immer Position 5 von 5.

### Der Fund, der nebenbei herausfiel

Beim Messen der Reglerbedienung stand da: **Trefferfläche 168 × 6 px.**

In `index.css` gibt es eine Klasse `.rv-slider`, die genau dieses Problem löst
— 44 px Trefferfläche, sichtbare Spur, deutlich sichtbarer Griff — samt
Kommentar, der beschreibt, dass `appearance: none` ohne eigenen Griff dazu
führt, dass Chrome gar keinen zeichnet. **Die Klasse war nur im A11y-Fenster
gesetzt.** Die beiden Regler in der Zeiterfassung (Ausstempeln und Nachtragen)
hatten weiterhin `h-1.5 appearance-none` — also 6 px hoch und ohne gezeichneten
Griff.

| | vorher | nachher |
|---|---|---|
| Trefferfläche | 168 × 6 px | 168 × 44 px |
| Griff sichtbar | nein (Chrome zeichnet keinen) | ja, nachgesehen |
| Klick auf die Spur | wirkt | wirkt |
| Pfeiltasten | wirken | wirken |

Ein behobenes Problem, dessen Behebung an zwei von drei Stellen nie ankam. Die
Fassung mit dem Kommentar zu lesen half nicht — erst das Messen.

### Warum die Prüfung das nicht gefunden hat

Die Trefferflächen-Prüfung sah **nur das Formular** an. Ein Regler in der
Zeiterfassung lag außerhalb ihres Blickfelds. Sie läuft jetzt in jeder Ansicht
mit, und zwar im selben Seitenaufruf wie die beiden Überlaufprüfungen — die
Prüfungszahl sinkt dadurch von 47 auf 41, die Abdeckung steigt von einer auf
fünf Ansichten, die Laufzeit von 1,4 auf 1,2 Minuten. **Eine kleinere Zahl ist
hier mehr Abdeckung**, was beim Lesen des Protokolls sonst verwirrt.

Nicht abgedeckt bleibt, was hinter Klickfolgen liegt: Der Regler selbst wird
weiterhin nur von Hand erreicht, weil er erst nach Einstempeln → Ausstempeln →
„Eigene %" erscheint.

---

## 2026-09-01 — Der Überlauf, den die Überlaufprüfung nicht sehen konnte

Aus dem 2.4.11-Eintrag darunter war ein Nebenbefund offen geblieben: 38 px
waagerechter Überlauf am Schreibtisch, versteckt in einem Container mit
`overflow-x: auto`. Nachgegangen — und es waren **zwei** Fälle.

### Warum die vorhandene Prüfung blind dafür ist

`check:ui` misst `documentElement.scrollWidth` gegen `clientWidth`. Steckt der
Überlauf in einem Container mit `overflow-x: auto`, bleibt dieser Wert
unauffällig: Der Inhalt wird still seitwärts scrollbar, statt die Seite zu
verbreitern. Und dieses `auto` entsteht fast nie mit Absicht — Tailwinds
`overflow-y-auto` zieht die x-Achse nach CSS-Spezifikation mit.

### Die zwei Fälle, beide dieselbe Ursache

| | Analyse-Kacheln (Handy) | Formular-Spalten (Schreibtisch) |
|---|---|---|
| Platz für den Inhalt | 49 px | 311 px |
| Bedarf | 165 px („Vorführungen", unteilbar) | 392 px (Bedienzeile) |
| versteckter Überlauf | 56 px | 38 px |
| sichtbare Folge | Kachel schnitt ihren eigenen Titel ab | neun `+5`-Tasten bei 1270..1318 im 1280 px breiten Fenster, 10 px sichtbar |

Die gemeinsame Ursache ist strukturell und lohnt das Aufschreiben:
**Polsterung und Schrift wachsen mit `rem`, das Fenster nicht.** Die Spalte
schrumpft also genau dann, wenn ihr Inhalt wächst. Im Formular gemessen:

| Schriftgröße | Bedienzeile braucht | Karte bot |
|---|---|---|
| normal | 336 px | 418 px |
| large | 364 px | **364 px** |
| extra-large | 392 px | 311 px |

**Bei „Groß" ging es mit exakt null Reserve auf.** Das ist dieselbe Kante, an
der „Zeiterfassung" gerissen ist — dort hat der Linux-Läufer sie gefunden,
hier hätte es irgendwann ein Kollege getan.

### Behoben, indem die Schrift über die Spaltenzahl entscheidet

Beide Raster stehen jetzt auf `minmax(...)` statt auf einer festen Spaltenzahl.
Gemessen nachher, bei 1280 px:

| Schriftgröße | Raster | Spalten |
|---|---|---|
| normal | 855 px | 2 × 417 px |
| large | 753 px | 1 |
| extra-large | 651 px | 1 |

Dass „Groß" auf eine Spalte fällt, ist Absicht: Zwei ergäben dort wieder genau
364 px. Auf einem breiteren Bildschirm bleiben es zwei. Das ist der Umbruch,
den WCAG 1.4.10 unter „Reflow" meint.

### Die Prüfung kann es jetzt sehen

Neu in `check:ui`, in derselben Prüfung wie der Seitenüberlauf (kein
zusätzlicher Seitenaufruf): **Jeder Container mit `overflow-x: auto|scroll`
muss frei von Inhaltsüberlauf sein.** Die Regel zielt bewusst nicht auf
`overflow-x: hidden` — das schneidet mit Absicht, und daran hängen `sr-only`
und `truncate`. Ohne diese Trennung meldete ein erster Entwurf 668 Treffer,
von denen fast alle Absicht waren.

**Ein Irrweg, der dazugehört:** Die Schnell-Erfassung-Tasten standen zunächst
mit 73 px Überlauf auf der Liste. Der Blick auf die Seite zeigte, dass sie über
zwei Zeilen mit Auslassungszeichen kürzen — `line-clamp`, also Absicht, nur
über eine Eigenschaft, die kein `text-overflow` meldet. Wieder eine Korrektur,
die aus dem Hinsehen kam und aus keiner Zahl.

**Nicht angefasst:** drei kleinere Stellen mit `overflow-x: hidden`
(Analyse-Karte 5 px, Optionen-Abschnitt 22 px). Dort schneidet die App bewusst;
ob das bei großer Schrift noch vertretbar ist, ist eine Gestaltungsfrage und
kein Fehler.

---

## 2026-08-31 — WCAG 2.4.11 nachgemessen: das Risiko war echt

Die Roadmap führte „Focus Not Obscured (Minimum)" als **zu prüfen, Risiko
real** — wegen der festen Leiste am unteren Rand. Jetzt gemessen statt geraten.

Messweg: Jedes fokussierbare Element wird der Reihe nach fokussiert (der
Browser scrollt dabei wie bei Tab), danach ein Raster von 25 Punkten in seinem
Kasten gegen `elementFromPoint`. Trifft kein einziger Punkt das Element selbst,
ist es vollständig verdeckt — genau das verbietet 2.4.11.

| | |
|---|---|
| Fokusstationen, fünf Ansichten × zwei Geräteprofile | 668 |
| davon **vollständig verdeckt** (Formular, Handy) | **9 von 126**, bei „Extra groß" 7 |
| Verdecker | die feste untere Leiste |

Betroffen waren Zähler-Tasten und Zahlenfelder — also die Bedienelemente, um
die es in dieser App überhaupt geht. Der Browser scrollt das Element brav ins
Fenster; dass davor eine `fixed` Leiste klebt, weiß er nicht. **Weder
`scroll-margin` noch `scroll-padding` kamen im ganzen Projekt vor.**

Behoben mit einer Zeile: `scroll-padding-bottom: calc(7rem + env(safe-area-
inset-bottom, 0px))` auf `html`. Die Leiste misst in jeder Schriftgröße rund
6,1 rem (98 px bei normal, 146 px bei extra groß — sie wächst mit der Schrift,
deshalb rem). 6 rem genügten in der Messung schon; 7 rem lässt eine Zeile Luft.

**Gegenprobe: 0 von 668.**

### Zwei Falschbefunde auf dem Weg, beide benannt

- Der erste Lauf meldete zusätzlich **629 „teilweise verdeckt"**. Artefakt: An
  abgerundeten Ecken meldet `elementFromPoint` das Elternelement. Für AA ohne
  Belang — verboten ist nur *vollständig* verdeckt.
- Neun `+5`-Tasten am Schreibtisch schienen von einer `-5`-Taste überdeckt.
  Geometrisch gegengeprüft: **keine einzige Überlappung** in 190 Paaren. Der
  Messpunkt lag schlicht außerhalb des Fensters.

### Was dabei zufällig auffiel — und offen bleibt

Der Inhaltsbereich am Schreibtisch meldet bei „Extra groß" **`scrollWidth 886`
bei `clientWidth 848`**: 38 px waagerechter Überlauf *innerhalb* eines
Containers mit `overflow-x: auto`. Neun `+5`-Tasten stehen dadurch bei
1270..1318 in einem 1280 px breiten Fenster — 10 px bleiben sichtbar.

**Und `check:ui` sieht das nicht**, weil `documentElement.scrollWidth` bei 1280
bleibt. Die Prüfung misst nur die Seite, nicht ihre scrollbaren Container. Das
steht als Punkt in der Roadmap: Layout richten **und** die Prüfung erweitern,
sonst ist die Lücke beim nächsten Mal wieder da.

**Vorbehalt zur Messung:** mit `element.focus()` gemessen, nicht mit der echten
Tabulatortaste. Beide lösen dieselbe Bildlauflogik aus, aber die
Tabulatorreihenfolge selbst ist damit nicht geprüft.

---

## 2026-08-31 — Der erste Fund des neuen Tors war einer, den dieser Rechner nicht sehen kann

Nachtrag zum Eintrag darunter. Beim Veröffentlichen von 0.9.16 bis 0.9.18 lief
`check:ui` zum ersten Mal auf dem CI-Läufer — und scheiterte an genau einer
Prüfung, die lokal grün war:

```
Zeit / extra-large: 361 px Inhalt bei 360 px Fenster
```

**Ein Pixel.** Lokal nicht nachstellbar, und zwar nicht aus Nachlässigkeit:

| Versuch, es hier zu erzeugen | Ergebnis |
|---|---|
| Wurzelschrift bis Faktor 1,2 gestreckt | scrollWidth blieb 360 |
| Verdana, Georgia, Tahoma erzwungen | scrollWidth blieb 360 |
| Abstand aller Elemente zum rechten Rand | keins näher als 1,5 px |
| 141 Proben je Durchgang, alle 16 ms | keine einzige über 360 |

Damit waren die naheliegenden Erklärungen erledigt — breitere Linux-Schriften
und eine zu knappe Spalte. Die Messung lieferte stattdessen einen anderen
Verdacht: Nach dem Laden laufen bis zu **86 Übergänge gleichzeitig**, der
letzte endet je nach Durchgang zwischen 149 und 305 ms. Die feste Wartezeit im
Test lag mit rund 370 ms knapp darüber; auf einem langsameren Rechner fällt die
Messung mitten in eine Einblendung.

### Erst das Werkzeug, dann der Fehler

Die Prüfung wartet jetzt auf Layout-Ruhe statt auf eine Uhr, und **die
Fehlermeldung nennt das überstehende Element** — dieselbe Begründung wie bei
der axe-Prüfung: Eine blosse Zahl zwingt zur Handsuche auf einem Rechner, auf
dem der Fehler gar nicht auftritt. Der nächste Lauf lieferte:

```
div  rechts=361,39  breite=270,39  "ZeiterfassungHier erfassen Sie ..."
h2.text-2xl.font-black.tracking-tight  breite=270,39  "Zeiterfassung"
```

Kein Messartefakt, sondern ein **echter Überlauf, der seit Langem live war**.
Der Textblock in `TimeModal.tsx` ist ein Flex-Kind ohne `min-w-0`, hat damit
`min-width: auto` und kann nicht unter seine Mindestbreite schrumpfen. Die gibt
das unteilbare Wort „Zeiterfassung" vor: 270,4 px ab x = 91. Auf Windows misst
dasselbe Wort knapp unter der Grenze — auf den Android-Geräten der Kollegen
wäre es aufgetreten.

### Der erste Fix trug nur halb

`min-w-0` plus kleinere Überschrift plus `hyphens-auto`: kein Überlauf mehr.
Der **Blick auf die Seite** zeigte dann den Bruch mitten im Wort —
„Zeiterfass/ung", ohne Trennstrich. Chromium lädt die Trennwörterbücher nach,
das deutsche fehlte. Gegengeprobt mit erzwungenem `hyphens: none`: **193 px
Wort in einem 148 px breiten Kasten.**

Die Ursache war die Enge selbst. Icon, Abstand und die mit der Schriftgröße
mitwachsende Kartenpolsterung ließen dem Text 149 px. Die Kopfzeile stapelt
jetzt auf schmalen Geräten, wie das Warnband in 0.9.16.

| bei 360 px / extra-large | vorher | nachher |
|---|---|---|
| Überschrift | 270,4 px, überstehend | 214 px, eine Zeile, ganzes Wort |
| scrollWidth | 361 | 360 |
| Beschreibungstext | 5 Zeilen | 3 Zeilen |

`break-words` bleibt als Boden darunter: Es greift nur, wenn ein Wort auch dann
nicht passt, und hängt an keinem Wörterbuch.

### Was das über das Tor sagt

Der erste Lauf hat einen Fehler gefunden, den drei Anläufe auf diesem Rechner
nicht reproduzieren konnten — und der auf den Zielgeräten aufgetreten wäre. Das
ist der Zweck der Sache. Zugleich die Mahnung: **Der Wortbruch stand in keiner
Zahl.** `scrollWidth` war 360, alle 48 Prüfungen grün, und die Überschrift sah
trotzdem falsch aus. Gefunden hat ihn der Blick auf die Seite.

---

## 2026-08-31 — v0.9.18: Barrierefreiheit kommt ins Deploy-Tor

Bis hierher prüfte das Tor Typen, Rechenkerne und Sicherheitsmeldungen.
**Ausgerechnet die Barrierefreiheit — die erklärte Kernanforderung dieser App —
war ungeprüft.** Jetzt läuft `npm run check:ui` (Playwright + `@axe-core/
playwright`) vor dem Bauen: 48 Prüfungen, zwei Geräteprofile, rund 70 Sekunden.

### Eine Roadmap-Annahme widerlegt

Diese Datei und die ROADMAP hielten die Touch-Zweige (`@media (pointer:
coarse)`) für nicht prüfbar, weil ein verkleinertes Desktop-Fenster weiterhin
`pointer: fine` meldet. Das stimmt für ein Browserfenster, aber nicht für
Playwrights Geräte-Nachbildung: Mit `hasTouch` und `isMobile` kippt die
Medienabfrage wirklich. Der Prüffall `pruefe-medienabfrage` weist das nach,
statt es zu behaupten — `pointer: coarse` = true, `maxTouchPoints` > 0.

### Der Lauf hat sofort zwei echte Fehler gefunden

Beide derselbe Fehlgriff an zwei Stellen: eine dekorative Deckkraft auf ohnehin
gedämpftem Text.

| Stelle | Klasse | Kontrast | gefordert |
|---|---|---|---|
| Fußzeile (`App.tsx:2648`) | `opacity-80` | **4,41:1** | 4,5:1 |
| Seitenleiste (`App.tsx:1413`) | `opacity-70` | **3,59:1** | 4,5:1 |

Beide Male reine Zier — und beide Male hat sie in einer App für sehbehinderte
Nutzer Text unlesbarer gemacht. Deckkraft entfernt, keine andere Änderung nötig.

### Ein Falschbefund, der fast durchgegangen wäre

Der erste Lauf meldete **9 von 30 Fehlschlägen** — darunter „Formular bei
Schriftgröße normal", eine Ansicht, die ich zwei Stunden vorher von Hand auf
exakt 360 px gemessen hatte. Das Muster war unregelmäßig: „Zeit bei normal"
grün, „Zeit bei large" rot.

Ursache war nicht das Layout, sondern der geteilte Dev-Server: Vite übersetzt
Module auf Zuruf, und gleichzeitige Seitenaufrufe mehrerer Arbeiter rissen den
Ausführungskontext mitten in der Messung weg. **Mit `--workers=1` lief exakt
derselbe Test durch.** Die Konfiguration steht deshalb dauerhaft auf seriell;
der ganze Lauf dauert ohnehin nur gut eine Minute. Ohne die Gegenprobe hätte
ich acht Layouts „repariert", die nie kaputt waren.

### Was der Lauf abdeckt — und was nicht

Abgedeckt: waagerechter Überlauf für fünf Ansichten × drei Schriftgrößen ×
zwei Geräteprofile, Trefferflächen gegen die 24-px-Schwelle aus WCAG 2.5.8 AA
(nicht 44 px — das ist Stufe AAA und war nie die Anforderung), axe-core je
Ansicht auf `critical` und `serious`.

**Nicht abgedeckt:** alles, was einen Screenreader oder ein echtes Gerät
braucht. axe findet erfahrungsgemäß einen Teil der WCAG-Verstöße, nie alle. Ein
grüner Lauf ist keine Konformitätsaussage, und die Prüfmeldung sagt das auch
so. Ebenfalls nicht abgedeckt: die Kamerawege und die Modaldialoge, weil beide
eine Ansteuerung über Klickfolgen bräuchten — das ist der nächste Ausbau.

---

## 2026-08-31 — v0.9.17: Die eine Minute gab es nie

Ausgangspunkt war die Rückmeldung, dass die blinden Kolleginnen und Kollegen
den Geräte-Abgleich nicht bedienen können. Beim Lesen des Codes zeigte sich:
**Es fehlt keine Funktion.** Der kameralose Weg ist in beide Richtungen
vollständig gebaut — `startSend` erzeugt immer auch einen Textcode, und
`renderScannerView` enthielt ein Einfügefeld. Es war nur der **vierte** Block,
hinter Kamerabild, Fortschrittsbalken und Hinweistext, innerhalb eines
Abschnitts, der sich „Einmal-Übertragung per QR-Code" nannte. „Zu komplex" hieß
nicht „fehlt", sondern „nicht auffindbar".

### Die Messung, die den Rest entschieden hat

Im Text stand „am besten innerhalb von einer Minute". Im Code gab es dafür
keinen Beleg — die Frist war eine Vermutung. Nachgebaut wurde der echte
Ablauf: A erzeugt ein Angebot, B erzeugt die Antwort, und A bekommt sie erst
nach einer Wartezeit.

| Antwort eingesetzt nach | Ausgang |
|---|---|
| 117 s | **beide Seiten verbunden** |
| 180 s | **beide Seiten verbunden** |
| 300 s | ICE verbunden, aber `B.connectionState = failed` — DTLS abgelaufen |

Das nutzbare Fenster liegt also **zwischen drei und fünf Minuten**, nicht bei
einer. Der Antwort-Code ist damit gut dreimal so lange gültig wie behauptet —
genug für eine Übertragung über das Teilen-Menü, zu wenig für „später".

Nebenbei gemessen: Der Verbindungscode ist **670 Zeichen roh, 627 komprimiert**.
Die Komprimierung bringt hier praktisch nichts, weil base64 wieder auffüllt,
was deflate spart. Das bestätigt die frühere Verwerfung, die Codes kürzen zu
wollen: Es würde nichts ändern.

**Vorbehalt, der dazugehört:** gemessen mit zwei Gegenstellen im selben
Browser auf demselben Rechner. Mit zwei echten Geräten im WLAN kann das
anders aussehen — und auf dem Handy kommt ein Effekt hinzu, den diese Messung
gar nicht erfassen kann: Wer die App verlässt, um den Code einzufügen, schickt
sie in den Hintergrund, wo das Betriebssystem sie anhalten darf. Es ist gut
möglich, dass die erlebte „eine Minute" in Wahrheit daher kam und nie eine
ICE-Frist war.

### Was umgebaut ist

- **Das Einfügefeld steht im Empfangsbildschirm jetzt an erster Stelle**, die
  Kameravorschau zuletzt. Nachgeprüft, Lesereihenfolge: Beschriftung „Ohne
  Kamera: Code einfügen" → Eingabefeld → „Code übernehmen" → Kameravorschau.
- **Einfügen genügt.** Ein gültiger, unverschlüsselter Code wird beim `onPaste`
  sofort übernommen. Das anschließende Suchen nach der Schaltfläche war der
  Schritt, an dem mit Screenreader die Zeit verloren ging.
- **Kein Auto-Fokus** — bewusst. Er würde auf dem Handy die Bildschirmtastatur
  hochklappen und ausgerechnet die Kameravorschau verdecken, die sehende
  Nutzer hier brauchen. Die erste Position in der Lesereihenfolge genügt.
- **Beschriftungen nennen das Ziel, nicht die Technik:** „Daten an anderes
  Gerät senden" statt „Dieses Gerät zeigt QR-Codes an", Abschnittsüberschrift
  „Einmal übertragen — auch ohne Kamera".
- **Die Frist ist aus allen Texten raus.** Ohne Ersatzzahl: Die Messung
  rechtfertigt „lassen Sie sich Zeit", nicht ein neues Versprechen. Ein
  Zeitlimit ohne Verlängerung verstößt zudem gegen WCAG 2.2.1.
- **Der Backup-Import kann zusammenführen.** Bis hierher rief `App.tsx` direkt
  `ersetzeGesamtstand` — eine per Datei übertragene Sicherung löschte damit den
  Stand des Zielgeräts. Für die blinden Kollegen ist die Datei der
  zuverlässigste Übertragungsweg überhaupt, und ausgerechnet der war der
  gefährlichste. Die Wahl fällt jetzt **vor** der Dateiauswahl, wie beim
  Verschlüsselungs-Schalter, statt in einem Dialog danach.

### Nachgemessen

Kein waagerechter Überlauf im Sync-Fenster und im Backup-Bildschirm, bei
360 px in allen drei Schriftgrößen (360 px Scrollbreite bei 360 px
Fensterbreite). Prüfungen unverändert 135, `tsc --noEmit` fehlerfrei.

### Was offen bleibt

- **Die Kamera startet weiterhin von selbst**, sobald der Empfangsbildschirm
  öffnet. Sie erst auf Anforderung zu starten, ist der nächste Schritt — dafür
  fehlt hier eine Umgebung mit echter Kamera, in der sich das Anhalten und
  Wiederanlaufen prüfen lässt.
- **`navigator.share()` für die Codes** — erst sinnvoll zu bauen, wenn geklärt
  ist, ob bei den Kollegen die geteilte Zwischenablage eingerichtet werden kann.
- Der Durchlauf mit NVDA und VoiceOver.

---

## 2026-08-31 — v0.9.16: Der Speicher war nie angefordert

Der Befund kam aus einer Frage nach blinden Flecken, nicht aus der Roadmap.
**`navigator.storage.persist()` kam im gesamten Projekt nicht vor** — geprüft,
kein einziger Treffer. Damit lag das Archiv in „best effort"-Speicher, den der
Browser jederzeit räumen darf. Auf iOS heißt das bei Seiten, die nicht zum
Home-Bildschirm hinzugefügt wurden: **nach sieben Tagen ohne Nutzung ist alles
weg** — IndexedDB, localStorage und Cache zusammen.

Für eine App, deren Zweck es ist, Zahlen direkt nach dem Termin zu erfassen und
deren Nutzer zwei Wochen ohne Termin haben können, ist das der Fehler mit dem
größten Schaden: ein kompletter Monat, ohne dass jemand etwas falsch macht.

Drei Lücken verstärkten sich dabei gegenseitig:
1. kein `persist()`,
2. keine Sicherungs-Erinnerung — die vorhandene Erinnerung am 8. betrifft die
   *Abgabe an die VL*, nicht das Sichern (`App.tsx:1193`),
3. der Geräte-Sync als Rettungsweg ist genau der, den die blinden Kollegen
   laut Rückmeldung aus dem Außendienst nicht bedienen können.

### Was umgesetzt ist

`utils/speicherSchutz.ts` mit zwei reinen Funktionen (`beurteileSpeicher`,
`beurteileSicherung`) plus den Browser-Zugriffen. Die Abstufung ist bewusst
unsymmetrisch: **„kritisch" bekommt nur der Fall, in dem der Verlust nach
dokumentierter Browser-Regel eintritt** (WebKit + nicht installiert), nicht der,
in dem er eintreten *kann*. Nur „kritisch" wird bei jedem Start angesagt; die
weicheren Stufen sagen es einmal und stehen danach nur noch im Band. Eine
Warnung, die immer kommt, wird weggehört — und trifft dann auch den Ernstfall
nicht mehr.

Der Absturz-Bildschirm bot bis hierher als einzigen Ausweg „Kompletten Reset
durchführen" an, also `localStorage.clear()` plus `clearIndexedDb()`. **Für
einen blinden Nutzer war das die einzige erreichbare Taste.** Jetzt steht
darüber „Daten als Datei sichern", das direkt aus IndexedDB liest — ohne den
React-Zustand, der an dieser Stelle ja gerade beschädigt ist.

### Nachgemessen

Das Rettungspaket hat bewusst dieselbe Form wie eine normale Datensicherung.
Im Browser gegen `pruefeSyncPaket()` geprüft, mit gefülltem Archiv:

| | |
|---|---|
| Schlüssel im Paket | `app, fmt, appFields, carryover, history, reportData, gerettetAm` |
| Monate im Paket | die vorhandenen, vollständig |
| `pruefeSyncPaket().ok` | **true** |

Eine Rettungsdatei, die niemand wieder einlesen kann, wäre keine — deshalb ist
das die entscheidende Prüfung und nicht die Dateigröße.

### Ein Fehler, den ich selbst eingebaut und dann gefunden habe

Die beiden Knöpfe im neuen Band standen nebeneinander mit `whitespace-nowrap`.
Bei 360 px Breite und Schriftgröße „Extra groß" ergab das **411 px
Scrollbreite gegen 360 px Fensterbreite** — 51 px Überlauf. Gegengeprobt durch
Ausblenden des Bands: ohne es exakt 360 px. Behoben durch Stapeln auf schmalen
Geräten.

**Beim Nachmessen fiel derselbe Fehler an einer älteren Stelle auf:** Das Band
„Live-Verbindung unterbrochen" braucht mit seinen zwei Knöpfen bei „Extra groß"
**390 px in einem 356 px breiten Band** — 34 px Überlauf. Es fällt nur auf, wenn
eine Live-Verbindung tatsächlich abreißt, und war deshalb nie jemandem
aufgefallen. Gleich mitbehoben.

| Schriftgröße | vorher | nachher |
|---|---|---|
| normal | 360 px | 360 px |
| groß | 360 px | 360 px |
| extra groß | **411 px** | **360 px** |

Knopfhöhen nach der Änderung: 44 / 50 / 60 px — in allen drei Stufen über den
43,5 px, die der Rendierungsfaktor dieser Umgebung erlaubt.

Prüfungen **121 → 135**.

### Was nicht geprüft werden konnte

- **Die Sieben-Tage-Regel auf einem echten iPhone.** Das Browserverhalten ist
  dokumentiert, die Wirkung im installierten Zustand ist es hier nicht. Der
  kritische Zweig wurde nur über die reine Funktion geprüft, nicht am Gerät.
- **Wie sich die Ansage mit NVDA oder VoiceOver anhört.** Der Text ist als
  Vollsatz formuliert, mehr lässt sich von hier aus nicht sagen.

---

## 2026-08-22 — v0.9.15: Schritt 6 — der Kern

Letzter Schritt der Aufteilung. `useBerichtsdaten` übernimmt Monatsdaten,
Archiv, Speicherung, Laden, Notfallkopie und die Zähleränderungen.

**`App.tsx`: 3.932 → 2.844 Zeilen** (−1.088). Davon 1.547 Zeilen JSX und
1.296 Zeilen Logik — der Rest verteilt sich auf sechs Hooks und zehn
Hilfsmodule.

### Eine Ringabhängigkeit, die nicht mit einem Trick gelöst wurde

`useBerichtsdaten` muss **vor** allen anderen Hooks stehen, weil fast jeder
`reportData` oder `history` braucht. Gleichzeitig sagte der Auto-Save
Speicherfehler an — und die Ansage kommt aus `useSprachausgabe`, die ihrerseits
`reportData` braucht. Ein Ring.

Die naheliegende Lösung wäre eine Referenz gewesen wie beim Diktat in
Schritt 3. Im **Kern-Datenfluss** wäre das die falsche Antwort: Man versteckt
damit die Abhängigkeit, statt sie aufzulösen.

Stattdessen sagt der Hook gar nichts mehr an. Er meldet über `speicherFehler`
nur, *dass* etwas fehlschlug (`"bericht"` oder `"archiv"`), und `App.tsx`
formuliert die Ansage. Beide Meldungstexte bleiben unterscheidbar, der Ring ist
weg, und der Datenhook hat eine Abhängigkeit weniger.

### Zwei Stellen, an denen ich beim Abschreiben danebenlag

**`monthHasContent` prüfte im Original `v !== 0`, meine Kopie `v > 0`.** Ein
negativer Zählerstand hätte im Original als Inhalt gegolten, bei mir nicht —
der Monat wäre nicht archiviert worden. Negative Werte sind nicht vorgesehen,
aber wenn einer entsteht, ist er erst recht etwas, das nicht stillschweigend
verschwinden darf. Beim Abgleich mit dem Original gefunden; die Funktion liegt
jetzt in `utils/monatInhalt.ts` mit dem Grund im Kommentar.

**`lastSavedTime` startete im Original mit der aktuellen Uhrzeit, bei mir mit
`""`.** Die Anzeige „zuletzt gesichert um" wäre bis zum ersten Speicherlauf
leer geblieben.

Beides hätte kein Typprüfer gefunden. Beides fiel nur auf, weil ich vor dem
Löschen gegen das Original verglichen habe.

### Gemessen — mit geleertem Speicher, über die echte Oberfläche

| Ablauf | Ergebnis |
|---|---|
| Erstnutzung | Einstieg erscheint („Schritt 1 von 5"), Bericht angelegt |
| **Sechs schnelle Tipps** | **6** — der synchrone Spiegel greift |
| Speicherung | in IndexedDB, Zeitstempel gesetzt, ins Archiv gespiegelt |
| Notfallkopie | bei `visibilitychange` geschrieben |
| Neustart | Wert 6 wiederhergestellt, Notfallkopie aufgeräumt |
| Einstieg beim 2. Start | erscheint korrekt **nicht** mehr |

Die sechs schnellen Tipps sind der Test für den synchronen Spiegel: Ohne ihn
las jeder Tipp vor dem nächsten Rendern denselben alten Stand, „dreimal tippen"
ergab +1.

**Der Fehlerpfad mit einem echten Schreibfehler geprüft** — `IDBObjectStore.put`
zum Werfen gebracht:

```
Warnbanner erschienen:       ja
Ansage:  "Achtung: Speichern fehlgeschlagen. Bitte jetzt ein Backup
          erstellen, damit keine Daten verloren gehen."
Banner verschwindet wieder:  ja, sobald Speichern gelingt
```

Das ist genau die Stelle, die ich umgebaut habe. Sie funktioniert.

`npm run lint`, `npm run check` (121) und `npm run build` grün.

### Was bewusst in `App.tsx` geblieben ist

Der Monats-Lebenszyklus (Abschluss, Rückgängig, Vorlage laden, Monatswechsel)
und die Verwaltung eigener Kategorien. Beide fassen mehrere Bereiche zugleich
an — Felder, Zählerwerte, Rückfragen, Bildschirmwechsel — und sind eher
Oberflächen-Steuerung als Datenhaltung. Sie gehören in einen künftigen
Formular-Hook, nicht hierher.

### Nicht verifiziert

Der Geräte-Abgleich über eine echte WebRTC-Verbindung. Und ob die
Notfallkopie auf einem echten iPhone greift, wenn iOS die Seite entlädt — hier
wurde `visibilitychange` von Hand ausgelöst, nicht vom Betriebssystem.

---

## 2026-08-22 — v0.9.14: `App.tsx` aufteilen, Schritte 1 bis 5

Die Datei hatte **3.932 Zeilen** — nicht die „rund 3.500" aus der alten
Roadmap, sie war seither weiter gewachsen. Aufgeteilt wird in Hooks, nicht in
Komponenten: Das JSX (1.547 Zeilen) bleibt unangetastet, nur die Logik wandert.

**Ein Schritt pro Commit, nach jedem Gate plus Durchspielen im Browser.** Geht
einer schief, ist genau ein Commit zurückzunehmen statt sechs. Reihenfolge nach
Risiko, das kleinste zuerst.

| Schritt | Neu | `App.tsx` danach |
|---|---|---|
| 1 | `useGeraeteSync` + `utils/speicher` | 3.793 |
| 2 | `useExport` + `utils/abschlussCheck` | 3.617 |
| 3 | `useSprachausgabe` + `utils/zusammenfassung` | 3.407 |
| 4 | `useEinstellungen` + `utils/zeitstempel` | 3.263 |
| 5 | `useStempeluhr` + `utils/schichtVerrechnung` | 3.132 |

Schritt 6 (`useBerichtsdaten`) folgt als eigene Version — er fasst den
Auto-Save an, und der hat in dieser Session zweimal gebissen. Getrennt
ausgeliefert ist der Suchbereich kleiner, falls etwas klemmt.

### Was dabei herausgefallen ist

Bei jedem Schritt wurde geprüft, ob der Block eine **reine Funktion** enthält,
die bisher ungeprüft mitlief. Fünfmal war es so — und das ist der eigentliche
Gewinn, nicht die Zeilenzahl:

| Neu geprüft | Warum es zählt |
|---|---|
| `pruefeMonatsabschluss` | entscheidet, was den Betrieb verlässt |
| `baueZusammenfassung` | die Kontrolle blinder Nutzer vor dem Senden |
| `stempeln` & Co. | entscheiden beim Abgleich, welche Eingabe gewinnt |
| `verrechneSchicht` | legt Schichten auf den Bericht um |

Prüfungen: 91 → **121**.

### Der Fehler, den Schritt 5 gefunden hat

Die Verrechnung einer Schicht auf die drei Summenfelder stand **dreimal** in
`App.tsx` — Ausstempeln, Löschen, Nachtragen. Zusammengezogen und geprüft,
schlug sofort fehl:

```
Start                7,25 h
+ Schicht 3,875 h    11,125 -> gerundet 11,13
- dieselbe Schicht    7,255 -> gerundet  7,26
```

Wer eine Schicht anlegt und wieder löscht, hatte danach eine Hundertstelstunde
**mehr** im Bericht. Erreichbar, weil `ClockInWidget` *getippte* Stunden
ungerundet übernahm (`parseFloat(eingabe)`) — die berechneten sind längst auf
zwei Stellen gerundet, die getippten waren es nicht. An der Quelle behoben.

Klein, aber er summiert sich über Korrekturen und landet im Bericht an die
Vertriebsleitung.

### Beinahe eine stille Verhaltensänderung

In Schritt 4 hatte ich beim Übertragen der Standard-Monatsziele Werte
**erfunden** (20/15/10/160) statt die vorhandenen zu übernehmen — tatsächlich
sind es 15/10/5/40. Jede Neuinstallation wäre mit anderen Zielvorgaben
gestartet, und bestehende Geräte hätten es nie gezeigt, weil sie ihre Werte
gespeichert haben. Beim Abgleich mit dem Original aufgefallen.

Die Lehre steht im Code: Vorbelegungen sind sichtbares Verhalten, kein
Aufräumkandidat.

### Eine Umleitung, die Erklärung braucht

Das Diktat hängt sein Ergebnis ans Notizfeld, `handleMetaChange` steht rund 500
Zeilen weiter unten — ein direkter Zugriff wäre einer vor der Definition. Statt
unbeteiligten Code umzustellen läuft es über `diktatRef`, gefüllt direkt nach
`handleMetaChange`. Nachgewiesen, dass sie greift.

### Gemessen — jeder Schritt über die echte Oberfläche

| Schritt | Nachweis |
|---|---|
| 1 | Sync-Import über Textcode; Live-Registrierung über eine Kanal-Attrappe, **Leerlauf still** |
| 2 | Abschluss-Check mit beiden Warnungen, „Erst korrigieren" erzeugt **0 Dateien** |
| 3 | Kurzform der Ansage: voll → „4" → nach 3 s wieder voll |
| 4 | Mit **geleertem Speicher**: Design überlebt Neuladen, steht sofort richtig |
| 5 | Ausstempeln setzt alle drei Zeitstempel; Löschen: 4h/4h/1 Tag → 0/0/0 |

`npm run lint`, `npm run check` (121) und `npm run build` grün.

### Zwei Messfehler auf meiner Seite

Der erste Abschluss-Check-Test meldete „Dialog nicht erschienen" — mein
Selektor war falsch, `ConfirmDialog` nutzt `role="alertdialog"`. Und in
Schritt 1 hielt ich stale HMR-Fehler für einen echten Defekt; ein hartes
Neuladen zeigte, dass die App lief.

### Nicht verifiziert

Der Geräte-Abgleich über eine echte WebRTC-Verbindung. Das manuelle Nachtragen
einer Schicht über das Formular (die Rechnung dahinter ist geprüft, der Weg
durchs Formular nicht). Und ob die Null-Wächter aus 0.9.13 in einem Randfall
doch etwas blockieren, den ich nicht durchgespielt habe.

---

## 2026-08-22 — v0.9.13: Das Typnetz — und was es sofort gefangen hat

Erster Schritt der Planung für die Strecke bis 1.0. `strict: true` steht,
`npm run lint` läuft mit 0 Fehlern, und weil `lint` genau dieses `tsc --noEmit`
ist, sichert der Deploy-Gate es ohne Zusatzschritt ab.

### Die Zahl, mit der ich angefangen habe, war falsch

Erste Messung: **3022 Fehler** unter `strict`. Das klang nach Monaten. Beim
Aufschlüsseln waren 2883 davon derselbe Code — „JSX element implicitly has type
any". Kein Typschuldenberg, sondern ein einziges fehlendes Paket:

**`@types/react` und `@types/react-dom` waren nie installiert.** Ohne sie ist
jedes JSX-Element `any` und jeder Hook untypisiert; weil `noImplicitAny` aus
war, fiel es nirgends auf. `npm run lint` lief die ganze Projektlaufzeit grün
über eine Codebasis, in der React praktisch ungeprüft war.

| | Fehler unter `strict` |
|---|---|
| ohne `@types/react` | 3022 (davon 2883 nur JSX-`any`) |
| mit `@types/react` | **57** |

Die Lehre steht in `CLAUDE.md`: Sieht eine solche Zahl unplausibel groß aus,
zuerst die Typpakete prüfen.

### Der Weg in Stufen

| Stufe | Fehler | Art |
|---|---|---|
| `@types/react` installieren | 1 | ungültiges SVG-Attribut |
| `noImplicitAny` | 4 | untypisierte leere Arrays in einer Prüfdatei |
| `strictNullChecks` | 56 | `setState`-Rückrufe ohne Null-Wächter, alle in `App.tsx` |
| `strict: true` | 0 | der Rest war schon abgedeckt |

Die 56 folgten einem Muster: `setReportData((prev) => ({ ...prev, ... }))`, wo
`prev` `ReportData | null` ist. Der Wächter `if (!prev) return prev` ist dabei
nicht nur typrichtig, sondern sachlich richtig — ohne geladenen Bericht darf
eine Eingabe nichts anlegen, sonst entstünde ein Datensatz ohne Monat und Namen.

Eine Stelle war mehr als Formsache: Im Auto-Save steht jetzt ausdrücklich
`if (!prev) return prev` statt eines `prev || {}`. Wäre das Archiv noch nicht
aus der IndexedDB geladen, hätte `|| {}` den gespeicherten Bestand durch einen
einzelnen Monat ersetzt. In der Praxis kann das nicht eintreten, weil
`setReportData` und `setHistory` beim Laden im selben Block stehen — aber das
ist ein Implementierungsdetail von React, keine Zusicherung.

### Zwei echte Fehler, keiner vom Compiler allein

**1. Die Sprechblasen im Ringdiagramm haben nie funktioniert.** Sobald
`@types/react` da war, meldete `tsc` sofort: Der Tooltip stand als
`title`-*Attribut* an einem SVG-`<circle>`. In SVG braucht es dafür ein
`<title>`-*Kindelement*; das Attribut tut nichts. `cursor-help` versprach die
ganze Zeit eine Erklärung, die nie erschien.

**2. Der Monatswechsel löschte die Versand-Markierung.** Nachgestellt im
Browser: August als gesendet markiert, in den September gewechselt, August
stand wieder auf „Noch offen". Dieselbe Falle wie in 0.9.12 — der
Archiv-Datensatz wird neu gebaut, `sentAt` fehlt in der Aufzählung, es fällt
still heraus — nur an einer zweiten Stelle, die ich damals übersehen hatte.

**Der Typprüfer fängt das nicht.** Ein fehlendes optionales Feld ist
typkorrekt. Gefunden hat es das Durchspielen, nicht `strict`. Das ist der
ehrliche Befund über den Nutzen dieser Version: Strict hilft gegen eine
Fehlerklasse, nicht gegen alle.

### Die Konsequenz aus Fehler 2

Der Archiv-Datensatz wurde an **zwei** Stellen von Hand zusammengesetzt.
Genau daraus entstand der Fehler — zweimal. Jetzt gibt es dafür eine Stelle:
`src/utils/archivEintrag.ts`, benutzt vom Auto-Save und vom Monatswechsel.
Dazu sechs Prüfungen, darunter eine, die **jedes Feld von `HistoryRecord`**
gegen das Ergebnis abgleicht: Kommt ein Feld dazu und niemand trägt es ein,
fällt es beim Prüflauf auf und nicht erst, wenn ein Nutzer es vermisst.

### Gemessen

Im Browser durchgespielt, nicht nur gelesen — die Wächter hätten stillschweigend
Funktionen abwürgen können:

| Ablauf | Ergebnis |
|---|---|
| Zähler dreimal tippen | 0 → 3, in IndexedDB, im Archiv |
| Name eintragen | gespeichert, Typ `string` |
| Export „Bericht an VL senden" | 10.298-Byte-Datei, Monat markiert, Ansage korrekt |
| Monatswechsel 08 → 09 | Name übernommen, Werte zurückgesetzt, August intakt |
| Monatswechsel mit Markierung | **Markierung überlebt** (war der Fehler) |

Prüflauf: 81 Prüfungen, davon 6 neue. `npm run lint`, `npm run check` und
`npm run build` grün.

### Nicht verifiziert

Der Geräte-Abgleich über eine echte WebRTC-Verbindung. Und ob die neuen
Null-Wächter in einem Randfall doch etwas abwürgen, den ich nicht durchgespielt
habe — die fünf Abläufe oben decken die Hauptwege ab, nicht jeden Pfad.

---

## 2026-08-22 — v0.9.12: Welcher Monat ist noch offen?

Letzter Punkt aus dem 0.9.x-Block, der ohne Zulieferung machbar war. Aus dem
Archiv war nicht ersichtlich, welcher Monat schon an die Vertriebsleitung ging —
bei mehreren offenen Monaten die Stelle, an der ein Bericht liegen bleibt. Mit
dem fertigen Export aus 0.9.11 wird das erst richtig relevant.

### Sichtbar, nicht versteckt

Das Abzeichen steht in der **Kopfzeile** jedes Monats, nicht im ausklappbaren
Teil. Der ganze Zweck ist, offene Monate auf einen Blick zu sehen; hinter einem
Akkordeon wäre es wertlos (siehe ROADMAP, „Bewusst NICHT geplant"). Für
Screenreader steht derselbe Text zusätzlich im `aria-label` der Zeile:

```
"Juli 2026, noch nicht an die Vertriebsleitung gesendet. Details ausklappen"
"Juni 2026, am 03.07.2026 an die Vertriebsleitung gesendet. Details ausklappen"
```

Die Schaltfläche zum Korrigieren nutzt `aria-pressed` statt eines Ein/Aus-
Abzeichens — der Screenreader sagt den Zustand von selbst an.

### Der eigentliche Knackpunkt: der Geräte-Abgleich

Die Markierung ist Zustand, den **beide** Geräte setzen können. Sie läuft
deshalb über einen eigenen Zeitstempel `sentUpdatedAt`, nicht über `savedAt`.

Warum das kein Detail ist, als Ablauf:

1. Gerät A exportiert den Monat → `sentAt` gesetzt, `savedAt` bleibt alt
2. Gerät B tippt danach eine Zahl → `savedAt` von B ist jünger
3. Abgleich

Hinge die Markierung an `savedAt`, gewänne B (ohne Markierung) und der Monat
stünde wieder als offen da — obwohl er nachweislich raus ist. Das ist derselbe
Fehler, der bis 0.9.0 die Zählerstände getroffen hat, nur an anderer Stelle. Als
Prüffall reproduziert, samt Gegenprobe (eine Rücknahme darf nicht von einer
älteren Markierung überholt werden).

**Zweite Falle, im Code gefunden:** Der Auto-Save baut den Archiv-Datensatz des
aktiven Monats bei jedem Speichern aus `inhalt` **neu** — und `inhalt` kannte die
neuen Felder nicht. Jede getippte Zahl hätte die Markierung stillschweigend
gelöscht. Sie werden jetzt ausdrücklich mitgenommen, gehen aber bewusst **nicht**
in den Inhalts-Fingerabdruck ein: Sonst erzeugte das Setzen der Markierung einen
Speicherlauf mit neuem `savedAt` — und genau der entscheidet beim Abgleich.

### Nur markieren, was wirklich raus ist

`triggerFileDownload` liefert seit 0.9.0 `geteilt` / `heruntergeladen` /
`abgebrochen` zurück. Markiert wird erst **nach** dem Abbruch-Zweig — ein
abgebrochener Teilen-Dialog darf keinen Monat als erledigt ausweisen.

### Nebenbefund: eine 34-Pixel-Löschtaste

Beim Nachmessen der Trefferflächen fiel die Löschen-Schaltfläche im Archiv
durch. Sie saß als `col-span-1` in einem Vierer-Raster:

| Schriftgröße bei 360 px | Breite |
|---|---|
| Standard | 44,0 px |
| Groß | 43,2 px |
| Extra groß | **34,2 px** |

Im Bestätigungszustand steckten dort sogar **zwei** Tasten in denselben 34 px.
Das ist Altbestand, nicht neu — aber eine Löschtaste, die man knapp verfehlt,
ist die falsche Stelle zum Sparen. Jetzt nimmt sie ihre natürliche Breite
(mindestens 44 px), „Laden" bekommt den Rest, und die Sicherheitsabfrage belegt
die ganze Zeile.

### Gemessen

| | |
|---|---|
| Kontrast, Archiv-Ansicht, 4 Themes | **0 Verstöße** von je 36 Textelementen |
| Kleinste Trefferfläche bei 360 px | 44,0 / 51,3 / 44,0 px (Standard / Groß / Extra groß) |
| Seitliches Scrollen | keines |
| Prüflauf | 75 Prüfungen, davon 8 neue zum Versandstand |

Umschalten und Zurücknehmen im Browser durchgespielt: `aria-pressed` kippt,
das Abzeichen in der Kopfzeile folgt, beide Felder landen in der IndexedDB, und
beim Zurücknehmen wird `sentUpdatedAt` **trotzdem** gesetzt — ohne diesen
Stempel würde die Rücknahme beim nächsten Abgleich von der alten Markierung des
anderen Geräts überholt.

**Nicht verifiziert:** der Abgleich mit zwei echten Geräten. Die Merge-Logik ist
als Prüffall abgesichert, der Weg über eine reale WebRTC-Verbindung nicht.

---

## 2026-08-19 — v0.9.11: Der Export ist die Firmenvorlage, kein Nachbau

Marc hat die Vorlage der Vertriebsleitung geliefert (`2600_apa_pd.xls`, Stand
01.2026) — der Blocker, der seit Monaten in der ROADMAP stand und den nur er
auflösen konnte. Vorgabe: Blatt 1 deckungsgleich, alles Übrige auf ein zweites
Blatt.

### Was die Vorlage ist

Ein Blatt `Monatsinfo`, B1:D32, 22 verbundene Bereiche, feste Spaltenbreiten
(16/14/334/153 px) und Zeilenhöhen, genau eine Formel: `D10 = SUM(D6:D9)`.

Die Vorlage sagt selbst, wohin was gehört: **20 Zellen sind gelb hinterlegt**
(`FFFF99`) — genau die vorgesehenen Eingabefelder. `D10` ist nicht dabei, dort
steht die Summe. Die Zuordnungstabelle in `vorlageExport.ts` ist daraus
abgeleitet, nicht geschätzt.

### Zwei Lücken, die der Abgleich zutage gefördert hat

1. **`D22 „Vorführungen Envision"` hatte kein Gegenstück in der App.** Das Feld
   war schlicht nie angelegt — die Zeile wäre in jedem bisherigen Bericht leer
   geblieben. Als `envision_vf` in Bereich 3 ergänzt, direkt hinter Tactonom wie
   in der Vorlage, mit Nachrüstung für bestehende Installationen (dieselbe
   Stelle, an der schon `wewalk_tel` nachgerüstet wird — ohne sie bekämen es nur
   Neuinstallationen, weil bestehende Geräte ihre Feldliste in `localStorage`
   halten).
2. **Vier App-Felder haben in der Vorlage keinen Platz**: Reisezeit, Urlaubs-,
   Krankheits- und Feiertage. Dazu eigene Kategorien und die Schichtliste. Die
   stehen jetzt auf Blatt 2 und 3.

### Der Grund für eine neue Abhängigkeit

Gemessen, bevor entschieden wurde:

| Weg | erhalten | verloren |
|---|---|---|
| SheetJS → `.xlsx` | Positionen, 22 Verbünde, Breiten, Höhen, Formel | Fettdruck, Rahmen, **die gelbe Markierung** |
| SheetJS → `.xls` | dasselbe, aber | **zusätzlich Formel und Zeilenhöhen** |

Der Beleg war eindeutig: Nach einem SheetJS-Umlauf kam `FFFF99` in der Datei
**nirgends** mehr vor, die `styles.xml` enthielt eine Schrift, keinen Fettdruck
und zwei Rahmen. Zellformatierung ist in der Community-Fassung nicht enthalten.

Damit war „Vorlage genau so verwenden" mit dem vorhandenen Werkzeug nicht
erfüllbar. Entscheidung von Marc: Gelb ist Pflicht. Also **ExcelJS** — es liest
und schreibt `.xlsx` mit vollständiger Formatierung.

Die Vorlage selbst wurde einmalig mit Excel (COM, Original nur lesend geöffnet)
nach `.xlsx` gewandelt und als base64 eingebettet. Kein Nachbau: Beschriftungen,
Verbünde und Formel kommen aus der Originaldatei. Eine neue Vorlagenversion ist
ein Dateitausch, keine Code-Änderung.

### Gemessen

Die erzeugte Datei in **echtem Excel** geöffnet (nicht nur zurückgelesen):

```
Oeffnet ohne Reparatur:   JA
Blaetter:                 Monatsinfo | RV Mobil - Zusatzangaben | RV Mobil - Arbeitszeiten
B1 fett:                  True
D3 Monat:                 '08/2026'   Fuellung FFFF99
D10 Formel = Ergebnis:    '=SUM(D6:D9)' = 11
D22 Envision:             6           Fuellung FFFF99
B28 Kommentar:            'Browsertest mit Umlauten äöüß.'
B30 Fusstext erhalten:    Formular bitte bis spätestens zum 8. Arbeitst...
Spalte C / D Breite:      55 / 24.86
```

Browserpfad separat geprüft: Das Modul im Browser aufgerufen, Ergebnis
**10.570 Bytes** — byte-genau dieselbe Größe wie die Node-Ausgabe mit
identischen Eingaben. Damit steht die Excel-Prüfung oben auch für den
Browserpfad.

13 neue Prüfungen in `scripts/checks/vorlage.ts` (67 gesamt), darunter: jeder
Zähler in seiner Zelle, die gelbe Markierung überlebt, Formel bleibt Formel,
kein Feld steht doppelt auf Blatt 1 und 2, leerer Monat erzeugt Nullen statt
leerer Zellen.

Bundle: Hauptbundle unverändert bei 499,35 KB (133,16 gzip). ExcelJS liegt in
einem eigenen nachgeladenen Chunk (940 KB / 271 KB gzip), die Vorlage in einem
zweiten (19,7 KB / 11,9 gzip). Beide laden erst beim Export.

### Was das kostet, ehrlich

**ExcelJS bringt eine bekannte Sicherheitsmeldung mit**: `uuid < 11.1.1`
(moderat, fehlende Puffergrenzenprüfung in v3/v5/v6). `npm audit fix --force`
würde auf ExcelJS 3.4.0 zurückstufen — ein Bruch. Der Deploy-Gate meldet
`npm audit` nur (`|| true`) und blockiert nicht. Die Meldung betrifft eine
Funktion, die dieser Export nicht aufruft; trotzdem steht sie jetzt in der
Abhängigkeitsliste, und das ist eine Verschlechterung gegenüber vorher.

**`.xls` wäre möglich, aber teurer:** Die Vorlage fordert im Fußtext „als
xls-Datei". Als `.xls` geschrieben geht die Formel in D10 verloren — die
Vertriebsleitung sähe dort eine feste Zahl. Marcs Entscheidung: `.xlsx`.

Der alte `exportReportToExcel` (99 Zeilen SheetJS) ist entfallen. `excelUtils.ts`
trägt nur noch den separaten Stundenzettel-Export und die Dateiauslieferung.

### Ein Fund der eigenen Prüfung

Für Envision hatte ich 👓 als Symbol gewählt — der Prüflauf schlug fehl, weil
das Zeichen kein Icon in `ICON_KARTE` hatte und `CounterField` es roh als Emoji
gezeichnet hätte. Genau der Fall, für den die Prüfung in 0.9.6 angelegt wurde.
`Glasses` aus lucide-react ergänzt.

**Nicht verifiziert:** wie lange der Export auf einem echten Handy dauert. Im
Dev-Server (ExcelJS unkompiliert, hunderte Modulanfragen) waren es 9 Sekunden —
das ist keine belastbare Zahl für die gebaute Fassung, und ein Handy ist
langsamer als dieser Rechner. Sollte es spürbar sein, gehört ein Fortschritts-
hinweis dazu.

---

## 2026-08-19 — v0.9.10: Die Notlösung von 0.8.1 ist entfallen

Fortsetzung und Abschluss von 0.9.9. Dort waren 141 der 278 festen
Palettenfarben migriert; die restlichen 137 lagen vor allem in den Modals.

### Ergebnis

**278 → 3.** Die drei verbliebenen sind Absicht und im Code als Schutzzone
markiert: die Vorschaukacheln der Theme-Auswahl in `A11yModal`. Sie sollen
*zeigen*, wie ein Design aussieht — würden sie den Variablen folgen, sähen alle
vier gleich aus und die Auswahl wäre sinnlos.

### Der eigentliche Gewinn: 100 Zeilen weniger

Die Neutralisierungsschicht aus 0.8.1 ist entfallen — rund 90 Selektoren, die in
den beiden Hochkontrast-Themes jede feste Palettenfarbe per `!important` auf die
Theme-Farbe zwangen. Sie war eine Notlösung für ein Problem, das jetzt an der
Wurzel behoben ist.

Zwei Gründe, sie nicht zu vermissen:

- Sie wirkte **nur** in den Hochkontrast-Themes. Hell und Dunkel waren nie
  abgedeckt — genau die Lücke, durch die in 0.9.8 die Minus-Taste unsichtbar
  wurde.
- Sie erfasste `bg-white` nicht, weshalb die Backup-Karte im Theme „Kontrast
  dunkel" eine weiße Fläche war (0.9.9).

Nebeneffekt, der aus der Selektorliste folgt: Die Schicht enthielt
`[class*="bg-slate-"]`, und die Vorschaukachel für „Dunkel" trägt `bg-slate-900`.
Sie wurde in den Kontrast-Themes also auf `--card-bg` (#000000) gezwungen — die
Vorschau für „Dunkel" zeigte dort Schwarz statt Dunkelgrau. Nachgemessen nach
dem Entfernen: `oklch(0.208 0.042 265.755)`, also wieder slate-900, und zwar in
jedem aktiven Theme.

### Changelog-Symbole: Farbe sagt jetzt etwas

Dort standen zehn Farben ohne System — `<Sparkles>` erschien in Violett, Cyan,
Rosé, Himmelblau, Bernstein, Smaragd und Purpur. Die Farbe war reine Dekoration.
Jetzt richtet sie sich nach dem **Symboltyp**:

| Symbol | Bedeutung | Token |
|---|---|---|
| `Bug` | Fehlerbehebung | `--danger` |
| `ShieldCheck` | Sicherheit / Stabilität | `--info-border` |
| `Sparkles` | neue Funktion | `--accent` |
| `Activity` | Verhalten / Tempo | `--warning-border` |

### Gemessen

Kontrast je Bildschirm × vier Themes, Hintergrund über die Elternkette
aufgelöst und mit Alpha verrechnet — **ohne** die Neutralisierungsschicht:

| Bildschirm | geprüfte Textelemente | Verstöße |
|---|---|---|
| Report | 99 | 0 |
| Optionen | 24 | 0 |
| Changelog | 191 | 0 |
| Hilfe | 69 | 0 |
| RV Analyse | 30 | 0 |
| RV Archiv | 15 | 0 |
| RV Zeit | 23 | 0 |
| Datensicherung | 19 | 0 |

Backup-Karte im Theme „Kontrast dunkel": `rgb(0, 0, 0)` — vorher weiß.

Layout bei 360 px über vier Themes × drei Schriftgrößen: 12 von 12
Kombinationen ohne seitliches Scrollen, Zählerzeile überall einzeilig.

`npm run lint`, `npm run check` (58/58) und `npm run build` grün.

### Zwei Fehler im eigenen Vorgehen

**Ein Muster hat ein Präfix gefressen.** Die Ersetzungsliste enthielt
`bg-red-500`, die Vorlage im Code war aber `bg-red-500/10`. Ergebnis:
`bg-[var(--danger-solid)]/10` — ein Alpha-Suffix auf einer CSS-Variablen, was
Tailwind nicht zuverlässig auflöst. Die Sortierung nach Länge schützt nur, wenn
*beide* Varianten in der Liste stehen. Drei solcher Artefakte, alle im
Nachlauf durch das passende fertige Token ersetzt.

**Eine Messung hat den falschen Bildschirm gemessen.** Der erste Versuch, das
Changelog zu prüfen, lief über `?tab=changelog` und meldete „0 von 99" — sauber.
Nur: `App.tsx` akzeptiert im URL-Initializer ausschließlich `time`, `stats`,
`history` und `options`; alles andere fällt auf `form` zurück. Gemessen wurde
also erneut die Report-Seite. Aufgefallen an der identischen Elementzahl. Seither
prüft der Messcode mit einem Kennzeichen aus dem Bildschirmtext, ob er
überhaupt dort ist, wo er zu sein glaubt (`erkannt: true`), und die Elementzahlen
unterscheiden sich entsprechend.

### Offen

Unverändert: die 43,5-px-Regel ist bei 360 px in den großen Schriftgrößen nicht
erfüllbar (siehe Nachtrag in `CLAUDE.md`), und 320 px tritt dort über den
Kartenrand.

**Nicht verifiziert:** das optische Ergebnis. Der Browser-Pane war nicht
eingeblendet, Screenshots liefen in den Timeout. Alles oben sind Messwerte.

---

## 2026-08-08 — v0.9.9: Ein Farbsystem statt 278 Einzelentscheidungen

Auftrag von Marc: Design überarbeiten — barrierefrei, modern, responsive.
Dazu kam ein Regelblock, der ans Ende von `CLAUDE.md` sollte. Der ist dort
angekommen (die `[cite: 1]`-Marker aus dem Quelldokument habe ich entfernt,
das war Werkzeug-Rauschen, kein Regelinhalt).

### Ausgangslage

Das System war im Kern gut: vier Themes über CSS-Variablen, Safe-Area-Insets,
`prefers-reduced-motion`, eigener Schieberegler, bewusster System-Schriftstapel.
Kaputt war die Durchsetzung: **278 Stellen** nutzten feste Palettenfarben
(`bg-emerald-600`, `text-slate-400` …), die jede Theme-Wahl ignorieren. Nur die
beiden Hochkontrast-Themes bekamen die `!important`-Neutralisierung aus 0.8.1;
Hell und Dunkel gingen leer aus. Genau diese Lücke machte in 0.9.8 die
Minus-Taste unsichtbar.

### Neu: semantische Tokens

Je Status ein Dreiklang aus Fläche, Rand und Schrift (`success`, `warning`,
`info`, `danger`), dazu gefüllte Varianten (`--danger-solid`,
`--warning-solid`), vier Kategoriefarben für die Bereichskarten, eine
Elevations- und eine Radiusskala. Alles für alle vier Themes.

Die Kategoriefarben sind bewusst **nicht** auf `--accent` zusammengefallen: Auf
der Report-Seite unterscheidet die Farbe die vier Bereiche, sie trägt also
Bedeutung. In den Hochkontrast-Themes fallen sie zusammen — dort übernehmen
Beschriftung und Symbol die Unterscheidung, wie im Rest der App auch.

### Vier Defekte, die dabei aufgefallen sind

1. **`:focus-visible` verformte jedes Element.** Die Regel setzte
   `border-radius: 4px !important` — das galt nicht für den Ring, sondern für
   das Element selbst. Jede `rounded-2xl`-Karte sprang beim Fokussieren von
   16 px auf 4 px Ecken. Entfernt; Ring und Hof folgen jetzt der Rundung.

2. **Der Umschalter-Knopf im Barrierefreiheits-Dialog war unsichtbar.** Er war
   fest `bg-white`, gegen eine Spur, die im Ein-Zustand `--accent` ist.
   Gemessen über alle acht Zustände:

   | Thema | EIN (vorher) | AUS (vorher) |
   |---|---|---|
   | Hell | 5,02 | **1,00** |
   | Dunkel | **2,28** | 20,17 |
   | Kontrast dunkel | **1,00** | 21 |
   | Kontrast gelb | **1,07** | 21 |

   Drei Zustände buchstäblich unsichtbar, ein vierter unter den 3:1 — und das
   ausgerechnet im Dialog für Barrierefreiheit. Der Knopf kippt jetzt mit der
   Spur (`--accent-text` auf der Akzentspur, sonst `--text-color`): 5,02 bis 21
   in allen acht Zuständen.

3. **`bg-amber-600` mit weißer Schrift lag bei 3,3:1** — unter den 4,5:1 für
   normalen Text. Betraf die „Neu verbinden"-Taste im Sync-Warnbanner. Ersetzt
   durch `--warning-solid` (#92400e hell / #b45309 dunkel).

4. **`bg-white` entkommt der Hochkontrast-Neutralisierung.** Die Selektorliste
   kennt `bg-slate-`, `bg-gray-` usw., aber nicht `bg-white`. Nachgemessen im
   Theme „Kontrast dunkel": `bg-white` bleibt `rgb(255,255,255)`,
   `bg-slate-100` wird korrekt zu `rgb(0,0,0)`. Die Karte des
   Backup-Dialogs war dort also eine weiße Fläche.

### Zwei Stellen, an denen `bg-white` bleiben MUSS

Die QR-Code-Fläche in `DeviceSyncModal` braucht eine weiße Ruhezone, sonst
erkennt die Kamera des anderen Geräts den Code nicht — auch im
Hochkontrast-Theme. Und die Theme-Vorschaukachel in `A11yModal` zeigt, wie das
helle Theme aussieht; sie darf sich nicht mitfärben. Beides ist jetzt im Code
kommentiert, damit ein späterer Durchgang es nicht „repariert".

### Gemessen

Alle sichtbaren Textelemente der Report-Seite, je Theme, Hintergrund über die
Elternkette aufgelöst und mit Alpha verrechnet:

| | vorher | nachher |
|---|---|---|
| Hell | 2 Verstöße | **0** von 116 |
| Dunkel | 1 Verstoß | **0** von 116 |
| Kontrast dunkel | 0 | **0** von 116 |
| Kontrast gelb | 0 | **0** von 116 |

Fest verdrahtete Palettenfarben: **278 → 137** (51 % migriert).
`npm run lint`, `npm run check` (58/58) und `npm run build` grün.

### Zwei eigene Fehler, beide von der Messung gefangen

**Die erste Kontrastmessung war wertlos.** Sie meldete Werte von exakt 1,00.
Ursache war mein Parser: Tailwind 4 gibt Farben als `oklch()` aus, und ich habe
`[\d.]+` daraus gegriffen und als RGB gelesen. Aufschlussreich war, welche
Elemente betroffen waren — genau die noch nicht migrierten, denn `var(--…)`
liefert `rgb()`. Neu gemessen mit Canvas-Normalisierung.

**Ich habe die Tailwind-Skala überschrieben.** Die neuen Tokens hießen zuerst
`--radius-*` und `--shadow-*`. In Tailwind 4 *sind* das die Theme-Variablen
hinter den `rounded-*`- und `shadow-*`-Utilities; `rounded-xl` sprang dadurch
in der ganzen App von 12 px auf 24 px. Auf `--rv-*` umbenannt. Die Lehre steht
als Kommentar an der Definition.

### Offen

**137 feste Farben** in 13 Dateien, im Wesentlichen Changelog (38), Hilfe (28)
und der Rest von `App.tsx` (29). Die sind nicht kaputt — sie folgen nur der
Theme-Wahl nicht und werden in den Hochkontrast-Themes vom `!important`-Layer
aufgefangen. Erst wenn sie weg sind, kann dieser Layer entfallen.

**Die 43,5-px-Regel ist bei 360 px nicht erfüllbar.** Verfügbar 253,9 px,
nötig für fünf Tasten à 44 px 276 px, und das Zahlenfeld braucht ~55 px für
„999" bei 30 px Schrift. Drei Ziele, die sich ausschließen; 0.9.7 hat die
Fünferschritte auf 40 px schrumpfen lassen (weiterhin über den 24 px der
AA-Stufe). Als Nachtrag mit den Zahlen in `CLAUDE.md` dokumentiert — welches
Ziel weichen soll, ist eine Produktentscheidung.

**Nicht verifiziert:** wie das Ergebnis aussieht. Der Browser-Pane war die
ganze Zeit nicht eingeblendet, Screenshots liefen in den Timeout. Marc hat den
Zwischenstand am Dev-Server selbst angesehen und bestätigt; alles Weitere sind
Messwerte.

---

## 2026-08-04 — v0.9.8: Zählerzeile — einheitliche Form, sichtbare Ränder

Nachfassen zu 0.9.7. Marc schickte einen Screenshot vom iPhone: „so siehts
aktuell auf meinem iphone aus". Die **Reihenfolge** stimmte jetzt — die Zeile
sah trotzdem unruhig aus. 0.9.7 hatte also nur die Hälfte des ursprünglichen
Befunds („Kraut und Rüben") getroffen.

### Was der Screenshot zeigte

Fünf Bedienelemente nebeneinander, mit **drei verschiedenen Eckradien und zwei
verschiedenen Höhen**:

| Element | Form | Höhe | Fläche |
|---|---|---|---|
| `−5` | `rounded-lg` | 44 px | Umriss |
| `−` | `rounded-full` | 56 px | `bg-slate-200 dark:bg-slate-800` — fest verdrahtet |
| Zahl | `rounded-xl` | ~52 px | Umriss |
| `+` | `rounded-full` | 56 px | kräftiges Blau |
| `+5` | `rounded-lg` | 44 px | Umriss |

Dazu das eigentliche Ärgernis: Die Minus-Taste war auf der dunklen Karte
nahezu unsichtbar (fest verdrahtetes `dark:bg-slate-800` auf einer fast
gleichfarbigen Fläche), während die Plus-Taste laut leuchtete. Zwei
gleichwertige Funktionen, völlig ungleiches Gewicht.

### Umsetzung

1. **Eine Form für alle fünf**: durchgehend `rounded-xl`, durchgehend 56 px
   hoch. Breiten 48 / 64 / flexibel / 64 / 48 px mit Untergrenzen in Pixeln.
2. **Plus ist das einzige gefüllte Element.** Minus, `−5`, `+5` und das
   Zahlenfeld sind Umriss-Tasten aus Theme-Variablen statt aus fest
   verdrahteten Palettenfarben. Die Karte selbst wechselte von
   `bg-slate-50 dark:bg-slate-800/30` auf `var(--bg-color)`.
3. **Zahlenfeld auf feste `h-[56px]`** statt rem-Innenabstand — sonst wäre es
   das einzige Element, das aus der Reihe wächst.

### Der Fund, der über die Zählerzeile hinausging

Beim Nachmessen der Kontraste fiel `--border-color` (`#8593a8`) durch: **2,98:1**
gegen `var(--bg-color)` — knapp unter den 3:1, die WCAG 1.4.11 für Umrisse von
Bedienelementen verlangt. Der Wert stammt aus 0.7.0 und war damals gegen die
**weiße Karte** geprüft (3,12:1) — korrekt gerechnet, aber nur für eine der
beiden Flächen, auf denen er vorkommt. Auf der leicht grauen Fläche der
Zählerkarten reichte er nicht.

Korrigiert auf `#8290a5` — die kleinste Abdunklung (2 %), die beide Flächen
trägt: **3,24:1** gegen die weiße Karte, **3,10:1** gegen `--bg-color`. Das
betrifft alle Rahmen der App, nicht nur die Zählerzeile, und ausschließlich
nach oben.

### Gemessen

Kontrast der Umrisse bzw. der Plus-Fläche gegen die Zählerkarte:

| Thema | Minus-Umriss | Zahlfeld-Umriss | Plus-Fläche |
|---|---|---|---|
| Hell | 3,10 | 3,10 | 13,98 |
| Dunkel | 3,49 | 3,49 | 3,90 |
| Kontrast dunkel | 21 | 21 | 21 |
| Kontrast gelb | 19,56 | 19,56 | 19,56 |

Alle über 3:1 — vorher lagen Hell bei 2,98 und Dunkel bei 2,55 (Plus 2,85).

Geometrie, je Breite × alle drei Schriftgrößen, mit echtem Viewport-Resize:

| Breite | Zeilen | Höhen | Abstand zum Kartenrand |
|---|---|---|---|
| 375 px (SE 2022, 13 mini) | 1 | 56 px | 10,6 px beidseitig |
| 393 px (15, 16) | 1 | 56 px | 10,6–12,1 px beidseitig |
| 320 px (SE 2016) | 1 | 56 px | **−3,4 px bei „Groß", −10,4 px bei „Extra groß"** |

„999" passt bei 375 px in jeder Schriftgröße vollständig ins Feld (13–26 px
Luft). Kein seitliches Scrollen der Seite in keiner Kombination.

**Offen und unverändert:** 320 px (iPhone SE 1./2. Gen., 2016) tritt bei den
großen Schriftgrößen über den Kartenrand. Betrifft kein aktuell verkauftes
Gerät; die Seite scrollt dabei nicht seitlich.

**Ein Messfehler auf meiner Seite, der fast durchgegangen wäre:** Der erste
Geometrie-Durchlauf iterierte über `[375, 390, 393]`, ohne den Viewport
tatsächlich umzustellen — alle neun Zeilen entstanden bei derselben Breite.
Aufgefallen an den auf 0,1 px identischen Überstandswerten. Wiederholt mit
echtem `resize_window`; erst diese Zahlen stehen oben.

**Nicht verifiziert:** ob es auf Marcs echtem iPhone jetzt ruhig aussieht. Der
Browser-Pane war nicht eingeblendet, ein Screenshot ließ sich nicht erzeugen —
belegt sind nur die Messwerte.

`npm run lint`, `npm run check` (58/58) und `npm run build` grün.

---

## 2026-08-03 — v0.9.7: Zählerzeile auf dem Handy — Reihenfolge korrigiert

Praxis-Rückmeldung von Marcs iPhone: „Am PC siehts gut aus aber am Smartphone
nicht." Genau die Art Befund, die in dieser Umgebung nicht entstehen kann.

### Ursache — ein Fehler aus 0.9.0

Die Bedienzeile stand auf dem Handy in einer **anderen Reihenfolge** als am PC:

| | Reihenfolge |
|---|---|
| PC (ab 640 px) | `−5  −  [Zahl]  +  +5` |
| Handy | `−  [Zahl]  +  −5  +5` |

Das „−5“ saß also rechts vom Plus. Das war in 0.9.0 Absicht: Die
Fünferschritte waren per `order-*` ans Ende gestellt, damit ein **Umbruch**
sauber in `[− Zahl +]` und `[−5 +5]` zerfällt. Der Denkfehler: Bei üblicher
Schriftgröße bricht die Zeile gar nicht um — man sieht nur die verdrehte
Reihenfolge. Am PC fiel es nie auf, weil dort `sm:order-*` die richtige
Reihenfolge wiederherstellt. Nachgemessen bei 390 px: eine Zeile, Reihenfolge
verdreht.

### Umsetzung

1. **`order-*` entfernt**, die `−5`-Taste im DOM vor die Minus-Taste gezogen.
   Damit gilt überall dieselbe Reihenfolge.
2. **Kein Umbruch mehr** (`flex-nowrap`). Wird es eng, geben die Elemente nach
   statt umzubrechen: Fünferschritte 44 → 36 px, Plus/Minus 56 → 48 px. Beides
   nur als Untergrenze — wo Platz ist, bleibt es bei 44 bzw. 56 px.
3. **Grenzen in Pixeln statt in rem.** `min-w-[2.75rem]` und `max-w-[5.5rem]`
   am Zahlenfeld wuchsen mit der Schrifteinstellung mit (bei „Extra groß“ auf
   66 bzw. 132 px) und sprengten die Zeile genau dann, wenn der Platz ohnehin
   knapp war. Die Zahl selbst skaliert weiterhin (WCAG 1.4.4) — nur ihr
   Rahmen nicht.

Beim Umbau zweimal gestolpert, beide Male vom prüfenden Skript abgefangen,
bevor etwas geschrieben wurde: erst passte der Anker nicht (die Datei nutzt
CRLF, mein Suchtext LF), dann schrumpften die Tasten trotz `min-w` nicht —
weil Flexbox bei gesetztem `flex-wrap` lieber umbricht als schrumpft.

### Geprüft

Alle gängigen iPhone-Breiten × alle drei Schriftgrößen, jeweils Reihenfolge,
Zeilenzahl, Überstand über den Kartenrand und ob „999“ noch vollständig ins
Zahlenfeld passt:

| Breite | Normal | Groß | Extra groß |
|---|---|---|---|
| 375 px (SE 2022, 13 mini) | eine Zeile | eine Zeile | eine Zeile |
| 390 px (13, 14) | eine Zeile | eine Zeile | eine Zeile |
| 393 px (15, 16) | volle Tastengröße | volle Tastengröße | volle Tastengröße |
| 320 px (SE 2016) | eine Zeile | 5 px über den Kartenrand | 12 px darüber |

„999“ passt in **jeder** Kombination vollständig ins Feld. Kein seitliches
Scrollen der Seite. Die Report-Seite wurde bei 390 px zusätzlich systematisch
nach verrutschten Elementen abgesucht — ausser der Zählerzeile war nichts
auffällig.

**Offen:** die 320-px-Breite (iPhone SE von 2016) bei grosser Schrift. Dort
stösst die Zeile an den Kartenrand. Betrifft kein aktuelles Gerät.

---

## 2026-08-03 — v0.9.6: Ein Symbolsystem, drei Schriftgewichte

Grundlage ist das Design-Inventar (siehe unten). Umgesetzt sind die Schritte 1
bis 3 des dortigen Vorschlags; Schritt 4 — die 677 fest verdrahteten
Farbklassen — bleibt bewusst offen, weil er einen eigenen Durchgang braucht.

### Ausgangslage, gemessen

| | vorher |
|---|---|
| Emojis als Symbol | 51 verschiedene, 147 Fundstellen |
| echte Icons | 90 verschiedene |
| Schriftgewicht-Klassen | 6 (`black`, `extrabold`, `bold`, `semibold`, `medium`, `normal`) |
| davon gleichzeitig sichtbar | 5 |

### Was das praktisch bedeutete

Emojis sehen auf jedem Betriebssystem anders aus, folgen keinem Farbschema und
lassen sich im Hochkontrast-Modus nicht umfärben — ausgerechnet dort, wo es am
meisten zählt. In Meldungen (`triggerToast`, `announceToAriaAndSpeech`) wurden
sie zudem vom Screenreader mitgelesen.

### Umsetzung

**1. Symbolkarte vervollständigt.** `utils/iconMap.ts` übersetzte bereits 14
Emojis in Icons — der halbe Weg war gebaut. Jetzt 27 Einträge, die *alle*
Symbole abdecken, die die App vergeben kann: die Standardfelder, die
Auswahlliste für eigene Kategorien und den Altbestand früherer Fassungen.
Entscheidend: **Die Emojis bleiben als gespeicherter Wert erhalten.** Nur die
Darstellung ändert sich — bestehende Kategorien, alte Datensicherungen und der
Geräte-Sync mit einer älteren Fassung funktionieren unverändert.

**2. Emojis aus der Oberfläche entfernt.** 45 Stellen in fünf Dateien: aus
Meldungen ersatzlos gestrichen, in Bedienelementen durch das passende Icon
ersetzt (Kompakt, Vorlage, Ziele, Datumstempel, „an VL senden“, Bestätigungen).
Umgesetzt mit einem Skript, das jede Fundstelle vorher prüft und abbricht,
bevor es schreibt, falls eine nicht genau einmal vorkommt.

**3. Schriftgewichte auf drei reduziert.** 136 Stellen, jede nur *eine* Stufe:
`extrabold` → `black`, `semibold` → `bold`, `medium` → `normal`. Die Schrift
wird nirgends dünner — für die Zielgruppe wäre das ein Rückschritt. Übrig:
900 für Überschriften und Zahlen, 700 für Bedienelemente, 400 für Fließtext.
Der Sprunglink in `index.css` stand als einziges Element noch auf 800 und ist
mitgezogen.

Nebenbei: Das Kategorie-Symbol in der Zählerkarte stand auf einer fest
verdrahteten Blaustufe und folgt jetzt `var(--accent)`.

### Geprüft

Neue Prüfgruppe `scripts/checks/symbole.ts` (6 Fälle), damit das nicht
zurückfällt:
- jedes Standard-Symbol und jedes wählbare Symbol hat einen Karten-Eintrag
- die Symbole aus dem Altbestand sind weiterhin abgedeckt
- unbekannte Zeichen liefern `null`, statt zu werfen
- **Meldungen enthalten keine Emojis** (`triggerToast` / `announceToAriaAndSpeech`)

`npm run check` steht damit bei **58 Fällen**. Am laufenden System über alle
fünf Hauptansichten gemessen:

| | vorher | nachher |
|---|---|---|
| sichtbare Emojis | 14 (nur RV Report) | **0 in allen fünf Ansichten** |
| Schriftgewichte | 5 | **3 (400 / 700 / 900)** |
| Symbolfarbe Zählerkarte | fest `blue-600` | `var(--accent)` |

`npm run lint` und `npm run build` fehlerfrei, kein waagerechter Überlauf.

**Bewusst offen:** die 677 fest verdrahteten Farbklassen. Erst danach kann die
`!important`-Schicht aus 0.8.1 entfallen, mit der die Hochkontrast-Schemata
diese Farben heute übermalen.

---

## 2026-08-03 — v0.9.5: Geräte-Sync abgesichert

Grundlage ist [KONZEPT-0.9.5.md](KONZEPT-0.9.5.md) — eine vollständige Prüfung
des Sync-Bereichs am laufenden System, nicht nur am Code. Der Einmal-Transfer
war bis dahin nie getestet worden.

### Was lief (belegt)

Textcode erzeugen, am zweiten Gerät einfügen, zusammenführen: Zähler beider
Geräte bleiben erhalten, Kommentar kommt an, Umlaute und Emojis unversehrt.
Zusammen mit den Live-Verbindungs-Prüfungen aus 0.9.1/0.9.2 ist der Bereich in
seinen normalen Abläufen in Ordnung.

### Befund 1: Der Import prüfte die Struktur nicht — reproduzierter Absturz

`handleAssembled` prüfte nur, ob sich der Text als JSON lesen lässt. Ein Paket
mit gültigem JSON, aber unsinniger Struktur
(`{"appFields":"kaputt","history":12345,…}`) wurde angenommen — die App meldete
„Daten vollständig empfangen". Ein Tipp auf „Alles ersetzen" führte direkt in
den Fehlerbildschirm: *Cannot read properties of undefined (reading 'forEach')*.

Genau nachgemessen: Nach dem Neuladen lief die App wieder und die gespeicherten
Daten waren unversehrt — der Absturz geschah beim Zeichnen, bevor die
Speicher-Effekte liefen. **Kein Datenverlust**, aber bis zum Neuladen
unbenutzbar und ohne Erklärung. Dass die Daten überlebten, ist eine Eigenschaft
dieses Falls und war keine Zusage der Umsetzung.

**Umsetzung:** Neue `utils/syncSchema.ts` mit `pruefeSyncPaket()`. Geprüft wird
nur so viel, dass die Oberfläche nicht abstürzt und das Zusammenführen sinnvoll
arbeiten kann; unbekannte Zusatzfelder bleiben erlaubt, damit ältere und
neuere Fassungen zusammenarbeiten. Das Paket trägt jetzt eine Kennung
(`app: "rvmobil"`, `fmt: 1`) — fehlt sie, greift die reine Strukturprüfung,
Pakete vor 0.9.5 bleiben also lesbar. Eingehängt an **drei** Stellen: früh im
Sync-Fenster (für eine gute Meldung), in `handleSyncImport` als letzte
Verteidigungslinie (dort läuft auch der Live-Kanal durch) und beim Einspielen
einer Datensicherung, die denselben Weg nutzt.

### Befund 2: „Alles ersetzen" löste mit einem Tipp aus

Die folgenschwerste Aktion der App — sie überschreibt das gesamte Archiv des
empfangenden Geräts — hatte keine Rückfrage, während der weit harmlosere
Monatsabschluss seit 0.9.0 eine hat. Jetzt der bekannte `ConfirmDialog` in der
roten Variante, mit konkreten Zahlen aus beiden Ständen (Monate hier, Monate im
Paket) und Startfokus auf „Abbrechen".

Nebenbei den Erklärtext daneben berichtigt: Er beschrieb noch das
Zusammenführen von vor 0.9.1 („Pro Monat gewinnt der zuletzt gespeicherte
Stand") — seit 0.9.1 wird feldweise abgeglichen.

### Befund 3: Der Textcode war unverschlüsselt, die Oberfläche sagte etwas anderes

Nachgewiesen: Ein echter Code liess sich mit drei trivialen Schritten
(base64 → `deflate-raw` → `JSON.parse`) in Klartext zurückverwandeln — Name,
Kommentare, alle Zählerstände, das komplette Archiv. Im selben Fenster standen
zwei Aussagen, die sich widersprachen: oben „100 % serverlos … ohne
Zwischenspeicherung auf fremden Servern", nach dem Kopieren der Rat, den Code
„per Nachricht an sich selbst oder E-Mail" weiterzugeben.

Für QR gilt das nicht (Bildschirm → Kamera), für die Live-Verbindung ebenso
wenig (DTLS-verschlüsselt). Auffällig war die Unwucht: Die Datensicherung kann
mit Passwort verschlüsselt werden, der Sync-Code nie.

**Umsetzung:** Neues Format `RVC2:` mit AES-GCM über dasselbe `crypto.ts` wie
das Backup. Das Passwort ist freiwillig; ohne Eingabe entsteht weiterhin ein
`RVC1:`-Code. Verschlüsselt wird erst beim Kopieren — PBKDF2 mit 100 000 Runden
darf nicht bei jedem Tastendruck laufen. Auf der Empfangsseite erscheint das
Passwortfeld, sobald ein `RVC2:`-Code im Feld steht, und die Meldungen
unterscheiden „Passwort fehlt", „Passwort falsch" und „kein RV-Mobil-Code".
Die Kopplungscodes der Live-Verbindung bleiben bewusst offen — sie enthalten
keine Berichtsdaten. Der Ratschlag zum Mailversand ist weg; stattdessen steht
bei jedem Weg, was er bedeutet.

### Nebenarbeit

Die Code-Funktionen (Komprimieren, Base64, QR-Teilstücke, Textcodes) lagen in
der über 1000 Zeilen langen `DeviceSyncModal.tsx` und waren nicht prüfbar. Sie
liegen jetzt in `utils/syncCode.ts`.

### Geprüft

`npm run check` umfasst jetzt **52 Fälle** (vorher 37). Neu: Struktur-Prüfung
(gültiges Paket, altes Paket ohne Kennung, der reproduzierte Unsinns-Fall,
zehn einzeln beschädigte Varianten, Kopplungscode, fremde Anwendung, unbekannte
Zusatzfelder) und Übertragungscodes (Umlauf mit und ohne Passwort, fehlendes
und falsches Passwort, kein Klartext im verschlüsselten Code, QR-Teilstücke
zerlegen und zusammensetzen, beschädigte Teilstücke).

Am laufenden System:

| Prüfung | Ergebnis |
|---|---|
| derselbe Unsinns-Code wie im Befund | „Die Kategorien im Paket sind beschädigt." — kein Absturz, keine Übernahme angeboten |
| „Alles ersetzen" | Rückfrage mit korrekten Zahlen, Startfokus auf „Abbrechen" |
| Code mit Passwort | Präfix `RVC2:`, kein Klartext im Code, Passwortfeld erscheint sofort |
| falsches Passwort | „Das Passwort passt nicht zu diesem Code." |
| richtiges Passwort | Übernahme wird angeboten, Zusammenführen läuft durch |

**Nicht umgesetzt (bewusst):** die Vereinfachung der Kopplung — von Marc
zurückgestellt, Begründung in der ROADMAP. Ebenso der Status je Monat im
Archiv, weil das neue Oberfläche wäre und der Gerätetest ansteht.

---

## 2026-08-02 — v0.9.4: Automatische Kontrolle vor jeder Veröffentlichung

Vorgezogen aus der 1.0-Liste (Punkte „Automatische Tests für die Rechenkerne"
und „Automatische Prüfung bei jedem Push"). Begründung: Jeder Push auf `main`
veröffentlicht sofort, und bis hierher gab es **keinerlei** automatische
Kontrolle davor. In dieser Sitzung sind drei Fehler derselben Familie
aufgetreten — einer davon ging seinerzeit unbemerkt live:

| Fehler | Ausgang |
|---|---|
| PowerShell zerstörte Umlaute und 72 Emojis in `App.tsx` | **unbemerkt live gegangen** (0.7.0) |
| Bash-Quoting zerlegte Template-Literale in `App.tsx` | zufällig binnen Minuten bemerkt |
| PowerShell las UTF-8 als ANSI beim Dateivergleich | erzeugte einen Fehlbefund, der zuerst als echt gemeldet wurde |

### Was jetzt läuft

`npm run check` — 37 Prüfungen, bewusst **ohne Test-Framework**: `tsx` ist für
den Dev-Server ohnehin da, und das Projekt sollte keine Testabhängigkeiten
bekommen. Ein schlankes Gerüst (`scripts/helfer.ts`) sammelt die Fälle,
`scripts/pruefen.ts` führt sie aus und endet mit Fehlercode.

Geprüft werden ausschliesslich reine Funktionen an den Stellen, an denen ein
Fehler echten Schaden anrichtet:

- **Zusammenführen beim Geräte-Sync** (11 Fälle) — verschiedene Felder bleiben
  beide erhalten, Reihenfolge der Geräte egal, bei gleichem Feld gewinnt die
  jüngere Änderung, Korrektur nach unten setzt sich durch, Rückfallebene für
  Altdaten ohne Feld-Zeitstempel, vollständige Stempelliste nach dem Merge,
  Idempotenz, Konvergenz beider Seiten, Vereinigung von Schichten und
  Kategorien.
- **Excel-Export** (7 Fälle) — Formular und Archiv erzeugen dieselbe Datei,
  Summenformeln zeigen auf die richtigen Zeilen, der Arbeitszeit-Bereich zählt
  nicht in die Aktivitäten-Summe, Sortierung der Schichten nach Datum.
- **Arbeitszeit** (6 Fälle) — inklusive Schicht über Mitternacht.
- **Backup-Verschlüsselung** (5 Fälle) — Umlauf, falsches Passwort schlägt
  fehl, beschädigte Datei schlägt fehl, jedes Backup bekommt eigenes Salt/IV.
- **Textkodierung** (4 Fälle) — doppelt kodierte Zeichen in `src/`, BOM am
  Dateianfang, und ob die Standardfelder ihre Umlaute und alle 18 Symbole noch
  haben.

Der Deploy-Workflow führt `lint`, `check` und `npm audit` **vor** dem Bauen
aus. Schlägt etwas fehl, bricht der Job ab und der bisherige Stand bleibt
online. `npm audit` meldet nur (`|| true`) — ein neuer Fund in einer
Unterabhängigkeit soll keine fertige Version blockieren.

### Nebenarbeit: Arbeitszeit-Berechnung herausgelöst

Sie lag als lokale Funktion in `ClockInWidget.tsx` (gut 1000 Zeilen) und war
deshalb nicht prüfbar — obwohl ein Fehler dort unmittelbar in falschen
Stundenzahlen landet. Jetzt in `src/utils/timeUtils.ts`. Dabei zwei Dinge
bereinigt: Die Mitternachts-Behandlung stand doppelt da (der zweite Zweig war
unerreichbar), und unbrauchbare Eingaben lieferten `NaN`, das während des
Ausfüllens durch die Oberfläche wandern konnte — jetzt 0.

### Geprüft, dass die Prüfungen auch beissen

Ein grüner Lauf beweist für sich genommen nichts. Zwei Gegenproben:

1. Eine Datei mit absichtlich zerstörtem Text (`VorfÃ¼hrungen`) in `src/`
   abgelegt → die Kodierungs-Prüfung schlägt an, Lauf endet mit Fehlercode 1.
   Datei wieder entfernt.
2. Eine Erwartung verfälscht (7,75 → 7,76 Stunden) → der Wertevergleich meldet
   „erwartet 7.76, war 7.75", Fehlercode 1. Zurückgesetzt.

Eine Ausnahme war nötig: `ChangelogModal.tsx` enthält die zerstörte
Zeichenfolge absichtlich als Beispiel im Text zu 0.7.0. Ohne Ausnahmeliste
hätte die Prüfung ab sofort dauerhaft angeschlagen.

`npm run lint` deckt jetzt auch `scripts/` ab, `npm audit --omit=dev` meldet
0 Schwachstellen.

---

## 2026-08-02 — v0.9.3: Durchsicht der Codebase, Hilfetexte und Ladezeit

Anlass: Marcs Frage, ob die Codebase sauber ist, ob die Hilfetexte wirklich
helfen und wo es Optimierungen gibt. Alle drei Punkte geprüft, die Funde
abgearbeitet.

### 1. Stiller Datenverlust beim Wiederherstellen und Zusammenführen

Der schwerste Fund der Durchsicht. Das Archiv wurde an zwei Stellen mit
`.catch(() => {})` in die IndexedDB geschrieben — beim Einspielen einer
Datensicherung und beim Zusammenführen zweier Geräte. Schlägt der
Schreibvorgang fehl (Speicher voll, IndexedDB blockiert), meldete die App
trotzdem „Backup erfolgreich geladen!" — und nach dem nächsten Öffnen wäre
alles weg gewesen.

Genau diese Fehlerklasse hatte das Stabilitäts-Audit vom 2026-08-01 für den
Autospeicher behoben und dafür `persistHistory(…, handleHistoryPersistFailure)`
eingeführt; **diese beiden Pfade nutzten es nicht.** Jetzt schon: Ein
Fehlschlag setzt den persistenten Warnbanner und wird angesagt. Die Sicherung
beim Wechsel in den Hintergrund schluckt ihren Fehler ebenfalls nicht mehr
komplett (Konsole) — dort ist er unkritisch, weil die Notfallkopie in
localStorage greift.

### 2. Hilfetexte: vier Aussagen stimmten nicht mehr

Jede Sachaussage gegen den Code geprüft. **Korrekt waren** alle sieben
Tastenkürzel (einzeln nachgesehen), die Backup-Endungen, was die Stempeluhr
automatisch überträgt, „Empfängeradresse ist nicht hinterlegt", die
Acht-Kategorien-Grenze, Suchleiste und Sprunglink.

Falsch bzw. veraltet und jetzt korrigiert:

| Stelle | war | ist |
|---|---|---|
| Monat abschließen | „Sobald Sie den Knopf drücken, passieren zwei Dinge" | Rückfrage vorweg, danach **Rückgängig** — beides erklärt (seit 0.9.0 vorhanden, in der Hilfe gefehlt) |
| Schnell-Erfassung | „Ein Tipp = plus eins" | stimmt für Zähler; die selbst wählbaren Stunden-Felder aus Bereich 4 zählen in **halben Stunden** |
| Live-Verbindung | „endet, wenn Sie trennen oder die App schließen" | dritter Fall ergänzt: bricht sie ab, meldet die App das (0.9.2); dazu das feldweise Zusammenführen aus 0.9.1 |
| Backup-Passwort | „tragen Sie es in das Passwortfeld ein" | benennt jetzt das konkrete Feld |

Beim letzten Punkt liess sich die Hilfe gar nicht sauber formulieren, weil die
Oberfläche zwei Passwortfelder hatte, die abwechselnd erschienen — je nachdem,
ob das Häkchen „Backup mit Passwort schützen" gesetzt war. Beide schrieben in
denselben Zustand, aber beim Wiederherstellen sah man ein Feld mit der
Aufforderung „Sicheres Passwort vergeben", obwohl man ein vorhandenes Passwort
eingeben sollte. Jetzt: **ein** Feld, beschriftet „Passwort", mit einem
Hinweistext, der sich nach dem Häkchen richtet. Nebenbei die einzige Stelle
korrigiert, die den Nutzer duzte („Bitte gib …").

### 3. Ladezeit: Start-Bundle mehr als halbiert

Gemessen: Das Start-Bundle enthielt QR-Erzeugung, Kamera-Scanner und die
Animationsbibliothek — alles nur im Geräte-Sync bzw. in der Datensicherung
gebraucht, beides auf der Startseite nie geöffnet.

| | vorher | nachher |
|---|---|---|
| Start-Bundle | 996 KB (288 KB gzip) | **477 KB (129 KB gzip)** |
| nachgeladen: Geräte-Sync | — | 383 KB (115 KB gzip) |
| nachgeladen: Animationen | — | 125 KB (41 KB gzip) |
| nachgeladen: Datensicherung | — | 10 KB (3 KB gzip) |

**55 % weniger JavaScript bei jedem Start und nach jeder Aktualisierung.**
Umgesetzt mit `React.lazy` + `Suspense` und einem sichtbaren Platzhalter.

### 4. Aufräumen

`formatMonthGerman` existierte **dreimal**: in `utils/dateUtils.ts`, als
lokale Kopie in `App.tsx` und nochmal in `HistoryModal.tsx` — dort wurde die
Util-Funktion sogar importiert und anschliessend von der lokalen überdeckt,
der Import war tot. Jetzt eine Quelle. `CLAUDE.md` an zwei überholten Stellen
berichtigt (Excel-Export ist seit 0.9.0 nicht mehr doppelt; die Deploy-Frage
ist geklärt).

### Geprüft

`npm run lint` und `npm run build` fehlerfrei. Im Browser: Zähler weiter
funktionsfähig, beide nachgeladenen Bereiche öffnen sich, Datensicherung als
vollständiger Umlauf **mit Verschlüsselung** — Backup mit Passwort erzeugt
(Endung `.json.enc`, Inhalt tatsächlich verschlüsselt), Wert danach von 7 auf 9
geändert, Datei ohne Passwort eingespielt → saubere Fehlermeldung, danach mit
Passwort → Wert steht wieder auf 7.

### 5. Platz im RV Report (nach Marcs Entscheidung)

Zur Auswahl standen: Umschalter in die Optionen verschieben, auf eine Zeile
eindampfen oder so lassen. Marc wählte das Eindampfen, dazu den Fristen-Hinweis
nur noch bei Bedarf.

- **Schnell-Optionen auf eine Zeile.** Die Überschrift „Schnell-Optionen" ist
  entfallen (der Bereich trägt sie jetzt als `aria-label` am `role="toolbar"`),
  die „Ein/Aus"-Plaketten sind durch `aria-pressed` bzw. `aria-expanded`
  ersetzt — das lesen Screenreader von sich aus vor, es kostet aber keinen
  Platz. „Vorlage laden" heisst nur noch „Vorlage".
- **Fristen-Hinweis nur im relevanten Zeitfenster.** Der allgemeine Merksatz
  stand alle 31 Tage im Monat da. Jetzt erscheint er in den letzten fünf Tagen
  des Monats und bis zum 8. des Folgemonats; die dringende Variante (rot,
  ungesendete Zahlen) ist unverändert. Die Berechnung des Monatsletzten wurde
  gegen Februar, Schaltjahr-Februar, 30- und 31-Tage-Monate geprüft.

Gemessen auf einem 390-px-Handy:

| | vorher | nachher |
|---|---|---|
| Block „Schnell-Optionen" | 203 px, 2 Tastenzeilen | **126 px, 1 Zeile** |
| Fristen-Hinweis | immer 80 px | nur an ~13 Tagen im Monat |
| erster Zählerbereich beginnt bei | 1256 px | **1171 px** (mitte Monat nochmals 80 px früher) |
| Gesamtlänge der Seite | 5285 px | 5166 px |

### 6. Changelog als Beta gekennzeichnet

Alle 13 Versionseinträge tragen jetzt eine „Beta"-Plakette neben der
Überschrift (Kontrast geprüft: 6,4 / 10,4 / 21 / 19,6 in den vier Farbschemata).

---

## 2026-08-02 — v0.9.2: Verbindungsabbruch wird gemeldet, Paketform entschlackt

Die drei Punkte, die beim Live-Sync-Audit (0.9.1) offen geblieben waren.

### 1. Abbruch der Live-Verbindung blieb stumm

Bisher verschwand bei einem Abbruch nur das grüne Abzeichen im Kopfbereich.
Die Erklärung stand ausschließlich im Sync-Fenster — das man beim Arbeiten
nicht offen hat. Wer gerade Zahlen eintippt, bemerkt nichts und hält beide
Geräte weiter für gleichauf.

Dazu kam ein Loch in der Erkennung: `ch.onclose` (die Gegenseite schließt den
Kanal, weil dort die App zugeht oder das Gerät sperrt) setzte lediglich
`connected = false`, aber **nicht** `failed`. Genau der häufigste Fall meldete
also gar nichts.

**Umsetzung:** Gemeinsame Funktion `verbindungVerloren()` in `liveSync.ts`, an
`onclose` und an den Verbindungszustand gehängt. Damit gewolltes Trennen nicht
als Abbruch durchgeht, hängt `closePeerOnly()` die Handler jetzt ab, *bevor*
geschlossen wird — sonst hätte der eigene Knopf „Verbindung trennen" eine
Abbruch-Warnung ausgelöst. In `App.tsx` ein Hinweisstreifen (`role="alert"`)
mit „Neu verbinden" und „Ausblenden" plus Sprachansage.

### 2. Toter Schlüssel im Sync- und Backup-Paket

`buildSyncPayload` schickte zusätzlich `timeLogs` mit. Die Gegenseite hat den
Schlüssel nie gelesen — weder `mergeSyncPayload` (der ihn in `SyncPayload`
gar nicht kennt) noch die Ersetzen-Variante. Reiner Ballast in jeder Nachricht
und in jeder Datensicherung; die Schichten stecken ohnehin in `reportData` und
im Archiv. Entfernt. Für ältere Gegenstellen unkritisch: Sie ignorieren den
Schlüssel ebenso, und ältere Backups mit dem Schlüssel lassen sich weiterhin
einspielen.

### 3. Paketform und Wiedereinspielen waren doppelt

Die Paketform wurde an zwei Stellen gebaut (Geräte-Sync und Datensicherung),
das Wiedereinspielen ebenfalls — fast gleich, mit dem üblichen Risiko, nur
eine Stelle zu pflegen. Beides läuft jetzt über `buildSyncPayload` und die
neue Funktion `ersetzeGesamtstand`. Nebeneffekt: Die Datensicherung schreibt
jetzt ebenfalls stabil sortiertes JSON.

### Geprüft

Am laufenden System, zwei gekoppelte Instanzen:
- Gerät B geschlossen → auf Gerät A erscheint der Hinweisstreifen mit beiden
  Tasten, **und die Ansage steht im ARIA-Live-Bereich** (damit liest der
  Screenreader sie vor); das grüne Abzeichen ist weg.
- Verbindung selbst getrennt → **keine** Warnung (die Regression, gegen die
  das Abhängen der Handler schützt).

Datensicherung als vollständiger Umlauf: Export abgefangen und geprüft
(Schlüssel `appFields`, `carryover`, `history`, `reportData` — kein `timeLogs`
mehr, Feld-Zeitstempel enthalten), Wert danach von 3 auf 5 geändert, Backup
wieder eingespielt, Wert steht wieder auf 3.

`npm run lint` und `npm run build` fehlerfrei.

**Weiterhin offen:** Test auf echten Geräten im WLAN (Roadmap-Punkt 1). Ein
echter Verbindungsabbruch durch WLAN-Verlust ließ sich hier nicht nachstellen —
geprüft wurde der Weg über das Schließen der Gegenstelle, der dieselbe
Funktion auslöst.

---

## 2026-08-02 — v0.9.1: Live-Verbindung verlor Eingaben und kam nie zur Ruhe

Anlass war Marcs Frage, ob der Live-Sync „gut so" ist. Geprüft wurde nicht am
Code, sondern an zwei tatsächlich gekoppelten Instanzen (Kopplung über den
Textcode, echte WebRTC-Verbindung, DataChannel-Verkehr mitgezählt).

### Befund 1: Stiller Datenverlust bei gleichzeitiger Eingabe

Zweimal reproduziert, beide Male mit Verlust:

| Durchgang | Gerät A tippt | Gerät B tippt | Nach 9 s auf **beiden** Geräten |
|---|---|---|---|
| 1 | Vorführungen Arbeitsplatz → 1 | Auslieferungen Schule → 1 | Vorführungen Arbeitsplatz: **leer** |
| 2 | Vorführungen Schule → 5 | Auslieferungen Arbeitsplatz → 1 | Auslieferungen Arbeitsplatz: **leer** |

Ursache: `mergeRecord` nahm pro Monat den **kompletten** Datensatz mit dem
jüngeren `savedAt`; nur die Schichten wurden vereinigt, die Zählerstände
nicht. Wer im Abgleichsfenster als Zweiter stempelte, überschrieb alle Felder
des anderen. Aus Nutzersicht die schlimmste Variante: Die Zahl war da, wurde
angesagt — und war Sekunden später ohne Hinweis weg.

**Umsetzung:** Zeitstempel je Zählerfeld (`valuesUpdatedAt` in `types.ts`),
gesetzt an jeder Stelle, die Zählerstände ändert. `mergeValues` entscheidet
feldweise; nur bei Änderungen am *selben* Feld gewinnt die jüngere.
Rückfallebene für Bestandsdaten ohne Feld-Stempel: der Monats-Zeitstempel —
damit verhält sich alter Bestand exakt wie bisher.

**Beim Testen teuer gelernt (erste Fassung war falsch):** Diese Rückfallebene
allein genügt nicht. Der Monats-Zeitstempel wandert nach vorn, sobald
*irgendein anderes* Feld getippt wird — ein unverändert alter Wert bekam
dadurch einen taufrischen Stempel und überschrieb weiterhin die echte
Änderung des anderen Geräts. Im Live-Test sichtbar geworden: Gerät B tippte
5 → 6, Sekunden später stand dort wieder 5. Behoben, indem fehlende Stempel
*einmal beim Laden* mit dem damaligen Speicherzeitpunkt nachgetragen werden
(`stempelNachtragen`), bevor der Monats-Zeitstempel sich bewegen kann, und
indem `mergeValues` nach jedem Zusammenführen eine vollständige Stempelliste
zurückgibt.

### Befund 2: Der Abgleich kam nie zur Ruhe

Gemessen ohne jede Eingabe, 20 Sekunden: **7 Nachrichten raus, 7 rein, je
~29,5 KB**. Ursache: Jedes Zusammenführen erzeugt neue Objekte, woraufhin der
Auto-Archiv-Effekt ein frisches `savedAt` schrieb; damit galt der Datenstand
als geändert und wurde erneut gesendet — endlos, samt IndexedDB-Schreibvorgang
im Dreisekundentakt auf beiden Geräten (nachgewiesen: `savedAt` änderte sich
exakt alle 3 s). Nebenwirkung: `savedAt` sagte als „zuletzt gespeichert"
nichts mehr aus, obwohl genau dieses Feld beim Zusammenführen entschied.

**Umsetzung:** (1) Der Auto-Archiv-Effekt vergleicht den Inhalt (ohne
`savedAt`) mit dem bestehenden Archivstand und schreibt bei Gleichheit gar
nicht. (2) `buildSyncPayload` erzeugt JSON mit **stabiler
Schlüsselreihenfolge** (neu: `utils/stableJson.ts`) — sonst sahen inhaltlich
identische Stände nach dem Zusammenführen verschieden aus und wurden erneut
gesendet.

### Geprüft

Datenebene, Wegwerf-Skript über `npx tsx` (9 Prüfungen, alle bestanden):
verschiedene Felder bleiben beide erhalten, Richtung egal, bei gleichem Feld
gewinnt der jüngere Stempel, Korrektur nach unten setzt sich durch (kein
„Maximum"), Rückfallebene für alte Daten, Idempotenz von `mergeSyncPayload`,
Konvergenz beider Seiten.

Am laufenden System mit zwei gekoppelten Instanzen:

| Messung | vorher | nachher |
|---|---|---|
| Nachrichten in 20 s ohne Eingabe | 7 raus / 7 rein (~29,5 KB) | **0 / 0 (0 Bytes)** |
| `savedAt` in Ruhe | ändert sich alle 3 s | **bleibt stehen** |
| Gleichzeitige Eingabe auf beiden Geräten | eine der beiden **verschwindet** | **beide erhalten**, beide Geräte zeigen dasselbe |

Letzter Live-Durchgang: Gerät A tippte „Vorführungen Arbeitsplatz" 3 → 4,
Gerät B im selben Sekundenfenster „Auslieferungen Schule" 1 → 2. Ergebnis auf
beiden Geräten: 7 / 4 / 2 — nichts verloren.

`npm run lint` und `npm run build` fehlerfrei.

**Nicht geprüft (ehrlich):** Zwei Browser-Tabs auf einem Rechner sind keine
zwei Geräte im WLAN. Die Zusammenführungs-Logik ist davon unabhängig und auf
Datenebene separat abgesichert, aber Laufzeitverhalten über echtes WLAN
(Latenz, Verbindungsabbrüche) steht weiter aus. Ebenfalls offen und bewusst
nicht angefasst: Ein Verbindungsabbruch wird weiterhin nur durch das
verschwindende grüne Abzeichen im Kopfbereich angezeigt — ohne Ansage.

---

## 2026-08-02 — v0.9.0: Zähler bleiben erreichbar, Monatsabschluss umkehrbar, Excel-Export zusammengeführt

Abgearbeitet wurden die Roadmap-Punkte 2, 3 und 5 der 0.9.0 („Verlässlich im
Alltag"). Punkt 1 (Test auf echten Geräten) und 4 (Firmen-Excel-Vorlage)
bleiben offen — beide brauchen eine Zulieferung von außen.

### Befund 1: Die Zähler-Tasten liefen aus dem Bildschirm (schwerwiegend)

Bei der Vermessung der Touch-Ziele fiel etwas Größeres auf. Die Bedienzeile
eines Zählers (`-5 − Zahl + +5`) hat feste Breite, die Karte darum herum nicht.
Gemessen auf einem 360-px-Gerät (typisches Android), Ansicht „RV Report":

| Schriftgröße | linker Rand der Tastenreihe | Folge |
|---|---|---|
| Normal | x = 11 px (Karte beginnt bei 33) | Reihe steht über den Kartenrand hinaus |
| Groß | **x = −76 px** | „−5" und Teile der Minus-Taste außerhalb des Bildschirms |
| Extra groß | **x = −163 px** | „−5", Minus und Teile des Eingabefelds außerhalb |

Ursache: Alle Maße waren rem-basiert und wuchsen mit der Schriftgröße mit,
während die Karte schmal blieb; `align-self: flex-end` schob den Überstand nach
links, also aus dem Bild. Betroffen war ausgerechnet die Einstellung, die
sehbehinderte Nutzer brauchen — dort war das Verringern eines Zählers per
Fingertipp schlicht unmöglich.

**Umsetzung** (`CounterField.tsx`): Bedienflächen bekommen feste Pixelmaße
(sie enthalten Symbole, keinen Text — WCAG 1.4.4 verlangt hier kein
Mitwachsen), das Zahlenfeld bleibt rem-basiert und darf schrumpfen, die Zeile
ist umbruchfähig. Reicht der Platz, bleibt es eine Zeile; wird es eng, rutschen
die Fünferschritte in eine zweite. Ab 640 px stellt `sm:order-*` die gewohnte
Reihenfolge wieder her. Zusätzlich Innenabstände auf dem Handy verringert
(Abschnitte `p-5` → `p-4`, Zählerkarte `p-3` → `p-2.5`).

**Ergebnis, nachgemessen (360 px, alle drei Schriftgrößen):** nichts mehr
außerhalb des Bildschirms, keine waagerechte Scrollleiste mehr (vorher 365 px
bzw. 436 px Inhalt bei 360 px Fensterbreite). Die Zählerkarte ist bei normaler
Schrift sogar 4 px flacher als vorher — der Platzgewinn aus 0.8.0 bleibt
erhalten.

Zwei weitere Überlauf-Quellen bei großer Schrift gefunden und behoben:
„Diktieren"/„Datumstempel" nebeneinander (jetzt umbruchfähig), die
Navigationsleiste unten (`min-w-0`, damit die Beschriftungen kürzen dürfen)
und eine lange Kategorie-Beschriftung in der Schnell-Erfassung (`break-words`).

### Befund 2: Touch-Ziele

Vorher **50 Bedienelemente unter 44 × 44 px** in der Ansicht „RV Report",
weitere in „RV Analyse" (4), „RV Archiv" (1) und „Optionen" (1). Die
verbindliche WCAG-AA-Grenze von 24 px war überall eingehalten — es war also
kein Normverstoß, aber unterhalb der Empfehlung für einhändige Bedienung.

Nachher, nachgemessen: **0 Elemente unter 44 × 44 px** in 15 Kombinationen
(fünf Hauptansichten × drei Schriftgrößen, 360 px breit) sowie im
Einrichtungs-Assistenten.

Beim Nachmessen der Optionen-Unterseiten kamen zwei Elemente zutage, die vorher
niemand auf der Rechnung hatte:
- Die **Schalter** in „Anzeige & Bedienung" waren 56 × 32 px. Das Aussehen
  bleibt, die Trefferfläche ist jetzt 56 × 44.
- Der **Schieberegler für die Sprechgeschwindigkeit war 10 px hoch** — mit dem
  Finger praktisch nicht zu treffen. Zusätzlich stand `appearance: none`, ohne
  dass ein eigener Griff gestaltet war; Chrome zeichnet dann gar keinen
  sichtbaren Griff. Jetzt 44 px Trefferfläche, sichtbare Spur, 26-px-Griff
  (`.rv-slider` in `index.css`).
- Kleinere Nachzieher: Reiter in der Hilfe (36 → 44 px), Passwortfeld der
  Datensicherung (41 → 44 px).

**Ehrlich offen:** Das Kontrollkästchen „Backup mit Passwort schützen" ist ein
natives Kästchen und misst 24 px. Die zugehörige Beschriftungszeile ist 44 px
hoch und vollständig anklickbar, damit ist die Bedienfläche in Ordnung — das
Kästchen selbst wurde bewusst nicht per `transform` aufgeblasen.

*Zwei Messfallen, für künftige Audits notiert:*
1. Die Prüfumgebung rendert mit Faktor 0,99993 — 44 px messen sich als 43,997.
   Ein Schwellwert von exakt 44 meldet lauter Fehlalarme; geprüft wurde gegen 43,5.
2. Dialoge mit Einblend-Animation (framer-motion) bleiben in der Vorschau auf
   ihrem Startwert `scale(0.95)`, weil das Fenster keine Bilder zeichnet.
   Elemente darin messen sich 5 % zu klein (44 px → 41,8 px). Der Geräte-Sync-
   Zurückknopf ist deshalb **kein** Fund, sondern ein Artefakt.

### Befund 3: „Monat abschließen" — die Roadmap-Annahme war falsch

Die Roadmap führte den Punkt als „unumkehrbar". Nachgeprüft: **stimmt nicht.**
Der Monat wandert beim Abschluss vollständig ins RV Archiv (Zähler, Kommentar,
Schichten, Feld-Aufbau — per IndexedDB-Abfrage kontrolliert) und lässt sich
über die Monatsauswahl zurückholen. Eine 30-Tage-Aufbewahrung, wie dort
vorgeschlagen, hätte also ein Problem gelöst, das es nicht gibt.

Das **tatsächliche** Problem: Der Knopf löste ohne jede Rückfrage aus (im
Browser bestätigt: ein Klick, kein Dialog, Monat gewechselt), und der Nutzer
erfährt nirgends, dass und wie er zurückkommt.

**Umsetzung:**
1. Rückfrage über den vorhandenen `ConfirmDialog` — mit Angabe, was gesichert
   wird (gezählte Vorgänge, Schichten) und was danach passiert. Startfokus auf
   „Abbrechen", Escape bricht ab.
2. Danach ein Hinweisstreifen mit **Rückgängig** (`role="status"`, damit der
   Screenreader ihn liest, ohne zu unterbrechen). Er verschwindet, sobald im
   neuen Monat wirklich gearbeitet wird — ein Rücksprung würde dann frische
   Eingaben gefährden.
3. Nebenbefund behoben: Der Name allein galt als „Monat hat Daten". Da der Name
   beim Wechsel mitgenommen wird, landete **jeder** frische Monat sofort leer im
   Archiv (reproduziert: Archiv enthielt `2026-09` mit `values: {}`). Neue
   Regel in `monthHasContent()`: Kommentar, Zählerstand oder Schicht — der Name
   zählt nicht mehr.

Vollständig im Browser durchgespielt: Abbrechen ändert nichts; Bestätigen
archiviert August korrekt und wechselt zu September (Archiv enthält jetzt nur
noch August); Rückgängig stellt Monat, Kommentar, alle Zählerstände und beide
Schichten wieder her; nach drei Tipps auf „+" im neuen Monat ist das Angebot
verschwunden und der Zähler steht auf 3 (kein Zählverlust — Regressionstest zu
0.6.0).

### Befund 4: Der Excel-Export existierte zweimal — mit unterschiedlichem Ergebnis

`utils/excelUtils.ts` (Archiv) und die Inline-Fassung in `App.tsx` (laufender
Monat) waren auseinandergelaufen. Derselbe Monat ergab je nach Weg ein anderes
Dokument: „Gesamt" statt „Gesamt (Bereich 1)", im Archiv-Export fehlte der
Kommentarblock ganz, wenn kein Kommentar vorhanden war, andere Spaltenbreiten,
anderer Blattname („Monatsbericht" vs. „Monatsreport").

Zusammengeführt auf die Fassung des laufenden Monats — das ist das Dokument,
das die Vertriebsleitung tatsächlich bekommt. Mit einem Wegwerf-Skript
(`npx tsx`) beide Wege erzeugt und verglichen: **außerhalb der Kopfzeile
identisch**, Summenformeln geprüft (`B10=SUM(B8:B9)`, `B25=B10+B14+B18`, der
Arbeitszeit-Bereich korrekt nicht in der Aktivitäten-Summe).

Beim Ausliefern zusätzlich ein echter Fehler behoben: Brach der Nutzer den
Teilen-Dialog ab, lud die Formular-Fassung trotzdem herunter, die
Archiv-Fassung meldete „Fehler beim Exportieren". Jetzt wird ein Abbruch als
das behandelt, was er ist (`AbortError` → „Teilen abgebrochen"), ohne Download
und ohne Fehlermeldung. Das ist eine bewusste Verhaltensänderung, keine reine
Umstrukturierung.

### Befund 5: Fokusfalle des Einrichtungs-Assistenten hatte ein Loch

`OnboardingModal` meldet `aria-modal="true"`, aber im Hintergrund waren
**12 fokussierbare Elemente** weiterhin per Tabulator erreichbar. Die
vorhandene Falle griff nur, wenn der Fokus exakt auf dem ersten oder letzten
Element lag — der Startfokus liegt aber auf der Überschrift (`tabindex="-1"`),
die in keiner der beiden Listen steht. Shift+Tab von dort führte also in einen
Hintergrund, den der Screenreader für nicht vorhanden erklärt. Behoben; der
Fokus wird jetzt in den Dialog zurückgeholt.

*Ehrlich angemerkt:* Diese Lücke ist aus dem Code hergeleitet und die
Zählung der erreichbaren Elemente ist gemessen — die Tastaturbewegung selbst
lässt sich mit synthetischen Ereignissen nicht belastbar nachstellen. Ein
echter Tastatur-Durchlauf steht noch aus.

### Geprüft

`npm run lint` (tsc --noEmit) und `npm run build` fehlerfrei. Erststart mit
geleertem `localStorage` **und** gelöschter IndexedDB kontrolliert (Vorgabe aus
CLAUDE.md): Assistent erscheint, alle 18 Standardfelder mit korrekten Umlauten
und allen Symbolen, keine doppelt kodierten Zeichen, kein waagerechter Überlauf.
Export beider Wege ausgelöst und die erzeugten Dateinamen kontrolliert.

**Nicht geprüft (ehrlich):** alles, was echte Hardware braucht — Touch-Zweige
(`pointer: coarse`), Bildschirmtastatur, iOS-Safe-Areas, NVDA/VoiceOver/TalkBack.
Das bleibt Roadmap-Punkt 1 und blockiert weiterhin die 1.0.

*Arbeitsnotiz:* Ein Bulk-Edit über `node -e` in der Bash-Shell hat Backticks und
Backslashes zerlegt (Template-Literale und `\s` verschwanden aus dem Code) —
dieselbe Klasse von Fehler wie der Encoding-Schaden aus 0.7.0. Reparatur über
ein per Datei geschriebenes Node-Skript. Für Bulk-Änderungen gilt: Skript in
eine Datei schreiben, nicht in die Kommandozeile.

---

## 2026-08-02 — v0.8.1: Zwei Farbsysteme zusammengeführt, Navigation vereinheitlicht

Anlass: die Frage, ob das Design durchgängig ist. Der Audit förderte keinen
Schönheitsfehler zutage, sondern einen Lesbarkeits-Fehler.

### Befund: zwei Farbsysteme, die gegeneinander arbeiteten

Die App nutzte parallel:
- ein eigenes Theme-System über CSS-Variablen (915 Verwendungen) — folgte
  korrekt der App-Einstellung;
- **192 Tailwind-`dark:`-Regeln in allen 15 Komponenten** — diese folgen
  standardmäßig `prefers-color-scheme`, also der **Betriebssystem**-Einstellung,
  völlig unabhängig davon, was der Nutzer in der App wählt.

Belegt durch Messung: Der Hintergrund der Zählerkarten war bei *allen drei*
App-Themes identisch, während sich nur die Textfarbe änderte.

| Situation | gemessener Kontrast |
|---|---|
| App „Hell“ + Gerät im Dunkelmodus | **1,18 : 1** |
| Theme „Gelb auf Schwarz“ | **1,05 : 1** bei 51 von 141 Elementen |

Der erste Fall ist Alltag (Dunkelmodus ist auf Handys verbreitet), der zweite
trifft ausgerechnet das Schema für Nutzer mit dem größten Kontrastbedarf.

### Messfehler im eigenen Prüfskript (wichtig für künftige Audits)

Der erste Messdurchlauf lieferte unbrauchbare Zahlen (u. a. „Kontrast 1,0“ für
sichtbar korrekte Elemente). Ursache: Tailwind 4 gibt Farben als `oklch()` aus;
das Skript hatte die Zahlen als RGB gelesen. Korrektur: Farben über ein
1×1-Canvas auflösen lassen, dann stimmen alle Formate. **Erst danach waren die
Zahlen belastbar** — die zuvor gemeldeten Werte wären falsch gewesen.

### Umsetzung

1. `@custom-variant dark` in `index.css` bindet `dark:` an ein Attribut
   `data-dark`, das `App.tsx` passend zum gewählten Theme setzt (gesetzt für
   `dark`, `high-contrast-dark`, `high-contrast-yellow`).
2. Für die beiden Hochkontrast-Schemata werden fest verdrahtete Palettenfarben
   (`bg-slate-50`, `text-emerald-700`, …) per CSS auf die Theme-Farben
   gezwungen — so arbeitet auch der Hochkontrast-Modus von Windows. Ohne das
   wären dort weiterhin Karten in Grautönen mit gelber Schrift erschienen.
3. Neue Variable `--accent-text` pro Theme: Schriftfarbe **auf** der
   Akzentfläche. Neun Stellen nutzten `text-white` auf `bg-[var(--accent)]` —
   im Hochkontrast-Schema war das weiß auf weiß (Kontrast 1,0), im
   Dunkel-Schema 2,28:1.
4. `--primary` im Dunkel-Schema von `#3b82f6` auf `#2563eb` (weiße Schrift:
   3,68 → 5,17:1) und ein Hinweistext von `emerald-600` auf `-700` (3,65 → über
   4,5:1).

**Ergebnis, in allen vier Schemata nachgemessen: 0 von 141 Textelementen unter
4,5:1** (vorher u. a. 51 im Gelb-Schema).

### Navigation vereinheitlicht

Bestandsaufnahme ergab drei verschiedene Muster — und einen Widerspruch:
`CarryoverModal`, `ManageModal` und `SecureBackupModal` zeigten ein
**Schließen-Kreuz**, ihre Screenreader-Beschriftung lautete aber **„Zurück“**.
Sehende und blinde Nutzer bekamen also unterschiedliche Aussagen.

Alle Ansichten nutzen jetzt dasselbe Muster (wie zuvor schon Changelog und
Optionen): Zurück-Pfeil als erstes Element der Kopfzeile, mit Zielangabe in der
Beschriftung („Zurück zu den Optionen“, „Zurück zur Zeiterfassung“).
Umgestellt: Hilfe, Datensicherung, Formularfelder verwalten, Jahreskonto,
Geräte-Sync. Im Browser geprüft: kein Schließen-Kreuz mehr vorhanden, überall
identische Beschriftung.

### Offen

Die Zählerzeilen haben je **vier** Knöpfe (`-5`, `−`, `+`, `+5`). Für
Screenreader sind die `±5`-Knöpfe ausgeblendet (`aria-hidden`, nicht im
Tab-Fokus), sehende Nutzer sehen jedoch scheinbar doppelte Plus- und
Minus-Tasten. Noch nicht geändert — Rückfrage beim Auftraggeber läuft.

---

## 2026-08-02 — v0.8.0: Handy-Optimierung und geführter Einstieg

### Ausgangsmessung (390 × 844 iPhone-Größe, 360 × 800 Android)

Vor jeder Änderung gemessen, statt geschätzt:

| Wert | 390 px | 360 px |
|---|---|---|
| Kopfbereich Höhe | 330 px (39 % des Bildschirms) | 383 px (47 %) |
| davon Stammdaten-Block | 212 px | — |
| Schnell-Erfassung beginnt bei | y = 423 px | y = 476 px |
| Erstes Zählerfeld bei | y = 1521 px (**180 % der Bildschirmhöhe**) | — |
| Seitlicher Rand | 32 px (8 % der Breite) | 32 px (9 %) |

### Gefundener Fehler: waagerechter Überlauf auf schmalen Android-Geräten

Bei 360 px Breite ließ sich die Seite seitlich verschieben (Scrollbreite
368 px). Zwei Verursacher ermittelt: der „Anpassen“-Knopf in der
Schnell-Erfassung (7 px Überstand, weil die Überschriftzeile nicht umbrach) und
ein langer Kategoriename (`Anzahl Teilnahme Veranstaltungen/Messen/…`, 9 px
Überstand, weil der Text nicht umbrechen konnte). Behoben mit `min-w-0`,
`flex-wrap` und `break-words`.

### Platz zurückgewonnen

Der Stammdaten-Block (Monat + Name) stapelte sich auf dem Handy untereinander,
weil er erst ab 640 px nebeneinander lief — auf keinem Telefon also. Umgestellt
auf zwei Spalten ab der kleinsten Breite. Zusätzlich zwei Doppelungen entfernt:
der Hinweis „🔒 DSGVO-sicher lokal“ (steht bereits im Kopf-Abzeichen) und der
Link „Monats-Archiv“ (das Archiv liegt in der Hauptnavigation). Abstände auf
dem Handy verkleinert, Seitenrand von 16 auf 12 px.

**Ergebnis, nachgemessen:**

| Wert | vorher | nachher |
|---|---|---|
| Kopfbereich (390 px) | 330 px | **182 px** |
| Kopfbereich (360 px) | 383 px | **182 px** |
| Schnell-Tasten ohne Scrollen sichtbar | 0 von 6 | **6 von 6** |
| Waagerechter Überlauf (360 px) | ja | **nein** |
| Inhaltsbreite (360 px) | 328 px | 337 px |

Damit ist die Kernfunktion der App — direkt nach dem Termin eine Zahl
erfassen — ohne einen einzigen Wischvorgang erreichbar.

### Geführter Einstieg (`OnboardingModal.tsx`)

Fünf Schritte, die jeweils **etwas einstellen**, statt nur zu begrüßen:
Willkommen → Name → Sehen und Hören (Schriftgröße, Farbschema,
Sprachansagen) → Schnell-Erfassung erklärt → Datenschutz und Backup-Hinweis.

Besonders relevant für die Zielgruppe: Schriftgröße und Farbschema lassen sich
sofort setzen, statt sie erst in den Optionen suchen zu müssen. Beim Punkt
Sprachansagen steht ausdrücklich der Hinweis, dass Nutzer eines echten
Screenreaders diese Option normalerweise **aus** lassen sollten, um nicht alles
doppelt zu hören.

Barrierefreiheit: `role="dialog"` mit Fokusfalle, Fokus springt bei jedem
Schrittwechsel auf die neue Überschrift, Fortschritt ist als Text *und* als
`progressbar` vorhanden, jederzeit überspringbar.

**Erkennung bestehender Nutzer:** Der Einstieg erscheint nur, wenn weder eine
Markierung gesetzt ist noch Daten existieren (Archiv, Name oder Zählerstände).
Bestehende Nutzer bekommen die Markierung still gesetzt, damit der Einstieg
nicht nachträglich aufpoppt. Schlägt das Laden der Daten fehl, wird der
Einstieg **nicht** gezeigt — der Nutzer könnte Daten haben, die nur gerade
nicht lesbar waren.

**Verifiziert** mit komplett geleertem `localStorage` und IndexedDB: Einstieg
erscheint, Fortschrittsanzeige korrekt ausgezeichnet, Name landet im Formular,
Schriftgröße wirkt sofort (16 → 24 px gemessen), Farbschema wechselt, nach
Abschluss bleiben alle Einstellungen erhalten und der Einstieg erscheint beim
Neuladen nicht erneut.

### Weiterhin offen

- 49 Bedienelemente liegen unter 44 × 44 px (Apple-HIG/WCAG-AAA-Empfehlung).
  Die verbindliche AA-Grenze von 24 px wird überall eingehalten — also **kein**
  Normverstoß, aber für einhändige Bedienung verbesserungswürdig. Steht in der
  Roadmap für 0.9.0.
- Alles Touch-spezifische bleibt unverifiziert (siehe `ROADMAP.md`, Punkt 1):
  Ein verkleinertes Desktop-Fenster meldet weiterhin ein Zeigegerät mit Maus.

Neu angelegt: `ROADMAP.md` mit dem Plan bis 1.0.

---

## 2026-08-02 — v0.7.0: Encoding-Notfall, Lesbarkeit, Desktop, barrierefreie Dialoge

### Encoding-Schaden (selbst verursacht, war live)

Beim Prüfen der Desktop-Ansicht fiel auf, dass `src/App.tsx` **149 beschädigte
Zeichen** enthielt. Ursache: ein früherer Bulk-Replace über PowerShell
`Set-Content -Encoding utf8`. PowerShell 5.1 las die UTF-8-Datei als CP1252 und
schrieb sie als UTF-8 zurück — **doppelt kodiert**, plus BOM. Betroffen waren
279 Zeichenfolgen: alle deutschen Umlaute in nutzersichtbaren Texten
(`"Anzahl VorfÃ¼hrungen Schule/Bildung"`) und **alle 72 Emojis**
(`icon: "ðŸ«"`).

**Warum es durch alle Prüfungen rutschte:** `tsc --noEmit` und `vite build`
liefen sauber (Mojibake ist gültiges UTF-8, nur mit falschen Zeichen). Auch die
Browser-Tests zeigten korrekten Text — weil die Feldnamen bei bestehenden
Nutzern aus dem `localStorage` kommen, der noch die alten, korrekten Werte
hielt. Nur ein **neuer** Nutzer mit leerem Speicher hätte die kaputte
`DEFAULT_FIELDS_CONFIG` gesehen. Der Fehler ging so in Produktion.

**Reparatur:** Eine pauschale Umkehrung war nicht möglich, weil die Datei
gemischt war (spätere Edits hatten korrektes UTF-8 geschrieben) — ein erster
Versuch brach mit Ersatzzeichen ab. Stattdessen gezielt: nur Zeichenfolgen
ersetzen, die als CP1252-Bytes eine **gültige UTF-8-Sequenz** ergeben.
Korrektes „ü“ (Byte 0xFC) ist kein gültiges UTF-8-Startbyte und blieb dadurch
unangetastet. Verifiziert gegen den letzten sauberen Stand `00bb057`: alle 67
Umlaut-Wörter vorhanden, Emojis 72/72 exakt, 0 Mojibake, kein BOM. Anschließend
im Browser mit **komplett geleertem `localStorage` UND IndexedDB** geprüft.
Sofort deployed (`07e142e`).

**Konsequenz festgehalten** in `CLAUDE.md`: Quelldateien nie mit PowerShell
schreiben; Änderungen an Standardwerten immer mit leerem Speicher testen.

### Lesbarkeit: Schrift-Einstellung wirkte auf 80 Elemente gar nicht

Verifizierter Befund: Rund 80 Beschriftungen nutzten feste Pixelgrößen
(`text-[9px]`, `text-[10px]`). Feste px-Werte reagieren **nicht** auf die
Schriftgrößen-Einstellung der App (die über `html { font-size }` skaliert).
Gemessen: Bei „Extra groß“ wuchs normaler Text von 16 auf 18 px, die kleinen
Beschriftungen blieben bei **10 px** — ein Verstoß gegen WCAG 1.4.4 für genau
die Zielgruppe, die die Einstellung braucht.

Fix: 97 Vorkommen in 12 Dateien von px auf `rem` umgestellt (8/9px → 11px,
10/11px → 12px als Basis). Gemessen nach der Änderung: kleinste Schrift 11 px,
bei „Extra groß“ **16,5 px** — skaliert jetzt mit. Kein waagerechter Überlauf
auf 375 px Breite.

### Desktop-Ansicht praktikabel gemacht

Gemessen auf 1920 px mit Standardeinstellungen: Inhalt 672 px breit,
**1248 px (65 %) ungenutzt**, dazu die schwebende Handy-Navigationsleiste. Das
gute Desktop-Layout (Seitenleiste + zwei Spalten) existierte bereits, war aber
per Voreinstellung **aus** und in den Optionen versteckt.

- Desktop-Layout schaltet sich jetzt ab 1024 px Fensterbreite selbst ein
  (`matchMedia`), die ausdrückliche Einstellung behält Vorrang. Gemessen:
  genutzte Breite 672 → **1440 px**.
- `user-select: none` galt global → am PC ließ sich kein Text markieren oder
  kopieren. Jetzt per `@media (pointer: fine)` wieder freigegeben, auf Touch
  weiterhin gesperrt (verhindert versehentliches Markieren beim Tippen).
- Scrollbalken waren global ausgeblendet (gemessene Breite 0 px) → am PC keine
  Positions- oder Längenanzeige. Jetzt nur noch auf Touch versteckt; gemessen:
  15 px sichtbar.
- Tastenkürzel waren nirgends dokumentiert → neuer Hilfe-Abschnitt, die Kürzel
  direkt aus dem Code in `App.tsx` übernommen (nicht aus dem Gedächtnis).

### Barrierefreie Bestätigungsdialoge

`window.confirm()` wird von NVDA/JAWS unzuverlässig vorgelesen, ist nicht
gestaltbar (ignoriert Hochkontrast-Themes und Schriftgröße) und wirkt mobil
wie ein Fremdkörper. Neue Komponente `src/components/ConfirmDialog.tsx`:
`role="alertdialog"`, Fokusfalle, Escape, Fokus-Rückgabe an das auslösende
Element, Startfokus bewusst auf **Abbrechen**. Ersetzt fünf `confirm()`-Aufrufe
in `App.tsx` und `ClockInWidget.tsx`. Der Monatsabschluss-Check zeigt seine
Warnungen jetzt als echte Liste statt als Text mit Aufzählungszeichen.

**Bewusste Ausnahme:** Das `confirm()` in `ErrorBoundary.tsx` bleibt. Das ist
der Absturz-Bildschirm — wenn der React-Zustand beschädigt ist, muss der
Not-Reset ohne eigene Komponenten funktionieren. Als Kommentar im Code
begründet.

Verifiziert: Dialog hat `role="alertdialog"`, `aria-modal`, verknüpftes Label
und Beschreibung; Startfokus auf „Erst korrigieren“; Escape schließt; Fokus
kehrt zum auslösenden Knopf zurück.

### Kontrast und Schriftart

- `--border-color` hatte nur **1,48:1** gegen die Karte — Rahmen praktisch
  unsichtbar. Zielwerte berechnet statt geschätzt: hell `#8593a8` (3,12:1),
  dunkel `#556780` (3,09:1), beide über der WCAG-1.4.11-Grenze von 3:1. Die
  zwei Hochkontrast-Themes blieben unangetastet (weiterhin 21:1 bzw. 19,6:1).
- `--font-sans` deklarierte „Inter“, aber es wurde **keine Schrift geladen**
  (0 Webfonts, verifiziert) — die App nutzte je nach System eine andere
  Schrift. Da externe Schriftdienste wegen der DSGVO-Zusage ausscheiden: durch
  einen bewussten System-Schriftstapel ersetzt.

### Nicht umgesetzt (bewusst)

Einklappbare Formularbereiche wurden verworfen: Eingeklappter Inhalt ist für
Screenreader-Nutzer nicht erreichbar, und die Suchfunktion würde ins Leere
laufen, wenn ein Treffer in einem geschlossenen Bereich liegt.

### Nicht verifizierbar in dieser Umgebung

Die Touch-Zweige der neuen CSS-Regeln (`@media (pointer: coarse)`: versteckte
Scrollbalken, gesperrte Textauswahl) konnten **nicht** geprüft werden — ein auf
Handygröße verkleinertes Desktop-Fenster meldet weiterhin `pointer: fine`. Das
braucht einen Test auf einem echten Touchgerät.

---

## 2026-08-01 — v0.6.0: Verlässlicheres Zählen, Sync im Hintergrund, Hilfe korrigiert

### Kritischer Zählfehler (beim Testen entdeckt)

Beim Verifizieren der Live-Verbindung fiel auf, dass **schnelles mehrfaches
Tippen Zählungen verschluckt**. Reproduziert und gemessen:

- Schnell-Erfassung: 3 Tipps → nur +1 (2 verloren); selbst bei 400 ms
  Abstand ging einer verloren.
- Normale Plus-/Minus-Tasten im Formular: 3 Tipps → nur +1.

Ursache: Der neue Wert wurde aus dem React-Zustand berechnet
(`current + step`). Erfolgen mehrere Tipps, bevor React neu gerendert hat,
lesen alle denselben alten Stand und schreiben denselben neuen Wert.
Betroffen waren Plus, Minus, die ±5-Schnelltasten und die Schnell-Erfassung
– also die Kernfunktion der App. Für eine Erfassungs-App, deren Zweck
verlässliche Zahlen sind, ist das gravierend, und blinde Nutzer tippen
erfahrungsgemäß zügig in Serie.

**Fix:** Ein synchron mitgeführter Spiegel der Zählerstände (`valuesRef`)
plus eine zentrale Funktion `applyValueDelta(id, delta)`, die den neuen Wert
sofort zurückgibt. `CounterField` bekommt statt der Rechnung nur noch
`onDelta` und nutzt den Rückgabewert für Ansage und Ton. Direkte
Tastatureingaben ziehen den Spiegel mit (`handleValueInput`), damit
anschließende Tipps korrekt weiterzählen.
**Verifiziert:** 5 schnelle Plus-Tipps → exakt +5; 2 schnelle Minus-Tipps →
exakt −2; Tastatureingabe „20“ + 2 Tipps → 22.

### Live-Verbindung überlebt jetzt den Fenster-Wechsel

Die im Audit dokumentierte Einschränkung ist behoben: Die WebRTC-Verbindung
gehört nicht mehr dem Sync-Fenster, sondern einem App-weiten Dienst
(`src/utils/liveSync.ts`). Vorher riss der Aufräum-Schritt des Fensters die
Verbindung ab, sobald man den Tab wechselte – womit die Live-Verbindung
praktisch nutzlos war, weil man zum Eintragen von Zahlen genau dieses
Fenster verlassen muss.

- Verbindung endet nur noch bei ausdrücklichem Trennen oder App-Schließen
  (`pagehide`).
- Neuer Statushinweis **„Live verbunden“** im Kopfbereich (führt zurück zur
  Verwaltung), mit Zeitpunkt des letzten Abgleichs für Screenreader.
- Beim erneuten Öffnen des Sync-Fensters wird die bestehende Verbindung
  angezeigt statt des Startmenüs.
- DSGVO unverändert: weiterhin keine STUN-/TURN-Server, reine LAN-Verbindung.

**Verifiziert (zwei echte Browser-Tabs):** Kopplung per Text-Code, danach
beide Tabs zurück ins Formular. Gerät A trägt 3 ein → erscheint auf Gerät B;
Gerät B tippt 2 dazu → erscheint auf Gerät A – jeweils mit geschlossenem
Sync-Fenster.

### Hilfebereich: sachliche Fehler korrigiert

Prüfung der Hilfe gegen den echten Code förderte mehrere falsche Angaben
zutage (alle verifiziert, dann korrigiert):

- **Gefährlichster Fehler:** „Alle Zeiten, Urlaubstage und Krankheitstage aus
  der Stempeluhr werden automatisch im RV Report addiert. Sie müssen diese
  nicht doppelt eintragen!“ – Tatsächlich schreibt die Stempeluhr nur
  Stunden und Arbeitstage. Urlaubs- und Krankheitstage muss der Nutzer
  selbst eintragen; die Hilfe hätte dazu verleitet, sie wegzulassen, was
  Jahreskonto und Bericht verfälscht.
- „Direkt an VL senden … öffnet Ihr E-Mail-Programm, die Adresse der
  Vertriebsleitung ist bereits voreingestellt“ – es gibt keine hinterlegte
  Adresse; die App öffnet den System-Teilen-Dialog.
- Backup: falsche Dateiendung (`.rvbackup` statt `.json` / `.json.enc`),
  falscher Menüname („Sicheres Backup“ statt „Datensicherung“), falscher
  Knopfname („Backup erstellen & herunterladen“ statt „Auf Gerät speichern“).
- Jahreskonto: „Meine Jahresübersicht (Urlaub & Gleitzeit)“ und „Stammdaten &
  Startwerte bearbeiten“ existierten so nicht (richtig: Reiter „Jahreskonto“,
  Knopf „Jahreskonto-Einstellungen bearbeiten“).

Ergänzt wurden außerdem: ein Abschnitt zur Schnell-Erfassung (fehlte
komplett), Tastaturbedienung der Zählerfelder, sowie eine FAQ „Was muss ich
tun, damit meine Daten nicht verloren gehen?“ inklusive Erklärung der neuen
Speicher-Warnung.

### Versionierung

Die Versionsnummer wird jetzt zur Bauzeit aus `package.json` übernommen
(`vite.config.ts` → `__APP_VERSION__` → `src/version.ts`) und im Changelog
als „Installierte Version“ angezeigt. Vorher stand sie fest im Text und
widersprach zeitweise der `package.json` (dort 1.0.0, in der App 0.2.0).
Der Knopf in den Optionen heißt nur noch „Was gibt's Neues?“ ohne Nummer.

## 2026-08-01 — Stabilitäts-Audit

Anlass: explizite Vorgabe, die App aus Nutzersicht auf Stabilität zu prüfen,
da sie für den täglichen Außendienst-Einsatz absolut verlässlich sein muss.
Zwei kritische, jeweils reproduzierte Fehler gefunden und behoben
(Commit `4331d44`):

- **Speicherstatus-Anzeige zeigte falschen Erfolg.** Der Autospeicher-Effekt für den aktuellen
  Bericht (`App.tsx`) rief `set("aussendienst_pwa_data", reportData)` auf,
  ohne auf das Ergebnis des Promises zu warten, und setzte den Status
  sofort auf „gesichert“. Schlug der IndexedDB-Schreibvorgang fehl
  (Speicher voll, IndexedDB durch Browser/Richtlinie blockiert), zeigte die
  App trotzdem den grünen „Automatisch lokal gesichert“-Punkt — der
  Außendienstler hätte nie erfahren, dass seine Eingabe nicht persistiert
  wurde. Gleiches Muster fehlte an drei weiteren Stellen (RV-Archiv-Save bei
  jeder Änderung, bei Monatswechsel, beim Löschen eines Archiv-Eintrags).
  Reproduziert durch Überschreiben von `IDBObjectStore.prototype.put`, um
  einen echten Schreibfehler zu erzwingen — Fehleranzeige und Warnbanner
  ausgelöst, nach Wiederherstellung des Schreibzugriffs korrekt wieder
  verschwunden.
  **Fix:** `saveStatus` um `"error"` erweitert, persistenter Warnbanner
  (`role="alert"`, direkter Link zu „Backup erstellen“) erscheint bei jedem
  fehlgeschlagenen Schreibvorgang und bleibt sichtbar, bis wieder erfolgreich
  gespeichert wurde. Fehler werden zusätzlich per `announceToAriaAndSpeech`
  angesagt.
- **„Kompletter Reset“ löschte nicht, was er versprach.** Der Absturz-Bildschirm
  (`ErrorBoundary.tsx`) bot einen Reset-Button mit dem Text „Alle
  gespeicherten Daten (inkl. RV Archiv) werden gelöscht“, rief aber nur
  `localStorage.clear()` auf. Bericht und Archiv liegen aber in IndexedDB
  (`idb-keyval`) und blieben unberührt — verifiziert durch direkte
  IndexedDB-Abfrage vor/nach einem simulierten Reset. Folge: Ein Absturz durch
  beschädigte Archivdaten wäre nach „Reset“ sofort zurückgekehrt, und die
  Löschzusage war schlicht falsch.
  **Fix:** `handleHardReset` ruft zusätzlich `clear()` aus `idb-keyval` auf.
- **iOS-Notfallspeicherung** (bei App-Backgrounding) nutzte rohes
  `localStorage.setItem` ohne Fehlerbehandlung — in try/catch gekapselt.

**Nebenbefund beim Audit (noch keine Änderung, nur festgestellt):** Es gibt
zwei unabhängige Deploy-Wege — `npm run deploy` (pusht auf den
`gh-pages`-Branch) und einen automatisch laufenden GitHub-Actions-Workflow
(`.github/workflows/deploy.yml`), der bei **jedem Push auf `main`** über die
native GitHub-Pages-Actions-Deployment ausliefert. Beide liefen heute
tatsächlich (via GitHub-API bestätigt: Workflow-Lauf ~20 Sekunden nach einem
`git push` abgeschlossen). Welcher der beiden tatsächlich die live
ausgelieferte Version bestimmt, hängt von der Pages-Konfiguration im
Repository ab und wurde nicht geklärt — bis dahin kann jeder Push auf `main`
faktisch ein Auto-Deploy auslösen, nicht erst ein bewusstes `npm run deploy`.

Alle Fixes verifiziert: `npm run lint` + `npm run build` sauber,
End-to-End-Test im Browser (Fehlerfall provoziert und Erholung bestätigt),
`npm audit` weiterhin 0 Schwachstellen. Gepusht als `4331d44`.

## 2026-07-31 — v0.5.0: Sync ohne Kamera, entspannte Kopplung, Monatsabschluss-Check

Anlass: Marc wies darauf hin, dass der Kamera-basierte Live-Sync
unpraktikabel ist, sobald ein Gerät (typischerweise der PC) keine Webcam hat.

- Jeder QR-Code (Einmal-Übertragung sowie Verbindungs-/Antwort-Code der
  Live-Kopplung) hat jetzt ein Text-Äquivalent zum Kopieren/Einfügen
  (Format `RVC1:<z|u>:<base64>`) — funktioniert auf jedem Gerät ohne Kamera,
  z. B. über die geteilte Windows-Handy-Zwischenablage.
- Verbindungscode (Gerät A) ist zeitunkritisch; Antwort-Code (Gerät B)
  verfällt nach ca. einer Minute, dafür neuer Button „Neuen Antwort-Code
  erzeugen“ für dieselbe Kopplung — Ende-zu-Ende mit zwei echten Browser-Tabs
  getestet (Verbindung kam über den zweiten, nachträglich erzeugten
  Antwort-Code zustande).
- Bugfix während der Implementierung gefunden: `stopScanner()` crashte den
  reinen Einfügen-Weg, wenn die Kamera nie gestartet wurde (Fehler synchron
  statt als Promise-Rejection) — behoben.
- Monatsabschluss-Check vor „Bericht an VL senden“: prüft auf fehlenden
  Namen, leeren Report, Arbeitstage vs. erfasste Schichttage, Stunden vs.
  Stempeluhr-Summe; bei Auffälligkeiten Rückfrage, sonst läuft der Export
  ohne Umweg durch — beide Fälle im Browser verifiziert.
- Veraltete Sync-FAQ in der Hilfe aktualisiert; „v0.2.0 – Neues“-Button
  zeigt keine Versionsnummer mehr, nur noch „Was gibt's Neues?“.

Commit `1dcebee`, live deployed.

## 2026-07-31 — v0.4.0: Schnell-Erfassung

- Neue Schnell-Erfassung ganz oben im Formular: die meistgenutzten
  Kategorien als große Tasten, ein Tipp = +1 (Ton, Vibration,
  Sprachansage) — direkt nach dem Termin bedienbar, ohne zu scrollen.
- Auswahl automatisch nach tatsächlicher Nutzung (Archiv + laufender Monat)
  oder frei konfigurierbar (bis zu 8 Kategorien, eigene Reihenfolge,
  gespeichert in `localStorage`). Beide Modi im Browser getestet.
- PWA-Shortcuts im Manifest: App-Symbol gedrückt halten öffnet direkt
  „Zahlen erfassen“ oder „Stempeluhr“ (`?tab=`-Parameter beim Start gelesen).
- Audio-Feedback in ein gemeinsames Modul extrahiert, damit Zähler-Buttons
  und Schnell-Erfassung dieselben Töne nutzen.

Commit `c9b05ef`, live deployed.

## 2026-07-31 — Sync 2.0: Zusammenführen statt Überschreiben + Live-Verbindung

- `src/utils/merge.ts`: Archiv wird pro Monat nach letztem Speicherzeitpunkt
  zusammengeführt (nicht ersetzt), Schichten werden pro ID vereinigt, eigene
  Kategorien beider Geräte bleiben erhalten, Jahreskonto nimmt den neueren
  Stand. Mit 10 eigenen Testfällen abgesichert (u. a. Idempotenz: erneutes
  Zusammenführen desselben Stands ändert nichts).
- QR-Empfang fragt jetzt „Zusammenführen“ oder „Ersetzen“ ab, statt
  kommentarlos zu überschreiben.
- Live-Verbindung: Kopplung per QR-Code (Offer/Answer), danach WebRTC-
  DataChannel ohne STUN/TURN (`iceServers: []`) — läuft nur im gleichen
  (W)LAN, kontaktiert keine externen Dienste. Automatischer Abgleich alle
  3 Sekunden per Merge. Verbindung end-to-end mit zwei Tabs getestet
  (Handshake, Datenübertragung, Zusammenführen bestätigt).

Commit `6387421`, Versionsnummer danach auf 0.3.0 angeglichen (`2676ef7`).

## 2026-07-31 — Bugfix-Runde

Erste Durchsicht des übernommenen Codes; gefunden und behoben:

- Datenverlust-Risiko: iOS-Notfallspeicherung konnte beim App-Start einen
  fast leeren Zwischenstand über echte Daten schreiben.
- Sync-/Backup-Import ging nach Neuladen verloren (Archiv/Jahreskonto wurden
  nur im Arbeitsspeicher gehalten, nie persistiert).
- Stempeluhr buchte Schichten zwischen 0–2 Uhr wegen UTC-Zeit auf den
  falschen Tag.
- „undefined“ landete im Notizfeld bei leerem Feld durch Diktat/Datumstempel.
- 4 TypeScript-Fehler im QR-Sync behoben.
- `xlsx` von 0.18.5 (bekannte hohe Sicherheitslücke) auf 0.20.3 aktualisiert
  — `npm audit`: 0 Schwachstellen.

Commit `a65b553`.

---

## Vor dieser Zusammenarbeit (aus der Git-Historie, nicht im Detail geprüft)

Die App wurde ursprünglich mit einem AI-gestützten Werkzeug entwickelt
(Hinweis in `vite.config.ts`: „HMR is disabled in AI Studio…“). Verlauf laut
`git log`, gruppiert nach Tag:

- **2026-07-09 — Projektstart.** Initial Commit, „Version #1“, danach mehrere
  Refactoring-/Optimierungs-Commits („modularize architecture“, „optimize
  mobile experience and PWA setup“, „update dependencies“). Größter Sprung:
  9b2096d mit 28 geänderten Dateien / +12.710 Zeilen — vermutlich das
  Grundgerüst der App.
- **2026-07-10 — Zeiterfassung.** „feat: add optional time tracking feature“
  (6 Dateien, +369/−472 Zeilen) — das ist vermutlich der Ursprung der
  heutigen Stempeluhr.
- **2026-07-17 — Geräte-Sync, erste Generation.** Mehrere Commits zu
  „device synchronization“, „secure P2P device synchronization“ sowie
  wiederholte Fixes an einer Socket.IO-artigen Verbindung („force websocket
  transport“, „force polling transport“, „improve socket connection“). Diese
  serverbasierte Sync-Variante existiert im heutigen Code **nicht mehr** —
  `server.ts` enthält den Kommentar „Kein Socket.io“, und es gibt keine
  Socket.IO-Abhängigkeit mehr in `package.json` (verifiziert per Suche).
- **2026-07-18 — Layout.** Desktop-Sidebar/Layout-Umschaltung, weitere
  Sync-Zuverlässigkeits-Fixes.
- **2026-07-19 — Große Bereinigung.** „alles neu“ / „Alles einfach Neu :)“ /
  „Alles neu neu neu neu neu“ — u. a. Entfernen der Lockfiles
  (`bun.lock`, `package-lock.json`, zusammen −6.302 Zeilen im Commit
  `d551cc4`), damit vermutlich verbunden der Ausbau der serverbasierten
  Sync-Variante zugunsten des heutigen offline-QR-Ansatzes.

Diese Phase ist nicht im Detail verifiziert (keine Zeilen-für-Zeilen-Prüfung
der historischen Diffs) — nur die Commit-Titel, Zeitstempel und
Änderungsumfänge sind gesichert.
