import type { RawLevel } from '../engine/goals.ts'

/**
 * L32 — Six-Colour Storm: six colours and three thick webs on the cut
 * board. With spawns spread thin, both big colour goals need long lanes
 * cleared — but the webs dam exactly those lanes until peeled. The
 * triple-sweep (broom + bomb) and night-of-witches combos are the
 * honest lines; ordinary matching alone runs out of moves.
 */
export const level32 = {
  id: 32,
  name: 'Six-Colour Storm',
  seed: 20292,
  moves: 30,
  shape: ['##...##', '#.....#', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2, potion: 2 },
  obstacles: [
    { x: 1, y: 3, modifier: 'cobweb-2' },
    { x: 5, y: 3, modifier: 'cobweb-2' },
    { x: 3, y: 5, modifier: 'cobweb-2' },
  ],
  goals: [
    { kind: 'collect', color: 'potion', count: 16 },
    { kind: 'collect', color: 'candy', count: 16 },
  ],
  starThresholds: [4, 20],
} satisfies RawLevel
