# Difficulty targets & ship pass (chapters 3–6, ToTS-x40f2s)

Per-level difficulty targets for the full 40-level campaign, plus the ship-pass
notes (curve review, budgets, stars, perf, QA). Chapter split follows the
concept: Maple Lane 1–7, Graveyard Path 8–13 (both authored in ToTS-wcyafa),
Witch's Hollow 14–20, Pumpkin Patch 21–27, Cemetery Hill 28–34, Castle
Dracula Alley 35–40 with two boss houses (L37, L40). Seeds are `20260 + id`.

## Method

Budgets and star thresholds were tuned with a scripted player run against the
real engine (`createLevelGame` + `stripTilelessObstacleTiles`, three decision
tiers, exact replay-based simulation):

- **casual** — always takes `findHint`; a weak human proxy.
- **decent** — greedy 1-ply over every accepted swap, scoring goal progress,
  clears and power-ups created; three seeded tie-break runs.
- **best** — 2-ply: greedy playouts from the top-4 first moves; a strong line.

The decent solver is super-human (it never wastes moves and reads cascades), so
budgets were calibrated against the shipped chapters 1–2: measured by this
solver, their budgets sit at a **decent-usage ratio of 0.13–0.80 (median ~⅓)**,
and their casual line wins only the easy openers. Chapters 3–6 target the same
band, ramping inside each chapter:

| Level role | decent-usage ratio target | casual line |
|---|---|---|
| Breather / chapter opener | ≤ 0.30 | wins |
| Intro of a new obstacle | ≤ 0.30 | wins or near-miss |
| Standard / mixed | 0.25–0.45 | loses |
| Gauntlet (pre-boss) | 0.40–0.70 | loses |
| Boss house | 0.25–0.55 | loses |

Stars: **3★** = win with `moves − best − 3` moves left (a near-best line with
human slack); **2★** = win with `moves − (2 × decent-median + 2)` left, floored
at the 3★ line. On the tightest fights (L27, L40) the 2★ floor is 0: any win
earns 2★. Boss `hp` climbs 6 → 8 → 10 → 11 → 13 → 13 → 16 with `throwEvery`
tightening 4 → 3.

## Difficulty arc

- **Witch's Hollow (14–20, cursed ice).** Ice enters in its easiest form (four
  scattered tiles), then an eight-tile glaze with a clear-all goal, then the
  web+ice mix, a frozen deliver, six colours, and a tight pre-boss pair. Ramp
  0.27 → 0.35 into the Mother Hex spike; the fen opener doubles as the breather
  after the Grave Warden.
- **Pumpkin Patch (21–27, locks + slime).** Post-boss breather teaches locks
  (three cages), then the cage hunt, a single slime blob, three-patch creep, a
  caged deliver, and the six-colour Harvest Hoard gauntlet (the chapter's
  decent-toughest at 0.67) before the Gourd Golem throws live slime.
- **Cemetery Hill (28–34, everything mixed, tight budgets).** Wake breather,
  then frost+stone, ooze+cage, a frozen deliver, the six-colour storm, and the
  Crooked Stair mask gauntlet (0.54) rising into the Hill King's gravestone
  siege — the meanest throw in the game before the castle.
- **Castle Dracula Alley (35–40, finale, two boss houses).** Gate breather →
  narrow-tower Dungeon Kitchen (0.54) → Rat King boss → Tower Steps breather →
  The Longest Night gauntlet (0.43) → Count Dracula (16 hp, locks every 3 moves,
  0.50 — the hardest fight in the game).

Every new obstacle appears in its easiest form first (ice: L14; lock: L21;
slime: L23), and every boss win is followed by a breather (L21, L28, L35, L38
plus L14 after the chapter-2 finale).

## Per-level targets (all 40)

`cas` = casual line (w/l at the budget), `dec` = decent median, `bst` = best
line, `r` = decent-median ÷ budget. Chapters 1–2 measured for reference.

| # | Name | Moves | Goals | Obstacles | Boss | 2★/3★ | cas | dec | bst | r |
|---|------|------:|-------|-----------|------|-------|-----|----:|----:|------|
| 1 | Maple Lane 1 | 8 | pumpkin×12 | — | — | 3/4 | w8 | 2 | 2 | 0.25 |
| 2 | Maple Lane 2 | 20 | ghost×12 + candy×12 | — | — | 4/10 | w20 | 8 | 5 | 0.40 |
| 3 | Broom Closet | 10 | skull×14 + bat×14 | — | — | 2/5 | l10 | 6 | 3 | 0.60 |
| 4 | Pumpkin Carving | 16 | pumpkin×15 + candy×15 | — | — | 3/11 | w16 | 3 | 3 | 0.19 |
| 5 | Bubbling Brew | 12 | potion×16 + candy×16 | — | — | 2/6 | l12 | 4 | 3 | 0.33 |
| 6 | Webbed Porch | 14 | clear webs + ghost×12 | web×5 | — | 2/8 | l14 | 4 | 4 | 0.29 |
| 7 | Count Snackula | 20 | boss 6 | web×2 + boss | 6/4 → web-1 | 5/12 | w20 | 4 | 4 | 0.20 |
| 8 | Headstone Row | 16 | clear stones + bat×14 | stone×3 | — | 3/8 | l16 | 6 | 4 | 0.38 |
| 9 | Mossy Slabs | 15 | clear stones + candy×16 | stone×4 web×2 | — | 2/8 | l15 | 5 | 4 | 0.33 |
| 10 | Basket at the Gate | 30 | deliver candy×2 + ghost×12 | web×2 | — | 2/6 | l30 | 4 | 4 | 0.13 |
| 11 | Fog Between Graves | 28 | potion×15 + skull×15 | web×4 stone×2 | — | 1/11 | l28 | 9 | 6 | 0.32 |
| 12 | The Long Row | 28 | deliver + pumpkin + webs | web×3 stone×2 | — | 4/6 | l28 | 10 | 3 | 0.36 |
| 13 | The Grave Warden | 21 | boss 8 + pumpkin×10 | web×2 + boss | 8/4 → stone-1 | 3/13 | l21 | 6 | 5 | 0.29 |
| 14 | Frostbite Fen | 11 | potion×12 + candy×12 | ice×4 | — | 1/5 | w11 | 3 | 3 | 0.27 |
| 15 | Crack the Glaze | 17 | clear ice + bat×14 | ice×8 | — | 2/9 | l17 | 5 | 5 | 0.29 |
| 16 | Webbed Willows | 12 | clear ice + ghost×14 | web×2 ice×3 | — | 2/6 | l12 | 3 | 3 | 0.25 |
| 17 | Meltwater Basket | 30 | deliver candy×3 + potion×12 | ice×4 | — | 4/21 | l30 | 12 | 6 | 0.40 |
| 18 | Toil and Trouble | 28 | potion×10 + skull×10 | ice×4 web×2 | — | 4/16 | l28 | 10 | 9 | 0.36 |
| 19 | Hex on the Wind | 20 | pumpkin×17 + bat×17 | ice×4 web×2 | — | 4/12 | l20 | 7 | 5 | 0.35 |
| 20 | Mother Hex | 26 | boss 10 + potion×12 | web×2 + boss | 10/4 → ice | 10/17 | l26 | 7 | 6 | 0.27 |
| 21 | The Patch Gate | 18 | candy×12 + pumpkin×10 | lock×3 | — | 6/10 | w18 | 5 | 5 | 0.28 |
| 22 | Spring the Cages | 26 | clear locks + bat×10 | lock×5 | — | 2/16 | l26 | 11 | 7 | 0.42 |
| 23 | Goo on the Vines | 18 | ghost×12 + pumpkin×12 | slime×1 | — | 8/11 | w18 | 4 | 4 | 0.22 |
| 24 | The Creeping Rows | 20 | potion×24 | slime×3 | — | 2/12 | w19 | 8 | 6 | 0.40 |
| 25 | Bramble Baskets | 28 | deliver candy×3 + ghost×12 | lock×3 web×2 | — | 8/19 | l28 | 9 | 6 | 0.32 |
| 26 | Harvest Hoard | 24 | candy×13 + skull×13 | lock×4 slime×2 | — | 1/10 | w23 | 16 | 11 | 0.67 |
| 27 | The Gourd Golem | 30 | boss 11 + candy×12 | lock×2 + boss | 11/4 → slime-3 | 0/20 | l30 | 14 | 7 | 0.47 |
| 28 | Hillside Wake | 20 | potion×12 | web×2 stone×2 | — | 14/15 | w20 | 3 | 2 | 0.15 |
| 29 | Frost on the Slabs | 26 | clear ice + stones + bat×14 | ice×3 stone×2 | — | 16/19 | l26 | 4 | 4 | 0.15 |
| 30 | Tombs in the Ooze | 18 | pumpkin×18 | slime×2 lock×4 | — | 4/11 | l18 | 6 | 4 | 0.33 |
| 31 | The Last Wreath | 30 | deliver candy×3 + skull×14 | ice×4 | — | 14/22 | l30 | 7 | 5 | 0.23 |
| 32 | Six-Colour Storm | 30 | potion×16 + candy×16 | web×3 | — | 4/20 | l30 | 12 | 7 | 0.40 |
| 33 | The Crooked Stair | 26 | pumpkin×20 + bat×20 | lock×2 ice×3 stone×1 | — | 2/15 | l26 | 14 | 8 | 0.54 |
| 34 | The Hill King | 28 | boss 13 + skull×12 | web×2 + boss | 13/3 → stone-2 | 4/19 | l28 | 11 | 6 | 0.39 |
| 35 | The Castle Gate | 18 | ghost×12 + candy×12 | web×3 | — | 12/13 | w15 | 1 | 1 | 0.06 |
| 36 | The Dungeon Kitchen | 26 | clear locks + pumpkin×14 | lock×4 ice×2 | — | 2/17 | l26 | 14 | 6 | 0.54 |
| 37 | The Rat King | 28 | boss 13 + ghost×12 | web×2 + boss | 13/3 → web-2 | 12/19 | l28 | 7 | 6 | 0.25 |
| 38 | Tower Steps | 26 | deliver candy×1 + potion×8 | lock×2 | — | 20/21 | w11 | 3 | 3 | 0.12 |
| 39 | The Longest Night | 30 | pumpkin×22 + skull×22 | ice×4 lock×2 slime×2 | — | 2/17 | l30 | 13 | 10 | 0.43 |
| 40 | Count Dracula | 30 | boss 16 + pumpkin×15 | web×3 + boss | 16/3 → lock | 0/18 | l30 | 15 | 9 | 0.50 |

(web = cobweb, stone = gravestone; boss rows read `hp/throwEvery → thrown id`.)

## Ship-pass notes

- **Curve review.** No level sits outside the calibrated band; the only 0.67+
  ratio is the Harvest Hoard gauntlet, mirroring shipped L3 (0.60). Casual wins
  are confined to openers, obstacle intros and breathers; every boss and
  gauntlet beats the casual line. Star curves were recomputed from the final
  best/decent lines, so 3★ stays a near-best line on every level.
- **Perf.** Boards stay ≤ 8×8 with at most 8 obstacle cells; level data adds no
  runtime cost beyond the existing render (sprites already cover every obstacle
  and power-up). Verified the built bundle in headless Chrome with no page
  exceptions or failed requests across chapter openers, both castle bosses, the
  narrow tower and the 40-door map.
- **Idle hint.** The idle hint (`HINT_DELAY`, ~5 s, `src/game/play.ts`) is
  play-screen territory and already fires on every board state the new levels
  produce (`findHint` is total — every level verified to have an opening move
  and reshuffles are engine-side). No change needed.
- **Map knob handoff.** The alley map splits segments every
  `LEVELS_PER_CHAPTER = 6` doors (`src/meta/chapters.ts`), while the concept
  chapters run 7-6-7-7-7-6 with bosses at L7, L13, L20, L27, L34, L37 and L40.
  No constant satisfies that shape; content bosses therefore don't all land on
  map boss doors. Meta-side follow-up if the mismatch matters visually.

## QA checklist

- [x] `pnpm check` green (tsc + engine tests, all 40 levels construct).
- [x] `biome check` clean on all touched files.
- [x] `pnpm build` green.
- [x] All 40 levels load, have an opening move, and satisfy loader invariants
      (unique playable obstacle cells, boss hp = goal hits, stars ≤ moves).
- [x] Every level winnable with slack: best line ≤ budget − 4 on all 40.
- [x] Decent line wins on all 40 (no decent losses; three seeds per level).
- [x] Headless-Chrome smoke: L14/20/23/27/36/40 HUD (name, moves, goal chips),
      40-door map star total and final chapter label, zero page errors.
