# Konzept 0.9.5 — „Sync absichern"

Stand: 2026-08-03. Grundlage ist eine vollständige Prüfung des Sync-Bereichs
am laufenden System (Einmal-Übertragung und Live-Verbindung), nicht nur eine
Durchsicht des Codes. Alle Befunde sind reproduziert; wo etwas nur hergeleitet
ist, steht das ausdrücklich dabei.

---

## Teil 1 — Läuft der Sync-Bereich?

**Ja, in seinen normalen Abläufen.** Nachgewiesen in dieser Runde:

| Ablauf | Ergebnis |
|---|---|
| Einmal-Übertragung per Textcode, Zusammenführen | funktioniert; Zähler beider Geräte bleiben erhalten, Kommentar kommt an, Umlaute und Emojis unversehrt |
| Live-Verbindung, Kopplung über Textcode | funktioniert; Verbindung überlebt das Schließen des Sync-Fensters |
| Live-Verbindung, gleichzeitige Eingabe auf beiden Geräten | beide Eingaben bleiben erhalten (seit 0.9.1) |
| Live-Verbindung im Leerlauf | null Nachrichten (seit 0.9.1) |
| Verbindungsabbruch | wird gemeldet, Ansage im ARIA-Live-Bereich (seit 0.9.2) |
| Zusammenführungs-Logik | 11 automatische Prüfungen (seit 0.9.4) |

Was gut gelöst ist und **nicht** angefasst werden sollte: die Verbindung als
App-weiter Dienst statt im Fenster; das Abhängen der Handler vor dem Schließen;
das Senden nur bei Änderung; die feldweisen Zeitstempel; der kameralose
Textcode-Weg; `iceServers: []`.

**Aber der Bereich hat drei Lücken**, zwei davon reproduziert.

---

### Befund A — Der Import prüft die Struktur nicht (reproduzierter Absturz)

`handleAssembled` prüft nur, ob sich der empfangene Text als JSON parsen lässt,
und ob es versehentlich ein Kopplungscode ist. **Was danach kommt, wird
ungeprüft übernommen.**

Reproduziert: Ein Code mit gültigem JSON, aber unsinniger Struktur
(`{"appFields":"kaputt","history":12345,"carryover":"nein","reportData":42}`)
wurde anstandslos angenommen — die App meldete „Daten vollständig empfangen".
Nach einem Tipp auf „Alles ersetzen" stürzte sie in den Fehlerbildschirm:

> Ein unerwarteter Fehler ist aufgetreten …
> `Cannot read properties of undefined (reading 'forEach')`

**Wie schlimm ist es wirklich?** Nach dem Neuladen lief die App wieder, und die
gespeicherten Daten waren unversehrt — der Absturz geschah beim Zeichnen, bevor
die Speicher-Effekte liefen. Es ist also *kein* Datenverlust, aber die App ist
bis zum Neuladen unbenutzbar, und der Nutzer erfährt nicht, warum. Dass die
Daten überlebt haben, ist zudem eine Eigenschaft dieses konkreten Falls und
keine Zusage der Umsetzung.

Realistische Auslöser: ein unvollständig kopierter Code, ein Code aus einer
späteren App-Version, ein QR-Code aus einer fremden Anwendung, eine
verstümmelte Datei.

### Befund B — „Alles ersetzen" löst mit einem Tipp aus

Die folgenschwerste Aktion der App — sie überschreibt **das gesamte Archiv**
des empfangenden Geräts — hat keine Rückfrage. Ein Tipp genügt.

Das ist auch in sich widersprüchlich: Der weit harmlosere Monatsabschluss hat
seit 0.9.0 eine Rückfrage *und* ein Rückgängig, weil er den Arbeitsmonat
wechselt. Das Ersetzen kann ein Jahr Archiv vernichten und fragt nicht nach.

Erschwerend: Der Erklärtext darunter ist inhaltlich veraltet. Er sagt „Pro
Monat gewinnt der zuletzt gespeicherte Stand" — seit 0.9.1 gilt das feldweise,
nicht pro Monat. Dieselbe Textdrift wie bei den Hilfetexten in 0.9.3.

### Befund C — Der Sync-Code ist nicht verschlüsselt, die Oberfläche sagt etwas anderes

Der Textcode ist ausschliesslich komprimiert und base64-kodiert. Nachgewiesen:
Mit drei trivialen Schritten (base64 dekodieren → `deflate-raw` entpacken →
`JSON.parse`) liegen Name, Kommentare, sämtliche Zählerstände und das komplette
Archiv im Klartext vor. Kein Schlüssel, kein Passwort.

Dem gegenüber stehen zwei Aussagen im selben Fenster:

- Kopfbereich: „**100 % serverlos & DSGVO-konform:** Übertragung nur von Gerät
  zu Gerät – ohne Cloud, ohne Konten, ohne Zwischenspeicherung auf fremden
  Servern."
- Nach dem Kopieren: „Fügen Sie ihn am anderen Gerät unter 'Code einfügen' ein
  (z. B. per geteilter Zwischenablage, **Nachricht an sich selbst oder
  E-Mail**)."

Der zweite Satz lädt genau zu dem ein, was der erste ausschliesst. Wer den Code
per Mail schickt, legt einen vollständigen, unverschlüsselten Personendatensatz
auf fremden Servern ab. Auch die „geteilte Zwischenablage" ist ein Cloud-Weg
(Apple Universal Clipboard, Windows-Zwischenablageverlauf).

Für die **QR-Variante** gilt das nicht: Bildschirm zu Kamera, die Daten
verlassen das Gerät nicht. Und für die **Live-Verbindung** ebenfalls nicht: Ein
WebRTC-DataChannel ist immer DTLS-verschlüsselt.

Bemerkenswert ist die Unwucht: Die Datensicherung *kann* mit Passwort
verschlüsselt werden (`utils/crypto.ts`), der Sync-Code nie — obwohl die
Oberfläche ausgerechnet dort zum Versand über fremde Kanäle rät.

---

## Teil 2 — Vorschlag für 0.9.5

Vier Punkte, in dieser Reihenfolge. A und B sind Pflicht, C1 kostet fast
nichts und beseitigt eine falsche Zusage, C2 ist eine Entscheidung.

### A. Struktur-Prüfung beim Import (Pflicht)

Neue Funktion, geprüft in `npm run check`:

```
pruefeSyncPaket(unbekannt) -> { ok: true, paket } | { ok: false, grund }
```

Geprüft wird das Nötige, nicht alles: `appFields` besitzt `s1`–`s4` als Listen
von Objekten mit `id` und `label`; `history` ist ein Objekt, dessen Schlüssel
wie `"YYYY-MM"` aussehen und dessen Werte ein `values`-Objekt haben;
`reportData` hat `month` und `values`; `carryover` enthält Zahlen.

Zusätzlich bekommt das Paket eine **Kennung** (`app: "rvmobil", fmt: 1`).
Fehlt sie, greift die reine Strukturprüfung — alte Codes bleiben damit lesbar.
Ist sie vorhanden und passt nicht, gibt es eine klare Meldung statt eines
Rateversuchs.

Bei Fehlschlag: verständlicher Text statt Absturz, etwa „Dieser Code gehört
nicht zu RV Mobil oder ist unvollständig übertragen. Bitte den vollständigen
Code erneut kopieren." Nichts wird übernommen.

*Warum das der wichtigste Punkt ist:* Es ist die einzige Stelle, an der
komplett fremde Daten in die App gelangen.

### B. Rückfrage vor „Alles ersetzen" (Pflicht)

Der bestehende `ConfirmDialog` in der roten Variante, mit konkreten Zahlen aus
beiden Ständen:

> **Alle Daten dieses Geräts ersetzen?**
> Auf diesem Gerät liegen 7 Monate im Archiv. Sie werden zusammen mit dem
> laufenden Monat durch die empfangenen Daten ersetzt (3 Monate).
> Diese Aktion lässt sich nicht rückgängig machen.
> [Abbrechen] [Endgültig ersetzen]

Dazu der veraltete Erklärtext beim Zusammenführen: „Pro Monat gewinnt der
zuletzt gespeicherte Stand" → „Jede Kategorie wird einzeln abgeglichen; bei
Änderungen an derselben Kategorie gilt die jüngere."

### C1. Ehrliche Aussagen zum Übertragungsweg (Pflicht, klein)

Den Ratschlag „Nachricht an sich selbst oder E-Mail" streichen. Stattdessen
benennen, was der jeweilige Weg bedeutet:

- QR-Code: verlässt das Gerät nicht (Bildschirm → Kamera).
- Live-Verbindung: verschlüsselt, direkt von Gerät zu Gerät.
- Textcode: **unverschlüsselt**; nur über Wege weitergeben, denen man die
  Daten anvertrauen würde. Die Zwischenablage vieler Systeme wird mit anderen
  Geräten geteilt.

Das ist keine Funktionsänderung, sondern die Beseitigung einer falschen
Zusage — dieselbe Klasse wie die Hilfetext-Korrekturen aus 0.9.3.

### C2. Optionaler Passwortschutz für den Textcode (Entscheidung)

Wie beim Backup, mit demselben `crypto.ts`: neues Präfix `RVC2:`, Inhalt
AES-GCM-verschlüsselt, Passwort beim Erzeugen und beim Einfügen. Ein `RVC1:`
bleibt weiterhin lesbar.

*Dafür:* Der Textcode ist der Weg für PCs ohne Kamera und wird real über
fremde Kanäle transportiert. *Dagegen:* eine zusätzliche Hürde, ein weiteres
Passwort, das verloren gehen kann — und wer den Code ohnehin nur zwischen
seinen eigenen Geräten kopiert, braucht es nicht.

**Meine Empfehlung:** einbauen, aber als *Angebot* (Häkchen, standardmäßig
aus), damit der einfache Fall einfach bleibt.

---

## Teil 3 — Was 0.9.5 bewusst NICHT enthält

- **Vereinfachung der Kopplung** („Schritt 2" abschaffen). Zurückgestellt von
  Marc, liegt in der ROADMAP unter 1.x. Ein einzelner Code ist ohne
  Vermittlungsserver technisch ausgeschlossen — die Begründung steht dort.
- **Status je Monat im Archiv.** Sinnvoll und vorbereitet, aber neue
  Oberfläche; besser nach dem Gerätetest.
- **TypeScript-Strict / `App.tsx` aufteilen.** Grosse Umbauten, gehören nicht
  in eine Version, die kurz vor einem Praxistest liegt.

---

## Teil 4 — Wie 0.9.5 geprüft wird

| Punkt | Automatisch (`npm run check`) | Am laufenden System |
|---|---|---|
| A Struktur-Prüfung | gültiges Paket wird angenommen; die vier Unsinns-Varianten aus Befund A werden abgelehnt; alte Pakete ohne Kennung bleiben lesbar | derselbe Unsinns-Code wie oben einfügen → verständliche Meldung statt Absturz |
| B Rückfrage | — | Ersetzen anstossen → Dialog mit korrekten Zahlen; Abbrechen ändert nichts; Bestätigen ersetzt |
| C1 Texte | — | Sichtprüfung im Sync-Fenster |
| C2 Passwortschutz | Umlauf mit Passwort, falsches Passwort scheitert, `RVC1:` bleibt lesbar | Code mit Passwort zwischen zwei Tabs übertragen |

Zusätzlich vor der Veröffentlichung wie gehabt: `lint`, `check`, `build`,
Erststart mit leerem Speicher, Abgleich des ausgelieferten Bundles gegen den
lokalen `npm ci`-Build.

---

## Offene Entscheidungen

1. **C2 (Passwortschutz für den Textcode) — ja oder nein?** Ohne ihn bleibt
   der Textcode ein unverschlüsselter Personendatensatz; mit ihm gibt es ein
   Passwort mehr.
2. **Soll „Alles ersetzen" überhaupt bleiben?** Es gibt keinen Fall, den
   Zusammenführen nicht auch löst — ausser „dieses Gerät soll exakt den Stand
   des anderen bekommen" (z. B. neues Diensthandy). Alternative: umbenennen in
   „Von diesem Gerät übernehmen" und hinter die Rückfrage stellen.
3. **Gerätetest vorher oder nachher?** 0.9.5 ändert an der Oberfläche nur den
   Sync-Bereich. Wenn der Praxistest kurz bevorsteht, wäre es sauberer, ihn auf
   dem heutigen Stand zu machen und 0.9.5 danach einzuspielen.
