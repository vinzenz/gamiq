import type { RawLevel } from '../engine/goals.ts'

/**
 * L34 — The Hill King: the Cemetery Hill finale. The crowned wraith
 * squats behind thick webs and every three moves plants a two-hit
 * gravestone on the field — occupant pressure that dams columns until
 * broken, the meanest throw in the game so far. A skull goal keeps the
 * graveyard theme paying while the siege is on.
 */
export const level34 = {
  id: 34,
  name: 'The Hill King',
  seed: 20294,
  moves: 28,
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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, potion: 2 },
  obstacles: [
    { x: 3, y: 3, modifier: 'cobweb-2' },
    { x: 4, y: 3, modifier: 'boss' },
    { x: 5, y: 3, modifier: 'cobweb-2' },
  ],
  boss: { hp: 13, throwEvery: 3, throws: 'gravestone-2' },
  goals: [
    { kind: 'boss', hits: 13 },
    { kind: 'collect', color: 'skull', count: 12 },
  ],
  starThresholds: [4, 19],
} satisfies RawLevel
