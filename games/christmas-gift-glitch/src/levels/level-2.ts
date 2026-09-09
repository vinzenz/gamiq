import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L2 — Maple Lane 2: the first shaped board (top corners cut, so the mask
 * and its hollow cells get exercised) plus a two-colour collect goal.
 * Teaches that goals stack: both chips must fill before the door opens.
 */
export const level2 = {
  id: 2,
  name: 'Maple Lane 2',
  seed: 20262,
  moves: 20,
  shape: ['##...##', '#.....#', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { red: 3, blue: 3, ivory: 2, purple: 2, pink: 2 },
  goals: [
    { kind: 'collect', color: 'blue', count: 12 },
    { kind: 'collect', color: 'pink', count: 12 },
  ],
  starThresholds: [4, 10],
} satisfies RawLevel
