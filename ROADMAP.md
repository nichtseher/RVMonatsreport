# Roadmap — RV Monatsreport (RV Mobil)

Stand: 2026-08-31, Version 0.9.18 (0.9.16 bis 0.9.18 sind veröffentlicht)

Diese Roadmap ist aus **gemessenen Befunden** entstanden, nicht aus Vermutungen.
Wo eine Zahl steht, wurde sie nachgemessen. Punkte ohne Beleg sind als
Einschätzung gekennzeichnet, und wo etwas nicht prüfbar war, steht das da.

Leitplanken, die für jeden Punkt gelten:
- **Serverlos bleibt Pflicht** (DSGVO-Zusage der App). Kein Backend, keine
  externen Dienste, keine Fremd-Schriften.
- **Barrierefreiheit ist Kernanforderung**, kein Zusatz. Nichts wird
  eingebaut, das für Screenreader-Nutzer einen Rückschritt bedeutet.
- **Stabilität vor Funktionsumfang.** Die App wird im Außendienst benutzt;
  ein Datenverlust wiegt schwerer als ein fehlendes Feature.

---

## Was erledigt ist

Die ausführlichen Messprotokolle stehen im [DEVLOG](DEVLOG.md). Hier nur das
Ergebnis, damit diese Datei nach vorn zeigt statt nach hinten.

| Version | Ergebnis (gemessen) |
|---|---|
| 0.8.0 | Kopfbereich 383 → **182 px** bei 360 px Gerätebreite. Schnell-Tasten ohne Scrollen sichtbar: 0 von 6 → **6 von 6**. Waagerechter Überlauf beseitigt. Einstieg bei Erstnutzung. |
| 0.9.0 | Zähler-Tastenreihe ragte bei „Extra groß" 163 px aus dem Bildschirm → **vollständig sichtbar**. Bedienelemente unter 44 × 44 px: 56 → **0**. Rückfrage und Rückgängig beim Monatsabschluss. Excel-Export aus Formular und Archiv erzeugen dieselbe Datei. |
| 0.9.4 | `npm run check` eingeführt (37 Fälle, ohne Test-Framework). Deploy-Gate prüft `lint`, `check`, `audit` **vor** dem Bauen. Prüfung auf doppelt kodierte Zeichen — der Fehler, der 0.7.0 unbemerkt live ging. |
| 0.9.5 | Sync-Bereich vollständig geprüft. `pruefeSyncPaket()` prüft jetzt jedes eingehende Paket. „Alles ersetzen" mit Rückfrage. Textcode wahlweise verschlüsselt (`RVC2:`, AES-GCM). 52 Prüfungen. |
| 0.9.11 | Excel-Export im Firmenformat. Die Originalvorlage wird eingebettet und befüllt, kein Nachbau. Dabei ein **fehlendes Feld** entdeckt („Vorführungen Envision", D22) — die Zeile wäre in jedem bisherigen Bericht leer geblieben. Export gemessen: 83–144 ms nach dem ersten Lauf. |
| 0.9.12 | Status je Monat im Archiv („Gesendet TT.MM.JJJJ" / „Noch offen") in der Kopfzeile. Eigener Zeitstempel `sentUpdatedAt`, damit eine spätere Zahleneingabe auf dem zweiten Gerät die Markierung nicht löscht. |
| 0.9.13 | `strict: true`. Die zunächst gemeldeten 3022 Fehler waren ein Messartefakt fehlender React-Typen — echt waren **57**. Zwei ungefundene Fehler kamen dabei ans Licht: ein nie funktionierender SVG-Tooltip und ein gelöschter Versandstatus beim Monatswechsel. |
| 0.9.14 / 0.9.15 | `App.tsx` **3.932 → 2.844 Zeilen**. Sechs Hooks, zehn Hilfsmodule. In jedem herausgelösten Block steckte eine ungeprüfte reine Funktion; eine davon (`verrechneSchicht`) enthielt einen echten Rundungsfehler. Prüfungen 91 → **121**. |

**Zwei Korrekturen an früheren Annahmen dieser Datei**, damit sie nicht
weiterwandern:
- „Monatsabschluss ist unumkehrbar" war falsch. Der Monat wandert vollständig
  ins Archiv und ist über die Monatsauswahl erreichbar. Die vorgeschlagene
  30-Tage-Aufbewahrung hätte ein Problem gelöst, das es nicht gibt.
- Die beiden „Offenen Fragen an den Auftraggeber" sind beantwortet: Die
  Excel-Vorlage kam mit 0.9.11, und der Deploy-Weg ist geklärt — der
  GitHub-Actions-Workflow bestimmt, was live ist, `npm run deploy` ist
  Ballast (siehe 0.9.20).

---

## 0.9.16 — Datenverlust verhindern — ERLEDIGT (2026-08-31)

Umgesetzt: `persist()` wird angefordert und ausgewertet, die Lage wird abgestuft
gemeldet und im kritischen Fall angesagt, es gibt eine eigene
Sicherungs-Erinnerung, und der Absturz-Bildschirm bietet die Rettung als Datei
an, **bevor** er das Löschen anbietet. Prüfungen **121 → 135**.

Die entscheidende Messung war nicht die Dateigröße, sondern ob sich die
Rettungsdatei überhaupt zurückholen lässt — eine, die niemand einlesen kann,
wäre keine. Im Browser gegen `pruefeSyncPaket()` geprüft, mit gefülltem Archiv:
Paket enthält `app, fmt, appFields, carryover, history, reportData` und wird
angenommen (`ok: true`).

**Ein Fehler dabei selbst eingebaut und gefunden:** Die zwei Knöpfe des neuen
Bands standen nebeneinander mit `whitespace-nowrap` und ergaben bei 360 px und
Schriftgröße „Extra groß" **411 px Scrollbreite** — gegengeprobt durch
Ausblenden des Bands: ohne es exakt 360 px. Behoben durch Stapeln.

**Und dabei denselben Fehler an einer alten Stelle gefunden:** Das Band
„Live-Verbindung unterbrochen" braucht bei „Extra groß" **390 px in einem
356 px breiten Band** — 34 px Überlauf. Sichtbar nur, wenn eine Live-Verbindung
tatsächlich abreißt, deshalb nie jemandem aufgefallen. Gleich mitbehoben.

| Schriftgröße | vorher | nachher |
|---|---|---|
| normal | 360 px | 360 px |
| groß | 360 px | 360 px |
| extra groß | **411 px** | **360 px** |

**Nicht geprüft:** die Sieben-Tage-Regel auf einem echten iPhone und der
kritische Zweig am Gerät — beides nur über die reine Funktion abgedeckt. Und
wie sich die Ansage mit NVDA oder VoiceOver anhört.

Der Befund, der dazu geführt hat:

### Der Speicher ist nie dauerhaft angefordert worden

`navigator.storage.persist()` kommt **im gesamten Projekt nicht vor** (geprüft,
kein Treffer). Damit liegt das Archiv in „best effort"-Speicher:

- **iOS Safari** löscht bei Seiten, die *nicht* zum Home-Bildschirm hinzugefügt
  wurden, den gesamten skriptbeschreibbaren Speicher nach **sieben Tagen** ohne
  Nutzung — IndexedDB, localStorage und Cache zusammen. Wer die App über ein
  Lesezeichen benutzt und zwei Wochen keinen Termin hat, findet einen leeren
  Monat vor.
- **Android/Chrome** räumt bei Speicherdruck ebenfalls auf.

Drei Lücken verstärken sich gegenseitig: kein `persist()`, **keine
Sicherungs-Erinnerung** (die Erinnerung am 8. betrifft die Abgabe an die VL,
nicht das Sichern — `App.tsx:1193`), und der Sync als Rettungsweg ist genau
der, den die blinden Kollegen nicht bedienen können.

Schritte:
1. `navigator.storage.persist()` beim Start anfordern und das Ergebnis
   auswerten.
2. Wurde es nicht gewährt oder läuft die App nicht installiert: **das sagen**,
   mit dem konkreten Hinweis, sie zum Home-Bildschirm hinzuzufügen. Angesagt,
   nicht nur angezeigt.
3. Eine echte **Sicherungs-Erinnerung**, getrennt von der Abgabe-Erinnerung,
   mit dem Datum der letzten Sicherung.
4. Auf einem echten iPhone nachmessen, was tatsächlich passiert. Die
   Sieben-Tage-Regel ist dokumentiertes Browser-Verhalten, aber die Wirkung im
   installierten Zustand gehört geprüft, nicht angenommen.

### Der Absturz-Bildschirm bietet nur einen Ausweg: alles löschen

`ErrorBoundary.tsx` hat zwei Knöpfe — „App neu laden" und „Kompletten Reset
durchführen", der `localStorage.clear()` und `clearIndexedDb()` ausführt. **Es
gibt keine Möglichkeit, die Daten vorher zu retten.** Wer in einer
Absturzschleife hängt, dem bleibt nur die Taste, die den Monat vernichtet — und
für einen blinden Nutzer ist es die einzige erreichbare.

Schritt: Ein Knopf **„Daten als Datei sichern"** über dem Reset, der direkt aus
IndexedDB liest, ohne den React-Zustand — der ist an dieser Stelle ja gerade
beschädigt. Erst danach darf der Reset überhaupt angeboten werden.

### Warum das vor dem Sync-Umbau kommt

Beides ist wenig Arbeit und verhindert den einen Fehler, von dem sich ein
Projekt wie dieses nicht erholt: Ein Kollege verliert einen kompletten Monat
und erzählt es weiter.

---

## 0.9.17 — Den Sync bedienbar machen — GRÖSSTENTEILS ERLEDIGT (2026-08-31)

**Die Messung aus Schritt 1 hat die Grundannahme widerlegt.** Im Text stand
„am besten innerhalb von einer Minute"; im Code gab es dafür keinen Beleg.
Nachgebaut wurde der echte Ablauf — A erzeugt ein Angebot, B die Antwort, und A
bekommt sie erst nach einer Wartezeit:

| Antwort eingesetzt nach | Ausgang |
|---|---|
| 117 s | **beide Seiten verbunden** |
| 180 s | **beide Seiten verbunden** |
| 300 s | ICE verbunden, aber `B.connectionState = failed` (DTLS abgelaufen) |

Das nutzbare Fenster liegt **zwischen drei und fünf Minuten**. Damit ist
`navigator.share()` keine Voraussetzung mehr, sondern Komfort — Schritt 8 ist
entwertet, nicht erledigt.

Nebenbei: Der Verbindungscode misst **670 Zeichen roh, 627 komprimiert**. Das
bestätigt die weiter unten verworfene Idee, die Codes zu kürzen — deflate
spart, base64 füllt es wieder auf.

**Vorbehalt:** gemessen mit zwei Gegenstellen im selben Browser auf demselben
Rechner. Und auf dem Handy kommt ein Effekt hinzu, den diese Messung nicht
erfassen kann: Wer die App verlässt, um den Code einzufügen, schickt sie in den
Hintergrund, wo das Betriebssystem sie anhalten darf. Gut möglich, dass die
erlebte „eine Minute" daher kam und nie eine ICE-Frist war.

**Umgesetzt:** Einfügefeld an erster Stelle (Lesereihenfolge nachgeprüft:
Beschriftung → Feld → „Code übernehmen" → Kameravorschau), Einfügen genügt
(`onPaste`), Beschriftungen nach dem Ziel statt nach der Technik, alle
Fristtexte entfernt, Backup-Import mit „Zusammenführen" als Standard. Kein
waagerechter Überlauf bei 360 px in allen drei Schriftgrößen.

**Bewusst nicht umgesetzt: Auto-Fokus im Einfügefeld.** Er würde auf dem Handy
die Bildschirmtastatur hochklappen und ausgerechnet die Kameravorschau
verdecken, die sehende Nutzer hier brauchen. Die erste Position in der
Lesereihenfolge genügt.

**Offen geblieben:** Die Kamera startet weiterhin von selbst (Schritt 2, zweite
Hälfte) — dafür fehlt eine Umgebung mit echter Kamera, in der sich Anhalten und
Wiederanlaufen prüfen lässt. Ebenso Schritt 4 (Gerät A wartet automatisch),
Schritt 6 (`regenerateAnswer` fokussieren) und Schritt 8.

Die ursprüngliche Analyse:

**Das ist der dringendste Punkt der ganzen Liste, und er ist neu.**
Rückmeldung aus dem Außendienst (2026-08-31): *Die blinden Kollegen können den
Geräte-Abgleich nicht nutzen, weil er zu komplex ist.* Gewünscht ist
ausdrücklich auch die Live-Verbindung — „damit man auch mal was am PC machen
kann und das Handy trotzdem aktuell ist".

Bei der Prüfung des Codes hat sich gezeigt: **es fehlt keine Funktion.** Der
kamerafreie Weg existiert in beide Richtungen — `startSend` erzeugt immer auch
einen Textcode, und `renderScannerView` enthält unter der Kameravorschau ein
Einfügefeld (`DeviceSyncModal.tsx:813`). Das Problem sind Reihenfolge und
Benennung. Das macht die Sache billig statt teuer.

### Was blockiert (jeweils am Code belegt)

| Befund | Stelle |
|---|---|
| „Daten empfangen" startet **ungefragt die Kamera**. Ein blinder Nutzer bekommt eine Berechtigungsabfrage und ein Livebild, das ihm nichts nützt. | `DeviceSyncModal.tsx:367` |
| Das Einfügefeld steht **unterhalb** von Kamerabild, Fortschrittsbalken und Hinweistext — in der Screenreader-Lesereihenfolge der vierte Block. | `DeviceSyncModal.tsx:813` |
| Der Knopf heißt „Dieses Gerät scannt mit der Kamera", die Abschnittsüberschrift „Einmal-Übertragung per QR-Code". Der kamerafreie Weg liegt **innerhalb** von etwas, das sich ausdrücklich „per QR-Code" nennt. Wer linear liest, überspringt ihn zu Recht. | `DeviceSyncModal.tsx:957–1043` |
| `navigator.share()` kommt in der Datei **nicht vor**. Jeder Code muss von Hand markiert, kopiert, in eine andere App gebracht und dort eingefügt werden. | geprüft, kein Treffer |
| Die **Backup-Datei kann nur ersetzen, nie zusammenführen**. Der Geräte-Sync bietet beide Wege, das Backup nicht. Ein Kollege, der seine Handy-Daten per Datei auf den PC bringt, löscht damit den PC-Stand. | `App.tsx:2567` gegen `App.tsx:2587` |
| Die „eine Minute" beim Antwort-Code ist **echt**, nicht bloß Text: Sobald Gerät B `setLocalDescription` gesetzt hat, läuft dessen ICE-Agent und die Verbindung scheitert nach einigen Zehnersekunden von selbst. | `DeviceSyncModal.tsx:622` |

### Die Einsicht, die den Umbau trägt

Es sind **zwei Produkte, und die Oberfläche zeigt eines.** Was die Kollegen
beschreiben, ist meistens *eine Übertragung am Ende* — ein Code, eine Richtung,
kein Zeitlimit, heute schon vollständig kamerafrei möglich. Die
Live-Verbindung braucht zwei Codes, zwei Richtungen und hat den Zeitdruck. Sie
ist der teure Sonderfall, den die Kollegen selbst mit „manchmal angenehmer"
beschrieben haben. Heute stehen beide als gleichrangige Knöpfe untereinander.

**Der häufige Fall muss trivial werden, der seltene bloß möglich.** Das kostet
keine Zeile Protokoll.

### Schritte

1. **Das ICE-Zeitfenster messen.** Die „eine Minute" ist eine Annahme; im Code
   gibt es keinen Beleg dafür. Sind es fünf Minuten, reicht die Umsortierung.
   Sind es dreißig Sekunden, ist die geteilte Zwischenablage Voraussetzung.
   **Dieser Schritt entscheidet den Rest und kommt zuerst.**
2. **Einfügefeld über die Kamera**, beim Öffnen fokussiert. Kamera erst auf
   ausdrückliche Anforderung starten.
3. **Einfügen genügt.** Ein gültiger Code wird beim `onPaste` erkannt und
   übernommen — kein Suchen nach „Code übernehmen". Genau dort verlieren
   Screenreader-Nutzer die Sekunden, die auf der Antwort-Strecke fehlen.
4. **Gerät A wartet automatisch**, während es seinen Code zeigt. Der
   Zwischenschritt „Antwort-Code empfangen" entfällt ersatzlos.
5. **Einstieg trennen:** „Auf anderes Gerät übertragen" (ohne Kamera, kein
   Zeitlimit) als erster Eintrag, „Live-Verbindung" darunter als Zusatz.
6. **`regenerateAnswer()` sichtbar machen.** Die Rettung bei abgelaufener
   Minute existiert bereits (`DeviceSyncModal.tsx:642`), muss aber beim
   Scheitern angesagt und fokussiert werden statt gesucht.
7. **Backup-Import bekommt „Zusammenführen oder Ersetzen".** `handleSyncImport`,
   `mergeSyncPayload` und `pruefeSyncPaket` existieren alle — es fehlt nur die
   Verdrahtung. Damit wird „Datei speichern → Datei öffnen" zur Rückfallebene
   ganz ohne Zeitdruck.
8. **`navigator.share()`** für Codes und Datei — nur, falls Schritt 1 zeigt,
   dass es nötig ist.

### Ziel, messbar

Der heutige Ablauf braucht **rund zwölf** einzelne Handlungen, davon zwei im
Kampf mit einer Kamera, die sich ungefragt einschaltet. **Sechs** sind ohne
jede Protokolländerung erreichbar. Das ist die Zahl, an der dieser Punkt
gemessen wird — nicht daran, ob er sich besser anfühlt.

### Ein Hebel, der uns nichts kostet

**Die geteilte Zwischenablage.** Android + Windows über „Telefonverknüpfung",
iPhone + Mac über die Universal-Zwischenablage. Damit schrumpft die kritische
Rückstrecke von Minuten auf Sekunden — ohne dass wir irgendetwas
programmieren. Das ist Geräteeinrichtung, einmal pro Kollege, und sollte vor
Schritt 8 geklärt werden.

### Geprüft und verworfen

- **Die Codes drastisch kürzen.** Technisch möglich (das SDP ist größtenteils
  Standardtext, den beide Seiten kennen — echte Nutzlast sind rund 70 Byte
  statt ~1000 Zeichen). **Bringt nichts:** Ob man 400 oder 110 Zeichen kopiert,
  ist dieselbe Geste. Kürzer würde erst zählen, wenn ein Code vorlesbar wäre,
  und dafür müsste er unter etwa 30 Zeichen — mit einem DTLS-Fingerabdruck
  darin nicht erreichbar.
- **Automatisches Wiederverbinden.** Nicht möglich. ICE-Zugangsdaten und Ports
  werden pro Verbindung neu erzeugt, und ein Browser gibt keine rohen Sockets
  heraus. Die Kopplung muss pro Sitzung neu gemacht werden; erreichbar ist
  nur, sie erträglich zu machen.
- **Ein einziger Code.** Die frühere Einschätzung dieser Datei stimmt. Nichts
  gefunden, was sie widerlegt.

---

## 0.9.18 — Ein Prüfnetz für die Barrierefreiheit — ERLEDIGT (2026-08-31)

`npm run check:ui` (Playwright + `@axe-core/playwright`) läuft im Deploy-Tor vor
dem Bauen: **48 Prüfungen, zwei Geräteprofile, rund 70 Sekunden.**

**Die Annahme dieser Datei war falsch.** Hier stand, die Touch-Zweige (`@media
(pointer: coarse)`) seien nicht prüfbar. Das gilt für ein verkleinertes
Browserfenster, nicht für Playwrights Geräte-Nachbildung: Mit `hasTouch` und
`isMobile` kippt die Medienabfrage wirklich. Nachgewiesen im Prüffall
`pruefe-medienabfrage`, nicht behauptet.

**Der erste Lauf fand sofort zwei echte Fehler** — beide dieselbe dekorative
Deckkraft auf ohnehin gedämpftem Text:

| Stelle | Kontrast | gefordert |
|---|---|---|
| Fußzeile (`opacity-80`) | 4,41:1 | 4,5:1 |
| Seitenleiste (`opacity-70`) | **3,59:1** | 4,5:1 |

In einer App für sehbehinderte Nutzer. Beide behoben.

**Und ein Falschbefund, der fast durchging:** Der erste Lauf meldete 9 von 30
Fehlschlägen, darunter Ansichten, die kurz zuvor von Hand auf exakt 360 px
gemessen worden waren. Ursache war der geteilte Dev-Server unter parallelen
Arbeitern, nicht das Layout — mit einem Arbeiter lief alles durch. Die
Konfiguration steht deshalb dauerhaft auf seriell.

**Nicht abgedeckt und bewusst so benannt:** axe findet einen Teil der
WCAG-Verstöße, nie alle. Ein grüner Lauf ist keine Konformitätsaussage. Kamera-
wege und Modaldialoge fehlen noch, weil beide Klickfolgen bräuchten.

Ursprüngliche Planung:

Das Deploy-Gate prüft heute `lint`, `check` und `audit`. Für ein Projekt,
dessen erklärte Kernanforderung Barrierefreiheit ist, ist ausgerechnet die
ungeprüft.

- **Playwright mit echter Geräteemulation.** Diese Datei hat bisher
  angenommen, die Touch-Zweige (`@media (pointer: coarse)`) seien nicht
  verifizierbar, weil ein verkleinertes Desktop-Fenster weiterhin
  `pointer: fine` meldet. Das gilt für das Browser-Fenster, aber nicht für
  Playwright: Bei Geräteemulation werden `hasTouch` und `isMobile` echt
  gesetzt, und damit kippt die Media Query. **Der Punkt, der hier als
  blockierend geführt wurde, ist zumindest teilweise automatisierbar.** Im
  ersten Lauf nachmessen, nicht behaupten.
- **`@axe-core/playwright` im Deploy-Gate.** Ehrliche Erwartung: axe findet
  einen Teil der WCAG-Verstöße, nicht alle. Es ersetzt keinen Screenreader-
  Durchlauf. Es fängt aber die Klasse Fehler ab, die beim Ändern still
  entsteht — fehlende Beschriftungen, Kontrast, kaputte Fokusreihenfolge.
- **Die Matrix automatisieren:** 360 px × drei Schriftgrößen × alle Ansichten
  und Dialoge, mit `scrollWidth`-Prüfung. Von Hand ist das kombinatorisch
  aussichtslos; genau deshalb ist es zweimal live gegangen.
- **WebKit-Lauf** als echte Engine — näher an iOS-Safari als alles, was
  bisher geprüft wurde.
- **Deploy-Bestätigung automatisieren** (GitHub-MCP-Server). Der Vorfall vom
  2026-08-08 — Push gemeldet, kein Workflow-Lauf erzeugt — ist bisher nur
  durch Handarbeit an der REST-API zu erkennen.

**Kein neues Test-Framework.** Nachgezählt: Von den dokumentierten
Produktionsfehlern — Doppelkodierung, verschlucktes `.catch`, zweimal
verlorenes `sentAt`, die Zeitstempel-Falle im Merge, der Rundungsfehler in
`verrechneSchicht` — wäre **kein einziger** von Unit-Tests gefunden worden. Die
121 Prüfungen decken die reinen Funktionen ab; die Lücke liegt eine Ebene
höher.

---

## 0.9.19 — WCAG 2.2 schließen — INHALTLICH ERLEDIGT (2026-09-01)

**Alle neun zusätzlichen Erfolgskriterien aus WCAG 2.2 sind abgearbeitet**:
sechs erfüllt und je einzeln nachgemessen, zwei nicht anwendbar (keine
Anmeldung), eines bewusst offen (2.4.12, Stufe AAA — war nie das Ziel). Zwei
davon waren echte Verstöße und sind behoben: 2.4.11 (neun verdeckte
Fokusstationen) und 2.5.8 (ein Schieberegler mit 6 px Trefferfläche).

**Was das ausdrücklich nicht heißt:** Erfüllt ist, was *geprüft* wurde. Die
Kriterien, die ein Mensch beurteilen muss — verständliche Sprache, sinnvolle
Reihenfolge beim Vorlesen, ob die Ansagen im Ernstfall tragen — entscheidet
weiterhin der Durchlauf mit NVDA und VoiceOver unter 1.0.

**Terminlage:** Gültig ist heute EN 301 549 V3.2.1 (2021-03) mit WCAG 2.1 AA.
Der Entwurf V4.1.0 (2025-11) nimmt die **neun zusätzlichen Erfolgskriterien aus
WCAG 2.2 AA** auf; als Termin der Nennung im Amtsblatt der EU nennt ETSI den
**23. Oktober 2026**. Ab dann ist das der Maßstab.

| Kriterium | Stand hier |
|---|---|
| **2.2.1 Timing Adjustable** (A) | **Erfüllt seit 0.9.17 (live).** Die Ein-Minuten-Frist war ein Zeitlimit ohne Verlängerung — sie ist aus allen Texten entfernt, nachdem die Messung sie widerlegt hat. |
| **2.4.11 Focus Not Obscured** (AA) | **War verletzt, behoben am 2026-08-31 — gemessen, nicht geraten.** Das Risiko war real: **9 von 126** Fokusstationen im Formular waren auf dem Handy vollständig hinter der festen unteren Leiste verschwunden (bei „Extra groß" 7). Der Browser scrollt ein Element zwar ins Fenster, kennt die Leiste aber nicht. Behoben mit `scroll-padding-bottom: calc(7rem + env(safe-area-inset-bottom))` auf `html` — die Leiste misst in jeder Schriftgröße rund 6,1 rem. Gegenprobe über alle Ansichten und beide Geräteprofile: **0 von 668**. |
| **2.4.12 Focus Not Obscured (Enhanced)** (AAA) | **Nicht erfüllt, bewusst.** Teilweise Verdeckungen bestehen weiter (Abschnitts-Kopfzeile `sticky`, schwebende Leiste). AAA war nie das Ziel. |
| **2.5.7 Dragging Movements** (AA) | **Erfüllt — nachgewiesen am 2026-09-01.** Zwei Stellen setzen aufs Ziehen, beide haben eine Ein-Klick-Alternative: (1) Wischen wechselt `activeSectionTab`; ein Einzelklick auf „Bereich 2" filtert nachweislich von 6 sichtbaren Abschnitten auf 3, ein zweiter stellt 6 wieder her. (2) Die beiden Schieberegler ändern ihren Wert schon auf einen **einzelnen Klick auf die Spur** (50 → 85), zusätzlich per Pfeiltaste, und daneben stehen vier Vorwahl-Schaltflächen. |
| **2.5.8 Target Size (Minimum)** (AA) | **Erfüllt — aber erst seit dem 2026-09-01 wirklich.** Die AA-Schwelle liegt bei 24 × 24 px, nicht bei 44 (das ist AAA, 2.5.5). Beim 2.5.7-Nachweis fiel auf: Der Schieberegler „Aufteilung der Stunden" hatte **168 × 6 px** — die dafür gebaute Klasse `.rv-slider` (44 px, sichtbarer Griff) war nur im A11y-Fenster gesetzt, nicht im Ausstempel- und im Nachtrage-Formular. Behoben; nachgemessen 168 × 44 px. **Die Prüfung sah es nicht, weil sie nur das Formular ansah** — sie läuft jetzt in jeder Ansicht mit. |
| **3.2.6 Consistent Help** (A) | **Erfüllt — nachgewiesen am 2026-09-01.** Die Hilfe hängt an genau einem Einstieg (Optionen → Hilfe). Die Hauptnavigation ist in allen fünf Ansichten und beiden Geräteprofilen identisch: `[RV Report \| RV Zeit \| RV Analyse \| RV Archiv \| Optionen]`, „Optionen" immer Position 5 von 5. |
| **3.3.7 Redundant Entry** (A) | **Erfüllt.** Der Mitarbeitername wird in jeden neuen Monat übernommen. |
| **3.3.8 / 3.3.9 Accessible Authentication** | Nicht anwendbar — die App hat keine Anmeldung. |

**Wie 2.4.11 gemessen wurde, mit Vorbehalt:** Jedes fokussierbare Element wurde
der Reihe nach fokussiert (der Browser scrollt dabei wie bei Tab), danach ein
Raster von 25 Punkten in seinem Kasten gegen `elementFromPoint` geprüft —
trifft kein Punkt das Element selbst, ist es vollständig verdeckt. **Nicht mit
der echten Tabulatortaste gemessen**, sondern mit `element.focus()`; beide
lösen dieselbe Bildlauflogik aus, aber die Tabulatorreihenfolge selbst ist
damit nicht geprüft. Und: Die zunächst gemeldeten 629 „teilweise verdeckt"
waren ein Artefakt — an abgerundeten Ecken meldet `elementFromPoint` das
Elternelement. Für die AA-Stufe ist das ohne Belang, sie verlangt nur, dass
nichts *vollständig* verdeckt ist.

**Zum rechtlichen Rahmen, ehrlich:** Das BFSG richtet sich an das
B2C-Geschäft; ein internes Werkzeug für die eigenen Außendienstmitarbeiter
fällt nach heutigem Stand vermutlich **nicht** darunter. Das ist aber nicht der
entscheidende Punkt — EN 301 549 ist der Maßstab, den jede Prüfung anlegt, und
für Arbeitsmittel von Beschäftigten mit Behinderung bestehen eigene Pflichten
des Arbeitgebers (SGB IX). **Ob und wie das hier greift, gehört zu Personal-
oder Rechtsabteilung, nicht in eine technische Roadmap.** Was wir liefern
können, ist der belegte Konformitätsstand.

---

## 0.9.20 — Aufräumen vor der Abnahme

- **`npm run deploy` entfernen.** Veröffentlicht auf einen `gh-pages`-Branch,
  der nichts mehr bestimmt. Steht seit 0.9.2 als Ballast in CLAUDE.md und ist
  eine Falle für jeden, der ihn für echt hält.
- **ExcelJS-Abhängigkeit prüfen.** Bringt eine bekannte Meldung in `uuid` mit
  (moderat). Falls eine Fassung ohne diese Unterabhängigkeit vorliegt,
  wechseln.
- **Die 44-px-Frage bei 360 px abschließen.** Durch 2.5.8 ist sie faktisch
  entschieden (AA verlangt 24 px) — nur noch dokumentieren.
- **320 px** (iPhone SE 1./2. Gen.): tritt bei den großen Schriftgrößen über
  den Kartenrand. Betrifft kein aktuell verkauftes Gerät — entweder bewusst
  als Nicht-Ziel festschreiben oder beheben.
- ~~**`HelpModal.tsx` gegen das geänderte Sync-Verhalten prüfen.**~~ **Erledigt
  mit 0.9.16/0.9.17:** Die Hilfe nennt jetzt die Sieben-Tage-Regel und das
  Hinzufügen zum Home-Bildschirm, die Sicherungs-Erinnerung, die Rettung im
  Absturzbildschirm, das Einfügefeld an erster Stelle und das Zusammenführen
  beim Backup-Import. Die Fristbehauptung ist raus.
- ~~**Waagerechter Überlauf im Inhaltsbereich am Schreibtisch.**~~ **Erledigt
  am 2026-09-01, und es waren zwei Fälle statt einem.** Beide steckten in
  Containern mit `overflow-x: auto` und blieben deshalb unsichtbar für die
  Seitenprüfung — `documentElement.scrollWidth` blieb unauffällig, der Inhalt
  wurde still seitwärts scrollbar:

  | Stelle | Befund |
  |---|---|
  | Analyse-Kacheln, Handy, „Extra groß" | Beschriftung hatte 49 px Platz, „Vorführungen" braucht 165 px → 56 px versteckter Überlauf, Titel abgeschnitten |
  | Formular-Spalten, Schreibtisch, „Extra groß" | Bedienzeile braucht 392 px, Karte bot 311 px → neun `+5`-Tasten bei 1270..1318 in einem 1280 px breiten Fenster |

  Gemeinsame Ursache: Polsterung und Schrift wachsen mit `rem`, das Fenster
  nicht — die Spalte schrumpft also genau dann, wenn ihr Inhalt wächst. Beide
  Raster entscheiden die Spaltenzahl jetzt über `minmax(...)` statt über eine
  feste Zahl, womit die Ansicht bei großer Schrift umbricht statt zu schneiden
  (WCAG 1.4.10 „Reflow"). **Nebenbefund:** Bei „Groß" ging die Formular-Spalte
  vorher mit *exakt null Reserve* auf (364 px Bedarf, 364 px Platz) — dieselbe
  Kante, die bei „Zeiterfassung" der Linux-Läufer gerissen hat.

  `check:ui` prüft diese Klasse jetzt mit: jeder Container mit
  `overflow-x: auto|scroll` muss frei von Inhaltsüberlauf sein. Die Regel
  zielt bewusst nicht auf `overflow-x: hidden` — das schneidet mit Absicht,
  daran hängen `sr-only` und `truncate`.
- **Zeitumstellung entscheiden.** `berechneNettoStunden` rechnet ausschließlich
  mit „HH:MM" ohne Datum (`timeUtils.ts:41`). An den zwei Umstellungstagen
  stimmt eine Schicht über Mitternacht deshalb nicht: 22:00–06:00 sind am
  25.10.2026 tatsächlich **9** Stunden und am 29.03. **7**, berechnet werden
  beide Male 8. Entweder das Datum einbeziehen oder bewusst als Nicht-Ziel
  festschreiben — **aber vor dem 25.10.2026 entscheiden**, nicht danach.
- **Untergrenze für Service-Worker-Updates.** Updates sind
  bestätigungspflichtig und laden nie von selbst neu — beim Tippen richtig. Wer
  aber immer wegdrückt, bleibt beliebig lange auf einer alten Fassung, im
  Zweifel mit einer veralteten Excel-Vorlage darin. Prüfen, ob es einen Boden
  gibt, und sonst einen einziehen.

---

## 1.0 — Abnahmefähig

Ab hier hängt alles an Menschen und Geräten. Kein Werkzeug ersetzt das.

- **Test auf echten Geräten.** Bildschirmtastatur (verdeckt sie Eingabefelder?
  scrollt die Seite nach?), versehentliche Textmarkierung beim Tippen auf
  Zähler, iOS-Safe-Areas auf einem echten iPhone, Kamera-Sync mit zwei
  physischen Geräten im selben WLAN.
- **Screenreader-Durchlauf mit NVDA (PC), VoiceOver (iOS), TalkBack
  (Android)** — vollständig, durch alle Bereiche. **Der Sync-Umbau aus 0.9.17
  muss ausdrücklich von einem der blinden Kollegen durchgespielt werden.** Ob
  er trägt, lässt sich anders nicht feststellen, und raten will hier niemand.
- **Barrierefreiheitserklärung und Konformitätsbericht** gegen EN 301 549:
  welche Kriterien erfüllt sind, welche nicht, und warum. Ein belegter Bericht
  mit ehrlichen Lücken ist mehr wert als die Behauptung, alles sei erfüllt —
  und er ist das Dokument, das eine Abnahme trägt.

---

## Danach (1.x) — bewusst später

- **Termin-Logbuch (optional!).** Jeder Tipp erzeugt zusätzlich einen Eintrag
  mit Datum und Notiz, sodass Zahlen belegbar werden. **Muss abschaltbar
  sein** — reine Zähler bleiben der Standardweg.
- **Bündelung mehrerer Kategorien** („Vorführung + Schulung beim selben
  Kunden") als ein Vorgang.
- **Jahresübersicht** über mehrere Monate hinweg.

---

## Bewusst NICHT geplant

- **Einklappbare Formularbereiche.** Eingeklappter Inhalt ist für
  Screenreader-Nutzer nicht erreichbar, und die Suchfunktion liefe ins Leere,
  wenn ein Treffer in einem geschlossenen Bereich liegt.
- **Cloud-Synchronisation / Nutzerkonten.** Widerspricht der DSGVO-Zusage.
- **Fremd-Schriften von externen Diensten** (Google Fonts o. Ä.) — gleicher
  Grund.
- **Push-Benachrichtigungen über einen Server.** Die Monatserinnerung wird
  weiterhin lokal von der App selbst ausgelöst.
- **Vermittlungsserver für die Gerätekopplung**, auch nicht „nur für den
  Verbindungsaufbau". Das ist der Punkt, an dem die Zusage „ohne
  Zwischenspeicherung auf fremden Servern" fallen würde.

---

## Offene Fragen

1. **Ist die geteilte Zwischenablage bei den Kollegen einrichtbar?**
   (Telefonverknüpfung unter Windows, Universal-Zwischenablage bei Apple.)
   Entscheidet, wie viel Aufwand in `navigator.share()` fließen muss.
2. **Soll es mehrere Nutzer auf einem Gerät geben können?** Aktuell ist die
   App auf eine Person ausgelegt.
3. **Wer nimmt die Barrierefreiheit formal ab** — reicht der Durchlauf mit den
   Kollegen, oder ist eine externe Prüfung gewünscht?
4. **Ist der Betriebsrat eingebunden?** Die App erfasst mit der Stempeluhr
   Arbeitszeiten. Wird sie zum verbindlichen Berichtswerkzeug, berührt das
   typischerweise die Mitbestimmung nach § 87 BetrVG. Das ist keine
   Rechtsauskunft und keine technische Frage — aber es ist die Sorte Punkt, die
   einen Rollout kurz vor dem Start kippt, wenn ihn vorher niemand stellt.
5. **Wer beobachtet die Excel-Vorlage?** Sie ist mit Stand 01.2026 in die App
   eingebettet. Gibt die Firma eine neue Fassung heraus, produziert die App
   weiter das alte Formular, und es fällt niemandem auf.
6. **Was passiert, wenn der einzige Entwickler ausfällt?** Die Dokumentation
   ist ungewöhnlich gut, aber niemand sonst hat diese App je gebaut und
   veröffentlicht. „Was, wenn Marc in der Abgabewoche krank ist" ist eine faire
   Frage — und sie kommt irgendwann.
