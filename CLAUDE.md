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
npm run lint       # tsc --noEmit — this is the ONLY check; no ESLint config, no test framework
npm run build      # vite build (client) + esbuild bundles server.ts -> dist/server.cjs
npm run start      # node dist/server.cjs — serve the production build
```

**Every push to `main` publishes to production immediately.** `.github/workflows/deploy.yml` runs `npm ci && npm run build` and publishes via `actions/deploy-pages` on every push — verified 2026-08-02: after a plain `git push origin main` (no `npm run deploy`), the workflow finished in ~33s and the live site served assets byte-identical to a local build. Never push work that isn't verified. `npm run deploy` (gh-pages branch) still exists but does not determine what is live — treat it as dead weight.

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

`tsconfig.json` has no `"strict": true`. This is known debt tracked toward 1.0, not a style to imitate — avoid new `any`-typed props where a real type is easy to give.
