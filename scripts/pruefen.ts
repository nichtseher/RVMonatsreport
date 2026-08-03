/**
 * Prüflauf für die Rechenkerne — `npm run check`.
 *
 * Läuft ohne Test-Framework über `tsx`. Der Deploy-Workflow ruft ihn vor dem
 * Bauen auf; schlägt er fehl, wird nichts veröffentlicht.
 */
import "./checks/zeit";
import "./checks/zusammenfuehren";
import "./checks/excel";
import "./checks/backup";
import "./checks/kodierung";
import { alleLaufen } from "./helfer";

alleLaufen()
  .then((fehler) => process.exit(fehler === 0 ? 0 : 1))
  .catch((e) => {
    console.error("Prüflauf abgebrochen:", e);
    process.exit(1);
  });
