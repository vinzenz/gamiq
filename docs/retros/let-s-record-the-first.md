# Retro: From one-paragraph concept to shipped 40-level game — orchestration paid off, playtesting didn't happen

**Date**: 2026-09-01
**Session**: 01a04fbd-60d1-7405-ae56-75686f3de1e1
**Transcript**: /home/vfeenstr/.pi/agent/sessions/--home-vfeenstr-devel-lab-gamiq--/2026-08-29T22-56-46-289Z_01a04fbd-60d1-7405-ae56-75686f3de1e1.jsonl
**Duration / tokens / cost**: 133,550s wall (~37.1h, incl. two background workflows: 303m57s + 136m32s) · 57,560,558 total tokens (input 1,628,027 / output 233,971 / cacheRead 55,698,560) · $0.00 on zai/glm-5.3-flash
**Extraction**: /home/vfeenstr/devel/lab/gamiq/docs/retros/let-s-record-the-first.extract.json

## What happened

The user pitched a Halloween swap-3 game; the agent researched the genre (2 searches, 3 scrapes), recorded it as rohrpost epic `TOTS-9pbwcw` (`488e368a`, `6edac394`), and on request sliced it into 14 dependency-ordered child tickets (`fd3351c7`, `9d077427`). A two-run background workflow built the entire game — engine, screens, 40 levels, generated art — in ~7.3h of agent time; run 1 lost 3 of 15 agents to provider stalls plus one false ticket failure, and the agent's resume run (`f903186e`, `565e28a9`) finished 4/4. The user then found seven defects by playing the deployed game across six messages (`72d931a0`, `d37f041f`, `e14f5b04`, `5ff5cf0f`, `656c205b`, `41f38a9c`) — including level 1 being unplayable — and the agent fixed all of them with real-browser reproduction, root-cause fixes, and verification, leaving `scripts/e2e_tots_smoke.py` behind. The first bug report alone cost 130 tool calls / 121 assistant turns (`72d931a0`→`0076eec6`), most of it spent chasing false signals from the agent's own test harness.

## What worked

- **Epic → dependency-ordered tickets with strict file scopes**: 14 children with wired `blocked_by` edges let the workflow run 4-wide in a shared tree with no file collisions; every ticket closed. The resume run (4/4 ok, `b7573426`) proved the graph was sound.
- **Failure triage on run 1**: the agent distinguished real failures (C12 provider stalls) from a false one (A1's `ok=false` — its own result says "only because repo-wide pnpm check is red from 33 pre-existing tsc errors in another concurrent agent's WIP", `b3587e2f`, workflow result.json), then relaunched only the 4 missing pieces with disjoint scopes and resume context instead of rerunning everything.
- **Bug-fix discipline after the first user report**: reproduce on the deployed build first (`5e488dc6`), fix the root cause plus the secondary hazard (`.tots-overlay[hidden]` CSS + detach-guard on overlay mounting, `1b9e87b5`), then verify the real user flow with zero devtools surgery (`03fbd5f3`, `30700513`), and commit the harness as a deterministic regression script.
- **Guardrails carried forward**: after the overlay lesson, the goal-hint popover was made `pointer-events: none` by design and verified against board hit-testing (`9d0941a5`, `455cdf32`); the engine was exonerated before being touched (`55e99dec`, `56561178`).

## Friction

- **Verify phase never exercised the product** (`b1b0eb16` workflow script; `4ff52f2c`; `72d931a0`): the verify agent audited conventions (setupViewport, hover, `as any`) and ran check/lint/build/doctor — but never opened the game in a browser. The shipped build had a full-screen invisible overlay eating every tap, making level 1 unplayable; the user did the playtesting. Root cause chain: no smoke script existed → verify prompt listed only static gates → agent designed verification as "compile + conventions" because no skill or repo affordance said verify must click through the product. Six further user messages were UX defects (goal clarity, reload walk, invisible basket, black-square boss, end-of-turn counters) in the same class: nothing behavioral ran before ship.
- **130-call harness chase on bug report #1** (`72d931a0`→`0076eec6`, 11 tool errors): the agent built a pixel-classifier bot that misread skull sprites and captured mid-animation frames (`49341259`, `fef8f35b`), declared it "a dead end for reliability" (`50dc80cd`), had its solver's `cloneRng` share closure state so the "expected +9 pumpkins" was garbage (`56561178`: "Harness bug, not product bug"), read the HUD at a fixed 3.0s mid-replay (`3f6ca2b5`), fought the vite `/gamiq/` base path across three attempts (`f33d4ba4`, `44436034`, `ae9c18c1`), and leaked servers/instances through port collisions and fixed instance names (`12b50347`, `faebfd6d`, `0cb94060`). Root cause chain: canvas game → no DOM to read → `chrome-agent-testing` skill is DOM-centric ("Locate… the OUTER element", "Screenshots are for layout questions") with no ground-truth pattern for canvas state → the agent invented one (engine replay in Node + HUD chip as observed truth + in-page swap simulator) at ~60% through the arc; a60fc0b6: "No harness in the repo (agents kept it out of scope)."
- **Workflow design decisions with user-visible consequences made unilaterally** (`b1b0eb16`; `b6a83c3a`; `932483d3`): the orchestrating agent wrote "NO git commit/stage/push" into every prompt without asking; ~100 uncommitted files then sat in the tree until the user challenged ("who designed the git barring?") and said "just get on with it" — also revealing a preference for logical commit splits the agent never knew. Root cause: consequential, hard-to-undo policy decided silently inside workflow scaffolding.
- **Concurrent repo-wide `pnpm check` produced a false failure and a skipped ticket** (A1 result.json; `565e28a9`): the workflow prompt demanded "pnpm check must pass" from every agent while up to 4 siblings edited; A1 finished its artwork but reported `ok=false` on someone else's 33 tsc errors, so dependent A2 was skipped despite its blocker being done. Root cause: the prompt guarded lint/format against concurrency ("another agent may be mid-edit") but not check — the same insight, applied twice-over, and the second instance was missed.
- **Cross-cutting wiring had no owner** (`656c205b`; `656c205b`→`288ce506`): Assets II generated six boss portraits but its scope forbade code wiring ("Strict file scope honored (no code wiring)", `b7573426`), and no other ticket owned wiring them — the boss rendered as a black square in every level. Fixing it exposed a second latent defect: `chapters.ts` assumed rigid 6-door chapters while real boss doors are 7/13/20/27/34/37/40 (`288ce506`, `6cacbb06`), which DIFFICULTY.md documented but no test asserted. Similarly, the scaffold ticket authored a `check` script whose test glob only matched `src/engine` — meta/tutorial tests silently not running until the resume verify widened it (`565e28a9`). Root cause: file scopes prevent collisions but the slicing never assigned integration points (asset wiring, shared maps, test globs) to any ticket.
- **Provider flakiness on long runs** (`4ff52f2c`; `9300ecf5`–`b74f3fa7`; `b3587e2f`): glm-5.3-flash 500s and 45s stalls killed C12 twice and the run-1 verify agent, and stalled the orchestrator itself four times right after completion (user had to prompt "Yes retry"). The built-in single retry couldn't survive two consecutive stalls. Handled well by the manual resume; nothing in the workflow pattern makes resume cheap by design.
- **Minor: rohrpost output parsing** (`ab61d832`, `fc5052a5`): id extraction via grep missed the pretty-printed `--json` output (one wasted call), and prefix casing was discovered live (`ToTS` normalizes to `TOTS`). Both self-corrected within one turn.
- **Minor: research skill never fired** (`1b812928`–`d78c3f35`): the opening request ("research the elements… present that to me") matches the `research` skill's description, but the agent searched and scraped inline. Outcome was fine (findings became the epic body, which the workflow agents then read as spec), so this is a triggering miss without cost — noted, not proposed against.

## Proposals

| # | Type | Change | Where | Evidence | Status |
|---|------|--------|-------|----------|--------|
| 1 | skill-create | New `multi-agent-builds` skill encoding the orchestration patterns this session derived (full text below) | `.agents/skills/multi-agent-builds/SKILL.md` | `b1b0eb16`, `4ff52f2c`, A1 result.json, `565e28a9`, `288ce506`, `b6a83c3a`, `72d931a0` | applied |
| 2 | skill-update | Add "Canvas games: ground truth without a DOM" + "Wait for animation quiescence" + "Testing built games in this repo" sections to chrome-agent-testing (full text below) | `.agents/skills/chrome-agent-testing/SKILL.md` (new sections after "## 3. Write the script") | `49341259`, `50dc80cd`, `56561178`, `3f6ca2b5`, `ae9c18c1`, `faebfd6d`, `a60fc0b6` | applied |
| 3 | rule-update | tap-rush template `check` runs tests too, so every new game starts with the working glob | `games/tap-rush/package.json`: `"check": "tsc --noEmit"` → `"check": "tsc --noEmit && node --test \"src/**/*.test.ts\""` (add `node --test` devDep usage matches ToTS package.json) | `565e28a9` (test-glob debt: "package.json's check script only runs src/engine tests") | applied |
| 4 | rule-update | Record the commit policy in AGENTS.md so agents stop inventing it: "Prefer logically split commits (engine/screens/levels/assets); agents never commit or push unless the user asks; a bar on committing (e.g. during multi-agent builds) is a policy decision to state in the launch plan, not to make silently." | `AGENTS.md` → "## Conventions" (new bullet) | `b6a83c3a`, `932483d3`, `defc4d9c`, `100cb889` | applied — default commit model: between waves, split per ticket where scopes allow |
| 5 | skill-update | rohrpost SKILL.md: note that `--json` output is pretty-printed multi-line — parse it with `jq`/python, never grep compact `"id":"…"` patterns — and that display prefixes normalize to uppercase | `.agents/skills/rohrpost/SKILL.md` → "## Invocation" (append after the `--json` paragraph) | `ab61d832`, `fc5052a5` | applied |
| 6 | acknowledge | `research` skill didn't fire on the opening research request, but inline search+scrape into the epic body worked and fed the tickets as spec — no change; watch whether it triggers next time | — | `1b812928`–`d78c3f35` | acknowledged |

### Proposal 1 — new `.agents/skills/multi-agent-builds/SKILL.md` (full content)

```markdown
---
name: multi-agent-builds
description: Use when orchestrating several tickets or subtasks as parallel
  agents — pi workflows, background builds, wave execution — in this repo.
  Covers file scopes, per-agent verification in a shared tree, verify-phase
  design, commit policy, and resume after provider stalls.
---

# Orchestrating multi-agent builds

## Assign every integration point an owner

File scopes prevent collisions but leave seams unowned. After slicing
tickets, list the cross-cutting wires — registering modules, wiring
generated assets into renderers, shared maps/tables (chapter boundaries,
level indexes), test globs in package.json — and put each one inside
exactly one ticket's scope, or into the verify phase's mandate. An asset
ticket with "no code wiring" in its scope and no wiring ticket anywhere
means the asset ships unused.

Done when every file *and* every seam between tickets has one owner.

## Per-agent verification in a shared tree

Agents share one working tree; repo-wide commands race sibling WIP. Each
agent runs repo-wide `pnpm check` but judges only errors in files it owns:
if every failure is outside its scope, it closes the ticket ok=true with a
note listing them — never ok=false for someone else's WIP. Repo-wide
lint/format stay forbidden until the verify phase. One retry per agent, on
failure, with the error context.

Done when no agent can fail because of a file it doesn't own (wf_3685ed260db9's
A1 lost its dependent A2 to exactly this).

## The verify phase must exercise the product

check + lint + build + doctor + a convention audit pass on a build where
door 1 cannot be tapped. Verification is not done until someone has clicked
through the product: play the primary flow to its completion screen in a
real browser (chrome-agent-testing skill), open one instance of each novel
screen kind, and run or author `scripts/e2e_<game>_smoke.py` as the
permanent regression. Convention audits ride along, they don't substitute.

Done when the verify agent has played the game, not compiled it.

## Policy decisions belong to the user

Anything user-visible and hard to undo — barring agents from git commits
(leaves all output uncommitted), deleting branches, pushing — is stated in
the launch plan for the user to veto, never decided silently inside
workflow scaffolding.

## Expect provider stalls on long runs

Long background runs hit provider 500s and stalled-response errors; a
single in-workflow retry does not survive two consecutive stalls. Design
for resume: keep tickets as the unit of progress (claim/close in rohrpost),
and on resume launch only the missing pieces — disjoint scopes, a resume
context naming what is already done and green, never rerunning finished
tickets.
```

### Proposal 2 — sections to add to `.agents/skills/chrome-agent-testing/SKILL.md`

Insert after the four script rules in "## 3. Write the script":

```markdown
### Canvas games: ground truth without a DOM

When the app renders to a `<canvas>`, DOM queries return nothing and the
cookbook's locate-act-sense pattern has nothing to locate. Take expected
values from the engine, not the pixels: import the real engine in Node,
seed it, and compute the exact input sequence and expected counters there.
Take observed values from the game's own HUD (goal chips, move counters) —
it is ground truth the app itself maintains. Never classify canvas pixels:
sprite confusion and mid-animation frames make it a dead end. For input,
compute cell centers from the game's own layout code and dispatch
`Input.dispatchMouseEvent` press+release. When the game exposes no HUD for
what you need, prefer an in-page simulator that calls the app's real
handlers over reading rendered output.

### Wait for animation quiescence, not just load

Event-driven apps replay actions as animation sequences: the HUD keeps
changing for seconds after the click. A fixed sleep reads mid-replay state.
After acting, wait for the read to *change* from its pre-action value, then
wait for it to go *stable* across two consecutive polls — change-then-stable,
because the stale pre-action value is already stable.

### Testing built games in this repo

Vite builds hardcode the `/gamiq/` base (the GitHub Pages path); serving
`dist/` at `/` 404s every asset. `scripts/e2e_tots_smoke.py` shows the
working pattern: in-process `http.server` on an ephemeral port with a
symlink mapping `/gamiq/` → `dist/`. Reuse it (`--url`) or copy the
pattern. Instance hygiene: let `launch` derive the instance name, never
hard-code one in a script — killed runs then leak colliding instances —
and `stop` in a finally block. Nothing persists between one-shot commands:
injected JS, background servers, and `Page.addScriptToEvaluateOnNewDocument`
all die with the shell, the session reload, or the one-shot disconnect.
Keep a run self-contained in one process (serve → launch → drive → stop).
Build nested CDP JSON payloads with python or jq — hand-interpolated
JSON-in-JSON is where quoting bugs live.
```

### Proposal 5 — rohrpost SKILL.md wording

Append to the `--json` paragraph in "## Invocation":

```markdown
The `--json` output is pretty-printed across multiple lines — parse it with
`jq` or python, never grep for compact patterns like `"id":"…"` that assume
one line. Display prefixes are normalized to uppercase: a requested prefix
`AbC` renders as `ABC`.
```

## Questions for the user

- ~~For future orchestrated builds, which commit model do you want as the default: agents
  committing per-ticket between waves (needs per-agent worktrees to be safe), or the current
  model — everything left uncommitted for one review commit by you?~~ **Answered:** commits
  **between waves** — one commit per completed wave, split per ticket where file scopes allow,
  to keep changes small (big commits are hard to reason about). Recorded in AGENTS.md and the
  `multi-agent-builds` skill.
