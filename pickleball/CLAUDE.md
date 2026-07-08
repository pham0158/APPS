# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then production build
- `npm run lint` — run ESLint over the whole repo
- `npm run preview` — preview the production build locally

There is no test suite configured in this repo.

## Architecture

This is a single-page app (Vite + React 19 + TypeScript, no router) for running pickleball round-robin tournaments across multiple groups/locations, backed directly by Firestore (no backend server).

**Entry point:** `src/main.tsx` renders `src/App.tsx`. All application logic — state, UI components, Firestore calls, tournament generation — lives in this one file (~1,470 lines). There is no component-splitting into separate files for the live app.

**This `pickleball/` directory is a subdirectory of a larger monorepo** (repo root is one level up, at `~/Documents/ClaudeCode/APPS`, remote `pham0158/APPS`), which also contains `soniq/`, `brainquest/`, etc. Deployment is CI-driven, not something you run locally — see `.github/workflows/deploy.yml` at the monorepo root. On every push to `main`, that workflow copies each of `src/AppV1.tsx`, `src/AppV2.tsx`, `src/AppV3.tsx` over `src/App.tsx` in turn (and also builds `App.tsx` as-is, unmodified, for QA), rewriting `vite.config.ts`'s `base` each time, and builds/publishes each result to its own path under https://gogreenvue.com/ via GitHub Pages (custom domain, `CNAME` at repo root):
- `pickleball-qa/` — builds whatever is currently committed in `src/App.tsx` (i.e. in-progress/dev code), built *first* before it gets overwritten by the steps below
- `pickleball/` and `pickleball-v3/` — both build from `src/AppV3.tsx` (current stable)
- `pickleball-v2/` — builds from `src/AppV2.tsx`
- `pickleball-v1/` — builds from `src/AppV1.tsx`

So **`AppV1.tsx`/`AppV2.tsx`/`AppV3.tsx` are NOT dead code** — each is a live, independently deployed version. Don't delete or freely edit them thinking they're unused; edit `App.tsx` when you mean "advance the next version to be promoted," and only touch `AppVn.tsx` snapshots when deliberately changing what that specific historical/QA route serves. All pickleball routes are checked every 30 min by `.github/workflows/monitor.yml`. All versions share the same Firestore collections (`pb3_groups`, `pb3_history`, `pb3_feedback`) and the same Firebase project — there is no per-environment data separation between prod and QA/dev.

### Firestore as the only backend

- Firebase config and client init are inline at the top of `App.tsx` (project `gogreenvue-afd10`). There is no `firebase.json`/hosting config in this repo — deployment/hosting is managed outside the repo.
- Collections used by the live version: `pb3_groups` (one doc per group, containing its players array and embedded `tournament` state) and `pb3_history` (one doc per completed/saved tournament). Everything is real-time via `onSnapshot`; writes are full-document `setDoc` overwrites (read-modify-write on the client), not partial updates — when adding a field, make sure every write site that does `{...selectedGroup, ...}` / `{...group, ...}` still includes it.
- Feedback (`FeedbackModal`) writes to a `pb3_feedback` collection *and* separately fires an EmailJS request (config constants `EMAILJS_*` at the top of the file) so submissions also land in an inbox — both paths are independent; a Firestore failure doesn't block the email attempt or vice versa.
- A private group's password is a `simpleHash` (non-cryptographic, obfuscation only) stored as `passwordHash` on the group doc; unlocking a group writes to `sessionStorage` (`pw_ok_<groupId>`) rather than anything server-side, so it does not persist across browser sessions/devices.

### Tournament / round generation model

- `Group` is the top-level entity (name, location, color, courts, players, optional password, optional per-group `colorMode`, optional embedded `tournament`).
- `generateRounds()` builds the full schedule up front for a group (min 10 rounds, or `n-1` if `n` is even), assigning courts via `bestCourtFromPool()`, which brute-forces all 4-player subsets/team splits from a candidate pool and scores them against running `partnerCount`/`opponentCount` maps to minimize repeat partnerships/opponents. Sit-outs are chosen by least-times-sat-out (`sitCounts`), ties broken randomly.
- Once a round is generated it is static; ad-hoc "next game" for a finished court is handled separately via `generateSubRound()` + `handleRegenerate()` in `TournamentView`, which builds `partnerCount`/`opponentCount` from *all* completed games so far (`buildPairHistory`) — including prior sub-rounds — before generating the next matchup for that court. Sub-rounds are stored on the parent `Round.subRounds[]` and scored in a separate `subScores` map keyed by the sub-round's own `id` (not by round/court index like main scores, which use the `${roundIdx}-${courtIdx}` key convention — code branches on `key.startsWith("r")` to tell the two apart).
- `computeLeaderboard()` derives wins/points/played purely from `scores`/`subScores` + the round data — there is no separately persisted stats object, so leaderboard correctness depends on every score-mutation path staying in sync with this function's expectations (parses `s1`/`s2` as ints, only counts a court once `done` is true).
- Ending a tournament (`endTournament`) snapshots the current group+scores into a new `pb3_history` doc and resets the group's embedded `tournament` back to its empty/unstarted shape — it does not delete anything, so historical data lives independently of the live group state from that point on.

### Theming / accessibility

- `THEMES` defines three full color palettes (`normal`, `deuteranopia`, `highcontrast`) plus matching `GROUP_COLORS_*` arrays used for per-group color swatches. The active palette is read from a **module-level mutable variable `C`** (not React context) — it's reassigned on every render of `App()` (global mode from `localStorage`, or a per-group override via `Group.colorMode` when set to something other than `"normal"`) before any JSX referencing `C.*` is evaluated. All UI subcomponents (`Btn`, `CourtCard`, `TournamentView`, etc.) read `C` at render time rather than receiving it as a prop, so if you refactor rendering to be async/deferred or move code across renders, `C` must already reflect the correct mode before that render happens.
