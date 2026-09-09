import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L30 — Tombs in the Ooze: the Patch's blockers seep into the cemetery.
 * Two slime patches ooze between caged treats while a fat pumpkin goal
 * ticks — goo eats tiles the player needs, locks dam the columns the goo
 * spreads through, and the two pressures compound on the mid budget.
 */
export const level30 = {
  id: 30,
  name: 'Tombs in the Ooze',
  seed: 20290,
  moves: 18,
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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2 },
  obstacles: [
    { x: 2, y: 3, modifier: 'spreader-3' },
    { x: 5, y: 3, modifier: 'spreader-3' },
    { x: 1, y: 5, modifier: 'lock' },
    { x: 6, y: 5, modifier: 'lock' },
    { x: 3, y: 6, modifier: 'lock' },
    { x: 4, y: 6, modifier: 'lock' },
  ],
  goals: [{ kind: 'collect', color: 'red', count: 18 }],
  starThresholds: [4, 11],
} satisfies RawLevel
