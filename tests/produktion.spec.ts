import { test, expect, Page, Browser } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ALT_BLOB, ALT_PASSWORT } from "../scripts/vektoren";

/**
 * Der GEBAUTE Stand -- `npm run check:prod`.
 *
 * Warum es das gibt: `npm run check:ui` läuft gegen den Dev-Server. Der baut
 * ohne die Sicherheitsrichtlinie, ohne Minifizierung und ohne Service-Worker-
 * Cache -- also ohne alles, was erst beim Bauen dazukommt (`apply: "build"` in
 * `vite.config.ts`). Zwei Fehler haben das schon bezahlt:
 *
 *   0.9.34–0.9.47  Das Zurückspielen verschlüsselter Sicherungen scheiterte in
 *                  der Produktion: `fetch("data:…")` verletzt `connect-src`.
 *                  Dev-Server, `check` und `check:ui` blieben dreizehn
 *                  Fassungen lang grün.
 *   0.9.72 (gemessen)  `npm start` lieferte die App ohne Service Worker aus,
 *                  weil die Kopfzeilen-CSP das Inline-Skript sperrte -- ohne
 *                  jede Fehlermeldung für den Nutzer.
 *
 * Geprüft wird hier, was NUR der gebaute Stand zeigen kann: keine
 * Richtlinien-Verstöße in irgendeiner Ansicht, ein registrierter Service
 * Worker, und der Weg der Datensicherung (Verschlüsseln, Entschlüsseln, Altformat)
 * mit der echten Richtlinie. Layout und Barrierefreiheit bleiben Sache von
 * `check:ui`.
 *
 * Läuft über `playwright.prod.config.ts` gegen `vite preview` von `dist/`;
 * `check:prod` baut vorher. Im Deploy-Workflow steht derselbe Aufruf ohne
 * Bauen als Schritt „Gebauten Stand pruefen" zwischen „Build Application" und
 * „Setup Pages" -- seit 0.9.72, auf Entscheidung des Projektinhabers. Schlägt
 * er fehl, wird nichts veröffentlicht.
 */

const BASIS = "http://localhost:4173/";

interface Befunde {
  verstoesse: string[];
  fehler: string[];
}

async function neueSeite(browser: Browser): Promise<{ page: Page; befunde: Befunde; schliessen: () => Promise<void> }> {
  const kontext = await browser.newContext({ locale: "de-DE", timezoneId: "Europe/Berlin", acceptDownloads: true });
  await kontext.addInitScript(() => {
    localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  const page = await kontext.newPage();
  const befunde: Befunde = { verstoesse: [], fehler: [] };
  page.on("console", (m) => {
    if (m.type() === "error") befunde.fehler.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => befunde.fehler.push(`pageerror: ${e.message}`));
  return { page, befunde, schliessen: () => kontext.close() };
}

async function sammle(page: Page, befunde: Befunde) {
  befunde.verstoesse.push(...(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp.splice(0))));
}

test.describe("Der gebaute Stand", () => {
  test("alle Ansichten laufen unter der Sicherheitsrichtlinie ohne Verstoß", async ({ browser }) => {
    test.setTimeout(180_000);
    const { page, befunde, schliessen } = await neueSeite(browser);
    try {
      const gesehen: string[] = [];
      await page.goto(BASIS);
      await page.locator("#monatskarte-titel").waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1200);
      await sammle(page, befunde);
      gesehen.push("Report");

      for (const tab of ["time", "history", "options"]) {
        await page.goto(`${BASIS}?tab=${tab}`);
        await page.waitForTimeout(1200);
        await sammle(page, befunde);
        gesehen.push(`?tab=${tab}`);
      }
      // Die übrigen Ansichten hängen an Menüzeilen -- dieselben Einstiege wie `EINSTIEGE`.
      for (const [muster, name] of [
        [/Formular anpassen/, "Formular anpassen"],
        [/Geräte-Sync/, "Geräte-Sync"],
        [/Datensicherung/, "Datensicherung"],
        [/Hilfe & Anleitung/, "Hilfe"],
        [/Was gibt's Neues/, "Neues"],
        [/Erklärung zur Barrierefreiheit/, "Erklärung"],
        [/Analyse/, "Analyse"],
        [/Demogeräte/, "Bestand"],
      ] as const) {
        await page.goto(`${BASIS}?tab=options`);
        await page.getByRole("button", { name: muster }).first().click({ timeout: 20_000 });
        await page.waitForTimeout(1000);
        await sammle(page, befunde);
        gesehen.push(name);
      }
      expect(gesehen.length, "nicht alle Ansichten wurden besucht").toBe(12);
      expect(befunde.verstoesse, "Verstöße gegen die Sicherheitsrichtlinie").toEqual([]);
      expect(befunde.fehler, "Fehler in der Konsole").toEqual([]);
    } finally {
      await schliessen();
    }
  });

  test("der Service Worker registriert sich und legt den aktuellen Cache an", async ({ browser }) => {
    const { page, befunde, schliessen } = await neueSeite(browser);
    try {
      await page.goto(BASIS);
      await page.locator("#monatskarte-titel").waitFor({ timeout: 20_000 });
      await page.waitForTimeout(2500);
      await sammle(page, befunde);
      const erwarteterName = /const CACHE_NAME = '([^']+)'/.exec(readFileSync("public/sw.js", "utf8"))?.[1];
      const lage = await page.evaluate(async () => {
        const r = await navigator.serviceWorker.getRegistration();
        const namen = await caches.keys();
        return { registriert: !!r, namen };
      });
      expect(befunde.verstoesse, "Das Inline-Skript wird von der Richtlinie gesperrt -- ohne Service Worker kein Offline-Betrieb").toEqual([]);
      expect(lage.registriert, "kein Service Worker").toBe(true);
      expect(lage.namen, "der Cache der aktuellen Fassung fehlt").toContain(erwarteterName);
    } finally {
      await schliessen();
    }
  });

  test("Datensicherung: neues Format, Altformat und eine abgelehnte Datei -- mit der echten Richtlinie", async ({ browser }) => {
    test.setTimeout(120_000);
    const { page, befunde, schliessen } = await neueSeite(browser);
    try {
      const oeffne = async () => {
        await page.goto(`${BASIS}?tab=options`);
        await page.getByRole("button", { name: /Datensicherung/ }).first().click();
        await page.locator("#backup-passwort").waitFor({ timeout: 20_000 });
      };

      // 1. Neues Format: erzeugen und wieder einspielen (auch ohne ".enc" im Namen).
      await oeffne();
      await page.getByLabel("Backup mit Passwort schützen").check();
      await page.locator("#backup-passwort").fill("Sicheres-Passwort-1");
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 30_000 }),
        page.getByRole("button", { name: /Auf Gerät speichern/ }).click(),
      ]);
      const datei = readFileSync((await download.path()) as string, "utf8");
      expect(datei.startsWith("RVB2:"), "keine Kennung des neuen Formats").toBe(true);
      await page.setInputFiles('input[type="file"]', { name: "umbenannt.txt", mimeType: "text/plain", buffer: Buffer.from(datei) });
      await expect(page.getByRole("heading", { name: /Datensicherung/ })).toBeHidden({ timeout: 20_000 });

      // 2. Eine Sicherung aus 0.9.71 (Altformat) bleibt lesbar.
      await oeffne();
      await page.locator("#backup-passwort").fill(ALT_PASSWORT);
      await page.setInputFiles('input[type="file"]', { name: "alt.json.enc", mimeType: "application/json", buffer: Buffer.from(ALT_BLOB) });
      await expect(page.getByRole("heading", { name: /Datensicherung/ })).toBeHidden({ timeout: 20_000 });

      // 3. Eine fremde Datei: genau eine Fehlermeldung, kein "eingespielt".
      await oeffne();
      await page.setInputFiles('input[type="file"]', {
        name: "fremd.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ app: "andere-app" })),
      });
      await expect(page.getByText(/konnte nicht eingespielt werden/).first()).toBeVisible({ timeout: 10_000 });
      expect(await page.getByText(/Backup eingespielt/).count()).toBe(0);

      await sammle(page, befunde);
      expect(befunde.verstoesse, "Verstöße gegen die Sicherheitsrichtlinie").toEqual([]);
    } finally {
      await schliessen();
    }
  });

  test("der Excel-Export liefert eine Datei", async ({ browser }) => {
    test.setTimeout(90_000);
    const { page, befunde, schliessen } = await neueSeite(browser);
    try {
      await page.goto(BASIS);
      await page.locator("#meta-name-input").fill("Test Person");
      await page.getByRole("button", { name: /Tippen erhöht um/ }).first().click();
      await page.waitForTimeout(800);
      await page.getByRole("button", { name: /Bericht an VL senden/ }).click();
      const trotzdem = page.getByRole("button", { name: /Trotzdem senden/ });
      if (await trotzdem.count()) await trotzdem.click();
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 30_000 }),
        page.getByRole("button", { name: /Nur Vorlage senden/ }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
      await sammle(page, befunde);
      expect(befunde.verstoesse, "Verstöße gegen die Sicherheitsrichtlinie").toEqual([]);
    } finally {
      await schliessen();
    }
  });
});
