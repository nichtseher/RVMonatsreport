# RV Monatsreport (RV Mobil)

Barrierefreie Progressive Web App (PWA) für den Monatsbericht im Außendienst –
optimiert für blinde und sehbehinderte Mitarbeitende.

## Datenschutz & Architektur (DSGVO)

Die App ist **komplett serverlos** konzipiert:

- **Alle Daten bleiben lokal** auf dem Gerät (localStorage / IndexedDB).
- **Kein Backend, keine API, kein Tracking, keine externen Dienste** (auch keine
  externen Schriftarten – alles wird lokal ausgeliefert).
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

Siehe `README_DEPLOY.md` (GitHub Pages) – alternativ `npm run start` hinter
einem beliebigen Reverse-Proxy. Der Node-Server liefert nur statische Dateien
aus und setzt Security-Header (CSP, HSTS u. a.); er verarbeitet keinerlei
personenbezogene Daten.

---

© 2026 Reinecker Vision GmbH | RV Mobil – Konzeptioniert & entwickelt von
Marc Petry Stramov
