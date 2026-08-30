import type { RawLevel } from '../engine/goals.ts'

/**
 * L15 — Crack the Glaze: the whole middle of the board is glazed over.
 * Eight frozen treats in a blob mean every lane eventually needs an
 * adjacent match, and the clear-all-ice goal makes the cold front the
 * objective, not scenery. Corner cuts keep the two top lanes short.
 */
export const level15 = {
  id: 15,
  name: 'Crack the Glaze',
  seed: 20275,
  moves: 17,
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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, potion: 2 },
  obstacles: [
    { x: 2, y: 2, modifier: 'ice' },
    { x: 5, y: 2, modifier: 'ice' },
    { x: 3, y: 3, modifier: 'ice' },
    { x: 4, y: 3, modifier: 'ice' },
    { x: 2, y: 4, modifier: 'ice' },
    { x: 5, y: 4, modifier: 'ice' },
    { x: 3, y: 5, modifier: 'ice' },
    { x: 4, y: 5, modifier: 'ice' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'ice' },
    { kind: 'collect', color: 'bat', count: 14 },
  ],
  starThresholds: [2, 9],
} satisfies RawLevel
