# Gerätetest: die acht Dinge, die kein Prüflauf sehen kann

**Stand: 0.9.47 (2026-09-17).** Diese Liste existiert, weil die ROADMAP den
Gerätetest als erledigt führt — auf Zuruf, ohne Protokoll. Die vier dort
genannten Punkte sind bewusst kleinteilig, weil sich genau sie auf keinem
Emulator zeigen. Hier stehen sie einzeln, mit den vier weiteren, die dieselbe
Eigenschaft haben.

**Aufwand: etwa eine halbe Stunde**, zwei Geräte für Punkt 4.

Für jeden Punkt genügt eine von drei Antworten: **in Ordnung** /
**stört, aber geht** / **geht nicht**.

Bitte notieren Sie dazu: **Gerät, Betriebssystem-Fassung, Browser** — und ob
die Anwendung im Browser lief oder als installierte App vom Startbildschirm.
Beides verhält sich unterschiedlich, und zwar gerade bei den Punkten 1, 3
und 6.

---

## 1. Die Bildschirmtastatur

**So geht's:** RV Report öffnen, in ein Zahlenfeld weit unten tippen
(„Bürozeit" oder ein Feld im vierten Abschnitt).

**Zu beantworten:**

- Verdeckt die eingeblendete Tastatur **das Feld, in dem Sie gerade
  schreiben**?
- Schiebt sich die Seite von selbst so weit hoch, dass Feld und Beschriftung
  sichtbar bleiben?
- Nach dem Schließen der Tastatur: Steht die Seite wieder dort, wo sie war,
  oder bleibt ein leerer Streifen unten?

*Warum das hier steht: Die Höhe der Bildschirmtastatur ist in keinem
Testbrowser nachgebildet. Der Fehler trifft jeden, der eine Zahl im unteren
Drittel einträgt — also den Normalfall.*

## 2. Versehentliche Textmarkierung beim Zählen

**So geht's:** Auf einem Zähler **schnell hintereinander** auf „+1" tippen,
zehnmal in Folge. Danach dasselbe mit einem längeren Druck zwischendurch.

**Zu beantworten:**

- Wird dabei Text blau markiert (die Beschriftung oder die Zahl)?
- Erscheint das Auswahlmenü („Kopieren / Nachschlagen")?
- Zählt das Feld trotzdem jedes Antippen mit?

*Warum: Doppeltippen markiert auf Mobilgeräten Text. Beim Zählen nach einem
Termin tippt man genau so.*

## 3. Die Ränder des Geräts (Safe Areas)

**So geht's:** Am besten auf einem iPhone mit Aussparung oben und
Home-Streifen unten. Die App vom Startbildschirm starten, nicht aus dem
Browser.

**Zu beantworten:**

- Liegt die untere Bedienleiste (**Report · Zeit · Archiv · Mehr**)
  vollständig **über** dem Home-Streifen, oder schneidet er sie an?
- Lässt sich die Taste ganz links und die ganz rechts sicher treffen, ohne
  dass das System die Wischgeste abfängt?
- Quer gehalten: Bleibt etwas unter der Aussparung liegen?

## 4. Geräteabgleich mit Kamera, zwei echte Geräte

**So geht's:** Beide Geräte ins selbe WLAN. Auf Gerät A: **Mehr → Optionen →
Geräte-Sync → Live-Verbindung starten**. Auf Gerät B: **Live-Verbindung
beitreten** und den QR-Code von Gerät A abfilmen. Dann den zweiten Code in die
Gegenrichtung.

**Zu beantworten:**

- Wird der Code **beim ersten Versuch** erkannt, und aus welchem Abstand?
- Bei mehreren Teilstücken: Erkennt das Gerät sie nacheinander, ohne dass man
  zwischendurch neu ausrichten muss?
- Steht die Verbindung, und bleibt sie stehen, wenn Sie das Sync-Fenster
  verlassen und normal Zahlen eintragen?
- Tragen Sie **auf beiden Geräten in verschiedene Kategorien** je eine Zahl
  ein: Kommt auf beiden Seiten alles an, ohne dass etwas überschrieben wird?

*Das ist der Punkt, der seit dem Umbau in 0.9.17 nie auf echten Geräten
bestätigt wurde — und der einzige, der zwei Menschen oder zwei Hände
braucht.*

## 5. Offline, und zwar wirklich

**So geht's:** Flugmodus einschalten. App vom Startbildschirm starten, ein
paar Zahlen eintragen, eine Notiz diktieren oder tippen, App schließen.
Flugmodus aus, App wieder öffnen.

**Zu beantworten:**

- Startet die App im Flugmodus überhaupt, und zwar vollständig?
- Sind **alle** Ansichten erreichbar (auch Analyse, Archiv, Datensicherung)?
- Ist nach dem Wiedereinschalten alles noch da?

*Warum: Nachgeladene Ansichten werden im Hintergrund vorgeholt. Gemessen ist
das im Labor; im Funkloch zählt das Gerät.*

## 6. Der abgeräumte Tab (iOS)

**So geht's:** Mitten in einer Eingabe (Zahl getippt, **nicht** weggeklickt)
zu einer anderen App wechseln, dort fünf bis zehn Minuten arbeiten, dann
zurück.

**Zu beantworten:**

- Ist die zuletzt getippte Zahl noch da?
- Wenn die App neu lädt: Steht der Bericht vollständig da, oder fehlt der
  letzte Eintrag?

*Warum: iOS beendet Tabs im Hintergrund. Dafür gibt es die synchrone
Notrettung — sie ist im Labor geprüft, aber nicht am echten Speicherdruck
eines Telefons.*

## 7. Senden an die Vertriebsleitung

**So geht's:** Im Formular unten **„Bericht an VL senden"**. Bei der
Rückfrage zuerst **„Nur Vorlage senden"** wählen.

**Zu beantworten:**

- Öffnet sich das Teilen-Menü des Geräts, und ist die E-Mail-App dabei?
- Kommt die Datei als **Anhang** an, mit sinnvollem Namen und der Endung
  `.xlsx`?
- Lässt sie sich auf dem Empfängergerät in Excel öffnen, und stimmt Blatt 1?
- Zweiter Durchgang mit **„Alles senden"**: Sind die beiden zusätzlichen
  Blätter da?

## 8. Diktat

**So geht's:** Im Notizfeld das Mikrofon antippen, zwei Sätze sprechen.

**Zu beantworten:**

- Kommt die Rückfrage vor der ersten Nutzung (Hinweis auf Google/Apple)?
- Landet der Text im richtigen Feld, und bleibt er dort?
- Wird die Aufnahme sauber beendet, oder läuft das Mikrofon weiter?

---

## Was danach passiert

Antworten bitte an die Entwicklung — auch „in Ordnung" ist ein Ergebnis, und
zwar eines, das in der ROADMAP an der Stelle fehlt, wo heute „laut Rückmeldung
durchgeführt" steht. Erst mit Datum, Gerät und Antwort je Punkt ist der
Punkt 1.0-fähig.

**Nicht auf dieser Liste**, weil es zum Screenreader-Durchlauf gehört und
nicht hierher: alles, was mit VoiceOver, NVDA oder TalkBack vorgelesen wird.
