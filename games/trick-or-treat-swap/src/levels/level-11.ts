import type { RawLevel } from '../engine/goals.ts'

/**
 * L11 — Fog Between Graves: the full chapter-2 mix on six colours. Layered
 * webs need repeat hits, stones sit next to webs so neither is trivially
 * reached, and two fat colour goals keep every clear counting. The level
 * where the little-ghost combos taught by the tutorial (ghost + ghost,
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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2, potion: 2 },
  obstacles: [
    { x: 1, y: 2, modifier: 'cobweb-2' },
    { x: 6, y: 2, modifier: 'cobweb-2' },
    { x: 3, y: 3, modifier: 'cobweb-1' },
    { x: 4, y: 3, modifier: 'cobweb-1' },
    { x: 2, y: 5, modifier: 'gravestone-1' },
    { x: 5, y: 5, modifier: 'gravestone-1' },
  ],
  goals: [
    { kind: 'collect', color: 'potion', count: 15 },
    { kind: 'collect', color: 'skull', count: 15 },
  ],
  starThresholds: [1, 11],
} satisfies RawLevel
