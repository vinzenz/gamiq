import type { RawLevel } from '@gamiq/swap3/goals'

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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 3, y: 3, modifier: 'cover-2' },
    { x: 4, y: 3, modifier: 'boss' },
    { x: 5, y: 3, modifier: 'cover-2' },
  ],
  boss: { hp: 13, throwEvery: 3, throws: 'blocker-2' },
  goals: [
    { kind: 'boss', hits: 13 },
    { kind: 'collect', color: 'ivory', count: 12 },
  ],
  starThresholds: [4, 19],
} satisfies RawLevel
