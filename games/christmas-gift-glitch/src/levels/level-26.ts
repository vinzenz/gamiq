import type { RawLevel } from '@gamiq/swap3/goals'

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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2, green: 2 },
  obstacles: [
    { x: 1, y: 1, modifier: 'lock' },
    { x: 5, y: 1, modifier: 'lock' },
    { x: 2, y: 3, modifier: 'lock' },
    { x: 4, y: 3, modifier: 'lock' },
    { x: 1, y: 6, modifier: 'spreader-3' },
    { x: 5, y: 6, modifier: 'spreader-3' },
  ],
  goals: [
    { kind: 'collect', color: 'pink', count: 13 },
    { kind: 'collect', color: 'ivory', count: 13 },
  ],
  starThresholds: [1, 10],
} satisfies RawLevel
