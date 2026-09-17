import { readFileSync } from "node:fs";
import { gruppe, pruefe, gleich, wahr } from "../helfer";

/*
  Die Erklärung zur Barrierefreiheit steht zweimal (0.9.47):

  - `BARRIEREFREIHEITSERKLAERUNG.md` -- die Fassung fürs Repository, lesbar
    ohne laufende App und verlinkt aus ROADMAP und Konformitätsbericht.
  - `src/components/BarrierefreiheitModal.tsx` -- die Fassung für die Nutzer,
    erreichbar über Optionen.

  Zweimal derselbe Inhalt ist in diesem Projekt sonst ein Fehler (die
  Monatsformatierung stand einmal dreifach da, die Schichttabelle zweimal in
  zwei Bibliotheken). Hier ist es eine bewusste Ausnahme: Das eine Dokument
  gehört ins Repository, das andere in die Hand der Kollegen, und sie haben
  verschiedene Formen.

  Was an einer solchen Ausnahme gefährlich ist, ist nicht die Dopplung, sondern
  das lautlose Auseinanderlaufen: Eine Erklärung, die im Repository etwas
  anderes zusagt als in der App, ist schlimmer als gar keine. Deshalb werden
  hier die TRAGENDEN Angaben verglichen -- die, auf die sich jemand beruft.

  Nicht verglichen wird die Formulierung. Der Text darf in der App kürzer und
  gesprächiger sein; er darf nur nichts anderes behaupten.
*/

const WURZEL = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const md = readFileSync(WURZEL + "/BARRIEREFREIHEITSERKLAERUNG.md", "utf8");
const tsx = readFileSync(WURZEL + "/src/components/BarrierefreiheitModal.tsx", "utf8");

/** Sichtbarer Text der Ansicht -- ohne Klassennamen und ohne Kommentare. */
const sichtbar = tsx
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/className="[^"]*"/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");

gruppe("Erklärung zur Barrierefreiheit");

pruefe("beide Fassungen sind überhaupt lesbar", () => {
  wahr(md.length > 2000, `Markdown-Fassung nur ${md.length} Zeichen — falscher Pfad?`);
  wahr(sichtbar.length > 1500, `Ansicht nur ${sichtbar.length} Zeichen Text — Muster falsch?`);
});

/*
  Die Einordnung entscheidet über den ganzen rechtlichen Teil: Arbeitsmittel
  für Beschäftigte heisst SGB IX und ArbStättV, Dienstleistung hiesse BFSG mit
  Marktüberwachung. Wer sie in einer der beiden Fassungen ändert, muss die
  andere mitziehen.
*/
pruefe("die Einordnung steht in beiden Fassungen gleich", () => {
  for (const [name, text] of [["Markdown", md], ["Ansicht", sichtbar]] as const) {
    wahr(/Arbeitsmittel für Beschäftigte/.test(text), `${name}: Einordnung fehlt`);
    wahr(/§ 164 Abs. 4 SGB IX/.test(text), `${name}: SGB IX fehlt`);
    wahr(/§ 3a Abs. 2\s*ArbStättV/.test(text), `${name}: ArbStättV fehlt`);
    wahr(
      /BFSG|Barrierefreiheitsstärkungsgesetz/.test(text),
      `${name}: die Abgrenzung zum BFSG fehlt`,
    );
  }
});

pruefe("der Stand der Vereinbarkeit steht in beiden Fassungen gleich", () => {
  for (const [name, text] of [["Markdown", md], ["Ansicht", sichtbar]] as const) {
    wahr(/teilweise vereinbar/.test(text), `${name}: der Stand fehlt`);
    wahr(/EN 301 549/.test(text), `${name}: der Maßstab fehlt`);
  }
});

pruefe("der Ansprechpartner steht in beiden Fassungen gleich", () => {
  for (const [name, text] of [["Markdown", md], ["Ansicht", sichtbar]] as const) {
    /*
      Der VOLLE Name, nicht "Marc Petry": Die Korrektur des Projektinhabers
      vom 2026-09-17 ("der Name des Ansprechpartners ist Marc Petry Stramov")
      wuerde ein kuerzeres Muster stillschweigend wieder durchlassen. So
      steht der Name in der Fusszeile der App seit jeher.
    */
    wahr(/Marc Petry Stramov/.test(text), `${name}: Ansprechpartner fehlt oder ist unvollständig`);
    wahr(/§ 181 SGB IX/.test(text), `${name}: der innerbetriebliche Weg fehlt`);
  }
});

/*
  Die drei fehlenden Nachweise sind der Grund für das Wort „teilweise". Fällt
  einer in einer Fassung weg, sagt sie mehr zu als die andere.
*/
pruefe("die drei offenen Nachweise stehen in beiden Fassungen", () => {
  const fehlend: string[] = [];
  for (const [name, text] of [["Markdown", md], ["Ansicht", sichtbar]] as const) {
    if (!/0\.9\.22/.test(text)) fehlend.push(`${name}: Screenreader-Durchlauf (0.9.22)`);
    if (!/TalkBack/.test(text)) fehlend.push(`${name}: TalkBack`);
    // In der App ohne Nummern ausgeschrieben, im Bericht mit -- beides zählt.
    if (!/1\.3\.2|Vorlesereihenfolge/.test(text)) fehlend.push(`${name}: nicht erhobene Kriterien`);
  }
  gleich(fehlend, [], "diese Angaben fehlen");
});

pruefe("die Markdown-Fassung verweist auf die Ansicht in der App", () => {
  wahr(
    /BarrierefreiheitModal\.tsx/.test(md),
    "die Markdown-Fassung nennt die Ansicht nicht — dann findet sie niemand",
  );
  wahr(
    /scripts\/checks\/erklaerung\.ts/.test(md),
    "die Markdown-Fassung nennt diese Prüfung nicht — dann weiß niemand, dass es sie gibt",
  );
});

/*
  Kein Platzhalter darf in die Veröffentlichung geraten. Die erste Fassung vom
  2026-09-17 hatte fünf davon, mit Absicht; sie sind beantwortet, und genau
  deshalb steht diese Prüfung hier: Der nächste Entwurf soll nicht unbemerkt
  live gehen.
*/
pruefe("keine offenen Platzhalter mehr", () => {
  const offen: string[] = [];
  for (const [name, text] of [["Markdown", md], ["Ansicht", sichtbar]] as const) {
    if (/\[[^\]]*eintragen[^\]]*\]/i.test(text)) offen.push(`${name}: eckige Klammer mit „eintragen"`);
    if (/PLATZHALTER|TODO|ENTWURF/.test(text)) offen.push(`${name}: Platzhalter-Wort`);
  }
  gleich(offen, [], "diese Platzhalter stehen noch drin");
});
