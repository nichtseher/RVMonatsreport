import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Oberflächenprüfung: Geometrie und Barrierefreiheit.
 *
 * Warum es das gibt: Das Deploy-Tor prüfte bis 0.9.18 `lint`, `check` und
 * `audit` — für ein Projekt, dessen erklärte Kernanforderung Barrierefreiheit
 * ist, war ausgerechnet die ungeprüft. Und die Kombination aus 360 px, drei
 * Schriftgrößen und einem Dutzend Ansichten ist von Hand aussichtslos; genau
 * deshalb ist sie zweimal unbemerkt live gegangen.
 *
 * Was hier NICHT behauptet wird: dass eine bestandene Prüfung barrierefrei
 * bedeutet. axe findet einen Teil der WCAG-Verstöße, nie alle. Der Durchlauf
 * mit NVDA und VoiceOver bleibt Bedingung für 1.0.
 */

const SCHRIFTGROESSEN = ["normal", "large", "extra-large"] as const;

/** Ansichten, die sich per URL ansteuern lassen (siehe App.tsx, ?tab=). */
const ANSICHTEN = [
  { name: "Formular", tab: "form" },
  { name: "Zeit", tab: "time" },
  { name: "Analyse", tab: "stats" },
  { name: "Archiv", tab: "history" },
  { name: "Optionen", tab: "options" },
] as const;

/**
 * Frisch starten, ohne Einrichtungs-Assistent.
 *
 * Der Assistent liegt als Overlay über allem und würde jede Messung der
 * dahinterliegenden Ansicht verfälschen.
 */
async function oeffne(page: Page, tab: string) {
  await page.addInitScript(() => {
    localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
  });
  await page.goto(`/?tab=${tab}`, { waitUntil: "domcontentloaded" });
  // Nicht auf "networkidle" warten: Der Dev-Server haelt eine offene
  // HMR-Verbindung, die nie ruhig wird. Stattdessen auf ein Zeichen warten,
  // dass React tatsaechlich gerendert hat.
  await page.locator("button").first().waitFor({ state: "attached", timeout: 15_000 });
  await page.waitForTimeout(250);
}

async function setzeSchriftgroesse(page: Page, groesse: string) {
  await page.evaluate((g) => document.documentElement.setAttribute("data-size", g), groesse);
  // Kein requestAnimationFrame: Der Rückruf feuert nicht, wenn die Seite nicht
  // gezeichnet wird -- das hat in der Vorschau-Umgebung schon eine Messung
  // haengen lassen.
  await page.waitForTimeout(120);
}

/**
 * Wartet, bis die Breite steht.
 *
 * Nachgemessen auf dem Entwicklungsrechner: Nach dem Laden laufen bis zu 86
 * Übergänge gleichzeitig, der letzte endet je nach Durchgang zwischen 149 und
 * 305 ms. Die feste Wartezeit oben liegt mit rund 370 ms knapp darüber -- auf
 * einem langsameren Rechner (der CI-Läufer) fällt die Messung damit mitten in
 * eine Einblendung. Deshalb wird hier auf Ruhe gewartet statt auf eine Uhr.
 *
 * Bewusst mit `setTimeout` und nicht mit `requestAnimationFrame`, aus demselben
 * Grund wie oben.
 */
async function warteAufRuhigesLayout(page: Page) {
  await page.evaluate(async () => {
    let letzte = -1;
    let ruhig = 0;
    const start = performance.now();
    while (ruhig < 4 && performance.now() - start < 2000) {
      await new Promise((r) => setTimeout(r, 16));
      const jetzt = document.documentElement.scrollWidth;
      const laufen = document.getAnimations().some((a) => a.playState === "running");
      if (jetzt === letzte && !laufen) ruhig++;
      else {
        ruhig = 0;
        letzte = jetzt;
      }
    }
  });
}

test.describe("Kein waagerechter Überlauf", () => {
  for (const ansicht of ANSICHTEN) {
    for (const groesse of SCHRIFTGROESSEN) {
      test(`${ansicht.name} bei Schriftgröße ${groesse}`, async ({ page }) => {
        await oeffne(page, ansicht.tab);
        await setzeSchriftgroesse(page, groesse);
        await warteAufRuhigesLayout(page);

        // Die Meldung nennt die überstehenden Elemente, nicht nur die Zahl --
        // aus demselben Grund wie bei axe-core weiter unten: Ein blosses
        // "361 px" zwingt sonst zur Handsuche auf einem Rechner, auf dem der
        // Fehler womöglich gar nicht auftritt.
        const { scrollBreite, sichtBreite, ueberstehende } = await page.evaluate(() => {
          const sicht = document.documentElement.clientWidth;
          const treffer: string[] = [];
          for (const el of Array.from(document.querySelectorAll("*"))) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.right <= sicht + 0.05) continue;
            const klassen =
              typeof el.className === "string" && el.className
                ? "." + el.className.trim().split(/\s+/).slice(0, 5).join(".")
                : "";
            treffer.push(
              `${el.tagName.toLowerCase()}${klassen} rechts=${Math.round(r.right * 100) / 100} breite=${Math.round(r.width * 100) / 100} "${(el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`,
            );
          }
          return {
            scrollBreite: document.documentElement.scrollWidth,
            sichtBreite: sicht,
            // Die innersten zuletzt: die Hüllen erben den Überlauf nur.
            ueberstehende: treffer.slice(-4),
          };
        });

        // Gleichheit, nicht "kleiner gleich": Ein Ueberlauf von einem einzigen
        // Pixel ist bereits eine waagerechte Bildlaufleiste.
        expect(
          scrollBreite,
          `${ansicht.name} / ${groesse}: ${scrollBreite} px Inhalt bei ${sichtBreite} px Fenster` +
            (ueberstehende.length ? `\nÜbersteht: ${ueberstehende.join("\n           ")}` : ""),
        ).toBeLessThanOrEqual(sichtBreite);
      });
    }
  }
});

test.describe("Trefferflächen", () => {
  for (const groesse of SCHRIFTGROESSEN) {
    test(`Bedienelemente im Formular sind bei ${groesse} groß genug`, async ({ page }) => {
      await oeffne(page, "form");
      await setzeSchriftgroesse(page, groesse);

      // WCAG 2.2, 2.5.8 Target Size (Minimum), Stufe AA: 24 x 24 CSS-Pixel.
      // Die 44 px aus frueheren Notizen sind Stufe AAA (2.5.5) -- die
      // Entscheidung aus 0.9.7, die Fuenferschritte auf 40 px zu verkleinern,
      // ist damit normgerecht und keine Kroete.
      const zuKlein = await page.evaluate(() => {
        const treffer: string[] = [];
        for (const el of Array.from(document.querySelectorAll("button, a[href], input, select"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue; // unsichtbar
          if (r.width < 24 || r.height < 24) {
            treffer.push(
              `${el.tagName}"${(el.textContent || (el as HTMLElement).ariaLabel || "").trim().slice(0, 28)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
            );
          }
        }
        return treffer;
      });

      expect(zuKlein, `Unter 24 px: ${zuKlein.join(" | ")}`).toEqual([]);
    });
  }
});

test.describe("Barrierefreiheit (axe-core)", () => {
  for (const ansicht of ANSICHTEN) {
    test(`${ansicht.name} ohne schwere Verstöße`, async ({ page }) => {
      await oeffne(page, ansicht.tab);

      const ergebnis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      const schwer = ergebnis.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      // Die Meldung nennt Auswahlpfad und Begruendung: Ein blosses
      // "color-contrast (1x)" zwingt sonst jedes Mal zu einer Handsuche.
      const befunde = schwer.flatMap((v) =>
        v.nodes.map((n) => `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`),
      );

      expect(befunde, `${ansicht.name}`).toEqual([]);
    });
  }
});

test.describe("Touch-Erkennung", () => {
  test("pruefe-medienabfrage: das Handy-Profil meldet wirklich pointer: coarse", async ({
    page,
  }, testInfo) => {
    // Der Nachweis fuer die Korrektur der ROADMAP-Annahme, die Touch-Zweige
    // seien nicht pruefbar. Gilt nur fuer das Handy-Profil.
    test.skip(testInfo.project.name !== "handy", "Nur im Handy-Profil sinnvoll");
    await oeffne(page, "form");

    const lage = await page.evaluate(() => ({
      coarse: matchMedia("(pointer: coarse)").matches,
      fine: matchMedia("(pointer: fine)").matches,
      hover: matchMedia("(hover: hover)").matches,
      touchPunkte: navigator.maxTouchPoints,
    }));

    expect(lage.coarse, `matchMedia-Lage: ${JSON.stringify(lage)}`).toBe(true);
    expect(lage.touchPunkte).toBeGreaterThan(0);
  });
});
