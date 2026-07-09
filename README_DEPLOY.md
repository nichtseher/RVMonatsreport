# 🚀 Anleitung: PWA auf GitHub Pages bereitstellen

Dieses PWA-Projekt wurde so vorkonfiguriert, dass es vollautomatisch oder manuell per Terminal auf **GitHub Pages** bereitgestellt werden kann.

---

## Methode 1: Vollautomatisch per GitHub Actions (Empfohlen)

Es wurde ein automatischer Workflow unter `.github/workflows/deploy.yml` eingerichtet. Sobald du dein Projekt auf GitHub hochlädst, passiert die Bereitstellung von ganz allein!

### Einmalige Aktivierung auf GitHub:
1. Erstelle ein neues Repository auf GitHub und pushe deinen Code dorthin.
2. Gehe in deinem GitHub-Repository auf **Settings** (Einstellungen) ➡️ **Pages**.
3. Wähle unter **Build and deployment** ➡️ **Source** die Option **Deploy from a branch** aus.
4. Gehe in deinem GitHub-Repository auf **Settings** ➡️ **Actions** ➡️ **General**.
5. Scrolle ganz nach unten zu **Workflow permissions** und stelle sicher, dass **"Read and write permissions"** ausgewählt ist (damit die Action die fertig gebaute Seite hochladen darf).
6. Wenn du nun Code auf den `main`- oder `master`-Branch pushst, baut GitHub deine App automatisch und erstellt einen neuen Branch namens `gh-pages`.
7. Wähle auf der **Settings ➡️ Pages**-Seite nun den Branch `gh-pages` und den Ordner `/ (root)` aus und klicke auf **Save**.

---

## Methode 2: Manuell über dein lokales Terminal

Wenn du die App lieber direkt von deinem Computer aus hochladen möchtest, kannst du das mit nur einem Befehl tun:

1. Öffne dein Terminal im Projektordner.
2. Installiere die Abhängigkeiten (falls noch nicht geschehen):
   ```bash
   npm install
   ```
3. Führe den vordefinierten Bereitstellungs-Befehl aus:
   ```bash
   npm run deploy
   ```
   *Dieser Befehl baut das Projekt automatisch neu (`npm run build`) und lädt das Ergebnis (`dist`-Ordner) direkt auf den `gh-pages`-Branch deines verknüpften GitHub-Repositories hoch.*

---

## 🛠️ Technische Details zur PWA-Kompatibilität
* **Relative Pfade (`base: './'`)**: In `vite.config.ts` wurde die Basisadresse auf `./` eingestellt. Dadurch funktioniert die App auf jeder beliebigen GitHub-URL (z. B. `https://dein-benutzername.github.io/dein-projektname/`), ohne dass Assets verloren gehen.
* **Offline-Unterstützung**: Da es sich um eine PWA (Progressive Web App) handelt, wird deine Anwendung auf Smartphones und Tablets (iOS/Android) installierbar sein, sobald sie über HTTPS auf GitHub Pages bereitgestellt wurde!
