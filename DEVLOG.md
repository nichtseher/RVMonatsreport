# Devlog — RV Monatsreport (RV Mobil)

Chronologisches Entwicklungsprotokoll. Jeder Eintrag ab dem 2026-07-31-Block
ist von Claude verifiziert (Code gelesen, `tsc --noEmit` + `npm run build`
ausgeführt, betroffene Abläufe im Browser getestet) — nicht nur aus
Commit-Nachrichten übernommen. Ältere Einträge (bis 2026-07-19) sind aus der
Git-Historie rekonstruiert, bevor diese Zusammenarbeit begann; dort ist nur
dokumentiert, was der Commit-Verlauf objektiv zeigt (Datum, Umfang, Titel),
nicht die Beweggründe dahinter.

---

## 2026-08-02 — v0.8.1: Zwei Farbsysteme zusammengeführt, Navigation vereinheitlicht

Anlass: die Frage, ob das Design durchgängig ist. Der Audit förderte keinen
Schönheitsfehler zutage, sondern einen Lesbarkeits-Fehler.

### Befund: zwei Farbsysteme, die gegeneinander arbeiteten

Die App nutzte parallel:
- ein eigenes Theme-System über CSS-Variablen (915 Verwendungen) — folgte
  korrekt der App-Einstellung;
- **192 Tailwind-`dark:`-Regeln in allen 15 Komponenten** — diese folgen
  standardmäßig `prefers-color-scheme`, also der **Betriebssystem**-Einstellung,
  völlig unabhängig davon, was der Nutzer in der App wählt.

Belegt durch Messung: Der Hintergrund der Zählerkarten war bei *allen drei*
App-Themes identisch, während sich nur die Textfarbe änderte.

| Situation | gemessener Kontrast |
|---|---|
| App „Hell“ + Gerät im Dunkelmodus | **1,18 : 1** |
| Theme „Gelb auf Schwarz“ | **1,05 : 1** bei 51 von 141 Elementen |

Der erste Fall ist Alltag (Dunkelmodus ist auf Handys verbreitet), der zweite
trifft ausgerechnet das Schema für Nutzer mit dem größten Kontrastbedarf.

### Messfehler im eigenen Prüfskript (wichtig für künftige Audits)

Der erste Messdurchlauf lieferte unbrauchbare Zahlen (u. a. „Kontrast 1,0“ für
sichtbar korrekte Elemente). Ursache: Tailwind 4 gibt Farben als `oklch()` aus;
das Skript hatte die Zahlen als RGB gelesen. Korrektur: Farben über ein
1×1-Canvas auflösen lassen, dann stimmen alle Formate. **Erst danach waren die
Zahlen belastbar** — die zuvor gemeldeten Werte wären falsch gewesen.

### Umsetzung

1. `@custom-variant dark` in `index.css` bindet `dark:` an ein Attribut
   `data-dark`, das `App.tsx` passend zum gewählten Theme setzt (gesetzt für
   `dark`, `high-contrast-dark`, `high-contrast-yellow`).
2. Für die beiden Hochkontrast-Schemata werden fest verdrahtete Palettenfarben
   (`bg-slate-50`, `text-emerald-700`, …) per CSS auf die Theme-Farben
   gezwungen — so arbeitet auch der Hochkontrast-Modus von Windows. Ohne das
   wären dort weiterhin Karten in Grautönen mit gelber Schrift erschienen.
3. Neue Variable `--accent-text` pro Theme: Schriftfarbe **auf** der
   Akzentfläche. Neun Stellen nutzten `text-white` auf `bg-[var(--accent)]` —
   im Hochkontrast-Schema war das weiß auf weiß (Kontrast 1,0), im
   Dunkel-Schema 2,28:1.
4. `--primary` im Dunkel-Schema von `#3b82f6` auf `#2563eb` (weiße Schrift:
   3,68 → 5,17:1) und ein Hinweistext von `emerald-600` auf `-700` (3,65 → über
   4,5:1).

**Ergebnis, in allen vier Schemata nachgemessen: 0 von 141 Textelementen unter
4,5:1** (vorher u. a. 51 im Gelb-Schema).

### Navigation vereinheitlicht

Bestandsaufnahme ergab drei verschiedene Muster — und einen Widerspruch:
`CarryoverModal`, `ManageModal` und `SecureBackupModal` zeigten ein
**Schließen-Kreuz**, ihre Screenreader-Beschriftung lautete aber **„Zurück“**.
Sehende und blinde Nutzer bekamen also unterschiedliche Aussagen.

Alle Ansichten nutzen jetzt dasselbe Muster (wie zuvor schon Changelog und
Optionen): Zurück-Pfeil als erstes Element der Kopfzeile, mit Zielangabe in der
Beschriftung („Zurück zu den Optionen“, „Zurück zur Zeiterfassung“).
Umgestellt: Hilfe, Datensicherung, Formularfelder verwalten, Jahreskonto,
Geräte-Sync. Im Browser geprüft: kein Schließen-Kreuz mehr vorhanden, überall
identische Beschriftung.

### Offen

Die Zählerzeilen haben je **vier** Knöpfe (`-5`, `−`, `+`, `+5`). Für
Screenreader sind die `±5`-Knöpfe ausgeblendet (`aria-hidden`, nicht im
Tab-Fokus), sehende Nutzer sehen jedoch scheinbar doppelte Plus- und
Minus-Tasten. Noch nicht geändert — Rückfrage beim Auftraggeber läuft.

---

## 2026-08-02 — v0.8.0: Handy-Optimierung und geführter Einstieg

### Ausgangsmessung (390 × 844 iPhone-Größe, 360 × 800 Android)

Vor jeder Änderung gemessen, statt geschätzt:

| Wert | 390 px | 360 px |
|---|---|---|
| Kopfbereich Höhe | 330 px (39 % des Bildschirms) | 383 px (47 %) |
| davon Stammdaten-Block | 212 px | — |
| Schnell-Erfassung beginnt bei | y = 423 px | y = 476 px |
| Erstes Zählerfeld bei | y = 1521 px (**180 % der Bildschirmhöhe**) | — |
| Seitlicher Rand | 32 px (8 % der Breite) | 32 px (9 %) |

### Gefundener Fehler: waagerechter Überlauf auf schmalen Android-Geräten

Bei 360 px Breite ließ sich die Seite seitlich verschieben (Scrollbreite
368 px). Zwei Verursacher ermittelt: der „Anpassen“-Knopf in der
Schnell-Erfassung (7 px Überstand, weil die Überschriftzeile nicht umbrach) und
ein langer Kategoriename (`Anzahl Teilnahme Veranstaltungen/Messen/…`, 9 px
Überstand, weil der Text nicht umbrechen konnte). Behoben mit `min-w-0`,
`flex-wrap` und `break-words`.

### Platz zurückgewonnen

Der Stammdaten-Block (Monat + Name) stapelte sich auf dem Handy untereinander,
weil er erst ab 640 px nebeneinander lief — auf keinem Telefon also. Umgestellt
auf zwei Spalten ab der kleinsten Breite. Zusätzlich zwei Doppelungen entfernt:
der Hinweis „🔒 DSGVO-sicher lokal“ (steht bereits im Kopf-Abzeichen) und der
Link „Monats-Archiv“ (das Archiv liegt in der Hauptnavigation). Abstände auf
dem Handy verkleinert, Seitenrand von 16 auf 12 px.

**Ergebnis, nachgemessen:**

| Wert | vorher | nachher |
|---|---|---|
| Kopfbereich (390 px) | 330 px | **182 px** |
| Kopfbereich (360 px) | 383 px | **182 px** |
| Schnell-Tasten ohne Scrollen sichtbar | 0 von 6 | **6 von 6** |
| Waagerechter Überlauf (360 px) | ja | **nein** |
| Inhaltsbreite (360 px) | 328 px | 337 px |

Damit ist die Kernfunktion der App — direkt nach dem Termin eine Zahl
erfassen — ohne einen einzigen Wischvorgang erreichbar.

### Geführter Einstieg (`OnboardingModal.tsx`)

Fünf Schritte, die jeweils **etwas einstellen**, statt nur zu begrüßen:
Willkommen → Name → Sehen und Hören (Schriftgröße, Farbschema,
Sprachansagen) → Schnell-Erfassung erklärt → Datenschutz und Backup-Hinweis.

Besonders relevant für die Zielgruppe: Schriftgröße und Farbschema lassen sich
sofort setzen, statt sie erst in den Optionen suchen zu müssen. Beim Punkt
Sprachansagen steht ausdrücklich der Hinweis, dass Nutzer eines echten
Screenreaders diese Option normalerweise **aus** lassen sollten, um nicht alles
doppelt zu hören.

Barrierefreiheit: `role="dialog"` mit Fokusfalle, Fokus springt bei jedem
Schrittwechsel auf die neue Überschrift, Fortschritt ist als Text *und* als
`progressbar` vorhanden, jederzeit überspringbar.

**Erkennung bestehender Nutzer:** Der Einstieg erscheint nur, wenn weder eine
Markierung gesetzt ist noch Daten existieren (Archiv, Name oder Zählerstände).
Bestehende Nutzer bekommen die Markierung still gesetzt, damit der Einstieg
nicht nachträglich aufpoppt. Schlägt das Laden der Daten fehl, wird der
Einstieg **nicht** gezeigt — der Nutzer könnte Daten haben, die nur gerade
nicht lesbar waren.

**Verifiziert** mit komplett geleertem `localStorage` und IndexedDB: Einstieg
erscheint, Fortschrittsanzeige korrekt ausgezeichnet, Name landet im Formular,
Schriftgröße wirkt sofort (16 → 24 px gemessen), Farbschema wechselt, nach
Abschluss bleiben alle Einstellungen erhalten und der Einstieg erscheint beim
Neuladen nicht erneut.

### Weiterhin offen

- 49 Bedienelemente liegen unter 44 × 44 px (Apple-HIG/WCAG-AAA-Empfehlung).
  Die verbindliche AA-Grenze von 24 px wird überall eingehalten — also **kein**
  Normverstoß, aber für einhändige Bedienung verbesserungswürdig. Steht in der
  Roadmap für 0.9.0.
- Alles Touch-spezifische bleibt unverifiziert (siehe `ROADMAP.md`, Punkt 1):
  Ein verkleinertes Desktop-Fenster meldet weiterhin ein Zeigegerät mit Maus.

Neu angelegt: `ROADMAP.md` mit dem Plan bis 1.0.

---

## 2026-08-02 — v0.7.0: Encoding-Notfall, Lesbarkeit, Desktop, barrierefreie Dialoge

### Encoding-Schaden (selbst verursacht, war live)

Beim Prüfen der Desktop-Ansicht fiel auf, dass `src/App.tsx` **149 beschädigte
Zeichen** enthielt. Ursache: ein früherer Bulk-Replace über PowerShell
`Set-Content -Encoding utf8`. PowerShell 5.1 las die UTF-8-Datei als CP1252 und
schrieb sie als UTF-8 zurück — **doppelt kodiert**, plus BOM. Betroffen waren
279 Zeichenfolgen: alle deutschen Umlaute in nutzersichtbaren Texten
(`"Anzahl VorfÃ¼hrungen Schule/Bildung"`) und **alle 72 Emojis**
(`icon: "ðŸ«"`).

**Warum es durch alle Prüfungen rutschte:** `tsc --noEmit` und `vite build`
liefen sauber (Mojibake ist gültiges UTF-8, nur mit falschen Zeichen). Auch die
Browser-Tests zeigten korrekten Text — weil die Feldnamen bei bestehenden
Nutzern aus dem `localStorage` kommen, der noch die alten, korrekten Werte
hielt. Nur ein **neuer** Nutzer mit leerem Speicher hätte die kaputte
`DEFAULT_FIELDS_CONFIG` gesehen. Der Fehler ging so in Produktion.

**Reparatur:** Eine pauschale Umkehrung war nicht möglich, weil die Datei
gemischt war (spätere Edits hatten korrektes UTF-8 geschrieben) — ein erster
Versuch brach mit Ersatzzeichen ab. Stattdessen gezielt: nur Zeichenfolgen
ersetzen, die als CP1252-Bytes eine **gültige UTF-8-Sequenz** ergeben.
Korrektes „ü“ (Byte 0xFC) ist kein gültiges UTF-8-Startbyte und blieb dadurch
unangetastet. Verifiziert gegen den letzten sauberen Stand `00bb057`: alle 67
Umlaut-Wörter vorhanden, Emojis 72/72 exakt, 0 Mojibake, kein BOM. Anschließend
im Browser mit **komplett geleertem `localStorage` UND IndexedDB** geprüft.
Sofort deployed (`07e142e`).

**Konsequenz festgehalten** in `CLAUDE.md`: Quelldateien nie mit PowerShell
schreiben; Änderungen an Standardwerten immer mit leerem Speicher testen.

### Lesbarkeit: Schrift-Einstellung wirkte auf 80 Elemente gar nicht

Verifizierter Befund: Rund 80 Beschriftungen nutzten feste Pixelgrößen
(`text-[9px]`, `text-[10px]`). Feste px-Werte reagieren **nicht** auf die
Schriftgrößen-Einstellung der App (die über `html { font-size }` skaliert).
Gemessen: Bei „Extra groß“ wuchs normaler Text von 16 auf 18 px, die kleinen
Beschriftungen blieben bei **10 px** — ein Verstoß gegen WCAG 1.4.4 für genau
die Zielgruppe, die die Einstellung braucht.

Fix: 97 Vorkommen in 12 Dateien von px auf `rem` umgestellt (8/9px → 11px,
10/11px → 12px als Basis). Gemessen nach der Änderung: kleinste Schrift 11 px,
bei „Extra groß“ **16,5 px** — skaliert jetzt mit. Kein waagerechter Überlauf
auf 375 px Breite.

### Desktop-Ansicht praktikabel gemacht

Gemessen auf 1920 px mit Standardeinstellungen: Inhalt 672 px breit,
**1248 px (65 %) ungenutzt**, dazu die schwebende Handy-Navigationsleiste. Das
gute Desktop-Layout (Seitenleiste + zwei Spalten) existierte bereits, war aber
per Voreinstellung **aus** und in den Optionen versteckt.

- Desktop-Layout schaltet sich jetzt ab 1024 px Fensterbreite selbst ein
  (`matchMedia`), die ausdrückliche Einstellung behält Vorrang. Gemessen:
  genutzte Breite 672 → **1440 px**.
- `user-select: none` galt global → am PC ließ sich kein Text markieren oder
  kopieren. Jetzt per `@media (pointer: fine)` wieder freigegeben, auf Touch
  weiterhin gesperrt (verhindert versehentliches Markieren beim Tippen).
- Scrollbalken waren global ausgeblendet (gemessene Breite 0 px) → am PC keine
  Positions- oder Längenanzeige. Jetzt nur noch auf Touch versteckt; gemessen:
  15 px sichtbar.
- Tastenkürzel waren nirgends dokumentiert → neuer Hilfe-Abschnitt, die Kürzel
  direkt aus dem Code in `App.tsx` übernommen (nicht aus dem Gedächtnis).

### Barrierefreie Bestätigungsdialoge

`window.confirm()` wird von NVDA/JAWS unzuverlässig vorgelesen, ist nicht
gestaltbar (ignoriert Hochkontrast-Themes und Schriftgröße) und wirkt mobil
wie ein Fremdkörper. Neue Komponente `src/components/ConfirmDialog.tsx`:
`role="alertdialog"`, Fokusfalle, Escape, Fokus-Rückgabe an das auslösende
Element, Startfokus bewusst auf **Abbrechen**. Ersetzt fünf `confirm()`-Aufrufe
in `App.tsx` und `ClockInWidget.tsx`. Der Monatsabschluss-Check zeigt seine
Warnungen jetzt als echte Liste statt als Text mit Aufzählungszeichen.

**Bewusste Ausnahme:** Das `confirm()` in `ErrorBoundary.tsx` bleibt. Das ist
der Absturz-Bildschirm — wenn der React-Zustand beschädigt ist, muss der
Not-Reset ohne eigene Komponenten funktionieren. Als Kommentar im Code
begründet.

Verifiziert: Dialog hat `role="alertdialog"`, `aria-modal`, verknüpftes Label
und Beschreibung; Startfokus auf „Erst korrigieren“; Escape schließt; Fokus
kehrt zum auslösenden Knopf zurück.

### Kontrast und Schriftart

- `--border-color` hatte nur **1,48:1** gegen die Karte — Rahmen praktisch
  unsichtbar. Zielwerte berechnet statt geschätzt: hell `#8593a8` (3,12:1),
  dunkel `#556780` (3,09:1), beide über der WCAG-1.4.11-Grenze von 3:1. Die
  zwei Hochkontrast-Themes blieben unangetastet (weiterhin 21:1 bzw. 19,6:1).
- `--font-sans` deklarierte „Inter“, aber es wurde **keine Schrift geladen**
  (0 Webfonts, verifiziert) — die App nutzte je nach System eine andere
  Schrift. Da externe Schriftdienste wegen der DSGVO-Zusage ausscheiden: durch
  einen bewussten System-Schriftstapel ersetzt.

### Nicht umgesetzt (bewusst)

Einklappbare Formularbereiche wurden verworfen: Eingeklappter Inhalt ist für
Screenreader-Nutzer nicht erreichbar, und die Suchfunktion würde ins Leere
laufen, wenn ein Treffer in einem geschlossenen Bereich liegt.

### Nicht verifizierbar in dieser Umgebung

Die Touch-Zweige der neuen CSS-Regeln (`@media (pointer: coarse)`: versteckte
Scrollbalken, gesperrte Textauswahl) konnten **nicht** geprüft werden — ein auf
Handygröße verkleinertes Desktop-Fenster meldet weiterhin `pointer: fine`. Das
braucht einen Test auf einem echten Touchgerät.

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
