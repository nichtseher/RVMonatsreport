/**
 * Einzige Quelle der Wahrheit für die Versionsnummer.
 * Wird zur Bauzeit aus package.json übernommen (siehe vite.config.ts),
 * damit App-Anzeige und package.json nicht auseinanderlaufen können.
 */
export const APP_VERSION: string = __APP_VERSION__;
