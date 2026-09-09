import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L22 — Spring the Cages: the whole harvest is locked up. Five caged
 * treats scattered across a wide board make the clear-all-locks goal a
 * colour-hunt — each cage needs its own colour match beside it, or any
 * power-up footprint. The little ghost is the shortcut: it homes on goal
 * treats and pops cages on the way.
 */
export const level22 = {
  id: 22,
  name: 'Spring the Cages',
  seed: 20282,
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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 2, y: 2, modifier: 'lock' },
    { x: 5, y: 2, modifier: 'lock' },
    { x: 1, y: 4, modifier: 'lock' },
    { x: 3, y: 4, modifier: 'lock' },
    { x: 5, y: 6, modifier: 'lock' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'lock' },
    { kind: 'collect', color: 'purple', count: 10 },
  ],
  starThresholds: [2, 16],
} satisfies RawLevel
