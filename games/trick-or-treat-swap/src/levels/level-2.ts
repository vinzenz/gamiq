import type { RawLevel } from '../engine/goals.ts'

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
  tileTypes: { pumpkin: 3, ghost: 3, skull: 2, bat: 2, candy: 2 },
  goals: [
    { kind: 'collect', color: 'ghost', count: 12 },
    { kind: 'collect', color: 'candy', count: 12 },
  ],
  starThresholds: [4, 10],
} satisfies RawLevel
