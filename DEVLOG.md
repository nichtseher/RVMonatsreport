# Devlog — RV Monatsreport (RV Mobil)

Chronologisches Entwicklungsprotokoll. Jeder Eintrag ab dem 2026-07-31-Block
ist von Claude verifiziert (Code gelesen, `tsc --noEmit` + `npm run build`
ausgeführt, betroffene Abläufe im Browser getestet) — nicht nur aus
Commit-Nachrichten übernommen. Ältere Einträge (bis 2026-07-19) sind aus der
Git-Historie rekonstruiert, bevor diese Zusammenarbeit begann; dort ist nur
dokumentiert, was der Commit-Verlauf objektiv zeigt (Datum, Umfang, Titel),
nicht die Beweggründe dahinter.

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
