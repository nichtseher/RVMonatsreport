# Screenreader-Durchlauf: was sich seit 0.9.22 geändert hat

**Stand: 0.9.27 (2026-09-07).** Der letzte Durchlauf mit einem blinden
Kollegen lief auf **0.9.22** und verlief gut.

Seither wurden in 0.9.23 bis 0.9.27 **die zugänglichen Namen an vielen
Stellen umgebaut** — nach WCAG 2.5.3 („Label in Name") korrekt, aber von
keinem Screenreader nachgeprüft. Ein automatischer Prüflauf misst, **ob** ein
Name existiert und die sichtbare Beschriftung enthält. Er misst nicht, ob der
Name **brauchbar** ist, wenn er vorgelesen wird.

Diese Liste ist deshalb kurz gehalten: **nur das Geänderte**, nicht die ganze
App. Sie sollte in etwa einer halben Stunde durchzugehen sein.

Für jeden Punkt genügt eine von drei Antworten: **gut so** / **zu lang** /
**falsch oder unverständlich**.

---

## 1. Die Zeilen im RV Archiv (wichtigster Punkt)

**Was geändert wurde:** Die Monatszeile hatte einen kurzen, festen Namen. Der
hat die sichtbaren Angaben ersetzt statt sie zu enthalten — wer per
Sprachsteuerung sagte, was er las, traf nichts. Jetzt ist der sichtbare
Inhalt der Name.

| | |
|---|---|
| **vorher** | „August 2026, am 01.09.2026 an die Vertriebsleitung gesendet. Details ausklappen" |
| **jetzt** | „August 2026, Zähler: 23, Gesendet 01.09.2026 an die Vertriebsleitung, Mitarbeiter: Marc Petry, Schaltfläche, reduziert" |

**Zu prüfen:** Der neue Name ist deutlich länger. Ist er beim Durchblättern
einer Archivliste mit zehn Monaten **noch erträglich** oder störend?

Das ist der einzige Punkt, an dem ich mir unsicher bin. Wenn er zu lang ist,
lässt sich der Mitarbeitername herausnehmen — er ist in jeder Zeile derselbe.

## 2. Die Schaltflächen im aufgeklappten Monat

Fünf Schaltflächen hatten Namen, die ihre Beschriftung ersetzten. Jetzt
beginnt der Name mit dem, was auf der Taste steht:

- „Doch noch offen für August 2026" (vorher: „August 2026 ist am … gesendet.
  Markierung zurücknehmen" — **kein einziges** sichtbares Wort kam vor)
- „Laden / Editieren — August 2026 in das Formular holen"
- „Export RV Report für August 2026 als Excel-Datei, zum Teilen"
- „Export RV Zeit — Zeiterfassung für August 2026 als Excel-Datei, zum Teilen"
- „Wirklich löschen — August 2026 endgültig aus dem Archiv entfernen"

**Zu prüfen:** Sagt der Anfang genug, um die Taste zu erkennen, ohne bis zum
Ende zuhören zu müssen?

## 3. Die Suche im Archiv

Zwei Neuerungen:

- Beim Tippen meldet ein Statusbereich **„3 von 5 Monaten gefunden."**
  → **Zu prüfen: Wird das überhaupt vorgelesen?** Live-Bereiche verhalten
  sich je nach Screenreader und Modus unterschiedlich. Das ist die Stelle,
  bei der ich am wenigsten voraussagen kann, ob sie funktioniert.
- Trifft die Suche auf einen **Kommentar**, steht der Kommentar jetzt direkt
  unter dem Treffer — vorher war er nur im aufgeklappten Teil und damit
  unhörbar.
- Die Taste zum Leeren hieß „Clear" und heißt jetzt „Suche zurücksetzen".

## 4. Die Jahreszeile im Archiv

Sie sagt jetzt an, ob das Jahr auf- oder zugeklappt ist (vorher gar nichts).

Während einer Suche ist sie **keine Schaltfläche mehr**, sondern eine
Überschrift — vorher meldete sie „aufgeklappt" und ließ sich trotzdem nicht
schließen.

**Zu prüfen:** Ist der Wechsel zwischen Schaltfläche und Überschrift
verwirrend, wenn man die Suche benutzt?

## 5. Die Zählerzeile im Formular

Die Tasten **−5 und +5 sind entfallen.** Übrig sind Minus, Zahlenfeld, Plus —
alle deutlich größer.

**Zu prüfen:** Fehlen die Fünferschritte im Alltag? Der Ersatz ist, die Zahl
direkt in das Feld zu tippen; ein Hinweis darauf steht über den Zählern und
zusätzlich im vorgelesenen Text jedes Zählers.

## 6. Die Stempeluhr

- Die Pausentasten hießen zugänglich „Pause um 15 Minuten erhöhen", sichtbar
  aber „+15". Jetzt enthält der Name die sichtbare Beschriftung.
- Das Abzeichen „Aufnahme läuft" pulsiert nicht mehr als Ganzes.
- Der **GPS-Knopf ist entfernt** (beide Formulare).

## 7. Der Geräte-Sync

- Der QR-Code und die Kameravorschau werden **nicht mehr vorgelesen** — sie
  waren als namenlose Elemente im Baum. Der Weg über den eingefügten Textcode
  ist unverändert.
- „Abbrechen" ist von 24 auf 44 Pixel gewachsen (betrifft die Bedienung mit
  Restsehvermögen, nicht die Sprachausgabe).

## 8. Der Ersteinstieg

Nicht geändert, aber zum ersten Mal automatisch geprüft — fünf Schritte,
Fokusfalle in beide Richtungen, keine Beanstandung. **Zu prüfen:** Nur, falls
noch ein Gerät mit leerem Speicher zur Hand ist.

---

## Was ein Ergebnis wert ist

Ein automatischer Prüflauf (axe-core) findet **einen Teil** der WCAG-Verstöße,
nie alle. Ein grüner Lauf ist kein Konformitätsnachweis. Dieser Durchlauf hier
entscheidet, nicht der Prüflauf.

Antworten bitte je Punkt mit **gut so / zu lang / falsch**. Alles, was nicht
„gut so" ist, wird geändert — auch wenn es der Norm entspricht.
