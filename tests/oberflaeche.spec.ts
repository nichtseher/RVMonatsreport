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

/*
  Die drei Messungen als gemeinsame Funktionen.

  Sie standen bis zum 2026-09-02 eingerückt in der Prüfschleife. Das ging, so
  lange es genau eine Schleife gab. Seit die sechs Ansichten hinter den
  Einstiegen mitgeprüft werden, gäbe es zwei -- und damit zwei Stellen, an
  denen die 43,5-px-Schwelle steht. Genau diese Sorte Doppelung hat in diesem
  Projekt schon einmal dazu geführt, dass Formular und Archiv für denselben
  Monat verschiedene Excel-Dateien erzeugten.
*/

/** Waagerechter Überlauf der Seite selbst. */
async function findeUeberlauf(page: Page) {
  return page.evaluate(() => {
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
}

/**
 * Derselbe Fehler eine Ebene tiefer.
 *
 * Steckt der Überlauf in einem Container mit `overflow-x: auto`, bleibt
 * `documentElement.scrollWidth` unauffällig -- der Inhalt wird still seitwärts
 * scrollbar, statt die Seite zu verbreitern. Genau so blieben zwei echte Fehler
 * unentdeckt (2026-09-01): Die Kacheln der Analyse schnitten bei „Extra groß"
 * ihre Beschriftung ab (56 px), und am Schreibtisch standen neun „+5"-Tasten
 * bei 1270..1318 in einem 1280 px breiten Fenster.
 *
 * Warum die Regel genau auf `auto`/`scroll` zielt: Ein Container mit
 * `overflow-x: hidden` schneidet mit Absicht -- daran hängen `sr-only` und
 * `truncate`, die dadurch von selbst herausfallen. `auto` dagegen entsteht hier
 * fast immer versehentlich, weil Tailwinds `overflow-y-auto` die x-Achse nach
 * CSS-Spezifikation mitzieht.
 */
async function findeVerstecktenUeberlauf(page: Page) {
  return page.evaluate(() => {
    const treffer: string[] = [];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (el.clientWidth === 0) continue;
      const zuViel = el.scrollWidth - el.clientWidth;
      if (zuViel <= 1) continue;
      const s = getComputedStyle(el);
      if (s.overflowX !== "auto" && s.overflowX !== "scroll") continue;
      /*
        Ausdrücklich erklärtes waagerechtes Scrollen wird übersprungen.

        Die Regel nahm bis hier an, `overflow-x: auto` entstehe immer aus
        Versehen. Das stimmt fast immer -- aber nicht bei der Reiterleiste der
        Hilfe, die auf schmalen Geräten bewusst seitwärts läuft, statt vier
        Reiter unlesbar zu quetschen. Sie meldete 176 px.

        Der Ausweg ist ein Marker am Element, kein Sonderfall hier: Wer
        waagerecht scrollen will, schreibt es hin. Damit bleibt die Regel
        streng, und jede Ausnahme steht dort, wo sie gilt -- nachlesbar für
        den Nächsten, statt in einer Liste im Prüfcode zu verstauben.
      */
      if (el.getAttribute("data-scroll-x") === "absicht") continue;
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
}

/**
 * Trefferflächen. Seit dem 2026-09-02 gilt für dieses Projekt **Stufe AAA**,
 * WCAG 2.5.5 Target Size (Enhanced): 44 × 44 CSS-Pixel. Bis dahin stand hier
 * die AA-Stufe (2.5.8, 24 px) -- die Regel im Dokument und der Wert im Test
 * gingen auseinander, und genau dieser Widerspruch hat die Entscheidung
 * ausgelöst.
 *
 * Geprüft wird gegen **43,5 px**, nicht gegen 44: Die Vorschau rendert mit
 * Faktor 0,99993, ein 44-px-Element misst dort 43,997 px.
 *
 * Zwei Klassen, zwei Schwellen:
 *
 * - **Im Tab-Lauf → 43,5 px.** Die Schwelle sichert einen erreichten Stand
 *   gegen den Rückschritt; im ersten Lauf fand sie zugleich drei Verstöße im
 *   Schreibtisch-Profil, die einer Handmessung bei 360 px entgangen waren.
 * - **Außerhalb des Tab-Laufs → 24 px.** Das sind die ±5-Tasten in
 *   `CounterField.tsx` (`aria-hidden`, `tabIndex={-1}`), gemessen 44,6 / 41,7 /
 *   40,0 px über die drei Schriftgrößen. Sie fallen unter die Ausnahme
 *   "Equivalent" in 2.5.5: Dieselbe Funktion ist über ±1 und das Zahlenfeld
 *   erreichbar, beide über 44 px. Die Begründung steht im Quelltext an der
 *   Stelle selbst, nicht nur hier.
 *
 * Diese Prüfung sah bis 2026-09-01 nur das Formular an. Deshalb ist ihr ein
 * Schieberegler mit **168 × 6 px** entgangen (Aufteilung der Stunden im
 * Ausstempel-Formular).
 */
async function findeZuKleineZiele(page: Page) {
  return page.evaluate(() => {
    const treffer: string[] = [];
    for (const el of Array.from(document.querySelectorAll("button, a[href], input, select"))) {
      /*
        Bei einem Bedienelement in einem umschliessenden <label> ist die
        Trefferflaeche das Label, nicht das Kaestchen: Ein Klick irgendwo im
        Label schaltet die Auswahl. WCAG misst die Flaeche, die der Zeiger
        treffen muss -- 2.5.5 spricht von der Flaeche, die die Eingabe
        entgegennimmt, nicht vom gezeichneten Kaestchen.

        Ohne diese Zeilen meldete die Pruefung die beiden Kaestchen der
        Datensicherung mit 24 x 24 und 20 x 20 px als Verstoss. Der Klickbereich
        ist dort in Wahrheit die ganze Beschriftungszeile. Die Kaestchen auf
        44 px aufzublasen haette die Pruefung beruhigt und die Oberflaeche
        verschlechtert -- eine Messung, die zu einer schlechteren App fuehrt,
        misst das Falsche.
      */
      const label = el.tagName === "INPUT" ? el.closest("label") : null;
      const ziel = (label ?? el) as HTMLElement;
      /*
        Gemessen wird der LAYOUT-Kasten (offsetWidth/offsetHeight), nicht
        getBoundingClientRect.

        Der Unterschied: getBoundingClientRect rechnet CSS-Transformationen
        mit. Modale Fenster starten in diesem Projekt mit `scale(0.95)`, und
        wo nicht kompositiert wird -- in der Vorschau bei ausgeblendetem
        Bereich, im kopflosen CI-Lauf -- bleiben sie darin stecken. Eine
        44-px-Taste misst dann 41,8 px, also exakt 44 x 0,95. Genau das hat am
        2026-09-02 den Lauf auf dem CI-Laeufer zerrissen, waehrend er lokal
        gruen war: `w-11 h-11 min-w-[44px] min-h-[44px]` als angeblicher
        Verstoss. Warten hilft dort nicht, weil die Animation nie weiterlaeuft.
        `CLAUDE.md` fuehrt diesen Messfehler seit laengerem unter den
        Messfallen -- er hat hier trotzdem zugeschlagen.

        Der Layout-Kasten ist gegen diese Klasse immun und ist zugleich das,
        was WCAG meint: die Groesse, die das Bedienelement im Layout einnimmt.
        Erkauft wird das mit einer blinden Stelle -- ein dauerhaft per
        Transformation verkleinertes Bedienelement faellt nicht auf. In dieser
        App gibt es das nicht; Transformationen sind hier ausschliesslich
        Eintritts- und Druck-Animationen.

        Die Schwelle ist deshalb wieder 44 statt 43,5: offsetWidth ist ganzzahlig,
        der Renderfaktor 0,99993 spielt hier keine Rolle mehr.
      */
      const breite = ziel.offsetWidth;
      const hoehe = ziel.offsetHeight;
      if (breite === 0 || hoehe === 0) continue; // unsichtbar
      const ausserhalbTabLauf =
        el.getAttribute("tabindex") === "-1" || el.getAttribute("aria-hidden") === "true";
      const schwelle = ausserhalbTabLauf ? 24 : 44;
      if (breite < schwelle || hoehe < schwelle) {
        treffer.push(
          `${el.tagName}"${(el.textContent || (el as HTMLElement).ariaLabel || "").trim().slice(0, 28)}" ${breite}×${hoehe} (Schwelle ${schwelle})`,
        );
      }
    }
    return treffer;
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
        const { scrollBreite, sichtBreite, ueberstehende } = await findeUeberlauf(page);

        // Gleichheit, nicht "kleiner gleich": Ein Ueberlauf von einem einzigen
        // Pixel ist bereits eine waagerechte Bildlaufleiste.
        expect(
          scrollBreite,
          `${ansicht.name} / ${groesse}: ${scrollBreite} px Inhalt bei ${sichtBreite} px Fenster` +
            (ueberstehende.length ? `\nÜbersteht: ${ueberstehende.join("\n           ")}` : ""),
        ).toBeLessThanOrEqual(sichtBreite);

        const versteckte = await findeVerstecktenUeberlauf(page);

        expect(versteckte, `${ansicht.name} / ${groesse}: verstecktes Seitwärtsscrollen`).toEqual([]);

        const zuKlein = await findeZuKleineZiele(page);

        expect(
          zuKlein,
          `${ansicht.name} / ${groesse}: Trefferfläche unterschritten — ${zuKlein.join(" | ")}`,
        ).toEqual([]);
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

/**
 * Kontrast in den drei weiteren Farbschemata.
 *
 * Warum es das gibt: Der axe-Durchlauf oben läuft ohne gesetztes `data-theme`,
 * also ausschließlich im Standardschema. Ausgerechnet die beiden
 * Hochkontrast-Schemata — die für die Zielgruppe dieser App gebaut wurden —
 * waren damit als einzige nicht fortlaufend abgesichert. Aufgefallen ist das
 * beim Schreiben des Konformitätsberichts am 2026-09-02, nicht im Betrieb.
 *
 * Die Vorgeschichte macht die Lücke ernst: Vor 0.9.9/0.9.10 lagen im Schema
 * „Gelb auf Schwarz" **51 von 141** Textelementen unter dem Mindestkontrast,
 * das schlechteste bei 1,05:1 — weil über 500 Stellen feste Tailwind-Farben
 * nutzten, die jede Theme-Wahl ignorieren. Behoben ist das; ungeprüft war es
 * bis hier.
 *
 * Drei bewusste Einschränkungen, damit die Laufzeit vertretbar bleibt:
 *
 * - **Nur die Regel `color-contrast`.** Alles andere hängt nicht am Farbschema
 *   und wird oben bereits vollständig geprüft.
 * - **Nur Schriftgröße „normal".** axe wendet die WCAG-Ausnahme für großen
 *   Text an (3:1 statt 4,5:1), sobald die berechnete Schriftgröße es hergibt —
 *   die größeren Stufen sind also die *leichteren* Fälle, nicht die schärferen.
 * - **Nicht in WebKit.** Kontrast berechnet axe aus CSS-Werten, nicht aus
 *   gezeichneten Pixeln; die Engine ändert daran nichts. Beide Chromium-Profile
 *   laufen mit, weil die Seitenleiste nur im Schreibtisch-Layout existiert —
 *   und genau dort saß 0.9.18 einer der beiden echten Kontrastfehler (3,59:1).
 */
const FARBSCHEMATA = [
  { id: "dark", name: "Dunkel" },
  { id: "high-contrast-dark", name: "Kontrast dunkel" },
  { id: "high-contrast-yellow", name: "Kontrast gelb" },
] as const;

/**
 * Das Schema wird über `localStorage` gesetzt, nicht über die Attribute.
 *
 * Das ist der Unterschied zwischen einer Messung und einem Artefakt: Die App
 * setzt `data-theme` UND `data-dark`, letzteres steuert Tailwinds
 * `dark:`-Varianten (siehe `@custom-variant` in `index.css`). Wer hier nur
 * `data-theme` von Hand setzt, misst eine Kombination, die im Betrieb nie
 * vorkommt — dunkle Flächen mit hellen Tailwind-Farben darauf.
 */
async function oeffneMitSchema(page: Page, tab: string, schema: string) {
  await page.addInitScript((s) => {
    localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
    localStorage.setItem("aussendienst_pwa_a11y", JSON.stringify({ theme: s }));
  }, schema);
  await page.goto(`/?tab=${tab}`, { waitUntil: "domcontentloaded" });
  await page.locator("button").first().waitFor({ state: "attached", timeout: 15_000 });
  await page.waitForTimeout(250);
}

test.describe("Kontrast in allen Farbschemata", () => {
  for (const ansicht of ANSICHTEN) {
    for (const schema of FARBSCHEMATA) {
      test(`${ansicht.name} im Schema „${schema.name}"`, async ({ page }, testInfo) => {
        test.skip(
          testInfo.project.name === "handy-webkit",
          "Kontrast folgt den CSS-Werten, nicht der Engine",
        );

        await oeffneMitSchema(page, ansicht.tab, schema.id);

        // Erst nachweisen, dass das Schema wirklich anliegt. Ohne diese Zeilen
        // wäre ein gruener Lauf auch dann gruen, wenn die Einstellung gar nicht
        // ankommt -- eine Pruefung, die nichts prueft, ist schlimmer als keine.
        const lage = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute("data-theme"),
          dark: document.documentElement.getAttribute("data-dark"),
        }));
        expect(lage.theme, `Schema ${schema.id} wurde nicht angewandt`).toBe(schema.id);
        expect(lage.dark, `data-dark passt nicht zu ${schema.id}`).toBe("true");

        await warteAufRuhigesLayout(page);

        const ergebnis = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();

        // Zweiter Nachweis, dass hier nicht ins Leere geprueft wird: Ein
        // falsch geschriebener Regelname laesst axe null Regeln ausfuehren und
        // meldet null Verstoesse -- gruen aus demselben Grund, aus dem eine
        // nicht ausgefuehrte Pruefung gruen ist. Geprueft wird deshalb, dass
        // die Regel ueberhaupt Elemente betrachtet hat.
        const betrachtet =
          ergebnis.passes.length + ergebnis.violations.length + ergebnis.incomplete.length;
        expect(
          betrachtet,
          `axe hat die Regel color-contrast in "${schema.name}" nicht ausgefuehrt`,
        ).toBeGreaterThan(0);

        const befunde = ergebnis.violations.flatMap((v) =>
          v.nodes.map(
            (n) =>
              `${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`,
          ),
        );

        expect(befunde, `${ansicht.name} / ${schema.name}`).toEqual([]);
      });
    }
  }
});

/**
 * Die sechs Ansichten hinter den Einstiegen.
 *
 * Warum es das gibt: Die Anwendung kennt **elf** Ansichten, geprüft wurden bis
 * zum 2026-09-02 **fünf**. Die anderen sechs sind nicht über `?tab=`
 * erreichbar — die Weiche in `App.tsx` nimmt nur die fünf entgegen. Sie
 * mussten also angeklickt werden, und genau daran ist die Abdeckung hängen
 * geblieben: Der Konformitätsbericht führte „Dialoge nicht abgedeckt" als
 * größte Lücke; beim Nachsehen waren es gar keine Dialoge, sondern vollwertige
 * Ansichten mit historischen Namen (`ManageModal`, `HistoryModal` und so fort).
 *
 * Geräte-Sync und Datensicherung werden zusätzlich per `React.lazy`
 * nachgeladen — das Warten auf die Überschrift deckt das mit ab.
 *
 * Zwei bewusste Beschränkungen, damit die Laufzeit tragbar bleibt:
 *
 * - **Zwei Schriftgrößen statt drei.** „Normal" und „Extra groß" sind die
 *   beiden Enden, und jedes ist aus eigenem Grund der strengere Fall: Bei
 *   „Normal" sind fest bemessene Elemente am kleinsten — so wurden die
 *   38-px-Reiter der Zeit-Ansicht gefunden. Bei „Extra groß" ist die Zeile am
 *   engsten — so wurde der Überlauf gefunden. „Groß" liegt dazwischen.
 * - **axe nur in den beiden Chromium-Profilen**, aus demselben Grund wie bei
 *   der Kontrastprüfung. Die Geometrie läuft dagegen auch in WebKit, weil
 *   Layout sehr wohl von der Engine abhängt.
 */
const EINSTIEGE = [
  {
    name: "Formular anpassen",
    start: "options",
    einstieg: /Formular anpassen/,
    ueberschrift: /Formular anpassen/,
  },
  {
    name: "Geräte-Sync",
    start: "options",
    einstieg: /Geräte-Sync/,
    ueberschrift: /Geräte-Synchronisation/,
  },
  {
    name: "Datensicherung",
    start: "options",
    einstieg: /Datensicherung/,
    ueberschrift: /Datensicherung/,
  },
  {
    name: "Hilfe",
    start: "options",
    einstieg: /Hilfe & Anleitung/,
    ueberschrift: /Hilfe & Handbuch/,
  },
  {
    name: "Jahreskonto",
    start: "time",
    einstieg: /Jahreskonto-Einstellungen/,
    ueberschrift: /Jahreskonto & Einstellungen/,
  },
  {
    // Punkt statt Apostroph: Die Quelle kann ' oder ’ enthalten, und daran
    // soll keine Pruefung haengen.
    name: "Was gibt's Neues",
    start: "options",
    einstieg: /Was gibt.s Neues/,
    ueberschrift: /Was gibt.s Neues/,
  },
] as const;

async function oeffneUeberEinstieg(page: Page, eintrag: (typeof EINSTIEGE)[number]) {
  await oeffne(page, eintrag.start);
  await page.getByRole("button", { name: eintrag.einstieg }).first().click();
  // Das Warten auf die Ueberschrift ist zugleich der Nachweis, dass die
  // Ansicht wirklich offen ist. Ohne ihn wuerde die Pruefung im Zweifel die
  // Optionen-Liste messen und gruen melden -- derselbe Fehler, gegen den
  // dieses Projekt inzwischen an drei Stellen anschreibt.
  await page
    .getByRole("heading", { name: eintrag.ueberschrift })
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(250);
}

/**
 * Eine breitere Schrift erzwingen, als auf diesem Rechner installiert ist.
 *
 * Warum es das gibt: Am 2026-09-02 ist der Deploy an drei Reflow-Fehlern
 * gescheitert, die hier **nicht reproduzierbar** waren. `ubuntu-latest` kennt
 * weder „Segoe UI" noch „Segoe UI Variable Text" und fällt auf eine breitere
 * Schrift zurück; textgetriebener Überlauf zeigt sich deshalb dort und nur
 * dort. Der Changelog schob 412 px Inhalt in ein 360-px-Fenster, ohne dass
 * eine einzige lokale Prüfung etwas gemerkt hätte.
 *
 * Der Schriftstapel der App ist eine Fallkette. Welches Glied greift,
 * entscheidet das Gerät — bei den Kollegen ein iPhone, auf dem Läufer ein
 * Linux ohne Microsoft-Schriften, im Zweifel ein Android mit Roboto. Diese
 * Prüfung stellt sicher, dass die Oberfläche das **breiteste** plausible Glied
 * verträgt, statt nur das schmalste zu kennen.
 *
 * Verdana ist absichtlich gewählt: deutlich breiter als Segoe UI, auf Windows
 * vorhanden, und wo sie fehlt (auf dem Läufer selbst) greift DejaVu Sans, die
 * ebenfalls breiter ist. In beiden Umgebungen wird also etwas anderes und
 * Breiteres geprüft als der Normalfall.
 *
 * Nur „Extra groß", nur ein Profil, nur Geometrie: Der Fehler tritt bei der
 * größten Schrift zuerst auf, hängt nicht am Motor und nicht am axe-Regelsatz.
 * Elf Ansichten, rund 40 Sekunden.
 */
async function erzwingeBreiteSchrift(page: Page) {
  await page.addInitScript(() => {
    const setze = () => {
      const st = document.createElement("style");
      st.textContent = '*{font-family:Verdana,"DejaVu Sans",sans-serif !important}';
      document.head.appendChild(st);
    };
    if (document.head) setze();
    else document.addEventListener("DOMContentLoaded", setze);
  });
}

async function pruefeGeometrie(page: Page, name: string) {
  const { scrollBreite, sichtBreite, ueberstehende } = await findeUeberlauf(page);
  expect(
    scrollBreite,
    `${name}: ${scrollBreite} px Inhalt bei ${sichtBreite} px Fenster` +
      (ueberstehende.length ? `\nÜbersteht: ${ueberstehende.join("\n           ")}` : ""),
  ).toBeLessThanOrEqual(sichtBreite);

  const versteckte = await findeVerstecktenUeberlauf(page);
  expect(versteckte, `${name}: verstecktes Seitwärtsscrollen`).toEqual([]);

  const zuKlein = await findeZuKleineZiele(page);
  expect(zuKlein, `${name}: Trefferfläche unterschritten — ${zuKlein.join(" | ")}`).toEqual([]);
}

test.describe("Breitere Schrift als hier installiert", () => {
  for (const ansicht of ANSICHTEN) {
    test(`${ansicht.name} mit breiter Schrift`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Schriftbreite haengt nicht am Geraeteprofil");
      await erzwingeBreiteSchrift(page);
      await oeffne(page, ansicht.tab);
      await setzeSchriftgroesse(page, "extra-large");
      await warteAufRuhigesLayout(page);
      await pruefeGeometrie(page, `${ansicht.name} / breit`);
    });
  }

  for (const eintrag of EINSTIEGE) {
    test(`${eintrag.name} mit breiter Schrift`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Schriftbreite haengt nicht am Geraeteprofil");
      await erzwingeBreiteSchrift(page);
      await oeffneUeberEinstieg(page, eintrag);
      await setzeSchriftgroesse(page, "extra-large");
      await warteAufRuhigesLayout(page);
      await pruefeGeometrie(page, `${eintrag.name} / breit`);
    });
  }
});

test.describe("Ansichten hinter den Einstiegen", () => {
  for (const eintrag of EINSTIEGE) {
    for (const groesse of ["normal", "extra-large"] as const) {
      test(`${eintrag.name} bei Schriftgröße ${groesse}`, async ({ page }) => {
        await oeffneUeberEinstieg(page, eintrag);
        await setzeSchriftgroesse(page, groesse);
        await warteAufRuhigesLayout(page);

        const { scrollBreite, sichtBreite, ueberstehende } = await findeUeberlauf(page);
        expect(
          scrollBreite,
          `${eintrag.name} / ${groesse}: ${scrollBreite} px Inhalt bei ${sichtBreite} px Fenster` +
            (ueberstehende.length ? `\nÜbersteht: ${ueberstehende.join("\n           ")}` : ""),
        ).toBeLessThanOrEqual(sichtBreite);

        const versteckte = await findeVerstecktenUeberlauf(page);
        expect(
          versteckte,
          `${eintrag.name} / ${groesse}: verstecktes Seitwärtsscrollen`,
        ).toEqual([]);

        const zuKlein = await findeZuKleineZiele(page);
        expect(
          zuKlein,
          `${eintrag.name} / ${groesse}: Trefferfläche unterschritten — ${zuKlein.join(" | ")}`,
        ).toEqual([]);
      });
    }

    test(`${eintrag.name} ohne schwere Verstöße`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name === "handy-webkit",
        "axe wertet DOM und CSS aus, nicht die Engine",
      );
      await oeffneUeberEinstieg(page, eintrag);

      const ergebnis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      const schwer = ergebnis.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      const befunde = schwer.flatMap((v) =>
        v.nodes.map(
          (n) =>
            `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`,
        ),
      );

      expect(befunde, `${eintrag.name}`).toEqual([]);
    });
  }
});

/**
 * Der Tabulator-Durchlauf.
 *
 * Warum es das gibt: **2.4.3 Fokus-Reihenfolge und 2.1.1 Tastatur waren bis
 * zum 2026-09-02 nie geprüft** — in einer App, deren Nutzer ausschließlich per
 * Tastatur und Screenreader arbeiten. Der Konformitätsbericht führte das als
 * schwerste offene Stelle. Die Messung zu 2.4.11 hat es sogar ausdrücklich
 * offengelassen: Sie arbeitete mit `element.focus()`, nicht mit der echten
 * Tabulatortaste, und prüfte damit die Reihenfolge gerade nicht.
 *
 * Geprüft wird dreierlei, alles mit echten Tastendrücken:
 *
 * 1. **Erreichbarkeit** — jedes sichtbare, nicht ausgenommene Bedienelement
 *    wird vom Tabulator getroffen. Was hier fehlt, ist per Tastatur schlicht
 *    nicht bedienbar (2.1.1).
 * 2. **Reihenfolge** — der Fokus läuft in Dokumentreihenfolge vorwärts. Ein
 *    Rückwärtssprung bedeutet in der Praxis ein positives `tabindex`, das die
 *    Reihenfolge umsortiert; das ist die klassische Ursache für eine
 *    Bedienung, die vorgelesen keinen Sinn mehr ergibt (2.4.3).
 * 3. **Keine Falle** — der Durchlauf kommt innerhalb einer Runde wieder am
 *    Anfang an, statt an einer Stelle hängen zu bleiben (2.1.2).
 *
 * Was hier NICHT geprüft wird, damit der Bericht ehrlich bleibt: ob die
 * Reihenfolge *sinnvoll* ist. Dass sie der Dokumentreihenfolge folgt, ist eine
 * notwendige Bedingung, keine hinreichende — ob das Vorgelesene trägt,
 * entscheidet weiterhin der Durchlauf mit NVDA und VoiceOver.
 */
async function tabulatorDurchlauf(page: Page, maxSchritte = 400) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });

  const folge: { idx: number; tag: string; name: string }[] = [];
  for (let i = 0; i < maxSchritte; i++) {
    await page.keyboard.press("Tab");
    const stelle = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) return null;
      const kandidaten = Array.from(
        document.querySelectorAll("button, a[href], input, select, textarea, [tabindex]"),
      );
      return {
        idx: kandidaten.indexOf(el),
        tag: el.tagName,
        name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 32),
      };
    });

    /*
      NICHT abbrechen, wenn der Fokus das Dokument verlaesst.

      Beim Umlauf wandert er kurz in die Browserleiste; `activeElement` ist
      dann `body` und diese Auswertung liefert null. Die erste Fassung dieser
      Schleife brach dort ab -- mit der Folge, dass der Durchlauf genau vor dem
      Seitenanfang endete. Sie meldete daraufhin den Sprunglink als "per
      Tabulator nicht erreichbar", obwohl er das erste erreichbare Element
      ueberhaupt ist, und deutete den Umlauf als Rueckwaertssprung. Vier
      angebliche Befunde, alle aus einer Zeile.
    */
    if (!stelle) continue;

    // Runde geschlossen, sobald das erste Element wieder auftaucht. Wo der
    // Durchlauf begonnen hat, ist gleichgueltig -- die Runde ist dieselbe,
    // nur gedreht.
    if (folge.length > 0 && stelle.idx === folge[0].idx && stelle.idx !== -1) break;
    folge.push(stelle);
  }
  return folge;
}

test.describe("Tastatur: Erreichbarkeit und Reihenfolge", () => {
  const alleAnsichten = [
    ...ANSICHTEN.map((a) => ({ name: a.name, oeffne: (p: Page) => oeffne(p, a.tab) })),
    ...EINSTIEGE.map((e) => ({ name: e.name, oeffne: (p: Page) => oeffneUeberEinstieg(p, e) })),
  ];

  for (const ansicht of alleAnsichten) {
    test(`${ansicht.name}: jedes Bedienelement per Tabulator erreichbar`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "handy",
        "Die Tabulatorreihenfolge folgt dem DOM, nicht dem Geraeteprofil",
      );
      await ansicht.oeffne(page);
      await warteAufRuhigesLayout(page);

      const folge = await tabulatorDurchlauf(page);

      // 1. Keine Falle: Der Durchlauf muss enden, nicht ins Limit rennen.
      expect(
        folge.length,
        `${ansicht.name}: Der Tabulator kam in 220 Schritten nicht zum Anfang zurueck — Verdacht auf Tastaturfalle`,
      ).toBeLessThan(220);

      /*
        2. Reihenfolge: vorwaerts in Dokumentreihenfolge.

        Genau EIN Rueckschritt ist erlaubt und erwartet -- der Umlauf vom
        letzten zum ersten Element. Weil der Durchlauf irgendwo beginnen kann
        (nach einem Klick steht der Fokus mitten in der Seite), liegt dieser
        Rueckschritt nicht zwangslaeufig am Ende der aufgezeichneten Folge.
        Zwei oder mehr Rueckschritte bedeuten dagegen eine echte Umsortierung,
        in der Praxis fast immer ein positives `tabindex`.

        Gleicher Index zweimal hintereinander ist KEIN Rueckschritt, sondern
        Navigation innerhalb eines Bedienelements: `<input type="month">` in
        der Formular-Kopfzeile besteht in Chromium aus zwei inneren Feldern
        (Monat und Jahr), zwischen denen der Tabulator laeuft, ohne das
        Element zu verlassen. Dasselbe gilt fuer die `date`- und `time`-Felder
        der Stempeluhr. Die erste Fassung dieser Pruefung meldete das als
        doppelten Rueckwaertssprung im Formular.
      */
      const rueckwaerts: string[] = [];
      for (let i = 1; i < folge.length; i++) {
        if (folge[i].idx < folge[i - 1].idx && folge[i].idx !== -1) {
          rueckwaerts.push(
            `Schritt ${i}: ${folge[i - 1].tag}"${folge[i - 1].name}" (${folge[i - 1].idx}) -> ${folge[i].tag}"${folge[i].name}" (${folge[i].idx})`,
          );
        }
      }
      expect(
        rueckwaerts.length,
        `${ansicht.name}: Fokus springt mehrfach entgegen der Dokumentreihenfolge — ${rueckwaerts.join(" | ")}`,
      ).toBeLessThanOrEqual(1);

      /*
        3. Erreichbarkeit: alles Sichtbare, das nicht ausgenommen ist.

        Ausnahme fuer echte modale Dialoge: Liegt ein sichtbares Element mit
        `aria-modal="true"` vor, ist der Rest der Seite mit Absicht nicht
        erreichbar -- so arbeitet eine Fokusfalle, und sie gehoert dorthin.
        Geprueft wird dann, dass alles IM Dialog erreichbar ist.

        Der Unterschied ist nicht theoretisch: `DeviceSyncModal` ist ein echtes
        Overlay mit abgedunkeltem Hintergrund und faellt hierunter. Das
        Jahreskonto sah fuer diese Pruefung genauso aus, war aber eine
        gewoehnliche Karte im Seitenfluss -- dort war die Falle ein Fehler und
        ist entfernt.
      */
      const nichtErreicht = await page.evaluate((erreichteIdx) => {
        const dialog = Array.from(document.querySelectorAll('[aria-modal="true"]')).find(
          (d) => (d as HTMLElement).offsetWidth > 0,
        );
        // ACHTUNG: exakt derselbe Selektor wie im Durchlauf. Steht hier eine
        // andere Liste, zeigen die Indizes in einen anderen Raum und die
        // Pruefung meldet Unsinn -- beim Schreiben genau einmal passiert.
        const kandidaten = Array.from(
          document.querySelectorAll("button, a[href], input, select, textarea, [tabindex]"),
        );
        const fehlt: string[] = [];
        kandidaten.forEach((el, i) => {
          const h = el as HTMLElement;
          if (h.offsetWidth === 0 || h.offsetHeight === 0) return; // unsichtbar
          if ((el as HTMLButtonElement).disabled) return;
          if (el.getAttribute("tabindex") === "-1") return;
          if (el.closest('[aria-hidden="true"]')) return;
          if (dialog && !dialog.contains(el)) return; // hinter einem modalen Dialog
          if (erreichteIdx.includes(i)) return;
          fehlt.push(
            `${el.tagName}"${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28)}"`,
          );
        });
        return fehlt;
      }, folge.map((f) => f.idx));

      expect(
        nichtErreicht,
        `${ansicht.name}: per Tabulator nicht erreichbar — ${nichtErreicht.join(" | ")}`,
      ).toEqual([]);
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
