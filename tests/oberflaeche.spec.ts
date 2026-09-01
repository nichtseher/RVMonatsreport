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

        /*
          Und derselbe Fehler eine Ebene tiefer.

          Die Prüfung oben misst die Seite. Steckt der Überlauf aber in einem
          Container mit `overflow-x: auto`, bleibt `documentElement.scrollWidth`
          unauffällig -- der Inhalt wird still seitwärts scrollbar statt die
          Seite zu verbreitern. Genau so blieben zwei echte Fehler unentdeckt
          (2026-09-01): die Kacheln der Analyse schnitten bei „Extra groß" ihre
          Beschriftung ab (56 px), und am Schreibtisch standen neun „+5"-Tasten
          bei 1270..1318 in einem 1280 px breiten Fenster.

          Warum die Regel genau auf `auto`/`scroll` zielt: Ein Container mit
          `overflow-x: hidden` schneidet mit Absicht -- daran hängen `sr-only`
          und `truncate`, die dadurch von selbst herausfallen. `auto` dagegen
          entsteht hier fast immer versehentlich, weil Tailwinds
          `overflow-y-auto` die x-Achse nach CSS-Spezifikation mitzieht.
        */
        const versteckte = await page.evaluate(() => {
          const treffer: string[] = [];
          for (const el of Array.from(document.querySelectorAll("*"))) {
            if (el.clientWidth === 0) continue;
            const zuViel = el.scrollWidth - el.clientWidth;
            if (zuViel <= 1) continue;
            const s = getComputedStyle(el);
            if (s.overflowX !== "auto" && s.overflowX !== "scroll") continue;
            const klassen =
              typeof el.className === "string" && el.className
                ? "." + el.className.trim().split(/\s+/).slice(0, 4).join(".")
                : "";
            treffer.push(
              `${el.tagName.toLowerCase()}${klassen}: ${zuViel} px zu breit (${el.scrollWidth}/${el.clientWidth}) — "${(el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32)}"`,
            );
          }
          return treffer;
        });

        expect(versteckte, `${ansicht.name} / ${groesse}: verstecktes Seitwärtsscrollen`).toEqual([]);

        /*
          Trefferflächen, WCAG 2.2, 2.5.8 Target Size (Minimum), Stufe AA:
          24 × 24 CSS-Pixel. Die 44 px aus früheren Notizen sind Stufe AAA
          (2.5.5) -- die Entscheidung aus 0.9.7, die Fünferschritte auf 40 px
          zu verkleinern, ist damit normgerecht und keine Kröte.

          Diese Prüfung sah bis 2026-09-01 nur das Formular an. Deshalb ist ihr
          ein Schieberegler mit **168 × 6 px** entgangen (Aufteilung der Stunden
          im Ausstempel-Formular): Die dafür gebaute Klasse `.rv-slider` mit
          44 px Trefferfläche war nur im A11y-Fenster gesetzt, nicht dort.
          Jetzt läuft sie in jeder Ansicht mit -- im selben Seitenaufruf wie die
          beiden Prüfungen oben, kostet also keine zusätzliche Laufzeit.
        */
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

        expect(zuKlein, `${ansicht.name} / ${groesse}: unter 24 px — ${zuKlein.join(" | ")}`).toEqual([]);
      });
    }
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
    // seien nicht pruefbar. Gilt fuer beide Handy-Profile -- seit 2026-09-01
    // auch fuer WebKit, wo die Frage naeher an der Wirklichkeit der Kollegen
    // liegt als in der Chromium-Nachbildung.
    test.skip(!testInfo.project.name.startsWith("handy"), "Nur in den Handy-Profilen sinnvoll");
    await oeffne(page, "form");

    const lage = await page.evaluate(() => ({
      coarse: matchMedia("(pointer: coarse)").matches,
      fine: matchMedia("(pointer: fine)").matches,
      hover: matchMedia("(hover: hover)").matches,
      touchPunkte: navigator.maxTouchPoints,
      ontouchstart: "ontouchstart" in window,
    }));

    // Das ist der Teil, auf den es ankommt: An dieser Medienabfrage haengen die
    // Touch-Zweige im CSS. Beide Motoren melden sie gleich.
    expect(lage.coarse, `matchMedia-Lage: ${JSON.stringify(lage)}`).toBe(true);
    expect(lage.fine, `matchMedia-Lage: ${JSON.stringify(lage)}`).toBe(false);
    expect(lage.hover, `matchMedia-Lage: ${JSON.stringify(lage)}`).toBe(false);
    expect(lage.ontouchstart, `matchMedia-Lage: ${JSON.stringify(lage)}`).toBe(true);

    /*
      `maxTouchPoints` nur in Chromium pruefen. Nachgemessen am 2026-09-01 im
      selben Profil und derselben Fenstergroesse:

        Chromium   coarse true, hover false, ontouchstart true, maxTouchPoints 1
        WebKit     coarse true, hover false, ontouchstart true, maxTouchPoints 0

      Playwrights WebKit-Bau setzt den Wert schlicht nicht. Das ist eine Grenze
      des Pruefwerkzeugs und **keine** Aussage ueber iOS-Safari -- ein echtes
      iPhone meldet dort 5. Die Zeile hier weich zu machen waere falsch; sie
      gehoert dorthin, wo sie etwas misst.
    */
    if (testInfo.project.name === "handy") {
      expect(lage.touchPunkte, `matchMedia-Lage: ${JSON.stringify(lage)}`).toBeGreaterThan(0);
    }
  });
});
