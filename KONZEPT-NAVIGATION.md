# Konzept: Vier Stationen — und der Zeitstempel, der schon da ist

**Stand:** 2026-09-15 · **Status:** **umgesetzt mit 0.9.45**

---

## Worum es geht

Zwei Befunde aus der Durchsicht vom 2026-09-15, beide gemessen, beide klein zu
beheben:

1. **Die App weiß, wann Sie zuletzt gezählt haben — und sagt es Ihnen nie.**
   Jeder Zähler trägt seit 0.9.0 einen Zeitstempel (`valuesUpdatedAt`).
   Benutzt wird er ausschließlich für den Geräteabgleich; angezeigt wird er
   nirgends. Im Feld heißt das: Sie kommen aus dem Termin, das Telefon
   klingelt, zehn Minuten später fragen Sie sich, ob Sie die Vorführung schon
   getippt haben. Die App kann das beantworten und tut es nicht.
2. **Bei „Extra groß" ist jede Beschriftung der unteren Leiste abgeschnitten.**
   Lautlos: Es ragt nichts heraus, und der zugängliche Name bleibt
   vollständig — also hat es keine der 1.086 Prüfungen je bemerkt. Betroffen
   ist genau die Gruppe, die die große Schrift einstellt.

## Was beschlossen ist

| | Was | Wo |
|---|---|---|
| **1** | „zuletzt geändert" am Zähler | im Formular, an der Zahl |
| **2** | Leiste auf vier Stationen, kurze Beschriftungen, Analyse wandert nach „Mehr" | untere Leiste und Seitenleiste |
| **3** | Die Löschabfrage für Kategorien nennt die Zeile im Firmenformular | „Formularfelder verwalten" |

Die drei hängen an nichts und an niemandem und sind einzeln
veröffentlichbar.

---

## 1. „zuletzt geändert" am Zähler

Eine Zeile je Kategorie, klein, unter dem Zahlenfeld:

```
   Vorführungen Schule          [ − ]  3  [ + ]
   zuletzt: heute, 11:40
```

Gestern und älter werden ausgeschrieben („gestern, 16:20", „Fr, 12.09.").
Wurde in diesem Monat nie etwas geändert, steht die Zeile nicht da.

**Warum das genügt, um den Zweifel zu beheben:** Er entsteht im Formular, an
der Zahl — und dort steht die Antwort dann auch. Keine zweite Ansicht, kein
zweiter Speicher, kein Platz in der Leiste. Die Daten liegen seit 0.9.0 vor.

**Warum es ehrlich ist:** Der Zeitstempel erfasst **jede** Änderung — den
Tipp auf `+1` genauso wie eine direkt eingetippte Zahl. Er kann also nicht
unvollständig sein und dabei vollständig aussehen.

Für Screenreader wird die Uhrzeit ausgesprochen („elf Uhr vierzig"), nicht als
Ziffernfolge vorgelesen. Der Text gehört über `aria-describedby` an das
Zahlenfeld, damit er beim Fokussieren mitkommt und nicht erst beim
Durchwandern der Seite auftaucht.

---

## 2. Die Leiste: vier Stationen

### Die Messung, die das entschieden hat

**2026-09-15, Chromium, Schrifteinstellung „Extra groß":**

| Breite / Schrift | Taste | Beschriftung braucht | Ergebnis |
|---|---|---|---|
| 360 px, normal | 56 px | 38–59 px | nur „RV Analyse" abgeschnitten |
| 360 px, **Extra groß** | 51 px | 57–88 px | **alle fünf abgeschnitten** |
| 320 px, **Extra groß** | 44 px | 57–88 px | **alle fünf abgeschnitten** |

Bei 320 px bleiben innen 292 px. Auf fünf Einträge verteilt sind das **49 px
je Taste**, auf vier **62 px**. Die Beschriftungen brauchen:

```
   RV Analyse   88px      Report    53px
   RV Report    80px      Analyse   61px
   RV Archiv    76px      Archiv    49px
   Optionen     75px      Zeit      30px
   RV Zeit      57px      Mehr      42px
```

Daraus folgen zwei Sätze, die zusammengehören:

1. **Fünf Einträge können bei „Extra groß" keine lesbare Beschriftung
   tragen** — 49 px Platz gegen 57–88 px Bedarf. Kein Umbenennen rettet das.
2. **Vier Einträge mit kurzen Wörtern tragen sie** — 62 px Platz, und ohne das
   Präfix „RV" passt jedes Wort.

Fünf Tasten, die „RV A…", „RV R…", „RV Ar…" heissen, unterscheiden sich für
einen sehbehinderten Nutzer nur noch am Symbol. Das ist kein
Schönheitsfehler, sondern der Verlust der Beschriftung für die Gruppe, für
die die App gebaut ist.

### Der neue Zuschnitt

**`Report · Zeit · Archiv · Mehr`**

| Station | Was dort liegt | Wie oft gebraucht |
|---|---|---|
| **Report** | das Formular, die Zahlen | täglich |
| **Zeit** | Stempeluhr, Schichten, Jahreskonto | täglich, solange die Uhr an ist |
| **Archiv** | frühere Monate, senden, Versandstand | monatlich |
| **Mehr** | Analyse, Demogeräte, Sicherung, Geräteabgleich, Hilfe, Neues | selten |

**Die Zeiterfassung bleibt, wo sie ist** — als eigene Station. Sie ist eine
Handlung, die zweimal täglich stattfindet; sie hinter ein Menü zu legen wäre
falsch. Bewegt wird stattdessen **RV Analyse**: ein Rückblick über Monate, den
man bewusst öffnet und nicht zwischen zwei Terminen — und mit 88 px die
längste Beschriftung von allen.

**Was dabei nicht kaputtgeht:** Die Manifest-Verknüpfung „Stempeluhr"
(`?tab=time`) bleibt, die Umleitung ins Formular bei abgeschalteter Uhr
(0.9.34) bleibt, das Jahreskonto behält beide Wege (über RV Zeit und über
Optionen → Meine Sachen — bis 0.9.32 hing es nur an RV Zeit, und wer die Uhr
abschaltete, kam nicht mehr heran).

**Was offen bleibt und benannt gehört:** Ist die Stempeluhr abgeschaltet, hat
die Leiste **drei** Stationen statt vier. Die Form hängt damit weiterhin an
einer Einstellung — heute sind es fünf oder vier, künftig vier oder drei. Das
ist besser, aber nicht gelöst. Gelöst wäre es nur mit einer vierten Station,
die es immer gibt; der Entwurf dafür ist verworfen (siehe unten).

**Eine Entscheidung, die Ihnen gehört:** „Optionen" braucht 75 px und passt
auch bei vier Stationen nicht. Entweder das Wort wird überall kürzer — dann
auch in „Zurück zu den Optionen", in der Hilfe und im Prüfnetz, rund ein
Dutzend Stellen — oder es bleibt als einziges abgeschnitten. Ein sichtbares
„Mehr" mit dem zugänglichen Namen „Optionen" wäre nach WCAG 2.5.3 zwar
erlaubt, aber wer per Sprachsteuerung „Optionen" sagt, träfe die Taste nicht
mehr.

---

## 3. Die Löschabfrage muss die Wahrheit sagen

Sie lautet heute nur: *„Der bisher erfasste Wert für diesen Monat geht dabei
verloren."*

Tatsächlich hängen **15 der 19 Standardkategorien an einer festen Zelle der
Firmenvorlage** (`vf_schule` → D6, `envision_vf` → D22 …). Wer eine davon
löscht, erzeugt eine Zeile, die **in jedem künftigen Bericht leer bleibt** —
und eine leere Zeile sieht aus wie eine Null. Genau dieser Fehler ist 0.9.11
schon einmal aufgetreten und war in jedem bis dahin erzeugten Bericht drin.

Die Rückfrage muss sagen: *„Diese Kategorie füllt Zeile D22 im Firmenformular.
Nach dem Löschen bleibt die Zeile in jedem Bericht leer."* Ein Satz, ein
verhinderter Dauerfehler.

---

## Wie die Übersichtlichkeit gewährleistet wird

Nicht durch ein Versprechen, sondern durch Wächter — denn genau hier ist die
Zusage schon einmal lautlos gebrochen worden: Die abgeschnittenen
Beschriftungen hat **keine** der 1.086 Prüfungen je bemerkt. `truncate` lässt
nichts überlaufen, also schlägt der Überlauf-Wächter nicht an; der zugängliche
Name bleibt vollständig, also sieht axe nichts.

1. **Prüfung gegen abgeschnittene Beschriftung.** In `check:ui`, bei 320 px und
   „Extra groß": In der Hauptnavigation darf kein Beschriftungstext
   `scrollWidth > clientWidth` haben. Damit ist Lesbarkeit messbar statt
   behauptbar.
2. **Obergrenze im Wächter, nicht im Kopf: höchstens vier Stationen.** Kommt
   eine fünfte dazu, fällt der Lauf — mit der gemessenen Begründung in der
   Fehlermeldung, damit niemand sie für Willkür hält.
3. **„Mehr" behält seine Gruppen.** Meine Sachen / Einstellungen / Daten &
   Hilfe. Mit der Analyse wächst der Bereich auf acht Zeilen;
   Übersichtlichkeit heisst dort feste Reihenfolge, eine kurze Hinweiszeile je
   Eintrag — und **keine Einklapper**, die Regel gilt unverändert.

Die erste Prüfung ist der eigentliche Gewinn dieses Konzepts: Sie hätte den
Befund gefunden, den ich von Hand gefunden habe — und sie findet ihn wieder,
wenn in zwei Jahren jemand eine Station ergänzt.

---

## Geprüft und verworfen: Tagesprotokoll und eine Ansicht „Heute"

**Entscheidung des Projektinhabers vom 2026-09-15.** Der Entwurf steht hier,
damit er nicht in einem halben Jahr als neue Idee wiederkommt.

**Was es gewesen wäre:** Ein automatisches Protokoll (`{ id, feld, zeit,
delta }`), aus dem eine Ansicht „Heute" abgeleitet worden wäre — was heute
gezählt wurde, mit Uhrzeiten, dazu eine Wochentabelle und eine Taste „letzten
Eintrag zurücknehmen". Nichts, was jemand pflegt; alles abgeleitet.

**Warum es nicht kommt:**

- **Kein Nutzen belegt.** Der Zweifel „habe ich diesen Termin schon gezählt"
  ist beschrieben und tritt am Zähler auf — den behebt Punkt 1 für den Preis
  einer Textzeile. Der Rückblick über die Woche war eine **Vermutung über den
  Bedarf**, keine Beobachtung.
- **Kein dienstlicher Zweck.** Der Bericht fragt Monatssummen; niemand fragt
  nach dem 12.
- **Hoher Preis.** Neuer Speicher, neue Ansicht, Entscheidungen zu Sync und
  Datensicherung, dazu ein eigener Wächter, der das Protokoll aus jedem Export
  heraushält.
- **Eine Falle, die es unbemerkt falsch gemacht hätte.** Das Protokoll
  zeichnet nur auf, was es sieht. Die App lässt aber ausdrücklich zu, eine
  Zahl **direkt einzutippen** — die Hilfe nennt das „der schnellste Weg, wenn
  Sie einen ganzen Tag nachtragen". Ein Protokoll, das nur die `+1`-Tipps
  kennt, wäre unvollständig und sähe vollständig aus: schlimmer als keins.

**Was mit ihm entfällt:** die stabile vierte Station (siehe oben), die
Wochentabelle und die Taste zum Zurücknehmen eines Doppeltipps. Der
versehentliche Doppeltipp bleibt damit korrigierbar nur über die Zahl selbst —
man sieht, dass 12 dasteht, nie, welcher Tipp der falsche war.

**Eine Einzelheit daraus könnte unabhängig wiederkommen:** ein kleines Feld
„Notiz für heute", das eine datierte Zeile an den Monatsblock anhängt, statt
auf einem 360-px-Bildschirm mitten in einem 30-Tage-Text zu editieren. Es
braucht kein Protokoll. Die vorhandene Datumstempel-Taste macht schon die
Hälfte davon.

---

## Umsetzung in Schritten

| Schritt | Inhalt | Woran man sieht, dass es trägt |
|---|---|---|
| **1** | „zuletzt geändert" am Zähler | Prüfung: die Zeile erscheint nach einer Änderung, auch nach einer **eingetippten** Zahl; ihr zugänglicher Name spricht die Uhrzeit aus; sie hängt per `aria-describedby` am Zahlenfeld |
| **2** | Leiste auf vier Stationen, kurze Beschriftungen, Analyse nach „Mehr" | Der neue Wächter meldet **keine abgeschnittene Beschriftung** bei 320 px und „Extra groß"; Trefferflächen weiterhin ≥ 44 px; `?tab=stats` bleibt gültig |
| **3** | Löschabfrage mit Zellenbezug | Prüfung: jede Kategorie aus `FELD_ZU_ZELLE` nennt ihre Zelle in der Rückfrage |

Schritt 3 hängt an keinem anderen und könnte auch zuerst kommen.

## Offene Fragen an den Projektinhaber

1. **„Optionen" kürzen oder abgeschnitten lassen?** Siehe oben — die einzige
   Beschriftung, die auch bei vier Stationen nicht passt.
2. **Drei Stationen bei abgeschalteter Stempeluhr — hinnehmbar?** Die Form der
   Leiste hängt dann weiterhin an einer Einstellung. Mit dem verworfenen
   Entwurf wäre sie fest gewesen; ohne ihn gibt es keine vierte Station, die
   es immer gibt.
3. **Soll die Analyse in „Mehr" unter „Meine Sachen" oder unter „Daten &
   Hilfe"?** Sie ist eine Auswertung eigener Zahlen — beides ist vertretbar,
   und die Gruppe entscheidet, wo sie jemand sucht.
