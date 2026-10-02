import { useCallback, useEffect, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import { HistoryRecord, Loeschmarken, ReportData, SectionsConfig } from "../types";
import { persistHistory, safeSetItem } from "../utils/speicher";
import { stempeln, stempelNachtragen } from "../utils/zeitstempel";
import { spiegleMonat } from "../utils/archivEintrag";
import { monthHasContent } from "../utils/monatInhalt";
import { darfSchreiben } from "../utils/einFenster";

/**
 * Die Monatsdaten und ihre Speicherung -- der Kern der App.
 *
 * Sechster und letzter Baustein der Aufteilung von `App.tsx` (0.9.14/0.9.15).
 * Bewusst zuletzt: Hier sind in dieser Sitzung ZWEIMAL Daten stillschweigend
 * verschwunden (die Versand-Markierung, siehe utils/archivEintrag.ts).
 *
 * KEINE ANSAGEN HIER. Der Hook meldet ueber `speicherFehler` nur, DASS etwas
 * fehlschlug; `App.tsx` sagt es an. Sonst braeuchte dieser Hook die
 * Sprachausgabe -- die wiederum `reportData` von hier braucht. Diese
 * Ringabhaengigkeit ueber eine Referenz zu umgehen waere im Kern-Datenfluss
 * die falsche Antwort.
 */

/** Drei Ebenen, absichtlich getrennt -- siehe Kommentare unten. */
const SCHLUESSEL_BERICHT = "aussendienst_pwa_data";
const SCHLUESSEL_ARCHIV = "aussendienst_pwa_history";
const SCHLUESSEL_NOTFALL = "aussendienst_pwa_emergency_data";
/** Gelöschte Archivmonate (0.9.72) -- klein, deshalb im Einstellungs-Tier. */
const SCHLUESSEL_GELOESCHTE_MONATE = "aussendienst_pwa_archiv_geloescht_v1";

/** Verzoegerung des Speicherns, damit nicht jeder Tastendruck schreibt. */
const SPEICHER_VERZOEGERUNG_MS = 400;
/**
 * Dieselbe Bremse fuer den Archiv-Spiegel-Effekt darunter -- eigene,
 * groessere Zahl, weil dort das GESAMTE Archiv serialisiert wird, nicht nur
 * der laufende Monat. Bis 0.9.59 hatte dieser Effekt gar keine Verzoegerung:
 * Der Inhalts-Fingerabdruck weiter unten verhindert nur das erneute
 * Schreiben UNVERAENDERTEN Inhalts, nicht das Schreiben bei JEDEM
 * Tastendruck im Notizfeld -- jede neue Zeicheneingabe AENDERT den Inhalt ja
 * tatsaechlich. Gemessen: eine 200 Zeichen lange Notiz erzeugte 200 volle
 * Archiv-Schreibvorgaenge.
 */
const ARCHIV_SPIEGEL_VERZOEGERUNG_MS = 1000;

export type SaveStatus = "saving" | "saved" | "error";
/** Zuletzt abgeschlossener Monat -- Grundlage fuer das Rueckgaengig-Angebot. */
export type MonatsAbschluss = { from: string; to: string } | null;
/** Welche Ebene zuletzt nicht geschrieben werden konnte. */
export type SpeicherFehler = null | "bericht" | "archiv";

export interface BerichtsdatenParameter {
  appFields: SectionsConfig;
  /** Einstieg zeigen? Entscheidet sich beim Laden aus den vorhandenen Daten. */
  setShowOnboarding: (zeigen: boolean) => void;
  onboardingSchluessel: string;
}

export interface Berichtsdaten {
  reportData: ReportData | null;
  setReportData: React.Dispatch<React.SetStateAction<ReportData | null>>;
  history: Record<string, HistoryRecord> | null;
  setHistory: React.Dispatch<
    React.SetStateAction<Record<string, HistoryRecord> | null>
  >;

  saveStatus: SaveStatus;
  lastSavedTime: string;
  /** Treibt das Warnbanner. Wahr, solange EINE der beiden Ebenen klemmt. */
  storageWriteFailed: boolean;
  /**
   * Art des letzten Fehlschlags. Zusammen mit `fehlerZaehler` sagt `App.tsx`
   * ihn an -- der Zaehler ist noetig, weil zwei gleiche Fehlschlaege
   * hintereinander denselben String setzen und ohne ihn kein erneutes Rendern
   * und damit keine zweite Ansage ausloesen wuerden.
   */
  speicherFehler: SpeicherFehler;
  /** Zaehlt jeden Fehlschlag, damit auch der zweite gleiche angesagt wird. */
  fehlerZaehler: number;
  handleHistoryPersistFailure: (context: string, err: unknown) => void;
  /**
   * Das Lesen beim Start ist fehlgeschlagen. `App.tsx` zeigt dann statt des
   * Formulars eine Meldung -- und es wird nichts geschrieben, damit ein
   * vorhandener Bestand nicht ueberschrieben wird.
   */
  ladeFehler: boolean;

  handleValueChange: (id: string, val: number | "") => void;
  /** Zaehler aendern und den neuen Wert sofort zurueckgeben. */
  applyValueDelta: (id: string, delta: number) => number;
  handleValueInput: (id: string, val: number | "") => void;
  /**
   * Name oder Notiz ändern. Setzt den Änderungszeitpunkt des Feldes (0.9.72):
   * Er entscheidet beim Geräteabgleich, welche Fassung gilt.
   */
  handleMetaChange: (key: "name" | "notes", val: string) => void;
  /** Wird bei jeder Eingabe geleert -- siehe handleValueChange. */
  setLastMonthClose: React.Dispatch<React.SetStateAction<MonatsAbschluss>>;
  lastMonthClose: MonatsAbschluss;
  /**
   * Gelöschte Archivmonate (Monat -> Löschzeitpunkt). Ohne sie käme ein
   * gelöschter Monat beim nächsten Abgleich vom anderen Gerät zurück.
   */
  geloeschteMonate: Loeschmarken;
  setGeloeschteMonate: (marken: Loeschmarken) => void;
}

/** Aus localStorage lesen -- ein beschädigter Eintrag darf den Start nicht stören. */
function ladeLoeschmarken(): Loeschmarken {
  try {
    const roh = localStorage.getItem(SCHLUESSEL_GELOESCHTE_MONATE);
    const gelesen = roh ? JSON.parse(roh) : {};
    if (!gelesen || typeof gelesen !== "object" || Array.isArray(gelesen)) return {};
    const aus: Loeschmarken = {};
    for (const [monat, zeit] of Object.entries(gelesen as Record<string, unknown>)) {
      if (typeof zeit === "string") aus[monat] = zeit;
    }
    return aus;
  } catch {
    return {};
  }
}

const aktuellerMonat = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const leererMonat = (monat: string): ReportData => ({
  month: monat,
  name: "",
  notes: "",
  values: {},
  timeLogs: [],
});

export function useBerichtsdaten(p: BerichtsdatenParameter): Berichtsdaten {
  const { appFields, setShowOnboarding, onboardingSchluessel } = p;

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryRecord> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  // Vorbelegt mit der aktuellen Uhrzeit, nicht leer: Die Anzeige "zuletzt
  // gesichert um --:--:--" verunsichert, bevor der erste Speicherlauf lief.
  const [lastSavedTime, setLastSavedTime] = useState<string>(() =>
    new Date().toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );
  /*
    ZWEI EBENEN, ZWEI FLAGGEN.

    Bis 0.9.21 gab es nur eine gemeinsame Flagge. Ein erfolgreicher Schreib-
    vorgang des BERICHTS loeschte damit auch die Warnung ueber ein
    fehlgeschlagenes ARCHIV: Kontingent voll -> das grosse Archivobjekt
    scheitert, Banner erscheint; der Nutzer tippt eine Zahl -> das kleine
    `aussendienst_pwa_data` passt noch -> 400 ms spaeter ist das Banner weg,
    obwohl das Archiv weiterhin ungesichert ist.
  */
  const [berichtFehler, setBerichtFehler] = useState(false);
  const [archivFehler, setArchivFehler] = useState(false);
  const storageWriteFailed = berichtFehler || archivFehler;
  const [speicherFehler, setSpeicherFehler] = useState<SpeicherFehler>(null);
  /*
    Warum ein Zaehler neben der Art des Fehlers steht: `speicherFehler` ist ein
    String. Zweimal hintereinander `setSpeicherFehler("archiv")` setzt denselben
    Wert, React rendert nicht neu, und der Ansage-Effekt in `App.tsx` laeuft
    nicht erneut -- der zweite Fehlversuch blieb also stumm, waehrend der Toast
    daneben Erfolg meldete. Fuer einen blinden Nutzer ist genau das unhoerbar.
  */
  const [fehlerZaehler, setFehlerZaehler] = useState(0);
  const melde = useCallback((art: Exclude<SpeicherFehler, null>) => {
    setSpeicherFehler(art);
    setFehlerZaehler((n) => n + 1);
  }, []);
  const [lastMonthClose, setLastMonthClose] = useState<MonatsAbschluss>(null);
  /**
   * Das Lesen beim Start ist fehlgeschlagen. Solange das gilt, wird NICHTS
   * geschrieben -- siehe die Begruendung im catch-Zweig von `loadData`.
   */
  const [ladeFehler, setLadeFehler] = useState(false);

  const [geloeschteMonate, setGeloeschteMonateIntern] = useState<Loeschmarken>(ladeLoeschmarken);
  const setGeloeschteMonate = useCallback((marken: Loeschmarken) => {
    setGeloeschteMonateIntern(marken);
    safeSetItem(SCHLUESSEL_GELOESCHTE_MONATE, JSON.stringify(marken));
  }, []);

  /*
    Die Notfallkopie gilt NUR, solange der regulaere Stand nicht bestaetigt ist.

    Sie wird beim Wechsel in den Hintergrund geschrieben und wurde bis 0.9.71
    nie verworfen. Nach "Hintergrund, zurueck, weitertippen" stand sie
    deshalb auf dem alten Stand -- und gewann beim naechsten Start gegen den
    neueren der IndexedDB, wenn die Seite ohne Hintergrund-Ereignis endete
    (Absturz, leerer Akku). Nachgestellt am 2026-10-02: Von fuenf Tipps blieb
    einer, und der Start schrieb den alten Stand zurueck.

    `notfallFolge` zaehlt die geschriebenen Kopien. Jede regulaere Speicherung
    merkt sich die Folge beim START und raeumt die Kopie nach dem Erfolg nur
    weg, wenn sich die Folge nicht bewegt hat: Eine Kopie, die NACH dem Start
    dieses Schreibens entstand, ist juenger als das, was jetzt bestaetigt wird.
    Schlaegt das Schreiben fehl, bleibt die Kopie -- dann ist sie die einzige
    Sicherung.
  */
  const notfallFolge = useRef(0);
  const schreibeBericht = useCallback((daten: ReportData): Promise<void> => {
    const start = notfallFolge.current;
    return set(SCHLUESSEL_BERICHT, daten).then(() => {
      if (notfallFolge.current !== start) return;
      try {
        if (localStorage.getItem(SCHLUESSEL_NOTFALL) !== null) {
          localStorage.removeItem(SCHLUESSEL_NOTFALL);
        }
      } catch {
        /* Eine liegengebliebene Kopie ist harmlos, ein Fehler hier nicht der Rede wert. */
      }
    });
  }, []);

  /**
   * Zentrale Reaktion, wenn ein Archiv-Schreibvorgang fehlschlaegt -- z. B.
   * Speicher voll oder IndexedDB durch Browser-Richtlinie blockiert. Ohne
   * diese Rueckmeldung wuesste niemand, dass eine Aenderung nicht gesichert
   * wurde.
   */
  const handleHistoryPersistFailure = useCallback(
    (context: string, err: unknown) => {
      console.error(`Speichern des Archivs fehlgeschlagen (${context})`, err);
      setArchivFehler(true);
      melde("archiv");
    },
    [melde],
  );

  /*
    Der Ladevorgang darf genau einmal laufen.

    Ohne diesen Waechter ruft React im StrictMode den Effekt zweimal auf --
    und die Entwicklungsfassung verhaelt sich dann anders als die
    Produktionsfassung. Aufgefallen am 2026-09-07 beim Prueffall zum
    Lesefehler: Der erste Lauf scheiterte wie gewollt, der zweite gelang, und
    die Fehleransicht stand ueber einem bereits geladenen Zustand. Kein
    Datenverlust, aber zwei verschiedene Wirklichkeiten -- und die Pruefung
    haette dann etwas anderes gemessen als das, was ausgeliefert wird.
  */
  const ladenGestartet = useRef(false);

  // --- Laden ------------------------------------------------------------
  useEffect(() => {
    if (ladenGestartet.current) return;
    ladenGestartet.current = true;

    async function loadData() {
      try {
        const [savedData, savedHistory] = await Promise.all([
          get(SCHLUESSEL_BERICHT),
          get(SCHLUESSEL_ARCHIV),
        ]);

        // Notfallkopie hat Vorrang: Sie ist juenger als der letzte regulaere
        // Schreibvorgang, wenn iOS die Seite mitten im Tippen entladen hat.
        // Nur anwenden, wenn sie WIRKLICH da ist -- dieser Pfad hat schon
        // einmal einen nahezu leeren Stand ueber echte Daten geschrieben.
        const notfall = localStorage.getItem(SCHLUESSEL_NOTFALL);
        let initialData = savedData;
        if (notfall) {
          try {
            const kopie = JSON.parse(notfall);
            /*
              Der Waechter prueft jetzt den INHALT, nicht nur das Vorhandensein.

              Der Kommentar oben sagt seit jeher, dieser Pfad habe "schon
              einmal einen nahezu leeren Stand ueber echte Daten geschrieben".
              Geprueft wurde bis 0.9.21 aber nur, ob der Schluessel existiert
              -- also genau die Bedingung, die den beschriebenen Fall NICHT
              abdeckt. Eine leere Notfallkopie schlug den vollen regulaeren
              Stand.

              Regel: uebernehmen, wenn sie Inhalt hat -- oder wenn der
              regulaere Stand ohnehin keinen hat. Ein leerer Notstand ueber
              echten Daten wird verworfen.
            */
            if (monthHasContent(kopie) || !monthHasContent(savedData)) {
              initialData = kopie;
            } else {
              console.warn("Notfallkopie ohne Inhalt verworfen -- regulaerer Stand ist reicher");
            }
            localStorage.removeItem(SCHLUESSEL_NOTFALL);
          } catch {
            /* unbrauchbare Notfallkopie -- der regulaere Stand gilt */
          }
        }

        const monat = aktuellerMonat();
        if (initialData) {
          if (!initialData.month) initialData.month = monat;
          // Feld-Zeitstempel aus aelteren Staenden nachtragen, solange der
          // Monats-Zeitstempel noch der alte ist (siehe stempelNachtragen).
          initialData.valuesUpdatedAt = stempelNachtragen(
            initialData.values,
            initialData.valuesUpdatedAt,
            savedHistory?.[initialData.month]?.savedAt || new Date(0).toISOString(),
          );
          setReportData(initialData);
        } else {
          setReportData(leererMonat(monat));
        }

        setHistory(savedHistory || {});

        // Einstieg nur bei echter Erstnutzung. Bestehende Nutzer erkennen wir
        // an vorhandenen Daten -- bei ihnen wird die Markierung still gesetzt,
        // damit der Einstieg nicht nachtraeglich aufpoppt.
        const bereitsGesehen = localStorage.getItem(onboardingSchluessel) === "1";
        const hatDaten =
          (savedHistory && Object.keys(savedHistory).length > 0) ||
          (initialData &&
            (initialData.name ||
              (initialData.values &&
                Object.values(initialData.values).some(
                  (v: any) => typeof v === "number" && v > 0,
                ))));
        if (bereitsGesehen || hatDaten) {
          if (!bereitsGesehen) safeSetItem(onboardingSchluessel, "1");
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
        }
      } catch (e) {
        /*
          HIER WIRD BEWUSST NICHTS IN DEN ZUSTAND GESCHRIEBEN.

          Bis 0.9.21 stand hier `setReportData(leererMonat(...))` und
          `setHistory({})`. Beides sieht nach Aufraeumen aus und war in
          Wahrheit ein Loeschbefehl mit Verzoegerung:

          - `{}` ist wahrheitswertig. Der Waechter des Archiv-Spiegels unten
            (`if (!prev) return prev`) prueft auf `null` und lief deshalb
            durch. Die erste getippte Zahl schrieb ein Ein-Monats-Archiv ueber
            den gespeicherten Bestand.
          - Der leere Monat loeste den Speichereffekt aus, der 400 ms spaeter
            `aussendienst_pwa_data` ueberschrieb.

          Gemessen am 2026-09-07 gegen die gebaute App: Archiv mit den Monaten
          2026-06, 2026-07 und 2026-08; eine einzelne lesende Transaktion
          scheitern lassen (schreibende weiter erlaubt -- genau das, was ein
          transienter Lesefehler auf intakter Datenbank bewirkt); EINE Zahl
          eingetippt. Danach enthielt das Archiv nur noch 2026-09. Die App
          zeigte dabei keine einzige Warnung.

          Die Waechter waren also richtig -- dieser Zweig hat sie ausgehebelt.
          `reportData` und `history` bleiben deshalb `null`: Damit greifen der
          Waechter unten, die Bedingung `if (!reportData) return` im
          Speichereffekt und die Notrettung beim Wegwischen von selbst, und
          `App.tsx` zeigt statt des Formulars eine ehrliche Meldung.
        */
        console.error("Failed to load from IDB", e);
        setLadeFehler(true);
        // Im Fehlerfall keinen Einstieg erzwingen -- der Nutzer hat
        // moeglicherweise Daten, die nur gerade nicht lesbar waren.
        setShowOnboarding(false);
      }
    }
    loadData();
    // Absichtlich nur beim Start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Speichern des Berichts (verzoegert) ------------------------------
  useEffect(() => {
    // Ohne geladenen Stand gibt es nichts zu sichern -- und die Anzeige darf
    // dann nicht "wird gesichert" behaupten.
    if (!reportData) return;
    setSaveStatus("saving");
    const t = setTimeout(() => {
      if (!reportData) return;
      // Ein älteres Fenster schreibt nicht mehr (0.9.67, siehe einFenster.ts):
      // Sein Stand ist veraltet und überschriebe die Einträge des neueren.
      if (!darfSchreiben()) return;
      schreibeBericht(reportData)
        .then(() => {
          setSaveStatus("saved");
          setBerichtFehler(false);
          // Nur die eigene Ebene entwarnen. Ob das Archiv geschrieben werden
          // konnte, sagt dieser Erfolg nicht aus.
          setSpeicherFehler((prev) => (prev === "archiv" ? prev : null));
          setLastSavedTime(
            new Date().toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          );
        })
        .catch((err) => {
          // Muss ehrlich angezeigt werden: Ohne diesen Pfad meldete die
          // Anzeige weiterhin "gesichert", obwohl nichts geschrieben wurde.
          console.error("Speichern des Reports fehlgeschlagen", err);
          setSaveStatus("error");
          setBerichtFehler(true);
          melde("bericht");
        });
    }, SPEICHER_VERZOEGERUNG_MS);
    return () => clearTimeout(t);
  }, [reportData, schreibeBericht]);

  // --- Automatisch ins Archiv spiegeln ----------------------------------
  useEffect(() => {
    // Einmal festhalten statt ueberall `reportData?.`: Innerhalb des
    // setHistory-Rueckrufs kann TypeScript die Pruefung oben nicht mehr
    // zuordnen -- und ein `?.` dort legte still einen Archiveintrag unter dem
    // Schluessel "undefined" an.
    const daten = reportData;
    if (!daten?.month) return;

    const t = setTimeout(() => {
      setHistory((prev) => {
        // `null` heisst "Archiv noch nicht geladen". Dann NICHT schreiben: Ein
        // `prev || {}` ersetzte den gespeicherten Bestand durch einen einzelnen
        // Monat.
        if (!prev) return prev;

        /*
          Was geschrieben wird -- und was nicht -- entscheidet `spiegleMonat`
          (utils/archivEintrag.ts), als reine Funktion mit eigener Pruefung:

          - Ohne inhaltliche Aenderung KEIN neues savedAt und kein
            Schreibvorgang. Vorher erzeugte jedes Zusammenfuehren neue Objekte,
            dadurch lief der Live-Abgleich endlos im Dreisekundentakt und schrieb
            dabei ununterbrochen in die IndexedDB (gemessen 2026-08-02).
          - Der Inhaltswaechter (`monthHasContent`) verhindert nur das
            NEUANLEGEN eines leeren Monats. Bis 0.9.71 galt er auch fuer einen
            bestehenden Eintrag: Wer den einzigen Zaehler wieder leerte, liess
            den alten Stand im Archiv stehen.
        */
        const updated = spiegleMonat(prev, daten, appFields, new Date().toISOString());
        if (!updated) return prev;

        // Der Erfolgsfall entwarnt die Archiv-Ebene. Ohne ihn bliebe das Banner
        // stehen, bis die App neu geladen wird -- das Versprechen "bleibt
        // sichtbar, bis ein Speichervorgang wieder klappt" waere dann falsch.
        persistHistory(updated, handleHistoryPersistFailure, "auto-save", () =>
          setArchivFehler(false),
        );
        return updated;
      });
    }, ARCHIV_SPIEGEL_VERZOEGERUNG_MS);
    return () => clearTimeout(t);
  }, [
    reportData?.name,
    reportData?.notes,
    reportData?.values,
    reportData?.valuesUpdatedAt,
    reportData?.nameUpdatedAt,
    reportData?.notesUpdatedAt,
    reportData?.geloeschteSchichten,
    reportData?.month,
    reportData?.timeLogs,
    appFields,
    handleHistoryPersistFailure,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  // --- Notfallspeicherung beim Wegwischen -------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Auch hier nur das aktive Fenster: Genau beim Wechsel in den
      // Hintergrund schrieb ein älteres Fenster sonst seinen alten Stand.
      if (document.visibilityState === "hidden" && reportData && darfSchreiben()) {
        // Synchron in localStorage, damit iOS beim Wegwischen der App nichts
        // abschneidet. try/catch statt safeSetItem: Hier darf kein alert()
        // den Wechsel in den Hintergrund blockieren.
        notfallFolge.current += 1;
        try {
          localStorage.setItem(SCHLUESSEL_NOTFALL, JSON.stringify(reportData));
        } catch (err) {
          console.error("Notfallspeicherung fehlgeschlagen", err);
        }
        // Zusaetzlich der regulaere Weg. Ein Fehler ist hier nicht dramatisch
        // -- die Notfallkopie greift --, gehoert aber in die Konsole. Gelingt
        // er, raeumt `schreibeBericht` die Kopie wieder weg.
        schreibeBericht(reportData).catch((err) =>
          console.error("Sicherung beim Wechsel in den Hintergrund fehlgeschlagen", err),
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [reportData, schreibeBericht]);

  // --- Zaehler aendern ---------------------------------------------------
  const handleValueChange = useCallback((id: string, val: number | "") => {
    // Sobald im neuen Monat gearbeitet wird, ist das Rueckgaengig-Angebot
    // hinfaellig -- ein Ruecksprung wuerde sonst frische Eingaben gefaehrden.
    setLastMonthClose(null);
    setReportData((prev) => {
      // Solange kein Bericht geladen ist, darf eine Eingabe nichts anlegen --
      // sonst entstuende ein Datensatz ohne Monat und Namen.
      if (!prev) return prev;
      return {
        ...prev,
        values: { ...prev.values, [id]: val },
        valuesUpdatedAt: stempeln(prev.valuesUpdatedAt, [id]),
      };
    });
  }, []);

  /**
   * Synchron mitgefuehrter Spiegel der Zaehlerstaende.
   *
   * Grund: Schnelles mehrfaches Tippen darf keine Zaehlung verlieren. Wuerde
   * der neue Wert aus dem React-Zustand gelesen, laese jeder Tipp vor dem
   * naechsten Rendern denselben alten Stand -- "dreimal tippen" ergab +1.
   */
  const valuesRef = useRef<Record<string, number | "">>({});
  useEffect(() => {
    valuesRef.current = reportData?.values || {};
  }, [reportData?.values]);

  const applyValueDelta = useCallback(
    (id: string, delta: number): number => {
      const current =
        typeof valuesRef.current[id] === "number" ? (valuesRef.current[id] as number) : 0;
      const newVal = Math.max(0, parseFloat((current + delta).toFixed(1)));
      const stored: number | "" = newVal === 0 ? "" : newVal;
      valuesRef.current = { ...valuesRef.current, [id]: stored };
      handleValueChange(id, stored);
      return newVal;
    },
    [handleValueChange],
  );

  /** Direkte Eingabe -- Spiegel mitziehen, damit +/- danach stimmt. */
  const handleValueInput = useCallback(
    (id: string, val: number | "") => {
      valuesRef.current = { ...valuesRef.current, [id]: val };
      handleValueChange(id, val);
    },
    [handleValueChange],
  );

  /**
   * Name oder Notiz ändern -- und den Zeitpunkt des Feldes mitschreiben (0.9.72).
   *
   * Ohne ihn entschied beim Geräteabgleich der Zeitstempel des ganzen Monats,
   * und der wandert bei jedem Zähler weiter: Wer am Dienstag nur einen Zähler
   * tippte, löschte damit die Notiz vom Montag -- auf beiden Geräten.
   */
  const handleMetaChange = useCallback(
    (key: "name" | "notes", val: string) => {
      setLastMonthClose(null);
      const zeit = new Date().toISOString();
      setReportData((prev) =>
        prev
          ? {
              ...prev,
              [key]: val,
              ...(key === "name" ? { nameUpdatedAt: zeit } : { notesUpdatedAt: zeit }),
            }
          : prev,
      );
    },
    [],
  );

  return {
    reportData, setReportData,
    history, setHistory,
    saveStatus, lastSavedTime,
    storageWriteFailed, ladeFehler,
    speicherFehler, fehlerZaehler, handleHistoryPersistFailure,
    handleValueChange, applyValueDelta, handleValueInput, handleMetaChange,
    lastMonthClose, setLastMonthClose,
    geloeschteMonate, setGeloeschteMonate,
  };
}
