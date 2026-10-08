import { test, expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { VORLAGEN, findeVorlage, VORLAGE_TEAM_BLINDENHILFSMITTEL, VORLAGE_APA_AUSSENDIENST } from "../src/utils/vorlagen";

/**
 * Von der Wahl der Vorlage bis zur Excel-Datei, durch die echte Oberfläche.
 *
 * Drei Teams, drei Formulare, in jedem andere Zahlen. Die Rechenkerne sind in
 * `npm run check` abgesichert; hier steht, was nur der Browser beweist: dass die
 * Wahl in den Optionen die Kategorien im Formular ändert, dass eingegebene
 * Zahlen in der heruntergeladenen Datei in genau der Zeile stehen, die der
 * Kategorie gehört, und dass ein Wechsel keine Zahl vernichtet.
 *
 * Läuft nur im Handy-Profil: Die Geometrie prüft `oberflaeche.spec.ts`, hier
 * geht es um Inhalt.
 */

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "handy", "Inhalt haengt nicht am Geraeteprofil");
});

async function starte(page: Page) {
  await page.addInitScript(() => {
    // Immer herunterladen: Der Teilen-Dialog des Systems laesst sich nicht abgreifen.
    Object.defineProperty(navigator, "canShare", { value: () => false, configurable: true });
    if (!localStorage.getItem("aussendienst_pwa_onboarding_v1")) {
      localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
    }
  });
}

async function waehleVorlage(page: Page, name: string) {
  await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
  const knopf = page.getByRole("button", { name: new RegExp(name) });
  await knopf.waitFor({ state: "visible", timeout: 20_000 });
  await knopf.click();
  await expect(knopf).toHaveAttribute("aria-pressed", "true");
}

async function oeffneFormular(page: Page) {
  await page.goto("/?tab=form", { waitUntil: "domcontentloaded" });
  await page.getByRole("spinbutton").first().waitFor({ state: "visible", timeout: 20_000 });
}

const alleLabels = (v: (typeof VORLAGEN)[number]) =>
  [...v.felder.s1, ...v.felder.s2, ...v.felder.s3, ...v.felder.s4].map((f) => f.label);

for (const v of VORLAGEN) {
  test.describe(v.name, () => {
    test("das Formular zeigt genau die Kategorien dieser Vorlage", async ({ page }) => {
      await starte(page);
      await waehleVorlage(page, v.name);
      await oeffneFormular(page);

      for (const label of alleLabels(v)) {
        await expect(
          page.getByRole("spinbutton", { name: label, exact: true }),
          `${v.name}: ${label}`,
        ).toHaveCount(1);
      }
      // Kategorien, die nur eine andere Vorlage kennt, duerfen nicht erscheinen.
      const meine = new Set(alleLabels(v));
      for (const w of VORLAGEN) {
        if (w.id === v.id) continue;
        for (const label of alleLabels(w)) {
          if (meine.has(label)) continue;
          await expect(page.getByRole("spinbutton", { name: label, exact: true }), `${v.name} zeigt "${label}" von ${w.name}`).toHaveCount(0);
        }
      }
      // Die Bereichsueberschriften dieser Vorlage stehen da.
      for (const s of ["s1", "s2", "s3"] as const) {
        await expect(page.getByRole("heading", { name: new RegExp(`^${s.slice(1)}\\. ${v.bereiche[s].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).first()).toBeVisible();
      }
    });

    test("jede eingegebene Zahl steht in der Datei in der Zeile ihrer Kategorie", async ({ page }) => {
      test.setTimeout(150_000);
      await starte(page);
      await waehleVorlage(page, v.name);
      await oeffneFormular(page);

      await page.getByRole("textbox", { name: "Mitarbeiter/in" }).fill("Test Prüfer");
      // Fuer jede Kategorie eine andere Zahl: Vertauschte Zeilen faellt sonst nicht auf.
      const erwartet: Record<string, number> = {};
      let n = 0;
      for (const [id, zelle] of Object.entries(v.feldZuZelle)) {
        const feld = [...v.felder.s1, ...v.felder.s2, ...v.felder.s3, ...v.felder.s4].find((f) => f.id === id)!;
        const wert = 11 + n * 2;
        n++;
        const eingabe = page.getByRole("spinbutton", { name: feld.label, exact: true });
        await eingabe.fill(String(wert), { timeout: 10_000 });
        await eingabe.blur();
        erwartet[zelle] = wert;
      }

      // Senden: Rueckfragen beantworten, bis die Datei kommt.
      const download = page.waitForEvent("download", { timeout: 30_000 });
      await page.getByRole("button", { name: /Bericht an VL senden/ }).click();
      for (let i = 0; i < 4; i++) {
        const nurVorlage = page.getByRole("button", { name: "Nur Vorlage senden" });
        const trotzdem = page.getByRole("button", { name: "Trotzdem senden" });
        await Promise.race([
          nurVorlage.waitFor({ state: "visible", timeout: 5_000 }),
          trotzdem.waitFor({ state: "visible", timeout: 5_000 }),
        ]).catch(() => undefined);
        if (await nurVorlage.isVisible().catch(() => false)) {
          // Die Rueckfrage nennt Name und Fassung der Vorlage.
          const dialog = page.getByRole("alertdialog");
          await expect(dialog).toContainText(v.name);
          await expect(dialog).toContainText(v.stand);
          await nurVorlage.click();
          break;
        }
        if (await trotzdem.isVisible().catch(() => false)) await trotzdem.click();
      }
      const datei = await download;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.read(await datei.createReadStream());
      expect(wb.worksheets.map((w) => w.name)).toEqual([v.blattName]);
      const ws = wb.getWorksheet(v.blattName)!;
      for (const [zelle, wert] of Object.entries(erwartet)) {
        expect(ws.getCell(zelle).value, `${v.name}: ${zelle}`).toBe(wert);
      }
      expect(String(wb.subject)).toContain(v.stand);
    });
  });
}

test("ein Wechsel der Vorlage vernichtet keine Zahl, und die Einstellung bleibt je Vorlage", async ({ page }) => {
  const team = findeVorlage(VORLAGE_TEAM_BLINDENHILFSMITTEL);
  const apa = findeVorlage(VORLAGE_APA_AUSSENDIENST);
  await starte(page);
  await waehleVorlage(page, team.name);
  await oeffneFormular(page);

  const gemeinsam = team.felder.s1[0]; // vf_schule: in beiden Formularen dieselbe Zeile
  const nurTeam = team.felder.s2[0]; // schul_vorort: gibt es nur im Team-Formular
  const nurApa = apa.felder.s2[0]; // gespr_techberater: gibt es nur im APA-Formular
  await page.getByRole("spinbutton", { name: gemeinsam.label, exact: true }).fill("7");
  await page.getByRole("spinbutton", { name: nurTeam.label, exact: true }).fill("5");
  await page.getByRole("spinbutton", { name: nurTeam.label, exact: true }).blur();
  await page.waitForTimeout(400);

  await waehleVorlage(page, apa.name);
  await oeffneFormular(page);
  await expect(page.getByRole("spinbutton", { name: nurTeam.label, exact: true })).toHaveCount(0);
  await expect(page.getByRole("spinbutton", { name: nurApa.label, exact: true })).toHaveCount(1);
  // Die gemeinsame Zeile zeigt die erfasste Zahl weiter.
  await expect(page.getByRole("spinbutton", { name: gemeinsam.label, exact: true })).toHaveValue("7");
  await page.getByRole("spinbutton", { name: nurApa.label, exact: true }).fill("3");
  await page.getByRole("spinbutton", { name: nurApa.label, exact: true }).blur();
  await page.waitForTimeout(400);

  // Zurueck: die Team-Zahl ist noch da, die APA-Kategorie ist verschwunden.
  await waehleVorlage(page, team.name);
  await oeffneFormular(page);
  await expect(page.getByRole("spinbutton", { name: nurTeam.label, exact: true })).toHaveValue("5");
  await expect(page.getByRole("spinbutton", { name: nurApa.label, exact: true })).toHaveCount(0);

  // Nach einem Neuladen bleibt die Wahl.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("spinbutton").first().waitFor({ state: "visible" });
  await expect(page.getByRole("spinbutton", { name: nurTeam.label, exact: true })).toHaveValue("5");
});

test("Ersteinstieg: die Vorlage wird gewählt und gilt sofort im Formular", async ({ page }) => {
  const apa = findeVorlage(VORLAGE_APA_AUSSENDIENST);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Willkommen bei RV Mobil" }).waitFor({ state: "visible", timeout: 20_000 });
  await page.getByRole("button", { name: /^Weiter$/ }).click();
  await page.getByRole("heading", { name: "Wie heißen Sie?" }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: /^Weiter$/ }).click();
  await page.getByRole("heading", { name: "Welches Formular nutzen Sie?" }).waitFor({ state: "visible" });
  const knopf = page.getByRole("button", { name: new RegExp(apa.name) });
  await knopf.click();
  await expect(knopf).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Einrichtung überspringen" }).click();
  await page.getByRole("spinbutton", { name: apa.felder.s2[0].label, exact: true }).waitFor({ state: "visible", timeout: 15_000 });
});

/*
  Die Schnell-Erfassung (die Kacheln oben im Formular) folgt der Vorlage.
  Zwei Betriebsarten: "auto" (nach Nutzung) und "custom" (selbst gewählte IDs). Die
  gewählten IDs gehören zu einer Vorlage -- nach einem Wechsel zeigten sie bis 0.9.74
  ins Leere, und das Feld blieb LEER.
*/
const kachelnVon = async (page: Page): Promise<string[]> => {
  const gruppe = page.getByRole("group", { name: "Schnell-Erfassungs-Tasten" });
  await gruppe.waitFor({ state: "visible", timeout: 15_000 });
  return gruppe.getByRole("button").evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") || "").split(". Aktueller")[0]));
};

for (const v of VORLAGEN) {
  test(`Schnell-Erfassung (${v.name}): automatisch nur Kategorien dieser Vorlage`, async ({ page }) => {
    await starte(page);
    await waehleVorlage(page, v.name);
    await oeffneFormular(page);
    const kacheln = await kachelnVon(page);
    expect(kacheln.length).toBeGreaterThan(0);
    const eigene = new Set([...v.felder.s1, ...v.felder.s2, ...v.felder.s3].map((f) => f.label));
    for (const k of kacheln) expect(eigene.has(k), `"${k}" gehört nicht zu ${v.name}`).toBe(true);
  });
}

test("Schnell-Erfassung: eine eigene Auswahl einer anderen Vorlage lässt das Feld nicht leer", async ({ page }) => {
  const team = findeVorlage(VORLAGE_TEAM_BLINDENHILFSMITTEL);
  const vertrieb = VORLAGEN.find((v) => v.id === "vertrieb-monatsinfo")!;
  await page.addInitScript(() => {
    // Alter Stand: eigene Auswahl mit Team-Kategorien, noch unter dem alten, gemeinsamen Schluessel.
    localStorage.setItem("aussendienst_pwa_quick_v1", JSON.stringify({ mode: "custom", ids: ["vf_schule", "schul_vorort"] }));
  });
  await starte(page);
  await waehleVorlage(page, vertrieb.name);
  await oeffneFormular(page);
  const kacheln = await kachelnVon(page);
  expect(kacheln.length, "Schnell-Erfassung ist leer").toBeGreaterThan(0);
  const eigene = new Set([...vertrieb.felder.s1, ...vertrieb.felder.s2, ...vertrieb.felder.s3].map((f) => f.label));
  for (const k of kacheln) expect(eigene.has(k), `"${k}" gehört nicht zur Vertriebs-Vorlage`).toBe(true);
  // Zurueck bei Team: die Auswahl von dort ist noch da.
  await waehleVorlage(page, team.name);
  await oeffneFormular(page);
  expect(await kachelnVon(page)).toEqual([team.felder.s1[0].label, team.felder.s2[0].label]);
});

/*
  Zwei Schnell-Kacheln nebeneinander, IMMER (0.9.74). Bis dahin hing die Spaltenzahl an
  `minmax(9rem, 1fr)` -- und rem waechst mit der Schriftgroesse: Auf einem iPhone 17 Pro
  (402 px) stand in "Gross" und "Extra gross" nur noch eine Kachel je Reihe.
*/
for (const breite of [320, 360, 393, 402, 440, 768]) {
  for (const groesse of ["normal", "large", "extra-large"]) {
    test(`Schnell-Erfassung: mindestens zwei Kacheln je Reihe (${breite} px, ${groesse})`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: 900 });
      await page.addInitScript((g) => {
        localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
        localStorage.setItem("aussendienst_pwa_a11y", JSON.stringify({ fontSize: g }));
      }, groesse);
      await oeffneFormular(page);
      const gruppe = page.getByRole("group", { name: "Schnell-Erfassungs-Tasten" });
      await gruppe.waitFor({ state: "visible", timeout: 15_000 });
      const m = await gruppe.getByRole("button").evaluateAll((els, vw) => {
        const r = els.map((e) => e.getBoundingClientRect());
        const ersteReihe = r.filter((b) => Math.abs(b.top - r[0].top) < 2);
        return {
          n: els.length,
          proReihe: ersteReihe.length,
          innerhalb: r.every((b) => b.left >= -1 && b.right <= vw + 1),
          ueberlappt: r.some((a, i) => r.some((b, j) => i < j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1)),
        };
      }, breite);
      expect(m.n).toBeGreaterThanOrEqual(2);
      expect(m.proReihe, `Kacheln in der ersten Reihe bei ${breite} px / ${groesse}`).toBeGreaterThanOrEqual(2);
      expect(m.innerhalb, "Kachel ragt aus dem Fenster").toBe(true);
      expect(m.ueberlappt, "Kacheln ueberlappen sich").toBe(false);
    });
  }
}
