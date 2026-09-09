import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L18 — Toil and Trouble: six colours on a notched board, the Hollow's
 * mid-chapter step up. Ice pinches both the top and the bottom lanes and a
 * pair of webs sits in the waist of the mask, so colour goals (potion and
 * skull, the two spawn-rarest treats) need deliberate lane work, not luck.
 */
export const level18 = {
  id: 18,
  name: 'Toil and Trouble',
  seed: 20278,
  moves: 28,
  shape: ['.......', '.......', '.......', '#.....#', '#.....#', '.......', '.......', '.......'],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2, green: 2 },
  obstacles: [
    { x: 2, y: 1, modifier: 'ice' },
    { x: 4, y: 1, modifier: 'ice' },
    { x: 3, y: 3, modifier: 'cover-1' },
    { x: 3, y: 4, modifier: 'cover-1' },
    { x: 1, y: 6, modifier: 'ice' },
    { x: 5, y: 6, modifier: 'ice' },
  ],
  goals: [
    { kind: 'collect', color: 'green', count: 10 },
    { kind: 'collect', color: 'ivory', count: 10 },
  ],
  starThresholds: [4, 16],
} satisfies RawLevel
