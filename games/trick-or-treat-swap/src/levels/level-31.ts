import type { RawLevel } from '../engine/goals.ts'

/**
 * L31 — The Last Wreath: the hill's delivery run. Four frozen tiles sit
 * right across the lanes into the basket, so the bottom has to be thawed
 * while candy-weighted spawns pour treats down. The tightest deliver
 * budget yet; working the bottom row is no longer a habit, it is required.
 */
export const level31 = {
  id: 31,
  name: 'The Last Wreath',
  seed: 20291,
  moves: 30,
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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, candy: 3, potion: 2 },
  obstacles: [
    { x: 3, y: 4, modifier: 'ice' },
    { x: 4, y: 4, modifier: 'ice' },
    { x: 1, y: 5, modifier: 'ice' },
    { x: 6, y: 5, modifier: 'ice' },
  ],
  goals: [
    { kind: 'deliver', color: 'candy', count: 3 },
    { kind: 'collect', color: 'skull', count: 14 },
  ],
  starThresholds: [14, 22],
} satisfies RawLevel
