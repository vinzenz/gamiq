# Level format

Levels are data. One level describes a board shape, a spawn palette, a move
budget, obstacles, goals and star thresholds. The schema lives in
`src/engine/goals.ts` (`RawLevel`); `loadLevel()` validates and normalizes it,
`createLevelGame()` turns it into a running `Swap3Game` with goal tracking and
win/lose wiring. The forty campaign levels live beside this file; per-level
difficulty targets and the ship-pass notes are in `DIFFICULTY.md`.

Levels are authored as `.ts` modules whose export satisfies `RawLevel`, so the
compiler checks them too. `loadLevel()` takes `unknown`, so parsed JSON of the
same shape validates identically.

## Schema

```jsonc
{
  "id": 1,                        // integer ≥ 1, play order
  "name": "Maple Lane 1",         // 1–40 characters
  "seed": 20261,                  // integer ≥ 0, drives board fill + refills
  "moves": 20,                    // integer 1–999
  "shape": [                      // grid mask, row-major
    "##...##",                    //   '.' playable, '#' blocked
    "#.....#",                    //   rows share one length
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
  ],
  "tileTypes": {                  // relative spawn weights
    "pumpkin": 3,                 //   keys: pumpkin, ghost, skull, bat,
    "ghost": 2,                   //         candy, potion
    "skull": 2,                   //   integer weights 1–20
    "bat": 1,                     //   at least 3 types with weight ≥ 1
  },
  "obstacles": [                  // optional
    { "x": 0, "y": 2, "modifier": "cobweb" },
    { "x": 6, "y": 2, "modifier": "boss" },
  ],
  "boss": {                       // optional boss house (chapter finale)
    "hp": 8,                      //   hit points, integer 1–99
    "throwEvery": 4,              //   throws an obstacle every N moves, 1–50
    "throws": "cobweb-2",         //   modifier id placed per throw
  },
  "goals": [
    { "kind": "collect", "color": "pumpkin", "count": 10 },
  ],
  "starThresholds": [3, 8],       // moves left on a win for 2★, then 3★
}
```

Rules the loader enforces, per field:

- `shape`: 3–16 rows and columns, at least 9 playable cells. Blocked cells
  become `void` cells: never filled, tiles stack on them, refills skip them.
- `tileTypes`: weight w makes a type w times as likely on every refill. The
  pool the engine draws from is the type list repeated by weight.
- `obstacles`: positions must be unique, in bounds and on playable cells.
  Placement only; what a modifier does (peel, break, block, spread) is the
  obstacles ticket's business. One exception: `void` is reserved for mask
  holes and can't be used as an obstacle goal target. The boss is placed as
  the bare `boss` modifier — at most once per level; `boss-<hp>` ids are
  rejected there (hp comes from the `boss` field).
- `boss`: optional. Requires a placed `boss` cell and a `{ kind: "boss" }`
  goal whose `hits` equal `hp`. Every `throwEvery` moves the boss throws the
  `throws` modifier onto a random plain cell — overlays (cobweb, ice, lock)
  wrap the tile that is there, occupants (gravestone, slime) replace it. See
  the boss section below.
- `goals`: 1 to 8 entries.
- `starThresholds`: `[two, three]` with `0 ≤ two ≤ three ≤ moves`. A 3★
  threshold above the move budget is rejected; nobody could ever earn it.

## Goal kinds

Win means every goal is met. Lose means the moves ran out first. `GoalTracker`
syncs from the engine's event log after every move and reports per-goal
progress.

| Kind | JSON | Met when |
|---|---|---|
| collect | `{ "kind": "collect", "color": "bat", "count": 15 }` | `count` tiles of `color` have been cleared, from `clear` events |
| clear-modifier | `{ "kind": "clear-modifier", "modifier": "cobweb" }` | no cell carries that modifier any more |
| deliver | `{ "kind": "deliver", "color": "candy", "count": 3 }` | `count` tiles of `color` were cleared while on the bottom row, i.e. dropped into the basket |
| boss | `{ "kind": "boss", "hits": 3 }` | 3 boss hits have been recorded |

Semantics worth spelling out:

- **collect** mirrors `game.stats.cleared` exactly; cascades count.
- **clear-modifier** covers cobwebs, gravestones, cursed ice and cages; they
  differ in modifier id, not in goal logic. The goal is met when the board has
  no cell with that modifier left, whatever events produced that. The level
  must place at least one obstacle with the modifier, or the loader rejects it.
- **deliver** counts a tile as delivered when a clear event removes it from
  the bottom row. Matching a candy on the bottom row delivers it; a power-up
  blast that catches one there does too. Which tiles look like goodies is
  art and rendering; the goal only counts.
- **boss** is the chapter-finale win condition. With a `boss` field the cell
  carries `boss-<hp>`: matches adjacent to the boss and power-up footprints
  covering it deal one damage per resolution pass, and `hits` must equal `hp`,
  so the goal is met exactly when the boss dies. Without a `boss` field the
  cell stays the bare `boss` marker: no hp, never destroyed, and the tracker
  counts hits from match adjacency alone (the hook form).

### The boss house

`boss: { hp, throwEvery, throws }` makes the level a chapter finale. The boss
is a tile-less occupant (tiles stack on it, nothing refills into it). Damage:
one per resolution pass from matches adjacent to the boss or power-up
footprints covering it — each damage feeds the boss goal. Pressure: every
`throwEvery` moves it throws the `throws` modifier onto a random plain cell
with a tile, retrying next move when no target exists. Throwing stops once
the boss is defeated. All boss events arrive as `obstacle` events
(`damage`/`destroy` for hits, `spread` for throws), so the render layer can
animate portrait, hp bar and throws from the stream.

## Stars

Stars come from moves left on a win: at least `starThresholds[1]` moves left
means 3 stars, at least `starThresholds[0]` means 2, any win means 1. A loss
earns nothing. `starsFor(level, movesLeft)` and `levelStars(level, game)`
compute it.

## Validation

`loadLevel()` gathers every problem it finds and throws one
`LevelValidationError` listing all of them, with the field path in each
message. A broken level fails at load, not mid-game.

## Campaign: all six chapters (L1–L40)

Move budgets and star thresholds were tuned with a scripted greedy player run
against the real engine (best / decent / casual decision tiers): `moves` sits
at a decent line's 75th-percentile usage + 2, so a decent line wins with
1–2 moves to spare; the 3★ threshold is a near-best line, the 2★ threshold
about a median decent line. Chapters 1–2 (L1–L13) were tuned this way in
ToTS-wcyafa; chapters 3–6 (L14–L40) were tuned to the same calibrated band in
ToTS-x40f2s — see `DIFFICULTY.md` for the per-level targets and solver stats.

| # | Name | Teaches | Goals | Notes |
|---|---|---|---|---|
| 1 | Maple Lane 1 | match-3 basics | collect 12 pumpkin | 4 colours, wide open |
| 2 | Maple Lane 2 | shaped masks, stacked goals | collect ghost + candy | corners cut |
| 3 | Broom Closet | broom (match-4) | collect skull + bat | 5 colours |
| 4 | Pumpkin Carving | pumpkin bomb (L/T match-5) | collect pumpkin + candy | |
| 5 | Bubbling Brew | cauldron (line-5) + ghost (2×2) | collect potion + candy | all four power-ups live |
| 6 | Webbed Porch | cobwebs, first combo (broom+broom) | clear webs + collect ghost | |
| 7 | Count Snackula | boss house 1 | boss 6 hp | throws webs every 4 |
| 8 | Headstone Row | gravestones | break stones + collect bat | |
| 9 | Mossy Slabs | 2-hit stones + webs mixed | break all stones + collect candy | 8-wide board |
| 10 | Basket at the Gate | deliver | deliver 2 candy + collect ghost | candy-weighted spawns |
| 11 | Fog Between Graves | full obstacle mix | collect potion + skull | cut corners, 6 colours |
| 12 | The Long Row | everything combined | deliver + collect + clear webs | pre-boss gauntlet |
| 13 | The Grave Warden | boss house 2 | boss 8 hp + collect pumpkin | raises stones every 4 |

Chapter boundaries follow the concept (Maple Lane 1–7, Graveyard Path 8–13,
Witch's Hollow 14–20, Pumpkin Patch 21–27, Cemetery Hill 28–34, Castle
Dracula Alley 35–40 with boss houses at 7, 13, 20, 27, 34, 37 and 40);
the alley map (`src/meta/chapters.ts`) derives its segments from exactly
those boss doors (`BOSS_DOOR_IDS`), so map boss houses and level data agree.

`src/levels/index.ts` exports `LEVELS` in play order and `levelGame(n)`, which
builds level n (0-based) as a `{ level, game, tracker }` bundle ready for the
render layer.
