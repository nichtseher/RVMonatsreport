# Roadmap — RV Monatsreport (RV Mobil)

Stand: 2026-08-02, Version 0.9.4

Diese Roadmap ist aus **gemessenen Befunden** entstanden, nicht aus Vermutungen.
Wo eine Zahl steht, wurde sie im Browser nachgemessen. Punkte ohne Beleg sind
als Einschätzung gekennzeichnet.

Leitplanken, die für jeden Punkt gelten:
- **Serverlos bleibt Pflicht** (DSGVO-Zusage der App). Kein Backend, keine
  externen Dienste, keine Fremd-Schriften.
- **Barrierefreiheit ist Kernanforderung**, kein Zusatz. Nichts wird
  eingebaut, das für Screenreader-Nutzer einen Rückschritt bedeutet.
- **Stabilität vor Funktionsumfang.** Die App wird im Außendienst benutzt;
  ein Datenverlust wiegt schwerer als ein fehlendes Feature.

---

## Was 0.8.0 gebracht hat (erledigt)

| Bereich | Vorher (gemessen) | Nachher (gemessen) |
|---|---|---|
| Kopfbereich Höhe (390 px Gerät) | 330 px | **182 px** |
| Kopfbereich Höhe (360 px Gerät) | 383 px | **182 px** |
| Schnell-Tasten ohne Scrollen sichtbar | 0 von 6 | **6 von 6** |
| Waagerechter Überlauf bei 360 px | ja (368 px Scrollbreite) | **nein** |
| Inhaltsbreite bei 360 px | 328 px | 337 px |

Dazu: interaktiver Einstieg bei Erstnutzung (fünf Schritte, jederzeit
überspringbar, stellt Name, Schriftgröße, Farbschema und Sprachansagen direkt
ein).

---

## Was 0.9.0 gebracht hat (erledigt)

Umgesetzt wurden die Punkte 2, 3 und 5 der ursprünglichen 0.9.0-Liste. Bei der
Vermessung kam ein schwererer, vorher unbekannter Fehler zum Vorschein:

| Bereich | Vorher (gemessen, 360 px) | Nachher (gemessen) |
|---|---|---|
| Zähler-Tastenreihe bei „Groß" | ragt 76 px aus dem Bildschirm | **vollständig sichtbar** |
| Zähler-Tastenreihe bei „Extra groß" | ragt 163 px aus dem Bildschirm | **vollständig sichtbar** |
| Waagerechter Überlauf bei „Extra groß" | ja (436 px Inhalt) | **nein (360 px)** |
| Bedienelemente unter 44 × 44 px | 56 (über alle Ansichten) | **0** |
| Höhe einer Zählerkarte (normale Schrift) | 137 px | 133 px |

Dazu: Rückfrage und **Rückgängig** beim Monatsabschluss, keine leeren Monate
mehr im Archiv, Excel-Export aus Formular und Archiv erzeugen dieselbe Datei,
Fokusfalle des Einrichtungs-Assistenten geschlossen. Einzelheiten und
Messmethode im [DEVLOG](DEVLOG.md).

**Korrektur einer Annahme dieser Roadmap:** Punkt 3 stand hier als
„Monatsabschluss ist unumkehrbar". Das war falsch — der Monat wandert
vollständig ins Archiv und ist über die Monatsauswahl erreichbar (nachgeprüft).
Die vorgeschlagene 30-Tage-Aufbewahrung hätte ein Problem gelöst, das es nicht
gibt. Das echte Problem war die fehlende Rückfrage und der fehlende sichtbare
Rückweg; genau das ist jetzt umgesetzt.

---

## Was 0.9.4 gebracht hat (erledigt)

Die beiden 1.0-Punkte „Automatische Tests für die Rechenkerne" und
„Automatische Prüfung bei jedem Push" sind umgesetzt — vorgezogen, weil jeder
Push sofort veröffentlicht und es bis dahin **keinerlei** automatische
Kontrolle gab.

- `npm run check` prüft 37 Fälle ohne Test-Framework (`tsx` genügt):
  Zusammenführen beim Geräte-Sync inklusive der feldweisen Zeitstempel,
  Excel-Summenformeln, Arbeitszeit über Mitternacht, Backup-Ver- und
  -Entschlüsselung, stabile Textform.
- Dazu die Prüfung auf **doppelt kodierte Zeichen** in `src/` — der Fehler,
  der 0.7.0 unbemerkt live ging. Gegengeprobt: Mit absichtlich zerstörtem Text
  schlägt sie an und bricht mit Fehlercode ab.
- Der Deploy-Workflow führt `lint`, `check` und `npm audit` **vor** dem Bauen
  aus. Schlägt etwas fehl, wird nichts veröffentlicht und der bisherige Stand
  bleibt online.
- Nebenbei: Die Arbeitszeit-Berechnung lag als lokale Funktion in der über
  1000 Zeilen langen `ClockInWidget.tsx` und war dadurch nicht prüfbar. Sie
  liegt jetzt in `src/utils/timeUtils.ts` und liefert bei unbrauchbaren
  Eingaben 0 statt `NaN`.

---

## Was 0.9.5 gebracht hat (erledigt)

Vollständige Prüfung des Sync-Bereichs am laufenden System (Konzept und
Belege: [KONZEPT-0.9.5.md](KONZEPT-0.9.5.md)). Der Bereich lief in seinen
normalen Abläufen, hatte aber drei Lücken — zwei davon reproduziert:

- **Der Import prüfte die Struktur nicht.** Ein Paket mit gültigem JSON, aber
  unsinnigem Inhalt führte beim Ersetzen in den Fehlerbildschirm. Jetzt prüft
  `pruefeSyncPaket()` jedes eingehende Paket — im Sync-Fenster, im
  Live-Kanal und beim Einspielen einer Datensicherung.
- **„Alles ersetzen" löste mit einem Tipp aus.** Jetzt mit Rückfrage und
  konkreten Zahlen (Monate hier, Monate im Paket).
- **Der kopierte Textcode war unverschlüsselt**, während das Fenster zum
  Mailversand riet und gleichzeitig „ohne Zwischenspeicherung auf fremden
  Servern" versprach. Jetzt optionaler Passwortschutz (`RVC2:`, AES-GCM) und
  ehrliche Hinweise pro Übertragungsweg.

`npm run check` deckt jetzt 52 Fälle ab (vorher 37).

---

## Version 0.9.x — was offen blieb

### 1. Test auf echten Geräten (höchste Priorität, blockiert 1.0)
Bisher wurde alles in einem Desktop-Browser mit verkleinertem Fenster geprüft.
**Nicht verifizierbar war bisher:**
- Die Touch-Zweige der CSS-Regeln (`@media (pointer: coarse)`) — ein
  verkleinertes Desktop-Fenster meldet weiterhin `pointer: fine`.
- Ob sich beim Tippen auf die Zähler versehentlich Text markiert.
- Verhalten der Bildschirmtastatur: Verdeckt sie Eingabefelder? Scrollt die
  Seite korrekt nach?
- iOS-Safe-Areas (Notch, Home-Indikator) auf einem echten iPhone.
- Kamera-Sync mit zwei physischen Geräten im selben WLAN.
- Screenreader-Durchlauf mit NVDA (PC), VoiceOver (iOS), TalkBack (Android).

Ohne diese Tests ist eine 1.0 nicht seriös vertretbar.

### 2. Excel-Export im Firmenformat — ERLEDIGT in 0.9.11 (2026-08-19)
Die Zulieferung kam (`2600_apa_pd.xls`, Stand 01.2026). Umgesetzt ist mehr als
hier stand: Blatt 1 **ist** die Vorlage, kein Nachbau — die Originaldatei wird
eingebettet und nur befüllt, samt gelber Eingabefelder, Rahmen, Verbünden und
der Formel in D10. Alles, wofür die Vorlage keine Zeile hat, steht auf Blatt 2,
die Schichten auf Blatt 3.

Zwei Nebenwirkungen, die hier nicht vorhergesehen waren:
- Der Abgleich hat ein **fehlendes Feld** zutage gefördert: „Vorführungen
  Envision" (D22) gab es in der App nicht; die Zeile wäre in jedem bisherigen
  Bericht leer geblieben.
- Die Anforderung „gelbe Markierung" hat eine **neue Abhängigkeit** erzwungen
  (ExcelJS). Gemessen: SheetJS in der Community-Fassung schreibt keine
  Zellformatierung. Kosten offen dokumentiert im DEVLOG — u. a. eine bekannte
  Sicherheitsmeldung in einer Unterabhängigkeit (`uuid`).

**Nachgemessen am 2026-08-22 — die 9 Sekunden aus dem ersten Eindruck waren ein
Messfehler.** Sie bestanden vollständig aus dem einmaligen Modulladen über den
unkompilierten Dev-Server, nicht aus der Arbeit. Sauber getrennt gemessen, voller
Monat mit 22 Schichten:

| | |
|---|---|
| Modul laden (gecacht) | 13 ms |
| Erster Export | 495 ms |
| Folgeexporte | 83–144 ms (Median 139) |

Ein Fortschrittshinweis ist damit nicht nötig. Was auf dem Handy hinzukommt, ist
das einmalige Herunterladen des ExcelJS-Chunks (271 KB gzip) — danach liegt er
im Cache des Service Workers.

### 3. Status je Monat im Archiv — ERLEDIGT in 0.9.12 (2026-08-22)
Jeder Monat trägt jetzt ein Abzeichen „Gesendet TT.MM.JJJJ" oder „Noch offen" —
**in der Kopfzeile, nicht im ausklappbaren Teil**, weil der ganze Zweck ist,
offene Monate zu sehen, ohne jeden einzeln aufzuklappen. Der Stand wird beim
Export automatisch gesetzt (nur bei tatsächlich geteilter oder
heruntergeladener Datei — ein abgebrochener Teilen-Dialog markiert nichts) und
lässt sich von Hand korrigieren.

Der nicht offensichtliche Teil war der Geräte-Abgleich: Die Markierung läuft
über einen **eigenen** Zeitstempel (`sentUpdatedAt`), nicht über `savedAt`.
Sonst hätte eine spätere Zahleneingabe auf dem zweiten Gerät die Markierung des
ersten gelöscht — derselbe Fehler, der bis 0.9.0 die Zählerstände traf. Als
Prüffall reproduziert.

---

## Version 1.0 — „Abnahmefähig"

### 4. TypeScript-Strict-Modus
`tsconfig.json` hat `strict` nicht gesetzt. Genau die Null- und
Undefined-Fehler, die dadurch unsichtbar bleiben, mussten bisher von Hand
gefunden werden (z. B. „undefined" im Notizfeld, fehlender Monat beim Laden).
Die beste Versicherung gegen künftige Fehler dieser Art.

### 5. `App.tsx` aufteilen
Die Datei hat rund 3.500 Zeilen und enthält Zustand, Speicherlogik, Export,
Sprachausgabe und die komplette Oberfläche. Jede Änderung daran ist riskanter
als nötig. Aufteilen in Bereiche (Formular, Export, Speicher, Sprache).

### 6. Screenreader-Abnahme
Vollständiger Durchgang durch alle Bereiche mit NVDA und VoiceOver. Das kann
nur der Nutzer selbst leisten; das Ergebnis entscheidet über die 1.0.

---

## Danach (1.x) — bewusst später

- **Kopplung der Live-Verbindung vereinfachen** (zurückgestellt am 2026-08-02).
  Marc: „so ist es zu komplex". Geprüft: Mit **einem einzigen** Code ist es
  technisch nicht machbar — WebRTC handelt die Verbindung zwischen beiden
  Geräten aus, der Code von A enthält A's Verbindungsdaten, die Antwort von B
  enthält B's, und keines lässt sich aus dem anderen oder einem gemeinsamen
  Kennwort berechnen. Ein Code ginge nur über einen Vermittlungsserver, den
  die DSGVO-Zusage ausschliesst. **Machbar ist:** den Zwischenschritt
  „Antwort-Code empfangen (Schritt 2)" abschaffen — Gerät A geht automatisch
  in den Empfangsmodus, während es seinen Code zeigt. Dann bleibt: B scannt A,
  B zeigt an, A scannt B, ohne Knopfdruck dazwischen. Zusätzlich sollte die
  **Einmal-Übertragung** im Sync-Fenster nach vorn — sie braucht ohnehin nur
  eine Richtung und damit einen Code (gemessen: ein Monat = 1015 Zeichen
  Textcode bzw. 3 automatisch wechselnde QR-Codes, ein ganzes Jahr = 1328
  Zeichen). Die Live-Verbindung ist nur nötig, wenn beide Geräte dauerhaft
  gleichauf bleiben sollen.
- **Termin-Logbuch (optional!).** Jeder Tipp erzeugt zusätzlich einen Eintrag
  mit Datum und Notiz, sodass Zahlen belegbar werden und der Excel-Export ein
  zweites Blatt mit der Terminliste enthalten kann. **Muss abschaltbar sein** —
  reine Zähler bleiben der Standardweg.
- **Bündelung mehrerer Kategorien** („Vorführung + Schulung beim selben
  Kunden") als ein Vorgang.
- **Jahresübersicht** über mehrere Monate hinweg.

---

## Bewusst NICHT geplant

- **Einklappbare Formularbereiche.** Eingeklappter Inhalt ist für
  Screenreader-Nutzer nicht erreichbar, und die Suchfunktion liefe ins Leere,
  wenn ein Treffer in einem geschlossenen Bereich liegt.
- **Cloud-Synchronisation / Nutzerkonten.** Widerspricht der DSGVO-Zusage. Die
  Geräte-Kopplung bleibt direkt von Gerät zu Gerät.
- **Fremd-Schriften von externen Diensten** (Google Fonts o. Ä.) — gleicher
  Grund.
- **Push-Benachrichtigungen über einen Server.** Die Monatserinnerung wird
  weiterhin lokal von der App selbst ausgelöst.

---

## Offene Fragen an den Auftraggeber

1. **Excel-Originalvorlage** — wird für Punkt 2 gebraucht.
2. **Welcher Deploy-Weg gilt?** Es existieren zwei parallele: `npm run deploy`
   (Branch `gh-pages`) und ein GitHub-Actions-Workflow, der bei jedem Push auf
   `main` automatisch veröffentlicht. Beide laufen tatsächlich. Welcher die
   Live-Version bestimmt, hängt von den Repository-Einstellungen ab und ist
   ungeklärt — solange das so ist, geht **jeder** Push potenziell sofort live.
3. **Soll es mehrere Nutzer auf einem Gerät geben können?** Aktuell ist die App
   auf eine Person ausgelegt.
