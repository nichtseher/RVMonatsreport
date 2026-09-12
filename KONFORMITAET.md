# Konformitätsbericht — RV Monatsreport („RV Mobil")

| | |
|---|---|
| **Stand** | 2026-09-12 |
| **Geprüfte Fassung** | 0.9.32, Commit `75f0564` (veröffentlicht und live nachgewiesen) |
| **Maßstab** | EN 301 549 V3.2.1 (2021-03), Abschnitt 9 → WCAG 2.1 Stufe A und AA |
| **Zusätzlich dokumentiert** | die neun Erfolgskriterien aus WCAG 2.2, die der Entwurf EN 301 549 V4.1.0 aufnimmt |
| **Art des Dokuments** | technische Selbstauskunft |
| **Vorfassung** | 2026-09-02 für 0.9.19, mit Nachtrag vom 2026-09-07. Dieser Stand ist **neu erhoben**, nicht nachgetragen: Zwischen 0.9.19 und 0.9.32 liegen dreizehn Fassungen, und der größte Teil davon hat genau an den hier bewerteten Kriterien gearbeitet |

---

## 1. Was dieses Dokument ist — und was nicht

Es ist eine **Selbstauskunft**: erhoben von den Entwicklern der Anwendung,
nicht von einer unabhängigen Prüfstelle. Es ist **keine
Barrierefreiheitserklärung im Rechtssinn** und **kein Rechtsgutachten**.

Der leitende Grundsatz ist bewusst streng:

> **Erfüllt ist, was geprüft wurde.** Ein Kriterium, das plausibel eingehalten
> wird, aber nie nachgemessen wurde, steht hier nicht als „erfüllt", sondern
> als das, was es ist.

Das macht den Bericht kürzer in der Erfolgs- und länger in der Lückenspalte als
üblich. Das ist Absicht. Ein belegter Bericht mit ehrlichen Lücken trägt eine
Abnahme; eine pauschale Konformitätsbehauptung fällt bei der ersten
Gegenprüfung.

---

## 2. Gegenstand

Progressive Web App zur Erfassung des monatlichen Außendienstberichts
(Zählwerte, Notizen, Arbeitszeit). Fünf Ansichten, keine Anmeldung, kein
Server: Alle Daten liegen ausschließlich im Browser des Geräts
(`localStorage`, IndexedDB). Der Geräteabgleich läuft ohne Vermittlungsserver.

**Primäre Zielgruppe sind blinde und sehbehinderte Außendienstmitarbeiter.**
Barrierefreiheit ist hier keine Auflage, sondern die Funktionsvoraussetzung.

### Anwendbare Abschnitte der EN 301 549

| Abschnitt | Anwendbar | Begründung |
|---|---|---|
| 9 — Web | **ja** | die Anwendung ist Webinhalt |
| 11 — Software | teilweise | als installierte PWA; die Anforderungen decken sich hier weitgehend mit Abschnitt 9 |
| 12 — Dokumentation und Hilfe | **ja** | integrierte Hilfe (`HelpModal`) |
| 5 — allgemeine Anforderungen | teilweise | keine geschlossene Funktionalität, keine biometrischen Merkmale |
| 6 — Sprachkommunikation | nein | keine Zwei-Wege-Sprachfunktion |
| 7 — Videos mit Ton | nein | keine Medieninhalte |
| 8 — Hardware | nein | reine Software |
| 10 — Nicht-Web-Dokumente | nein | die Excel-Ausgabe ist eine Datenlieferung, kein Dokument zur Veröffentlichung |

---

## 3. Prüfmethodik — und wo sie endet

### 3.1 Was automatisiert läuft

Im Deploy-Tor vor jedem Bauen. Zwei Läufe, beide müssen bestehen:

- **`npm run check` — 162 Prüfungen reiner Funktionen.** Zusammenführen beim
  Geräteabgleich samt Zeitstempeln je Feld, Excel-Summen, Arbeitszeit über
  Mitternacht, Verschlüsselung der Sicherung, doppelt kodierte Zeichen.
- **`npm run check:ui` — 825 angemeldete Prüfungen, davon 418 ausgeführt**
  (der Rest wird durch Profil- und Schemafilter ausdrücklich übersprungen),
  Laufzeit rund 15 Minuten, drei Geräteprofile: 360 × 780 Chromium,
  360 × 780 WebKit, 1280 × 900 Chromium.

Zum Vergleich: In der Vorfassung dieses Berichts (0.9.19) waren es 63.

| Prüfung | Deckung |
|---|---|
| Waagerechter Überlauf | fünf Ansichten × drei Schriftgrößen × drei Profile, inkl. Containern mit `overflow-x: auto`, die für die Seitenprüfung unsichtbar bleiben. Zusätzlich **320 px** (iPhone SE) bei „Extra groß" |
| Trefferflächen | dieselbe Matrix, **eine einzige Schwelle: 44 px**, gemessen über den Layout-Kasten (`offsetWidth`/`offsetHeight`), nicht über `getBoundingClientRect` — Letzteres rechnet Eintritts-Transformationen mit und meldete eine 44-px-Taste im kopflosen Lauf als 41,8 px. Seit 0.9.22 gibt es **keine Ausnahme mehr** (siehe 2.5.5 in Abschnitt 4) |
| axe-core | alle Ansichten **und die Zustände darunter**, Regelsätze `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` |
| Kontrast je Farbschema | fünf Ansichten × drei weitere Schemata (dunkel, Kontrast dunkel, Kontrast gelb) × zwei Profile, Regel `color-contrast`. Jede Prüfung weist zuvor nach, dass das Schema wirklich anliegt (`data-theme` **und** `data-dark`) und dass axe die Regel überhaupt ausgeführt hat |
| **Kontrast in den Rückfragen, selbst gerechnet** | zwei Rückfragen × vier Schemata. Eigene Rechnung statt axe, weil axe durch die halbdurchsichtige Abdunklung hindurch den wirksamen Hintergrund nicht bestimmen kann und `incomplete` meldet — siehe 3.2, Punkt 7 |
| Ansichten hinter den Einstiegen | die sechs Ansichten, die nicht über `?tab=` erreichbar sind (Formular anpassen, **Formularfelder verwalten**, Geräte-Sync, Datensicherung, Hilfe, Jahreskonto, Was gibt's Neues): Überlauf und Trefferflächen bei „normal" und „Extra groß" in drei Profilen, axe in zwei |
| **Zustände innerhalb der Ansichten** | Ein `?tab=` erreicht die Ansicht, nicht ihre Zustände — dort saßen zwischen 0.9.22 und 0.9.32 acht Fundstellen. Abgedeckt sind jetzt: Formularzustände, Formulare der Stempeluhr, Schicht-Protokoll mit Einträgen, Archiv mit Bestand (Liste, aufgeklappt, Löschabfrage, Suche), die sechs Zustände des Geräteabgleichs, die fünf Schritte des Ersteinstiegs und **alle sechs Rückfragen** |
| **Zwei Geräte, echt gekoppelt** | Textcode, Live-Verbindung (WebRTC ohne ICE-Server) und **QR-Weg mit gestellter Kamera**. Geprüft werden Kopplung, Zusammenführen in beide Richtungen, die Stille einer ruhenden Verbindung und der Bestand danach |
| Tabulator-Durchlauf | alle elf Ansichten, mit **echten Tastendrücken**: Erreichbarkeit jedes sichtbaren Bedienelements, Reihenfolge in Dokumentordnung, geschlossene Runde. In den Rückfragen zusätzlich: Startfokus, Verbleib im Dialog, Fokus-Rückgabe und die Wirkung von Escape |
| WCAG 2.5.3 (Beschriftung im Namen) | über alle Ansichten und Zustände: ein `aria-label`, das die sichtbare Aufschrift **ersetzt** statt sie zu enthalten, lässt den Lauf scheitern |
| Textabstand nach 1.4.12 | die vier Normwerte werden erzwungen, danach Überlauf und Trefferflächen über alle elf Ansichten |
| Breitere Schrift als hier installiert | alle Ansichten **und Zustände** bei „Extra groß" mit erzwungener Verdana bzw. DejaVu Sans — stellt nach, dass der Schriftstapel je nach Gerät ein anderes Glied greift |
| Lesefehler beim Start | ein vorübergehender Lesefehler darf weder Archiv noch laufenden Bericht löschen (Regressionsprüfung zum Datenverlust aus 0.9.22) |
| Medienabfrage `pointer: coarse` | Nachweis, dass die Touch-Zweige im Prüflauf wirklich greifen |
| Update-Hinweis | der Hinweis entsteht außerhalb von React und ist über keine Ansicht erreichbar; er wird über eine eigene Naht angesprochen und auf Geometrie und axe gemessen |

### 3.2 Die Grenzen dieser Automatisierung — vollständig benannt

Diese Liste ist der wichtigste Teil des Berichts. Wer den grünen Lauf ohne sie
liest, liest ihn falsch:

1. **axe findet einen Teil der WCAG-Verstöße, nie alle.** Ein grüner Lauf ist
   keine Konformitätsaussage. Das gilt unabhängig von der Konfiguration.
2. **Nur `critical` und `serious` lassen die Prüfung scheitern.** Befunde der
   Stufen `moderate` und `minor` werden herausgefiltert und fallen nicht auf.
3. **Der vollständige axe-Durchlauf läuft nur im Standardtheme.** Daneben
   tritt eine eigene Kontrastprüfung für die drei weiteren Farbschemata, seit
   0.9.32 zusätzlich die selbst gerechnete Kontrastprüfung der Rückfragen in
   allen vier Schemata. Alle anderen axe-Regeln — Beschriftungen, Rollen,
   Struktur — werden weiterhin nur im Standardschema geprüft; das ist
   vertretbar, weil sie nicht am Farbschema hängen, aber es ist eine Annahme
   und keine Messung.
   **Alle Kontrastprüfungen laufen bei Schriftgröße „normal".** Das ist der
   strengere Fall: axe wendet die WCAG-Ausnahme für großen Text an (3:1 statt
   4,5:1), sobald die berechnete Schriftgröße es hergibt — die größeren
   Stufen sind also die leichteren.
4. **Regeln der Kategorie „best practice" laufen nicht mit**, weil nur
   WCAG-Regelsätze aktiviert sind. Landmarkenstruktur fällt darunter.
5. ~~**Was an Klickfolgen hängt, ist nur teilweise abgedeckt.**~~
   **Geschlossen zwischen 0.9.27 und 0.9.32.** Dieser Punkt nannte drei
   Lücken: den Einrichtungsassistenten, die Bestätigungsdialoge und die
   Kamerawege. Alle drei sind abgedeckt — der Assistent mit 0.9.27, die
   Rückfragen und die Kamerawege mit 0.9.32.

   Bemerkenswert ist, **wie** sie zugegangen sind, denn das betrifft die
   Lesart dieses ganzen Abschnitts: Alle drei galten als „nicht herstellbar".
   Bei allen dreien war das eine Vermutung, die niemand nachgerechnet hatte.
   Für den QR-Weg fehlte am Ende eine Kommandozeilen-Flagge
   (`--use-fake-device-for-media-stream` neben der Videodatei); ohne sie
   meldet der Browser „kein Gerät gefunden" — und genau diese Meldung galt
   drei Fassungen lang als Beleg dafür, dass es nicht geht.

   **Wer diese Liste liest, sollte jeden Satz der Form „X ist nicht prüfbar,
   weil Y" als Vermutung lesen, bis eine Messung daneben steht.** Zwischen
   0.9.30 und 0.9.32 sind drei solche Sätze widerlegt worden, und hinter dem
   ersten steckte ein echter Datenfehler.

   Der Punkt stand ursprünglich als „Modaldialoge nicht abgedeckt". Das war
   ungenau: `ManageModal`, `HistoryModal`, `StatsModal` und `TimeModal` sind
   trotz ihrer Namen **keine Dialoge**, sondern vollwertige Ansichten.
6. **Was eine gestellte Kamera nicht ist.** Der QR-Weg läuft gegen ein
   erzeugtes Video: kein Rauschen, keine Unschärfe, kein Schräghalten, keine
   Spiegelung auf dem Bildschirm des anderen Geräts. Belegt ist, dass der Weg
   funktioniert und die Teilstücke sich richtig zusammensetzen — **nicht**,
   wie gut er sich im Sitzungszimmer bedienen lässt.

   Nebenbefund aus derselben Messung: Bei 640 × 480 kam nur das kurze letzte
   Teilstück durch, bei 800 × 600 alle drei. Die Telefone der Kollegen filmen
   weit darüber; wer aber `CHUNK_SIZE` erhöht, verbraucht genau diese Reserve.
7. **axe kann Kontrast in einem modalen Dialog nicht messen** — und das ist
   keine Feinheit, sondern der Grund, warum ein realer Verstoß
   automatisiert unsichtbar war.

   Durch die halbdurchsichtige Abdunklung hindurch kann axe den wirksamen
   Hintergrund nicht bestimmen. Es meldet dann `incomplete` statt
   `violation` — und ausgewertet werden `violations`. Gemessen am 2026-09-12
   mit einem absichtlich zerstörten Kontrast (1,00:1) in der Rückfrage: Die
   Prüfung blieb grün, über die ganze Seite ebenso wie eingegrenzt auf den
   Dialog.

   Genau dort saß der Fehler aus 0.9.22 — die bestätigende Taste stand in
   zwei Farbschemata mit 1,00:1 bzw. 1,07:1 auf ihrem eigenen Hintergrund, in
   **allen vier** zerstörenden Rückfragen. Gefunden wurde er damals von Hand.
   Seit 0.9.32 rechnet das Prüfnetz den Kontrast in den Rückfragen selbst,
   indem es halbdurchsichtige Schichten über den ersten deckenden Vorfahren
   zusammensetzt.
8. **`target-size` meldet in einem offenen Dialog auch den Hintergrund.**
   Die Abdunklung zählt für axe nicht als Verdeckung, die deckende
   Dialogkarte darüber schon; wo deren Kante eine Tastenzeile schneidet,
   meldet axe den übrig bleibenden Streifen. Gemessen: `217,2 × 17,5 px` für
   eine Taste, die tatsächlich 44 px hoch ist. Welche Zeile es trifft, hängt
   am Umbruch und damit an der Schrift — der Befund trat auf dem CI-Läufer
   auf und lokal nicht, auch nicht mit erzwungener Breitschrift. Die
   axe-Messung der Rückfragen ist deshalb auf den Dialog eingegrenzt.

### 3.3 Screenreader-Durchlauf

**Nachtrag 2026-09-07 — der bislang belastbarste Durchlauf.** NVDA und
VoiceOver sind **auf der veröffentlichten Fassung 0.9.22 ohne Befund
durchgelaufen, durchgeführt von einem blinden Kollegen aus dem Team.** Damit
ist zum ersten Mal beides zugleich erfüllt, was dieser Bericht verlangt: die
**aktuelle** Fassung und die **richtige** Person.

Warum die Fassung hier ausdrücklich dasteht: Die öffentliche Adresse hat bis
zum 2026-09-07 gegen 16:00 Uhr den Stand `497fef3` vom 2026-09-02
ausgeliefert — die beiden Commits danach waren an einem fehlgeschlagenen
Deploy hängengeblieben, ohne dass es auffiel. Ein Durchlauf „auf der App"
prüfte in diesen fünf Tagen also nicht das, was im Quelltext stand. Für den
früheren Durchlauf unten heißt das: Welche Fassung er abgedeckt hat, ist
nachträglich nicht mehr sicher zu bestimmen.

Was die Angabe weiterhin **nicht** ist: von den Entwicklungswerkzeugen
nachvollzogen. Kein eingesehenes Protokoll, keine Aufzeichnung. Sie bleibt
eine Fremdauskunft — aber eine, die den selbst gesetzten Maßstab dieses
Dokuments erfüllt.

**Früherer Durchlauf, unverändert dokumentiert:** NVDA (PC) und VoiceOver
(iOS) sind am 2026-09-02 ohne Befund durchgelaufen — nach Rückmeldung des
Projektinhabers, ohne eingesehenes Protokoll, und ohne gesicherte Zuordnung
zu einer Fassung.

**TalkBack (Android) ist ungeprüft** — und zwar aus einem sachlichen Grund:
Die blinden Kollegen nutzen ausschließlich iPhones. Die Plattform ist mit der
tatsächlichen Zielgruppe nicht prüfbar; ein sehender Durchlauf erfüllte den
selbst gesetzten Maßstab nicht. **Ungeprüft, nicht erfüllt.**

**Nicht bestätigt:** ob der Geräteabgleich (Kopplung, QR- und Textcode,
Zusammenführen) Teil dieser Durchläufe war. Das ist der Teil der Anwendung,
der zuletzt umgebaut wurde.

**Nachtrag 2026-09-12 — der Durchlauf ist zehn Fassungen alt.** Er fand auf
0.9.22 statt; dieser Bericht bewertet 0.9.32. Dazwischen liegen Änderungen,
die genau das betreffen, was ein Screenreader-Durchlauf beurteilt:

| Fassung | Änderung mit Screenreader-Bezug |
|---|---|
| 0.9.29 | Die Einklappung des Schicht-Protokolls ist entfernt; die Liste steht jetzt im Lesefluss |
| 0.9.31 | Das Abzeichen „Live verbunden" im Kopfbereich bricht jetzt um |
| 0.9.32 | **Die Rückfragen sind umgebaut**: Startfokus, Verbleib im Dialog, Fokus-Rückgabe, und Escape bricht nur noch die Rückfrage ab |

Der letzte Punkt wiegt am schwersten. Bis 0.9.32 kam der Fokus bei zwei von
fünf Rückfragen **gar nicht im Dialog an** — der Screenreader las die
Löschabfrage vor, während die Tastatur im Hintergrund stand. Das ist genau
die Klasse von Fehler, die ein Durchlauf auf 0.9.22 nicht gesehen haben kann,
weil sie damals noch da war. Die Korrektur ist gemessen, aber **nicht gehört**.

**Für die Abnahme heißt das: Ein Durchlauf auf 0.9.32 steht aus, und er sollte
die Rückfragen und den Geräteabgleich ausdrücklich einschließen.**

### 3.4 Test auf echten Geräten

**Ebenfalls am 2026-09-02 laut Rückmeldung des Projektinhabers durchgeführt** —
und ebenfalls eine Fremdauskunft, nicht nachvollzogen. Sie deckt eine Klasse
ab, die kein Prüflauf erreicht: Bildschirmtastatur, Safe-Areas auf echtem
Gerät, versehentliche Textmarkierung beim Tippen, Kamerakopplung zwischen zwei
physischen Geräten.

Für diesen Bericht heißt das: Die Kriterien, die von echter Hardware abhängen,
sind **nicht mehr ungeprüft, aber auch nicht einzeln belegt.** Wo unten
„plausibel" steht, bleibt es dabei — eine Durchführungsmeldung ohne Protokoll
hebt kein Kriterium auf „erfüllt".

---

## 4. WCAG 2.2 — die neun zusätzlichen Erfolgskriterien

Maßgeblich wird dieser Block mit EN 301 549 V4.1.0. ETSI nennt als Termin der
Veröffentlichung im Amtsblatt der EU den **23. Oktober 2026**; bis dahin gilt
V3.2.1 mit WCAG 2.1.

| Kriterium | Stufe | Stand | Beleg |
|---|---|---|---|
| 2.4.11 Focus Not Obscured (Minimum) | AA | **erfüllt** — war verletzt | 9 von 126 Fokusstationen im Formular waren vollständig hinter der unteren Leiste verschwunden. Behoben über `scroll-padding-bottom`. Gegenprobe über alle Ansichten und Profile: **0 von 668** |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | **nicht erfüllt, bewusst** | teilweise Verdeckungen durch `sticky`-Kopfzeile bestehen; AAA war nie das Ziel |
| 2.4.13 Focus Appearance | AAA | nicht bewertet | AAA |
| 2.5.7 Dragging Movements | AA | **erfüllt** | zwei Stellen setzen aufs Ziehen, beide mit Ein-Klick-Alternative: Wischen filtert von 6 auf 3 Abschnitte auch per Einzelklick; die Schieberegler reagieren auf einen Klick auf die Spur (50 → 85), auf Pfeiltasten und auf vier Vorwahlschaltflächen |
| 2.5.8 Target Size (Minimum) | AA | **erfüllt** — war verletzt | ein Schieberegler mit **168 × 6 px** im Ausstempel-Formular; die dafür gebaute Klasse war nur im A11y-Fenster gesetzt. Behoben, nachgemessen 168 × 44 px |
| 3.2.6 Consistent Help | A | **erfüllt** | Hilfe an genau einem Einstieg; Hauptnavigation in allen fünf Ansichten und beiden Profilen identisch, „Optionen" stets Position 5 von 5 |
| 3.3.7 Redundant Entry | A | **erfüllt** | der Mitarbeitername wird in jeden neuen Monat übernommen |
| 3.3.8 Accessible Authentication (Minimum) | AA | **nicht anwendbar** | die Anwendung hat keine Anmeldung |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | **nicht anwendbar** | dito |

Zusätzlich freiwillig über die Norm hinaus:

| Kriterium | Stufe | Stand |
|---|---|---|
| 2.5.5 Target Size (Enhanced), 44 × 44 px | **AAA** | **erfüllt für jedes Bedienelement, ohne Ausnahme** (seit 0.9.22). In der Vorfassung galt das nur „für alles im Tab-Lauf": Die `±5`-Schnelltasten lagen darunter und liefen unter der Gleichwertigkeitsausnahme. Sie sind auf Vorgabe des Projektinhabers entfernt; kein Bedienelement trägt mehr `tabindex="-1"` oder `aria-hidden`. Das Prüftor kennt seither **eine** Schwelle statt zweier — eine Ausnahme, die niemanden mehr hat, ist eine offene Tür. Der frei gewordene Platz ist in die verbliebenen drei Elemente geflossen: `±1` bei „Extra groß" von 53,6 auf **80 × 64 px**, das Zahlenfeld von 56–72 auf **76–96 px** |

---

## 5. WCAG 2.1 Stufe A und AA — der geltende Sockel

**erfüllt** = geprüft, mit Beleg · **plausibel** = durch Bauweise oder Werkzeug
gedeckt, ohne eigenen Nachweis · **nicht geprüft** = offen · **n. a.** = nicht
anwendbar

### 5.1 Wahrnehmbarkeit

| Kriterium | Stufe | Stand | Anmerkung |
|---|---|---|---|
| 1.1.1 Nicht-Text-Inhalt | A | plausibel | Symbole sind `aria-hidden`, Schaltflächen tragen `aria-label`; axe prüft `image-alt`. Seit 0.9.6 **0 sichtbare Emojis** in allen fünf Ansichten (vorher 14) |
| 1.2.1 – 1.2.5 Zeitbasierte Medien | A/AA | **n. a.** | keine Audio- oder Videoinhalte. Die Sprachausgabe ist eine Ausgabefunktion, kein Medieninhalt |
| 1.3.1 Info und Beziehungen | A | **teilweise** | Beschriftungen und ARIA von axe gedeckt. **Lücke:** Der Sprungziel-Bereich `#main-content` ist ein `<div>` ohne `main`-Rolle; Landmarkenregeln laufen nicht mit |
| 1.3.2 Bedeutungstragende Reihenfolge | A | nicht geprüft | entscheidet der Screenreader-Durchlauf |
| 1.3.3 Sensorische Eigenschaften | A | nicht geprüft | |
| 1.3.4 Ausrichtung | AA | plausibel | das Manifest sperrt die Ausrichtung nicht (`orientation` nicht gesetzt) |
| 1.3.5 Eingabezweck bestimmen | AA | **erfüllt** | beide Felder, die eine Angabe über den Nutzer selbst erfassen, tragen `autoComplete="name"` (`App.tsx`, `OnboardingModal.tsx`). Weitere Felder der Anwendung — Zählwerte, Zeiten, Notizen — fallen nicht unter die Liste der Eingabezwecke |
| 1.4.1 Benutzung von Farbe | A | plausibel | die vier Kategoriefarben sind bedeutungstragend; in den Kontrastschemata fallen sie bewusst zusammen, dort tragen Beschriftung und Symbol die Unterscheidung |
| 1.4.2 Audio-Steuerung | A | erfüllt | Sprachansagen sind abschaltbar, Geschwindigkeit einstellbar; kein selbsttätig startender Ton über 3 s |
| 1.4.3 Kontrast (Minimum) | AA | **erfüllt** | fortlaufend geprüft in **allen vier Farbschemata** über fünf Ansichten und zwei Geräteprofile. Zwei echte Verstöße wurden so gefunden und behoben (Fußzeile 4,41:1, Seitenleiste **3,59:1**). **Die Rückfragen sind seit 0.9.32 mitgeprüft** — und zwar mit einer eigenen Rechnung, weil axe sie gar nicht messen kann (siehe 3.2, Punkt 7). Genau dort lag der schwerste Kontrastfehler der Projektgeschichte: die bestätigende Taste mit 1,00:1 bzw. 1,07:1 in den beiden Hochkontrast-Schemata, in allen vier zerstörenden Rückfragen, behoben mit 0.9.22 |
| 1.4.4 Textgröße ändern | AA | **erfüllt** | drei Schriftstufen (100 / 125 / 150 %) über alle Ansichten und Profile automatisiert; Browser-Zoom auf 200 % ist **nicht** gesondert geprüft |
| 1.4.5 Bilder eines Textes | AA | erfüllt | keine Texte als Bild |
| 1.4.10 Reflow | AA | **erfüllt** | 360 px **und 320 px** × Schriftgrößen × alle elf Ansichten **und die Zustände darunter** × drei Profile, einschließlich verdeckten Überlaufs in scrollbaren Containern und mit erzwungener Breitschrift. **Der häufigste Layoutfehler dieses Projekts, mit Abstand:** `min-width: auto` an Flex-Elementen — ein Flex-Kind gibt seine Breite standardmäßig nicht unter seinen Inhalt preis und sprengt dann die Zeile, statt umzubrechen. **Bis 0.9.31 acht gefundene Fälle**, jeder einzeln nachgemessen; die auffälligsten: Jahreskonto 456 px, Feldverwaltung 531 px und das Abzeichen „Live verbunden" mit 385 px — alle in einem 360-px-Fenster. Der letzte erscheint nur bei bestehender Live-Verbindung und war deshalb nie jemandem aufgefallen |
| 1.4.11 Kontrast von Nicht-Text | AA | **teilweise** | Rahmenfarben gezielt gemessen: 3,24:1 gegen die Karte, 3,10:1 gegen den Grund, im dunklen Schema 3,09:1. Nicht für alle Bedienelemente einzeln nachgewiesen |
| 1.4.12 Textabstand | AA | **erfüllt** | seit 2026-09-02 geprüft: Die vier von der Norm genannten Werte werden erzwungen (Zeilenhöhe 1,5×, Absatzabstand 2×, Sperrung 0,12×, Wortabstand 0,16×) und danach über alle elf Ansichten auf Überlauf und Trefferflächen gemessen. Bestanden ohne Befund. **Was das nicht abdeckt:** Text, der innerhalb eines Kastens abgeschnitten wird, ohne den Kasten zu sprengen — das braucht ein Auge. Zusätzlich wurde die eigene Sperrung bereinigt: 21 negative Werte entfernt, die Ausreißer vereinheitlicht, von sieben Werten auf zwei |
| 1.4.13 Inhalt bei Hover oder Fokus | AA | **erfüllt** | **acht Verstöße am 2026-09-02 gefunden und behoben.** Native Tooltips aus dem `title`-Attribut erfüllen keine der drei Bedingungen des Kriteriums: nicht schließbar ohne Zeigerbewegung, nicht überfahrbar, nicht dauerhaft — auf dem Handy erscheinen sie ohnehin nie. Drei Stellen dublierten nur einen vorhandenen `aria-label` und sind entfernt; **fünf weitere fand erst die Prüfung**, darunter vier Schnelltext-Tasten, die den einzufügenden Text ausschließlich im Tooltip trugen. Deren Inhalt ist jetzt im `aria-label` — mit der sichtbaren Aufschrift voran, damit 2.5.3 gewahrt bleibt. Eine Prüfung hält `title`-Attribute künftig draußen |

### 5.2 Bedienbarkeit

| Kriterium | Stufe | Stand | Anmerkung |
|---|---|---|---|
| 2.1.1 Tastatur | A | **erfüllt** | mit **echten Tastendrücken** über alle elf Ansichten geprüft: Jedes sichtbare Bedienelement wird vom Tabulator erreicht. **Vier echte Verstöße so gefunden und behoben:** der scrollbare Inhaltsbereich der Hilfe (axe `scrollable-region-focusable`); eine Fokusfalle im Jahreskonto, das gar kein modaler Dialog ist; dieselbe Falle in der Feldverwaltung (0.9.22); und deren scrollbare Kategorienliste. Seit 0.9.22 trägt **kein** Bedienelement mehr `tabindex="-1"` — die `±5`-Tasten, der einzige Fall, sind entfernt |
| 2.1.2 Keine Tastaturfalle | A | **erfüllt** | der Durchlauf schließt in jeder Ansicht die Runde, statt hängen zu bleiben; Dialoge sind zusätzlich mit Escape verlassbar. Die Fokusfalle des Geräteabgleichs bleibt — dort ist sie richtig, weil es ein echtes Overlay mit abgedunkeltem Hintergrund und `aria-modal="true"` ist. **Seit 0.9.32 ist auch das Gegenteil geprüft:** In den Rückfragen darf der Tabulator den Dialog *nicht* verlassen. Bei zwei von fünf tat er es — der Fokus kam gar nicht erst im Dialog an, und der Tabulator lief durch die Seite dahinter |
| 2.1.4 Zeichentasten-Kurzbefehle | A | **erfüllt** | am 2026-09-02 am Quelltext geprüft (`App.tsx`, Tastaturbehandlung): Alle sieben Kürzel verlangen **Alt + Umschalt** und brechen ohne beide Zusatztasten sofort ab. Das Kriterium betrifft ausschließlich Kürzel aus einem einzelnen Zeichen ohne Zusatztaste — solche gibt es hier nicht |
| 2.2.1 Zeitliche Einstellbarkeit | A | **erfüllt** | die Ein-Minuten-Frist war ein Zeitlimit ohne Verlängerung und ist entfernt |
| 2.2.2 Pausieren, Stoppen, Ausblenden | A | plausibel | `prefers-reduced-motion` schaltet Animationen global ab |
| 2.3.1 Blitzen | A | erfüllt | keine blinkenden Inhalte |
| 2.4.1 Blöcke umgehen | A | **erfüllt** | Sprunglink „Zum Hauptinhalt springen" vorhanden, Ziel existiert. Siehe Einschränkung zu 1.3.1 |
| 2.4.2 Seite mit Titel | A | erfüllt | „RV Monatsreport – Barrierefrei" |
| 2.4.3 Fokus-Reihenfolge | A | **erfüllt** | seit 2026-09-02 geprüft: Der Tabulator läuft in allen elf Ansichten in Dokumentreihenfolge vorwärts, mit genau einem Rückschritt je Runde — dem Umlauf. Mehrere Rückschritte wären eine Umsortierung, in der Praxis ein positives `tabindex`. **Was das nicht sagt:** ob die Reihenfolge *sinnvoll* ist. Dokumentreihenfolge ist notwendig, nicht hinreichend; ob das Vorgelesene trägt, entscheidet der Screenreader-Durchlauf |
| 2.4.4 Linkzweck | A | plausibel | die Anwendung arbeitet fast ausschließlich mit Schaltflächen |
| 2.4.5 Mehrere Wege | AA | n. a. | Einzelseiten-Anwendung ohne Seitensammlung; Navigation und Suche vorhanden |
| 2.4.6 Überschriften und Beschriftungen | AA | plausibel | |
| 2.4.7 Fokus sichtbar | AA | **erfüllt** | globaler Fokusring: 3 px Umriss plus 7 px Hof, in allen vier Themes definiert, in den Kontrastschemata deckend statt transparent |
| 2.5.1 Zeigergesten | A | **erfüllt** | mit dem Nachweis zu 2.5.7 abgedeckt |
| 2.5.2 Zeigerabbruch | A | **erfüllt** | seit 2026-09-02 im Prüflauf: Der gesamte `src`-Baum enthält **keinen einzigen** `onMouseDown`, `onPointerDown` oder `onTouchStart`. Jede Aktion läuft über `onClick`, also beim Loslassen. Geprüft am Quelltext, weil es eine Eigenschaft des Codes ist — ein Browsertest müsste jede Taste einzeln antippen. Für diese Zielgruppe zählt das Kriterium besonders: Wer die Bedienelemente nicht genau sieht, tippt daneben und zieht den Finger weg, statt loszulassen |
| 2.5.3 Beschriftung im Namen | A | **erfüllt** | seit 0.9.22 im Prüftor über alle Ansichten und Zustände: Ein `aria-label`, das die sichtbare Aufschrift **ersetzt** statt sie zu enthalten, lässt den Lauf scheitern. **Zehn Verstöße beim ersten Lauf gefunden und behoben.** Für diese Zielgruppe zählt das doppelt: Wer per Sprachsteuerung sagt, was er liest, trifft sonst nichts |
| 2.5.4 Bewegungsaktivierung | A | n. a. | keine Bewegungssteuerung |

### 5.3 Verständlichkeit

| Kriterium | Stufe | Stand | Anmerkung |
|---|---|---|---|
| 3.1.1 Sprache der Seite | A | **erfüllt** | `<html lang="de">`, Manifest `"lang": "de"` |
| 3.1.2 Sprache von Teilen | AA | **teilweise** | durchgehend deutsch; einzelne englische Fachwörter (Sync, Backup) sind nicht ausgezeichnet |
| 3.2.1 Bei Fokus | A | plausibel | kein Kontextwechsel bei Fokussierung bekannt |
| 3.2.2 Bei Eingabe | A | plausibel | |
| 3.2.3 Konsistente Navigation | AA | **erfüllt** | mit dem Nachweis zu 3.2.6 belegt |
| 3.2.4 Konsistente Bezeichnung | AA | plausibel | |
| 3.3.1 Fehlererkennung | A | **erfüllt** | seit 2026-09-02 geprüft, indem der Fehler ausgelöst wird: Verschlüsselung einschalten, zu kurzes Passwort eingeben, sichern. Die Meldung erscheint in einem `role="alert"` mit `aria-live="assertive"`, benennt das betroffene Feld und beschreibt den Fehler in Text — ohne dass der Fokus wechseln muss |
| 3.3.2 Beschriftungen oder Anweisungen | A | plausibel | Zählerfelder tragen `aria-label` und eine `sr-only`-Bedienanleitung |
| 3.3.3 Fehlerempfehlung | AA | **erfüllt** | dieselbe Prüfung: Die Meldung nennt nicht nur den Fehler, sondern die Korrektur („mindestens 4 Zeichen"). Auch beim Einspielen eines verschlüsselten Backups ohne Passwort steht die Handlungsanweisung im Text, nicht nur die Feststellung |
| 3.3.4 Fehlervermeidung | AA | **erfüllt** | Vor jedem zerstörenden Vorgang steht eine Rückfrage; der Monatsabschluss lässt sich zusätzlich mit einem Tipp zurücknehmen. Archivschreibungen laufen über einen Pfad mit sichtbarer Fehlermeldung statt stillem Verlust. **Seit 0.9.32 sind alle sechs Rückfragen einzeln gemessen** — Geometrie, Kontrast, Beschriftung und Tastaturbedienung. Das war nötig: Der Startfokus liegt bewusst auf „Abbrechen", damit ein versehentliches Enter nichts löscht, und genau das war bei zwei Rückfragen nicht der Fall. Ebenfalls behoben: Escape brach die Rückfrage **und** die Ansicht dahinter ab — im Geräteabgleich verfiel dabei das bereits empfangene Paket, sodass ein „Nein" zum Ersetzen die ganze Übertragung kostete |

### 5.4 Robustheit

| Kriterium | Stufe | Stand | Anmerkung |
|---|---|---|---|
| 4.1.1 Parsing | A | entfällt | in WCAG 2.2 gestrichen; das DOM wird von React erzeugt |
| 4.1.2 Name, Rolle, Wert | A | **teilweise** | axe deckt einen großen Teil; Zählerfelder tragen `role="spinbutton"` mit `aria-valuenow` / `aria-valuetext` |
| 4.1.3 Statusmeldungen | AA | **erfüllt** | alle Rückmeldungen laufen über einen zentralen Weg in eine ARIA-Live-Region, wahlweise zusätzlich als Sprachausgabe |

---

## 6. Zusammenfassung

Ausgezählt über Abschnitt 4 und 5:

| | Anzahl | davon |
|---|---|---|
| **erfüllt, mit Beleg** | **31** | 26 aus WCAG 2.1 A/AA, 5 aus WCAG 2.2 |
| teilweise erfüllt | 4 | 1.3.1, 1.4.11, 3.1.2, 4.1.2 |
| plausibel, ohne Einzelnachweis | 10 | |
| **nicht erfüllt** | **0** | 2.4.12 ist bewusst offen, aber Stufe AAA und damit außerhalb des Maßstabs |
| **nicht geprüft** | **2** | 1.3.2 und 1.3.3 — bedeutungstragende Reihenfolge und sensorische Eigenschaften. Beide entscheidet ein Mensch, kein Prüflauf |
| nicht anwendbar | 9 | 1.2.1–1.2.5, 2.4.5, 2.5.4, 3.3.8, 3.3.9 |
| entfällt | 1 | 4.1.1 (in WCAG 2.2 gestrichen) |

**Die aussagekräftigste Zahl steht in der Mitte:** 14 von 50 Kriterien des
geltenden Sockels sind zwar nicht beanstandet, aber auch nicht einzeln
nachgewiesen. Sie sind kein Mangel — aber sie sind auch kein Nachweis.

Der Verlauf dieser Zahl ist aussagekräftiger als ihr Wert: **19** am Morgen
des 2026-09-02, **16** am Abend (die drei Tastatur-Kriterien wurden belegt),
**14** mit 0.9.32 (2.5.3 und 3.3.4 sind vom Wort auf die Messung gewechselt).
Jeder dieser Schritte hat beim ersten Lauf echte Verstöße gefunden — zehn bei
2.5.3, zwei bei 3.3.4. Das ist das Argument gegen die Zwischenkategorie
„plausibel": Sie hat sich noch nie als leer erwiesen.

### Die Lücken, nach Gewicht

**Dieser Bericht belegt keinen Verstoß auf AA-Ebene.** Was er belegt, ist
etwas anderes: wie viel nicht geprüft ist.

1. **Der Screenreader-Durchlauf ist zehn Fassungen alt.** Er fand auf 0.9.22
   statt; bewertet wird 0.9.32. Dazwischen sind die Rückfragen umgebaut
   worden — und zwar, weil bei zweien von fünf der Fokus gar nicht im Dialog
   ankam. Die Korrektur ist gemessen, aber nicht gehört. **Das ist die
   größte Lücke dieses Berichts**, und sie ist von hier aus nicht zu
   schließen; Einzelheiten in 3.3.
2. **Ob die Fokus-Reihenfolge *sinnvoll* ist**, weiß weiterhin niemand. Dass
   sie der Dokumentreihenfolge folgt, ist belegt — das ist die notwendige
   Bedingung. Die hinreichende beurteilt ein Mensch mit Screenreader.
3. ~~**Der Einrichtungsassistent, die Bestätigungsdialoge und die
   Kamerawege**~~ — **geschlossen** (0.9.27 und 0.9.32), siehe 3.2 Punkt 5.
   Übrig bleibt die Einschränkung aus 3.2 Punkt 6: Eine gestellte Kamera ist
   kein Telefon in der Hand.
4. **TalkBack ungeprüft**, mit sachlichem Grund (siehe 3.3).
5. **1.3.2 und 1.3.3** sind nicht erhoben — bedeutungstragende Reihenfolge und
   sensorische Eigenschaften. Beides ist keine Messfrage: Ob die
   Vorlesereihenfolge Sinn ergibt und ob Anweisungen ohne Farbe, Form oder
   Position verständlich bleiben, beurteilt ein Mensch. Sie sind damit
   dieselbe Klasse wie Punkt 2.

~~**Fokus-Reihenfolge und Tastaturdurchlauf nie systematisch geprüft**~~ —
**geschlossen am 2026-09-02.** Der Tabulator-Durchlauf prüft jetzt alle elf
Ansichten mit echten Tastendrücken. Er hat dabei zwei echte Verstöße gefunden:
den nicht fokussierbaren Inhaltsbereich der Hilfe und eine Fokusfalle im
Jahreskonto, das gar kein modaler Dialog ist. Beide behoben.

~~**Kontrast in den drei weiteren Themes**~~ — **geschlossen am 2026-09-02.**
Die Prüfung ist um die Theme-Achse erweitert (30 zusätzliche Prüfungen,
Laufzeit 1,8 → 2,8 min). **Ergebnis: kein einziger Kontrastverstoß** in den
drei Schemata über alle fünf Ansichten und beide Geräteprofile. Damit ist
belegt, was zuvor nur plausibel war — die Umstellung auf Theme-Variablen in
0.9.9/0.9.10 hält.

### Ein Hinweis zur Entstehung dieses Berichts

Die erste Fassung führte 1.3.5 als belegten Verstoß auf, mit der Begründung,
im Quelltext existiere kein einziges `autocomplete`-Attribut. Das war falsch:
Die Suche lief in Kleinschreibung, JSX schreibt `autoComplete`. Beide
Namensfelder tragen das Attribut seit jeher.

Der Fehler steht hier, weil er die Methode dieses Berichts betrifft. Eine
Suche, die nichts findet, ist kein Nachweis — sie ist erst einer, wenn geprüft
wurde, dass sie überhaupt hätte finden können. Dasselbe gilt für jeden grünen
Prüflauf in Abschnitt 3.

---

## 7. Rechtlicher Rahmen — ausdrücklich kein Rechtsrat

Das BFSG richtet sich an das Geschäft mit Verbrauchern; ein internes Werkzeug
für die eigenen Außendienstmitarbeiter fällt nach heutigem Stand vermutlich
nicht darunter. Für Arbeitsmittel von Beschäftigten mit Behinderung bestehen
davon unabhängig Pflichten des Arbeitgebers (SGB IX). Ob und wie das hier
greift, gehört zur Personal- oder Rechtsabteilung.

Unabhängig von der Rechtsfrage ist EN 301 549 der Maßstab, den eine Prüfung
anlegen wird. Was dieses Projekt liefern kann, ist der belegte Stand — dieses
Dokument.

Da die Anwendung mit der Stempeluhr Arbeitszeiten erfasst, berührt ein
verbindlicher Einsatz typischerweise die Mitbestimmung nach § 87 BetrVG. Auch
das ist keine Rechtsauskunft, sondern ein Hinweis auf einen Beteiligten, der
vor einem Rollout gefragt sein will.

---

## 8. Fortschreibung

Dieses Dokument ist nur so viel wert wie seine Aktualität. Es gehört
fortgeschrieben, wenn:

- ein Kriterium von „nicht geprüft" auf einen belegten Stand wechselt,
- das Prüftor erweitert wird (dann ändert sich Abschnitt 3),
- EN 301 549 V4.1.0 im Amtsblatt genannt wird — angekündigt für den
  **23. Oktober 2026**; ab dann ist WCAG 2.2 AA der Maßstab, und Abschnitt 4
  wandert in Abschnitt 5,
- der Screenreader-Durchlauf wiederholt wird oder Befunde liefert.


---

## Was sich zwischen 0.9.19 und 0.9.32 geändert hat

**Diese Liste war bis zum 2026-09-12 ein Nachtrag zu einem Bericht, der für
0.9.19 galt.** Sie ist es nicht mehr: Der Bericht oben ist für 0.9.32 neu
erhoben, und die Kriterien tragen den Stand von heute. Die Liste bleibt
trotzdem stehen — als Beleg dafür, *wie* die Kriterien ihren Stand bekommen
haben, und weil ein Konformitätsbericht ohne Herkunft seiner Zahlen nur eine
Behauptung ist.

| Kriterium | Änderung seit 0.9.19 |
|---|---|
| **1.4.3 Kontrast** | Die Bestätigungstaste aller vier zerstörenden Rückfragen stand in „Weiß auf Schwarz" bei **1,00:1** und in „Gelb auf Schwarz" bei ~1,07:1 — sie war unsichtbar. Behoben (21,00:1 bzw. 19,56:1), zwei weitere unsichtbare Symbole ebenfalls. Über vier Schemata nachgemessen. |
| **1.4.1 Ohne Farbe** | Die Kurven der RV Analyse standen auf festen Hex-Werten, die Legende auf Theme-Variablen; im Hochkontrast war die Zuordnung zerrissen. Jetzt gleiche Quelle **und** unterscheidbare Strichmuster. |
| **2.1.2 Keine Tastaturfalle** | In „Formularfelder verwalten" hielt ein Tab-Umlauf den Fokus fest. Behoben. Die Ansicht war zuvor von **keiner** automatischen Prüfung erreicht worden. |
| **2.5.3 Label in Name** | Zehn Bedienelemente trugen ein `aria-label`, das die sichtbare Beschriftung ersetzte. Alle behoben; eine eigene Prüfung setzt das jetzt über alle Ansichten durch. |
| **2.5.5 Trefferfläche (AAA)** | Die ±5-Tasten des Zählers sind entfernt. Damit entfällt die **einzige** Ausnahme, die die App in Anspruch nahm; das Prüfgate kennt nur noch eine Schwelle von 44 px. |
| **4.1.3 Statusmeldungen** | Der Bereichswechsel per Wischen erfolgte stumm; jetzt wird er angesagt. Ein Lesefehler beim Start meldet sich mit `role="alert"` und Ansage, statt still einen leeren Stand anzuzeigen. |
| **1.4.10 Reflow** (0.9.29–0.9.31) | Drei weitere Fälle von `min-width: auto` an Flex-Elementen gefunden und behoben, zuletzt das Abzeichen „Live verbunden" im Kopfbereich: **385 px Inhalt in einem 360-px-Fenster**, 384 in einem 320-px-Fenster. Es erscheint nur bei bestehender Live-Verbindung — deshalb hatte es nie jemand gesehen. |
| **2.5.5 Trefferfläche** (0.9.29–0.9.31) | Eine Löschtaste je Schicht mit **32 × 32 px**, der Umschalter des Schicht-Protokolls mit 36 px, das Abzeichen „Live verbunden" mit **42 px**. Alle drei lagen in Zuständen, die keine Prüfung je hergestellt hatte. |
| **2.1.1 / 2.4.3 Tastatur und Fokus** (0.9.32) | Vier der elf Ansichten warfen den Fokus bei **jedem** App-Render zurück auf ihre Schließen-Taste; eine Ansage genügte als Auslöser. In zwei Rückfragen kam der Fokus gar nicht erst im Dialog an, und der Tabulator lief durch die Seite dahinter. Beides behoben und im Prüftor festgehalten. |
| **3.3.4 Fehlervermeidung** (0.9.32) | Escape brach die Rückfrage **und** die Ansicht dahinter ab. Im Geräteabgleich verfiel dabei das bereits empfangene Paket — ein „Nein" zum Ersetzen kostete die ganze Übertragung. |
| **Prüfumfang** | 63 → **825 angemeldete Oberflächenprüfungen** (418 ausgeführt), Funktionsprüfungen 121 → **162**. |

**Nicht bestätigt, unverändert:** ob der Geräteabgleich (Kopplung, QR- und
Textcode, Zusammenführen) Teil der Screenreader-Durchläufe war.

**Was diese Liste über die Arbeitsweise sagt**, und warum sie hier steht statt
in einem Änderungsprotokoll: **Fast jeder Eintrag ist beim ersten Lauf einer
neuen Prüfung entstanden, nicht durch einen Fehlerbericht.** Kein Nutzer hat
das Abzeichen bei 385 px gemeldet, niemand die 32-px-Löschtaste, niemand die
unsichtbare Bestätigungstaste. Sie lagen alle in Zuständen, die zwar
erreichbar waren, aber nie hergestellt wurden.

Das ist der Grund, warum dieser Bericht Prüfumfang und Kriterienstand
zusammen ausweist. Ein Kriterium gilt hier nur so weit als erfüllt, wie der
Zustand, in dem es gemessen wurde, auch wirklich vorkam.
