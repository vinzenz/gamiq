import type { RawLevel } from '@gamiq/swap3/goals'

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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2 },
  obstacles: [{ x: 3, y: 3, modifier: 'spreader-3' }],
  goals: [
    { kind: 'collect', color: 'blue', count: 12 },
    { kind: 'collect', color: 'red', count: 12 },
  ],
  starThresholds: [8, 11],
} satisfies RawLevel
