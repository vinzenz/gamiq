import type { RawLevel } from '../engine/goals.ts'

/**
 * L35 — The Castle Gate: the finale chapter opens with a breather. Three
 * thin webs on an open board, two moderate colour goals, and a budget with
 * room to spare — a calm lap after the Hill King before the castle's two
 * boss houses. Cross sweeps (broom + broom) clear the webs comfortably.
 */
export const level35 = {
  id: 35,
  name: 'The Castle Gate',
  seed: 20295,
  moves: 18,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, candy: 2, potion: 2 },
  obstacles: [
    { x: 1, y: 2, modifier: 'cobweb-1' },
    { x: 3, y: 4, modifier: 'cobweb-1' },
    { x: 5, y: 6, modifier: 'cobweb-1' },
  ],
  goals: [
    { kind: 'collect', color: 'ghost', count: 12 },
    { kind: 'collect', color: 'candy', count: 12 },
  ],
  starThresholds: [12, 13],
} satisfies RawLevel
