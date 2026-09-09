import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L1 — Maple Lane 1: plain match-3 tutorial. Four colours and a small
 * collect goal, so the first door is almost impossible to fail; the tutorial
 * overlay walks the player through their first swap.
 */
export const level1 = {
  id: 1,
  name: 'Maple Lane 1',
  seed: 20261,
  moves: 8,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { red: 1, blue: 1, ivory: 1, purple: 1 },
  goals: [{ kind: 'collect', color: 'red', count: 12 }],
  starThresholds: [3, 4],
} satisfies RawLevel
