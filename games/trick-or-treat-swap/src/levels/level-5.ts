import type { RawLevel } from '../engine/goals.ts'

/**
 * L5 — Bubbling Brew: completes the power-up set. Straight match-5s brew the
 * Magic Cauldron and 2×2 squares free a Little Ghost (five colours keep
 * squares common); the tutorial overlays introduce both plus the first combo
 * teaser (two brooms → Cross Sweep). All four power-ups are in play from
 * here on.
 */
export const level5 = {
  id: 5,
  name: 'Bubbling Brew',
  seed: 20265,
  moves: 12,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, bat: 2, candy: 2, potion: 2 },
  goals: [
    { kind: 'collect', color: 'potion', count: 16 },
    { kind: 'collect', color: 'candy', count: 16 },
  ],
  starThresholds: [2, 6],
} satisfies RawLevel
