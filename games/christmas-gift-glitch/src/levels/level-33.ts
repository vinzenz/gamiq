import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L33 — The Crooked Stair: the chapter's gauntlet, on a stair-stepped mask
 * where gravity takes weird lines. Every blocker meets on one board — ice,
 * locks, a stone — and six colours spread the spawns thin on a budget that
 * assumes power-up play. The step corners also mean fewer horizontal
 * matches up top, so lanes matter more than usual.
 */
export const level33 = {
  id: 33,
  name: 'The Crooked Stair',
  seed: 20293,
  moves: 26,
  shape: [
    '#.......',
    '........',
    '........',
    '........',
    '........',
    '........',
    '.......#',
    '......##',
  ],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2, green: 2 },
  obstacles: [
    { x: 4, y: 1, modifier: 'lock' },
    { x: 2, y: 2, modifier: 'ice' },
    { x: 5, y: 3, modifier: 'ice' },
    { x: 1, y: 4, modifier: 'lock' },
    { x: 3, y: 5, modifier: 'ice' },
    { x: 5, y: 6, modifier: 'blocker-1' },
  ],
  goals: [
    { kind: 'collect', color: 'red', count: 20 },
    { kind: 'collect', color: 'purple', count: 20 },
  ],
  starThresholds: [2, 15],
} satisfies RawLevel
