import { useState, Dispatch, SetStateAction } from "react";
import type { Aufteilung } from "../utils/schichtStunden";

/**
 * Der Zustand EINES Schicht-Formulars der Stempeluhr: Pause, Aufteilung,
 * eigene Prozent, getippte Stunden und Kommentar.
 *
 * „Ausstempeln" und „Vergessene Schicht nachtragen" brauchen genau denselben
 * Satz Felder -- bis 0.9.78 stand er in `ClockInWidget.tsx` zweimal, als
 * `breakMinutes`/`manualBreakMinutes`, `preset`/`manualPreset` und so weiter
 * (achtzehn `useState`). Jetzt ist es ein Hook, zweimal aufgerufen.
 */
export interface SchichtFormular {
  pause: number;
  setPause: Dispatch<SetStateAction<number>>;
  notiz: string;
  setNotiz: Dispatch<SetStateAction<string>>;
  aufteilung: Aufteilung;
  setAufteilung: Dispatch<SetStateAction<Aufteilung>>;
  eigenProzent: number;
  setEigenProzent: Dispatch<SetStateAction<number>>;
  getipptBuero: string;
  setGetipptBuero: Dispatch<SetStateAction<string>>;
  getipptAussendienst: string;
  setGetipptAussendienst: Dispatch<SetStateAction<string>>;
  /**
   * Beim Öffnen des Formulars: Pause setzen, Kommentar leeren, Aufteilung auf
   * 50/50. Getippte Stunden und eigene Prozent bleiben bewusst stehen --
   * sie werden erst nach dem Buchen zurückgesetzt (`tippenLeeren`).
   */
  oeffnen: (pause: number) => void;
  /** Nach dem Buchen: die getippten Stunden verwerfen. */
  tippenLeeren: () => void;
}

export function useSchichtFormular(): SchichtFormular {
  const [pause, setPause] = useState(30);
  const [notiz, setNotiz] = useState("");
  const [aufteilung, setAufteilung] = useState<Aufteilung>("half");
  const [eigenProzent, setEigenProzent] = useState(50);
  const [getipptBuero, setGetipptBuero] = useState("");
  const [getipptAussendienst, setGetipptAussendienst] = useState("");

  return {
    pause, setPause,
    notiz, setNotiz,
    aufteilung, setAufteilung,
    eigenProzent, setEigenProzent,
    getipptBuero, setGetipptBuero,
    getipptAussendienst, setGetipptAussendienst,
    oeffnen: (neuePause) => {
      setPause(neuePause);
      setNotiz("");
      setAufteilung("half");
    },
    tippenLeeren: () => {
      setGetipptBuero("");
      setGetipptAussendienst("");
    },
  };
}
