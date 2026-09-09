import type { RawLevel } from '@gamiq/swap3/goals'

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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2, green: 2 },
  obstacles: [
    { x: 1, y: 3, modifier: 'cover-2' },
    { x: 5, y: 3, modifier: 'cover-2' },
    { x: 3, y: 5, modifier: 'cover-2' },
  ],
  goals: [
    { kind: 'collect', color: 'green', count: 16 },
    { kind: 'collect', color: 'pink', count: 16 },
  ],
  starThresholds: [4, 20],
} satisfies RawLevel
