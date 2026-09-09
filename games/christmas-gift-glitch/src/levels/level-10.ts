import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L10 — Basket at the Gate: the deliver lesson. Candy matched on the bottom
 * row (or blasted off it) drops into the basket; three deliveries teach the
 * "work the bottom" habit while a colour goal keeps ordinary matching
 * paying. Two double-layer webs guard the lanes down to the basket.
 */
export const level10 = {
  id: 10,
  name: 'Basket at the Gate',
  seed: 20270,
  moves: 30,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 4 },
  obstacles: [
    { x: 1, y: 5, modifier: 'cover-2' },
    { x: 5, y: 5, modifier: 'cover-2' },
  ],
  goals: [
    { kind: 'deliver', color: 'pink', count: 2 },
    { kind: 'collect', color: 'blue', count: 12 },
  ],
  starThresholds: [2, 6],
} satisfies RawLevel
