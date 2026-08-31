/**
 * Schutz der lokal gespeicherten Berichtsdaten.
 *
 * Befund vom 2026-08-31: `navigator.storage.persist()` wurde in diesem Projekt
 * nie aufgerufen. Damit lag das Archiv in "best effort"-Speicher, den der
 * Browser jederzeit räumen darf:
 *
 *  - iOS/Safari löscht bei Seiten, die NICHT zum Home-Bildschirm hinzugefügt
 *    wurden, den gesamten skriptbeschreibbaren Speicher nach sieben Tagen ohne
 *    Nutzung — IndexedDB, localStorage und Cache zusammen.
 *  - Chrome räumt bei Speicherdruck auf.
 *
 * Für eine App, in der jemand direkt nach einem Termin Zahlen erfasst und
 * danach zwei Wochen keinen Termin hat, ist das der Fehler mit dem größten
 * Schaden: ein kompletter Monat weg, ohne dass jemand etwas falsch gemacht hat.
 *
 * Drei Lücken verstärkten sich dabei gegenseitig — kein `persist()`, keine
 * Sicherungs-Erinnerung (die vorhandene Erinnerung am 8. betrifft die *Abgabe*
 * an die VL), und der Geräte-Sync als Rettungsweg ist genau der, den die
 * blinden Kollegen nicht bedienen können.
 *
 * Die Beurteilungen sind reine Funktionen, damit sie prüfbar sind
 * (scripts/checks/speicher-schutz.ts). Nur `ermittleLage` fasst den Browser an.
 */

import { get } from "idb-keyval";
import { PAKET_APP, PAKET_FORMAT } from "./syncSchema";

/** Was der Browser über den Speicherzustand hergibt. */
export interface SpeicherLage {
  /** Kennt der Browser die StorageManager-Schnittstelle überhaupt? */
  unterstuetzt: boolean;
  /** Hat der Browser den Speicher als dauerhaft bestätigt? */
  dauerhaft: boolean;
  /** Läuft die App als installierte PWA (Home-Bildschirm / eigenes Fenster)? */
  installiert: boolean;
  /** WebKit (iOS/iPadOS) — dort ist die Sieben-Tage-Regel scharf. */
  webkit: boolean;
}

export type SpeicherStufe = "sicher" | "gefaehrdet" | "kritisch" | "unbekannt";

export interface SpeicherUrteil {
  stufe: SpeicherStufe;
  /** Kurzform für das Warnband. */
  kurz: string;
  /** Vollsatz für Screenreader und Sprachausgabe. */
  ansage: string;
  /** Die konkrete Handlung, die hilft — oder null, wenn nichts zu tun ist. */
  rat: string | null;
}

/**
 * Beurteilt die Speicherlage.
 *
 * Die Abstufung ist bewusst nicht symmetrisch: "kritisch" bekommt nur der Fall,
 * in dem ein Datenverlust nach dokumentierter Browser-Regel *eintreten wird*,
 * wenn nichts geschieht — nicht der Fall, in dem er eintreten *kann*. Sonst
 * stumpft die Warnung ab und wird weggeklickt.
 */
export function beurteileSpeicher(lage: SpeicherLage): SpeicherUrteil {
  if (lage.dauerhaft) {
    return {
      stufe: "sicher",
      kurz: "Speicher dauerhaft",
      ansage: "Ihre Daten sind auf diesem Gerät dauerhaft gespeichert.",
      rat: null,
    };
  }

  if (!lage.unterstuetzt) {
    return {
      stufe: "unbekannt",
      kurz: "Speicherzustand unbekannt",
      ansage:
        "Dieser Browser gibt keine Auskunft darüber, ob Ihre Daten dauerhaft gespeichert sind.",
      rat: "Bitte erstellen Sie regelmäßig eine Datensicherung.",
    };
  }

  // Der eine Fall, in dem der Verlust nach dokumentierter Regel kommt und nicht
  // bloß möglich ist.
  if (lage.webkit && !lage.installiert) {
    return {
      stufe: "kritisch",
      kurz: "Daten können nach 7 Tagen gelöscht werden",
      ansage:
        "Achtung: Der Browser löscht Ihre Berichtsdaten, wenn Sie die App sieben Tage lang nicht öffnen.",
      rat: "Bitte fügen Sie RV Mobil über das Teilen-Menü zum Home-Bildschirm hinzu. Danach bleiben die Daten erhalten.",
    };
  }

  return {
    stufe: "gefaehrdet",
    kurz: "Speicher nicht als dauerhaft bestätigt",
    ansage:
      "Der Browser hat den Speicher nicht als dauerhaft bestätigt. Ihre Daten können bei Speichermangel gelöscht werden.",
    rat: lage.installiert
      ? "Bitte erstellen Sie regelmäßig eine Datensicherung."
      : "Fügen Sie RV Mobil zum Home-Bildschirm hinzu und erstellen Sie regelmäßig eine Datensicherung.",
  };
}

/* ------------------------------------------------------------------ */
/* Sicherungs-Erinnerung                                               */
/* ------------------------------------------------------------------ */

export const SCHLUESSEL_LETZTE_SICHERUNG = "aussendienst_pwa_letzte_sicherung";

/**
 * Nach wie vielen Tagen ohne Sicherung erinnert wird.
 *
 * Vierzehn Tage, nicht dreißig: Der Bericht ist monatlich, ein Verlust kurz vor
 * Monatsende trifft also fast den gesamten Monat. Und nicht sieben, weil die
 * Erinnerung sonst bei normaler Nutzung fast wöchentlich käme und ignoriert
 * würde.
 */
export const SICHERUNG_FAELLIG_NACH_TAGEN = 14;

export interface SicherungsUrteil {
  faellig: boolean;
  /** Tage seit der letzten Sicherung, oder null wenn noch nie gesichert. */
  tage: number | null;
  /** Vollsatz für Screenreader und Sprachausgabe, leer wenn nicht fällig. */
  ansage: string;
}

/**
 * Ist eine Datensicherung fällig?
 *
 * `hatInhalt` verhindert, dass eine frische Installation ohne einen einzigen
 * Eintrag zur Sicherung auffordert — dieselbe Überlegung wie bei
 * `monthHasContent`.
 */
export function beurteileSicherung(
  letzteISO: string | null,
  jetzt: Date,
  hatInhalt: boolean,
): SicherungsUrteil {
  if (!hatInhalt) {
    return { faellig: false, tage: null, ansage: "" };
  }

  if (!letzteISO) {
    return {
      faellig: true,
      tage: null,
      ansage:
        "Sie haben noch nie eine Datensicherung erstellt. Bitte sichern Sie Ihre Daten, damit sie bei einem Geräteverlust nicht verloren sind.",
    };
  }

  const letzte = new Date(letzteISO);
  if (Number.isNaN(letzte.getTime())) {
    // Unbrauchbarer Wert im Speicher: wie "noch nie gesichert" behandeln,
    // nicht wie "gerade eben" -- ein Fehler darf nicht zur Entwarnung führen.
    return {
      faellig: true,
      tage: null,
      ansage:
        "Der Zeitpunkt der letzten Datensicherung ist nicht lesbar. Bitte erstellen Sie eine neue Sicherung.",
    };
  }

  const tage = Math.floor((jetzt.getTime() - letzte.getTime()) / 86400000);

  if (tage < SICHERUNG_FAELLIG_NACH_TAGEN) {
    return { faellig: false, tage, ansage: "" };
  }

  return {
    faellig: true,
    tage,
    ansage: `Ihre letzte Datensicherung ist ${tage} Tage her. Bitte erstellen Sie eine neue Sicherung.`,
  };
}

/**
 * Nach einer erfolgreich erstellten Sicherung aufrufen.
 *
 * Bewusst still im Fehlerfall: Ein volles Kontingent darf nicht dazu führen,
 * dass die gerade erstellte Sicherung als gescheitert erscheint. Der Preis ist
 * eine Erinnerung zu viel — nie eine zu wenig.
 */
export function merkeSicherung(zeitpunkt: Date = new Date()): void {
  try {
    localStorage.setItem(SCHLUESSEL_LETZTE_SICHERUNG, zeitpunkt.toISOString());
  } catch (err) {
    console.error("Zeitpunkt der Sicherung konnte nicht gemerkt werden", err);
  }
}

/** Zeitpunkt der letzten Sicherung als ISO-Text, oder null. */
export function leseLetzteSicherung(): string | null {
  try {
    return localStorage.getItem(SCHLUESSEL_LETZTE_SICHERUNG);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Browser-Zugriffe                                                    */
/* ------------------------------------------------------------------ */

/**
 * Rettungspaket direkt aus dem Speicher bauen — ohne React.
 *
 * Für den Absturz-Bildschirm gedacht: Dort ist der Programmzustand
 * möglicherweise beschädigt, die Daten in IndexedDB sind es meistens nicht. Bis
 * 0.9.16 bot dieser Bildschirm als einzigen Ausweg das Löschen aller Daten an —
 * und für einen blinden Nutzer war das die einzige erreichbare Taste.
 *
 * Das Ergebnis hat bewusst dieselbe Form wie eine normale Datensicherung, damit
 * es sich über „Backup einspielen" zurückholen lässt. Eine Rettungsdatei, die
 * niemand wieder einlesen kann, wäre keine.
 *
 * Jeder Einzelwert wird für sich abgesichert: Ist ausgerechnet der Teil kaputt,
 * der den Absturz ausgelöst hat, sollen die übrigen trotzdem in die Datei.
 */
export async function baueRettungsPaket(): Promise<string> {
  // `get` ist bewusst statisch importiert: Auf dem Absturz-Bildschirm darf die
  // Rettung nicht daran scheitern, dass ein nachzuladendes Teilstück fehlt.
  const ausIdb = async (schluessel: string): Promise<unknown> => {
    try {
      return await get(schluessel);
    } catch (err) {
      console.error(`Rettung: ${schluessel} nicht lesbar`, err);
      return undefined;
    }
  };

  const ausLocal = (schluessel: string): unknown => {
    try {
      const roh = localStorage.getItem(schluessel);
      return roh ? JSON.parse(roh) : undefined;
    } catch (err) {
      console.error(`Rettung: ${schluessel} nicht lesbar`, err);
      return undefined;
    }
  };

  return JSON.stringify(
    {
      app: PAKET_APP,
      fmt: PAKET_FORMAT,
      appFields: ausLocal("aussendienst_pwa_fields"),
      carryover: ausLocal("aussendienst_pwa_carryover_v2"),
      history: await ausIdb("aussendienst_pwa_history"),
      reportData: await ausIdb("aussendienst_pwa_data"),
      // Reiner Hinweis für den Menschen, der die Datei später ansieht. Die
      // Struktur-Prüfung toleriert unbekannte Zusatzfelder ausdrücklich.
      gerettetAm: new Date().toISOString(),
    },
    null,
    2,
  );
}

/**
 * Rettungspaket als Datei anbieten.
 *
 * Erst `navigator.share`, dann der Download-Link — und zwar in dieser
 * Reihenfolge aus einem bestimmten Grund: `a.download` speichert auf iOS-Safari
 * häufig nicht, sondern öffnet die Datei nur in einem Reiter. Das ist
 * ausgerechnet die Plattform, für die diese Rettung gedacht ist (dort greift
 * die Sieben-Tage-Regel). Über das Teilen-Blatt landet die Datei dagegen
 * zuverlässig in "Dateien", einer Mail oder wo der Nutzer sie haben will.
 *
 * Ein abgebrochenes Teilen (AbortError) faellt bewusst auf den Download
 * zurueck, statt zu scheitern: Auf dem Absturz-Bildschirm zaehlt nur, dass die
 * Daten irgendwo ankommen.
 */
export async function ladeRettungsPaketHerunter(): Promise<string> {
  const inhalt = await baueRettungsPaket();
  const name = `rvmobil_rettung_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  const blob = new Blob([inhalt], { type: "application/json" });

  try {
    const datei = new File([blob], name, { type: "application/json" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [datei] })) {
      await navigator.share({ title: "RV Mobil — gerettete Daten", files: [datei] });
      merkeSicherung();
      return name;
    }
  } catch (err) {
    // Auch ein Abbruch landet hier. Weiter zum Download, nicht aufgeben.
    console.error("Teilen der Rettungsdatei nicht möglich, versuche Download", err);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  merkeSicherung();
  return name;
}

/** Läuft die App als installierte PWA? */
export function istInstalliert(): boolean {
  if (typeof window === "undefined") return false;
  // `standalone` ist die ältere, iOS-eigene Angabe und fehlt in den Typen.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  const displayModus =
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches);
  return iosStandalone || displayModus;
}

/**
 * WebKit auf iOS/iPadOS erkennen.
 *
 * Nicht über "Safari" im User-Agent: Auf iOS ist *jeder* Browser WebKit, auch
 * Chrome und Firefox — und für alle gilt dieselbe Sieben-Tage-Regel. Geprüft
 * wird deshalb die Plattform, nicht die Browser-Marke. iPadOS meldet sich seit
 * Version 13 als "Macintosh"; der Zusatz `maxTouchPoints` fängt das ab.
 */
export function istWebkitMobil(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
}

/**
 * Dauerhaften Speicher anfordern und die Lage zurückmelden.
 *
 * `persist()` fragt in Chrome nicht nach, sondern entscheidet anhand der
 * Nutzungsintensität; Firefox zeigt eine Rückfrage; WebKit gewährt es an
 * installierte Web-Apps. Ein "nein" ist deshalb kein Fehler, sondern eine
 * Information — und genau die fehlte bisher.
 */
export async function sichereSpeicher(): Promise<SpeicherLage> {
  const installiert = istInstalliert();
  const webkit = istWebkitMobil();

  if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.persisted) {
    return { unterstuetzt: false, dauerhaft: false, installiert, webkit };
  }

  try {
    let dauerhaft = await navigator.storage.persisted();
    if (!dauerhaft && typeof navigator.storage.persist === "function") {
      dauerhaft = await navigator.storage.persist();
    }
    return { unterstuetzt: true, dauerhaft, installiert, webkit };
  } catch (err) {
    // Manche Browser werfen im privaten Modus. Kein Grund abzustürzen -- aber
    // auch kein Grund zur Entwarnung.
    console.error("Speicherzustand konnte nicht ermittelt werden", err);
    return { unterstuetzt: false, dauerhaft: false, installiert, webkit };
  }
}
