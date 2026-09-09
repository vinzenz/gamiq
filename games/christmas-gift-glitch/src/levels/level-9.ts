import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L9 — Mossy Slabs: gravestones gain a second hit point and the webs come
 * back, mixing both chapter-2 obstacles for the first time. Wide 8-column
 * board with cut corners; the stones sit mid-column so their gravity
 * barrier matters (tiles stack on them until they break).
 */
export const level9 = {
  id: 9,
  name: 'Mossy Slabs',
  seed: 20269,
  moves: 15,
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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2 },
  obstacles: [
    { x: 2, y: 2, modifier: 'blocker-2' },
    { x: 5, y: 2, modifier: 'blocker-2' },
    { x: 1, y: 4, modifier: 'blocker-1' },
    { x: 6, y: 4, modifier: 'blocker-1' },
    { x: 3, y: 5, modifier: 'cover-1' },
    { x: 4, y: 5, modifier: 'cover-1' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'blocker-1' },
    { kind: 'clear-modifier', modifier: 'blocker-2' },
    { kind: 'collect', color: 'pink', count: 16 },
  ],
  starThresholds: [2, 8],
} satisfies RawLevel
