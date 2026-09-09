# Christmas campaign levels

The Great Gift Glitch uses the same 40 board definitions, move budgets, goal curve, boss timing,
and power-up rules as Trick or Treat Swap. The shared rules live in `@gamiq/swap3`. This game adds
its own names, story, labels, art, map, and storage.

## Theme adapter

| Engine id | Christmas token or rule |
| --- | --- |
| `red` | bell |
| `blue` | snowflake |
| `ivory` | gingerbread cookie |
| `purple` | mitten |
| `pink` | candy cane |
| `green` | present |
| `sweep` | Rocket Sleigh |
| `blast` | Christmas Cracker |
| `prism` | Aurora Snow Globe |
| `homing` | Crumb Drone |
| `cover` | tinsel tangle |
| `blocker` | parcel pile |
| `ice` | deep frost |
| `lock` | ribbon lock |
| `spreader` | runaway wrapping paper |

The neutral IDs keep theme terms out of the rule package. A second game can supply another adapter
without copying or changing the engine.

## Campaign

The six map chapters contain 7, 6, 7, 7, 7, and 6 levels. Boss dispatches are 7, 13, 20, 27, 34,
37, and 40. `src/meta/story.ts` has one story beat for each level. The play HUD and map both read
that file, so story titles cannot drift between screens.

Every level must pass `loadLevel()`. The campaign test also checks that each starting board has no
pre-made match and has at least one legal move.

## Stars

A win earns one star. The two values in `starThresholds` are the moves-left limits for two and three
stars. The values remain equal to TOTS so both adapters have the same difficulty.
