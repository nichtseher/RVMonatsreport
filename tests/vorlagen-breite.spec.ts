import { test, expect, type Page } from "@playwright/test";
import { VORLAGEN, type VorlageMeta } from "../src/utils/vorlagen";

/**
 * Responsivität über ALLE Vorlagen, ALLE Ansichten, MIT Inhalt.
 *
 * Jede Vorlage bringt eigene, teils lange Namen mit ("Endkundenberatungen",
 * "Fachberatungen/Sprechstunden"); das Prüfnetz in `oberflaeche.spec.ts` misst
 * die Ansichten mit der Vorgabevorlage und meist ohne Inhalt. Gefunden am
 * 2026-10-08, ein Deploy zu spät: "1. Endkundenberatungen" brach bei 320 px und
 * "Extra groß" nicht um und schob die Seite um 25 px nach rechts (WCAG 1.4.10).
 *
 * Gemessen wird dreierlei:
 *  1. waagerechter Überlauf der Seite (`scrollWidth`) -- schließt Text ein, der
 *     über seinen Kasten hinausragt, was Kastenmaße nicht sehen;
 *  2. abgeschnittener Text: ein Element, das seinen Inhalt per `overflow` oder
 *     `text-overflow` kappt, obwohl mehr drinsteht (verlorene Information);
 *  3. Bedienflächen unter 44 px (Layout-Kasten, nicht `getBoundingClientRect`,
 *     siehe CLAUDE.md "Trefferflächen").
 *
 * Mit Inhalt: lange Namen und Notizen aus langen deutschen Wörtern, jede
 * Kategorie mit dreistelligem Wert, drei Archivmonate, Schichten mit Notiz.
 * Mit der breiten Ersatzschrift des CI-Läufers (Verdana), sonst ist der Fehler
 * lokal unsichtbar.
 *
 * Läuft in Chromium (alle Breiten) und WebKit (Handybreiten; WebKit ist die
 * Engine der iPhones).
 */

/*
  Zwei Groessen der Matrix. Das Gate (`npm run check:ui`) faehrt die schlanke:
  die engste Breite und die Mittelbreite, in der die untere Leiste noch steht,
  jeweils bei "Extra gross" -- dort sind alle bisher gefundenen Fehler
  aufgetreten. Die volle Matrix (6 Breiten x 3 Groessen, ~45 min) laeuft mit
  `npm run check:breite`; vor einer Veroeffentlichung, die Layout anfasst.
*/
const VOLL = process.env.BREITE_VOLL === "1";
const BREITEN = (VOLL ? [320, 360, 412, 768, 1024, 1280] : [320, 768]) as readonly number[];
const GROESSEN = (VOLL ? ["normal", "large", "extra-large"] : ["extra-large"]) as readonly string[];
const WEBKIT_BREITEN = new Set<number>(VOLL ? [320, 360, 412] : [320]);

type Ansicht = {
  name: string;
  tab?: string;
  /** Klickweg ab den Optionen. */
  klicks?: RegExp[];
  warten: RegExp;
};

const ANSICHTEN: Ansicht[] = [
  { name: "Formular", tab: "form", warten: /RV Report/ },
  { name: "Zeit", tab: "time", warten: /RV Zeit|Zeit/ },
  { name: "Bestand", tab: "bestand", warten: /Demogeräte|Bestand/ },
  { name: "Analyse", tab: "stats", warten: /Analyse/ },
  { name: "Archiv", tab: "history", warten: /Archiv/ },
  { name: "Optionen", tab: "options", warten: /Optionen|Mehr/ },
  { name: "Formular anpassen", tab: "options", klicks: [/Formular anpassen/], warten: /Formular anpassen/ },
  { name: "Felder verwalten", tab: "options", klicks: [/Formular anpassen/, /Eigene Felder löschen/], warten: /Eigene Felder löschen/ },
  { name: "Geräte-Sync", tab: "options", klicks: [/Geräte-Sync/], warten: /^Geräte-Sync$/ },
  { name: "Datensicherung", tab: "options", klicks: [/Datensicherung/], warten: /Datensicherung/ },
  { name: "Hilfe", tab: "options", klicks: [/Hilfe & Anleitung/], warten: /^Hilfe & Anleitung$/ },
  { name: "Jahreskonto", tab: "options", klicks: [/Jahreskonto/], warten: /^Jahreskonto$/ },
  { name: "Was gibt's Neues", tab: "options", klicks: [/Was gibt.s Neues/], warten: /Was gibt.s Neues/ },
  { name: "Erklärung", tab: "options", klicks: [/Erklärung zur Barrierefreiheit/], warten: /Erklärung zur Barrierefreiheit/ },
];

/** Fremdes Wort in jeder Länge, das nicht von allein umbricht. */
const LANGES_WORT = "Blindenselbsthilfeverein-Landesverband-Nordrhein-Westfalen";

async function legeInhaltAn(page: Page, v: VorlageMeta) {
  await page.route("**/leerseite-fuer-breite", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>leer</title>" }),
  );
  await page.goto("/leerseite-fuer-breite");
  await page.evaluate(
    async ([vorlage, felder, langes]) => {
      const alle = Object.values(felder as unknown as Record<string, { id: string }[]>).flat();
      const werte: Record<string, number> = {};
      alle.forEach((f, i) => { werte[f.id] = 100 + ((i * 37) % 899); });
      const gestempelt: Record<string, string> = {};
      Object.keys(werte).forEach((k) => { gestempelt[k] = "2026-10-05T10:00:00.000Z"; });
      const schicht = (n: number, tag: string) => ({
        id: `s${n}`, date: `2026-10-${tag}`, clockIn: "07:45", clockOut: "17:20", breakMinutes: 45,
        duration: 8.83, officeRatio: 0.4, officeHours: 3.5, fieldHours: 5.33,
        notes: `${langes} Besuch mit sehr ausführlicher Notiz zur Nachbereitung`,
      });
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const r = indexedDB.open("keyval-store", 1);
        r.onupgradeneeded = () => {
          if (!r.result.objectStoreNames.contains("keyval")) r.result.createObjectStore("keyval");
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      const schreibe = (k: string, wert: unknown) =>
        new Promise<void>((res, rej) => {
          const t = db.transaction("keyval", "readwrite");
          t.objectStore("keyval").put(wert, k);
          t.oncomplete = () => res();
          t.onerror = () => rej(t.error);
        });
      const monat = (m: string, tage: string[]) => ({
        month: m,
        name: `Hans-Georg Müller-Lüdenscheidt-Wolfsburg`,
        notes: `${langes}. Notiz mit vielen Wörtern und einem Link https://example.org/sehr/lang/und/ohne/leerzeichen/im/pfad/zur/nachbereitung`,
        values: werte,
        valuesUpdatedAt: gestempelt,
        fieldsSnapshot: felder,
        savedAt: "2026-10-05T10:00:00.000Z",
        timeLogs: tage.map((t, i) => schicht(i + (m === "2026-10" ? 0 : 9), t)),
        ...(m === "2026-08" ? { sentAt: "2026-09-03T08:00:00.000Z" } : {}),
      });
      await schreibe("aussendienst_pwa_history", {
        "2026-08": monat("2026-08", ["03", "04"]),
        "2026-09": monat("2026-09", ["01", "02", "03"]),
      });
      const laufend = monat("2026-10", ["01", "02", "05"]);
      await schreibe("aussendienst_pwa_data", {
        month: laufend.month, name: laufend.name, notes: laufend.notes,
        values: laufend.values, valuesUpdatedAt: laufend.valuesUpdatedAt, timeLogs: laufend.timeLogs,
      });
      void vorlage;
    },
    [v.id, v.felder, LANGES_WORT] as const,
  );
}

/** Läuft IN der Seite. Gibt eine Liste lesbarer Befunde zurück. */
const MISS = () => {
  const befunde: string[] = [];
  const kurz = (el: Element) =>
    `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${(el.getAttribute("class") || "").split(" ").filter((c) => /overflow|truncate|whitespace|min-w|max-w|flex|grid/.test(c)).slice(0, 4).join(".")}[${(el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 38)}]`;
  const unsichtbar = (el: HTMLElement) => {
    const s = getComputedStyle(el);
    return s.display === "none" || s.visibility === "hidden" || (!el.offsetParent && s.position !== "fixed");
  };

  // 1. Seite
  const de = document.documentElement;
  if (de.scrollWidth > window.innerWidth) {
    befunde.push(`ÜBERLAUF Seite ${de.scrollWidth} > ${window.innerWidth}`);
    // Den Verursacher nennen: das tiefste Element, dessen Inhalt über seinen Kasten hinausragt.
    const ragt = Array.from(document.querySelectorAll<HTMLElement>("body *")).filter(
      (e) => !e.classList.contains("sr-only") && !e.closest(".sr-only") && e.clientWidth > 1 && e.scrollWidth > e.clientWidth + 1,
    );
    ragt
      .filter((e) => !ragt.some((a) => a !== e && e.contains(a)))
      .slice(0, 6)
      .forEach((e) => befunde.push(`  VERURSACHER ${kurz(e)} ${e.clientWidth}<${e.scrollWidth}`));
  }

  // 2. abgeschnittener Text
  document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
    if (el.closest("[data-scroll-x='absicht'], .sr-only, svg, canvas") || el.classList.contains("sr-only")) return;
    if (["INPUT", "SELECT", "TEXTAREA", "OPTION", "SCRIPT", "STYLE"].includes(el.tagName)) return;
    if (unsichtbar(el) || el.clientWidth < 2) return;
    const s = getComputedStyle(el);
    const kappt = s.overflowX !== "visible" || s.textOverflow === "ellipsis";
    if (kappt && el.scrollWidth > el.clientWidth + 1 && (el.textContent || "").trim()) {
      befunde.push(`ABGESCHNITTEN ${kurz(el)} ${el.clientWidth}<${el.scrollWidth}`);
      if (!["SPAN", "P"].includes(el.tagName)) {
        // Bei Behaeltern: die Kinder nennen, die ueber den rechten Rand hinausragen.
        const rand = el.getBoundingClientRect().right;
        Array.from(el.querySelectorAll<HTMLElement>("*"))
          .filter((k) => !k.closest(".sr-only") && k.getBoundingClientRect().width > 0 && k.getBoundingClientRect().right > rand + 1)
          .slice(0, 3)
          .forEach((k) => befunde.push(`  RAGT ${kurz(k)} bis ${Math.round(k.getBoundingClientRect().right)} (Rand ${Math.round(rand)})`));
      }
    }
  });

  // 3. Bedienflächen
  const ziele = document.querySelectorAll<HTMLElement>(
    "button, a[href], select, input:not([type=hidden]), textarea, summary, [role=button], [role=switch], [role=tab]",
  );
  ziele.forEach((el) => {
    if (unsichtbar(el) || el.closest(".sr-only") || el.classList.contains("sr-only")) return;
    // Sprunglink: erscheint nur mit Fokus
    if (el.matches("a[href='#main-content']")) return;
    let ziel: HTMLElement = el;
    if ((el as HTMLInputElement).type === "checkbox" || (el as HTMLInputElement).type === "radio") {
      const l = el.closest("label");
      if (l) ziel = l as HTMLElement;
    }
    const b = { w: ziel.offsetWidth, h: ziel.offsetHeight };
    if (b.w < 44 || b.h < 44) befunde.push(`ZU KLEIN ${kurz(ziel)} ${b.w}x${b.h}`);
  });
  // 4. Fokus nicht verdeckt (WCAG 2.4.11): Jedes Bedienelement wird so ins Bild gescrollt,
  //    wie es ein Fokussprung tut (nearest, mit scroll-padding); danach darf es nicht
  //    VOLLSTAENDIG unter der festen unteren Leiste liegen. Gefunden am 2026-10-08:
  //    Zwischen 640 und 1023 px ueberschrieb `sm:py-6` das `pb-32`, die Seite liess sich
  //    nicht weit genug scrollen, und die Leiste deckte die letzte Zeile ab.
  //    `scrollIntoView` statt `focus()`: WebKit scrollt beim Fokussieren anders und
  //    lieferte lauter Fehlalarme. Die Leiste selbst zaehlt nicht (in einem Dialog liegt
  //    sie absichtlich dahinter).
  const fokussierbar = Array.from(
    document.querySelectorAll<HTMLElement>("main button, main a[href], main select, main input, main textarea, main [tabindex='0']"),
  ).filter((e) => !unsichtbar(e) && !e.closest(".sr-only, [aria-label='Hauptnavigation']") && !e.classList.contains("sr-only"));
  fokussierbar.forEach((e) => {
    e.scrollIntoView({ block: "nearest", inline: "nearest" });
    const b = e.getBoundingClientRect();
    if (b.width === 0 || b.bottom < 0 || b.top > window.innerHeight) return;
    // Mehrere Punkte: Ein hohes Feld (Notiz) ist nicht verdeckt, solange ein Teil frei liegt.
    const punkte = [0.15, 0.5, 0.85].map((t) => [b.left + b.width / 2, Math.min(window.innerHeight - 1, Math.max(0, b.top + b.height * t))]);
    const frei = punkte.some(([x, y]) => {
      const oben = document.elementFromPoint(x, y);
      return !oben || e.contains(oben) || oben.contains(e);
    });
    if (!frei) {
      const oben = document.elementFromPoint(b.left + b.width / 2, Math.min(window.innerHeight - 1, Math.max(0, b.top + b.height / 2)));
      befunde.push(`VERDECKT ${kurz(e)} von ${oben ? kurz(oben) : "nichts"}`);
    }
  });

  // 5. Die letzte Zeile muss sich ueber die Leiste scrollen lassen. 2.4.11 Minimum verlangt nur,
  //    dass ein fokussiertes Element nicht VOELLIG verdeckt ist; hier geht es um Lesbarkeit: Was
  //    am Seitenende liegt, soll sich vollstaendig freischieben lassen.
  const leiste = document.querySelector<HTMLElement>("[aria-label='Hauptnavigation']");
  if (leiste && !unsichtbar(leiste) && getComputedStyle(leiste).position === "fixed" && !document.querySelector("[role='dialog']:not([hidden])")) {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const leisteOben = leiste.getBoundingClientRect().top;
    const letztes = fokussierbar[fokussierbar.length - 1];
    if (letztes) {
      const unten = letztes.getBoundingClientRect().bottom;
      if (unten > leisteOben + 1) befunde.push(`LETZTE ZEILE UNTER LEISTE ${kurz(letztes)} Unterkante ${Math.round(unten)} > Leiste ${Math.round(leisteOben)}`);
    }
  }
  return befunde;
};

for (const v of VORLAGEN) {
  for (const ansicht of ANSICHTEN) {
    for (const breite of BREITEN) {
      for (const groesse of GROESSEN) {
        test(`${v.id} / ${ansicht.name} / ${breite}px / ${groesse}`, async ({ page }, testInfo) => {
          test.skip(testInfo.project.name === "handy", "setzt die Fensterbreite selbst");
          test.skip(testInfo.project.name === "handy-webkit" && !WEBKIT_BREITEN.has(breite), "WebKit: nur Handybreiten");
          await page.setViewportSize({ width: breite, height: 900 });
          await legeInhaltAn(page, v);
          await page.addInitScript(([id, g]) => {
            localStorage.setItem("aussendienst_pwa_onboarding_v1", "1");
            localStorage.setItem("aussendienst_pwa_vorlage_v1", id);
            localStorage.setItem("aussendienst_pwa_a11y", JSON.stringify({ fontSize: g }));
          }, [v.id, groesse]);
          await page.goto(`/?tab=${ansicht.tab}`, { waitUntil: "domcontentloaded" });
          await page.locator("main button").first().waitFor({ state: "attached", timeout: 20_000 });
          for (const klick of ansicht.klicks ?? []) {
            await page.getByRole("button", { name: klick }).first().click();
          }
          if (ansicht.name === "Formular") await page.getByRole("spinbutton").first().waitFor({ state: "visible", timeout: 20_000 });
          await page.getByRole("heading", { name: ansicht.warten }).first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
          // Der CI-Läufer hat keine Segoe UI und weicht auf eine breitere Schrift aus; lokal
          // wäre der Fehler unsichtbar. Verdana misst 408 px, wo der Läufer 412 hat.
          await page.addStyleTag({ content: "*{font-family:Verdana,'DejaVu Sans',sans-serif !important}" });
          await page.waitForTimeout(700);
          const befunde = await page.evaluate(MISS);
          // Maschinenlesbar fuer die Auswertung ueber alle Faelle (siehe DEVLOG).
          for (const b of befunde) console.log(`BEFUND|${v.id}|${ansicht.name}|${breite}|${groesse}|${b}`);
          expect(befunde, `${v.id} / ${ansicht.name} / ${breite}px / ${groesse}`).toEqual([]);
        });
      }
    }
  }
}
