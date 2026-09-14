# Konzept: Mein Bestand — eine Liste, mehr nicht

**Stand:** 2026-09-14 · **Status:** **umgesetzt mit 0.9.36**

---

## Worum es geht

Kollegen sollen für sich aufschreiben können, welche Vorführgeräte sie gerade
dabei haben. Damit sie nachsehen können, wenn die Frage kommt — etwa weil ein
Gerät an jemand anderen weitergeschickt werden soll.

**Keine Pflicht. Kein Vorgang. Kein Nachweis.** Ein Notizzettel, der nicht
verlorengeht und den man sich vorlesen lassen kann.

## Was es ausdrücklich nicht ist

Ein erster Entwurf hatte hier Zustände, Übergabe-Codes, Empfangsbestätigungen
und Erinnerungen an überfällige Sendungen. Das war am Bedarf vorbei: Sobald die
Liste etwas *nachweisen* soll, wird sie zur Pflicht — und Pflichtlisten werden
nicht gepflegt, sondern sie veralten und lügen dann.

Also nicht:

- keine Zustände („beim Kunden", „unterwegs")
- keine Übergabe zwischen Geräten, kein Code, kein QR
- keine gemeinsame Sicht aufs Team (bräuchte einen Server — ausgeschlossen)
- **nichts davon im Monatsreport** (Entscheidung des Projektinhabers)

## Was es ist

Eine Liste von Einträgen. Pro Eintrag:

```ts
interface Bestandsposten {
  id: string;
  text: string;       // "Tactonom Pro, Seriennummer 4711, mit Netzteil"
  notiz?: string;     // optional
}
```

**Ein freies Textfeld, kein Formular.** Die Geräte tragen keine Barcodes; jedes
Pflichtfeld wäre blind getippte Mehrarbeit für einen Nutzen, den niemand
verlangt hat. Wer eine Seriennummer will, schreibt sie dazu. Wer „großer
Koffer, grauer Griff" schreibt, hat auch recht.

Bedienung: anlegen, ändern, löschen, **vorlesen lassen**. Das Vorlesen ist der
eigentliche Gewinn gegenüber einem Zettel — wer nicht sehen kann, kann eine
Liste sonst nur abtippen oder sich merken.

Erreichbar über **Optionen → „Mein Bestand"**, wie das Jahreskonto seit 0.9.35.
Kein neuer Eintrag in der Hauptnavigation; dafür ist es nicht wichtig genug.

Ablage in `localStorage` (`aussendienst_pwa_bestand_v1`) über `safeSetItem` —
Einstellungsgröße, nicht Berichtsgröße.

## Die eine offene Entscheidung

**Soll die Liste einen Gerätewechsel überleben?**

- **Nur im Backup** (empfohlen): Sie wandert in die verschlüsselte Sicherung und
  kommt beim Wiederherstellen zurück. Billig, keine Änderung an der
  Zusammenführung.
- **Auch im Geräte-Sync:** Dann müsste `mergeSyncPayload` sie mitverarbeiten —
  die Stelle, an der in diesem Projekt schon zweimal Daten still verschwunden
  sind. Für ein Gadget ist das der falsche Ort für Risiko.

Empfehlung: Backup ja, Sync nein. Wer zwei Geräte nutzt, pflegt die Liste auf
einem.

## Was der Aufwand wirklich ist

Die Funktion selbst ist klein — eine Liste, drei Tasten, eine Ansage.

**Die Absicherung ist größer als die Funktion**, und das ist kein Einwand,
sondern die Hausordnung dieses Projekts:

| | |
|---|---|
| Neue Ansicht | Eintrag in `EINSTIEGE`, Überschrift die nur sie hat |
| Neue `useState`-Schalter | Zählung in `scripts/checks/zustandsdeckung.ts` nachziehen |
| Rückfrage „Eintrag löschen?" | Eintrag in `RUECKFRAGEN`, sonst meldet `scripts/checks/rueckfrage.ts` |
| Geometrie | 44 px, 320 und 360 px, drei Schriftgrößen, vier Farbschemata |

Realistisch: die Funktion an einem halben Tag, die Absicherung noch einmal so
lang. Wer „nettes Gadget" hört, sollte diese Zeile mitlesen — sie ist der Preis
dafür, dass die App an keiner Stelle schlechter wird als an ihren guten.
