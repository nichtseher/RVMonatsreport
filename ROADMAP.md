# Roadmap — RV Monatsreport (RV Mobil)

Stand: 2026-08-02, Version 0.8.0

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

## Version 0.9.0 — „Verlässlich im Alltag"

Schwerpunkt: die letzten Stolpersteine im täglichen Gebrauch beseitigen.

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

### 2. Touch-Ziele vergrößern
Gemessen: **49 Bedienelemente unter 44 × 44 px** (Apple-HIG- und
WCAG-AAA-Empfehlung). Die verbindliche AA-Grenze von 24 px wird überall
eingehalten — es ist also **kein Normverstoß**, aber für einhändige Bedienung
unterwegs und für Nutzer mit motorischen Einschränkungen spürbar. Betroffen
sind vor allem die kleinen Umschalter („Kompakt", „Ziele", „Vorlesen") und die
Schnell-Optionen-Leiste.

### 3. Entwurfs-Sicherung für den Monatsabschluss
Heute ist „Monat abschließen & neu starten" unumkehrbar. Vorschlag: Der
abgeschlossene Monat bleibt 30 Tage als wiederherstellbarer Stand erhalten,
mit einem Hinweis im Archiv. Schützt vor dem teuersten Fehler, den ein
Außendienstler machen kann.

### 4. Excel-Export im Firmenformat
Zurückgestellt, weil die Originalvorlage noch fehlt. Sobald sie vorliegt: Der
Export soll exakt dem internen Formular entsprechen (gleiche Zellen,
Reihenfolge, Summenzeilen), damit die Vertriebsleitung nichts nacharbeiten
muss. **Braucht eine Zulieferung.**

### 5. Doppelten Excel-Code zusammenführen
Die Export-Logik existiert zweimal (`utils/excelUtils.ts` und inline in
`App.tsx`). Jede Änderung muss aktuell an zwei Stellen erfolgen — eine
klassische Fehlerquelle. Rein technisch, für den Nutzer unsichtbar, aber
Voraussetzung für Punkt 4.

---

## Version 1.0 — „Abnahmefähig"

### 6. TypeScript-Strict-Modus
`tsconfig.json` hat `strict` nicht gesetzt. Genau die Null- und
Undefined-Fehler, die dadurch unsichtbar bleiben, mussten bisher von Hand
gefunden werden (z. B. „undefined" im Notizfeld, fehlender Monat beim Laden).
Die beste Versicherung gegen künftige Fehler dieser Art.

### 7. `App.tsx` aufteilen
Die Datei hat rund 3.500 Zeilen und enthält Zustand, Speicherlogik, Export,
Sprachausgabe und die komplette Oberfläche. Jede Änderung daran ist riskanter
als nötig. Aufteilen in Bereiche (Formular, Export, Speicher, Sprache).

### 8. Automatische Tests für die Rechenkerne
Bisher gibt es **keine Tests**. Sinnvoll für: Arbeitszeit über Mitternacht,
Excel-Summenformeln, Zusammenführen beim Geräte-Sync, Ver-/Entschlüsselung des
Backups. Das sind die Stellen, an denen ein Fehler echten Schaden anrichtet.

### 9. Automatische Prüfung bei jedem Push
Aktuell laufen `lint` und `build` nur, wenn jemand daran denkt. Eine
GitHub-Action, die beides plus `npm audit` bei jedem Push ausführt, hätte den
Encoding-Schaden zwar nicht gefunden (siehe unten), aber sie fängt alles ab,
was den Build bricht. **Zusätzlich nötig:** eine Prüfung auf doppelt kodierte
Zeichen — genau dieser Fehler ging unbemerkt live.

### 10. Screenreader-Abnahme
Vollständiger Durchgang durch alle Bereiche mit NVDA und VoiceOver. Das kann
nur der Nutzer selbst leisten; das Ergebnis entscheidet über die 1.0.

---

## Danach (1.x) — bewusst später

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

1. **Excel-Originalvorlage** — wird für Punkt 4 gebraucht.
2. **Welcher Deploy-Weg gilt?** Es existieren zwei parallele: `npm run deploy`
   (Branch `gh-pages`) und ein GitHub-Actions-Workflow, der bei jedem Push auf
   `main` automatisch veröffentlicht. Beide laufen tatsächlich. Welcher die
   Live-Version bestimmt, hängt von den Repository-Einstellungen ab und ist
   ungeklärt — solange das so ist, geht **jeder** Push potenziell sofort live.
3. **Soll es mehrere Nutzer auf einem Gerät geben können?** Aktuell ist die App
   auf eine Person ausgelegt.
