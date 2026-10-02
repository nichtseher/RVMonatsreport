import { defineConfig, devices } from "@playwright/test";

/**
 * Prüfung des GEBAUTEN Stands -- das Gegenstück zu `playwright.config.ts`, die
 * gegen den Dev-Server läuft. Aufruf: `npm run check:prod` (baut vorher). Im
 * Deploy-Workflow läuft derselbe Aufruf ohne Bauen, nach „Build Application".
 *
 * `vite preview` liefert `dist/` aus, also die Seite MIT der beim Bauen
 * eingehängten Sicherheitsrichtlinie, minifiziert und mit dem Service Worker.
 * Warum das eine eigene Konfiguration ist und nicht ein weiteres Profil der
 * ersten: Der Dev-Server und der gebaute Stand teilen sich keinen Port, keinen
 * Start und keine Bedingungen -- und `check:ui` bleibt so, wie das Tor es kennt.
 *
 * Seriell und mit einem Arbeiter, aus demselben Grund wie dort: ein geteilter
 * Server unter parallelen Seitenaufrufen.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "produktion.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],

  use: {
    baseURL: "http://localhost:4173",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "produktion",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],

  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
