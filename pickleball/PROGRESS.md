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
