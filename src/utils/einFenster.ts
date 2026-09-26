/**
 * Ein Fenster schreibt, nicht zwei (0.9.67).
 *
 * Jedes offene Fenster der App hält den kompletten Stand im Speicher und
 * schreibt ihn bei jeder Änderung ganz in die IndexedDB -- auch beim Wechsel
 * in den Hintergrund. Zwei offene Fenster überschrieben sich dadurch
 * gegenseitig. Gemessen am 2026-09-26 mit zwei Fenstern im selben Browser:
 * Fenster B zählt „Vorführungen Schule/Bildung", gespeichert; danach zählt
 * Fenster A „Vorführungen Arbeitsplatz" -- und ein frisch geöffnetes Fenster
 * kennt nur noch den Eintrag aus A. Der aus B war still verschwunden.
 *
 * Die Regel: Es arbeitet das zuletzt geöffnete Fenster. Ältere Fenster
 * schreiben nichts mehr und zeigen einen Hinweis mit „Hier weiterarbeiten";
 * das lädt neu, liest dabei den aktuellen Stand und übernimmt.
 *
 * Warum localStorage und nicht BroadcastChannel: Die Prüfung vor jedem
 * Schreiben liest den Schlüssel synchron. Ein im Hintergrund eingefrorenes
 * Fenster (iOS friert Seiten ein) verpasst Nachrichten -- einen Wert, den es
 * vor dem Schreiben selbst nachliest, verpasst es nicht. Das `storage`-
 * Ereignis sorgt nur dafür, dass der Hinweis sofort erscheint und nicht erst
 * beim nächsten Schreibversuch.
 */

const SCHLUESSEL = "aussendienst_pwa_aktives_fenster";

const EIGENE_ID = (() => {
  try {
    const zufall = new Uint8Array(8);
    crypto.getRandomValues(zufall);
    return Array.from(zufall, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return String(Math.random()).slice(2);
  }
})();

type Zuhoerer = () => void;
const zuhoerer = new Set<Zuhoerer>();
let aktiv = true;

function liesInhaber(): string | null {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return null;
    const wert = JSON.parse(roh) as { id?: unknown };
    return typeof wert.id === "string" ? wert.id : null;
  } catch {
    return null;
  }
}

function setzeAktiv(neu: boolean) {
  if (neu === aktiv) return;
  aktiv = neu;
  zuhoerer.forEach((z) => z());
}

/** Dieses Fenster zum schreibenden machen (beim Start). */
export function uebernehmen() {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({ id: EIGENE_ID, seit: Date.now() }));
  } catch {
    // Ohne localStorage (privater Modus mit Sperre) gibt es keine
    // Abstimmung -- dann bleibt es beim bisherigen Verhalten.
  }
  setzeAktiv(true);
}

/**
 * Darf dieses Fenster jetzt schreiben? Vor JEDEM Schreibzugriff auf den
 * Bericht, das Archiv und die Notfallkopie zu fragen.
 *
 * Fehlt der Schlüssel (etwa nach „Alle Daten löschen"), nimmt dieses Fenster
 * ihn sich -- sonst schriebe nach dem Leeren niemand mehr.
 */
export function darfSchreiben(): boolean {
  const inhaber = liesInhaber();
  if (inhaber === null) {
    uebernehmen();
    return true;
  }
  const ergebnis = inhaber === EIGENE_ID;
  setzeAktiv(ergebnis);
  return ergebnis;
}

export function abonniereFenster(z: Zuhoerer): () => void {
  zuhoerer.add(z);
  return () => {
    zuhoerer.delete(z);
  };
}

export function istFensterAktiv(): boolean {
  return aktiv;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === SCHLUESSEL || e.key === null) darfSchreiben();
  });
  uebernehmen();
}
