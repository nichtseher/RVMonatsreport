import { defineConfig, devices } from "@playwright/test";

/**
 * Oberflächenprüfung — das Gegenstück zu `npm run check`.
 *
 * `npm run check` deckt die reinen Funktionen ab. Die Fehler, die dieses
 * Projekt tatsächlich zweimal in die Veröffentlichung gebracht hat, saßen aber
 * eine Ebene höher: waagerechter Überlauf bei großer Schrift, ein nie
 * funktionierender Tooltip, ein Warnband, das 51 px aus dem Bildschirm ragt.
 * Nichts davon findet ein Typprüfer oder eine Unit-Prüfung.
 *
 * Zwei Geräteprofile, beide mit Absicht:
 *
 * - **handy**: 360 × 780 mit `hasTouch` und `isMobile`. Das ist der Punkt, an
 *   dem die ROADMAP bis 0.9.18 annahm, die Touch-Zweige (`@media (pointer:
 *   coarse)`) seien nicht prüfbar, weil ein verkleinertes Desktop-Fenster
 *   weiterhin `pointer: fine` meldet. Für ein Browserfenster stimmt das; für
 *   Playwrights Geräte-Nachbildung nicht. `pruefe-medienabfrage` in
 *   `tests/oberflaeche.spec.ts` weist das nach, statt es zu behaupten.
 * - **schreibtisch**: das Breitbild-Layout mit der Seitenleiste.
 *
 * Nur Chromium: Ein zweiter Motor verdoppelt die Laufzeit des Deploy-Tors,
 * ohne die Fehlerklasse zu erweitern, um die es hier geht (Geometrie und
 * ARIA). WebKit gehört zu den echten Geräten in 1.0, nicht hierher.
 */
export default defineConfig({
  testDir: "./tests",

  // SERIELL, UND ZWAR MIT GRUND. Mit mehreren Arbeitern schlugen 9 von 30
  // Prüfungen fehl -- und zwar unregelmäßig: "Formular bei normal" scheiterte,
  // obwohl dieselbe Ansicht von Hand nachweislich 360 px misst. Ursache war
  // nicht das Layout, sondern der geteilte Dev-Server: Vite übersetzt Module
  // auf Zuruf, gleichzeitige Seitenaufrufe rissen den Ausführungskontext
  // mitten in der Messung weg. Mit einem Arbeiter lief exakt derselbe Test
  // durch. Der ganze Lauf dauert rund 15 Sekunden -- Parallelität kauft hier
  // nichts und kostet Vertrauen in die Ergebnisse.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],

  use: {
    baseURL: "http://localhost:3000",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "handy",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 360, height: 780 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "schreibtisch",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],

  // Der Dev-Server reicht: Geprüft werden Geometrie und ARIA, nicht die
  // Bündelung. Ein laufender Server wird wiederverwendet, damit ein Lauf von
  // Hand nicht am belegten Port scheitert.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
