# Roadmap — RV Monatsreport (RV Mobil)

Stand: 2026-09-07, Version 0.9.22 (bis 0.9.20 ist veröffentlicht)

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
- ~~**WebKit-Lauf** als echte Engine~~ **Erledigt am 2026-09-01.** Drittes
  Profil `handy-webkit`, bewusst mit **derselben Fenstergröße** wie das
  Chromium-Handy: Schlägt eine Prüfung nur dort fehl, liegt es nachweisbar am
  Motor und nicht an der Breite. Prüfungen **41 → 62**, Laufzeit 1,2 → 1,8 min.

  **WebKit hat nichts gefunden** — kein Überlauf, kein axe-Verstoß. Das ist
  ein Ergebnis und keine Enttäuschung: Der Wert liegt darin, dass ein
  künftiger Fehler auf der Engine der Kollegen auffällt, nicht darin, heute
  einen zu liefern.

  **Ein Unterschied kam dabei doch heraus**, und er betrifft das Werkzeug:

  | im selben Profil, 360 × 780 | `pointer: coarse` | `hover` | `ontouchstart` | `maxTouchPoints` |
  |---|---|---|---|---|
  | Chromium | true | false | true | **1** |
  | WebKit | true | false | true | **0** |

  Die Medienabfrage, an der die Touch-Zweige im CSS hängen, stimmt in beiden.
  Nur `maxTouchPoints` setzt Playwrights WebKit-Bau nicht — eine Grenze des
  Prüfwerkzeugs, **keine** Aussage über iOS-Safari (ein echtes iPhone meldet
  dort 5). Die Prüfzeile steht deshalb weiterhin scharf, aber nur im
  Chromium-Profil, statt sie überall weich zu machen.

  **Was das nicht ersetzt:** Playwrights WebKit ist nicht Safari auf einem
  iPhone. Bildschirmtastatur, Safe-Areas und die Sieben-Tage-Speicherregel
  bleiben Handarbeit für 1.0.
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

- ~~**`npm run deploy` entfernen.**~~ **Erledigt mit 0.9.20.** Skript,
  `predeploy` und die `gh-pages`-Abhängigkeit sind raus. Was veröffentlicht,
  ist ausschließlich ein Push auf `main`.
- ~~**ExcelJS-Abhängigkeit prüfen.**~~ **Geprüft am 2026-09-02 — die Antwort
  ist: kein Wechsel, und zwar begründet.**

  **Es gibt keine Fassung ohne diese Unterabhängigkeit.** 4.4.0 ist die
  neueste; `npm audit fix --force` würde auf **3.4.0** zurückgehen, also einen
  Bruch gegen eine Lücke eintauschen.

  **Und die Lücke greift hier nicht.** Die Meldung (GHSA-w5hq-g745-h8pq)
  betrifft eine fehlende Bereichsprüfung in `uuid` **v3/v5/v6, wenn ein Puffer
  übergeben wird**. ExcelJS ruft an genau einer Stelle
  (`cf-rule-ext-xform.js`, bedingte Formatierung) `uuidv4()` auf — Version 4,
  ohne Argumente. Der verwundbare Pfad ist nicht erreichbar.

  Das ist ein bewusst getragenes Restrisiko, kein übersehener Punkt.

  **Nebenbefund, der wichtiger war:** Derselbe Durchlauf meldete `nanoid`
  unter 3.3.18 mit **hohem** Schweregrad — über `vite → postcss`, also aus dem
  Bau und nicht im Browser-Bündel. Ohne Bruch behebbar und behoben; im
  Lockfile steht jetzt 3.3.18. Damit bleibt genau eine moderate Meldung übrig,
  die oben begründete.
- ~~**Die 44-px-Frage bei 360 px abschließen.**~~ **Entschieden am 2026-09-02 —
  und zwar andersherum als hier stand.** Der Eintrag sagte, durch 2.5.8 sei die
  Frage faktisch erledigt, weil AA nur 24 px verlangt. Das war eine Auslegung,
  keine Entscheidung: Verbindlich ist jetzt **Stufe AAA (2.5.5), 44 px**,
  geprüft gegen 43,5 px wegen des Renderfaktors 0,99993.

  Der eigentliche Befund war ein anderer: **Regel und Prüfung standen
  auseinander.** `CLAUDE.md` forderte 44 px, `oberflaeche.spec.ts` prüfte
  24 px — beide Seiten für sich begründet, deshalb fiel es nie auf. Ein
  Prüfnetz, das etwas anderes durchsetzt als das Dokument verlangt, erzeugt
  das Gefühl von Deckung ohne die Deckung.

  Gemessen bei 360 px: kein fokussierbares Element unter 43,5 px (allein das
  Formular hat 93). Die Bedienzeile stand bei „Extra groß" allerdings 2,1 px
  über, alle fünf Elemente auf ihrer `min-width` — unsichtbar, aber ohne
  Reserve. Innenabstand der Zählerkarte 10 → 6 px, die 8 px kamen aus dem
  Weißraum und sind in die Tasten geflossen (`±1` 52,0 → 53,6 px).

  Die `±5`-Tasten blieben unter 44 px und liefen unter der
  Gleichwertigkeitsausnahme in 2.5.5, begründet im Quelltext. Das Prüfnetz
  trennte damals zwei Klassen (43,5 px im Tab-Lauf, 24 px außerhalb) und fand
  im ersten Lauf drei Verstöße, die der Handmessung entgangen waren — alle im
  Schreibtisch-Profil, weil nur bei 360 px gemessen worden war.

  **Nachtrag 2026-09-07:** Die `±5`-Tasten sind auf Vorgabe des
  Projektinhabers entfernt (0.9.22). Damit ist die Ausnahme gegenstandslos, das
  Prüfnetz kennt nur noch eine Schwelle, und der frei gewordene Platz ist in
  die verbleibenden drei Elemente geflossen — `±1` bei „Extra groß" von
  53,6 auf **80 × 64 px**, das Zahlenfeld von 56–72 auf **76–96 px**.
- ~~**320 px** (iPhone SE 1./2. Gen.)~~ **Behoben am 2026-09-02, nicht als
  Nicht-Ziel festgeschrieben.**

  Die Entscheidung fiel gegen das Festschreiben, und zwar aus einem einzigen
  Grund: **Die Fehler traten ausschließlich bei „Extra groß" auf** — also
  genau in der Einstellung, die sehbehinderte Nutzer verwenden. „Betrifft kein
  aktuell verkauftes Gerät" ist ein schwaches Argument, solange niemand weiß,
  welche Geräte die Kollegen tatsächlich in der Hand haben. Beim TalkBack-Punkt
  ist die Auskunft da und die Lücke deshalb begründbar; hier ist sie es nicht.

  Drei Fundstellen, alle dieselbe Ursache wie schon bei 360 px — Flex-Elemente,
  die ihre Breite nicht unter den Inhalt preisgeben:

  | Ansicht | Überstand | Ursache |
  |---|---|---|
  | Optionen | 14 px | Taste „Was gibt's Neues?" mit `flex-shrink-0` |
  | Analyse | 8 px | Umschalter Grafik/Tabelle bricht nicht um |
  | Zeit | 2 px | die beiden Reiter ohne `min-w-0` |

  Bei „Normal" und „Groß" war 320 px durchgehend sauber. Die Breite läuft
  jetzt als eigene Zeile im Prüfnetz mit (elf Ansichten, „Extra groß", rund
  22 Sekunden).
- **Typografie: Bestandsaufnahme liegt vor, Entscheidung steht aus.** Gemessen
  am 2026-09-02 über alle fünf Ansichten im Handy-Profil, 202 Elemente mit
  eigenem sichtbaren Text (`sr-only` ausgenommen). Drei Achsen, drei sehr
  unterschiedliche Ergebnisse:

  | Achse | Befund | Bewertung |
  |---|---|---|
  | Schriftgewichte | **3** — 400 (45 %), 700 (30 %), 900 (25 %) | sauber; die Reduktion von 5 auf 3 aus 0.9.6 hat 13 Versionen gehalten |
  | Schriftgrößen | **7** — 16 px (87×), 12 px (71×), 14 px (15×), 18 px (12×), 11 px (9×), 20 px (4×), 30 px (4×) | im Rahmen; zwei Werte tragen 78 % |
  | Sperrung (`letter-spacing`) | **7 Werte auf 55 Elementen** — −0,3 px (25×), 0,6 px (13×), −0,45 px (7×), 0,55 px (5×), −0,5 px (3×), 2,4 px, −0,4 px | die einzige nie normalisierte Achse |
  | Versalien | 18 Elemente (9 %) — 15 `<span>`, 3 `<h3>` | offen |

  **Die Sperrung ist der Fund.** Sieben Werte, davon vier negativ, ohne
  erkennbare Systematik — das ist keine Skala, das ist Rauschen aus 
  Einzelentscheidungen. Negative Sperrung zieht die Buchstaben zusammen und
  verengt das Wortbild; bei einer App, deren Zielgruppe sehbehindert ist, ist
  das die fragwürdigste der drei Achsen. Dasselbe gilt abgeschwächt für die
  18 Versalien-Elemente: Großbuchstaben nehmen dem Wort seine Umrissform, an
  der geübte Leser es erkennen.

  Bei den Größen fällt nur das Paar **11 px / 12 px** auf — ein Pixel
  Unterschied ist keine Stufe, sondern eine Verwechslung. Alles skaliert
  weiterhin über `--font-scale` mit, 11 px sind also bei „Extra groß" 16,5 px.

  **Bewusst kein Vorhaben daraus abgeleitet.** Die Zahlen sind der Befund, die
  Entscheidung gehört Ihnen — und sie wiegt weniger als der NVDA-Durchlauf.
  Das Messskript ist nach dem Lauf gelöscht (Wegwerf-Skript nach
  Projektregel); die Zahlen hier sind reproduzierbar.
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
- ~~**Zeitumstellung entscheiden.**~~ **Behoben am 2026-09-01 — und der Eintrag
  hier war in zwei Punkten falsch.**

  **Erstens die Tage.** Hier stand „22:00–06:00 sind am 25.10.2026 tatsächlich
  9 Stunden". Nachgemessen stimmt das nicht: Betroffen ist die Nacht, die *in*
  die Umstellung läuft, also die Schicht, die am Abend **vor** dem
  Umstellungssonntag beginnt.

  | Schicht | tatsächlich |
  |---|---|
  | **24.10.2026** 22:00 → 06:00 | **9,00 h** |
  | 25.10.2026 22:00 → 06:00 | 8,00 h |
  | **28.03.2026** 22:00 → 06:00 | **7,00 h** |
  | 29.03.2026 22:00 → 06:00 | 8,00 h |

  **Zweitens der Umfang.** Die Echtzeit-Stempeluhr war nie betroffen — sie
  rechnet mit echten Zeitstempeln (`ClockInWidget.tsx:177`), die Umstellung
  kommt dort von selbst heraus. Falsch war ausschließlich die **manuelle
  Nachtragung**, die mit „HH:MM" ohne Datum rechnete.

  `berechneNettoStunden` nimmt jetzt optional das Datum des Schichtbeginns;
  ohne Datum bleibt das alte Verhalten. Im Formular nachgeprüft: Die
  Herbstnacht zeigt 8,50 h gegenüber 7,50 h in einer gewöhnlichen Nacht
  (30 Min Standardpause), die Frühjahrsnacht 6,50 h. Prüfungen **135 → 142**,
  darunter eine, die nachweist, dass der Prüflauf wirklich auf Europe/Berlin
  läuft — auf dem UTC-Läufer der CI gäbe es sonst gar keine Sommerzeit, und
  die Fälle wären grün, ohne etwas zu messen.
- ~~**Untergrenze für Service-Worker-Updates.**~~ **Erledigt am 2026-09-07 mit
  0.9.21 — und die Ausgangsfrage war falsch gestellt.**

  Der Eintrag hier ging davon aus, dass jemand den Hinweis immer wegdrückt.
  Gemessen an der gebauten App gibt es diesen Menschen nicht: **`public/sw.js`
  ist seit dem 2026-07-19 unverändert**, 50 Commits und die Fassungen 0.8.0 bis
  0.9.20 haben sie nicht angefasst. Ein Browser erkennt ein Update
  ausschließlich an den Bytes dieser Datei — **der Hinweis ist also seit sieben
  Wochen kein einziges Mal erschienen.** Dass die Kollegen trotzdem aktuell
  sind, liegt am network-first-Verhalten des Workers, nicht am Hinweis.

  **Einen Boden gab es außerdem, er gehörte nur nicht uns.** Sind alle Fenster
  der App geschlossen — auf dem Handy der Normalfall —, aktiviert der Browser
  den wartenden Worker von selbst (nachgemessen: neue Fassung aktiv, alter
  Cache weg, eine Navigation). „Beliebig lange auf einer alten Fassung" stimmt
  für den Schreibtisch, nicht fürs Handy.

  Der echte Defekt war ein anderer: **Nach einmal „Später" kam der Hinweis nie
  wieder** — auch nach zwei Neuladungen nicht, weil nur `updatefound`
  ausgewertet wurde und nie `reg.waiting`. Der Nutzer hatte danach keinen Weg
  mehr, das Update anzustoßen.

  **Und ein Fund, der den Zwang erst möglich machen musste:** Ein Update
  **offline** anzuwenden hinterließ eine weiße Seite — `#root` mit 0 Zeichen,
  zwei fehlgeschlagene Anfragen. `activate` löscht jeden Cache außer dem neuen,
  der neue enthielt aber nur die Schale. Die Gegenprobe offline *ohne* Update
  rendert einwandfrei. Kein neuer Fehler — die Taste „Jetzt aktualisieren"
  konnte das immer schon —, aber die Vorbedingung: Ein Boden, der ein Update
  erzwingen darf, darf die App nicht unbenutzbar machen. Behoben, indem
  `install` die gehashten Build-Dateien mit vorlädt.

  Der Boden ist jetzt dreistufig und gemessen: Hinweis bei jedem Start, ab
  **7 Tagen** ohne „Später" (Rolle `alert`), ab **14 Tagen** beim nächsten
  Start selbst angewandt — angesagt, 8 Sekunden Vorlauf, nur beim Start und nur
  online. Nebenbei behoben: der Hinweis war mit 152 × 36 px und 41 × 20 px zu
  klein, lag auf der Hauptnavigation, ignorierte das Farbschema, und der
  Erstbesuch lud die Seite ohne Anlass zweimal.

  **Zwei Rest-Lücken, ausdrücklich benannt:** Ein Tab, der wochenlang offen
  bleibt und nie neu geladen wird, erlebt keinen Start und wird deshalb nicht
  automatisch aktualisiert — er eskaliert nur bis „nicht mehr wegdrückbar". Und
  die nachgeladenen Bildschirme (Sync, Sicherung, Excel) stehen nicht in der
  `index.html` und werden nicht vorgeladen; nach einem Update im Funkloch
  brauchen sie einmalig Netz.

  **Zur Veröffentlichung gehört:** Diese Änderung fasst `sw.js` an. Der Deploy
  ist damit das erste Update-Ereignis seit dem 2026-07-19 — jeder
  Bestandsnutzer sieht den Hinweis beim nächsten Online-Start zum ersten Mal
  überhaupt.

---

## 0.9.22 — Plausibilitätsprüfung der ganzen Codebasis — ERLEDIGT (2026-09-07)

Auftrag: den gesamten Code auf Plausibilität prüfen, **alles verifizieren und
nichts behaupten**, die Barrierefreiheit lückenlos machen, die ±5-Tasten
entfernen. Vollständiges Protokoll mit allen Messwerten im
[DEVLOG](DEVLOG.md).

**Der schwerste Fund war keiner aus der Liste, sondern ein Datenverlust.** Ein
vorübergehender Lesefehler beim Start löschte das Archiv: Der `catch`-Zweig des
Ladevorgangs füllte den Zustand mit `leererMonat()` und `{}` auf, und `{}` ist
wahrheitswertig — es lief damit durch genau den Wächter, der davor schützen
sollte. Reproduziert gegen die gebaute App: drei Archivmonate, ein Lesefehler,
**eine** getippte Zahl, danach war nur noch der laufende Monat übrig. Ohne jede
Warnung. Die Wächter waren richtig; der Fehlerzweig hat sie ausgehebelt.

| Ergebnis | vorher | nachher |
|---|---|---|
| Archivmonate nach einem Lesefehler und einer Eingabe | 1 von 3 | **3 von 3** |
| Laufender Bericht | überschrieben | unverändert |
| Rückmeldung an den Nutzer | keine | eigene Ansicht mit Ansage |

**Zehn von elf Ansichten waren geprüft, nicht elf.** Der Prüfeintrag „Formular
anpassen" landete auf einem gleichnamigen Untermenü statt in `ManageModal`.
Erster echter Lauf gegen die Ansicht: sechs Fehlschläge, fünf Defekte —
darunter eine Tastaturfalle (WCAG 2.1.2), ein mit der Tastatur nicht
anspringbarer Scrollbereich und eine Überschrift, die 531 px Inhalt in ein
360-px-Fenster schob.

**Die Bestätigungstaste war in zwei Farbschemata unsichtbar.** `text-white` auf
`--danger-solid` — und diese Variable ist in „Weiß auf Schwarz" selbst
`#ffffff`, in „Gelb auf Schwarz" `#ffff00`. Kontrast 1,00:1 bzw. 1,07:1, in
**allen vier zerstörenden Rückfragen**, in genau den Schemata, die für diese
Zielgruppe gebaut sind. Das Prüfgate konnte es nicht finden: Es misst
gerenderte Ansichten, und keine Prüfung öffnete je eine Rückfrage.

**Die ±5-Tasten sind weg — und damit die einzige WCAG-Ausnahme der App.** Sie
liefen unter der Gleichwertigkeitsausnahme in 2.5.5. Jetzt erfüllt jedes
Bedienelement die 44 px ohne Ausnahme, das Prüfnetz kennt eine Schwelle statt
zweier, und der frei gewordene Platz ist vollständig in die verbleibenden drei
Elemente geflossen.

Weiter behoben und je einzeln nachgemessen: die RV Analyse folgte keiner
Theme-Wahl (`var(--primary-color, …)` — diese Variable existiert nirgends);
zehn Bedienelemente, deren `aria-label` die sichtbare Beschriftung ersetzte
(WCAG 2.5.3); `pruefeSyncPaket` ließ ein Paket durch, an dem das
Zusammenführen abstürzt; der Fristalarm las den Versandstatus nie und warnte
auch für zukünftige Monate; ein rohes `localStorage.setItem` in einem Effekt;
das Wischen wechselte den Bereichsfilter stumm.

**Vier neue Prüfungen im Gate**, die je einen dieser Fehler festhalten:
Lesefehler beim Start, WCAG 2.5.3 über alle Ansichten, die Ansicht `manage`,
und die Schichten im Sync-Paket. Prüfungen **144 → 148** und die
Oberflächenprüfung entsprechend gewachsen.

### Das Deploy-Tor war fünf Tage rot, ohne dass es auffiel

Aufgedeckt beim Push von 0.9.22. Live war seit dem 2026-09-02 `497fef3`; die
beiden Commits danach (`f8ae712`, `e638f68`) haben Deployment-Status
`failure`. Den Kollegen fehlten also fünf Tage lang die 320-px-Korrekturen und
die erweiterte Prüfmatrix.

Ursache in beiden Fällen derselbe Fehlschlag in `check:ui` — der Tabulator-
Durchlauf im Formular, den der geladene Läufer als Wettlauf offenlegt und
dieser Rechner nicht. Mit der Wartezeit von 40 ms je Schritt ist er behoben.

**Was daran strukturell ist und nicht am Einzelfall hängt:** Die Regel in
`CLAUDE.md` verlangte bis heute nur, zu bestätigen, dass ein Workflow-Lauf
*existiert*. Hier existierten Läufe, es gab Deployment-Einträge — und den
Status `failure`. Beide Sätze stehen jetzt dort, samt der beiden
API-Aufrufe, die die Frage „was ist live?" wirklich beantworten.

Offene Frage an den Projektinhaber: Ein roter Deploy fällt derzeit niemandem
auf. Eine Benachrichtigung bei fehlgeschlagenem Workflow (GitHub schickt sie
auf Wunsch per E-Mail an den Commit-Autor) wäre der billigste Weg, das nicht
wieder fünf Tage laufen zu lassen — sie ist offenbar aus, sonst wäre es
aufgefallen.

### Zerbrechlich, gemessen, benannt

**Die Hauptnavigation ist aus dem Dokument, solange ein Zählerfeld den Fokus
hat — und 120 ms darüber hinaus.** `focusedFieldId` blendet die untere Leiste
aus und eine Feld-Werkzeugleiste ein; beim Verlassen kommt sie über einen
`setTimeout(…, 120)` zurück. Nachgemessen am 2026-09-07: 50 ms nach dem
Weitertabben war sie weg, nach 450 ms wieder da.

Für einen Menschen geht das auf — niemand tabbt 25-mal in 400 ms. Der
Tabulator-Durchlauf der Prüfung tat genau das und meldete „RV Archiv" und
„Optionen" als unerreichbar; er wartet jetzt 40 ms je Schritt, weil er sonst
eine Wettlaufsituation misst statt der Erreichbarkeit.

Was als echte Zerbrechlichkeit bleibt: Ein Bedienelement, das für ein
Zeitfenster **aus dem Dokument verschwindet**, ist für einen Screenreader
nicht dasselbe wie eines, das nur unsichtbar wird — der virtuelle Puffer wird
neu aufgebaut, und wer schnell navigiert, läuft daran vorbei. Sauberer wäre,
die Navigation immer eingehängt zu lassen und nur ihre Darstellung zu
wechseln. Das ist eine Änderung an der Leisten-Logik und gehört mit eigener
Messung in eine eigene Fassung — nicht ans Ende dieser.

### Bestätigt, aber bewusst NICHT in dieser Fassung behoben

**Ein Archivmonat zu öffnen ersetzt die Feldkonfiguration der App — dauerhaft.**
`App.tsx` setzt beim Laden eines Archivmonats `setAppFields(savedRecord
.fieldsSnapshot)`, und `useEinstellungen` schreibt das sofort nach
`aussendienst_pwa_fields`. Wer im September eine eigene Kategorie anlegt und
danach zum Nachsehen den Januar öffnet, findet die Feldliste auf dem
Januar-Stand — die eigene Kategorie ist aus Formular und Speicher
verschwunden. Sie kehrt nur zurück, wenn der September selbst archiviert ist
und wieder geöffnet wird.

Der Schnappschuss ist richtig und muss bleiben: Ein alter Monat soll mit den
Feldern erscheinen, die er damals hatte. Falsch ist, dass dieselbe Variable
beides trägt — die Anzeige des betrachteten Monats **und** die gespeicherte
Konfiguration des Nutzers.

**Warum hier nicht behoben:** Das ist keine Zeile, sondern eine Trennung. Die
Feldkonfiguration müsste in zwei Zustände zerfallen (die eigene, dauerhafte
und die des gerade betrachteten Monats), und `appFields` hängt an der
Darstellung aller vier Abschnitte, am Archiv-Schnappschuss und am
Excel-Export. Ein solcher Umbau gehört in eine eigene Fassung mit eigenen
Messungen und nicht an das Ende eines ohnehin großen Standes. Er ist damit
benannt, nicht vergessen.

> **Nachtrag 0.9.28 (2026-09-07): behoben — aber anders als hier vorgesehen.**
> Die Trennung in zwei Zustände wäre der saubere Entwurf und berührt **38
> Verwendungsstellen** in `App.tsx`, von denen jede einzeln zu entscheiden
> wäre. Der Schaden hängt aber nicht an der geteilten Variablen, sondern an
> einer Lücke: Ein Monat **ohne** Zählerwerte, Notizen und Schichten wandert
> nicht ins Archiv (`monthHasContent`) und hinterlässt deshalb keinen
> `fieldsSnapshot`, aus dem der eigene Stand zurückkäme. Genau dieser Fall —
> eigene Kategorie im noch leeren Monat angelegt — ist gemessen worden und
> verlor die Kategorie endgültig.
>
> Behoben mit zwei Berührungspunkten in `handleMonthChange`: Feldstand des
> verlassenen Monats ablegen, wenn er **nicht** archiviert wurde; beim
> Betreten eines Monats **ohne** Archiveintrag von dort holen.
> Selbstaufräumend. Beide Richtungen als Prüffall — die eigene Kategorie
> überlebt, und im Archivmonat gilt weiterhin dessen Schnappschuss.
>
> Was die Herleitung oben zu grob fasste: „Sie kehrt nur zurück, wenn der
> September selbst archiviert ist" — richtig, und genau darin lag der Hebel.
> Der Umbau in zwei Zustände bleibt der bessere Entwurf und bleibt offen; er
> ist jetzt aber kein Datenverlust mehr, sondern eine Aufräumarbeit.

**Zwei Prüfungen verteidigten einen Fehler, statt ihn zu finden** — sie suchten
ein Bedienelement über genau das `aria-label`, das den Verstoß ausmachte. Wer
eine Prüfung schreibt, die einen Fehler zur Voraussetzung macht, macht ihn
dauerhaft.

---

## 0.9.27 — Die Prüfung selbst — ERLEDIGT (2026-09-07)

Vier von fünf Punkten aus der kritischen Bilanz. An der App ändert sich
nichts; geändert hat sich, wie geprüft wird.

- **Ersteinstieg im Prüfnetz** (sechster Fall der Zustandslücke): 31
  Prüfungen, **kein Befund**. `oeffne()` unterdrückt den Assistenten in jeder
  Prüfung — der erste Bildschirm eines neuen Nutzers war der einzige nie
  gemessene. Er war von Anfang an sauber.
- **Tabulator-Prüfung zweistufig.** Der Fehlschlag, der am 2026-09-02 zwei
  Deploys zerriss, ist keine Erreichbarkeitslücke, sondern ein Rennen mit der
  Navigation, die nach dem Verlassen eines Zählerfelds 120 ms braucht. Ein
  Befund gilt jetzt erst, wenn er einen langsamen Nachlauf übersteht.
  Belegt über einen künstlich gekürzten ersten Durchlauf: ohne zweite Stufe
  12 Fehlschläge und rund 90 falsche „unerreichbar", mit ihr 12 bestanden.
- **Zustandszähler** (`scripts/checks/zustandsdeckung.ts`). Sechs
  Defektserien entstanden, weil eine gepflegte Liste vergessen wurde. Jetzt
  zählt eine Prüfung die Zustandsschalter (40 in zehn Dateien) und wird rot,
  sobald einer hinzukommt — mit der Handlungsanweisung dabei. Beweist keine
  Deckung, erzwingt eine Entscheidung.
- **Screenreader-Durchlauf vorbereitet und vertagt** (Entscheidung des
  Projektinhabers): `SCREENREADER-DURCHLAUF.md`, acht Stellen mit
  vorher/nachher. Das Dokument liegt bereit, bis der Durchlauf ansteht.

**Das größte offene Risiko ist nicht technisch.** Der letzte Durchlauf mit dem
blinden Kollegen lief auf 0.9.22; seither sind die zugänglichen Namen breit
umgebaut. Normkonform und ungeprüft — axe misst, ob ein Name existiert, nicht
ob er vorgelesen taugt. Das entscheidet der Durchlauf, nicht das Gate.

---

## 0.9.26 — Zwei blinde Flecken im Formular — ERLEDIGT (2026-09-07)

Fünfter Fall derselben Klasse, und der lehrreichste: nicht in einer selten
geöffneten Ansicht, sondern im **Formular** — dem Bildschirm, den `check:ui`
in drei Geräteprofilen, drei Schriftgrößen, vier Farbschemata und mit
erzwungener Breitschrift misst.

- **Editor der Schnell-Erfassung**: „Automatisch (meistgenutzt)" 239 × 36 px,
  16 Kategorie-Zeilen 34 px hoch, und bei „Extra groß" verstecktes
  Seitwärtsscrollen (`overflow-y: auto` zieht die x-Achse mit — dieselbe
  Ursache wie im Geräte-Sync).
- **Ein-Hand-Leiste**: vier Tasten 38 px hoch, „Zeit" nur 53 px breit.
  Erscheint nur bei gesetztem `aussendienst_pwa_mobile_comfort` — ein
  Schalter, den kein Prüflauf je gesetzt hat.

**Die Lehre, in einem Satz:** Eine Ansicht in `ANSICHTEN` einzutragen prüft
ihren *Ausgangszustand*, nicht die Ansicht. Wer einen Zustand hinter einen
Klick oder einen gespeicherten Schalter legt, legt ihn aus dem Prüfnetz
heraus — und die Liste bleibt grün.

Die Gegenmaßnahme ist eine Liste, keine Regel: `ZUSTAENDE_MIT_SCHRIFT` am Ende
von `tests/oberflaeche.spec.ts` führt zwölf Zustände. Wer einen neuen anlegt,
trägt ihn dort ein.

---

## 0.9.25 — Das Archiv war geprüft, aber immer leer — ERLEDIGT (2026-09-07)

**Die Prüfliste sagte „Archiv: bestanden" und meinte einen leeren
Bildschirm.** `history` steht seit 0.9.18 in `ANSICHTEN`, aber `oeffne()` legt
keinen gespeicherten Monat an — gemessen wurde über zwanzig Versionen hinweg
nur der Satz „Noch keine Monate im Archiv."

Das unterscheidet diesen Fall von den drei Vorgängern (`manage`, die Formulare
der Stempeluhr, die Sync-Zustände): Dort zeigte die Liste ehrlich eine Lücke.
Hier stand ein grüner Haken über einer Aussage, die den fraglichen Bildschirm
nie berührt hat. **Wer eine Ansicht ins Prüfnetz aufnimmt, muss den Zustand
herstellen, in dem sie benutzt wird** — sonst prüft er den Leerlauf.

Gefunden mit echtem Bestand (drei Monate, zwei Jahre, einer mit Schichten):

- **Sieben Verstöße gegen WCAG 2.5.3.** Die dichteste Fundstelle im Projekt.
  Bei „Doch noch offen" kam **kein einziges** sichtbares Wort im zugänglichen
  Namen vor. Vier `aria-label` sind ersatzlos entfallen; der sichtbare Inhalt
  ist jetzt der Name, Zusätze stehen als `sr-only` dahinter.
- **Die Suche fand Kommentare und zeigte sie nicht.** Gemessen mit einem Wort,
  das nur in einem Kommentar steht: Karte da, Wort nirgends im Text der Seite.
  Genau der Fall, mit dem „Bewusst NICHT geplant" die Einklapp-Regel begründet.
  Behoben neben der Klappe, nicht durch Aufklappen — eine zwangsweise geöffnete
  Karte hinterlässt eine Taste, die `aria-expanded="true"` meldet und nichts tut.
- **Die Jahres-Klappe hatte kein `aria-expanded`** und meldete bei laufender
  Suche einen Zustand, den sie nicht ändern konnte. Sie ist dann keine Taste
  mehr.
- **„Clear"**, englisch und wenige Pixel groß, plus ein Suchfeld ohne
  Beschriftung und eine Trefferliste ohne Statusmeldung (WCAG 4.1.3).

**Trefferflächen, Reflow und axe waren in allen vier Zuständen sauber.** Das
gehört genauso berichtet wie die Funde.

Vier Archivzustände sind jetzt im Prüfgate: Liste, aufgeklappter Monat,
Löschabfrage, laufende Suche.

**Nachtrag zum Messverfahren:** Die GitHub-API in einer Schleife ohne
Wartezeit abzufragen sprengt das Kontingent von 60 Aufrufen pro Stunde, und
die gedrosselte Antwort ist von „kein Lauf vorhanden" nicht zu unterscheiden —
also vom echten Ausfall des 2026-08-08. Der Deploy lässt sich ohne API
bestätigen, indem man das ausgelieferte Bündel nach einem Merkmal der neuen
Fassung durchsucht. In `CLAUDE.md` festgehalten.

---

## 0.9.24 — Die Formulare der Stempeluhr, und GPS ist raus — ERLEDIGT (2026-09-07)

**GPS ist entfernt** (Anweisung des Projektinhabers). Zwei Knöpfe „Aktuellen
GPS-Standort abrufen und einfügen", die Funktion, der Import. Was zur Frage
führte: Die Funktion kam in **keinem** Dokument des Projekts vor; ihre
Koordinaten wanderten über die Schichtnotiz in den Excel-Export zur
Vertriebsleitung; `server.ts` verbietet sie per
`Permissions-Policy: geolocation=()`; und Ortsdaten von Beschäftigten sind ein
anderer Sachverhalt als Arbeitszeiten — die offene Frage zum Betriebsrat in
dieser Datei nennt ausdrücklich nur die Stempeluhr.

**Zwei Formulare, die keine Prüfung je gesehen hatte.** „Arbeitszeit
verbuchen" und „Schicht manuell nachtragen" sind Zustände *innerhalb* der
Zeit-Ansicht, nicht eigene `activeTab`-Werte — über `EINSTIEGE` also nicht
erreichbar. Erster echter Lauf: neun Fehlschläge.

| Klasse | Befund |
|---|---|
| Trefferflächen | **elf** Bedienelemente unter 44 px, das kleinste 38 px hoch |
| Reflow | 495 px Inhalt in 360 px, **drei** getrennte Ursachen (Absendezeile, Formularüberschrift, Kartenkopf) |
| Kontrast | 2,82:1 — `animate-pulse` senkt die Deckkraft des Textes |
| WCAG 2.5.3 | `+15` hieß zugänglich „Pause um 15 Minuten erhöhen" |

Die Kartenkopfzeile ist nur breit, **während eine Schicht läuft** — deshalb
hatte sie nie jemand gemessen.

### Dieselbe Lücke ein drittes Mal: die Zustände des Geräte-Syncs

`mode` kennt sechs Werte, das Prüfnetz erreichte nur `select`. Vier davon
sind ohne zweites Gerät erreichbar und jetzt abgedeckt. Befunde:
**„Abbrechen" mit 77 × 24 px** — die Ausstiegstaste aus jedem Sync-Schritt —,
ein QR-Code ohne zugänglichen Namen und eine Kameravorschau mit unzulässigem
`aria-label`. Die beiden letzten sind mit `aria-hidden` gelöst, nicht mit
einem Alternativtext: Ein QR-Muster liest niemand vor.

**Der Code selbst gab nichts her.** `DeviceSyncModal` ist deutlich sorgfältiger
gebaut als `ClockInWidget`; die Defekte lagen ausschließlich in den Zuständen,
die nie jemand angesehen hat. `confirm` bleibt ungeprüft — er verlangt ein
gültiges eingegangenes Paket und damit ein zweites Gerät.

> **Nachtrag 0.9.30 (2026-09-08): `confirm` ist geprüft — die Begründung oben
> war falsch.** „Ein gültiges eingegangenes Paket und damit ein zweites Gerät"
> wirft zwei Dinge zusammen, die nichts miteinander zu tun haben. Playwright
> öffnet zwei unabhängige Browserkontexte — das *sind* zwei Geräte, mit
> getrennten Speichern —, und der kameralose Weg über den Textcode ist seit
> 0.9.17 der bewusst vorgezogene. Was wirklich fehlt, ist eine **Kamera**,
> nicht ein zweites Gerät.
>
> Der ganze Ablauf läuft jetzt im Prüfnetz: Code auf A bauen und kopieren, auf
> B einfügen, `confirm` erreichen, zusammenführen — und danach im Speicher von
> B nachsehen, ob **beide** Stände da sind.
>
> **Der erste Lauf hat einen Datenfehler gefunden**, den sechs Versionen lang
> niemand gesehen hat: `mergeSyncPayload` spiegelte den aktiven Monat des
> Senders auch dann ins Archiv des Empfängers, wenn er **leer** war. Wer sich
> am Monatsanfang abgleicht, bekam bei jedem Abgleich einen Eintrag
> „Zähler: 0" — genau das Symptom, gegen das `monthHasContent` schon
> existiert; der Monatswechsel war abgesichert, das Spiegeln beim Sync nicht.
> Behoben mit einer Bedingung, drei Prüffällen und der Gegenprobe, dass beide
> Tore ohne die Korrektur wirklich rot werden.
>
> Offen bleiben der QR-Weg (braucht eine Kamera) und die aufgebaute
> Live-Verbindung. Die neue Prüfung läuft nur im Chromium-Profil — zwei
> Kontexte plus Zwischenablage sind in WebKit nicht auf demselben Weg zu
> bekommen; das ist eine Grenze des Werkzeugs, kein Befund über die App.

### Benannt, nicht geändert: die Sicherheits-Header wirken nicht

Die laufende Seite sendet **keinen** der in `server.ts` gesetzten Header —
nachgemessen mit `curl -I`: weder `Permissions-Policy` noch
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` noch die
strikte `Content-Security-Policy`. Der Grund ist strukturell: `server.ts` ist
nicht der Produktionsserver, ausgeliefert wird von GitHub Pages, und Pages
setzt keine eigenen Header.

Eine CSP ließe sich als `<meta http-equiv>` in die `index.html` legen und
würde dort greifen. Das ist aber eine Entscheidung des Sicherheitskonzepts —
eine falsch gefasste CSP legt die App still lahm —, und sie gehört nicht in
einen Nachtrag.

---

## 0.9.23 — Eine Schicht war 36 Sekunden zu lang — ERLEDIGT (2026-09-07)

Ergebnis der Frage „funktioniert wirklich alles?" -- durchgespielt wurden die
Abläufe, die zwar geändert, aber nie ausgeführt worden waren.

**Der Excel-Inhalt ist zum ersten Mal auf Zellenebene geprüft.** 15
Zählerfelder mit paarweise verschiedenen Werten belegt, exportiert, die Datei
wieder aufgemacht: alle in ihren Zellen, D3 im geforderten MM/JJJJ, D4 und B28
korrekt, **D10 behält seine Formel** `SUM(D6:D9)`, drei Blätter mit den
richtigen Namen.

**Der Fund:** 08:00 bis 16:30 mit 45 Minuten Pause sind 7,75 Stunden -- die App
verbuchte 7,76. Beide Hälften der Aufteilung wurden unabhängig gerundet und die
Dauer der Schicht aus ihrer Summe gebildet statt aus der Netto-Zeit. Klein
(36 Sekunden), aber immer in dieselbe Richtung, im Normalfall auftretend und
als Arbeitszeit im Bericht an die Vertriebsleitung. Behoben über eine reine
Funktion `teileArbeitszeit`: eine Hälfte runden, die andere als Rest.
Prüfungen **148 → 152**.

### Benannt, nicht geändert: die Schichtliste liegt hinter einem Einklapper

`isLogsCollapsed` steht auf `true` -- das Protokoll der eigenen Arbeitszeit ist
standardmäßig verborgen. Die ROADMAP hält unter „Bewusst NICHT geplant" das
Gegenteil fest, und `CLAUDE.md` schärft nach, die Regel gewinne gegen
etablierte UI-Muster.

Ob der Fall darunterfällt, ist eine **Produktentscheidung**: Die Schichtliste
ist kein Formularbereich, der Umschalter ist eine echte Taste mit
`aria-expanded`, und als Disclosure ist das Muster nach WCAG zulässig. Der in
der Regel genannte Grund -- „für Screenreader-Nutzer nicht erreichbar" --
trifft hier so nicht zu. Der Widerspruch zur eigenen Regel bleibt trotzdem
stehen und gehört dem Projektinhaber.

> **Nachtrag 0.9.29 (2026-09-07): entfernt — und die Entscheidung habe ich
> getroffen, obwohl dieser Eintrag sie dem Projektinhaber vorbehalten hat.**
> Das gehört so benannt und ist in einer Zeile umkehrbar.
>
> Grundlage war die stehende Anweisung „Es muss alles barrierefrei sein. Falls
> das aktuelle Design und Layout nicht passt, ersetze es!" zusammen mit der
> Regel in `CLAUDE.md`. Dazu kam ein **neues Argument aus der Messung**, das
> die Abwägung oben nicht kannte: Verborgen war nicht nur die Liste, sondern
> die **Excel-Ausgabe des Schichtprotokolls** — eine ganze Funktion,
> standardmäßig zugeklappt. Der oben zu Recht zurückgewiesene Grund
> („für Screenreader nicht erreichbar") war der schwächere; der stärkere ist,
> dass eine Funktion hinter einer Klappe liegt, die niemand vermutet.
>
> An die Stelle des Umschalters tritt eine Überschrift mit der Zahl der
> Einträge; gegen die Länge steht der scrollbare Bereich, der jetzt einen
> `tabIndex` hat. Wer die Einklappung zurückhaben will, sagt es — dann kommt
> sie zurück, aber mit sichtbarer Excel-Taste davor.

### Nicht über die Oberfläche geprüft

Das Löschen einer Schicht und damit die Umkehrbarkeit der Verrechnung. Über die
reinen Prüfungen zu `verrechneSchicht` abgedeckt, über die Oberfläche **nicht**.

---

## 1.0 — Abnahmefähig

Ab hier hängt alles an Menschen und Geräten. Kein Werkzeug ersetzt das.

- **Test auf echten Geräten.** Bildschirmtastatur (verdeckt sie Eingabefelder?
  scrollt die Seite nach?), versehentliche Textmarkierung beim Tippen auf
  Zähler, iOS-Safe-Areas auf einem echten iPhone, Kamera-Sync mit zwei
  physischen Geräten im selben WLAN.

  **Stand 2026-09-02: laut Rückmeldung des Projektinhabers durchgeführt.** Wie
  bei den Screenreader-Durchläufen ist das eine Fremdauskunft — nicht
  nachvollzogen, kein eingesehenes Protokoll. Ob die vier oben einzeln
  genannten Punkte dabei jeweils geprüft wurden, ist damit **nicht** bestätigt;
  die Liste ist bewusst so kleinteilig, weil genau diese vier Dinge sich auf
  keinem Emulator zeigen. Wer die Abnahme trägt, sollte sie einzeln abhaken.
- **Screenreader-Durchlauf mit NVDA (PC), VoiceOver (iOS), TalkBack
  (Android)** — vollständig, durch alle Bereiche. **Der Sync-Umbau aus 0.9.17
  muss ausdrücklich von einem der blinden Kollegen durchgespielt werden.** Ob
  er trägt, lässt sich anders nicht feststellen, und raten will hier niemand.

  **Stand 2026-09-07: NVDA und VoiceOver sind auf der veröffentlichten
  Fassung 0.9.22 ohne Befund durchgelaufen — durchgeführt von einem blinden
  Kollegen aus dem Team.** Damit ist zum ersten Mal beides zugleich erfüllt,
  was dieser Punkt verlangt: die aktuelle Fassung und die richtige Person.

  Warum die Fassung hier ausdrücklich steht: Bis zum 2026-09-07 gegen 16:00 Uhr
  lieferte die öffentliche Adresse `497fef3` vom 2026-09-02 aus — die beiden
  Commits danach hingen an einem fehlgeschlagenen Deploy. Ein Durchlauf „auf
  der App" prüfte in diesen fünf Tagen also nicht den Stand des Quelltextes.
  Für den früheren Durchlauf vom 2026-09-02 lässt sich deshalb nachträglich
  nicht mehr sicher sagen, welche Fassung er abgedeckt hat.

  Was die Angabe weiterhin nicht ist: von Claude nachvollzogen. Kein
  eingesehenes Protokoll, keine Aufzeichnung — sie bleibt eine Fremdauskunft.
  **Offen bleibt außerdem, ob der Geräteabgleich Teil des Durchlaufs war**;
  das ist der Teil, den 0.9.17 zuletzt umgebaut hat und den dieser Eintrag
  ausdrücklich hervorhebt.

  **TalkBack (Android) bleibt vorerst unbestätigt — aus einem sachlichen
  Grund, nicht aus Nachlässigkeit: Die blinden Kollegen nutzen ausschließlich
  iPhones.** Die Plattform ist mit der tatsächlichen Zielgruppe also gar nicht
  prüfbar. Ein sehender Durchlauf mit TalkBack wäre technisch möglich, erfüllt
  aber nicht den Maßstab dieses Eintrags, der ausdrücklich einen der blinden
  Kollegen verlangt. Für den Konformitätsbericht heißt das: **TalkBack/Android
  wird als ungeprüft ausgewiesen, nicht als erfüllt.** Relevant wird der Punkt
  in dem Moment, in dem jemand im Team auf Android wechselt — und dann ist er
  ungeprüft, nicht abgesegnet.

  Ebenfalls nicht bestätigt: ob der Sync-Umbau aus 0.9.17 Teil der Durchläufe
  war — genau der Punkt, den dieser Eintrag hervorhebt.
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
