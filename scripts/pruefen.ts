/**
 * Prüflauf für die Rechenkerne — `npm run check`.
 *
 * Läuft ohne Test-Framework über `tsx`. Der Deploy-Workflow ruft ihn vor dem
 * Bauen auf; schlägt er fehl, wird nichts veröffentlicht.
 */
import "./checks/zeit";
import "./checks/zusammenfuehren";
import "./checks/versand";
import "./checks/archiv-eintrag";
import "./checks/abschluss-check";
import "./checks/zusammenfassung";
import "./checks/zeitstempel";
import "./checks/excel";
import "./checks/vorlage";
import "./checks/sync-import";
import "./checks/backup";
import "./checks/kodierung";
import "./checks/symbole";
import { alleLaufen } from "./helfer";

alleLaufen()
  .then((fehler) => process.exit(fehler === 0 ? 0 : 1))
  .catch((e) => {
    console.error("Prüflauf abgebrochen:", e);
    process.exit(1);
  });
