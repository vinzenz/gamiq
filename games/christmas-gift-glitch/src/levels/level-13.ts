import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L13 — The Grave Warden: the Graveyard Path finale. The warden floats in
 * the middle of the big board and every four moves raises a fresh
 * gravestone somewhere on the lawn, eating a tile — the occupant pressure
 * makes dawdling expensive, since stones block their columns until broken.
 * Two thick webs flank the boss. A pumpkin goal keeps the score ticking
 * while the boss hunt is on.
 */
export const level13 = {
  id: 13,
  name: 'The Grave Warden',
  seed: 20273,
  moves: 21,
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
  boss: { hp: 8, throwEvery: 4, throws: 'blocker-1' },
  goals: [
    { kind: 'boss', hits: 8 },
    { kind: 'collect', color: 'red', count: 10 },
  ],
  starThresholds: [3, 13],
} satisfies RawLevel
