import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L11 — Fog Between Graves: the full chapter-2 mix on six colours. Layered
 * webs need repeat hits, stones sit next to webs so neither is trivially
 * reached, and two fat colour goals keep every clear counting. The level
 * where the homing combos taught by the tutorial (ghost + ghost,
 * ghost + bomb) earn their keep.
 */
export const level11 = {
  id: 11,
  name: 'Fog Between Graves',
  seed: 20271,
  moves: 28,
  shape: [
    '.##..##.',
    '#......#',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2, green: 2 },
  obstacles: [
    { x: 1, y: 2, modifier: 'cover-2' },
    { x: 6, y: 2, modifier: 'cover-2' },
    { x: 3, y: 3, modifier: 'cover-1' },
    { x: 4, y: 3, modifier: 'cover-1' },
    { x: 2, y: 5, modifier: 'blocker-1' },
    { x: 5, y: 5, modifier: 'blocker-1' },
  ],
  goals: [
    { kind: 'collect', color: 'green', count: 15 },
    { kind: 'collect', color: 'ivory', count: 15 },
  ],
  starThresholds: [1, 11],
} satisfies RawLevel
