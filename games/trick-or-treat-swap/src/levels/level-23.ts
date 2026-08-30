import type { RawLevel } from '../engine/goals.ts'

/**
 * L23 — Goo on the Vines: slime arrives, one blob in the middle. The goo
 * eats a neighbouring tile every third move unless a match beside it
 * dissolves it, so the lesson is simple: attend to the goo while the two
 * modest colour goals fill. Its cell also dams its column — tiles stack
 * behind it until it pops.
 */
export const level23 = {
  id: 23,
  name: 'Goo on the Vines',
  seed: 20283,
  moves: 18,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2 },
  obstacles: [{ x: 3, y: 3, modifier: 'slime-3' }],
  goals: [
    { kind: 'collect', color: 'ghost', count: 12 },
    { kind: 'collect', color: 'pumpkin', count: 12 },
  ],
  starThresholds: [8, 11],
} satisfies RawLevel
