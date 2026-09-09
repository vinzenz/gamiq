import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L25 — Bramble Baskets: deliveries across a caged, webbed field. Three
 * locks dam the middle lanes and a pair of webs glues the approach rows,
 * so the candy has to be worked down deliberately. Candy-weighted spawns
 * keep the basket fed; a ghost goal keeps the rest of the board paying.
 */
export const level25 = {
  id: 25,
  name: 'Bramble Baskets',
  seed: 20285,
  moves: 28,
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
  tileTypes: { red: 2, blue: 2, ivory: 2, pink: 3, purple: 2 },
  obstacles: [
    { x: 1, y: 3, modifier: 'lock' },
    { x: 6, y: 3, modifier: 'lock' },
    { x: 3, y: 4, modifier: 'lock' },
    { x: 2, y: 5, modifier: 'cover-1' },
    { x: 5, y: 5, modifier: 'cover-1' },
  ],
  goals: [
    { kind: 'deliver', color: 'pink', count: 3 },
    { kind: 'collect', color: 'blue', count: 12 },
  ],
  starThresholds: [8, 19],
} satisfies RawLevel
