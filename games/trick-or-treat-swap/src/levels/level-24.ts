import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L24 — The Creeping Rows: three slime patches and no time to waste. The
 * goo spreads on its own three-move clock and eats tiles, so a big potion
 * goal has to be filled while the field keeps shrinking — the broom
 * brigade combo (broom + cauldron, taught at L9) sweeps whole goo rows at
 * once and is the comfortable line here.
 */
export const level24 = {
  id: 24,
  name: 'The Creeping Rows',
  seed: 20284,
  moves: 20,
  shape: [
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 2, y: 2, modifier: 'spreader-3' },
    { x: 5, y: 4, modifier: 'spreader-3' },
    { x: 3, y: 6, modifier: 'spreader-3' },
  ],
  goals: [{ kind: 'collect', color: 'green', count: 24 }],
  starThresholds: [2, 12],
} satisfies RawLevel
