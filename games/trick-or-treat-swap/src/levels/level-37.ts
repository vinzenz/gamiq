import type { RawLevel } from '../engine/goals.ts'

/**
 * L37 — The Rat King: first of the castle's two boss houses. The king
 * gnaws behind thin webs and every three moves spins a double-layer web
 * over a fresh tile — overlay pressure that thickens until swept. Ghost
 * goals keep the board paying; the boss is a straight fight with a
 * tighter clock than any chapter boss before it.
 */
export const level37 = {
  id: 37,
  name: 'The Rat King',
  seed: 20297,
  moves: 28,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, potion: 2 },
  obstacles: [
    { x: 2, y: 3, modifier: 'cobweb-1' },
    { x: 3, y: 3, modifier: 'boss' },
    { x: 4, y: 3, modifier: 'cobweb-1' },
  ],
  boss: { hp: 13, throwEvery: 3, throws: 'cobweb-2' },
  goals: [
    { kind: 'boss', hits: 13 },
    { kind: 'collect', color: 'ghost', count: 12 },
  ],
  starThresholds: [12, 19],
} satisfies RawLevel
