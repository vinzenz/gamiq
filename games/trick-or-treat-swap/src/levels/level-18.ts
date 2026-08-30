import type { RawLevel } from '../engine/goals.ts'

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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2, potion: 2 },
  obstacles: [
    { x: 2, y: 1, modifier: 'ice' },
    { x: 4, y: 1, modifier: 'ice' },
    { x: 3, y: 3, modifier: 'cobweb-1' },
    { x: 3, y: 4, modifier: 'cobweb-1' },
    { x: 1, y: 6, modifier: 'ice' },
    { x: 5, y: 6, modifier: 'ice' },
  ],
  goals: [
    { kind: 'collect', color: 'potion', count: 10 },
    { kind: 'collect', color: 'skull', count: 10 },
  ],
  starThresholds: [4, 16],
} satisfies RawLevel
