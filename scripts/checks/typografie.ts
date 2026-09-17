import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gruppe, pruefe, gleich, wahr } from "../helfer";

/*
  Typografie-Wächter (0.9.47).

  Drei Entscheidungen, die am 2026-09-17 gefallen sind, nachdem die drei
  Achsen aus ROADMAP 0.9.20 neu erhoben wurden. Die Zahlen dort stammten vom
  2026-09-02 und waren nach dem JSX-Umbau in 0.9.42 nicht mehr richtig:
  gemeldet waren sieben Sperrungswerte, davon vier NEGATIVE -- gemessen wurden
  am 2026-09-17 nur noch vier, alle positiv. Die negativen waren mit den
  umgeschriebenen Blöcken verschwunden, ohne dass es jemand bemerkt hat.

  Was blieb, war das Eigentliche:

  1. VERSALIEN (`uppercase`) auf 19 sichtbaren Elementen, durchweg
     Beschriftungen wie "Vorführungen", "Bürozeit", "Meine Sachen".
     Großbuchstaben nehmen dem Wort seine Umrissform -- genau das, woran
     geübte Leser es erkennen. Für blinde Nutzer ist das folgenlos
     (`text-transform` ändert den Text nicht, nur seine Darstellung); es
     trifft ausschließlich die sehbehinderten Kollegen, also die Hälfte der
     Zielgruppe, die tatsächlich liest.

  2. SPERRUNG (`tracking-*`) stand fast überall dort, wo Versalien standen --
     sie ist das übliche Gegenmittel gegen deren enges Wortbild. Ohne
     Versalien ist gesperrter Text nur noch schwerer zu lesen.

  3. ZWEI KLEINE STUFEN, 11 px und 12 px. Ein Pixel Unterschied ist keine
     Stufe, sondern eine Verwechslung. 11 px war zugleich die kleinste
     Schrift der App.

  Warum als Prüfung und nicht als Notiz: Beides sind Klassennamen, die beim
  nächsten neuen Bauteil aus Gewohnheit wieder mitgeschrieben werden. Eine
  Regel, die nur im Konzept steht, wird beim nächsten Umbau übersehen.
*/

const PROJEKT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ENDUNGEN = [".ts", ".tsx", ".css"];

function dateien(verzeichnis: string, treffer: string[] = []): string[] {
  for (const name of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, name);
    if (statSync(pfad).isDirectory()) dateien(pfad, treffer);
    else if (ENDUNGEN.some((e) => name.endsWith(e))) treffer.push(pfad);
  }
  return treffer;
}

const quellen = dateien(join(PROJEKT, "src")).map((pfad) => ({
  name: pfad.slice(PROJEKT.length).replace(/\\/g, "/"),
  text: readFileSync(pfad, "utf8"),
}));

/*
  Gesucht wird ausschliesslich INNERHALB von Klassenlisten, nicht im ganzen
  Quelltext. Der erste Entwurf tat Letzteres und schlug sofort fehl -- an
  seinem eigenen Anlass: Der Kommentar, der erklaert, warum `lowercase`
  entfallen ist, enthaelt das Wort. Eine Pruefung, die ihre eigene Begruendung
  als Verstoss meldet, bringt jeden dazu, die Begruendung zu loeschen.
*/
function klassenlisten(text: string): string[] {
  const raus: string[] = [];
  for (const m of text.matchAll(/className=("|')([^"']*)\1/g)) raus.push(m[2]);
  for (const m of text.matchAll(/className=\{`([^`]*)`\}/g)) raus.push(m[1]);
  // Auch die Klassen, die als Variable zusammengesetzt werden (`const basis = "..."`)
  for (const m of text.matchAll(/(?:class|klasse|Klassen|styles?)\w*\s*=\s*"([^"]*)"/g)) raus.push(m[1]);
  return raus;
}

const klassenJeDatei = quellen.map((q) => ({ name: q.name, klassen: klassenlisten(q.text) }));

gruppe("Typografie");

/*
  Die Gegenprobe zuerst: Eine Suche, die nichts findet, weil sie nichts finden
  KANN, ist keine Messung. Dieses Projekt hat genau so schon einen falschen
  Befund erzeugt (`autocomplete=` gegen JSX, das `autoComplete` schreibt).
*/
pruefe("der Suchlauf erreicht die Oberfläche überhaupt", () => {
  wahr(quellen.length > 20, `nur ${quellen.length} Quelldateien gefunden — falscher Pfad?`);
  const mitKlassen = klassenJeDatei.filter((q) => q.klassen.length > 0).length;
  wahr(mitKlassen > 10, `nur ${mitKlassen} Dateien mit Klassenlisten — Suchmuster falsch?`);
  // Die Gegenprobe zur Gegenprobe: Es muss auch etwas GEFUNDEN werden können.
  const alleKlassen = klassenJeDatei.flatMap((q) => q.klassen).join(" ");
  wahr(alleKlassen.includes("font-black"), "keine einzige Tailwind-Klasse erkannt — Muster falsch?");
});

function verstoesse(muster: RegExp): string[] {
  const treffer: string[] = [];
  for (const q of klassenJeDatei) {
    for (const liste of q.klassen) {
      for (const _ of liste.matchAll(muster)) treffer.push(q.name);
    }
  }
  return [...new Set(treffer)];
}

pruefe("keine Versalien in der Oberfläche", () => {
  gleich(verstoesse(/(^|\s)uppercase(\s|$)/g), [], "diese Dateien setzen wieder Großbuchstaben");
});

/*
  `lowercase` ist hier kein eigener Geschmacksfall, sondern die Folge: Es stand
  an genau einer Stelle, um das `uppercase` der Elternzeile aufzuheben. Bleibt
  es ohne diese Elternzeile stehen, schreibt es deutsche Substantive klein --
  gemessen am 2026-09-17 an "(Bereich anklicken zum Filtern)".
*/
pruefe("keine Umschaltung der Schreibweise überhaupt", () => {
  gleich(
    verstoesse(/(^|\s)(lowercase|capitalize)(\s|$)/g),
    [],
    "diese Dateien ändern wieder die Schreibweise per CSS",
  );
});

pruefe("keine Sperrung in der Oberfläche", () => {
  gleich(verstoesse(/(^|\s)tracking-\S+/g), [], "diese Dateien sperren wieder");
  // Der zweite Weg zur selben Wirkung: eigenes CSS statt Tailwind-Klasse.
  const eigenesCss = quellen.filter((q) => /letter-spacing/.test(q.text)).map((q) => q.name);
  gleich(eigenesCss, [], "diese Dateien sperren über eigenes CSS");
});

pruefe("nur eine kleine Schriftstufe, nicht zwei", () => {
  gleich(verstoesse(/text-\[0\.6875rem\]/g), [], "diese Dateien verwenden wieder 11 px");
});
