import type { RawLevel } from '../engine/goals.ts'

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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 4 },
  obstacles: [
    { x: 1, y: 5, modifier: 'cobweb-2' },
    { x: 5, y: 5, modifier: 'cobweb-2' },
  ],
  goals: [
    { kind: 'deliver', color: 'candy', count: 2 },
    { kind: 'collect', color: 'ghost', count: 12 },
  ],
  starThresholds: [2, 6],
} satisfies RawLevel
