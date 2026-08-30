import type { RawLevel } from '../engine/goals.ts'

/**
 * L21 — The Patch Gate: Pumpkin Patch opens with the lock in its easiest
 * form and doubles as the breather after Mother Hex. Three caged treats sit
 * wide apart; any match of the caged tile's colour springs it, so the level
 * is a gentle colour-lesson with a soft budget.
 */
export const level21 = {
  id: 21,
  name: 'The Patch Gate',
  seed: 20281,
  moves: 18,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2 },
  obstacles: [
    { x: 2, y: 2, modifier: 'lock' },
    { x: 4, y: 2, modifier: 'lock' },
    { x: 3, y: 4, modifier: 'lock' },
  ],
  goals: [
    { kind: 'collect', color: 'candy', count: 12 },
    { kind: 'collect', color: 'pumpkin', count: 10 },
  ],
  starThresholds: [6, 10],
} satisfies RawLevel
