import type { RawLevel } from '../engine/goals.ts'

/**
 * L26 — Harvest Hoard: the pre-boss gauntlet. Locks pinch the top and the
 * waist of the notched board, two slime patches creep in from the bottom
 * corners, and six colours spread the spawns thin on the chapter's
 * tightest budget — every combo taught since L6 earns its keep here.
 */
export const level26 = {
  id: 26,
  name: 'Harvest Hoard',
  seed: 20286,
  moves: 24,
  shape: ['.......', '.......', '.......', '#.....#', '#.....#', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2, potion: 2 },
  obstacles: [
    { x: 1, y: 1, modifier: 'lock' },
    { x: 5, y: 1, modifier: 'lock' },
    { x: 2, y: 3, modifier: 'lock' },
    { x: 4, y: 3, modifier: 'lock' },
    { x: 1, y: 6, modifier: 'slime-3' },
    { x: 5, y: 6, modifier: 'slime-3' },
  ],
  goals: [
    { kind: 'collect', color: 'candy', count: 13 },
    { kind: 'collect', color: 'skull', count: 13 },
  ],
  starThresholds: [1, 10],
} satisfies RawLevel
