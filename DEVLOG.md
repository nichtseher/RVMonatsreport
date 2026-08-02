# Devlog — RV Monatsreport (RV Mobil)

Chronologisches Entwicklungsprotokoll. Jeder Eintrag ab dem 2026-07-31-Block
ist von Claude verifiziert (Code gelesen, `tsc --noEmit` + `npm run build`
ausgeführt, betroffene Abläufe im Browser getestet) — nicht nur aus
Commit-Nachrichten übernommen. Ältere Einträge (bis 2026-07-19) sind aus der
Git-Historie rekonstruiert, bevor diese Zusammenarbeit begann; dort ist nur
dokumentiert, was der Commit-Verlauf objektiv zeigt (Datum, Umfang, Titel),
nicht die Beweggründe dahinter.

---

## 2026-08-02 — v0.9.3: Durchsicht der Codebase, Hilfetexte und Ladezeit

Anlass: Marcs Frage, ob die Codebase sauber ist, ob die Hilfetexte wirklich
helfen und wo es Optimierungen gibt. Alle drei Punkte geprüft, die Funde
abgearbeitet.

### 1. Stiller Datenverlust beim Wiederherstellen und Zusammenführen

Der schwerste Fund der Durchsicht. Das Archiv wurde an zwei Stellen mit
`.catch(() => {})` in die IndexedDB geschrieben — beim Einspielen einer
Datensicherung und beim Zusammenführen zweier Geräte. Schlägt der
Schreibvorgang fehl (Speicher voll, IndexedDB blockiert), meldete die App
trotzdem „Backup erfolgreich geladen!" — und nach dem nächsten Öffnen wäre
alles weg gewesen.

Genau diese Fehlerklasse hatte das Stabilitäts-Audit vom 2026-08-01 für den
Autospeicher behoben und dafür `persistHistory(…, handleHistoryPersistFailure)`
eingeführt; **diese beiden Pfade nutzten es nicht.** Jetzt schon: Ein
Fehlschlag setzt den persistenten Warnbanner und wird angesagt. Die Sicherung
beim Wechsel in den Hintergrund schluckt ihren Fehler ebenfalls nicht mehr
komplett (Konsole) — dort ist er unkritisch, weil die Notfallkopie in
localStorage greift.

### 2. Hilfetexte: vier Aussagen stimmten nicht mehr

Jede Sachaussage gegen den Code geprüft. **Korrekt waren** alle sieben
Tastenkürzel (einzeln nachgesehen), die Backup-Endungen, was die Stempeluhr
automatisch überträgt, „Empfängeradresse ist nicht hinterlegt", die
Acht-Kategorien-Grenze, Suchleiste und Sprunglink.

Falsch bzw. veraltet und jetzt korrigiert:

| Stelle | war | ist |
|---|---|---|
| Monat abschließen | „Sobald Sie den Knopf drücken, passieren zwei Dinge" | Rückfrage vorweg, danach **Rückgängig** — beides erklärt (seit 0.9.0 vorhanden, in der Hilfe gefehlt) |
| Schnell-Erfassung | „Ein Tipp = plus eins" | stimmt für Zähler; die selbst wählbaren Stunden-Felder aus Bereich 4 zählen in **halben Stunden** |
| Live-Verbindung | „endet, wenn Sie trennen oder die App schließen" | dritter Fall ergänzt: bricht sie ab, meldet die App das (0.9.2); dazu das feldweise Zusammenführen aus 0.9.1 |
| Backup-Passwort | „tragen Sie es in das Passwortfeld ein" | benennt jetzt das konkrete Feld |

Beim letzten Punkt liess sich die Hilfe gar nicht sauber formulieren, weil die
Oberfläche zwei Passwortfelder hatte, die abwechselnd erschienen — je nachdem,
ob das Häkchen „Backup mit Passwort schützen" gesetzt war. Beide schrieben in
denselben Zustand, aber beim Wiederherstellen sah man ein Feld mit der
Aufforderung „Sicheres Passwort vergeben", obwohl man ein vorhandenes Passwort
eingeben sollte. Jetzt: **ein** Feld, beschriftet „Passwort", mit einem
Hinweistext, der sich nach dem Häkchen richtet. Nebenbei die einzige Stelle
korrigiert, die den Nutzer duzte („Bitte gib …").

### 3. Ladezeit: Start-Bundle mehr als halbiert

Gemessen: Das Start-Bundle enthielt QR-Erzeugung, Kamera-Scanner und die
Animationsbibliothek — alles nur im Geräte-Sync bzw. in der Datensicherung
gebraucht, beides auf der Startseite nie geöffnet.

| | vorher | nachher |
|---|---|---|
| Start-Bundle | 996 KB (288 KB gzip) | **477 KB (129 KB gzip)** |
| nachgeladen: Geräte-Sync | — | 383 KB (115 KB gzip) |
| nachgeladen: Animationen | — | 125 KB (41 KB gzip) |
| nachgeladen: Datensicherung | — | 10 KB (3 KB gzip) |

**55 % weniger JavaScript bei jedem Start und nach jeder Aktualisierung.**
Umgesetzt mit `React.lazy` + `Suspense` und einem sichtbaren Platzhalter.

### 4. Aufräumen

`formatMonthGerman` existierte **dreimal**: in `utils/dateUtils.ts`, als
lokale Kopie in `App.tsx` und nochmal in `HistoryModal.tsx` — dort wurde die
Util-Funktion sogar importiert und anschliessend von der lokalen überdeckt,
der Import war tot. Jetzt eine Quelle. `CLAUDE.md` an zwei überholten Stellen
berichtigt (Excel-Export ist seit 0.9.0 nicht mehr doppelt; die Deploy-Frage
ist geklärt).

### Geprüft

`npm run lint` und `npm run build` fehlerfrei. Im Browser: Zähler weiter
funktionsfähig, beide nachgeladenen Bereiche öffnen sich, Datensicherung als
vollständiger Umlauf **mit Verschlüsselung** — Backup mit Passwort erzeugt
(Endung `.json.enc`, Inhalt tatsächlich verschlüsselt), Wert danach von 7 auf 9
geändert, Datei ohne Passwort eingespielt → saubere Fehlermeldung, danach mit
Passwort → Wert steht wieder auf 7.

### 5. Platz im RV Report (nach Marcs Entscheidung)

Zur Auswahl standen: Umschalter in die Optionen verschieben, auf eine Zeile
eindampfen oder so lassen. Marc wählte das Eindampfen, dazu den Fristen-Hinweis
nur noch bei Bedarf.

- **Schnell-Optionen auf eine Zeile.** Die Überschrift „Schnell-Optionen" ist
  entfallen (der Bereich trägt sie jetzt als `aria-label` am `role="toolbar"`),
  die „Ein/Aus"-Plaketten sind durch `aria-pressed` bzw. `aria-expanded`
  ersetzt — das lesen Screenreader von sich aus vor, es kostet aber keinen
  Platz. „Vorlage laden" heisst nur noch „Vorlage".
- **Fristen-Hinweis nur im relevanten Zeitfenster.** Der allgemeine Merksatz
  stand alle 31 Tage im Monat da. Jetzt erscheint er in den letzten fünf Tagen
  des Monats und bis zum 8. des Folgemonats; die dringende Variante (rot,
  ungesendete Zahlen) ist unverändert. Die Berechnung des Monatsletzten wurde
  gegen Februar, Schaltjahr-Februar, 30- und 31-Tage-Monate geprüft.

Gemessen auf einem 390-px-Handy:

| | vorher | nachher |
|---|---|---|
| Block „Schnell-Optionen" | 203 px, 2 Tastenzeilen | **126 px, 1 Zeile** |
| Fristen-Hinweis | immer 80 px | nur an ~13 Tagen im Monat |
| erster Zählerbereich beginnt bei | 1256 px | **1171 px** (mitte Monat nochmals 80 px früher) |
| Gesamtlänge der Seite | 5285 px | 5166 px |

### 6. Changelog als Beta gekennzeichnet

Alle 13 Versionseinträge tragen jetzt eine „Beta"-Plakette neben der
Überschrift (Kontrast geprüft: 6,4 / 10,4 / 21 / 19,6 in den vier Farbschemata).

---

## 2026-08-02 — v0.9.2: Verbindungsabbruch wird gemeldet, Paketform entschlackt

Die drei Punkte, die beim Live-Sync-Audit (0.9.1) offen geblieben waren.

### 1. Abbruch der Live-Verbindung blieb stumm

Bisher verschwand bei einem Abbruch nur das grüne Abzeichen im Kopfbereich.
Die Erklärung stand ausschließlich im Sync-Fenster — das man beim Arbeiten
nicht offen hat. Wer gerade Zahlen eintippt, bemerkt nichts und hält beide
Geräte weiter für gleichauf.

Dazu kam ein Loch in der Erkennung: `ch.onclose` (die Gegenseite schließt den
Kanal, weil dort die App zugeht oder das Gerät sperrt) setzte lediglich
`connected = false`, aber **nicht** `failed`. Genau der häufigste Fall meldete
also gar nichts.

**Umsetzung:** Gemeinsame Funktion `verbindungVerloren()` in `liveSync.ts`, an
`onclose` und an den Verbindungszustand gehängt. Damit gewolltes Trennen nicht
als Abbruch durchgeht, hängt `closePeerOnly()` die Handler jetzt ab, *bevor*
geschlossen wird — sonst hätte der eigene Knopf „Verbindung trennen" eine
Abbruch-Warnung ausgelöst. In `App.tsx` ein Hinweisstreifen (`role="alert"`)
mit „Neu verbinden" und „Ausblenden" plus Sprachansage.

### 2. Toter Schlüssel im Sync- und Backup-Paket

`buildSyncPayload` schickte zusätzlich `timeLogs` mit. Die Gegenseite hat den
Schlüssel nie gelesen — weder `mergeSyncPayload` (der ihn in `SyncPayload`
gar nicht kennt) noch die Ersetzen-Variante. Reiner Ballast in jeder Nachricht
und in jeder Datensicherung; die Schichten stecken ohnehin in `reportData` und
im Archiv. Entfernt. Für ältere Gegenstellen unkritisch: Sie ignorieren den
Schlüssel ebenso, und ältere Backups mit dem Schlüssel lassen sich weiterhin
einspielen.

### 3. Paketform und Wiedereinspielen waren doppelt

Die Paketform wurde an zwei Stellen gebaut (Geräte-Sync und Datensicherung),
das Wiedereinspielen ebenfalls — fast gleich, mit dem üblichen Risiko, nur
eine Stelle zu pflegen. Beides läuft jetzt über `buildSyncPayload` und die
neue Funktion `ersetzeGesamtstand`. Nebeneffekt: Die Datensicherung schreibt
jetzt ebenfalls stabil sortiertes JSON.

### Geprüft

Am laufenden System, zwei gekoppelte Instanzen:
- Gerät B geschlossen → auf Gerät A erscheint der Hinweisstreifen mit beiden
  Tasten, **und die Ansage steht im ARIA-Live-Bereich** (damit liest der
  Screenreader sie vor); das grüne Abzeichen ist weg.
- Verbindung selbst getrennt → **keine** Warnung (die Regression, gegen die
  das Abhängen der Handler schützt).

Datensicherung als vollständiger Umlauf: Export abgefangen und geprüft
(Schlüssel `appFields`, `carryover`, `history`, `reportData` — kein `timeLogs`
mehr, Feld-Zeitstempel enthalten), Wert danach von 3 auf 5 geändert, Backup
wieder eingespielt, Wert steht wieder auf 3.

`npm run lint` und `npm run build` fehlerfrei.

**Weiterhin offen:** Test auf echten Geräten im WLAN (Roadmap-Punkt 1). Ein
echter Verbindungsabbruch durch WLAN-Verlust ließ sich hier nicht nachstellen —
geprüft wurde der Weg über das Schließen der Gegenstelle, der dieselbe
Funktion auslöst.

---

## 2026-08-02 — v0.9.1: Live-Verbindung verlor Eingaben und kam nie zur Ruhe

Anlass war Marcs Frage, ob der Live-Sync „gut so" ist. Geprüft wurde nicht am
Code, sondern an zwei tatsächlich gekoppelten Instanzen (Kopplung über den
Textcode, echte WebRTC-Verbindung, DataChannel-Verkehr mitgezählt).

### Befund 1: Stiller Datenverlust bei gleichzeitiger Eingabe

Zweimal reproduziert, beide Male mit Verlust:

| Durchgang | Gerät A tippt | Gerät B tippt | Nach 9 s auf **beiden** Geräten |
|---|---|---|---|
| 1 | Vorführungen Arbeitsplatz → 1 | Auslieferungen Schule → 1 | Vorführungen Arbeitsplatz: **leer** |
| 2 | Vorführungen Schule → 5 | Auslieferungen Arbeitsplatz → 1 | Auslieferungen Arbeitsplatz: **leer** |

Ursache: `mergeRecord` nahm pro Monat den **kompletten** Datensatz mit dem
jüngeren `savedAt`; nur die Schichten wurden vereinigt, die Zählerstände
nicht. Wer im Abgleichsfenster als Zweiter stempelte, überschrieb alle Felder
des anderen. Aus Nutzersicht die schlimmste Variante: Die Zahl war da, wurde
angesagt — und war Sekunden später ohne Hinweis weg.

**Umsetzung:** Zeitstempel je Zählerfeld (`valuesUpdatedAt` in `types.ts`),
gesetzt an jeder Stelle, die Zählerstände ändert. `mergeValues` entscheidet
feldweise; nur bei Änderungen am *selben* Feld gewinnt die jüngere.
Rückfallebene für Bestandsdaten ohne Feld-Stempel: der Monats-Zeitstempel —
damit verhält sich alter Bestand exakt wie bisher.

**Beim Testen teuer gelernt (erste Fassung war falsch):** Diese Rückfallebene
allein genügt nicht. Der Monats-Zeitstempel wandert nach vorn, sobald
*irgendein anderes* Feld getippt wird — ein unverändert alter Wert bekam
dadurch einen taufrischen Stempel und überschrieb weiterhin die echte
Änderung des anderen Geräts. Im Live-Test sichtbar geworden: Gerät B tippte
5 → 6, Sekunden später stand dort wieder 5. Behoben, indem fehlende Stempel
*einmal beim Laden* mit dem damaligen Speicherzeitpunkt nachgetragen werden
(`stempelNachtragen`), bevor der Monats-Zeitstempel sich bewegen kann, und
indem `mergeValues` nach jedem Zusammenführen eine vollständige Stempelliste
zurückgibt.

### Befund 2: Der Abgleich kam nie zur Ruhe

Gemessen ohne jede Eingabe, 20 Sekunden: **7 Nachrichten raus, 7 rein, je
~29,5 KB**. Ursache: Jedes Zusammenführen erzeugt neue Objekte, woraufhin der
Auto-Archiv-Effekt ein frisches `savedAt` schrieb; damit galt der Datenstand
als geändert und wurde erneut gesendet — endlos, samt IndexedDB-Schreibvorgang
im Dreisekundentakt auf beiden Geräten (nachgewiesen: `savedAt` änderte sich
exakt alle 3 s). Nebenwirkung: `savedAt` sagte als „zuletzt gespeichert"
nichts mehr aus, obwohl genau dieses Feld beim Zusammenführen entschied.

**Umsetzung:** (1) Der Auto-Archiv-Effekt vergleicht den Inhalt (ohne
`savedAt`) mit dem bestehenden Archivstand und schreibt bei Gleichheit gar
nicht. (2) `buildSyncPayload` erzeugt JSON mit **stabiler
Schlüsselreihenfolge** (neu: `utils/stableJson.ts`) — sonst sahen inhaltlich
identische Stände nach dem Zusammenführen verschieden aus und wurden erneut
gesendet.

### Geprüft

Datenebene, Wegwerf-Skript über `npx tsx` (9 Prüfungen, alle bestanden):
verschiedene Felder bleiben beide erhalten, Richtung egal, bei gleichem Feld
gewinnt der jüngere Stempel, Korrektur nach unten setzt sich durch (kein
„Maximum"), Rückfallebene für alte Daten, Idempotenz von `mergeSyncPayload`,
Konvergenz beider Seiten.

Am laufenden System mit zwei gekoppelten Instanzen:

| Messung | vorher | nachher |
|---|---|---|
| Nachrichten in 20 s ohne Eingabe | 7 raus / 7 rein (~29,5 KB) | **0 / 0 (0 Bytes)** |
| `savedAt` in Ruhe | ändert sich alle 3 s | **bleibt stehen** |
| Gleichzeitige Eingabe auf beiden Geräten | eine der beiden **verschwindet** | **beide erhalten**, beide Geräte zeigen dasselbe |

Letzter Live-Durchgang: Gerät A tippte „Vorführungen Arbeitsplatz" 3 → 4,
Gerät B im selben Sekundenfenster „Auslieferungen Schule" 1 → 2. Ergebnis auf
beiden Geräten: 7 / 4 / 2 — nichts verloren.

`npm run lint` und `npm run build` fehlerfrei.

**Nicht geprüft (ehrlich):** Zwei Browser-Tabs auf einem Rechner sind keine
zwei Geräte im WLAN. Die Zusammenführungs-Logik ist davon unabhängig und auf
Datenebene separat abgesichert, aber Laufzeitverhalten über echtes WLAN
(Latenz, Verbindungsabbrüche) steht weiter aus. Ebenfalls offen und bewusst
nicht angefasst: Ein Verbindungsabbruch wird weiterhin nur durch das
verschwindende grüne Abzeichen im Kopfbereich angezeigt — ohne Ansage.

---

## 2026-08-02 — v0.9.0: Zähler bleiben erreichbar, Monatsabschluss umkehrbar, Excel-Export zusammengeführt

Abgearbeitet wurden die Roadmap-Punkte 2, 3 und 5 der 0.9.0 („Verlässlich im
Alltag"). Punkt 1 (Test auf echten Geräten) und 4 (Firmen-Excel-Vorlage)
bleiben offen — beide brauchen eine Zulieferung von außen.

### Befund 1: Die Zähler-Tasten liefen aus dem Bildschirm (schwerwiegend)

Bei der Vermessung der Touch-Ziele fiel etwas Größeres auf. Die Bedienzeile
eines Zählers (`-5 − Zahl + +5`) hat feste Breite, die Karte darum herum nicht.
Gemessen auf einem 360-px-Gerät (typisches Android), Ansicht „RV Report":

| Schriftgröße | linker Rand der Tastenreihe | Folge |
|---|---|---|
| Normal | x = 11 px (Karte beginnt bei 33) | Reihe steht über den Kartenrand hinaus |
| Groß | **x = −76 px** | „−5" und Teile der Minus-Taste außerhalb des Bildschirms |
| Extra groß | **x = −163 px** | „−5", Minus und Teile des Eingabefelds außerhalb |

Ursache: Alle Maße waren rem-basiert und wuchsen mit der Schriftgröße mit,
während die Karte schmal blieb; `align-self: flex-end` schob den Überstand nach
links, also aus dem Bild. Betroffen war ausgerechnet die Einstellung, die
sehbehinderte Nutzer brauchen — dort war das Verringern eines Zählers per
Fingertipp schlicht unmöglich.

**Umsetzung** (`CounterField.tsx`): Bedienflächen bekommen feste Pixelmaße
(sie enthalten Symbole, keinen Text — WCAG 1.4.4 verlangt hier kein
Mitwachsen), das Zahlenfeld bleibt rem-basiert und darf schrumpfen, die Zeile
ist umbruchfähig. Reicht der Platz, bleibt es eine Zeile; wird es eng, rutschen
die Fünferschritte in eine zweite. Ab 640 px stellt `sm:order-*` die gewohnte
Reihenfolge wieder her. Zusätzlich Innenabstände auf dem Handy verringert
(Abschnitte `p-5` → `p-4`, Zählerkarte `p-3` → `p-2.5`).

**Ergebnis, nachgemessen (360 px, alle drei Schriftgrößen):** nichts mehr
außerhalb des Bildschirms, keine waagerechte Scrollleiste mehr (vorher 365 px
bzw. 436 px Inhalt bei 360 px Fensterbreite). Die Zählerkarte ist bei normaler
Schrift sogar 4 px flacher als vorher — der Platzgewinn aus 0.8.0 bleibt
erhalten.

Zwei weitere Überlauf-Quellen bei großer Schrift gefunden und behoben:
„Diktieren"/„Datumstempel" nebeneinander (jetzt umbruchfähig), die
Navigationsleiste unten (`min-w-0`, damit die Beschriftungen kürzen dürfen)
und eine lange Kategorie-Beschriftung in der Schnell-Erfassung (`break-words`).

### Befund 2: Touch-Ziele

Vorher **50 Bedienelemente unter 44 × 44 px** in der Ansicht „RV Report",
weitere in „RV Analyse" (4), „RV Archiv" (1) und „Optionen" (1). Die
verbindliche WCAG-AA-Grenze von 24 px war überall eingehalten — es war also
kein Normverstoß, aber unterhalb der Empfehlung für einhändige Bedienung.

Nachher, nachgemessen: **0 Elemente unter 44 × 44 px** in 15 Kombinationen
(fünf Hauptansichten × drei Schriftgrößen, 360 px breit) sowie im
Einrichtungs-Assistenten.

Beim Nachmessen der Optionen-Unterseiten kamen zwei Elemente zutage, die vorher
niemand auf der Rechnung hatte:
- Die **Schalter** in „Anzeige & Bedienung" waren 56 × 32 px. Das Aussehen
  bleibt, die Trefferfläche ist jetzt 56 × 44.
- Der **Schieberegler für die Sprechgeschwindigkeit war 10 px hoch** — mit dem
  Finger praktisch nicht zu treffen. Zusätzlich stand `appearance: none`, ohne
  dass ein eigener Griff gestaltet war; Chrome zeichnet dann gar keinen
  sichtbaren Griff. Jetzt 44 px Trefferfläche, sichtbare Spur, 26-px-Griff
  (`.rv-slider` in `index.css`).
- Kleinere Nachzieher: Reiter in der Hilfe (36 → 44 px), Passwortfeld der
  Datensicherung (41 → 44 px).

**Ehrlich offen:** Das Kontrollkästchen „Backup mit Passwort schützen" ist ein
natives Kästchen und misst 24 px. Die zugehörige Beschriftungszeile ist 44 px
hoch und vollständig anklickbar, damit ist die Bedienfläche in Ordnung — das
Kästchen selbst wurde bewusst nicht per `transform` aufgeblasen.

*Zwei Messfallen, für künftige Audits notiert:*
1. Die Prüfumgebung rendert mit Faktor 0,99993 — 44 px messen sich als 43,997.
   Ein Schwellwert von exakt 44 meldet lauter Fehlalarme; geprüft wurde gegen 43,5.
2. Dialoge mit Einblend-Animation (framer-motion) bleiben in der Vorschau auf
   ihrem Startwert `scale(0.95)`, weil das Fenster keine Bilder zeichnet.
   Elemente darin messen sich 5 % zu klein (44 px → 41,8 px). Der Geräte-Sync-
   Zurückknopf ist deshalb **kein** Fund, sondern ein Artefakt.

### Befund 3: „Monat abschließen" — die Roadmap-Annahme war falsch

Die Roadmap führte den Punkt als „unumkehrbar". Nachgeprüft: **stimmt nicht.**
Der Monat wandert beim Abschluss vollständig ins RV Archiv (Zähler, Kommentar,
Schichten, Feld-Aufbau — per IndexedDB-Abfrage kontrolliert) und lässt sich
über die Monatsauswahl zurückholen. Eine 30-Tage-Aufbewahrung, wie dort
vorgeschlagen, hätte also ein Problem gelöst, das es nicht gibt.

Das **tatsächliche** Problem: Der Knopf löste ohne jede Rückfrage aus (im
Browser bestätigt: ein Klick, kein Dialog, Monat gewechselt), und der Nutzer
erfährt nirgends, dass und wie er zurückkommt.

**Umsetzung:**
1. Rückfrage über den vorhandenen `ConfirmDialog` — mit Angabe, was gesichert
   wird (gezählte Vorgänge, Schichten) und was danach passiert. Startfokus auf
   „Abbrechen", Escape bricht ab.
2. Danach ein Hinweisstreifen mit **Rückgängig** (`role="status"`, damit der
   Screenreader ihn liest, ohne zu unterbrechen). Er verschwindet, sobald im
   neuen Monat wirklich gearbeitet wird — ein Rücksprung würde dann frische
   Eingaben gefährden.
3. Nebenbefund behoben: Der Name allein galt als „Monat hat Daten". Da der Name
   beim Wechsel mitgenommen wird, landete **jeder** frische Monat sofort leer im
   Archiv (reproduziert: Archiv enthielt `2026-09` mit `values: {}`). Neue
   Regel in `monthHasContent()`: Kommentar, Zählerstand oder Schicht — der Name
   zählt nicht mehr.

Vollständig im Browser durchgespielt: Abbrechen ändert nichts; Bestätigen
archiviert August korrekt und wechselt zu September (Archiv enthält jetzt nur
noch August); Rückgängig stellt Monat, Kommentar, alle Zählerstände und beide
Schichten wieder her; nach drei Tipps auf „+" im neuen Monat ist das Angebot
verschwunden und der Zähler steht auf 3 (kein Zählverlust — Regressionstest zu
0.6.0).

### Befund 4: Der Excel-Export existierte zweimal — mit unterschiedlichem Ergebnis

`utils/excelUtils.ts` (Archiv) und die Inline-Fassung in `App.tsx` (laufender
Monat) waren auseinandergelaufen. Derselbe Monat ergab je nach Weg ein anderes
Dokument: „Gesamt" statt „Gesamt (Bereich 1)", im Archiv-Export fehlte der
Kommentarblock ganz, wenn kein Kommentar vorhanden war, andere Spaltenbreiten,
anderer Blattname („Monatsbericht" vs. „Monatsreport").

Zusammengeführt auf die Fassung des laufenden Monats — das ist das Dokument,
das die Vertriebsleitung tatsächlich bekommt. Mit einem Wegwerf-Skript
(`npx tsx`) beide Wege erzeugt und verglichen: **außerhalb der Kopfzeile
identisch**, Summenformeln geprüft (`B10=SUM(B8:B9)`, `B25=B10+B14+B18`, der
Arbeitszeit-Bereich korrekt nicht in der Aktivitäten-Summe).

Beim Ausliefern zusätzlich ein echter Fehler behoben: Brach der Nutzer den
Teilen-Dialog ab, lud die Formular-Fassung trotzdem herunter, die
Archiv-Fassung meldete „Fehler beim Exportieren". Jetzt wird ein Abbruch als
das behandelt, was er ist (`AbortError` → „Teilen abgebrochen"), ohne Download
und ohne Fehlermeldung. Das ist eine bewusste Verhaltensänderung, keine reine
Umstrukturierung.

### Befund 5: Fokusfalle des Einrichtungs-Assistenten hatte ein Loch

`OnboardingModal` meldet `aria-modal="true"`, aber im Hintergrund waren
**12 fokussierbare Elemente** weiterhin per Tabulator erreichbar. Die
vorhandene Falle griff nur, wenn der Fokus exakt auf dem ersten oder letzten
Element lag — der Startfokus liegt aber auf der Überschrift (`tabindex="-1"`),
die in keiner der beiden Listen steht. Shift+Tab von dort führte also in einen
Hintergrund, den der Screenreader für nicht vorhanden erklärt. Behoben; der
Fokus wird jetzt in den Dialog zurückgeholt.

*Ehrlich angemerkt:* Diese Lücke ist aus dem Code hergeleitet und die
Zählung der erreichbaren Elemente ist gemessen — die Tastaturbewegung selbst
lässt sich mit synthetischen Ereignissen nicht belastbar nachstellen. Ein
echter Tastatur-Durchlauf steht noch aus.

### Geprüft

`npm run lint` (tsc --noEmit) und `npm run build` fehlerfrei. Erststart mit
geleertem `localStorage` **und** gelöschter IndexedDB kontrolliert (Vorgabe aus
CLAUDE.md): Assistent erscheint, alle 18 Standardfelder mit korrekten Umlauten
und allen Symbolen, keine doppelt kodierten Zeichen, kein waagerechter Überlauf.
Export beider Wege ausgelöst und die erzeugten Dateinamen kontrolliert.

**Nicht geprüft (ehrlich):** alles, was echte Hardware braucht — Touch-Zweige
(`pointer: coarse`), Bildschirmtastatur, iOS-Safe-Areas, NVDA/VoiceOver/TalkBack.
Das bleibt Roadmap-Punkt 1 und blockiert weiterhin die 1.0.

*Arbeitsnotiz:* Ein Bulk-Edit über `node -e` in der Bash-Shell hat Backticks und
Backslashes zerlegt (Template-Literale und `\s` verschwanden aus dem Code) —
dieselbe Klasse von Fehler wie der Encoding-Schaden aus 0.7.0. Reparatur über
ein per Datei geschriebenes Node-Skript. Für Bulk-Änderungen gilt: Skript in
eine Datei schreiben, nicht in die Kommandozeile.

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
