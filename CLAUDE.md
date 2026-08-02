# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**RV Monatsreport ("RV Mobil")** – a barrier-free (screen-reader-optimized) Progressive Web App that replaces a company-internal Excel monthly report for field-service employees. Product goal: let field staff enter counts, notes, and working time *immediately after an appointment* (mobile-first, no laptop needed) so numbers don't have to be reconstructed from memory at month-end. See `README.md` for the German user-facing feature description.

**Non-negotiable constraint: serverless / GDPR ("DSGVO").** All report data lives only in the browser (`localStorage` for settings, IndexedDB via `idb-keyval` for the report + archive). There is no backend API and must not be one — `server.ts` only serves static files and security headers, it never touches user data. Any new feature that would send report data to a server, third-party API, or external font/CDN breaks this constraint. Device-to-device sync intentionally uses only QR codes / copy-paste text codes / WebRTC with `iceServers: []` (no STUN/TURN) — never add a relay/signaling server for sync.

## Commands

```bash
npm install
npm run dev        # tsx server.ts — dev server on http://localhost:3000 (Express + Vite middleware, HMR)
npm run lint        # tsc --noEmit — this is the ONLY check; there is no ESLint config and no test framework
npm run build       # vite build (client) + esbuild bundles server.ts -> dist/server.cjs
npm run start        # node dist/server.cjs — serve the production build
npm run deploy       # predeploy runs build, then gh-pages -d dist publishes to the gh-pages branch
```

**The GitHub Actions workflow is the authoritative deploy path — verified 2026-08-02.** `.github/workflows/deploy.yml` runs `npm install && npm run build` and publishes via `actions/deploy-pages` on **every push to `main`**. Proven by hash comparison: after a plain `git push origin main` (no `npm run deploy`), the workflow finished in ~45s and https://nichtseher.github.io/RVMonatsreport/ served exactly the locally built bundle filename. **Every push to `main` publishes to production immediately** — never push work that isn't verified. `npm run deploy` (gh-pages branch) still exists but does not determine what is live; treat it as dead weight.

Workflow status is queryable without a token (public repo), which is how deploys get confirmed here — the `gh` CLI is *not* installed on this machine:
`https://api.github.com/repos/nichtseher/RVMonatsreport/actions/runs?per_page=5`

There are no unit/integration tests in this repo. When validating logic changes (e.g. to `src/utils/merge.ts`), write a throwaway script and run it with `npx tsx <script>.ts` rather than expecting a test runner.

`npm run deploy` publishes straight to production (https://nichtseher.github.io/RVMonatsreport/) — only run it when asked to ship, and prefer running `npm run lint` and `npm run build` first.

## Editing rules (learned the hard way)

**Never write source files with PowerShell `Set-Content` / `Out-File` / `>` redirection.** On this German Windows setup, PowerShell 5.1 read the UTF-8 file as CP1252 and wrote it back as UTF-8, double-encoding every non-ASCII character and prepending a BOM — it silently destroyed all German umlauts in user-facing strings (`"Anzahl VorfÃ¼hrungen …"`) and all 72 emojis in `DEFAULT_FIELDS_CONFIG`. `tsc` and `vite build` both passed, and browser tests *looked* fine because existing `localStorage` still held the old correct field labels — only a genuinely new user (empty storage) would have seen the damage. It shipped to production before it was caught. Use the Edit/Write tools for source changes; if a bulk change is unavoidable, use `node -e` with explicit `fs.readFileSync(f,'utf8')`/`writeFileSync(f,s,'utf8')`.

**Corollary for testing:** when a change touches defaults (`DEFAULT_FIELDS_CONFIG`, initial settings, first-run behavior), verify with `localStorage.clear()` **and** a cleared IndexedDB (`keyval-store`), not just a reload — otherwise stored state masks the regression.

## Architecture

**Single monolithic state container.** `src/App.tsx` (~3000 lines) owns essentially all application state (report data, history/archive, accessibility settings, goals, carryover, quick-entry config, sync handlers, dictation, TTS) via `useState`/`useCallback`, and passes state + handlers down as props to view components in `src/components/`. There is no router — navigation is a single `activeTab` string switched by the bottom nav / sidebar, with each tab's component rendered conditionally at the bottom of `App.tsx`'s JSX. When adding a feature, the handler almost always belongs in `App.tsx` and is threaded down via props, following the existing `handleXxx` naming convention.

**Persistence has two tiers, not one:**
- `localStorage` (via the `safeSetItem` helper in `App.tsx`, which catches `QuotaExceededError`) — small settings: `aussendienst_pwa_fields`, `aussendienst_pwa_a11y`, `aussendienst_pwa_carryover_v2`, `aussendienst_pwa_goals_v2`, `aussendienst_pwa_quick_v1`, compact/comfort-mode flags, clock-in timestamp.
- IndexedDB via `idb-keyval`'s `get`/`set` — the actual report data (`aussendienst_pwa_data`) and the full archive/history (`aussendienst_pwa_history`), loaded async on mount.
- There's also a synchronous `localStorage` "emergency save" (`aussendienst_pwa_emergency_data`) written on `visibilitychange` to survive iOS Safari killing the tab mid-edit; it's consumed and cleared on the next load. Be careful here — this path has previously caused a data-loss bug (a near-empty state overwriting real data); don't remove the guard that only applies it when present.

**Data model** (`src/types.ts`): `ReportData` (one month's working state) and `HistoryRecord` (archived month, keyed by `"YYYY-MM"` in the `history` record) are structurally similar but distinct types — a `HistoryRecord` additionally carries `fieldsSnapshot` (the field config at the time it was saved, since custom fields can change over time) and `savedAt`. `SectionsConfig` defines four fixed sections (`s1`..`s4`) of `FieldConfig` counters; users can add custom fields to any section. `TimeLog` entries (clock-in/out shifts) live inside `ReportData.timeLogs`.

**Sync architecture** (`src/components/DeviceSyncModal.tsx` + `src/utils/merge.ts`) has two independent transfer modes sharing one payload format:
1. One-shot transfer: QR chunks (protocol `RV1|<id>|<seq>|<total>|<z|u>|<data>`) or an equivalent copy/paste text code (`RVC1:<z|u>:<base64>`), compressed with `CompressionStream`. Receiver chooses "merge" or "replace".
2. Live connection: WebRTC `RTCDataChannel` with **no ICE servers** (LAN-only, no external service), paired via an offer/answer exchange transmitted through the same QR/text-code mechanism. Once connected, both sides re-send their full state every few seconds and merge on receipt — this is deliberately simple (send-everything, not a CRDT/diff protocol); don't assume incremental sync.

Both paths funnel into `mergeSyncPayload` (`src/utils/merge.ts`), which is last-write-wins per archived month (by `savedAt`), unions `TimeLog`s by `id`, unions custom fields, and is idempotent — re-merging the same payload must be a no-op. Any change to the sync payload shape must stay compatible with this merge function and with the QR chunk size limits (`CHUNK_SIZE` in `DeviceSyncModal.tsx`).

**Excel export** lives solely in `src/utils/excelUtils.ts` (consolidated in 0.9.0 — the form and the archive previously produced *different* files for the same month). `App.tsx`'s `handleExportExcel` / `handleExportTimeLogsExcel` only build the filename and hand off to `triggerFileDownload`, which returns `"geteilt" | "heruntergeladen" | "abgebrochen"` so each caller can report the outcome honestly.

**Sync/backup payload** is built in one place too (`buildSyncPayload`, stable-sorted JSON) and restored in one place (`ersetzeGesamtstand`); both the device sync's "replace" branch and the backup restore go through them. Archive writes must go through `persistHistory(..., handleHistoryPersistFailure, context)` — a swallowed `.catch(() => {})` there means the UI reports success while the data is gone after the next reload (fixed in 0.9.3 for exactly those two paths).

**Lazy-loaded screens:** `DeviceSyncModal` and `SecureBackupModal` are `React.lazy` + `Suspense` (0.9.3). They pull in the QR/camera/animation libraries, which nobody needs on first paint — the initial bundle dropped from 288 KB to 129 KB gzipped. Keep new heavy, rarely-opened screens lazy too.

**Accessibility is a first-class requirement, not a nice-to-have** — the primary users are blind/low-vision field staff using NVDA/JAWS/VoiceOver. Every interactive change should go through the existing `announceToAriaAndSpeech(message, immediate?, fieldId?, newValue?)` pattern (drives both the ARIA live region and optional TTS via `SpeechSynthesisUtterance`), and buttons need real `aria-label`s. Audio "click" feedback for counters is centralized in `src/utils/audioFeedback.ts` (Web Audio oscillator tones) — reuse it rather than duplicating tone logic.

**PWA specifics:** `public/sw.js` is a hand-written service worker (network-first, same-origin only, no external caching) — code lives in `public/`, not generated by a plugin. Manifest shortcuts (`public/manifest.webmanifest`) route via `?tab=` query params read once in `App.tsx`'s `useState` initializer for `activeTab`. Service worker updates are user-confirmed (see the update toast wired up in `index.html`), never auto-reload mid-edit.

**TypeScript is configured loosely** (`tsconfig.json` has no `"strict": true`) — this is known technical debt (tracked toward a future 1.0), not a style choice to imitate; avoid introducing new `any`-typed props where a real type is easy to give, since strict mode will eventually be turned on.
