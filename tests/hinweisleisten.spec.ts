import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Die Hinweisleisten oben im Formular, tatsaechlich erzeugt (0.9.83).
 *
 * Bis dahin hat kein Lauf je eine davon gesehen: Ihre Zustaende haengen an
 * `navigator.storage`, einem Schreibfehler und einer abgerissenen WebRTC-
 * Verbindung. Sie lassen sich ohne Eingriff in den Produktionscode herstellen:
 *
 *  - Speicher-Schutz: `navigator.storage` per Init-Skript ersetzen.
 *  - Sicherungs-Erinnerung: eine Zahl erfassen, nie gesichert.
 *  - Verbindungsabbruch: ein Fake-Peer im ECHTEN `liveSync`-Modul (der Dev-
 *    Server liefert dieselbe Modulinstanz wie die App).
 *  - Schreibfehler: `IDBObjectStore.put` wirft.
 *
 * Gemessen werden je Zustand und Schriftgroesse: die Leiste ist da, kein
 * waagerechter Ueberlauf, jedes Bedienelement darin mindestens 44 px (Layout-
 * Kasten, siehe `findeZuKleineZiele` in oberflaeche.spec.ts) und axe findet in
 * der Leiste nichts. Eine weitere Leiste ohne Schritt hier faellt nicht auf --
 * `scripts/checks/hinweisleisten.ts` zaehlt deshalb nach.
 */

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name === "schreibtisch", "Die Leisten sind in allen Profilen gleich gebaut.");
});

const GROESSEN = ["normal", "large", "extra-large"] as const;
const LIVE_MODUL = "/src/utils/liveSync.ts";

async function pruefeLeiste(page: Page, name: RegExp, was: string) {
  const leiste = page.locator("main").getByText(name).first();
  await expect(leiste, `${was}: Leiste fehlt`).toBeVisible();

  const ueberlauf = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(ueberlauf, `${was}: waagerechter Ueberlauf`).toBeLessThanOrEqual(0);

  // Alle Bedienelemente der Leiste: der naechste Vorfahr, der Tasten enthaelt.
  const zuKlein = await leiste.evaluate((el) => {
    let box: HTMLElement | null = el as HTMLElement;
    while (box && box.querySelectorAll("button").length === 0) box = box.parentElement;
    return Array.from(box?.querySelectorAll("button") ?? [])
      .filter((b) => (b as HTMLElement).offsetHeight < 44 || (b as HTMLElement).offsetWidth < 44)
      .map((b) => `${b.textContent?.trim()} ${(b as HTMLElement).offsetWidth}x${(b as HTMLElement).offsetHeight}`);
  });
  expect(zuKlein, `${was}: Tasten unter 44 px`).toEqual([]);

  const axe = await new AxeBuilder({ page }).include("main").withRules(["button-name", "color-contrast"]).analyze();
  expect(
    axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    `${was}: axe`,
  ).toEqual([]);
}

for (const groesse of GROESSEN) {
  test(`Hinweisleisten bei ${groesse}`, async ({ page }) => {
    await page.addInitScript((g) => {
      localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
      localStorage.setItem(
        "aussendienst_pwa_a11y",
        JSON.stringify({ theme: "light", fontSize: g, screenReaderNarration: false, audioFeedback: true, speechRate: 1 }),
      );
      // Speicher nicht als dauerhaft bestaetigt.
      Object.defineProperty(navigator, "storage", {
        value: { persisted: async () => false, persist: async () => false, estimate: async () => ({ usage: 0, quota: 1e9 }) },
        configurable: true,
      });
    }, groesse);
    await page.goto("/?tab=form", { waitUntil: "domcontentloaded" });
    await page.getByRole("spinbutton").first().waitFor({ state: "visible", timeout: 20_000 });

    // 1 Speicher-Schutz (in WebKit auf dem Handy die kritische Stufe, sonst "gefaehrdet")
    await pruefeLeiste(page, /Daten (koennen|können)|sieben Tage|nicht als dauerhaft bestätigt/, "Speicher-Schutz");

    // 2 Sicherungs-Erinnerung: Inhalt vorhanden, nie gesichert
    await page.getByRole("spinbutton").first().fill("3");
    await page.getByRole("spinbutton").first().blur();
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("spinbutton").first().waitFor({ state: "visible", timeout: 20_000 });
    await pruefeLeiste(page, /noch nie eine Datensicherung/, "Sicherungs-Erinnerung");

    // 3 Abbruch der Live-Verbindung: Fake-Peer im echten Modul
    await page.evaluate(async (modul) => {
      const m = await import(/* @vite-ignore */ modul);
      const peer: any = { connectionState: "new", close() {}, getSenders: () => [], getReceivers: () => [] };
      m.adoptPeer(peer);
      peer.connectionState = "failed";
      peer.onconnectionstatechange();
    }, LIVE_MODUL);
    await pruefeLeiste(page, /Live-Verbindung unterbrochen/, "Verbindungsabbruch");

    // 4 Schreibfehler
    await page.evaluate(() => {
      IDBObjectStore.prototype.put = function () {
        throw new DOMException("voll", "QuotaExceededError");
      };
    });
    await page.getByRole("spinbutton").first().fill("5");
    await page.getByRole("spinbutton").first().blur();
    await page.waitForTimeout(1500);
    await pruefeLeiste(page, /Speichern fehlgeschlagen/, "Schreibfehler");
  });
}
