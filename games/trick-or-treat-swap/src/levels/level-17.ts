import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L17 — Meltwater Basket: the deliver lesson returns, now across frozen
 * lanes. Four ice tiles straddle the rows above the basket, so the bottom
 * has to be thawed before candy can flow into it. Candy-weighted spawns
 * keep deliveries coming; a potion goal keeps the rest of the board busy.
 */
export const level17 = {
  id: 17,
  name: 'Meltwater Basket',
  seed: 20277,
  moves: 30,
  shape: [
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ],
  tileTypes: { red: 2, blue: 2, ivory: 2, pink: 3, green: 2 },
  obstacles: [
    { x: 1, y: 4, modifier: 'ice' },
    { x: 6, y: 4, modifier: 'ice' },
    { x: 3, y: 5, modifier: 'ice' },
    { x: 4, y: 5, modifier: 'ice' },
  ],
  goals: [
    { kind: 'deliver', color: 'pink', count: 3 },
    { kind: 'collect', color: 'green', count: 12 },
  ],
  starThresholds: [4, 21],
} satisfies RawLevel
