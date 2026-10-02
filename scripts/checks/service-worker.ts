import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { gruppe, pruefe, gleich, wahr } from "../helfer";

/*
  Der Service Worker ist handgeschrieben (public/sw.js) und lag bis 0.9.72 ohne
  jede Pruefung da. Hier wird er in einer Sandbox ausgefuehrt, mit einem
  nachgebildeten Cache-Speicher -- geprueft wird, was nur im Betrieb auffaellt:

  - Der Cache wuchs mit jeder veroeffentlichten Fassung, weil nichts je eine
    alte Build-Datei entfernte (Name fest, Dateien mit Hash).
  - `caches.match(...) || caches.match(...)`: ein Versprechen ist immer wahr,
    die zweite Alternative lief nie.
*/

type Anfrage = { url: string; mode?: string };
type Antwort = { status: number; type: string; clone: () => Antwort; url?: string };

function baueUmgebung() {
  const speicher = new Map<string, Map<string, Antwort>>();
  const handler: Record<string, (e: unknown) => void> = {};
  const holeCache = (name: string) => {
    if (!speicher.has(name)) speicher.set(name, new Map());
    const eintraege = speicher.get(name)!;
    return {
      add: async (url: string) => void eintraege.set(new URL(url, "https://x.test/app/").href, antwort()),
      put: async (a: Anfrage, r: Antwort) => void eintraege.set(a.url, r),
      keys: async () => [...eintraege.keys()].map((url) => ({ url })),
      delete: async (a: Anfrage) => eintraege.delete(a.url),
    };
  };
  const caches = {
    open: async (name: string) => holeCache(name),
    keys: async () => [...speicher.keys()],
    delete: async (name: string) => speicher.delete(name),
    match: async (a: Anfrage | string) => {
      const url = typeof a === "string" ? new URL(a, "https://x.test/app/").href : a.url;
      for (const eintraege of speicher.values()) if (eintraege.has(url)) return eintraege.get(url);
      return undefined;
    },
  };
  const antwort = (): Antwort => {
    const a: Antwort = { status: 200, type: "basic", clone: () => a };
    return a;
  };
  let netzOffen = true;
  const sandbox: Record<string, unknown> = {
    self: {
      addEventListener: (typ: string, fn: (e: unknown) => void) => void (handler[typ] = fn),
      location: { origin: "https://x.test" },
      skipWaiting: () => undefined,
      clients: { claim: async () => undefined },
    },
    caches,
    fetch: async () => {
      if (!netzOffen) throw new TypeError("offline");
      return antwort();
    },
    URL,
    console,
    Promise,
    clients: {},
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(fileURLToPath(new URL("../../public/sw.js", import.meta.url)), "utf8"), sandbox);

  const pause = () => new Promise((r) => setTimeout(r, 15));
  return {
    speicher,
    setzeNetz: (offen: boolean) => (netzOffen = offen),
    async hole(url: string, mode = "no-cors") {
      let ergebnis: unknown;
      handler.fetch({
        request: { url, mode },
        respondWith: (p: Promise<unknown>) => void (ergebnis = p),
        waitUntil: () => undefined,
      });
      const wert = await ergebnis;
      await pause();
      return wert;
    },
    async aktiviere() {
      let p: Promise<unknown> = Promise.resolve();
      handler.activate({ waitUntil: (x: Promise<unknown>) => void (p = x) });
      await p;
    },
    schluessel: (cacheName: string) =>
      [...(speicher.get(cacheName)?.keys() ?? [])].map((u) => u.replace("https://x.test/app/", "")),
  };
}

const NAME = (() => {
  const quelle = readFileSync(fileURLToPath(new URL("../../public/sw.js", import.meta.url)), "utf8");
  return /const CACHE_NAME = '([^']+)'/.exec(quelle)?.[1] ?? "";
})();

gruppe("Service Worker: Cache");

pruefe("eine neue Fassung ersetzt die alte Datei desselben Namens", async () => {
  const u = baueUmgebung();
  await u.hole("https://x.test/app/assets/index-AAAAAAAA.js");
  await u.hole("https://x.test/app/assets/index-BBBBBBBB.js");
  gleich(u.schluessel(NAME), ["assets/index-BBBBBBBB.js"]);
});

pruefe("andere Dateien bleiben unangetastet (anderer Name, andere Art)", async () => {
  const u = baueUmgebung();
  await u.hole("https://x.test/app/assets/index-AAAAAAAA.js");
  await u.hole("https://x.test/app/assets/index-AAAAAAAA.css");
  await u.hole("https://x.test/app/assets/HelpModal-CCCCCCCC.js");
  await u.hole("https://x.test/app/assets/index-BBBBBBBB.js");
  gleich(u.schluessel(NAME).sort(), [
    "assets/HelpModal-CCCCCCCC.js",
    "assets/index-AAAAAAAA.css",
    "assets/index-BBBBBBBB.js",
  ]);
});

pruefe("Namen mit Bindestrich und Punkt werden richtig zerlegt", async () => {
  const u = baueUmgebung();
  await u.hole("https://x.test/app/assets/file-spreadsheet-D8LPlWzf.js");
  await u.hole("https://x.test/app/assets/exceljs.min-Dft8uXRS.js");
  await u.hole("https://x.test/app/assets/exceljs.min-Eft9uXRT.js");
  gleich(u.schluessel(NAME).sort(), ["assets/exceljs.min-Eft9uXRT.js", "assets/file-spreadsheet-D8LPlWzf.js"]);
});

pruefe("die Schale (index.html, Manifest) wird nicht angefasst", async () => {
  const u = baueUmgebung();
  await u.hole("https://x.test/app/index.html");
  await u.hole("https://x.test/app/manifest.webmanifest");
  await u.hole("https://x.test/app/assets/index-AAAAAAAA.js");
  gleich(u.schluessel(NAME).length, 3);
});

pruefe("aktivieren löscht Caches mit anderem Namen -- auch den der Vorfassung", async () => {
  const u = baueUmgebung();
  u.speicher.set("rv-report-v5", new Map([["https://x.test/app/assets/index-OLD00000.js", { status: 200, type: "basic", clone() { return this; } }]]));
  await u.hole("https://x.test/app/assets/index-AAAAAAAA.js");
  await u.aktiviere();
  gleich([...u.speicher.keys()], [NAME]);
  wahr(NAME !== "rv-report-v5", "Der Cache-Name ist unverändert -- die angesammelten Dateien blieben liegen");
});

gruppe("Service Worker: Offline-Rückfall");

pruefe("offline wird die Startseite aus dem Cache geliefert", async () => {
  const u = baueUmgebung();
  await u.hole("https://x.test/app/index.html");
  u.setzeNetz(false);
  const a = (await u.hole("https://x.test/app/?tab=time", "navigate")) as Antwort | undefined;
  wahr(!!a, "keine Antwort offline");
});

pruefe("offline ohne index.html fällt auf den Stamm zurück (vorher lief diese Alternative nie)", async () => {
  const u = baueUmgebung();
  // Nur "./" liegt im Cache, nicht "./index.html".
  u.speicher.set(NAME, new Map([["https://x.test/app/", { status: 200, type: "basic", clone() { return this; } }]]));
  u.setzeNetz(false);
  const a = (await u.hole("https://x.test/app/?tab=time", "navigate")) as Antwort | undefined;
  wahr(!!a, "Der Rückfall auf './' hat nichts geliefert");
});
