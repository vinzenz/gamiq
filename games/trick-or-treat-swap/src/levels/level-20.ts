import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L20 — Mother Hex: the Witch's Hollow finale. The hex-mother squats behind
 * two thick webs mid-board and breathes frost on a fresh tile every four
 * moves, so the ice lesson keeps applying while the player learns the boss
 * loop for the third time. A potion goal keeps ordinary matching paying
 * while the boss hunt is on.
 */
export const level20 = {
  id: 20,
  name: 'Mother Hex',
  seed: 20280,
  moves: 26,
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
    { x: 3, y: 3, modifier: 'cover-2' },
    { x: 4, y: 3, modifier: 'boss' },
    { x: 5, y: 3, modifier: 'cover-2' },
  ],
  boss: { hp: 10, throwEvery: 4, throws: 'ice' },
  goals: [
    { kind: 'boss', hits: 10 },
    { kind: 'collect', color: 'green', count: 12 },
  ],
  starThresholds: [10, 17],
} satisfies RawLevel
