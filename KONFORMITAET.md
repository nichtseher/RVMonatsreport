# Konformitätsbericht — RV Monatsreport („RV Mobil")

| | |
|---|---|
| **Stand** | 2026-09-02 |
| **Geprüfte Fassung** | 0.9.19, Commit `3a7d91d` |
| **Maßstab** | EN 301 549 V3.2.1 (2021-03), Abschnitt 9 → WCAG 2.1 Stufe A und AA |
| **Zusätzlich dokumentiert** | die neun Erfolgskriterien aus WCAG 2.2, die der Entwurf EN 301 549 V4.1.0 aufnimmt |
| **Art des Dokuments** | technische Selbstauskunft |

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

Im Deploy-Tor vor jedem Bauen (`npm run check:ui`, 63 Prüfungen, drei
Geräteprofile: 360 × 780 Chromium, 360 × 780 WebKit, 1280 × 900 Chromium):

| Prüfung | Deckung |
|---|---|
| Waagerechter Überlauf | fünf Ansichten × drei Schriftgrößen × drei Profile, inkl. Containern mit `overflow-x: auto`, die für die Seitenprüfung unsichtbar bleiben |
| Trefferflächen | dieselbe Matrix; 43,5 px für alles im Tab-Lauf, 24 px für ausdrücklich ausgenommene Elemente |
| axe-core | fünf Ansichten, Regelsätze `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` |
| Kontrast je Farbschema | fünf Ansichten × drei weitere Schemata (dunkel, Kontrast dunkel, Kontrast gelb) × zwei Profile, Regel `color-contrast`. Jede Prüfung weist zuvor nach, dass das Schema wirklich anliegt (`data-theme` **und** `data-dark`) und dass axe die Regel überhaupt ausgeführt hat |
| Ansichten hinter den Einstiegen | die sechs Ansichten, die nicht über `?tab=` erreichbar sind (Formular anpassen, Geräte-Sync, Datensicherung, Hilfe, Jahreskonto, Was gibt's Neues): Überlauf und Trefferflächen bei „normal" und „Extra groß" in drei Profilen, axe in zwei |
| Tabulator-Durchlauf | alle elf Ansichten, mit **echten Tastendrücken**: Erreichbarkeit jedes sichtbaren Bedienelements, Reihenfolge in Dokumentordnung, geschlossene Runde. Modale Dialoge werden erkannt und ihre Fokusfalle als richtig gewertet |
| Breitere Schrift als hier installiert | alle elf Ansichten bei „Extra groß" mit erzwungener Verdana bzw. DejaVu Sans — stellt nach, dass der Schriftstapel je nach Gerät ein anderes Glied greift |
| Medienabfrage `pointer: coarse` | Nachweis, dass die Touch-Zweige im Prüflauf wirklich greifen |

### 3.2 Die Grenzen dieser Automatisierung — vollständig benannt

Diese Liste ist der wichtigste Teil des Berichts. Wer den grünen Lauf ohne sie
liest, liest ihn falsch:

1. **axe findet einen Teil der WCAG-Verstöße, nie alle.** Ein grüner Lauf ist
   keine Konformitätsaussage. Das gilt unabhängig von der Konfiguration.
2. **Nur `critical` und `serious` lassen die Prüfung scheitern.** Befunde der
   Stufen `moderate` und `minor` werden herausgefiltert und fallen nicht auf.
3. **Der vollständige axe-Durchlauf läuft nur im Standardtheme.** Seit dem
   2026-09-02 tritt daneben eine eigene Kontrastprüfung für die drei weiteren
   Farbschemata (30 Prüfungen). Alle anderen axe-Regeln — Beschriftungen,
   Rollen, Struktur — werden weiterhin nur im Standardschema geprüft; das ist
   vertretbar, weil sie nicht am Farbschema hängen, aber es ist eine Annahme
   und keine Messung.
   **Alle Kontrastprüfungen laufen bei Schriftgröße „normal".** Das ist der
   strengere Fall: axe wendet die WCAG-Ausnahme für großen Text an (3:1 statt
   4,5:1), sobald die berechnete Schriftgröße es hergibt — die größeren
   Stufen sind also die leichteren.
4. **Regeln der Kategorie „best practice" laufen nicht mit**, weil nur
   WCAG-Regelsätze aktiviert sind. Landmarkenstruktur fällt darunter.
5. **Was an Klickfolgen hängt, ist nur teilweise abgedeckt.** Die sechs
   Ansichten hinter den Einstiegen laufen seit dem 2026-09-02 mit. **Nicht**
   abgedeckt bleiben der Einrichtungsassistent, die Bestätigungsdialoge
   (`ConfirmDialog`) und die Kamerawege des Geräteabgleichs — sie setzen einen
   Zustand oder ein Gerät voraus, das der Prüflauf nicht herstellt.

   Der Punkt stand hier zuvor als „Modaldialoge nicht abgedeckt". Das war
   ungenau: `ManageModal`, `HistoryModal`, `StatsModal` und `TimeModal` sind
   trotz ihrer Namen **keine Dialoge**, sondern vollwertige Ansichten. Der
   blinde Fleck war größer als beschrieben — sechs von elf Ansichten — und ist
   jetzt kleiner als beschrieben.
6. **Die Tabulatorreihenfolge selbst ist nicht geprüft.** Die Messung zu
   2.4.11 hat mit `element.focus()` gearbeitet, nicht mit der echten
   Tabulatortaste; beide lösen dieselbe Bildlauflogik aus, die Reihenfolge
   prüft das nicht.

### 3.3 Screenreader-Durchlauf

**NVDA (PC) und VoiceOver (iOS) sind am 2026-09-02 ohne Befund durchgelaufen**
— nach Rückmeldung des Projektinhabers. Diese Angabe ist **nicht von den
Entwicklungswerkzeugen nachvollzogen**: kein eingesehenes Protokoll, keine
Aufzeichnung. Sie steht hier als das, was sie ist, eine Fremdauskunft.

**TalkBack (Android) ist ungeprüft** — und zwar aus einem sachlichen Grund:
Die blinden Kollegen nutzen ausschließlich iPhones. Die Plattform ist mit der
tatsächlichen Zielgruppe nicht prüfbar; ein sehender Durchlauf erfüllte den
selbst gesetzten Maßstab nicht. **Ungeprüft, nicht erfüllt.**

**Nicht bestätigt:** ob der Geräteabgleich (Kopplung, QR- und Textcode,
Zusammenführen) Teil dieser Durchläufe war. Das ist der Teil der Anwendung,
der zuletzt umgebaut wurde.

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
| 2.5.5 Target Size (Enhanced), 44 × 44 px | **AAA** | **erfüllt für alles im Tab-Lauf**, seit 2026-09-02 im Prüftor abgesichert (gemessen gegen 43,5 px wegen Renderfaktor 0,99993). Die `±5`-Schnelltasten liegen darunter und laufen unter der Gleichwertigkeitsausnahme: `aria-hidden`, außerhalb des Tab-Laufs, Funktion vollständig über `±1` und das Zahlenfeld erreichbar |

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
| 1.4.3 Kontrast (Minimum) | AA | **erfüllt** | fortlaufend geprüft in **allen vier Farbschemata** über fünf Ansichten und zwei Geräteprofile (seit 2026-09-02, 30 zusätzliche Prüfungen; zuvor nur im Standardschema). Zwei echte Verstöße wurden so gefunden und behoben (Fußzeile 4,41:1, Seitenleiste **3,59:1**). Offen bleibt die allgemeine Einschränkung: Dialoge sind nicht automatisiert erfasst |
| 1.4.4 Textgröße ändern | AA | **erfüllt** | drei Schriftstufen (100 / 125 / 150 %) über alle Ansichten und Profile automatisiert; Browser-Zoom auf 200 % ist **nicht** gesondert geprüft |
| 1.4.5 Bilder eines Textes | AA | erfüllt | keine Texte als Bild |
| 1.4.10 Reflow | AA | **erfüllt** | 360 px × drei Schriftgrößen × fünf Ansichten × drei Profile, einschließlich verdeckten Überlaufs in scrollbaren Containern; seit 2026-09-02 zusätzlich die sechs Ansichten hinter den Einstiegen. **Vier Fälle gefunden und behoben**, zwei davon erst durch die Erweiterung: das Jahreskonto schob bei „Extra groß" 456 px Inhalt in ein 360-px-Fenster, und in der Hilfe brachen lange Komposita nicht um |
| 1.4.11 Kontrast von Nicht-Text | AA | **teilweise** | Rahmenfarben gezielt gemessen: 3,24:1 gegen die Karte, 3,10:1 gegen den Grund, im dunklen Schema 3,09:1. Nicht für alle Bedienelemente einzeln nachgewiesen |
| 1.4.12 Textabstand | AA | **nicht geprüft** | nicht getestet, ob erzwungene Abstände den Inhalt beschädigen. Die Bestandsaufnahme fand 7 verschiedene `letter-spacing`-Werte auf 55 Elementen, vier davon negativ |
| 1.4.13 Inhalt bei Hover oder Fokus | AA | **nicht geprüft** | Vorgeschichte: Tooltips waren als `title`-Attribut auf SVG-Elementen umgesetzt und haben nie funktioniert (gefunden 0.9.13) |

### 5.2 Bedienbarkeit

| Kriterium | Stufe | Stand | Anmerkung |
|---|---|---|---|
| 2.1.1 Tastatur | A | **erfüllt** | seit 2026-09-02 mit **echten Tastendrücken** über alle elf Ansichten geprüft: Jedes sichtbare, nicht ausgenommene Bedienelement wird vom Tabulator erreicht. **Zwei echte Verstöße dabei gefunden und behoben:** der Inhaltsbereich der Hilfe war scrollbar, aber weder fokussierbar noch mit fokussierbarem Inhalt (axe `scrollable-region-focusable`); und das Jahreskonto hatte eine Fokusfalle, obwohl es kein modaler Dialog ist — die sichtbare Navigationsleiste war dort per Tastatur unerreichbar. Die `±5`-Tasten bleiben bewusst außerhalb des Tab-Laufs, gleichwertig erreichbar |
| 2.1.2 Keine Tastaturfalle | A | **erfüllt** | der Durchlauf schließt in jeder Ansicht die Runde, statt hängen zu bleiben; Dialoge sind zusätzlich mit Escape verlassbar. Die Fokusfalle des Geräteabgleichs bleibt — dort ist sie richtig, weil es ein echtes Overlay mit abgedunkeltem Hintergrund und `aria-modal="true"` ist |
| 2.1.4 Zeichentasten-Kurzbefehle | A | **nicht geprüft** | die Anwendung kennt Tastenkürzel; ob es Einzelzeichen ohne Zusatztaste sind, ist nicht erhoben |
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
| 2.5.2 Zeigerabbruch | A | nicht geprüft | |
| 2.5.3 Beschriftung im Namen | A | plausibel | als Regel verankert, nicht systematisch geprüft |
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
| 3.3.1 Fehlererkennung | A | **nicht geprüft** | |
| 3.3.2 Beschriftungen oder Anweisungen | A | plausibel | Zählerfelder tragen `aria-label` und eine `sr-only`-Bedienanleitung |
| 3.3.3 Fehlerempfehlung | AA | **nicht geprüft** | |
| 3.3.4 Fehlervermeidung | AA | plausibel | Bestätigungsdialoge vor Löschvorgängen; Archivschreibungen laufen über einen Pfad mit sichtbarer Fehlermeldung statt stillem Verlust |

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
| **erfüllt, mit Beleg** | **23** | 18 aus WCAG 2.1 A/AA, 5 aus WCAG 2.2 |
| teilweise erfüllt | 4 | 1.3.1, 1.4.11, 3.1.2, 4.1.2 |
| plausibel, ohne Einzelnachweis | 12 | |
| **nicht erfüllt** | **0** | 2.4.12 ist bewusst offen, aber Stufe AAA und damit außerhalb des Maßstabs |
| **nicht geprüft** | **8** | 1.3.2, 1.3.3, 1.4.12, 1.4.13, 2.1.4, 2.5.2, 3.3.1, 3.3.3 |
| nicht anwendbar | 9 | 1.2.1–1.2.5, 2.4.5, 2.5.4, 3.3.8, 3.3.9 |
| entfällt | 1 | 4.1.1 (in WCAG 2.2 gestrichen) |

**Die aussagekräftigste Zahl steht in der Mitte:** 16 von 50 Kriterien des
geltenden Sockels sind zwar nicht beanstandet, aber auch nicht einzeln
nachgewiesen. Sie sind kein Mangel — aber sie sind auch kein Nachweis. (Am
Morgen des 2026-09-02 waren es noch 19; die drei Tastatur-Kriterien sind
seither belegt statt plausibel.)

### Die Lücken, nach Gewicht

**Dieser Bericht belegt keinen Verstoß auf AA-Ebene.** Was er belegt, ist
etwas anderes: wie viel nicht geprüft ist.

1. **Ob die Fokus-Reihenfolge *sinnvoll* ist**, weiß weiterhin niemand. Dass
   sie der Dokumentreihenfolge folgt, ist seit dem 2026-09-02 belegt — das ist
   die notwendige Bedingung. Die hinreichende beurteilt ein Mensch mit
   Screenreader.
2. **Der Einrichtungsassistent, die Bestätigungsdialoge und die Kamerawege**
   sind automatisiert nicht abgedeckt; sie setzen einen Zustand oder ein Gerät
   voraus, das der Prüflauf nicht herstellt.
3. **TalkBack ungeprüft**, mit sachlichem Grund (siehe 3.3).
4. **1.4.12, 1.4.13, 2.1.4, 2.5.2, 3.3.1, 3.3.3** sind nicht erhoben.

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
