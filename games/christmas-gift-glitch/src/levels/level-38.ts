import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L38 — Tower Steps: the breather between the castle's two boss houses.
 * A pair of locks, a soft deliver goal and a generous budget — the pause
 * on the stairs before the long night. Candy-weighted spawns keep the
 * basket fed while a potion goal covers the rest of the tower.
 */
export const level38 = {
  id: 38,
  name: 'Tower Steps',
  seed: 20298,
  moves: 26,
  shape: [
    '#......#',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ],
  tileTypes: { red: 2, blue: 2, ivory: 2, pink: 3, green: 2 },
  obstacles: [
    { x: 2, y: 2, modifier: 'lock' },
    { x: 5, y: 4, modifier: 'lock' },
  ],
  goals: [
    { kind: 'deliver', color: 'pink', count: 1 },
    { kind: 'collect', color: 'green', count: 8 },
  ],
  starThresholds: [20, 21],
} satisfies RawLevel
