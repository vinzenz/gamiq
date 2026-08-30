import type { RawLevel } from '../engine/goals.ts'

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
  tileTypes: { pumpkin: 1, ghost: 1, skull: 1, bat: 1 },
  goals: [{ kind: 'collect', color: 'pumpkin', count: 12 }],
  starThresholds: [3, 4],
} satisfies RawLevel
