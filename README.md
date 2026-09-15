# RV Mobil

Barrierefreie Progressive Web App (PWA) für den Monatsbericht im Außendienst –
optimiert für blinde und sehbehinderte Mitarbeitende.

Die App heißt **RV Mobil** — im Fenstertitel, unter dem Symbol auf dem
Startbildschirm, in Systemmeldungen und in der Fußzeile. **RV Report** ist der
Name der ersten Seite, auf der die Zählerstände eingetragen werden; daneben
gibt es RV Zeit, RV Analyse und RV Archiv. Das Code-Verzeichnis heißt aus
historischen Gründen weiterhin `RVMonatsreport`.

## Datenschutz & Architektur (DSGVO)

Die App ist **komplett serverlos** konzipiert:

- **Alle Daten bleiben lokal** auf dem Gerät (localStorage / IndexedDB).
- **Kein Backend, keine API, kein Tracking** (auch keine externen
  Schriftarten – alles wird lokal ausgeliefert).
- **Eine Ausnahme, und sie gehört hierher:** Das optionale **Diktat** im
  Notizfeld nutzt die Spracherkennung des Browsers
  (`webkitSpeechRecognition`). Die arbeitet nicht auf dem Gerät, sondern
  überträgt die Aufnahme an den Anbieter des Browsers (Chrome → Google,
  Safari → Apple). Die App fragt vor der ersten Nutzung ausdrücklich
  nach und merkt sich die Antwort; wer ablehnt, tippt. Bis 0.9.37 war
  das weder hier noch in der Hilfe erwähnt.
- **Geräte-Sync per QR-Code:** Die Übertragung zwischen zwei Geräten läuft rein
  optisch von Bildschirm zu Kamera – offline, ohne Server, ohne Internet.
  Große Datenmengen werden komprimiert und auf mehrere rotierende QR-Codes
  aufgeteilt.
- **Bericht an VL senden:** Der Excel-Report wird über den System-Teilen-Dialog
  (z. B. E-Mail) weitergegeben – erst nach ausdrücklicher Nutzeraktion.
- **Erinnerung:** Die App erinnert ab dem 8. des Monats beim Öffnen lokal an die
  Abgabe (optional, ohne Push-Server; abschaltbar unter Optionen).

## Funktionen

- Monatsreport mit konfigurierbaren Zählfeldern (Vorführungen, Schulungen usw.)
- Stempeluhr / Arbeitszeiterfassung (inkl. Nachtschichten über Mitternacht)
- Excel-Export (Report und Zeiterfassung) mit Summenformeln
- RV-Archiv mit Historie, Statistiken und Übertrag
- Verschlüsseltes Backup (Export/Import als Datei)
- Geräte-Synchronisation per QR-Code (offline)
- Vollständig barrierefrei: Screenreader-Ansagen, Sprachausgabe, Fokusführung,
  Themes mit hohem Kontrast, skalierbare Schrift, Zoom nicht blockiert

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungs-Server auf http://localhost:3000
npm run build      # Produktions-Build (dist/)
npm run start      # Produktions-Server (dist/server.cjs)
npm run lint       # TypeScript-Prüfung
```

## PWA / Installation

- `public/manifest.webmanifest` + echte PNG-Icons (auch Apple-Touch-Icon)
- Service Worker (`public/sw.js`): Network-First mit Offline-Fallback,
  cached ausschließlich Ressourcen der eigenen Origin
- Updates werden dem Nutzer als Hinweis angeboten und erst nach Bestätigung
  aktiviert (kein erzwungener Reload während der Dateneingabe)

## Deployment

Jeder Push auf `main` veröffentlicht sofort auf GitHub Pages – Einzelheiten
und die Nachkontrolle in `README_DEPLOY.md`. Alternativ `npm run start` hinter
einem beliebigen Reverse-Proxy. Der Node-Server liefert nur statische Dateien
aus und setzt Security-Header (CSP, HSTS u. a.); er verarbeitet keinerlei
personenbezogene Daten.

---

© 2026 Reinecker Vision GmbH | RV Mobil – Konzeptioniert & entwickelt von
Marc Petry Stramov
