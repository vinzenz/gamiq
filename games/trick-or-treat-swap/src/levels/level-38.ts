import type { RawLevel } from '../engine/goals.ts'

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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, candy: 3, potion: 2 },
  obstacles: [
    { x: 2, y: 2, modifier: 'lock' },
    { x: 5, y: 4, modifier: 'lock' },
  ],
  goals: [
    { kind: 'deliver', color: 'candy', count: 1 },
    { kind: 'collect', color: 'potion', count: 8 },
  ],
  starThresholds: [20, 21],
} satisfies RawLevel
