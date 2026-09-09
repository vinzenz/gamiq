import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L19 — Hex on the Wind: the pre-boss gauntlet. Ice caps three lanes up
 * top, two thick webs guard the middle, and the budget is the tightest of
 * the chapter — the combo taught on this street (ghost + bomb, bomb + bomb)
 * is the sensible line, not a luxury. Two fat colour goals punish dawdling.
 */
export const level19 = {
  id: 19,
  name: 'Hex on the Wind',
  seed: 20279,
  moves: 20,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '#.....#', '#.....#'],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 1, y: 2, modifier: 'ice' },
    { x: 3, y: 2, modifier: 'ice' },
    { x: 5, y: 2, modifier: 'ice' },
    { x: 2, y: 4, modifier: 'cover-2' },
    { x: 4, y: 4, modifier: 'cover-2' },
    { x: 3, y: 5, modifier: 'ice' },
  ],
  goals: [
    { kind: 'collect', color: 'red', count: 17 },
    { kind: 'collect', color: 'purple', count: 17 },
  ],
  starThresholds: [4, 12],
} satisfies RawLevel
