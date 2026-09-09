import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L39 — The Longest Night: the last gauntlet before the count. Six
 * colours, every blocker on one board — ice up top, locks in the waist,
 * slime creeping from the bottom corners — and the campaign's tightest
 * budget. The full combo matrix is the intended line; the two fat colour
 * goals barely fit even then.
 */
export const level39 = {
  id: 39,
  name: 'The Longest Night',
  seed: 20299,
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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2, green: 2 },
  obstacles: [
    { x: 2, y: 1, modifier: 'ice' },
    { x: 5, y: 1, modifier: 'ice' },
    { x: 3, y: 3, modifier: 'lock' },
    { x: 4, y: 3, modifier: 'lock' },
    { x: 1, y: 5, modifier: 'ice' },
    { x: 6, y: 5, modifier: 'ice' },
    { x: 2, y: 6, modifier: 'spreader-3' },
    { x: 5, y: 6, modifier: 'spreader-3' },
  ],
  goals: [
    { kind: 'collect', color: 'red', count: 22 },
    { kind: 'collect', color: 'ivory', count: 22 },
  ],
  starThresholds: [2, 17],
} satisfies RawLevel
