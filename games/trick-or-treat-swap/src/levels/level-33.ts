import type { RawLevel } from '../engine/goals.ts'

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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2, potion: 2 },
  obstacles: [
    { x: 4, y: 1, modifier: 'lock' },
    { x: 2, y: 2, modifier: 'ice' },
    { x: 5, y: 3, modifier: 'ice' },
    { x: 1, y: 4, modifier: 'lock' },
    { x: 3, y: 5, modifier: 'ice' },
    { x: 5, y: 6, modifier: 'gravestone-1' },
  ],
  goals: [
    { kind: 'collect', color: 'pumpkin', count: 20 },
    { kind: 'collect', color: 'bat', count: 20 },
  ],
  starThresholds: [2, 15],
} satisfies RawLevel
