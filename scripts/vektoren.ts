/**
 * Feste Prüfvektoren, die von mehr als einer Prüfung gebraucht werden.
 *
 * `ALT_BLOB` ist eine Sicherungsdatei im ALTEN Format (ohne Kennung, 100.000
 * PBKDF2-Runden), erzeugt mit `encryptData` aus dem Stand 0.9.71, bevor es das
 * Format `RVB2:` gab. Sie darf sich nie ändern: Sie beweist, dass eine
 * Sicherung von heute auch in zehn Fassungen noch lesbar ist. Gebraucht wird sie
 * von `scripts/checks/backup.ts` (reine Funktion, Node) und von
 * `tests/produktion.spec.ts` (gebauter Stand, echte Sicherheitsrichtlinie).
 */
export const ALT_PASSWORT = "AltesPasswort-2026";

export const ALT_KLARTEXT =
  '{"app":"rvmobil","fmt":1,"reportData":{"month":"2026-08","name":"Marc Petry","notes":"Umlaute: äöüß","values":{"vf_schule":4}}}';

export const ALT_BLOB =
  "QTvl9E5NEPhfXH3SZtS8z3xWng0CS9tGIyveMfjCZo9/ir6ZeFs2lwxKYnTlGDPk63uwEgqI6QLMuj0LnHSAYkRUFCDwUQjVFpu+w9GZSL7U11MrIL9sA78ALzPMp56nF8RJvodV2pfN3pAU+LF/geGwq5TG5GLovkpEMjS/SuLextaXMv49sAU/nNKtT4qFl+4EHsHSPfRapml/ZupDubdNA5x2reQKQ+SUOt0Uhg==";
