# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**RV Monatsreport ("RV Mobil")** – a barrier-free (screen-reader-optimized) Progressive Web App that replaces a company-internal Excel monthly report for field-service employees. Product goal: let field staff enter counts, notes, and working time *immediately after an appointment* (mobile-first, no laptop needed) so numbers don't have to be reconstructed from memory at month-end. See `README.md` for the German user-facing feature description.

The UI is German and addresses the user formally ("Sie"). Spoken announcements and help texts are user-facing product surface — write them in that register.

**Non-negotiable constraint: serverless / GDPR ("DSGVO").** All report data lives only in the browser (`localStorage` for settings, IndexedDB via `idb-keyval` for the report + archive). There is no backend API and must not be one — `server.ts` only serves static files and security headers, it never touches user data. Any new feature that would send report data to a server, third-party API, or external font/CDN breaks this constraint. Device-to-device sync intentionally uses only QR codes / copy-paste text codes / WebRTC with `iceServers: []` (no STUN/TURN) — never add a relay/signaling server for sync.

## Commands

```bash
npm install
npm run dev        # tsx server.ts — dev server on http://localhost:3000 (Express + Vite middleware, HMR)
npm run lint       # tsc --noEmit (covers src/, scripts/, tests/); no ESLint config
npm run check      # tsx scripts/pruefen.ts — 142 checks, no test framework
npm run check:ui   # playwright test — 108 UI/a11y checks (starts the dev server itself)
npm run build      # vite build (client) + esbuild bundles server.ts -> dist/server.cjs
npm run start      # node dist/server.cjs — serve the production build
```

`npm run check` covers the pure functions where a mistake does real damage: sync merge (including the per-field timestamps), Excel sum formulas, working-time math across midnight, backup encryption, and a scan of `src/` for double-encoded characters and BOMs. Add cases there rather than writing another throwaway script. `scripts/checks/kodierung.ts` carries an allowlist — `ChangelogModal.tsx` contains mojibake on purpose, as an example in the 0.7.0 entry.

`npm run check:ui` (added 0.9.18) covers what a pure-function check cannot: horizontal overflow at 360 px across all three font sizes, WCAG 2.5.5 target sizes (43.5 px in the tab order, 24 px for what is deliberately outside it), an axe-core pass per view, and — since 2026-09-02 — a `color-contrast` pass per view in each of the three non-default colour schemes. That last axis exists because the plain axe pass runs without `data-theme` and therefore only ever saw the default scheme: the two high-contrast schemes, the ones built for this app's users, were the only part not continuously covered. Set the scheme through `localStorage` as the tests do, never by writing `data-theme` by hand — the app also sets `data-dark`, which drives Tailwind's `dark:` variants, and setting only one produces a combination that never occurs in the running app. It runs **serially on purpose** — with parallel workers, 9 of 30 checks failed erratically because concurrent page loads tore the execution context out from under Vite's on-demand transforms; the same checks passed with one worker. Three device profiles: `handy` (360×780, `hasTouch`, `isMobile`), `schreibtisch` (1280×900) and `handy-webkit` (same 360×780, but WebKit — the engine the colleagues' iPhones actually run). **Measuring by hand at 360 px is not the same as checking the app**: on 2026-09-02 a hand sweep across all five views and three font sizes found nothing, and the gate then found three targets under 44 px in the `schreibtisch` profile on its first run. Do not run `check:ui` while editing files — Playwright reuses a dev server that is already running (`reuseExistingServer`), and a save during the run tears the execution context out of the page. That failure reads as an axe violation and is not one. Note that Playwright's device emulation really does flip `@media (pointer: coarse)` — the ROADMAP long assumed those branches were untestable, which was true only for a resized browser window. `tests/oberflaeche.spec.ts` proves it rather than asserting it.

**axe-core finds a subset of WCAG failures, never all of them.** A green run is not a conformance claim; the NVDA/VoiceOver pass is still what decides 1.0.

The deploy workflow runs `lint`, `check`, `check:ui` and `npm audit` **before** building, so a failure leaves the previous version online. Anything not expressible in those (screen-reader behavior, real devices, camera flows) still has to be verified by hand — see below.

**Every push to `main` publishes to production immediately.** `.github/workflows/deploy.yml` runs `npm ci && npm run build` and publishes via `actions/deploy-pages` on every push — verified 2026-08-02: after a plain `git push origin main` (no `npm run deploy`), the workflow finished in ~33s and the live site served assets byte-identical to a local build. Never push work that isn't verified.

**But a successful push does not guarantee a run was created.** On 2026-08-08 the push of `cc5f2b0` (0.9.8) reported `7aade11..cc5f2b0 main -> main` and no workflow run for that SHA ever appeared — checked against the last 12 runs, the list jumps straight from `7aade11` (0.9.7, 2026-08-03) to `63b11a9` (0.9.9, minutes after the 0.9.8 push). Cause unknown; Actions worked again for the very next push. 0.9.8 only reached production because 0.9.9 is a descendant and carried it along. **Confirm the run exists for the SHA you pushed** rather than assuming the push implies a deploy. `npm run deploy` (gh-pages branch) still exists but does not determine what is live — treat it as dead weight.

**Comparing the live build against a local one only works from a clean install.** The deploy builds from `package-lock.json`; a `node_modules` that has drifted from the lockfile produces different chunk hashes, which looks exactly like a broken deploy and isn't. Run `npm ci` before building the reference. (`npm ci` fails while the dev server is running — stop it first.)

The `gh` CLI is **not** installed here. Confirm a deploy through the public REST API instead, then compare the live bundle filename against `dist/assets/`:
`https://api.github.com/repos/nichtseher/RVMonatsreport/actions/runs?per_page=5`

## Verification expectations

There is no test runner. The project owner's standing rule is that nothing is reported as working until it has actually been exercised — reading the code is not enough.

- **Logic changes** (`src/utils/merge.ts`, date/hours math, crypto): write a throwaway script and run `npx tsx <script>.ts` from the repo root (imports resolve against the project's `node_modules`; a script outside the project will fail). Delete it afterwards.
- **UI changes:** measure in the browser rather than eyeballing — element geometry, contrast, `document.documentElement.scrollWidth` for horizontal overflow. Check at 360 px width and across all three font-size settings (`data-size` = `normal` / `large` / `extra-large`), because rem-based sizing has repeatedly pushed controls off-screen at the larger settings.
- **Anything touching defaults** (`DEFAULT_FIELDS_CONFIG`, initial settings, first-run): verify with `localStorage.clear()` **and** a deleted `keyval-store` IndexedDB, not just a reload — stored state masks the regression.
- **Sync changes:** two browser tabs can be paired for real via the text code (`RVC1:`) path; instrument `RTCDataChannel.prototype.send` to count traffic. Idle should produce **zero** messages.

Two measurement traps in this preview environment, both of which have produced false findings:

- The page renders at a scale factor of ~0.99993, so a 44 px element measures 43.997. Compare touch targets against 43.5, not 44.
- Modals animated with framer-motion stay at their entry state `scale(0.95)`, `opacity: 0` while the browser pane isn't compositing. Everything inside them measures 5 % too small — that is an artifact, not a defect.

## Editing hazards (learned the hard way)

**Never write source files with PowerShell `Set-Content` / `Out-File` / `>` redirection.** On this German Windows setup, PowerShell 5.1 read the UTF-8 file as CP1252 and wrote it back as UTF-8, double-encoding every non-ASCII character and prepending a BOM — it silently destroyed all German umlauts in user-facing strings (`"Anzahl VorfÃ¼hrungen …"`) and all 72 emojis in `DEFAULT_FIELDS_CONFIG`. `tsc` and `vite build` both passed, and browser tests *looked* fine because existing `localStorage` still held the old correct field labels. It shipped to production before anyone noticed.

**The same encoding trap ruins *measurements*, not just writes.** `Get-Content -Raw` (and `Select-String`) read UTF-8 files as ANSI on this machine, so every umlaut and emoji inflates the character count. Comparing a downloaded asset against a local one that way reported bundles as "different sizes, not identical" when they were byte-identical — the pure-ASCII chunk was the only one that "matched", which made the false finding look credible. Read both sides explicitly:
`[System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)` and `[System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray())`.

**A case-sensitive grep against JSX is a measurement, and it lies.** Searching `src/` for `autocomplete=` returns nothing — React writes `autoComplete`. On 2026-09-02 that produced a confident, wrong finding in the conformance report ("no autocomplete attribute exists anywhere"), when both name fields have carried one all along. The same trap waits for `tabindex`/`tabIndex`, `readonly`/`readOnly`, `maxlength`/`maxLength`, `for`/`htmlFor`, `class`/`className`. Search case-insensitively, and treat an empty result as a hypothesis until you have confirmed the search could have matched at all.

**Equally: don't do bulk edits with `node -e "…"` in the Bash tool.** The shell eats backticks and backslashes — template literals and `\s` vanished from `App.tsx` silently, leaving `const fileName = ;`. Write the script to a file and run `node script.js`.

Use the Edit/Write tools for source changes. When a bulk change is genuinely necessary, a file-based Node script with explicit `fs.readFileSync(f,'utf8')` / `writeFileSync(f,s,'utf8')` is the safe path — and have it verify its anchors before writing.

**Long commit messages:** pass them via `git commit -F <file>` (written with the Write tool). PowerShell here-strings mangle multi-line messages containing quotes.

## Architecture

**Single monolithic state container.** `src/App.tsx` (~3500 lines) owns essentially all application state (report data, history/archive, accessibility settings, goals, carryover, quick-entry config, sync handlers, dictation, TTS) via `useState`/`useCallback`, and passes state + handlers down as props to view components in `src/components/`. There is no router — navigation is a single `activeTab` string switched by the bottom nav / sidebar, with each tab's component rendered conditionally at the bottom of `App.tsx`'s JSX. When adding a feature, the handler almost always belongs in `App.tsx` and is threaded down via props, following the existing `handleXxx` naming convention.

**Persistence has two tiers, not one:**
- `localStorage` (via the `safeSetItem` helper in `App.tsx`, which catches `QuotaExceededError`) — small settings: `aussendienst_pwa_fields`, `aussendienst_pwa_a11y`, `aussendienst_pwa_carryover_v2`, `aussendienst_pwa_goals_v2`, `aussendienst_pwa_quick_v1`, compact/comfort-mode flags, clock-in timestamp.
- IndexedDB via `idb-keyval`'s `get`/`set` — the actual report data (`aussendienst_pwa_data`) and the full archive/history (`aussendienst_pwa_history`), loaded async on mount.
- A synchronous `localStorage` "emergency save" (`aussendienst_pwa_emergency_data`) written on `visibilitychange` to survive iOS Safari killing the tab mid-edit; consumed and cleared on the next load. This path once caused data loss (a near-empty state overwriting real data) — don't remove the guard that only applies it when present.

**Every archive write must go through `persistHistory(data, handleHistoryPersistFailure, context)`.** A swallowed `.catch(() => {})` means the UI reports success while the data is gone after the next reload — that exact bug existed twice (backup restore and sync merge) until 0.9.3. The failure handler raises a persistent warning banner and announces it.

**Data model** (`src/types.ts`): `ReportData` (one month's working state) and `HistoryRecord` (archived month, keyed by `"YYYY-MM"`) are structurally similar but distinct — a `HistoryRecord` additionally carries `fieldsSnapshot` (the field config at save time, since custom fields change over time) and `savedAt`. `SectionsConfig` defines four fixed sections (`s1`..`s4`) of `FieldConfig` counters; users can add custom fields to any section. `TimeLog` entries (clock-in/out shifts) live inside `ReportData.timeLogs`.

`monthHasContent()` decides whether a month is worth archiving. **The employee name deliberately does not count** — it is carried over to every new month, so counting it meant every fresh month was archived empty.

### Sync

Two independent transfer modes share one payload shape:

1. **One-shot transfer** — QR chunks (`RV1|<id>|<seq>|<total>|<z|u>|<data>`, `CHUNK_SIZE` in `DeviceSyncModal.tsx`) or an equivalent copy/paste text code (`RVC1:<z|u>:<base64>`), compressed with `CompressionStream`. The receiver chooses "merge" or "replace".
2. **Live connection** — WebRTC `RTCDataChannel`, no ICE servers, paired via an offer/answer exchange sent through the same QR/text-code mechanism. Two codes are structurally unavoidable without a signaling server; see ROADMAP.md before revisiting that.

Code building/parsing lives in `src/utils/syncCode.ts` (not in the modal). A text code is `RVC1:` (compressed + base64, **not encrypted** — anyone holding it can read everything) or `RVC2:` (AES-GCM via the same `crypto.ts` as the backup, password optional and applied at copy time, because PBKDF2 must not run on every keystroke). Pairing codes stay unencrypted on purpose: they carry no report data.

**Everything arriving from outside goes through `pruefeSyncPaket()` (`src/utils/syncSchema.ts`) before it touches state** — sync import (both strategies, including the live channel) and backup restore. Without it, a syntactically valid but structurally wrong packet crashed the app into the ErrorBoundary; that is reproduced as a check case. Payloads carry `app: "rvmobil"`, `fmt: 1`; a missing identifier means "pre-0.9.5" and is still accepted after the structural check. Unknown extra fields are deliberately tolerated so older and newer versions interoperate.

**The live connection belongs to `src/utils/liveSync.ts`, not to the sync window.** It is a module singleton exposed to React through `useSyncExternalStore`; `App.tsx` registers current export/merge callbacks via `registerLiveSyncHandlers` on every relevant state change. Closing the sync screen must not drop an established connection — the whole point is that you leave that screen to enter numbers.

Two subtleties in `liveSync.ts` that look like details and are not:
- `closePeerOnly()` detaches `onclose` / `onconnectionstatechange` **before** closing. Without that, the user's own "Verbindung trennen" fires the connection-lost path and warns them about something they did on purpose.
- `sendNow()` only transmits when the payload text differs from the last one sent. This is what keeps an idle connection silent — see `stableStringify` below.

### Merge semantics (`src/utils/merge.ts`)

`mergeSyncPayload` is idempotent — re-merging the same payload must be a no-op. Per archived month:

- **Counter values merge per field** via `valuesUpdatedAt` (ISO timestamp per field id). Two devices entering *different* categories within the same window both keep their entry; only a conflict on the *same* field is decided by the newer timestamp. Before this (up to 0.9.0) the whole record with the newer `savedAt` won, and one device's entry vanished silently — reproduced twice with two paired instances.
- `savedAt` still decides the non-counter fields (name, notes, `fieldsSnapshot`).
- `TimeLog`s union by `id`; custom field definitions union by id.

**The trap, if you touch this:** a field without its own timestamp falls back to the record's `savedAt` — and that moves forward whenever *any other* field is edited, which hands a stale value a fresh timestamp and reintroduces the bug in subtler form. Missing timestamps are therefore backfilled **once at load time** (`stempelNachtragen` in `App.tsx`, using the stored `savedAt` before it can move), and `mergeValues` always returns a complete timestamp map. This was only caught by testing two live-paired instances; the unit-level checks were all green at the time.

`stableStringify` (`src/utils/stableJson.ts`) exists because change detection compares JSON text. Merging produces new objects whose keys can be ordered differently, so content-identical states looked different and both devices re-sent the full state every 3 seconds forever, writing to IndexedDB each time. Use it for anything whose textual form is compared.

### Shared entry points

- **Excel export** lives solely in `src/utils/excelUtils.ts` (consolidated in 0.9.0 — the form and the archive previously produced *different* files for the same month). `App.tsx` only builds the filename and hands off to `triggerFileDownload`, which returns `"geteilt" | "heruntergeladen" | "abgebrochen"` so each caller can report the outcome honestly (a cancelled share is not an error and must not trigger a download).
- **Sync/backup payload** is built in one place (`buildSyncPayload`, stable-sorted JSON) and restored in one place (`ersetzeGesamtstand`). Both the device sync's "replace" branch and the backup restore use them.
- **Month formatting** is `formatMonthGerman` in `src/utils/dateUtils.ts` — it previously existed three times, including one component that imported it and then shadowed it with a local copy.

**Lazy-loaded screens:** `DeviceSyncModal` and `SecureBackupModal` are `React.lazy` + `Suspense`. They pull in the QR/camera/animation libraries, which nobody needs on first paint — the initial bundle dropped from 288 KB to 130 KB gzipped. Keep new heavy, rarely-opened screens lazy too.

## Accessibility

This is a first-class requirement, not a nice-to-have — the primary users are blind/low-vision field staff using NVDA/JAWS/VoiceOver.

- Route interactive feedback through `announceToAriaAndSpeech(message, immediate?, fieldId?, newValue?)`, which drives both the ARIA live region and optional TTS.
- Buttons need real `aria-label`s. Prefer `aria-pressed` / `aria-expanded` over rendering an "Ein/Aus" badge — screen readers announce state for free and it costs no screen space.
- Audio "click" feedback for counters is centralized in `src/utils/audioFeedback.ts` (Web Audio oscillator tones) — reuse it.
- Modal dialogs need a real focus trap, not just `aria-modal="true"`; browsers do not enforce containment. `ConfirmDialog.tsx` is the reference implementation. Watch the case where initial focus sits on a heading with `tabindex="-1"`: it is in neither the first- nor last-element check, so Shift+Tab escapes into the background.
- Counter buttons use fixed pixel sizes on purpose: they contain icons, not text, so WCAG 1.4.4 does not require them to scale — and rem-based sizing pushed them off-screen at the larger font settings. The number input stays rem-based, because it *is* text.
- Nothing that hides content behind a collapse: it breaks the search and the screen-reader reading order (see ROADMAP.md, "Bewusst NICHT geplant").

## PWA specifics

`public/sw.js` is a hand-written service worker (network-first, same-origin only, no external caching) — it lives in `public/`, it is not generated by a plugin. Manifest shortcuts (`public/manifest.webmanifest`) route via `?tab=` query params read once in `App.tsx`'s `useState` initializer for `activeTab`. Service worker updates are user-confirmed (see the update toast wired up in `index.html`), never auto-reloading mid-edit.

## Documentation to keep current

- **`DEVLOG.md`** — the project owner expects development to be documented there, not only in commit messages. Entries record what was measured, not just what was changed, and state honestly what could not be verified.
- **`ROADMAP.md`** — measured findings and deliberate non-goals. Correct it when a premise turns out to be wrong rather than silently working around it.
- **`ChangelogModal.tsx`** — user-facing, plain language, every version tagged Beta.
- **`HelpModal.tsx` makes concrete factual claims** (keyboard shortcuts, what the time clock fills in automatically, file extensions, what a button does). Four of them had drifted out of date by 0.9.3. When behavior changes, check the help in the same change — a wrong help text produces wrong reports.

## TypeScript

**`tsconfig.json` has `"strict": true` since 0.9.13.** `npm run lint` is exactly that `tsc --noEmit`, so the deploy gate enforces it — no separate step needed.

Two things worth knowing about how it got there:

- **`@types/react` and `@types/react-dom` had never been installed.** Without them every JSX element is `any` and every hook untyped, and because `noImplicitAny` was off, nothing surfaced. `npm run lint` ran green over a codebase where React was effectively unchecked. Installing them immediately produced a real error `tsc` had been waving through: a tooltip written as a `title` *attribute* on an SVG `<circle>`, which does nothing — SVG needs a `<title>` *child element*. Those tooltips had never worked.
- **The measurement before that install was worthless.** Enabling `strict` reported 3022 errors, of which 2883 were just "JSX element implicitly has type any". With the React types present the real number was **57**, all but one in `App.tsx`, mostly null checks. If a similar number ever looks implausibly large, check the types packages first.

**Strict mode does not catch a dropped optional field.** `HistoryRecord` gains a field, somewhere a record is rebuilt by hand without it, and it silently disappears — that is type-correct. It happened twice (`sentAt` in 0.9.12 and again in 0.9.13) and was found by exercising the app, not by the compiler. Archive records are therefore built in exactly one place, `src/utils/archivEintrag.ts`, with a check that asserts every field of `HistoryRecord` is present.

---

## Claude Code Ergänzungsregeln: Effizienz, UI-Design & Architektur-Sicherheit

### 1. Token Economy & Code-Effizienz
- **Surgical Edits:** Lese und überschreibe NIEMALS die gesamte `App.tsx` auf einmal. Nutze ausschließlich gezielte Diffs/Replace-Blöcke für spezifische Zeilen oder fokussierte Anpassungen in `src/components/`.
- **Kompakte Antworten:** Keine Romane, keine langen Einleitungen. Gib nach Code-Änderungen nur eine kurze Bestätigung sowie die nötigen Test-Befehle (z.B. `npm run check`) aus.

### 2. Barrierefreiheit (A11y) & Modernes Design
- **Interaktives Feedback:** Jede Statusänderung muss zwingend über `announceToAriaAndSpeech` zurückgemeldet werden. Ton-Rückmeldungen für Zähler laufen strikt über `src/utils/audioFeedback.ts`.
- **Aria & Semantik:** Verwende `aria-pressed` oder `aria-expanded` anstelle visueller Ein/Aus-Text-Badges. Jedes Bedienelement braucht einen eindeutigen zugänglichen Namen — aber **nicht zwangsläufig ein `aria-label`**. Wo eine sichtbare Beschriftung existiert, ist sie der Name (`<label for>`, Button-Text). Ein `aria-label`, das die sichtbare Beschriftung ersetzt statt sie zu enthalten, verletzt WCAG 2.5.3 (Label in Name) und macht Sprachsteuerung unbedienbar: Der Nutzer sagt, was er liest, und trifft nichts. `aria-label` gehört dorthin, wo nur ein Symbol steht.
- **Tastatur-Fokus:** Modale Dialoge brauchen einen strikten Focus-Trap. Überschriften mit `tabindex="-1"` dürfen den Fokuszyklus nicht unterbrechen. Nutze für die Tastaturbedienung moderne, leuchtende `:focus-visible`-Effekte statt Standard-Outline.
- **Tastatur-Vollständigkeit:** Jede Funktion muss ohne Zeigegerät erreichbar sein. Ein `tabIndex={-1}` ist nur zulässig, wenn dieselbe Funktion über ein anderes, fokussierbares Element erreichbar bleibt — so wie die `±5`-Tasten in `CounterField.tsx`, deren Wirkung über `±1` und das Zahlenfeld vollständig abgedeckt ist. Ohne diese Gleichwertigkeit ist das Ausschließen aus dem Tab-Lauf ein Verstoß gegen 2.1.1, kein Aufräumen.
- **Inhalts-Struktur:** Verstecke absolut keine Inhalte hinter einklappbaren Akkordeons, da dies Screenreader und die Suche bricht. **Diese Regel gewinnt gegen „etablierte UI-Patterns".** Das Akkordeon ist das gängigste Muster für lange Formulare auf dem Handy und hier trotzdem verboten — eingeklappter Inhalt ist für Screenreader-Nutzer nicht erreichbar, und die Suche liefe ins Leere, wenn ein Treffer in einem geschlossenen Bereich liegt (`ROADMAP.md`, „Bewusst NICHT geplant"). Wer Länge reduzieren will, kürzt Inhalt oder trennt Ansichten, er versteckt nicht.
- **UI-Ästhetik:** Nutze klare Kontraste, großzügigen Weißraum, sanfte `border-radius`-Werte, dezente Schatten und serifenlose Schriften. Das UI muss professionell, clean und hochwertig wirken. Die konkreten Mittel dafür stehen in Abschnitt 5 — Ästhetik ist hier keine freie Wahl pro Komponente, sondern die vorhandene Variablenskala.

### 3. Responsive Layout & Skalierung (Cross-Platform)
- **Touch-Ziele — Stufe AAA (Entscheidung vom 2026-09-02):** Bindend ist **WCAG 2.5.5 „Target Size (Enhanced)", also 44 × 44 px**, nicht die 24 px der AA-Stufe 2.5.8. Gemessen wird gegen **43,5 px**, weil die Vorschau mit Faktor 0,99993 rendert und 44 px dort als 43,997 px ankommen. Zähler-Buttons nutzen feste Pixelgrößen (sie enthalten Symbole, keinen Text — WCAG 1.4.4 verlangt für sie keine Skalierung, und `rem` schob sie bei „Extra groß" bis zu 163 px aus dem Bildschirm). Das Zahlenfeld bleibt `rem`-basiert, weil es Text **ist**. Die Ausnahme in 2.5.5 für gleichwertig erreichbare Bedienelemente darf genutzt werden, muss aber im Code begründet stehen. **Status (2026-09-02): für alles im Tab-Lauf erfüllt und im Prüfgate abgesichert; die `±5`-Tasten laufen unter der Ausnahme** — siehe Nachtrag unten.
- **Überprüfung & Breakpoints:** Teste Layouts immer bei 360 px Breite und über alle drei Schriftgrößen (`normal`, `large`, `extra-large`). Es darf NIEMALS ein horizontaler Scrollbar entstehen.
- **Mobile Anpassung:** Nutze CSS Safe-Area-Insets (Padding für Notches/Home-Bars auf iOS/Android). Verwende CSS-Grid/Flexbox für eine saubere Darstellung vom Smartphone bis zum Mac-Desktop.

### 4. Datenarchitektur, Offline-First & Datensicherheit
- **Kein Backend:** Es gibt keine Server-Datenbank und darf keine geben. Alles bleibt im Browser (IndexedDB/localStorage).
- **Offline-First ist Pflicht, nicht Ausstattung:** Service Worker und lokale Speicherung sind zwingend. Der SW ist handgeschrieben (`public/sw.js`, network-first, ausschließlich same-origin) und wird **nicht** von einem Plugin generiert — kein `vite-plugin-pwa`, kein Precaching fremder Herkunft. Updates werden vom Nutzer bestätigt (Toast in `index.html`), niemals mitten in der Dateneingabe erzwungen. Berichtsdaten liegen in IndexedDB (`idb-keyval`), Einstellungen in `localStorage`; die synchrone Notrettung `aussendienst_pwa_emergency_data` bleibt bestehen, inklusive der Wächterbedingung, die einen fast leeren Stand nicht über echte Daten schreibt.
- **Archiv-Schreibschutz:** Schreibzugriffe aufs Archiv laufen ausnahmslos über `persistHistory(data, handleHistoryPersistFailure, context)`. Keine verschluckten `.catch(() => {})` Fehler.
- **Sync-Validierung:** Alle extern eingehenden Daten (QR, Backup, Sync) passieren zwingend `pruefeSyncPaket()`, bevor sie den State berühren.
- **Merge-Logik:** Zusammenführungen (`merge.ts`) müssen pro Feld zwingend den Zeitstempel `valuesUpdatedAt` berücksichtigen, um Datenverlust zu vermeiden.
- **Deploy-Gefahr:** Jeder Push auf `main` geht sofort auf GitHub Pages live. Vorher MÜSSEN `npm run check` und `npm run lint` lokal fehlerfrei durchlaufen.

### 5. Styling-Architektur: Tailwind UND Theme-Variablen (Entscheidung vom 2026-09-02)

Der gefundene Framework-Standard ist **Tailwind v4** (`@tailwindcss/vite`,
`@import "tailwindcss"` in `src/index.css`). Er gilt aber nicht überall. Die
Aufteilung ist verbindlich, weil die Alternative gemessene Kontrastfehler
erzeugt hat:

- **Tailwind-Utilities für Layout, Abstände, Flex/Grid, Typo-Größen.** Das ist
  der Standard, der zu nutzen ist. Kein eigenes Layout-CSS daneben.
- **Farben ausschließlich über Theme-Variablen** (`var(--accent)`,
  `var(--danger-text)` …), **niemals** über die Tailwind-Palette
  (`bg-slate-800`, `text-amber-800`). Palettenklassen ignorieren die
  Theme-Wahl der App: Im Theme „Gelb auf Schwarz" lagen dadurch 51 von 141
  Textelementen unter dem Mindestkontrast, der schlechteste bei 1,05:1.
  0.9.9/0.9.10 haben alle 278 verbliebenen Stellen ersetzt. Übrig sind genau
  drei, alle in der Theme-Vorschau von `A11yModal` — sie sollen zeigen, wie
  ein Design aussieht, und dürfen den Variablen deshalb nicht folgen.
- **Radien und Schatten über `--rv-radius-*` / `--rv-shadow-*`.** Das Präfix
  ist Pflicht, kein Stilmittel: In Tailwind 4 **sind** `--radius-*` und
  `--shadow-*` die Theme-Variablen hinter `rounded-*` und `shadow-*`. Ohne
  Präfix definiert man nicht daneben, sondern überschreibt die komplette
  Skala — gemessen sprang `rounded-xl` damit app-weit von 12 px auf 24 px.
- **`dark:` folgt `[data-dark="true"]`, nicht `prefers-color-scheme`**
  (`@custom-variant` in `src/index.css`). Sonst richtet sich die Variante nach
  dem Betriebssystem statt nach der Wahl in der App; gemessene Folge: fast
  schwarze Schrift auf dunkler Karte, 1,18:1.
- **Die Neutralisierungsschicht aus `!important` bleibt entfernt.** Sie stand
  bis 0.9.10 in `index.css` (rund 90 Selektoren), wirkte nur in den
  Hochkontrast-Themes und erfasste `bg-white` nicht — beides Lücken, durch die
  reale Fehler geschlüpft sind. Farbprobleme gehören an die Wurzel, nicht in
  eine Deckschicht.
- **Keine externen Schriften.** Systemschriftstapel in `@theme`; Google Fonts
  o. Ä. brechen die DSGVO-Zusage.

### 6. Vorgehensweise: erst denken, dann Code — und dann messen

- **Sequential Thinking vor jeder Code-Ausgabe** (Entscheidung vom
  2026-09-02). Der Server ist in `.mcp.json` konfiguriert. Verpflichtend
  insbesondere bei Offline-Logik, Merge-/Sync-Semantik, Zeitrechnung über
  Mitternacht und Krypto.
- **Denken ersetzt keine Messung.** Die ältere Standing Rule bleibt
  übergeordnet: Nichts gilt als funktionierend, bevor es ausgeführt wurde. Ein
  durchdachter Plan ist kein Nachweis. Der Nachweis ist `npx tsx <script>.ts`,
  `npm run check`, `npm run check:ui` oder eine Messung im Browser.
- **Verhältnis zu Abschnitt 1:** Das Durchdenken kostet Token, das ist
  eingepreist. Die Sparsamkeit aus Abschnitt 1 betrifft das Lesen und
  Schreiben von Dateien (chirurgische Edits statt Volltext-Rewrites) und die
  Länge der Antworten — nicht die Gründlichkeit vor dem Schreiben.

### Nachtrag zu den Trefferflächen (Messung 2026-08-08, korrigiert 2026-09-02)

Der Stand bis 0.9.19 war die AA-Stufe. Die Messung dazu lautete:

| | |
|---|---|
| Verfügbare Breite der Bedienzeile | 253,9 px |
| Bedarf für fünf Tasten à 44 px | 276,0 px |
| Bedarf des Zahlenfelds für „999" bei 30 px Schrift | ~55 px |

Daraus folgte 0.9.7: Fünferschritte schrumpfen, Zeile und Zahlenlesbarkeit
bleiben. Mit der Entscheidung vom 2026-09-02 auf **Stufe AAA (2.5.5, 44 px)**
gilt das nicht mehr als Zielzustand. Beim Nachlesen im Code sind dabei zwei
Angaben dieses Nachtrags als **falsch** aufgefallen — sie stehen hier, damit
niemand erneut darauf plant:

- **Es gibt zwei Zweige, und der Nachtrag las sich wie einer.**
  `CounterField.tsx` kennt `isCompact`. Standard ist der **Komfortzweig**
  (`aussendienst_pwa_compact` ist per Default nicht gesetzt): Fünferschritte
  `w-[48px] min-w-[40px]`, primäre Tasten `w-[64px] min-w-[52px]`. Der
  kompakte Zweig ist kleiner (36 px bzw. 44 px). Die 40 px des alten Nachtrags
  beschrieben also den Standardzweig korrekt — die Messung bestätigt exakt
  40,0 px bei „Extra groß". Falsch war nur, sie als feste Größe zu lesen: Es
  ist eine `min-width`, die erst bei „Extra groß" überhaupt greift. Bei
  „Normal" sind dieselben Tasten 46,3 px breit.
- **„Zahl verkleinern" ist als Weg bereits ausgeschöpft.** Das Zahlenfeld
  steht auf `min-w-[56px] max-w-[72px]`; unter 56 px geht es heute nicht, und
  die Schrift darin muss nach WCAG 1.4.4 mitwachsen.

**Gemessen am 2026-09-02** (360 px, Standardlayout, alle drei Schriftgrößen,
fünf Ansichten). Die Überschlagsrechnung, die zunächst hier stand, war in zwei
Punkten falsch, und beide Male zeigte erst die Messung es:

- **Im Handy-Profil lag kein einziges fokussierbares Element unter 43,5 px.**
  Allein das Formular hat 93 davon, das kleinste misst 44 px. Die Annahme, die
  Zählertasten seien die offene Baustelle, war damit falsch.
  **Aber die Messung war es auch:** Sie lief nur bei 360 px. Das verschärfte
  Prüfgate fand im **Schreibtisch-Profil** sofort drei Verstöße, die ihr
  entgangen waren — die beiden Reiter der Zeit-Ansicht mit 287 × 38 px und
  „Jahreskonto-Einstellungen bearbeiten" mit 540 × 42 px. Wer bei 360 px misst,
  hat *eine* Breite geprüft, nicht die App. Alle drei sind mit
  `min-h-[44px]` behoben.
- **Die Bedienzeile stand bei „Extra groß" 2,1 px über** (253,9 px verfügbar,
  256,0 px belegt), und alle fünf Elemente lagen bereits auf ihrer
  `min-width`. Unsichtbar, weil die Seite nicht seitwärts scrollte — aber
  ohne Reserve: Der nächste Zusatz in dieser Zeile hätte abgeschnitten.

**Was daraufhin geändert wurde** — der Innenabstand der Zählerkarte von 10 auf
6 px. Die 8 px kommen aus dem Weißraum, nicht aus einer Trefferfläche, und
sind vollständig in die Tasten geflossen:

| | vorher → nachher | „Groß" | „Normal" |
|---|---|---|---|
| Zeilenbreite bei „Extra groß" | 253,9 → **260,0 px** | 274,0 | 288,0 |
| Überstand | +2,1 → **0** | 0 | 0 |
| `±1` | 52,0 → **53,6 px** | 57,7 | 61,7 |
| `±5` | 40,0 → **40,4 px** | 43,3 | 46,3 |

**Die `±5`-Tasten bleiben unter 44 px** (bei „Normal" mit 46,3 px nicht) und
laufen unter der **Gleichwertigkeitsausnahme in 2.5.5**: Sie sind
`tabIndex={-1}` und `aria-hidden`, ihre Funktion ist über `±1` und das
Zahlenfeld vollständig erreichbar, beide deutlich über 44 px. Die Begründung
steht im Quelltext an der Stelle selbst (`CounterField.tsx`), nicht nur hier —
eine Ausnahme, die man nur im Konzept findet, wird beim nächsten Umbau
übersehen.

Sie zu vergrößern wäre möglich, aber ein schlechter Tausch: Bei „Extra groß"
sind 44 px dort nur zu haben, indem `±1` von 53,6 auf rund 45 px schrumpft —
die wichtigste Taste zugunsten der unwichtigsten, ausgerechnet in der
Schriftgröße für sehbehinderte Nutzer.

**Das Prüfgate zieht jetzt mit.** `tests/oberflaeche.spec.ts` prüft zwei
Klassen: 43,5 px für alles im Tab-Lauf, 24 px für das, was per `aria-hidden` /
`tabIndex={-1}` außerhalb liegt. Vorher stand dort pauschal 24 px — also die
AA-Stufe im Test gegen die 44 px im Dokument. Genau dieser Widerspruch hat die
Entscheidung ausgelöst; er darf nicht als Nächstes andersherum entstehen.
