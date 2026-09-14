# Bereitstellung auf GitHub Pages

Es gibt **genau einen** Weg, diese App zu veröffentlichen: einen Push auf
`main`. Alles andere in dieser Datei beschreibt nur, was dabei passiert.

---

## Der einzige Weg: Push auf `main`

`.github/workflows/deploy.yml` läuft bei jedem Push auf `main` (oder `master`)
und veröffentlicht über `actions/deploy-pages`. Es gibt **keinen
`gh-pages`-Branch** und **kein `npm run deploy`** — das Skript ist mit 0.9.20
entfernt worden, zusammen mit der `gh-pages`-Abhängigkeit. Es veröffentlichte
auf einen Branch, der seit 0.9.2 nichts mehr entschieden hat, und las sich wie
der echte Weg. Wer es sucht, sucht eine Falle.

### Einmalige Einrichtung auf GitHub

1. **Settings → Pages → Build and deployment → Source:** **GitHub Actions**
   auswählen (nicht „Deploy from a branch").
2. Mehr ist nicht nötig. Die nötigen Rechte stehen im Workflow selbst
   (`permissions: pages: write`, `id-token: write`).

---

## Was vor der Veröffentlichung geprüft wird

Der Workflow prüft, **bevor** er baut. Schlägt ein Schritt fehl, bricht der Job
ab und die bisherige Fassung bleibt online:

| Schritt | Befehl |
|---|---|
| Typen | `npm run lint` |
| Rechenkerne und Textkodierung | `npm run check` |
| Oberfläche und Barrierefreiheit | `npm run check:ui` (Chromium + WebKit) |
| Bekannte Sicherheitslücken | `npm audit --omit=dev` (nur Bericht, kein Abbruch) |

`npm ci` statt `npm install`: Damit entspricht das ausgelieferte Bundle exakt
der `package-lock.json`. Mit `npm install` erzeugten zwei aufeinanderfolgende
Läufe bei unverändertem Quelltext unterschiedliche Bundles (2026-08-02
beobachtet).

---

## Nach dem Push: nachsehen, nicht annehmen

Zwei Dinge sind hier schon schiefgegangen, beide unbemerkt:

- **Ein Push erzeugt nicht zwingend einen Lauf.** Am 2026-08-08 meldete `git
  push` Erfolg, und für die Fassung erschien nie ein Workflow-Lauf.
- **Ein Lauf ist nicht zwingend erfolgreich.** Am 2026-09-02 liefen zwei
  Veröffentlichungen auf `failure`, und die Produktion stand fünf Tage auf
  einem älteren Stand, ohne dass es jemandem auffiel.

Deshalb: **Lauf UND Ergebnis prüfen.** Ohne `gh`-CLI über die öffentliche API —
höchstens alle 30 Sekunden abfragen, unangemeldet sind 60 Anfragen pro Stunde
erlaubt. Fehlt der Schlüssel `workflow_runs` in der Antwort, ist das ein
Fehler und **kein leeres Ergebnis**:

```bash
curl -s "https://api.github.com/repos/nichtseher/RVMonatsreport/actions/runs?per_page=5"
curl -s "https://api.github.com/repos/nichtseher/RVMonatsreport/deployments?per_page=4"
```

Die Gegenprobe braucht gar kein Kontingent und misst das, worauf es ankommt —
was tatsächlich ausgeliefert wird:

```bash
curl -s https://nichtseher.github.io/RVMonatsreport/ | grep -o 'assets/index-[A-Za-z0-9._-]*\.js'
curl -s https://nichtseher.github.io/RVMonatsreport/assets/index-<hash>.js | grep -c '<Kennzeichen>'
```

Ein geänderter Bundle-Name belegt, dass überhaupt neu gebaut wurde; ein
Kennzeichen im Bundle belegt, dass es der gemeinte Build ist.

---

## Technische Details zur PWA

- **Relative Pfade (`base: './'`)** in `vite.config.ts`: Die App läuft damit
  unter jeder Unteradresse, ohne dass Assets verloren gehen.
- **Service Worker** (`public/sw.js`): handgeschrieben, network-first,
  ausschließlich eigene Herkunft. Kein `vite-plugin-pwa`.
- **Offline-fähig und installierbar**, sobald sie über HTTPS ausgeliefert wird.
