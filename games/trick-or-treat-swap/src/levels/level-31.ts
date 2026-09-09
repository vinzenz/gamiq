import type { RawLevel } from '@gamiq/swap3/goals'

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
  tileTypes: { red: 2, blue: 2, ivory: 2, pink: 3, green: 2 },
  obstacles: [
    { x: 3, y: 4, modifier: 'ice' },
    { x: 4, y: 4, modifier: 'ice' },
    { x: 1, y: 5, modifier: 'ice' },
    { x: 6, y: 5, modifier: 'ice' },
  ],
  goals: [
    { kind: 'deliver', color: 'pink', count: 3 },
    { kind: 'collect', color: 'ivory', count: 14 },
  ],
  starThresholds: [14, 22],
} satisfies RawLevel
