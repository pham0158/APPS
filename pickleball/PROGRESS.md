# Pickleball RRA — Progress Log

## Phase 0 — QA deployment plumbing (2026-07-08)

**Goal:** Get an exact copy of production v3 live at `https://gogreenvue.com/pickleball-qa/`, sharing the same Firestore collections, so v4 work can happen without touching production.

**What was found:** The deploy pipeline is not per-app — this `pickleball/` directory is a subdirectory of a monorepo (root `~/Documents/ClaudeCode/APPS`, remote `pham0158/APPS`, also containing `soniq/`, `brainquest/`). A single workflow, `.github/workflows/deploy.yml` at the monorepo root, runs on every push to `main` and builds the pickleball app **five times** from the same `pickleball/` source, swapping which `AppVn.tsx` file gets copied over `src/App.tsx` and rewriting `vite.config.ts`'s `base` before each build:

| Route | Source copied to `App.tsx` |
|---|---|
| `pickleball-qa/` | none — builds `App.tsx` as committed, first, before it's overwritten |
| `pickleball/` | `AppV3.tsx` |
| `pickleball-v3/` | `AppV3.tsx` |
| `pickleball-v2/` | `AppV2.tsx` |
| `pickleball-v1/` | `AppV1.tsx` |

Output goes to `deploy/<route>/`, and the whole `deploy/` tree is published to the `gh-pages` branch (`peaceiris/actions-gh-pages`), served under the custom domain via the root `CNAME` file (`gogreenvue.com`).

**Outcome: no plumbing changes were needed.** The `pickleball-qa/` target already exists and is already live — confirmed via `curl` (200 OK) and by diffing the built JS asset hash in `origin/gh-pages` (`index-DQB5Y2mM.js` is byte-identical across `pickleball-qa/`, `pickleball/`, and `pickleball-v3/`, since `src/App.tsx` currently equals `AppV3.tsx`). It's also already covered by the 30-minute route health check in `.github/workflows/monitor.yml`.

Since QA already builds straight from `src/App.tsx`, **v4 work starts by just editing `App.tsx` directly** — no branch, flag, or separate source tree needed. The next push to `main` will rebuild `pickleball-qa/` with those changes while `pickleball-v3/`/`pickleball/` stay frozen on `AppV3.tsx`.

**Gotchas / things to know before Phase 1:**
- **Firestore is not environment-separated.** Every version (`AppV1`–`V3`, and therefore QA once it diverges) points at the same Firebase project (`gogreenvue-afd10`) and the same collection names (`pb3_groups`, `pb3_history`, `pb3_feedback`) hardcoded in the source. Testing in QA writes to the *same* groups/tournaments/history production sees — there is no isolated QA dataset. If Phase 1 (match history persistence) changes the schema, that change is live for production immediately on next deploy, not just QA.
- **"Promoting" QA to production is a manual copy**, not a merge/flag flip: once v4 in `App.tsx` is ready to become the new stable, the workflow's "Pickleball stable"/`pickleball-v3` steps need `AppV3.tsx` replaced with the new `App.tsx` content (or the workflow edited) — there's no automatic promotion path today.
- Every push to `main` rebuilds *all* apps in the monorepo (pickleball, soniq, brainquest), not just pickleball — a broken pickleball build fails the whole `deploy.yml` run and can block soniq/brainquest deploys too (they run as separate steps in the same job).
- `CLAUDE.md` was corrected this phase — it previously (incorrectly) described `AppV1.tsx`/`AppV2.tsx` as dead code, missing the fact that the monorepo CI actively builds and serves them at `pickleball-v1/`/`pickleball-v2/`.

**Next step:** Phase 1 — match history persistence, built directly in `src/App.tsx` (live at `pickleball-qa/` once pushed), leaving `AppV3.tsx`/production untouched.

## Phase 1 — match-record schema + persistence (2026-07-08)

**Goal:** Persist a permanent, per-match record (round #, court #, teams, score, timestamp) every time a score is submitted, as the foundation for a future match-by-match History tab. No UI built yet — schema and write path only, so the data can be verified directly in the Firestore console first.

**What changed (`src/App.tsx` only, additive):**
- New `MatchRecord` interface: `{ key, roundNum, courtNum, team1 (player ids), team2 (player ids), s1, s2, submittedAt (ISO), isSubRound, subLabel? }`.
- `TournamentState.matches?: Record<string, MatchRecord>` — a new optional field alongside the existing `scores`/`subScores` maps, keyed the *same way* as those (`` `${roundIdx}-${courtIdx}` `` for main courts, `sub.id` for sub-rounds/"Next Game"). Same key convention was chosen deliberately so a score edit-and-resubmit (`editScore` → `submitScore`) upserts the existing match record in place instead of creating a duplicate.
- `SavedTournament.matches: Record<string, MatchRecord>` — copied from the live tournament's `matches` when a tournament ends (`endTournament`), so completed tournaments in `pb3_history` carry their full match list forward, not just the scores map.
- `submitScore` in `TournamentView` now builds a `MatchRecord` (looking up the round/court from `t.rounds`, or the matching sub-round via `t.rounds.flatMap(r=>r.subRounds||[])`) and writes it into `matches` in the same `setDoc` call that marks the score `done` — so a match record and its score are always written atomically, never one without the other.
- `saveState` takes a new optional 5th param (`nm`, the matches map) and defaults to the current `matches` state when omitted, so the call sites that don't touch matches (`goRound`, `handleRegenerate`, `editScore`) don't need changes.
- `startTournament` and the tournament-reset branch of `endTournament` both initialize `matches:{}` explicitly for new/cleared tournament state.

**Backward compatibility:** `matches` is optional on `TournamentState` and read with `t.matches||{}` fallbacks everywhere, so groups with tournaments already in progress (written before this change, with no `matches` field) won't break — they'll just have an empty match history until new scores are submitted going forward.

**Not done in this phase (by design):** no History tab UI changes — that's Phase 2. `App.tsx` was verified with `npx vite build` (what CI actually runs) — clean build, no new errors. `tsc -b` (`npm run build`'s type-check step) has 2 pre-existing, unrelated errors in this file (`THEMES`/`C_BASE` self-referential typing) and a long list of pre-existing implicit-`any` errors in `AppV1.tsx` — confirmed via `git stash` that all of these predate this change and aren't part of the CI build (CI calls `vite build` directly, not `tsc -b`).

**Next step:** Phase 2 — build the History tab UI to read `SavedTournament.matches` and render match-by-match history grouped by round, additive alongside the existing summary/ranking view. (Ordering — newest/oldest-first — to be confirmed before implementation.) Then Phase 3 — score confirmation checkbox.

## Phase 2 — History tab match-by-match UI (2026-07-08)

**Goal:** Show the full match-by-match history for a completed tournament in the History tab, additive alongside the existing Final Standings/summary card (kept exactly as-is).

**What changed (`src/App.tsx` only, additive):**
- New `MatchHistoryList` component (placed next to `LeaderboardTable`, follows the same conventions — reads the module-level `C` theme directly, no props for styling). Takes `matches: Record<string,MatchRecord>` and `players: Player[]`.
- Groups `Object.values(matches)` by `roundNum` into a `Map`, then sorts round numbers **ascending** (Round 1 first, most recent round last — chronological oldest-first, per this phase's explicit instruction).
- Within a round, sorts matches by `courtNum` ascending, with main-court matches before any "Next Game" sub-round matches for that same court (sub-rounds ordered after, by `subLabel`), so a court's original game and its extra games stay together and in order.
- Each match row shows: court number (+ sub-round label like "2a" with an orange accent/left-border for sub-rounds, matching the orange "⚡ Extra" styling already used in `CourtCard`), both teams' player names resolved from `players` via ids, and the final score — with the winning team's names bolded/green, same visual convention as `CourtCard`.
- Wired in via a new "🏓 Match History" card inserted between the existing "🏆 Final Standings" card and the "👥 Players" card in the History tab's detail view (`mainTab==="history"` → `selectedHistory` branch). The Final Standings card's JSX is untouched.
- Data comes directly from `selectedHistory.matches` (the field Phase 1 populates in `pb3_history` via `endTournament`) — nothing is recomputed from `scores`/`leaderboard`. Read with a `selectedHistory.matches||{}` fallback so tournaments saved before Phase 1 (which have no `matches` field) render "No match records for this tournament." instead of crashing, rather than fabricating history for them.

**Verification this phase:** `npx vite build` (the command CI actually runs) builds clean. `npx eslint src/App.tsx` reports the same 14 problems as after Phase 1 — no new lint issues introduced. No manual/browser testing was done in this session (per instructions, that's the user's job on `pickleball-qa/` with a throwaway tournament).

**Next step:** Phase 3 — score confirmation checkbox.

## Losses column in Final Standings (2026-07-08)

**What changed (`src/App.tsx` only, additive):** Added an "L" (Losses) column to the Final Standings table, between the existing "Wins" and "Pts" columns.

- `Stats` gained a `losses: number` field.
- `computeLeaderboard` now increments `losses` symmetrically with how `wins` was already computed: for each completed match (main court or sub-round), a team's players get `+1 loss` when their score is strictly less than the opponent's (`else if(s1<s2)` / `else if(s2<s1)`), mirroring the existing strict `s1>s2`/`s2>s1` win check. This means a tied score (technically enterable via the score inputs, though not realistic for actual pickleball scoring) counts as neither a win nor a loss for either side — consistent with how ties already didn't count as a win before this change. `losses` was **not** derived as `played - wins`, since that would've silently turned a tie into a loss.
- `LeaderboardTable`'s grid went from 5 to 6 columns (`60px` added) to fit the new "L" header/cell; `Wins`, `Pts`, and `Played` columns/values are unchanged.

## Phase 3 — score confirmation checkbox (2026-07-08)

**Goal:** Require an explicit "I confirm this score is correct" checkbox before the ✓ submit button on a court's score-entry card becomes clickable, to cut down on accidental/mis-typed score submissions.

**What changed (`src/App.tsx` only, additive):** All of this lives inside `CourtCard` — the single shared component that renders **both** main-court and "Next Game" sub-round score entry (they're the same component, only `isSubRound` differs), so this applies to both flows automatically with no duplicated logic.

- Added local component state: `const [confirmed, setConfirmed] = useState(false);` — purely a UI gate, not persisted anywhere, not part of the `Score`/`MatchRecord` schema.
- Added `useEffect(()=>{ setConfirmed(false); },[sc.done]);` — resets the checkbox whenever this card's `done` state flips in *either* direction: true after a successful submit (so the next match on this court/sub-round starts unchecked), and also false again when "Edit" is clicked to reopen a submitted score (so re-editing doesn't inherit a stale checked box either). This mirrors the existing `useEffect(...,[JSON.stringify(t.scores)])`-style sync pattern already used in `TournamentView` for `scores`/`subScores`/`matches`.
- The ✓ button's `disabled` condition gained `|| !confirmed` alongside the existing `sc.s1===""||sc.s2===""` check — unchecking the box after checking it re-disables the button immediately on next render, no extra code needed since `disabled` is recomputed from state every render.
- Added the checkbox + label ("I confirm this score is correct") below the score-input row, inside a new wrapping `<div style={{width:"100%"}}>` around the entry-mode markup (previously the inputs/button were direct children of the card's single horizontal flex row — a second block-level row was needed to avoid cramming the checkbox into that same line, especially on mobile).
- **Does not touch** `onSubmit`/`onEdit`/`handleScoreChange`/`submitScore`/`editScore`/`saveState` in `TournamentView`, or the Phase 1 match-record write path, or the edit-and-resubmit (upsert-by-key) behavior — the checkbox is purely a client-side gate on when the existing submit handler *can* be called, nothing about what it does when called.

**Verification:** `npx vite build` builds clean. `eslint` went from 14 → 15 problems: exactly one new error, the same `react-hooks/set-state-in-effect` category already present 3 times elsewhere in this file for the analogous `scores`/`subScores`/`matches` sync effects — not a new category of lint issue, just one more instance of an existing, already-accepted pattern in this codebase. No manual/browser testing done this session (per instructions, that's the user's job on `pickleball-qa/`).

**Next step:** none specified yet — awaiting direction for the next phase.

**Verification:** `npx vite build` builds clean; `eslint` shows the same 14 pre-existing problems, no new ones.

## Phase 5 — v4 promoted to Production (2026-07-08)

**Goal:** Ship the tested v4 code (Phase 1 match-record persistence, Phase 2 History tab match-by-match UI, the Losses column, and Phase 3's score confirmation checkbox) to Production at `https://gogreenvue.com/pickleball`, following the same frozen-snapshot versioning pattern already used for v1/v2/v3 — without disturbing `pickleball-v3/` (archived) or `pickleball-qa/` (still tracking live `App.tsx`).

**Pre-promotion investigation (reported and confirmed before any changes):**
- The bare `pickleball/` path was *not* building from `App.tsx` directly — both the "Build Pickleball stable" step (→ `pickleball/`) and the "Build Pickleball V3" step (→ `pickleball-v3/`) copied `AppV3.tsx` over `App.tsx`, just with different `base` values. They were byte-identical builds under two URLs.
- `homepage.html` had three hardcoded links to `/pickleball-v3` (nav bar, hero CTA, feature card) — none pointed at the bare `/pickleball` path. This only "worked" because `pickleball/` and `pickleball-v3/` were identical prior to this promotion; left alone, they'd have kept sending visitors to the frozen v3 archive after this change.
- Regression diff of `AppV3.tsx` vs. the tested `App.tsx` found no correctness issues — round navigation, player management, round generation, and the standings sort order were untouched; all Phase 1–3 additions were defensive/additive. Two non-bug effects were flagged and accepted: pre-Phase-1 `pb3_history` docs have no `matches` field (renders "No match records" gracefully, by design) and the confirm-checkbox is a deliberate UX change affecting every future score submission.

**What changed:**
- `pickleball/src/AppV4.tsx` created as a frozen snapshot of the tested `App.tsx` (identical byte-for-byte at time of promotion), matching the `AppV1`/`AppV2`/`AppV3` pattern.
- `.github/workflows/deploy.yml`:
  - "Build Pickleball stable" (→ `pickleball/`, i.e. Production) now copies `AppV4.tsx` instead of `AppV3.tsx`. `base` stays `/pickleball/`.
  - New "Build Pickleball V4" step added (copies `AppV4.tsx`, `base: '/pickleball-v4/'`, deploys to `deploy/pickleball-v4/`) — same pattern as the V1/V2/V3 steps, inserted right after "stable" so the file reads QA → stable → V4 → V3 → V2 → V1.
  - The "Build Pickleball V3" step is **unchanged** — still copies `AppV3.tsx` to `base: '/pickleball-v3/'`, so it stays the frozen archived version.
- `homepage.html`: the three links previously hardcoded to `/pickleball-v3` (nav bar, hero CTA button, feature card button) now point to `/pickleball` (Production). The feature card's version label was updated from "Version 3 · Multi-Group" to "Version 4 · Multi-Group" (the "Latest Version" badge itself needed no change — it was already version-agnostic). The QA showcase card's link to `/pickleball-qa/` was left untouched.
- All five parallel builds (QA, stable/Production, V4, V3, V2, V1) were run locally in the same sequence the CI workflow uses, to confirm each one builds cleanly before pushing; `src/App.tsx` and `vite.config.ts` were restored via `git checkout` afterward so the local simulation didn't leak into the commit.

**Verification post-deploy:** Deploy run completed successfully (all steps green, including the new "Build Pickleball V4" step). Confirmed via the published `gh-pages` branch that `pickleball/`, `pickleball-v4/`, and `pickleball-qa/` all now serve the identical v4 JS bundle (same content hash), while `pickleball-v3/`, `pickleball-v2/`, and `pickleball-v1/` kept their pre-existing, unchanged hashes. Confirmed via the live site that all three homepage production links now resolve to `/pickleball`, and the QA card is unaffected. `pickleball-v3/` and `pickleball-qa/` remain live and untouched at their existing URLs.

**Git tag:** `v4.0`, on commit `1648297` ("Promote Pickleball v4 to Production").

**Not done (out of scope for this promotion):** `.github/workflows/monitor.yml`'s health-check route list wasn't updated to add `pickleball-v4` (it already checks `pickleball`, `pickleball-v2`, `pickleball-v3`, `pickleball-qa`, but has never checked `pickleball-v1` either — a pre-existing gap, not something introduced here). Worth a follow-up if `pickleball-v4/` should be monitored going forward.

**Next step:** none specified yet — awaiting direction for the next phase.

## Fix stale "V3" labels left over from promotion (2026-07-08)

**What was found:** The v4 promotion (Phase 5) copied `App.tsx` into `AppV4.tsx` verbatim, which meant leftover hardcoded "V3" strings from the original `AppV3.tsx` lineage were carried forward unchanged into the new Production build. Found four occurrences in both `src/App.tsx` and `src/AppV4.tsx` (identical in both, since they're the same snapshot):
- The header subtitle: `"ROUND-ROBIN V3 · MULTI-GROUP"` (the one reported).
- Three more in `FeedbackModal.submit()`, not visible in the UI but functionally live: the `FeedbackEntry.version` field written to Firestore (`"v3"`), the outbound EmailJS notification's `subject` line (`[Pickleball V3] ...`), and its `version` template param (`"V3"`). Left as-is, every feedback submission from the now-promoted v4 Production build would have been mislabeled "v3" in both the stored `pb3_feedback` record and the email subject — a data-quality bug on top of the cosmetic one, so it was fixed too even though it's not the header/title/meta/footer the ask named directly.

**What changed:** All four strings updated from "V3"/"v3" to "V4"/"v4" in `src/App.tsx` and `src/AppV4.tsx` only. `src/AppV3.tsx` was explicitly left untouched — confirmed via `git diff --stat` showing zero changes to it, and it still correctly reads "V3" in all four spots, since it's the frozen archive that should keep identifying itself as v3.

**Also checked and ruled out:** `index.html`'s `<title>` ("Pickleball RRA", no version number) and `public/favicon.svg` — neither contains a version string, so nothing to fix there.

**Verification:** Confirmed `App.tsx` and `AppV4.tsx` are still byte-identical after the edit, `AppV3.tsx` has zero diff, and no "V3"/"v3" strings remain in `App.tsx`/`AppV4.tsx`. `npx vite build` builds clean; `eslint` unchanged at 15 problems (same as after Phase 3/promotion — a text-only change, no logic touched).
