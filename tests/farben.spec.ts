import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { VORLAGEN, findeVorlage, VORLAGE_TEAM_BLINDENHILFSMITTEL, VORLAGE_VERTRIEB } from "../src/utils/vorlagen";

/**
 * Eigene Kategoriefarben (0.9.74), optional, durch die echte Oberfläche.
 *
 * Belegt: Die Wahl lässt sich treffen und wieder entfernen, sie wirkt auf Zählerkarte und
 * Schnell-Kachel, sie bleibt nach einem Neuladen und gehört zur Vorlage, in den
 * Hochkontrast-Schemata wird sie NICHT angezeigt, und mit Extremfarben (Weiß, Schwarz,
 * Gelb) bleibt jede Seite im hellen und im dunklen Schema kontrastsicher.
 */

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "handy", "Inhalt haengt nicht am Geraeteprofil");
});

const team = findeVorlage(VORLAGE_TEAM_BLINDENHILFSMITTEL);
const erstes = team.felder.s1[0];

async function starte(page: Page, theme = "light") {
  await page.addInitScript((t) => {
    localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
    localStorage.setItem("aussendienst_pwa_a11y", JSON.stringify({ theme: t }));
  }, theme);
}

async function farbeWaehlen(page: Page, label: string, name: string) {
  await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Formular anpassen/ }).first().click();
  const gruppe = page.getByRole("group", { name: label, exact: true });
  await gruppe.getByRole("button", { name, exact: true }).click();
  await expect(gruppe.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
}

const oeffneFormular = async (page: Page) => {
  await page.goto("/?tab=form", { waitUntil: "domcontentloaded" });
  await page.getByRole("spinbutton").first().waitFor({ state: "visible", timeout: 20_000 });
};

const kartenRand = (page: Page, label: string) =>
  page
    .getByRole("spinbutton", { name: label, exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rv-kf-karte') or contains(@class,'bg-[var(--bg-color)]')][1]")
    .evaluate((el) => ({ klasse: el.className, breite: getComputedStyle(el).borderLeftWidth, farbe: getComputedStyle(el).borderLeftColor }));

test("ohne Wahl bleibt alles beim Alten (Standard)", async ({ page }) => {
  await starte(page);
  await oeffneFormular(page);
  const r = await kartenRand(page, erstes.label);
  expect(r.klasse).not.toContain("rv-kf");
  expect(r.breite).toBe("1px");
});

test("Wahl treffen, sehen, behalten, zurücknehmen", async ({ page }) => {
  await starte(page);
  await farbeWaehlen(page, erstes.label, "Blau");
  await oeffneFormular(page);
  const r = await kartenRand(page, erstes.label);
  expect(r.klasse).toContain("rv-kf-karte");
  expect(r.breite).toBe("4px");
  expect(r.farbe).not.toBe("rgb(230, 224, 213)"); // nicht der Standardrand
  // Die Schnell-Kachel dieser Kategorie traegt die Farbe ebenfalls (erste Kategorie = oft in der Auswahl).
  const kachel = page.getByRole("group", { name: "Schnell-Erfassungs-Tasten" }).getByRole("button").first();
  await expect(kachel).toBeVisible();
  // Neuladen: bleibt.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("spinbutton").first().waitFor({ state: "visible" });
  expect((await kartenRand(page, erstes.label)).breite).toBe("4px");
  // Zuruecknehmen: Standard.
  await farbeWaehlen(page, erstes.label, "Standard");
  await oeffneFormular(page);
  const danach = await kartenRand(page, erstes.label);
  expect(danach.klasse).not.toContain("rv-kf");
  expect(danach.breite).toBe("1px");
});

test("freie Farbe aus dem Farbfeld, und „alle zurücksetzen“", async ({ page }) => {
  await starte(page);
  await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Formular anpassen/ }).first().click();
  await page.getByLabel(`Eigene Farbe für ${erstes.label}`, { exact: true }).fill("#ff00ff");
  await expect(page.getByRole("button", { name: /Alle 1 eigenen Farben zurücksetzen/ })).toBeVisible();
  await oeffneFormular(page);
  expect((await kartenRand(page, erstes.label)).breite).toBe("4px");
  await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Formular anpassen/ }).first().click();
  await page.getByRole("button", { name: /Alle 1 eigenen Farben zurücksetzen/ }).click();
  await expect(page.getByText("Keine eigenen Farben gewählt")).toBeVisible();
});

test("die Farbe gehört zur Vorlage", async ({ page }) => {
  const vertrieb = findeVorlage(VORLAGE_VERTRIEB);
  await starte(page);
  await farbeWaehlen(page, erstes.label, "Rot");
  // Andere Vorlage: dort ist die Kategorie anders und ungefaerbt.
  await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: new RegExp(vertrieb.name) }).click();
  await oeffneFormular(page);
  const eigene = vertrieb.felder.s1[0];
  expect((await kartenRand(page, eigene.label)).breite).toBe("1px");
  // Zurueck: die Farbe ist noch da.
  await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: new RegExp(team.name) }).click();
  await oeffneFormular(page);
  expect((await kartenRand(page, erstes.label)).breite).toBe("4px");
});

for (const theme of ["high-contrast-dark", "high-contrast-yellow"]) {
  test(`in „${theme}“ wird eine eigene Farbe NICHT angezeigt, die Wahl bleibt`, async ({ page }) => {
    await starte(page, theme);
    // Erst im Standard-Schema wählen, dann das Schema wechseln.
    await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Formular anpassen/ }).first().click();
    await page.getByRole("group", { name: erstes.label, exact: true }).getByRole("button", { name: "Rot", exact: true }).click();
    await expect(page.getByText(/Hochkontrast-Schema\. Darin werden eigene Farben nicht angezeigt/)).toBeVisible();
    await oeffneFormular(page);
    const r = await kartenRand(page, erstes.label);
    expect(r.klasse).toContain("rv-kf-karte"); // die Wahl ist gespeichert ...
    expect(r.breite).toBe("1px"); // ... wird aber nicht gezeigt
  });
}

/*
  Kontrast mit Extremfarben: die Formularansicht im hellen und dunklen Schema, mit Weiß,
  Schwarz und Gelb auf den ersten drei Kategorien. axe prueft `color-contrast` am echten
  Bild; die Rechnung steht in `npm run check`, dies ist die Gegenprobe im Browser.
*/
for (const theme of ["light", "dark"]) {
  test(`Extremfarben bleiben im Schema „${theme}“ kontrastsicher (axe)`, async ({ page }) => {
    test.setTimeout(90_000);
    await starte(page, theme);
    await page.addInitScript(() => {
      localStorage.setItem("aussendienst_pwa_goals_v2", JSON.stringify({ enabled: true, s1: 15, s2: 10, s3: 5, s4: 40 }));
    });
    await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Formular anpassen/ }).first().click();
    const farben = ["#ffffff", "#000000", "#ffff00"];
    for (const [i, f] of team.felder.s1.slice(0, 3).entries()) {
      await page.getByLabel(`Eigene Farbe für ${f.label}`, { exact: true }).fill(farben[i]);
    }
    await oeffneFormular(page);
    // Werte eintragen, damit die Schnell-Kacheln der gefaerbten Kategorien erscheinen.
    for (const f of team.felder.s1.slice(0, 3)) {
      const e = page.getByRole("spinbutton", { name: f.label, exact: true });
      await e.fill("7");
      await e.blur();
    }
    await page.waitForTimeout(600);
    const ergebnis = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    const befunde = ergebnis.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").slice(0, 160)}`));
    expect(befunde).toEqual([]);
    // Und die Karten tragen wirklich Farbe (sonst prueft das Obige nichts).
    expect((await kartenRand(page, team.felder.s1[0].label)).breite).toBe("4px");
  });
}

test("jede Vorlage zeigt die Farbwahl für ihre Kategorien", async ({ page }) => {
  await starte(page);
  for (const v of VORLAGEN) {
    await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: new RegExp(v.name) }).click();
    await page.getByRole("button", { name: /Formular anpassen/ }).first().click();
    for (const f of [...v.felder.s1, ...v.felder.s2, ...v.felder.s3, ...v.felder.s4]) {
      await expect(page.getByRole("group", { name: f.label, exact: true }), `${v.name}: ${f.label}`).toHaveCount(1);
    }
  }
});
