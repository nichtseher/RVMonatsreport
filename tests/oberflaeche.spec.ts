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
      /*
        EINE Schwelle, 44 px -- seit 0.9.22.

        Bis dahin gab es hier zwei Klassen: 44 px im Tab-Lauf und 24 px für
        alles mit `tabindex="-1"` oder `aria-hidden="true"`. Die zweite Klasse
        hatte genau zwei Mitglieder, die ±5-Tasten des Zählers, und sie war die
        einzige Stelle, an der diese App die Gleichwertigkeitsausnahme aus WCAG
        2.5.5 in Anspruch nahm.

        Mit dem Wegfall der ±5-Tasten trägt kein Bedienelement mehr `tabindex
        ="-1"` oder `aria-hidden` (geprüft über `src/`: übrig sind ein
        Container in `HistoryModal` und eine Überschrift in `OnboardingModal`,
        beides keine Bedienelemente). Die Ausnahme hat damit niemanden mehr --
        und eine Ausnahme ohne Fall ist eine offene Tür.

        Wer sie wieder braucht, führt sie mit Begründung im Quelltext ein und
        trägt sie hier UND in `CLAUDE.md` nach. Ein Prüfgate, das eine andere
        Schwelle durchsetzt als das Dokument fordert, war schon einmal der
        Auslöser für eine Grundsatzentscheidung (2026-09-02).
      */
      if (breite < 44 || hoehe < 44) {
        treffer.push(
          `${el.tagName}"${(el.textContent || (el as HTMLElement).ariaLabel || "").trim().slice(0, 28)}" ${breite}×${hoehe}`,
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
    /*
      `manage` -- bis zum 2026-09-07 die einzige der elf Ansichten, die keine
      Prüfung je gesehen hat.

      Warum sie durchs Netz fiel: Der Eintrag „Formular anpassen" klickt eine
      Menüzeile in `A11yModal` und landet auf einem UNTERMENÜ gleichen Namens
      -- kein eigener `activeTab`, sondern ein Zustand innerhalb der Optionen.
      `ManageModal` liegt eine Ebene tiefer, hinter „Eigene Felder löschen",
      und trägt die Überschrift „Formularfelder verwalten". Die Prüfung wartete
      auf „Formular anpassen", fand es sofort -- und maß seither die falsche
      Ansicht. Von elf Ansichten waren also zehn abgedeckt, nicht elf.

      Was dort überlebt hat: dieselbe Fokusfalle, die am 2026-09-02 aus
      `CarryoverModal` entfernt wurde, plus vier weitere Defekte.
    */
    name: "Felder verwalten",
    start: "options",
    einstieg: /Formular anpassen/,
    dann: /Eigene Felder löschen/,
    ueberschrift: /Formularfelder verwalten/,
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
  // Manche Ansichten liegen zwei Ebenen tief. Ohne diesen Schritt landete die
  // Prüfung auf dem Untermenü und meldete grün für die falsche Ansicht.
  const weiter = (eintrag as { dann?: RegExp }).dann;
  if (weiter) {
    await page.getByRole("button", { name: weiter }).first().click();
  }
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

  /*
    Die Zustände INNERHALB einer Ansicht fehlen hier -- sie stehen am Ende
    der Datei in „Zustände mit breiter Schrift". Der Grund ist banal und
    zwingend: `test.describe` führt seinen Rumpf sofort beim Einlesen aus,
    und die Listen der Zustände sind dort noch nicht angelegt.
  */
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
/**
 * Zaehlt die Elemente, die der Tabulator treffen muss. Der Durchlauf wird
 * daran gebunden statt an eine feste Obergrenze -- siehe dort.
 */
async function zaehleErreichbare(page: Page) {
  return page.evaluate(() => {
    const dialog = Array.from(document.querySelectorAll('[aria-modal="true"]')).find(
      (d) => (d as HTMLElement).offsetWidth > 0,
    );
    let n = 0;
    for (const el of Array.from(
      document.querySelectorAll("button, a[href], input, select, textarea, [tabindex]"),
    )) {
      const h = el as HTMLElement;
      if (h.offsetWidth === 0 || h.offsetHeight === 0) continue;
      if ((el as HTMLButtonElement).disabled) continue;
      if (el.getAttribute("tabindex") === "-1") continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      if (dialog && !dialog.contains(el)) continue;
      n++;
    }
    return n;
  });
}

/**
 * Tabulator-Runde.
 *
 * `zielAnzahl` beendet die Schleife, sobald so viele **verschiedene** Elemente
 * gesehen wurden -- das ist die eigentliche Abbruchbedingung, nicht
 * `maxSchritte`.
 *
 * Warum das nötig wurde: Die Schrittzahl war auf „Anzahl erreichbarer Elemente
 * plus 30" gedeckelt, und am 2026-09-07 lief der Durchlauf im Gesamtlauf
 * **zwei Elemente vor Rundenschluss** aus dem Budget — gemeldet wurden „RV
 * Archiv" und „Optionen" als angeblich unerreichbar. Einzeln bestand derselbe
 * Test; die Erreichbarkeit war also nie das Problem, das Budget schon.
 *
 * Warum die feste Zugabe nicht reicht: Nicht jedes Element ist ein einzelner
 * Tabulatorschritt. Der Fokus wandert beim Umlauf durch die Browserleiste,
 * das Zahlenfeld ruft beim Fokussieren `select()` und stößt damit ein neues
 * Rendern an, und das Fokussieren eines Zählerfelds tauscht die untere Leiste
 * gegen eine andere aus — die Menge der Stationen ändert sich also *während*
 * des Laufens. Unter Last verschiebt sich das genug, um eine feste Zugabe zu
 * sprengen. Ein großzügiges Limit kostet nichts, weil die Schleife ohnehin
 * aussteigt, sobald die Runde vollständig ist.
 */
async function tabulatorDurchlauf(
  page: Page,
  maxSchritte = 400,
  zielAnzahl?: number,
  wartezeit = 40,
) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });

  const folge: { idx: number; tag: string; name: string }[] = [];
  for (let i = 0; i < maxSchritte; i++) {
    await page.keyboard.press("Tab");
    /*
      Kurz warten, bevor gemessen wird -- und zwar aus einem gemessenen Grund.

      Das Fokussieren eines Zählerfelds blendet die untere Hauptnavigation aus
      und eine Feld-Werkzeugleiste ein (`focusedFieldId` in `App.tsx`). Beim
      Verlassen kommt die Navigation zurück, aber erst nach einer
      Verzögerung von 120 ms plus Rendern -- nachgemessen am 2026-09-07: nach
      50 ms war sie weg, nach 450 ms wieder da.

      Ohne diese Pause tabbt die Prüfung schneller, als die Oberfläche
      nachkommt, und meldete „RV Archiv" und „Optionen" als unerreichbar. Das
      ist kein Erreichbarkeitsfehler, sondern eine Wettlaufsituation in der
      Messung: Ein Mensch tippt nicht 25-mal in 400 ms.

      Was dabei als echte Zerbrechlichkeit übrig bleibt -- sehr schnelles
      Tabben kann an der Navigation vorbeilaufen -- steht als eigener Punkt in
      der ROADMAP. Diese Prüfung ist nicht der Ort, ihn zu erzwingen.
    */
    await page.waitForTimeout(wartezeit);
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

    // Alle gesuchten Stationen gesehen -- weiterlaufen brächte nichts.
    // `idx === -1` heißt „stand beim Messen nicht in der Kandidatenliste" und
    // darf nicht mitzählen, sonst steigt die Schleife zu früh aus.
    if (zielAnzahl !== undefined) {
      const verschieden = new Set(folge.filter((f) => f.idx >= 0).map((f) => f.idx)).size;
      if (verschieden >= zielAnzahl) break;
    }
  }
  return folge;
}

/**
 * WCAG 1.4.12 Textabstand (AA).
 *
 * Das Kriterium nennt vier Werte, die ein Nutzer per eigenem Stylesheet
 * erzwingen koennen muss, ohne dass Inhalt oder Funktion verlorengeht:
 * Zeilenhoehe mindestens das 1,5-Fache der Schriftgroesse, Abstand nach
 * Absaetzen das 2-Fache, Sperrung das 0,12-Fache, Wortabstand das 0,16-Fache.
 *
 * Das ist kein theoretischer Fall: Wer schlecht sieht, stellt genau diese
 * Werte im Browser oder per Erweiterung ein -- es ist eine der wirksamsten
 * Lesehilfen ueberhaupt. Bis zum 2026-09-02 stand das Kriterium im
 * Konformitaetsbericht als "nicht geprueft".
 *
 * Geprueft wird mit denselben Messungen wie sonst: Kein Ueberlauf der Seite,
 * kein verstecktes Seitwaertsscrollen, keine unterschrittene Trefferflaeche.
 * Was hier NICHT geprueft wird: ob Text innerhalb eines Kastens abgeschnitten
 * wird, ohne den Kasten zu sprengen -- das braucht ein Auge.
 */
async function erzwingeTextabstand(page: Page) {
  await page.addInitScript(() => {
    const setze = () => {
      const st = document.createElement("style");
      st.textContent = `
        * {
          line-height: 1.5 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
        p, li { margin-bottom: 2em !important; }
      `;
      document.head.appendChild(st);
    };
    if (document.head) setze();
    else document.addEventListener("DOMContentLoaded", setze);
  });
}

/**
 * 320 px — die schmalste Breite, die noch im Einsatz ist.
 *
 * Das entspricht dem iPhone SE der 1. und 2. Generation. Die ROADMAP führte
 * die Breite als offene Frage: „tritt bei den großen Schriftgrößen über den
 * Kartenrand -- entweder bewusst als Nicht-Ziel festschreiben oder beheben."
 *
 * Am 2026-09-02 gemessen und behoben statt festgeschrieben. Der Grund ist
 * nicht Vollständigkeit, sondern die Zielgruppe: Die Fehler traten
 * ausschließlich bei „Extra groß" auf — also genau in der Einstellung, die
 * sehbehinderte Nutzer verwenden. „Das Gerät ist alt" ist dagegen ein
 * schwaches Argument, solange niemand weiß, welche Geräte die Kollegen
 * tatsächlich benutzen.
 *
 * Drei Fundstellen, alle dieselbe Ursache wie schon bei 360 px: Flex-Elemente,
 * die ihre Breite nicht unter den Inhalt preisgeben.
 *
 * | Ansicht | Überstand | Ursache |
 * |---|---|---|
 * | Optionen | 14 px | Taste „Was gibt's Neues?" mit `flex-shrink-0` |
 * | Analyse | 8 px | Umschalter Grafik/Tabelle bricht nicht um |
 * | Zeit | 2 px | die beiden Reiter ohne `min-w-0` |
 *
 * Geprüft wird nur bei „Extra groß": Bei den kleineren Schriftgrößen war 320
 * px durchgehend sauber, und die Laufzeit ist nicht gratis.
 */
test.describe("320 px (iPhone SE)", () => {
  const alle = [
    ...ANSICHTEN.map((a) => ({ name: a.name, oeffne: (p: Page) => oeffne(p, a.tab) })),
    ...EINSTIEGE.map((e) => ({ name: e.name, oeffne: (p: Page) => oeffneUeberEinstieg(p, e) })),
  ];

  for (const ansicht of alle) {
    test(`${ansicht.name} bei 320 px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Eine Breite genuegt, sie haengt nicht am Motor");
      /*
        Mit erzwungener Breitschrift, und das ist keine Verschaerfung um ihrer
        selbst willen: Auf dem Linux-Laeufer laeuft diese Zeile ohnehin mit
        einer breiteren Schrift, weil dort weder "Segoe UI" noch "Segoe UI
        Variable Text" vorliegt. Ohne die Erzwingung pruefte der lokale Lauf
        eine andere Kombination als das Deploy-Tor -- und genau daran ist der
        Push von f8ae712 gescheitert: lokal gruen, auf dem Laeufer rot.

        Schmal UND breite Schrift ist der eigentliche Grenzfall. Ihn nur
        halbiert zu pruefen, war die Luecke.
      */
      await erzwingeBreiteSchrift(page);
      await page.setViewportSize({ width: 320, height: 780 });
      await ansicht.oeffne(page);
      await setzeSchriftgroesse(page, "extra-large");
      await warteAufRuhigesLayout(page);
      await pruefeGeometrie(page, `${ansicht.name} / 320 px`);
    });
  }
});

test.describe("Textabstand nach WCAG 1.4.12", () => {
  const alle = [
    ...ANSICHTEN.map((a) => ({ name: a.name, oeffne: (p: Page) => oeffne(p, a.tab) })),
    ...EINSTIEGE.map((e) => ({ name: e.name, oeffne: (p: Page) => oeffneUeberEinstieg(p, e) })),
  ];

  for (const ansicht of alle) {
    test(`${ansicht.name} mit erzwungenem Textabstand`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== "handy",
        "Textabstand haengt nicht am Geraeteprofil",
      );
      await erzwingeTextabstand(page);
      await ansicht.oeffne(page);
      await warteAufRuhigesLayout(page);
      await pruefeGeometrie(page, `${ansicht.name} / Textabstand`);
    });
  }
});

/**
 * WCAG 1.4.13 Inhalt bei Hover oder Fokus (AA) und 3.3.1 / 3.3.3
 * Fehlererkennung und Fehlerempfehlung.
 *
 * **1.4.13** verlangt von Zusatzinhalt, der bei Hover oder Fokus erscheint,
 * dreierlei: Er muss schliessbar sein, ohne den Zeiger zu bewegen; er muss mit
 * dem Zeiger ueberfahrbar bleiben; und er muss stehen bleiben, bis der Nutzer
 * ihn wegnimmt.
 *
 * Der native Tooltip aus dem `title`-Attribut erfuellt **keine** dieser drei
 * Bedingungen -- Escape schliesst ihn nicht, ueberfahren laesst er sich nicht,
 * und er verschwindet von selbst. Auf einem Handy erscheint er ohnehin nie.
 * Am 2026-09-02 trugen drei Schaltflaechen in `App.tsx` ein solches Attribut,
 * alle drei zusaetzlich zu einem `aria-label` mit derselben Auskunft. Sie sind
 * entfernt; diese Pruefung haelt sie draussen.
 *
 * Die Vorgeschichte macht die Regel plausibel: In 0.9.13 stellte sich heraus,
 * dass Tooltips als `title`-*Attribut* auf SVG-Elementen nie funktioniert
 * hatten -- SVG braucht ein `<title>`-*Kindelement*. Niemand hatte es bemerkt,
 * weil ein Tooltip, den man nicht sieht, wie einer aussieht, den es nicht
 * gibt.
 */
test.describe("Tooltips und Fehlermeldungen", () => {
  for (const ansicht of ANSICHTEN) {
    test(`${ansicht.name}: keine nativen Tooltips`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Haengt nicht am Geraeteprofil");
      await oeffne(page, ansicht.tab);

      const tooltips = await page.evaluate(() =>
        Array.from(document.querySelectorAll("[title]")).map(
          (el) =>
            `${el.tagName}[title="${el.getAttribute("title")}"] "${(el.textContent || "").trim().slice(0, 24)}"`,
        ),
      );

      expect(
        tooltips,
        `${ansicht.name}: title-Attribut gefunden — nativer Tooltip, erfüllt WCAG 1.4.13 nicht: ${tooltips.join(" | ")}`,
      ).toEqual([]);
    });
  }

  test("Fehlermeldung benennt das Feld und schlägt die Korrektur vor", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "Haengt nicht am Geraeteprofil");

    await oeffneUeberEinstieg(page, EINSTIEGE.find((e) => e.name === "Datensicherung")!);

    // Verschluesselung einschalten und ein zu kurzes Passwort eingeben.
    /* Der Kasten heißt jetzt so, wie er beschriftet ist. Bis 0.9.21 trug er ein
       `aria-label="Verschlüsselung aktivieren"`, das die sichtbare Beschriftung
       „Backup mit Passwort schützen" überschrieb (WCAG 2.5.3) -- und diese
       Prüfung suchte ihn über genau diesen Namen und schrieb den Verstoß damit
       fest. Eine Prüfung, die einen Fehler zur Voraussetzung macht, verteidigt
       ihn. */
    await page.getByRole("checkbox", { name: /Backup mit Passwort schützen/ }).check();
    /* Genau das Passwortfeld, nicht „irgendetwas mit Passwort": Seit der Kasten
       darüber korrekt „Backup mit Passwort schützen" heißt, trifft `/Passwort/i`
       auch ihn -- und `.fill()` auf einem Kontrollkästchen scheitert. */
    await page.getByLabel("Passwort", { exact: true }).fill("ab");
    await page.getByRole("button", { name: /Auf Gerät speichern/ }).click();

    /*
      Der Befund muss dreierlei leisten:
      - sichtbar sein (3.3.1: der Fehler wird in Text beschrieben),
      - das betroffene Feld benennen,
      - die Korrektur nennen (3.3.3),
      und er muss ohne Fokuswechsel bei der Hilfstechnik ankommen -- deshalb
      wird auf `role="alert"` geprueft und nicht nur auf sichtbaren Text.
    */
    const meldung = page.getByRole("alert");
    await expect(meldung).toBeVisible({ timeout: 5_000 });
    const text = (await meldung.innerText()).trim();

    expect(text, "Die Meldung benennt das betroffene Feld nicht").toMatch(/Passwort/i);
    expect(text, "Die Meldung nennt die Korrektur nicht").toMatch(/\d|mindestens/i);
  });
});

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

      /*
        Die Schrittzahl haengt an der Zahl der erreichbaren Elemente, nicht an
        einer festen Obergrenze.

        Die erste Fassung lief bis 400 Schritte und verlangte, dass die
        Zyklus-Erkennung vorher greift. Die haengt aber an einem Index in der
        Kandidatenliste -- und der verschiebt sich, sobald React waehrend des
        Durchlaufs neu rendert (das Zahlenfeld ruft beim Fokussieren
        `select()` und loest damit Zustandsaenderungen aus). Traf das den
        ersten Eintrag, schloss sich die Runde nie und der Lauf rannte ins
        Limit. Ergebnis: ein Test, der einzeln bestand und im Gesamtlauf
        durchfiel -- die unangenehmste aller Fehlerarten, weil sie wie ein
        echter Befund aussieht.

        `anzahl + 30` war die erste Antwort darauf und hat am 2026-09-07
        wieder nicht gereicht: Im Gesamtlauf lief der Durchlauf ZWEI Elemente
        vor Rundenschluss aus dem Budget und meldete „RV Archiv" und
        „Optionen" als unerreichbar -- einzeln bestand derselbe Test. Eine
        feste Zugabe ist die falsche Stellschraube, weil sich die Menge der
        Stationen waehrend des Laufens aendert (siehe `tabulatorDurchlauf`).

        Jetzt ist die Zielzahl die Abbruchbedingung und die Schrittzahl nur
        noch eine Notbremse. Das kostet nichts: Ist die Runde vollstaendig,
        steigt die Schleife sofort aus. Bleibt wirklich etwas unerreichbar,
        laeuft sie bis zur Notbremse und meldet es -- also genau dann laenger,
        wenn es etwas zu melden gibt.
      */
      const anzahl = await zaehleErreichbare(page);
      const folge = await tabulatorDurchlauf(page, anzahl * 3 + 60, anzahl);

      // 1. Keine Falle: Der Fokus darf nicht an einer Stelle kleben bleiben.
      let laengsteWiederholung = 1;
      let lauf = 1;
      for (let i = 1; i < folge.length; i++) {
        lauf = folge[i].idx === folge[i - 1].idx ? lauf + 1 : 1;
        laengsteWiederholung = Math.max(laengsteWiederholung, lauf);
      }
      expect(
        laengsteWiederholung,
        `${ansicht.name}: Der Fokus blieb ${laengsteWiederholung} Schritte lang auf demselben Element — Verdacht auf Tastaturfalle`,
      ).toBeLessThanOrEqual(8);

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
      const nichtErreicht = await findeNichtErreichte(page, folge.map((f) => f.idx));

      /*
        Zweite Stufe: Ein Befund gilt erst, wenn er den langsamen Durchlauf
        überlebt.

        Warum das nötig ist -- und warum die Wartezeit allein es nicht löst:
        Die Menge der Stationen ändert sich WÄHREND des Laufens. Das
        Fokussieren eines Zählerfelds blendet die Hauptnavigation aus und eine
        Feld-Werkzeugleiste ein; beim Verlassen kommt die Navigation nach
        120 ms plus Rendern zurück. Unter Last (Gesamtlauf, geteilte CPU,
        CI-Läufer) verschiebt sich dieses Fenster genug, dass der schnelle
        Durchlauf an der Navigation vorbeiläuft.

        Belegt: Am 2026-09-02 hat genau das ZWEI Deploys zerrissen -- Meldung
        „Formular: per Tabulator nicht erreichbar — RV Archiv | Optionen",
        lokal jedes Mal grün. Am 2026-09-07 fiel derselbe Test im Gesamtlauf
        einmal durch und bestand einzeln dreimal. Ein fester Wartewert ist die
        falsche Stellschraube: Er ist immer entweder zu klein für den
        schlimmsten Fall oder zu teuer für den Normalfall.

        Die zweite Stufe kostet nur, wenn es etwas zu melden gibt. Im
        Normalfall ist `nichtErreicht` leer und dieser Block wird
        übersprungen. Meldet der langsame Durchlauf dasselbe Element erneut,
        ist es ein echter Befund -- und der Test sagt dann auch, dass er
        bestätigt ist.
      */
      let bestaetigt = nichtErreicht;
      if (nichtErreicht.length > 0) {
        await warteAufRuhigesLayout(page);
        const anzahl2 = await zaehleErreichbare(page);
        const folge2 = await tabulatorDurchlauf(page, anzahl2 * 3 + 60, anzahl2, 250);
        bestaetigt = await findeNichtErreichte(page, folge2.map((f) => f.idx));
      }

      expect(
        bestaetigt,
        `${ansicht.name}: per Tabulator nicht erreichbar (im langsamen Durchlauf bestätigt) — ${bestaetigt.join(" | ")}`,
      ).toEqual([]);
    });
  }
});

/**
 * Welche sichtbaren Bedienelemente hat der Durchlauf nicht getroffen?
 *
 * Steht als eigene Funktion da, weil sie zweimal gebraucht wird: einmal für
 * den schnellen Durchlauf und einmal für die Bestätigung im langsamen.
 */
async function findeNichtErreichte(page: Page, erreichteIdxListe: number[]) {
  return page.evaluate((erreichteIdx) => {
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
  }, erreichteIdxListe);
}

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

/**
 * Update-Hinweis.
 *
 * Warum es das gibt: Der Hinweis „Eine neue Fassung ist verfügbar" erscheint
 * nur, wenn tatsächlich ein Service-Worker-Update wartet. Er war damit die
 * einzige Bedienfläche der App, die dieses Prüfnetz nie zu sehen bekam — und
 * er sah entsprechend aus. Gemessen am 2026-09-07 an der gebauten App:
 *
 * | Element | vorher | Schwelle |
 * |---|---|---|
 * | „Jetzt aktualisieren" | 152 × 36 px | 44 px (WCAG 2.5.5) |
 * | „Später" | 41 × 20 px | 44 px — und sogar unter den 24 px der AA-Stufe |
 *
 * Dazu feste Farben außerhalb des Theme-Systems und `bottom: 1rem`, also genau
 * auf der schwebenden Hauptnavigation.
 *
 * `window.rvUpdateHinweis` ist der Prüfhaken dafür (siehe `index.html`). Er
 * erzeugt denselben Hinweis, den der echte Ablauf erzeugt — geprüft wird also
 * das Original und keine Nachbildung. Schlägt der erste `expect` fehl, ist der
 * Haken verschwunden und die Prüfung misst nichts mehr.
 */
const UPDATE_STUFEN = [
  { art: "hinweis", tage: 0, beschreibung: "unter der Fälligkeit, mit „Später“" },
  { art: "faellig", tage: 9, beschreibung: "fällig, ohne „Später“" },
  { art: "zwang", tage: 15, beschreibung: "Zwang, wird selbst angewandt" },
] as const;

async function zeigeUpdateHinweis(page: Page, art: string, tage: number) {
  const vorhanden = await page.evaluate(
    ([a, t]) => {
      const fenster = window as unknown as {
        rvUpdateHinweis?: (art: string, tage: number) => HTMLElement;
      };
      if (typeof fenster.rvUpdateHinweis !== "function") return false;
      document.getElementById("sw-update-toast")?.remove();
      fenster.rvUpdateHinweis(a as string, t as number);
      return true;
    },
    [art, tage] as [string, number],
  );
  expect(
    vorhanden,
    "window.rvUpdateHinweis fehlt — ohne den Prüfhaken in index.html misst diese Prüfung nichts",
  ).toBe(true);
  await page.locator("#sw-update-toast").waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForTimeout(120);
}

/** Der Hinweis darf die schwebende Hauptnavigation nicht verdecken. */
async function verdecktNavigation(page: Page) {
  return page.evaluate(() => {
    const hinweis = document.getElementById("sw-update-toast");
    const nav = document.querySelector('[aria-label="Hauptnavigation"]');
    if (!hinweis || !nav) return null;
    const h = hinweis.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    const ueberlappt = h.bottom > n.top && h.top < n.bottom && h.right > n.left && h.left < n.right;
    return ueberlappt ? `Hinweis ${Math.round(h.top)}..${Math.round(h.bottom)} über Navigation ${Math.round(n.top)}..${Math.round(n.bottom)}` : null;
  });
}

test.describe("Update-Hinweis", () => {
  for (const groesse of SCHRIFTGROESSEN) {
    test(`Update-Hinweis bei ${groesse}`, async ({ page }) => {
      await oeffne(page, "form");
      await setzeSchriftgroesse(page, groesse);
      await warteAufRuhigesLayout(page);

      for (const stufe of UPDATE_STUFEN) {
        await zeigeUpdateHinweis(page, stufe.art, stufe.tage);
        await pruefeGeometrie(page, `Update-Hinweis (${stufe.beschreibung}) / ${groesse}`);
        expect(
          await verdecktNavigation(page),
          `Update-Hinweis (${stufe.beschreibung}) / ${groesse}: verdeckt die Hauptnavigation`,
        ).toBeNull();
      }
    });
  }

  test("Update-Hinweis bei 320 px und breiter Schrift", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "Eine Breite genuegt, sie haengt nicht am Motor");
    await erzwingeBreiteSchrift(page);
    await page.setViewportSize({ width: 320, height: 780 });
    await oeffne(page, "form");
    await setzeSchriftgroesse(page, "extra-large");
    await warteAufRuhigesLayout(page);

    for (const stufe of UPDATE_STUFEN) {
      await zeigeUpdateHinweis(page, stufe.art, stufe.tage);
      await pruefeGeometrie(page, `Update-Hinweis (${stufe.beschreibung}) / 320 px`);
    }
  });

  test("Update-Hinweis ohne schwere Verstöße", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "axe haengt nicht am Motor");
    await oeffne(page, "form");

    for (const stufe of UPDATE_STUFEN) {
      await zeigeUpdateHinweis(page, stufe.art, stufe.tage);
      const ergebnis = await new AxeBuilder({ page })
        .include("#sw-update-toast")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const befunde = ergebnis.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .flatMap((v) =>
          v.nodes.map(
            (n) => `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`,
          ),
        );
      expect(befunde, `Update-Hinweis (${stufe.beschreibung})`).toEqual([]);
    }
  });
});

/**
 * Ein Lesefehler beim Start darf den gespeicherten Bestand nicht löschen.
 *
 * Warum es das gibt: Am 2026-09-07 reproduziert. Der `catch`-Zweig des
 * Ladevorgangs füllte den Zustand mit `leererMonat()` und `{}` auf. Beides
 * sieht nach Aufräumen aus und war ein Löschbefehl mit Verzögerung — `{}` ist
 * wahrheitswertig und lief damit durch den Wächter des Archiv-Spiegels
 * (`if (!prev) return prev`), der genau davor schützen sollte.
 *
 * Gemessen: Archiv mit 2026-06, 2026-07 und 2026-08; **eine** getippte Zahl;
 * danach enthielt das Archiv nur noch den laufenden Monat. Die App zeigte
 * dabei keine einzige Warnung.
 *
 * Der Auslöser hier ist präzise und nicht grob: Es scheitern nur die ersten
 * beiden **lesenden** Transaktionen, schreibende bleiben erlaubt. Genau so
 * verhält sich ein vorübergehender Lesefehler auf einer intakten Datenbank —
 * würde man die Datenbank ganz blockieren, schlüge auch das Schreiben fehl und
 * der Fehler bliebe unsichtbar.
 */
test.describe("Lesefehler beim Start", () => {
  test("löscht weder Archiv noch Bericht", async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "Speicherverhalten haengt nicht am Geraeteprofil");

    // Eine leere Seite gleicher Herkunft: Sie teilt sich die IndexedDB mit der
    // App, laedt diese aber nicht -- sonst schriebe die App beim Schliessen
    // ihren eigenen (leeren) Anfangszustand ueber den angelegten Bestand.
    await page.route("**/leerseite-fuer-pruefung", (route) =>
      route.fulfill({ contentType: "text/html", body: "<!doctype html><title>leer</title>" }),
    );

    const rohIdb = () => {
      const oeffne = () =>
        new Promise<IDBDatabase>((res, rej) => {
          const r = indexedDB.open("keyval-store", 1);
          r.onupgradeneeded = () => {
            if (!r.result.objectStoreNames.contains("keyval")) r.result.createObjectStore("keyval");
          };
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      return {
        schreibe: async (k: string, v: unknown) => {
          const db = await oeffne();
          return new Promise<void>((res, rej) => {
            const t = db.transaction("keyval", "readwrite");
            t.objectStore("keyval").put(v, k);
            t.oncomplete = () => res();
            t.onerror = () => rej(t.error);
          });
        },
        lies: async (k: string) => {
          const db = await oeffne();
          return new Promise<any>((res, rej) => {
            const t = db.transaction("keyval", "readonly");
            const q = t.objectStore("keyval").get(k);
            q.onsuccess = () => res(q.result);
            q.onerror = () => rej(q.error);
          });
        },
      };
    };

    await page.goto("/leerseite-fuer-pruefung");
    await page.evaluate(async (quelle) => {
      const idb = new Function(`return (${quelle})()`)() as {
        schreibe: (k: string, v: unknown) => Promise<void>;
      };
      const archiv: Record<string, unknown> = {};
      for (const m of ["2026-06", "2026-07", "2026-08"]) {
        archiv[m] = {
          month: m, name: "Marc", notes: "echte Daten", values: { f1: 7 },
          valuesUpdatedAt: { f1: "2026-08-01T10:00:00.000Z" }, timeLogs: [],
          fieldsSnapshot: {}, savedAt: "2026-08-01T10:00:00.000Z",
        };
      }
      await idb.schreibe("aussendienst_pwa_history", archiv);
      await idb.schreibe("aussendienst_pwa_data", {
        month: "2026-09", name: "Marc", notes: "laufender Monat",
        values: { f1: 4 }, valuesUpdatedAt: {}, timeLogs: [],
      });
    }, rohIdb.toString());

    await page.addInitScript(() => {
      localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
      let uebrig = 2;
      const original = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (this: IDBDatabase, ...args: any[]) {
        if (args[1] === "readonly" && uebrig > 0) {
          uebrig--;
          throw new DOMException("simulierter Lesefehler", "UnknownError");
        }
        return (original as any).apply(this, args);
      } as typeof IDBDatabase.prototype.transaction;
    });

    await page.goto("/?tab=form", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // Statt des Formulars muss eine Meldung stehen -- wer hier tippt, tippt in
    // einen leeren Stand, der anschliessend ueber den vorhandenen ginge.
    await expect(
      page.getByRole("heading", { name: /nicht gelesen werden/i }),
      "Fehleransicht fehlt -- das Formular oeffnet trotz Lesefehler",
    ).toBeVisible();
    expect(
      await page.locator('input[role="spinbutton"]').count(),
      "Zaehlerfelder trotz Lesefehler bedienbar",
    ).toBe(0);

    await page.waitForTimeout(2000);
    const bestand = await page.evaluate(async (quelle) => {
      const idb = new Function(`return (${quelle})()`)() as { lies: (k: string) => Promise<any> };
      const h = await idb.lies("aussendienst_pwa_history");
      const d = await idb.lies("aussendienst_pwa_data");
      return { archiv: Object.keys(h || {}).sort(), notiz: d?.notes ?? null, werte: d?.values ?? null };
    }, rohIdb.toString());

    expect(bestand.archiv, "Archivmonate nach dem Lesefehler").toEqual([
      "2026-06", "2026-07", "2026-08",
    ]);
    expect(bestand.notiz, "laufender Monat ueberschrieben").toBe("laufender Monat");
    expect(bestand.werte, "Zaehlerstaende ueberschrieben").toEqual({ f1: 4 });
  });
});

/**
 * WCAG 2.5.3 „Label in Name".
 *
 * Wo eine sichtbare Beschriftung steht, MUSS der zugängliche Name sie
 * enthalten. Ein `aria-label`, das sie *ersetzt*, macht das Bedienelement per
 * Sprachsteuerung untreffbar: Der Nutzer sagt, was er liest — „Klick Später" —
 * und nichts passiert, weil das Element in Wirklichkeit „Erinnerung an die
 * Datensicherung ausblenden" heißt.
 *
 * Das Projekt kennt die Regel (`CLAUDE.md`, Abschnitt 2) und schreibt sie
 * sogar im Quelltext des Update-Hinweises aus. Durchgesetzt hat sie bis
 * 0.9.21 nichts.
 *
 * Bewusst eng gefasst, damit die Prüfung nicht rauscht:
 * - Nur Elemente, die **beides** haben, sichtbaren Text und `aria-label`.
 *   Ein Symbolknopf ohne Text ist genau der Fall, für den `aria-label` da ist.
 * - Verglichen wird nach Kleinschreibung, ohne Satzzeichen und mit
 *   zusammengezogenen Leerräumen — „Später" und „später." sollen gleich sein.
 * - `aria-hidden`-Elemente bleiben außen vor; sie haben keinen Namen.
 */
async function findeNamensverstoesse(page: Page) {
  return page.evaluate(() => {
    const normal = (s: string) =>
      s
        .toLowerCase()
        /* Satzzeichen UND Klammern und das kaufmännische Und. „&" gegen „und"
           ist der einzige Symbol-Fall in dieser App: Sichtbar steht „Monat
           abschließen & neu starten", angesagt wird „…und neu starten". Wer
           per Sprachsteuerung liest, sagt ohnehin „und" — daran soll die
           Prüfung nicht scheitern. Ein fehlendes WORT bleibt ein Verstoß. */
        .replace(/[.,:;!?„“"'’–—&()[\]{}/-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const treffer: string[] = [];
    const kandidaten = document.querySelectorAll<HTMLElement>(
      'button[aria-label], a[href][aria-label], [role="button"][aria-label], [role="tab"][aria-label], summary[aria-label]',
    );
    for (const el of Array.from(kandidaten)) {
      if (el.closest('[aria-hidden="true"]')) continue;
      if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;

      // Sichtbarer Text ohne das, was Screenreadern ohnehin verborgen ist.
      const klon = el.cloneNode(true) as HTMLElement;
      klon.querySelectorAll('[aria-hidden="true"], .sr-only, svg').forEach((k) => k.remove());
      /*
        Textknoten einzeln einsammeln und mit Leerzeichen verbinden.
        `textContent` zieht benachbarte Elemente ohne Trenner zusammen: Aus
        „Vorführungen" und „0" wurde „vorführungen0", also ein Wort, das in
        keinem Namen vorkommt. Vier Kacheln wurden dadurch falsch gemeldet.
      */
      const laeufer = document.createTreeWalker(klon, NodeFilter.SHOW_TEXT);
      const stuecke: string[] = [];
      while (laeufer.nextNode()) stuecke.push(laeufer.currentNode.nodeValue || "");
      const sichtbar = normal(stuecke.join(" "));
      if (!sichtbar) continue;

      const name = normal(el.getAttribute("aria-label") || "");

      /*
        Wortweise und in der Reihenfolge, nicht als Teilzeichenkette.

        Ein reiner `includes` meldete vier Kacheln fälschlich: Deren sichtbarer
        Text steht in zwei Elementen („Vorführungen" und „0"), `textContent`
        zieht ihn ohne Trennzeichen zu „vorführungen0" zusammen, und das steht
        so in keinem Namen. Der Name enthält beide Wörter sehr wohl — nur mit
        Text dazwischen, was 2.5.3 ausdrücklich erlaubt. Geprüft wird deshalb,
        ob alle Wörter der Beschriftung in derselben Reihenfolge im Namen
        vorkommen.
      */
      const woerter = sichtbar.split(" ").filter(Boolean);
      const imNamen = name.split(" ").filter(Boolean);
      let i = 0;
      for (const wort of imNamen) {
        if (wort === woerter[i]) i++;
      }
      if (i < woerter.length) {
        treffer.push(
          `${el.tagName}: sichtbar "${sichtbar}" / Name "${name}" (fehlt ab "${woerter[i]}")`,
        );
      }
    }
    return treffer;
  });
}

test.describe("WCAG 2.5.3: Name enthält die sichtbare Beschriftung", () => {
  const alle = [
    ...ANSICHTEN.map((a) => ({ name: a.name, oeffne: (p: Page) => oeffne(p, a.tab) })),
    ...EINSTIEGE.map((e) => ({ name: e.name, oeffne: (p: Page) => oeffneUeberEinstieg(p, e) })),
  ];

  for (const ansicht of alle) {
    test(`${ansicht.name}: kein Name ersetzt die Beschriftung`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Namen haengen nicht am Geraeteprofil");
      await ansicht.oeffne(page);
      const verstoesse = await findeNamensverstoesse(page);
      expect(
        verstoesse,
        `${ansicht.name}: aria-label ersetzt die sichtbare Beschriftung — ${verstoesse.join(" | ")}`,
      ).toEqual([]);
    });
  }
});

/**
 * Die beiden Formulare der Stempeluhr.
 *
 * Warum es das gibt: Sie erscheinen erst nach einer Handlung -- „Ausstempeln"
 * öffnet „Arbeitszeit verbuchen", ein eigener Knopf öffnet „Schicht manuell
 * nachtragen". Über `EINSTIEGE` sind sie nicht erreichbar, weil der Eintrag
 * dort auf `activeTab` zielt und diese Formulare ein Zustand *innerhalb* der
 * Zeit-Ansicht sind. Bis 0.9.23 hat sie deshalb **keine** Prüfung je gesehen.
 *
 * Was darin steckt: Pausen-Tasten, vier Vorwahl-Schaltflächen, ein
 * Schieberegler, zwei Zahlenfelder, ein Notizfeld und der Absender (der
 * GPS-Knopf, der hier ursprünglich stand, ist mit 0.9.24 entfallen). Dieselbe Lage wie bei `manage` — und dort waren es beim ersten
 * echten Lauf fünf Defekte.
 *
 * Das Einstempeln schreibt einen Zeitstempel nach `localStorage`; der Test
 * räumt ihn zu Beginn weg, damit er nicht auf dem Stand eines früheren Laufs
 * aufsetzt.
 */
const ZEIT_FORMULARE = [
  {
    name: "Arbeitszeit verbuchen",
    oeffne: async (page: Page) => {
      await oeffne(page, "time");
      await page.getByRole("button", { name: /Jetzt Einstempeln/ }).first().click();
      await page.waitForTimeout(400);
      await page.getByRole("button", { name: /Ausstempeln/ }).first().click();
      await page.getByRole("heading", { name: /Arbeitszeit verbuchen/ }).first()
        .waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(300);
    },
  },
  {
    name: "Schicht nachtragen",
    oeffne: async (page: Page) => {
      await oeffne(page, "time");
      await page.getByRole("button", { name: /Schicht manuell nachtragen|Vergessene Schicht/ }).first().click();
      await page.getByRole("heading", { name: /Schicht manuell nachtragen/ }).first()
        .waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(300);
    },
  },
] as const;

test.describe("Formulare der Stempeluhr", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("aussendienst_pwa_clockin");
    });
  });

  for (const formular of ZEIT_FORMULARE) {
    for (const groesse of ["normal", "extra-large"] as const) {
      test(`${formular.name} bei ${groesse}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "handy-webkit", "Geometrie haengt nicht am Motor");
        await formular.oeffne(page);
        await setzeSchriftgroesse(page, groesse);
        await warteAufRuhigesLayout(page);
        await pruefeGeometrie(page, `${formular.name} / ${groesse}`);
      });
    }

    test(`${formular.name}: kein Name ersetzt die Beschriftung`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Namen haengen nicht am Geraeteprofil");
      await formular.oeffne(page);
      const verstoesse = await findeNamensverstoesse(page);
      expect(verstoesse, `${formular.name}: ${verstoesse.join(" | ")}`).toEqual([]);
    });

    test(`${formular.name} ohne schwere Verstöße`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "axe haengt nicht am Motor");
      await formular.oeffne(page);
      const ergebnis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const befunde = ergebnis.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .flatMap((v) => v.nodes.map((n) => `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`));
      expect(befunde, `${formular.name}`).toEqual([]);
    });
  }
});

/**
 * Die Zustände des Geräte-Syncs.
 *
 * Warum es das gibt: `mode` in `DeviceSyncModal` kennt **sechs** Werte —
 * `select`, `send`, `receive`, `confirm`, `live-host`, `live-join`. Über
 * `EINSTIEGE` wird immer nur `select` erreicht, also das Startmenü. Alles
 * dahinter — der QR-Code mit dem Textcode daneben, der Empfangsbildschirm mit
 * dem Einfügefeld, die beiden Kopplungsschritte — hat bis 0.9.24 keine
 * Prüfung gesehen. Dieselbe Klasse wie bei `manage` (fünf Defekte) und den
 * Formularen der Stempeluhr (vier Fehlerklassen).
 *
 * Verankert wird über das Verschwinden des Startmenüs, weil diese Zustände
 * keine eigene Überschrift tragen. Die Kamera fehlt im Prüfbrowser — das ist
 * kein Mangel des Tests, sondern genau die Lage eines PCs ohne Webcam, und
 * für diese Zielgruppe der Normalfall.
 *
 * `confirm` bleibt ungeprüft: Dieser Zustand verlangt ein gültiges
 * eingegangenes Paket, und das lässt sich ohne zweites Gerät nicht herstellen.
 * Ausdrücklich benannt statt stillschweigend übergangen.
 */
const SYNC_ZUSTAENDE = [
  { name: "Sync: senden", einstieg: /Daten an anderes Gerät senden/ },
  { name: "Sync: empfangen", einstieg: /Daten von anderem Gerät übernehmen/ },
  { name: "Sync: Live starten", einstieg: /Live-Verbindung starten/ },
  { name: "Sync: Live beitreten", einstieg: /Live-Verbindung beitreten/ },
] as const;

async function oeffneSyncZustand(page: Page, eintrag: (typeof SYNC_ZUSTAENDE)[number]) {
  await oeffne(page, "options");
  await page.getByRole("button", { name: /Geräte-Sync/ }).first().click();
  await page.getByRole("heading", { name: /Geräte-Synchronisation/ }).first()
    .waitFor({ state: "visible", timeout: 15_000 });
  const start = page.getByRole("button", { name: eintrag.einstieg });
  await start.first().click();
  // Das Startmenü verschwindet, sobald der Zustand gewechselt hat.
  await page.getByRole("button", { name: /Daten an anderes Gerät senden/ })
    .waitFor({ state: "detached", timeout: 15_000 });
  await page.waitForTimeout(700);
}

test.describe("Zustände des Geräte-Syncs", () => {
  for (const zustand of SYNC_ZUSTAENDE) {
    for (const groesse of ["normal", "extra-large"] as const) {
      test(`${zustand.name} bei ${groesse}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "handy-webkit", "Geometrie haengt nicht am Motor");
        await oeffneSyncZustand(page, zustand);
        await setzeSchriftgroesse(page, groesse);
        await warteAufRuhigesLayout(page);
        await pruefeGeometrie(page, `${zustand.name} / ${groesse}`);
      });
    }

    test(`${zustand.name}: kein Name ersetzt die Beschriftung`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Namen haengen nicht am Geraeteprofil");
      await oeffneSyncZustand(page, zustand);
      const verstoesse = await findeNamensverstoesse(page);
      expect(verstoesse, `${zustand.name}: ${verstoesse.join(" | ")}`).toEqual([]);
    });

    test(`${zustand.name} ohne schwere Verstöße`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "axe haengt nicht am Motor");
      await oeffneSyncZustand(page, zustand);
      const ergebnis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const befunde = ergebnis.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .flatMap((v) => v.nodes.map((n) => `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`));
      expect(befunde, `${zustand.name}`).toEqual([]);
    });
  }
});

/**
 * Die Zustände des Archivs.
 *
 * Warum es das gibt: `history` steht seit 0.9.18 in `ANSICHTEN` und wird bei
 * jeder Schriftgröße, in jedem Farbschema und in allen drei Geräteprofilen
 * gemessen — aber immer mit **leerem** Archiv. `oeffne()` setzt nur die
 * Onboarding-Marke; einen gespeicherten Monat legt niemand an. Gemessen wurde
 * damit ausschließlich der Satz „Noch keine Monate im Archiv."
 *
 * Nie gemessen: die Suchzeile, die Jahres-Klappe, die Monatskarte, und alles
 * im aufgeklappten Zustand — Laden, Löschen samt Rückfrage, die beiden
 * Excel-Ausgaben, die Versandmarkierung. Also der Bildschirm, über den der
 * Monatsbericht das Haus verlässt.
 *
 * Vierter Fall derselben Klasse nach `manage` (0.9.22), den Formularen der
 * Stempeluhr und den Sync-Zuständen (beide 0.9.24). Das Muster ist jedes Mal
 * dasselbe: Geprüft wird, was ein `?tab=` erreicht — ein Zustand *innerhalb*
 * einer Ansicht erreicht es nicht.
 *
 * Der Bestand wird über IndexedDB gelegt und nicht über die Oberfläche: In
 * das Archiv kommt ein Monat nur über „Nächsten Monat starten", und das würde
 * diese Messung von einem halben Dutzend anderer Abläufe abhängig machen.
 */
const ARCHIV_BESTAND = [
  {
    month: "2026-08",
    name: "Marc Petry",
    notes:
      "Schwerpunkt Vorführungen bei Bestandskunden; Nachfassaktion Sonderveranstaltungsplanung läuft.",
    values: { s1_1: 12, s1_2: 4, s2_1: 7 },
    valuesUpdatedAt: { s1_1: "2026-08-31T10:00:00.000Z" },
    fieldsSnapshot: {},
    savedAt: "2026-08-31T10:00:00.000Z",
    sentAt: "2026-09-01T08:15:00.000Z",
    sentAtUpdatedAt: "2026-09-01T08:15:00.000Z",
    timeLogs: [
      {
        id: "t1",
        date: "2026-08-14",
        clockIn: "08:00",
        clockOut: "16:30",
        breakMinutes: 45,
        duration: 7.75,
        officeRatio: 0.5,
        officeHours: 3.88,
        fieldHours: 3.87,
        notes: "Kundentermin",
      },
    ],
  },
  {
    // Ohne Schichten und ohne Versandmarkierung: zeigt den Platzhalter
    // „Keine Schichten erfasst" und das Abzeichen „Noch offen".
    month: "2026-07",
    name: "Marc Petry",
    notes: "Urlaubsmonat, wenig Aussendienst.",
    values: { s1_1: 2 },
    valuesUpdatedAt: {},
    fieldsSnapshot: {},
    savedAt: "2026-07-31T10:00:00.000Z",
    timeLogs: [],
  },
  {
    // Voriges Jahr: erzwingt eine zweite, eingeklappte Jahres-Klappe.
    month: "2025-12",
    name: "Marc Petry",
    notes: "Jahresabschluss.",
    values: { s1_1: 5 },
    valuesUpdatedAt: {},
    fieldsSnapshot: {},
    savedAt: "2025-12-31T10:00:00.000Z",
    timeLogs: [],
  },
] as const;

/*
  Bewusst eine eigene Kopie der IndexedDB-Anbindung statt einer gemeinsamen
  Hilfsfunktion mit „Lesefehler beim Start": Jene Prüfung ist der
  Regressionstest für den Datenverlust aus 0.9.22, bei dem ein fehlgeschlagener
  Lesevorgang das gesamte Archiv überschrieb. Sie umzubauen, um hier zwanzig
  Zeilen zu sparen, wäre ein schlechter Tausch.
*/
async function legeArchivAn(page: Page) {
  // Leere Seite gleicher Herkunft: teilt sich die IndexedDB mit der App, lädt
  // sie aber nicht -- sonst schriebe die App ihren leeren Anfangszustand
  // darüber.
  await page.route("**/leerseite-fuer-archivpruefung", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>leer</title>" }),
  );
  await page.goto("/leerseite-fuer-archivpruefung");
  await page.evaluate(async (bestand) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open("keyval-store", 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("keyval")) r.result.createObjectStore("keyval");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const archiv: Record<string, unknown> = {};
    for (const eintrag of bestand) archiv[eintrag.month] = eintrag;
    await new Promise<void>((res, rej) => {
      const t = db.transaction("keyval", "readwrite");
      t.objectStore("keyval").put(archiv, "aussendienst_pwa_history");
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  }, ARCHIV_BESTAND as unknown as { month: string }[]);
}

type ArchivZustand = "liste" | "offen" | "loeschabfrage" | "suche";

async function oeffneArchiv(page: Page, zustand: ArchivZustand) {
  await legeArchivAn(page);
  await oeffne(page, "history");
  const kopfzeile = page.getByRole("button", { name: /August 2026/ }).first();
  await kopfzeile.waitFor({ state: "visible", timeout: 15_000 });

  if (zustand === "suche") {
    // Die Suchzeile erscheint erst mit Bestand -- und die Zuruecksetzen-Taste
    // erst mit eingetippter Suche. Beides war deshalb nie gemessen.
    await page.getByPlaceholder(/Monat, Name oder Kommentar suchen/).fill("Nachfassaktion");
    await page.waitForTimeout(400);
    return;
  }

  if (zustand !== "liste") {
    await kopfzeile.click();
    await page
      .getByRole("button", { name: /Laden \/ Editieren/ })
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
  }

  if (zustand === "loeschabfrage") {
    await page.getByRole("button", { name: /August 2026 aus RV Archiv löschen/ }).click();
    await page
      .getByRole("button", { name: /Wirklich löschen/ })
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
  }

  await page.waitForTimeout(500);
}

const ARCHIV_ZUSTAENDE = [
  { name: "Archiv: Monate aufgelistet", zustand: "liste" as ArchivZustand },
  { name: "Archiv: Monat aufgeklappt", zustand: "offen" as ArchivZustand },
  { name: "Archiv: Löschabfrage", zustand: "loeschabfrage" as ArchivZustand },
  { name: "Archiv: Suche läuft", zustand: "suche" as ArchivZustand },
] as const;

test.describe("Zustände des Archivs", () => {
  for (const zustand of ARCHIV_ZUSTAENDE) {
    for (const groesse of ["normal", "extra-large"] as const) {
      test(`${zustand.name} bei ${groesse}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "handy-webkit", "Geometrie haengt nicht am Motor");
        await oeffneArchiv(page, zustand.zustand);
        await setzeSchriftgroesse(page, groesse);
        await warteAufRuhigesLayout(page);
        await pruefeGeometrie(page, `${zustand.name} / ${groesse}`);
      });
    }

    test(`${zustand.name}: kein Name ersetzt die Beschriftung`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Namen haengen nicht am Geraeteprofil");
      await oeffneArchiv(page, zustand.zustand);
      const verstoesse = await findeNamensverstoesse(page);
      expect(verstoesse, `${zustand.name}: ${verstoesse.join(" | ")}`).toEqual([]);
    });

    test(`${zustand.name} ohne schwere Verstöße`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "axe haengt nicht am Motor");
      await oeffneArchiv(page, zustand.zustand);
      const ergebnis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const befunde = ergebnis.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .flatMap((v) => v.nodes.map((n) => `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`));
      expect(befunde, `${zustand.name}`).toEqual([]);
    });
  }

  /*
    Die Projektregel „nichts hinter einer Einklappung verstecken" begründet
    sich ausdrücklich damit, dass die Suche sonst ins Leere liefe. Das Archiv
    ist die einzige Ansicht mit einer Suche UND einer Einklappung -- hier muss
    die Regel also nachweisbar halten.

    Die Jahres-Klappe klappt bei einer laufenden Suche auf (`&& !searchQuery`).
    Für die Monatskarte gilt das nicht: Getroffen wird auch auf `notes`, und
    der Kommentar steht im eingeklappten Teil.
  */
  test("Suchtreffer im Kommentar zeigt den Kommentar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "Suche haengt nicht am Geraeteprofil");
    await oeffneArchiv(page, "liste");
    await page.getByPlaceholder(/Monat, Name oder Kommentar suchen/).fill("Nachfassaktion");
    await page.waitForTimeout(400);

    // Genau ein Monat trägt das Wort -- die anderen beiden müssen weg sein.
    await expect(page.getByRole("button", { name: /August 2026/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Juli 2026/ })).toHaveCount(0);

    const zeigtTreffer = await page.evaluate(() =>
      document.body.innerText.includes("Nachfassaktion"),
    );
    expect(
      zeigtTreffer,
      "Der Kommentar, auf den die Suche getroffen hat, steht nicht auf dem Bildschirm",
    ).toBe(true);
  });

  test("Jahres-Klappe meldet ihren Zustand", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "ARIA haengt nicht am Geraeteprofil");
    await oeffneArchiv(page, "liste");
    const klappe = page.getByRole("button", { name: /Jahr 2025/ }).first();
    await expect(klappe).toBeVisible();
    expect(
      await klappe.getAttribute("aria-expanded"),
      "Jahres-Klappe ohne aria-expanded: der Screenreader sagt nicht an, ob das Jahr offen ist",
    ).toBe("false");
    await klappe.click();
    await expect(klappe).toHaveAttribute("aria-expanded", "true");
  });
});

/**
 * Der Ersteinstieg.
 *
 * Sechster Fall derselben Klasse, und der offensichtlichste im Rückblick:
 * `oeffne()` setzt in **jeder** Prüfung
 * `localStorage.aussendienst_pwa_onboarding_v1 = "1"` — mit gutem Grund, denn
 * der Assistent liegt als Overlay über allem und würde jede Messung der
 * dahinterliegenden Ansicht verfälschen. Die Folge war trotzdem, dass der
 * **erste Bildschirm, den ein neuer Nutzer sieht**, als einziger nie gemessen
 * wurde.
 *
 * Er hat fünf Schritte, und jeder ist ein eigener Zustand mit eigenem Inhalt:
 * Begrüßung, Namensfeld, Seh- und Höreinstellungen (die längste Seite, mit
 * Schriftgrößen und Farbschemata), Erfassungshinweise, Datenschutz.
 *
 * Gemessen wird über das Fenster selbst, nicht über eine Ansicht dahinter —
 * `role="dialog"` mit `aria-modal="true"`, verankert an der Überschrift des
 * jeweiligen Schritts.
 */
const EINSTIEG_SCHRITTE = [
  "Willkommen bei RV Mobil",
  "Wie heißen Sie?",
  "Sehen und Hören",
  "So erfassen Sie am schnellsten",
  "Ihre Daten bleiben bei Ihnen",
] as const;

/**
 * Startet die App mit **wirklich leerem** Speicher, damit der Assistent
 * erscheint, und blättert bis zum gewünschten Schritt.
 *
 * Kein `oeffne()`: Das setzt genau die Marke, die den Assistenten unterdrückt.
 */
async function oeffneEinstieg(page: Page, schritt: number) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: EINSTIEG_SCHRITTE[0] })
    .waitFor({ state: "visible", timeout: 20_000 });
  for (let i = 0; i < schritt; i++) {
    await page.getByRole("button", { name: /^Weiter$/ }).click();
    await page
      .getByRole("heading", { name: EINSTIEG_SCHRITTE[i + 1] })
      .waitFor({ state: "visible", timeout: 15_000 });
  }
  await page.waitForTimeout(300);
}

test.describe("Ersteinstieg", () => {
  for (let schritt = 0; schritt < EINSTIEG_SCHRITTE.length; schritt++) {
    const name = `Einstieg ${schritt + 1}: ${EINSTIEG_SCHRITTE[schritt]}`;

    for (const groesse of ["normal", "extra-large"] as const) {
      test(`${name} bei ${groesse}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "handy-webkit", "Geometrie haengt nicht am Motor");
        await oeffneEinstieg(page, schritt);
        await setzeSchriftgroesse(page, groesse);
        await warteAufRuhigesLayout(page);
        await pruefeGeometrie(page, `${name} / ${groesse}`);
      });
    }

    test(`${name}: kein Name ersetzt die Beschriftung`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Namen haengen nicht am Geraeteprofil");
      await oeffneEinstieg(page, schritt);
      const verstoesse = await findeNamensverstoesse(page);
      expect(verstoesse, `${name}: ${verstoesse.join(" | ")}`).toEqual([]);
    });

    test(`${name} ohne schwere Verstöße`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "axe haengt nicht am Motor");
      await oeffneEinstieg(page, schritt);
      const ergebnis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const befunde = ergebnis.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .flatMap((v) => v.nodes.map((n) => `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`));
      expect(befunde, `${name}`).toEqual([]);
    });
  }

  /*
    Die Fokusfalle ist hier keine Formsache: Der Assistent ist das erste, was
    ein blinder Nutzer von dieser App erlebt. Entkommt der Fokus nach hinten,
    landet er in einem Formular, das er noch gar nicht sehen soll.

    Geprüft wird der Fall, der in diesem Projekt schon zweimal durchgerutscht
    ist: Der Startfokus liegt auf der Überschrift mit `tabindex="-1"`, und die
    steht in keiner der beiden Randprüfungen — Shift+Tab entkam von dort in
    den Hintergrund.
  */
  test("Fokus bleibt im Assistenten, auch rückwärts von der Überschrift", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "Fokus haengt nicht am Geraeteprofil");
    await oeffneEinstieg(page, 0);

    const startetAufUeberschrift = await page.evaluate(
      () => document.activeElement?.id === "onboarding-title",
    );
    expect(startetAufUeberschrift, "Startfokus liegt nicht auf der Überschrift").toBe(true);

    for (const richtung of ["Shift+Tab", "Tab"] as const) {
      await oeffneEinstieg(page, 0);
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press(richtung);
        await page.waitForTimeout(30);
        const drin = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return true; // Umlauf über die Browserleiste
          return !!el.closest('[aria-modal="true"]');
        });
        expect(drin, `${richtung}, Schritt ${i + 1}: Fokus hat den Assistenten verlassen`).toBe(true);
      }
    }
  });
});

/**
 * Zustände der Formularansicht.
 *
 * Fünfter Fall derselben Klasse. Die Formularansicht steht in `ANSICHTEN` und
 * ist damit die meistgeprüfte Ansicht der App — aber zwei Bedienflächen darin
 * erscheinen nur nach einem Klick bzw. nach einer gespeicherten Einstellung
 * und sind deshalb nie gemessen worden:
 *
 * - **Der Editor der Schnell-Erfassung** (`isEditorOpen` in
 *   `QuickEntryPanel`): Umschalter „Automatisch (meistgenutzt)" plus eine
 *   Liste aller Kategorien mit Kästchen.
 * - **Die Ein-Hand-Leiste** (`mobileComfortMode && !isDesktop` in `App.tsx`):
 *   vier Sprungtasten. `mobileComfortMode` liest
 *   `localStorage.aussendienst_pwa_mobile_comfort === "true"` — ohne
 *   gesetzten Schlüssel also `false`, und der Prüflauf setzt ihn nicht.
 *
 * Die Ein-Hand-Leiste gibt es nur ohne Desktop-Breite; sie wird deshalb nur
 * im Profil `handy` gemessen.
 */
const FORMULAR_ZUSTAENDE = [
  {
    name: "Schnell-Erfassung anpassen",
    nurHandy: false,
    oeffne: async (page: Page) => {
      await oeffne(page, "form");
      await page.getByRole("button", { name: /Schnell-Erfassung anpassen/ }).first().click();
      await page
        .getByRole("button", { name: /Automatisch \(meistgenutzt\)/ })
        .waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(300);
    },
  },
  {
    name: "Ein-Hand-Leiste",
    nurHandy: true,
    oeffne: async (page: Page) => {
      await page.addInitScript(() => {
        localStorage.setItem("aussendienst_pwa_mobile_comfort", "true");
      });
      await oeffne(page, "form");
      await page
        .getByRole("toolbar", { name: /Schnellzugriffe für den Ein-Hand-Modus/ })
        .waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(300);
    },
  },
] as const;

test.describe("Zustände der Formularansicht", () => {
  for (const zustand of FORMULAR_ZUSTAENDE) {
    for (const groesse of ["normal", "extra-large"] as const) {
      test(`${zustand.name} bei ${groesse}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "handy-webkit", "Geometrie haengt nicht am Motor");
        test.skip(
          zustand.nurHandy && testInfo.project.name !== "handy",
          "Diese Leiste gibt es nur ohne Desktop-Breite",
        );
        await zustand.oeffne(page);
        await setzeSchriftgroesse(page, groesse);
        await warteAufRuhigesLayout(page);
        await pruefeGeometrie(page, `${zustand.name} / ${groesse}`);
      });
    }

    test(`${zustand.name}: kein Name ersetzt die Beschriftung`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Namen haengen nicht am Geraeteprofil");
      await zustand.oeffne(page);
      const verstoesse = await findeNamensverstoesse(page);
      expect(verstoesse, `${zustand.name}: ${verstoesse.join(" | ")}`).toEqual([]);
    });

    test(`${zustand.name} ohne schwere Verstöße`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "axe haengt nicht am Motor");
      await zustand.oeffne(page);
      const ergebnis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const befunde = ergebnis.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .flatMap((v) => v.nodes.map((n) => `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`));
      expect(befunde, `${zustand.name}`).toEqual([]);
    });
  }
});

/**
 * Was das Öffnen eines Archivmonats mit der eigenen Feldkonfiguration macht.
 *
 * Der Verdacht, aus dem Quelltext hergeleitet: `handleMonthChange` archiviert
 * den verlassenen Monat nur, wenn `monthHasContent()` wahr ist — und das kennt
 * nur Notizen, Zählerwerte und Schichten, nicht die Feldkonfiguration. Danach
 * setzt es `setAppFields(fieldsSnapshot)`, und ein `useEffect` in
 * `useEinstellungen.ts` schreibt jede Änderung an `appFields` sofort nach
 * `localStorage`.
 *
 * Daraus folgt ein Verlustfall: Wer in einem noch leeren Monat eine eigene
 * Kategorie anlegt und dann in einen Archivmonat schaut, hätte sie danach
 * nicht mehr — der leere Monat wird nicht archiviert, hinterlässt also keinen
 * Schnappschuss, aus dem sie zurückkäme.
 *
 * Diese Prüfung misst das, statt es zu behaupten. Sie ist bewusst so gebaut,
 * dass sie in BEIDE Richtungen aussagekräftig ist: Kommt die Kategorie zurück,
 * war die Herleitung falsch.
 */
const EIGENE_KATEGORIE = { id: "s1_eigen_pruef", label: "Eigene Prüfkategorie", icon: "", step: 1 };

async function legeFeldstandAn(page: Page) {
  await page.route("**/leerseite-fuer-feldpruefung", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>leer</title>" }),
  );
  await page.goto("/leerseite-fuer-feldpruefung");

  // Archiv: August 2026 mit Inhalt, dessen Schnappschuss die eigene
  // Kategorie NICHT kennt (sie wurde ja erst im September angelegt).
  await page.evaluate(async (eigene) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open("keyval-store", 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("keyval")) r.result.createObjectStore("keyval");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const schreibe = (k: string, v: unknown) =>
      new Promise<void>((res, rej) => {
        const t = db.transaction("keyval", "readwrite");
        t.objectStore("keyval").put(v, k);
        t.oncomplete = () => res();
        t.onerror = () => rej(t.error);
      });

    const grundfelder = { s1: [], s2: [], s3: [], s4: [] };
    await schreibe("aussendienst_pwa_history", {
      "2026-08": {
        month: "2026-08",
        name: "Marc",
        notes: "August hatte Inhalt",
        values: { s1_1: 5 },
        valuesUpdatedAt: { s1_1: "2026-08-31T10:00:00.000Z" },
        fieldsSnapshot: grundfelder,
        savedAt: "2026-08-31T10:00:00.000Z",
        timeLogs: [],
      },
    });
    // September: LEER. Genau darum geht es -- er wird nicht archiviert.
    await schreibe("aussendienst_pwa_data", {
      month: "2026-09",
      name: "Marc",
      notes: "",
      values: {},
      valuesUpdatedAt: {},
      timeLogs: [],
    });
    void eigene;
  }, EIGENE_KATEGORIE);
}

test.describe("Feldkonfiguration beim Blick ins Archiv", () => {
  test("eine eigene Kategorie überlebt das Öffnen eines Archivmonats", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "Zustandslogik haengt nicht am Geraeteprofil");

    await legeFeldstandAn(page);

    // Feldkonfiguration mit eigener Kategorie -- so, wie sie nach dem Anlegen
    // im Formular in `localStorage` steht.
    await page.addInitScript((eigene) => {
      localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
      const roh = localStorage.getItem("aussendienst_pwa_fields");
      const felder = roh ? JSON.parse(roh) : { s1: [], s2: [], s3: [], s4: [] };
      felder.s1 = [...(felder.s1 || []), eigene];
      localStorage.setItem("aussendienst_pwa_fields", JSON.stringify(felder));
    }, EIGENE_KATEGORIE);

    await page.goto("/?tab=history", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /August 2026/ }).first().waitFor({ timeout: 15_000 });

    const vorher = await page.evaluate(
      (id) => (localStorage.getItem("aussendienst_pwa_fields") || "").includes(id),
      EIGENE_KATEGORIE.id,
    );
    expect(vorher, "Vorbedingung: die eigene Kategorie steht im Speicher").toBe(true);

    // Archivmonat öffnen -- der Weg, den ein Nutzer geht, um alte Zahlen
    // nachzusehen.
    await page.getByRole("button", { name: /August 2026/ }).first().click();
    await page.getByRole("button", { name: /Laden \/ Editieren/ }).first().click();
    await page.waitForTimeout(800);

    // Zurück auf den eigenen Monat, so wie man es über die Kopfzeile täte.
    await page.locator("#meta-month-input").fill("2026-09");
    await page.waitForTimeout(800);

    const nachher = await page.evaluate(
      (id) => (localStorage.getItem("aussendienst_pwa_fields") || "").includes(id),
      EIGENE_KATEGORIE.id,
    );
    expect(
      nachher,
      "Die eigene Kategorie ist nach einem Blick ins Archiv aus der Feldkonfiguration verschwunden",
    ).toBe(true);
  });

  /*
    Die Gegenrichtung, und sie ist genauso wichtig.

    Der Schnappschuss eines Archivmonats MUSS beim Öffnen greifen -- sonst
    stünden dessen Zahlen unter Kategorien, die es damals nicht gab, oder unter
    gar keinen. Eine Abhilfe, die den eigenen Feldstand rettet, indem sie den
    Schnappschuss ignoriert, wäre schlimmer als der Fehler.
  */
  test("im Archivmonat gilt dessen eigener Feldstand", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "Zustandslogik haengt nicht am Geraeteprofil");

    await legeFeldstandAn(page);
    await page.addInitScript((eigene) => {
      localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
      const roh = localStorage.getItem("aussendienst_pwa_fields");
      const felder = roh ? JSON.parse(roh) : { s1: [], s2: [], s3: [], s4: [] };
      felder.s1 = [...(felder.s1 || []), eigene];
      localStorage.setItem("aussendienst_pwa_fields", JSON.stringify(felder));
    }, EIGENE_KATEGORIE);

    await page.goto("/?tab=history", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /August 2026/ }).first().click();
    await page.getByRole("button", { name: /Laden \/ Editieren/ }).first().click();
    await page.waitForTimeout(800);

    const imArchivmonat = await page.evaluate(
      (id) => (localStorage.getItem("aussendienst_pwa_fields") || "").includes(id),
      EIGENE_KATEGORIE.id,
    );
    expect(
      imArchivmonat,
      "Im August wird eine Kategorie angezeigt, die es im August noch nicht gab — " +
        "der Schnappschuss des Archivmonats greift nicht mehr",
    ).toBe(false);
  });
});

/**
 * Die Zeit-Ansicht mit erfassten Schichten.
 *
 * Siebter Fall derselben Klasse. `ANSICHTEN` öffnet `?tab=time` mit **leerem**
 * Bericht — der ganze Abschnitt „Schicht-Protokoll" hängt aber an
 * `timeLogs.length > 0` und ist damit nie gerendert worden. Darin liegen: der
 * Umschalter der Einklappung, die Excel-Ausgabe des Schichtprotokolls, die
 * scrollbare Liste und je Schicht eine Löschtaste.
 *
 * Der Bestand wird über IndexedDB gelegt: Schichten entstehen sonst nur über
 * Ein- und Ausstempeln, und das machte diese Messung von einem anderen Ablauf
 * abhängig.
 */
const SCHICHTEN_BESTAND = [
  {
    id: "p1",
    date: "2026-09-02",
    clockIn: "08:00",
    clockOut: "16:30",
    breakMinutes: 45,
    duration: 7.75,
    officeRatio: 0.5,
    officeHours: 3.88,
    fieldHours: 3.87,
    notes: "Kundentermin Berufsförderungswerk",
  },
  {
    id: "p2",
    date: "2026-09-03",
    clockIn: "09:00",
    clockOut: "17:15",
    breakMinutes: 30,
    duration: 7.75,
    officeRatio: 1,
    officeHours: 7.75,
    fieldHours: 0,
    notes: "",
  },
];

/**
 * @param werte Zählerstände des Berichts. Leer für die reinen
 *   Geometrie-Messungen; gefüllt für die Prüfung, ob das Löschen einer
 *   Schicht die Stunden wirklich zurückrechnet.
 */
async function oeffneZeitMitSchichten(page: Page, werte: Record<string, number> = {}) {
  await page.route("**/leerseite-fuer-schichtpruefung", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>leer</title>" }),
  );
  await page.goto("/leerseite-fuer-schichtpruefung");
  await page.evaluate(async ({ schichten, werte: w }) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open("keyval-store", 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("keyval")) r.result.createObjectStore("keyval");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise<void>((res, rej) => {
      const t = db.transaction("keyval", "readwrite");
      t.objectStore("keyval").put(
        {
          month: "2026-09",
          name: "Marc Petry",
          notes: "",
          values: w,
          valuesUpdatedAt: {},
          timeLogs: schichten,
        },
        "aussendienst_pwa_data",
      );
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  }, { schichten: SCHICHTEN_BESTAND, werte });

  await oeffne(page, "time");
  // Kein Umschalter mehr: Das Protokoll steht seit 0.9.29 offen im Lesefluss.
  await page.getByRole("heading", { name: /Schicht-Protokoll/ }).waitFor({ timeout: 15_000 });
  await page.getByRole("region", { name: /Monatliche Schichtliste/ }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(400);
}

const SCHICHT_ZUSTAENDE = [{ name: "Zeit: Schicht-Protokoll" }] as const;

test.describe("Zeit-Ansicht mit Schichten", () => {
  for (const zustand of SCHICHT_ZUSTAENDE) {
    for (const groesse of ["normal", "extra-large"] as const) {
      test(`${zustand.name} bei ${groesse}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "handy-webkit", "Geometrie haengt nicht am Motor");
        await oeffneZeitMitSchichten(page);
        await setzeSchriftgroesse(page, groesse);
        await warteAufRuhigesLayout(page);
        await pruefeGeometrie(page, `${zustand.name} / ${groesse}`);
      });
    }

    test(`${zustand.name}: kein Name ersetzt die Beschriftung`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Namen haengen nicht am Geraeteprofil");
      await oeffneZeitMitSchichten(page);
      const verstoesse = await findeNamensverstoesse(page);
      expect(verstoesse, `${zustand.name}: ${verstoesse.join(" | ")}`).toEqual([]);
    });

    test(`${zustand.name} ohne schwere Verstöße`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "axe haengt nicht am Motor");
      await oeffneZeitMitSchichten(page);
      const ergebnis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const befunde = ergebnis.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .flatMap((v) => v.nodes.map((n) => `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`));
      expect(befunde, `${zustand.name}`).toEqual([]);
    });
  }

  /*
    Ein scrollbarer Bereich, den die Tastatur nicht erreicht, ist Inhalt hinter
    einer Wand. Genau dieser Defekt steckte bis 0.9.22 in `ManageModal`: eine
    Liste mit `overflow-y-auto` und `role="region"`, aber ohne `tabIndex`.
    Wer nicht zeigen kann, kommt an den unteren Teil nicht heran.
  */
  test("die Schichtliste ist per Tastatur scrollbar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "Tastatur haengt nicht am Geraeteprofil");
    await oeffneZeitMitSchichten(page);
    const liste = page.getByRole("region", { name: /Monatliche Schichtliste/ });
    const tabindex = await liste.getAttribute("tabindex");
    expect(
      tabindex,
      "Der scrollbare Bereich der Schichtliste ist nicht fokussierbar — " +
        "mit der Tastatur kommt man nicht an die unteren Einträge",
    ).toBe("0");
  });

  /*
    Das Löschen einer Schicht rechnet drei Felder des Berichts zurück. Bis
    hierher war das nur über die reine Funktion `verrechneSchicht` abgedeckt --
    die ROADMAP führte es ausdrücklich unter „Nicht über die Oberfläche
    geprüft".

    Der Unterschied ist nicht theoretisch: Die Rechnung stand bis 0.9.14
    DREIMAL in `App.tsx`, und zwischen der reinen Funktion und dem Bericht
    liegen der Dialog, der Hook, der Zeitstempel und der Schreibvorgang nach
    IndexedDB. Geprüft wird deshalb der ganze Weg, einschließlich des
    Neuladens -- ein nur im Arbeitsspeicher korrigierter Stand wäre nach dem
    nächsten Start wieder falsch.
  */
  test("Schicht löschen rechnet die Stunden zurück und speichert das", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "handy", "Rechnen haengt nicht am Geraeteprofil");
    await oeffneZeitMitSchichten(page, {
      // Der Stand, den die beiden Schichten aus SCHICHTEN_BESTAND erzeugt
      // hätten: 3,88 + 7,75 Bürostunden, 3,87 Außendienst, zwei Arbeitstage.
      std_buero: 11.63,
      std_aussendienst: 3.87,
      tage_arbeit: 2,
      // Ein fachfremdes Feld: Es darf sich beim Löschen nicht bewegen.
      s1_1: 9,
    });

    await page.getByRole("button", { name: "Schicht vom 02.09. löschen" }).click();
    await page.getByRole("alertdialog").waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Schicht löschen", exact: true }).click();
    await page.waitForTimeout(1500);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /Schicht-Protokoll/ }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(500);

    const stand = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const r = indexedDB.open("keyval-store", 1);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      const wert = await new Promise<Record<string, unknown>>((res, rej) => {
        const t = db.transaction("keyval", "readonly");
        const q = t.objectStore("keyval").get("aussendienst_pwa_data");
        q.onsuccess = () => res(q.result);
        q.onerror = () => rej(t.error);
      });
      const v = (wert?.values || {}) as Record<string, number>;
      return {
        buero: v.std_buero,
        aussen: v.std_aussendienst,
        tage: v.tage_arbeit,
        fremd: v.s1_1,
        ids: ((wert?.timeLogs || []) as { id: string }[]).map((l) => l.id),
      };
    });

    expect(
      stand,
      "Nach dem Löschen der ersten Schicht müssen genau deren Stunden fehlen " +
        "und der Arbeitstag mit ihr. Weicht das ab, steht eine falsche " +
        "Arbeitszeit im Bericht an die Vertriebsleitung.",
    ).toEqual({ buero: 7.75, aussen: 0, tage: 1, fremd: 9, ids: ["p2"] });
  });
});

/**
 * Die Rückfragen -- `ConfirmDialog`, der barrierefreie Ersatz für
 * `window.confirm()`.
 *
 * Achter Fall derselben Klasse: geprüft wird, was ein `?tab=` oder ein Klick
 * erreicht; ein Zustand DARUNTER erreicht es nicht. Dieser hier ist der
 * unangenehmste der Reihe, denn hinter jeder dieser fünf Rückfragen steht eine
 * Entscheidung, die Daten vernichtet oder überschreibt -- und **keine einzige
 * war je gerendert worden**.
 *
 * Dass das nicht hypothetisch ist, steht im DEVLOG zu 0.9.22: Die
 * bestätigende Taste war in zwei Farbschemata unsichtbar (1,00:1 und 1,07:1),
 * in allen vier zerstörenden Rückfragen -- gefunden von Hand, weil „das
 * Prüfgate gerenderte Ansichten misst, und keine Prüfung je eine Rückfrage
 * öffnete". Dieser Block schließt genau diese Lücke.
 *
 * Der erste Lauf hat zwei Rückfragen gefunden, in denen der Fokus gar nicht im
 * Dialog ankam und der Tabulator durch den Hintergrund lief -- siehe die
 * Begründung in `ConfirmDialog.tsx`.
 */
const RUECKFRAGEN = [
  {
    /*
      Die einzige Rückfrage mit `details` (Ergebnisse der
      Plausibilitätsprüfung). Der `<ul>`-Zweig in `ConfirmDialog` hängt allein
      an ihr und an „Alles ersetzen" im Sync.
    */
    name: "Rückfrage: Monat abschließen",
    ausloeser: /Monat abschließen und neu starten/,
    oeffne: async (p: Page) => {
      await legeBerichtAn(p, {
        month: "2026-09",
        name: "Marc Petry",
        notes: "Sammelbestellung Berufsförderungswerk offen.",
        values: { s1_1: 5, std_buero: 20 },
        valuesUpdatedAt: {},
        timeLogs: SCHICHTEN_BESTAND,
      });
      await oeffne(p, "form");
      await p.getByRole("button", { name: /Monat abschließen und neu starten/ }).first().click();
    },
  },
  {
    name: "Rückfrage: Vorlage laden",
    ausloeser: /als Vorlage laden/,
    oeffne: async (p: Page) => {
      await legeArchivAn(p);
      await oeffne(p, "form");
      await p.getByRole("button", { name: /als Vorlage laden/ }).first().click();
    },
  },
  {
    name: "Rückfrage: Kategorie löschen",
    ausloeser: /unwiderruflich löschen/,
    oeffne: async (p: Page) => {
      await oeffneFelderVerwalten(p);
      await p.getByRole("button", { name: /unwiderruflich löschen/ }).first().click();
    },
  },
  {
    name: "Rückfrage: Formular zurücksetzen",
    ausloeser: /Formular auf Standard-Felder zurücksetzen/,
    oeffne: async (p: Page) => {
      await oeffneFelderVerwalten(p);
      await p.getByRole("button", { name: /Formular auf Standard-Felder zurücksetzen/ }).first().click();
    },
  },
  {
    name: "Rückfrage: Schicht löschen",
    ausloeser: "Schicht vom 02.09. löschen",
    oeffne: async (p: Page) => {
      await oeffneZeitMitSchichten(p);
      await p.getByRole("button", { name: "Schicht vom 02.09. löschen" }).click();
    },
  },
  {
    /*
      Die folgenschwerste Aktion der App: „Alles ersetzen" überschreibt das
      gesamte Archiv dieses Geräts.

      Sie liegt als einzige in einer Ansicht mit EIGENER Fokusfalle
      (`DeviceSyncModal`) -- zwei Fallen auf demselben `keydown`. Genau
      deshalb gehört sie hierher und nicht in den Zwei-Geräte-Block.

      Ein zweites Gerät braucht es dafür nicht: Ein Paket, das dasselbe Gerät
      erzeugt hat, ist strukturell gültig, und gemessen wird die Rückfrage,
      nicht das Zusammenführen.
    */
    name: "Rückfrage: Alles ersetzen",
    ausloeser: /Alles ersetzen/,
    oeffne: async (p: Page) => {
      await oeffneSyncErsetzenAbfrage(p);
    },
  },
] as const;

/**
 * Bis in die Rückfrage „Alle Daten dieses Geräts ersetzen?".
 *
 * Ein zweites Gerät braucht es dafür nicht: Ein Paket, das dasselbe Gerät
 * erzeugt hat, ist strukturell gültig, und gemessen wird die Rückfrage, nicht
 * das Zusammenführen. Der Weg läuft bewusst über die Oberfläche statt über ein
 * von Hand gebautes Paket -- sonst prüfte er den Code-Weg mit, den er
 * eigentlich voraussetzt.
 */
async function oeffneSyncErsetzenAbfrage(p: Page) {
  /*
    Die Zwischenablage braucht in Chromium eine Berechtigung. Beide
    Chromium-Profile (`handy`, `schreibtisch`) bekommen sie hier; das
    WebKit-Profil misst weder Geometrie noch Tastatur und kommt gar nicht
    hierher.
  */
  await p.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await oeffne(p, "options");
  await p.getByRole("button", { name: /Geräte-Sync/ }).first().click();
  await p.getByRole("heading", { name: /Geräte-Synchronisation/ }).first().waitFor({ timeout: 20_000 });
  await p.getByRole("button", { name: /Daten an anderes Gerät senden/ }).click();
  const kopieren = p.getByRole("button", { name: /Code kopieren/ });
  await kopieren.waitFor({ state: "visible", timeout: 20_000 });
  await kopieren.click();
  await p.waitForTimeout(600);
  const code = await p.evaluate(() => navigator.clipboard.readText());
  expect(code.startsWith("RVC1:"), `Kopierter Code beginnt nicht mit RVC1: (${code.slice(0, 16)})`).toBe(true);

  await p.reload({ waitUntil: "domcontentloaded" });
  await p.getByRole("button", { name: /Geräte-Sync/ }).first().click();
  await p.getByRole("heading", { name: /Geräte-Synchronisation/ }).first().waitFor({ timeout: 20_000 });
  await p.getByRole("button", { name: /Daten von anderem Gerät übernehmen/ }).click();
  await p.locator("#paste-code-input").waitFor({ state: "visible", timeout: 20_000 });
  await p.locator("#paste-code-input").fill(code);
  await p.getByRole("button", { name: /Code übernehmen/ }).click();
  await p.getByRole("button", { name: /Alles ersetzen/ }).waitFor({ state: "visible", timeout: 20_000 });
  await p.getByRole("button", { name: /Alles ersetzen/ }).click();
}

/** Bericht in IndexedDB legen, ohne die App vorher laden zu lassen. */
async function legeBerichtAn(page: Page, bericht: Record<string, unknown>) {
  await page.route("**/leerseite-fuer-rueckfragen", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>leer</title>" }),
  );
  await page.goto("/leerseite-fuer-rueckfragen");
  await page.evaluate(async (daten) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open("keyval-store", 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("keyval")) r.result.createObjectStore("keyval");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise<void>((res, rej) => {
      const t = db.transaction("keyval", "readwrite");
      t.objectStore("keyval").put(daten, "aussendienst_pwa_data");
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  }, bericht);
}

/**
 * `ManageModal` liegt zwei Ebenen tief. Die Überschrift, auf die gewartet
 * wird, trägt nur diese Ansicht -- „Formular anpassen" wäre das Untermenü
 * darüber und hat von 0.9.18 bis 0.9.21 die falsche Ansicht messen lassen.
 */
async function oeffneFelderVerwalten(page: Page) {
  await oeffne(page, "options");
  await page.getByRole("button", { name: /Formular anpassen/ }).first().click();
  await page.getByRole("button", { name: /Eigene Felder löschen/ }).first().click();
  await page.getByRole("heading", { name: /Formularfelder verwalten/ }).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(250);
}

async function oeffneRueckfrage(page: Page, eintrag: (typeof RUECKFRAGEN)[number]) {
  await eintrag.oeffne(page);
  await page.getByRole("alertdialog").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(400);
}

test.describe("Zustände der Rückfragen", () => {
  for (const rueckfrage of RUECKFRAGEN) {
    for (const groesse of ["normal", "extra-large"] as const) {
      test(`${rueckfrage.name} bei ${groesse}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "handy-webkit", "Geometrie haengt nicht am Motor");
        await oeffneRueckfrage(page, rueckfrage);
        await setzeSchriftgroesse(page, groesse);
        await warteAufRuhigesLayout(page);
        await pruefeGeometrie(page, `${rueckfrage.name} / ${groesse}`);
      });
    }

    test(`${rueckfrage.name}: kein Name ersetzt die Beschriftung`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Namen haengen nicht am Geraeteprofil");
      await oeffneRueckfrage(page, rueckfrage);
      const verstoesse = await findeNamensverstoesse(page);
      expect(verstoesse, `${rueckfrage.name}: ${verstoesse.join(" | ")}`).toEqual([]);
    });

    test(`${rueckfrage.name} ohne schwere Verstöße`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "axe haengt nicht am Motor");
      await oeffneRueckfrage(page, rueckfrage);
      const ergebnis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const befunde = ergebnis.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .flatMap((v) => v.nodes.map((n) => `${v.id} @ ${n.target.join(" ")} — ${n.failureSummary?.replace(/\s+/g, " ").trim()}`));
      expect(befunde, `${rueckfrage.name}`).toEqual([]);
    });

    /*
      Der eigentliche Fund von 0.9.32.

      Eine modale Rückfrage, die den Fokus nicht bekommt, ist für jemanden,
      der nicht zeigen kann, schlimmer als keine Rückfrage: Der Screenreader
      liest über `role="alertdialog"` vor, dass etwas gelöscht werden soll,
      und die Tastatur steht derweil im Hintergrund. Der nächste Tabulator
      läuft durch die Seite DAHINTER -- also durch genau die Elemente, die die
      Rückfrage gerade sperren soll.

      Gemessen wird deshalb dreierlei, und zwar für jede der Rückfragen:
      wo der Fokus landet, ob er bleibt, und wohin er zurückkehrt.
    */
    test(`${rueckfrage.name}: der Fokus liegt im Dialog und bleibt darin`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Tastatur haengt nicht am Geraeteprofil");
      await oeffneRueckfrage(page, rueckfrage);

      // Startfokus: bewusst „Abbrechen", damit ein versehentliches Enter bei
      // einer zerstörenden Aktion nichts auslöst.
      const start = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        const d = document.querySelector('[role="alertdialog"]');
        return {
          imDialog: !!(a && d && d.contains(a)),
          name: (a?.getAttribute("aria-label") || a?.textContent || "").trim().slice(0, 30),
        };
      });
      expect(
        start,
        `${rueckfrage.name}: Der Startfokus liegt nicht auf „Abbrechen" im Dialog, ` +
          `sondern auf „${start.name}". Wer nicht zeigen kann, steht damit ` +
          `im Hintergrund, während vorn eine Löschabfrage steht.`,
      ).toEqual({ imDialog: true, name: "Abbrechen" });

      // Zehnmal vorwärts, sechsmal rückwärts: Der Fokus darf den Dialog nie
      // verlassen. Zehn ist mehr als die zwei Tasten des Dialogs -- ein
      // Durchlauf, der irgendwo im Hintergrund landet, fällt damit sicher auf.
      const ausbruch: string[] = [];
      for (const [anzahl, taste] of [
        [10, "Tab"],
        [6, "Shift+Tab"],
      ] as const) {
        for (let i = 0; i < anzahl; i++) {
          await page.keyboard.press(taste);
          const wo = await page.evaluate(() => {
            const a = document.activeElement as HTMLElement | null;
            const d = document.querySelector('[role="alertdialog"]');
            return {
              drin: !!(a && d && d.contains(a)),
              name: (a?.getAttribute("aria-label") || a?.textContent || "").trim().slice(0, 26),
            };
          });
          if (!wo.drin) ausbruch.push(`${taste} ${i + 1} → "${wo.name}"`);
        }
      }
      expect(
        ausbruch,
        `${rueckfrage.name}: Der Tabulator verlässt die Rückfrage — ${ausbruch.join(" | ")}`,
      ).toEqual([]);

      // Escape bricht ab, und der Fokus kehrt dorthin zurück, wo der Nutzer
      // war. Ohne die Rückgabe steht er nach dem Abbrechen am Seitenanfang.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      await expect(
        page.locator('[role="alertdialog"]'),
        `${rueckfrage.name}: Escape schließt die Rückfrage nicht`,
      ).toHaveCount(0);

      const zurueck = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        return (a?.getAttribute("aria-label") || a?.textContent || "").trim();
      });
      expect(
        zurueck,
        `${rueckfrage.name}: Nach dem Abbrechen steht der Fokus auf „${zurueck}" ` +
          `statt zurück auf der auslösenden Taste`,
      ).toMatch(rueckfrage.ausloeser);
    });
  }

  /*
    Der zweite Fund von 0.9.32, und der teurere.

    Die Rückfrage und die Ansicht dahinter hören beide auf `keydown` am
    `window`. Ein Escape, das die Rückfrage abbrechen soll, hat deshalb
    BEIDES geschlossen -- gemessen am 2026-09-12:

      Feldverwaltung  „Kategorie löschen?" → Escape → Überschrift „Optionen"
      Geräte-Sync     „Alles ersetzen?"    → Escape → Überschrift „Optionen",
                      und das bereits EMPFANGENE Paket war weg

    Der zweite Fall ist der schwerere: Wer die folgenschwerste Aktion der App
    verneint, wird dafür mit einer wiederholten Übertragung bestraft.

    Geprüft wird beides in einem Lauf, und zwar in beide Richtungen: Das erste
    Escape darf NUR die Rückfrage schließen, das zweite MUSS die Ansicht
    schließen. Ohne die zweite Hälfte wäre die Prüfung auch mit einer Wache
    zufrieden, die Escape pauschal totlegt -- und das wäre ein neuer Defekt
    statt einer Behebung.
  */
  for (const fall of [
    {
      name: "Feldverwaltung",
      dahinter: /Formularfelder verwalten/,
      danach: /Optionen/,
      oeffne: async (p: Page) => {
        await oeffneFelderVerwalten(p);
        await p.getByRole("button", { name: /unwiderruflich löschen/ }).first().click();
      },
    },
    {
      name: "Geräte-Sync",
      dahinter: /Geräte-Synchronisation/,
      danach: /Optionen/,
      oeffne: oeffneSyncErsetzenAbfrage,
      // Nach dem Abbrechen muss das empfangene Paket noch da sein.
      bleibt: /Zusammenführen/,
    },
  ]) {
    test(`Escape bricht nur die Rückfrage ab, nicht ${fall.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Tastatur haengt nicht am Geraeteprofil");
      await fall.oeffne(page);
      await page.getByRole("alertdialog").waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForTimeout(300);

      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);

      await expect(
        page.locator('[role="alertdialog"]'),
        `${fall.name}: Escape schließt die Rückfrage nicht`,
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: fall.dahinter }).first(),
        `${fall.name}: Escape hat die Rückfrage UND die Ansicht dahinter ` +
          `geschlossen. Wer eine zerstörende Aktion verneint, verliert damit ` +
          `auch den Bildschirm, auf dem er gerade arbeitet.`,
      ).toBeVisible();

      const bleibt = (fall as { bleibt?: RegExp }).bleibt;
      if (bleibt) {
        await expect(
          page.getByRole("button", { name: bleibt }).first(),
          `${fall.name}: Das empfangene Paket ist beim Abbrechen verfallen — ` +
            `die ganze Übertragung müsste wiederholt werden.`,
        ).toBeVisible();
      }

      // Gegenrichtung: Ohne Rückfrage schließt Escape die Ansicht weiterhin.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      await expect(
        page.getByRole("heading", { name: fall.danach }).first(),
        `${fall.name}: Escape schließt die Ansicht nicht mehr — die Wache ` +
          `gegen den doppelten Abbruch greift zu weit.`,
      ).toBeVisible();
    });
  }
});

/**
 * Zwei Geräte, echt gekoppelt.
 *
 * Diese beiden Zustände standen bis 0.9.29 als „braucht ein zweites Gerät,
 * deshalb nicht prüfbar" in DEVLOG und ROADMAP. Das war zu schnell
 * geschlossen: Playwright kann zwei unabhängige Browserkontexte öffnen, und
 * der kameralose Weg über den Textcode ist vollständig automatisierbar. Was
 * wirklich fehlt, ist eine Kamera — nicht ein zweites Gerät.
 *
 * Geprüft wird damit:
 *
 * - **`confirm`**: Gerät A baut einen Datencode, Gerät B fügt ihn ein und
 *   landet in der Rückfrage „Zusammenführen oder Ersetzen". Dieser Zustand
 *   trägt die folgenreichste Entscheidung der ganzen App — „Alles ersetzen"
 *   überschreibt das Archiv des empfangenden Geräts.
 * - **Das Zusammenführen selbst**: Nach „Zusammenführen" müssen BEIDE Stände
 *   da sein. Die reinen Prüfungen zu `mergeSyncPayload` decken die Rechnung
 *   ab, nicht aber den Weg durch die Oberfläche.
 *
 * Die Zwischenablage braucht in Chromium eine Berechtigung; sie wird dem
 * Kontext hier ausdrücklich erteilt. Im WebKit-Profil läuft das nicht und die
 * Prüfung wird dort übersprungen — das ist eine Grenze des Prüfwerkzeugs, kein
 * Befund über die App.
 */
async function oeffneSyncMitBestand(
  page: Page,
  monate: Record<string, unknown>,
  laufenderMonat: Record<string, unknown>,
) {
  await page.route("**/leerseite-fuer-zweigeraet", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>leer</title>" }),
  );
  await page.goto("/leerseite-fuer-zweigeraet");
  await page.evaluate(
    async ({ archiv, bericht }) => {
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const r = indexedDB.open("keyval-store", 1);
        r.onupgradeneeded = () => {
          if (!r.result.objectStoreNames.contains("keyval")) r.result.createObjectStore("keyval");
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      const schreibe = (k: string, v: unknown) =>
        new Promise<void>((res, rej) => {
          const t = db.transaction("keyval", "readwrite");
          t.objectStore("keyval").put(v, k);
          t.oncomplete = () => res();
          t.onerror = () => rej(t.error);
        });
      await schreibe("aussendienst_pwa_history", archiv);
      await schreibe("aussendienst_pwa_data", bericht);
    },
    { archiv: monate, bericht: laufenderMonat },
  );

  await page.addInitScript(() => {
    localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
  });
  await page.goto("/?tab=options", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Geräte-Sync/ }).first().click();
  await page
    .getByRole("heading", { name: /Geräte-Synchronisation/ })
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
}

function monat(m: string, feld: string, wert: number) {
  return {
    month: m,
    name: "Marc Petry",
    notes: "",
    values: { [feld]: wert },
    valuesUpdatedAt: { [feld]: `${m}-15T10:00:00.000Z` },
    fieldsSnapshot: {},
    savedAt: `${m}-28T10:00:00.000Z`,
    timeLogs: [],
  };
}

test.describe("Zwei Geräte über den Textcode", () => {
  test("Empfangen führt in die Rückfrage und das Zusammenführen erhält beide Stände", async ({
    browser,
    baseURL,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "handy",
      "Zwei Kontexte plus Zwischenablage laufen nur im Chromium-Profil",
    );
    test.setTimeout(120_000);

    // baseURL steht im obersten `use` der Konfiguration, nicht je Profil --
    // `testInfo.project.use.baseURL` waere hier undefined. Playwright reicht
    // es als Fixture durch, und das ist der verlaessliche Weg.
    const basis = baseURL as string;
    const kontextA = await browser.newContext({
      baseURL: basis,
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const kontextB = await browser.newContext({
      baseURL: basis,
      permissions: ["clipboard-read", "clipboard-write"],
    });

    try {
      const a = await kontextA.newPage();
      const b = await kontextB.newPage();

      // Gerät A kennt den Juni, Gerät B den Juli. Nach dem Zusammenführen
      // müssen auf B BEIDE Monate stehen -- das ist der Unterschied zwischen
      // „zusammenführen" und „ersetzen", und er ist in dieser App schon einmal
      // schiefgegangen (bis 0.9.0 gewann schlicht der jüngere Stand).
      await oeffneSyncMitBestand(a, { "2026-06": monat("2026-06", "s1_1", 7) }, {
        month: "2026-09", name: "Marc Petry", notes: "", values: {}, valuesUpdatedAt: {}, timeLogs: [],
      });
      await oeffneSyncMitBestand(b, { "2026-07": monat("2026-07", "s1_1", 4) }, {
        month: "2026-09", name: "Marc Petry", notes: "", values: {}, valuesUpdatedAt: {}, timeLogs: [],
      });

      // A: senden -> Code kopieren
      await a.getByRole("button", { name: /Daten an anderes Gerät senden/ }).click();
      const kopieren = a.getByRole("button", { name: /Code kopieren/ });
      await kopieren.waitFor({ state: "visible", timeout: 20_000 });
      await kopieren.click();
      await a.waitForTimeout(600);
      const code = await a.evaluate(() => navigator.clipboard.readText());
      expect(code.startsWith("RVC1:"), `Kopierter Code beginnt nicht mit RVC1: (${code.slice(0, 20)})`).toBe(true);

      // B: empfangen -> Code einfügen -> übernehmen
      await b.getByRole("button", { name: /Daten von anderem Gerät übernehmen/ }).click();
      await b.locator("#paste-code-input").waitFor({ state: "visible", timeout: 20_000 });
      await b.locator("#paste-code-input").fill(code);
      await b.getByRole("button", { name: /Code übernehmen/ }).click();

      // Das ist `confirm` -- der Zustand, der bis hierher nie gemessen wurde.
      const zusammenfuehren = b.getByRole("button", { name: /Zusammenführen/ });
      await zusammenfuehren.waitFor({ state: "visible", timeout: 20_000 });

      // „Alles ersetzen" verwirft das lokale Archiv -- die Rückfrage muss
      // deshalb beziffern, WAS dabei verlorenginge. Gerät B hat genau einen
      // Monat archiviert, die Zeile muss ihn also benennen.
      //
      // Hier stand zuerst `/\d/` auf dem gesamten Seitentext. Das ist keine
      // Prüfung, sondern eine Formalie: Es trifft jede Versionsnummer und
      // jede Monatsangabe und bliebe selbst dann grün, wenn die Zahl aus der
      // Rückfrage verschwindet -- also genau im Schadensfall.
      const ersetzenHinweis = b.locator("p", { hasText: /Überschreibt/ }).first();
      await expect(
        ersetzenHinweis,
        "Die Rückfrage beziffert nicht, was ein Ersetzen verwerfen würde",
      ).toContainText("1 Monat im Archiv");

      await zusammenfuehren.click();
      await b.waitForTimeout(2500);

      const monateAufB = await b.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
          const r = indexedDB.open("keyval-store", 1);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        const wert = await new Promise<any>((res, rej) => {
          const t = db.transaction("keyval", "readonly");
          const q = t.objectStore("keyval").get("aussendienst_pwa_history");
          q.onsuccess = () => res(q.result);
          q.onerror = () => rej(t.error);
        });
        return Object.keys(wert || {}).sort();
      });

      expect(
        monateAufB,
        "Erwartet werden GENAU die beiden Archivmonate. Fehlt einer, ist es der " +
          "Datenverlust, den die Zeitstempel je Feld seit 0.9.0 verhindern sollen. " +
          "Steht ein dritter da, ist es der leere aktive Monat des Senders — siehe " +
          "monthHasContent in mergeSyncPayload (0.9.30).",
      ).toEqual(["2026-06", "2026-07"]);
    } finally {
      await kontextA.close();
      await kontextB.close();
    }
  });
});

/**
 * Zwei Geräte über die LIVE-VERBINDUNG (WebRTC, ohne ICE-Server).
 *
 * Warum das hier steht, obwohl DEVLOG und ROADMAP bis 0.9.30 das Gegenteil
 * behaupteten: Der Eintrag zu 0.9.30 führte die Live-Verbindung als weiterhin
 * ungeprüft, weil sie „zwei Kontexte braucht, die WebRTC ohne ICE-Server
 * zueinander finden". Nachgemessen am 2026-09-09: Zwei Playwright-Kontexte
 * verbinden sich in 306 ms. Der einzige Kandidat ist ein mDNS-verschleierter
 * Host-Kandidat, und beide Seiten lösen ihn auf, weil sie im selben Browser
 * laufen. Es war derselbe Fehlschluss wie zuvor bei „braucht ein zweites
 * Gerät": eine Annahme, die nie nachgerechnet wurde.
 *
 * Geprüft wird, was ohne zwei Gegenstellen gar nicht existiert:
 *
 * - **Die Kopplung über den kameralosen Weg** — Verbindungscode, Antwortcode,
 *   beides über die Zwischenablage, so wie ein Nutzer ohne Kamera es tut.
 * - **Die Stille im Leerlauf.** `sendNow()` überträgt nur, wenn sich der Text
 *   des Standes geändert hat. Ohne diese Bedingung senden zwei gekoppelte
 *   Geräte alle 3 Sekunden den vollen Stand und schreiben ihn nach IndexedDB —
 *   für immer, weil das Zusammenführen neue Objekte mit anderer
 *   Schlüsselreihenfolge erzeugt (dagegen steht `stableStringify`).
 *   `CLAUDE.md` verlangt dafür seit Langem eine Messung: „Idle should produce
 *   zero messages." Sie stand bis hierher nur da.
 * - **Das Zusammenführen in beide Richtungen** über den Live-Kanal, nicht nur
 *   über den einmaligen Textcode.
 * - **Dass die Verbindung das Schließen des Fensters überlebt.** Das ist der
 *   ganze Zweck von `liveSync.ts` als Modul-Singleton: Zum Eintragen von
 *   Zahlen muss man dieses Fenster verlassen.
 * - **Der Kopfbereich MIT dem grünen Abzeichen.** Dieser Zustand war nie
 *   gerendert worden, und genau dort steckten zwei Fehler (0.9.31): 42 px
 *   Höhe gegen die bindenden 44, und 25 px waagerechter Überlauf bei „Extra
 *   groß" mit breiter Schrift.
 *
 * Grenzen, ausdrücklich: nur Chromium (zwei Kontexte plus Zwischenablage sind
 * in WebKit nicht auf demselben Weg zu bekommen), nur der kameralose Weg, und
 * keine Aussage über die Bedienbarkeit mit einem Screenreader.
 *
 * Die breite Schrift steckt hier IM Test statt in `ZUSTAENDE_MIT_SCHRIFT`:
 * Jene Liste arbeitet mit der `page`-Vorrichtung, dieser Zustand braucht zwei
 * Kontexte. Deshalb wird Gerät A von Anfang an mit Verdana geladen.
 */
type SendeZaehler = { __sends?: number[] };

async function zaehleNachrichten(page: Page) {
  await page.addInitScript(() => {
    (window as SendeZaehler).__sends = [];
    // `send` ist mehrfach überladen (string, Blob, ArrayBuffer, View). Der
    // Zähler interessiert sich nur für die Länge, die Weitergabe bleibt
    // unverändert -- deshalb eine schmale Signatur und die Rückgabe an das
    // Original, mit dem Typ des Originals wieder eingesetzt.
    const orig = RTCDataChannel.prototype.send as (this: RTCDataChannel, d: unknown) => void;
    RTCDataChannel.prototype.send = function (this: RTCDataChannel, daten: unknown) {
      (window as SendeZaehler).__sends?.push(typeof daten === "string" ? daten.length : -1);
      return orig.call(this, daten);
    } as typeof RTCDataChannel.prototype.send;
  });
}

const nachrichten = (page: Page) =>
  page.evaluate(() => (window as SendeZaehler).__sends?.length ?? -1);

async function archivMonate(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open("keyval-store", 1);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const wert = await new Promise<Record<string, unknown>>((res, rej) => {
      const t = db.transaction("keyval", "readonly");
      const q = t.objectStore("keyval").get("aussendienst_pwa_history");
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(t.error);
    });
    return Object.keys(wert || {}).sort();
  });
}

test.describe("Zwei Geräte über die Live-Verbindung", () => {
  test("Kopplung, Stille im Leerlauf, und das Abzeichen im Kopfbereich", async ({
    browser,
    baseURL,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "handy",
      "Zwei Kontexte plus Zwischenablage laufen nur im Chromium-Profil",
    );
    test.setTimeout(180_000);

    const basis = baseURL as string;
    const kontextA = await browser.newContext({
      baseURL: basis,
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const kontextB = await browser.newContext({
      baseURL: basis,
      permissions: ["clipboard-read", "clipboard-write"],
    });

    try {
      const a = await kontextA.newPage();
      const b = await kontextB.newPage();
      await zaehleNachrichten(a);
      await zaehleNachrichten(b);
      // Gerät A trägt die Messung des Kopfbereichs -- deshalb von Anfang an
      // mit der breiten Schrift, die der CI-Läufer einsetzt.
      await erzwingeBreiteSchrift(a);

      const leererMonat = {
        month: "2026-09",
        name: "Marc Petry",
        notes: "",
        values: {},
        valuesUpdatedAt: {},
        timeLogs: [],
      };
      await oeffneSyncMitBestand(a, { "2026-06": monat("2026-06", "s1_1", 7) }, leererMonat);
      await oeffneSyncMitBestand(b, { "2026-07": monat("2026-07", "s1_1", 4) }, leererMonat);

      // --- Kopplung, Schritt 1: A bietet an ---
      await a.getByRole("button", { name: /Live-Verbindung starten/ }).click();
      const kopierenA = a.getByRole("button", { name: /Code kopieren/ });
      await kopierenA.waitFor({ state: "visible", timeout: 30_000 });
      await kopierenA.click();
      await a.waitForTimeout(500);
      const verbindungscode = await a.evaluate(() => navigator.clipboard.readText());
      expect(
        verbindungscode.startsWith("RVC1:"),
        `Der Verbindungscode beginnt nicht mit RVC1: (${verbindungscode.slice(0, 20)})`,
      ).toBe(true);

      // --- Schritt 2: B tritt bei und antwortet ---
      await b.getByRole("button", { name: /Live-Verbindung beitreten/ }).click();
      await b.locator("#paste-code-input").waitFor({ state: "visible", timeout: 30_000 });
      await b.locator("#paste-code-input").fill(verbindungscode);
      await b.getByRole("button", { name: /Code übernehmen/ }).click();
      const kopierenB = b.getByRole("button", { name: /Code kopieren/ });
      await kopierenB.waitFor({ state: "visible", timeout: 30_000 });
      await kopierenB.click();
      await b.waitForTimeout(500);
      const antwortcode = await b.evaluate(() => navigator.clipboard.readText());
      expect(
        antwortcode.startsWith("RVC1:"),
        `Der Antwortcode beginnt nicht mit RVC1: (${antwortcode.slice(0, 20)})`,
      ).toBe(true);

      // --- Schritt 3: A nimmt die Antwort an ---
      await a.getByRole("button", { name: /Antwort-Code empfangen/ }).click();
      await a.locator("#paste-code-input").waitFor({ state: "visible", timeout: 30_000 });
      await a.locator("#paste-code-input").fill(antwortcode);
      await a.getByRole("button", { name: /Code übernehmen/ }).click();

      // „Verbindung trennen" erscheint nur in `renderConnectedView` -- es ist
      // damit der Beleg, dass der Datenkanal offen ist, nicht bloß ein Text.
      await a
        .getByRole("button", { name: /Verbindung trennen/ })
        .waitFor({ state: "visible", timeout: 60_000 });

      // --- Die Stille im Leerlauf ---
      // Nach dem Öffnen sendet jede Seite ihren Stand und, nach dem
      // Zusammenführen des fremden Standes, den vereinigten. Danach ist der
      // Text identisch und es darf NICHTS mehr fließen.
      await a.waitForTimeout(9000);
      const ruheA = await nachrichten(a);
      const ruheB = await nachrichten(b);
      expect(ruheA, "Gerät A hat gar nicht gesendet").toBeGreaterThan(0);
      expect(ruheB, "Gerät B hat gar nicht gesendet").toBeGreaterThan(0);

      // Vier Abgleich-Takte (LIVE_SEND_INTERVAL_MS = 3000) ohne jede Eingabe.
      await a.waitForTimeout(13_000);
      expect(
        [await nachrichten(a), await nachrichten(b)],
        `Eine ruhende Verbindung hat weiter gesendet (vorher ${ruheA}/${ruheB}). ` +
          "Genau das verhindert der Textvergleich in sendNow() zusammen mit " +
          "stableStringify -- ohne beides schreiben zwei gekoppelte Geräte alle " +
          "3 Sekunden den vollen Stand nach IndexedDB, ohne Ende.",
      ).toEqual([ruheA, ruheB]);

      // --- Zusammengeführt, in beide Richtungen ---
      for (const [name, seite] of [
        ["A", a],
        ["B", b],
      ] as const) {
        expect(
          await archivMonate(seite),
          `Gerät ${name} hat nach dem Live-Abgleich nicht beide Monate. Fehlt ` +
            "einer, greifen die Zeitstempel je Feld nicht; steht ein dritter " +
            "da, wandert wieder ein leerer Monat mit (0.9.30).",
        ).toEqual(["2026-06", "2026-07"]);
      }

      // --- Überlebt die Verbindung das Schließen des Fensters? ---
      // Das ist der Zweck des Modul-Singletons: Zahlen eintragen heißt,
      // dieses Fenster zu verlassen.
      await a.getByRole("button", { name: /Zurück zu den Optionen/ }).click({ timeout: 20_000 });
      await a.waitForTimeout(800);
      // Die untere Navigation trägt role="tab", nicht role="button" -- eine
      // Suche über die Rolle „button" findet sie nicht.
      await a.locator('button:has-text("RV Report")').first().click({ timeout: 20_000 });
      await expect(
        a.getByRole("button", { name: /^Live verbunden/ }),
        "Nach dem Schließen des Sync-Fensters ist die Live-Verbindung weg. Sie " +
          "soll bestehen bleiben (liveSync.ts, abortPairingOnly).",
      ).toBeVisible({ timeout: 20_000 });

      // --- Der Kopfbereich MIT Abzeichen, in der Breite und in der Höhe ---
      for (const [breite, groesse] of [
        [360, "normal"],
        [360, "extra-large"],
        [320, "extra-large"],
      ] as const) {
        await a.setViewportSize({ width: breite, height: 780 });
        await setzeSchriftgroesse(a, groesse);
        await warteAufRuhigesLayout(a);
        await pruefeGeometrie(a, `Live verbunden / ${breite} px / ${groesse} / breit`);
      }
    } finally {
      await kontextA.close();
      await kontextB.close();
    }
  });
});

/**
 * Zustände mit breiter Schrift.
 *
 * Warum es das gibt: Der Block „Breitere Schrift als hier installiert" läuft
 * über `ANSICHTEN` und `EINSTIEGE` — also über alles, was ein `?tab=` oder
 * ein Menüpunkt erreicht. Die Zustände *innerhalb* einer Ansicht kamen ab
 * 0.9.24 als eigene Blöcke dazu und **erbten die Schriftvariante nicht**.
 * Gemessen wurden sie damit ausschließlich mit den auf diesem Rechner
 * installierten Schriften.
 *
 * Was das gekostet hat: Der Deploy von 0.9.24 (`Run 76`) starb an genau
 * dieser Stelle. Die Zeile „Gesamtstunden dieser Schicht:" sprengte auf dem
 * CI-Läufer bei „Extra groß" das 360-px-Fenster — 368 px im Verbuchen-,
 * 369 px im Nachtragen-Formular. Lokal grün, weil „Segoe UI" und sein
 * Mono-Pendant schmaler sind als das, was `ubuntu-latest` einsetzt.
 * Produktion blieb fünf Stunden auf 0.9.23, bis es auffiel.
 *
 * **Wer einen neuen Zustandsblock anlegt, trägt ihn hier nach.** Sonst wird
 * er nur mit den Schriften dieses Rechners geprüft, und der Unterschied
 * zeigt sich erst im Deploy — dort aber als roter Lauf, nicht als Hinweis.
 *
 * Steht am Dateiende, weil `test.describe` seinen Rumpf sofort beim Einlesen
 * ausführt und die Listen der Zustände weiter oben noch nicht angelegt sind.
 */
const ZUSTAENDE_MIT_SCHRIFT: Array<{ name: string; oeffne: (p: Page) => Promise<void> }> = [
  ...ZEIT_FORMULARE.map((f) => ({ name: f.name, oeffne: f.oeffne })),
  ...FORMULAR_ZUSTAENDE.map((z) => ({ name: z.name, oeffne: z.oeffne })),
  ...SYNC_ZUSTAENDE.map((z) => ({
    name: z.name,
    oeffne: (p: Page) => oeffneSyncZustand(p, z),
  })),
  ...ARCHIV_ZUSTAENDE.map((z) => ({
    name: z.name,
    oeffne: (p: Page) => oeffneArchiv(p, z.zustand),
  })),
  /*
    Die fünf Schritte des Ersteinstiegs.

    Sie fehlten hier bis unmittelbar nach 0.9.27 -- also in genau der Fassung,
    die diese Liste eingeführt und dazugeschrieben hat: „Wer einen neuen
    Zustandsblock anlegt, trägt ihn hier nach." Der Block wurde angelegt, der
    Nachtrag vergessen, und der Lauf blieb grün, weil die Lücke nichts meldet.

    Das ist kein Argument gegen die Liste, sondern der Beleg dafür, dass eine
    Liste allein nicht trägt -- deshalb gibt es seit derselben Fassung den
    Zähler in `scripts/checks/zustandsdeckung.ts`. Der hätte hier allerdings
    auch nicht angeschlagen: Der Assistent hat keinen neuen `useState`
    bekommen, er war immer schon da. Gefunden wurde die Lücke beim Nachsehen
    von Hand, kurz vor dem Deploy.
  */
  ...EINSTIEG_SCHRITTE.map((titel, i) => ({
    name: `Einstieg ${i + 1}: ${titel}`,
    oeffne: (p: Page) => oeffneEinstieg(p, i),
  })),
  { name: "Zeit: Schicht-Protokoll", oeffne: (p: Page) => oeffneZeitMitSchichten(p) },
  /*
    Die Rückfragen gehören hierher, weil ihr Text der längste im engsten
    Kasten ist: `max-w-md` neben einem 44-px-Symbol, dazu deutsche
    Zusammensetzungen wie „Sammelbestellung" und bei „Monat abschließen"
    noch eine Aufzählung.
  */
  ...RUECKFRAGEN.map((r) => ({
    name: r.name,
    oeffne: (p: Page) => oeffneRueckfrage(p, r),
  })),
];

test.describe("Zustände mit breiter Schrift", () => {
  test.beforeEach(async ({ page }) => {
    // Wie im Block der Stempeluhr: Der Zeitstempel des Einstempelns darf
    // nicht auf dem Stand eines früheren Laufs aufsetzen.
    await page.addInitScript(() => {
      localStorage.removeItem("aussendienst_pwa_clockin");
    });
  });

  for (const zustand of ZUSTAENDE_MIT_SCHRIFT) {
    test(`${zustand.name} mit breiter Schrift`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "handy", "Schriftbreite haengt nicht am Geraeteprofil");
      await erzwingeBreiteSchrift(page);
      await zustand.oeffne(page);
      await setzeSchriftgroesse(page, "extra-large");
      await warteAufRuhigesLayout(page);
      await pruefeGeometrie(page, `${zustand.name} / breit`);
    });
  }
});
