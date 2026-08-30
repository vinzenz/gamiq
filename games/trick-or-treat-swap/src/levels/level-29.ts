import type { RawLevel } from '../engine/goals.ts'

/**
 * L29 — Frost on the Slabs: the cemetery at hard frost. Cursed ice caps
 * the same lanes the stones dam, and both clear goals must fill — ice
 * cracks beside matches while stones need them, so the two blockers teach
 * opposite habits on one board. A bat goal keeps the score moving.
 */
export const level29 = {
  id: 29,
  name: 'Frost on the Slabs',
  seed: 20289,
  moves: 26,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, potion: 2 },
  obstacles: [
    { x: 2, y: 2, modifier: 'ice' },
    { x: 4, y: 2, modifier: 'ice' },
    { x: 1, y: 4, modifier: 'gravestone-2' },
    { x: 5, y: 4, modifier: 'gravestone-2' },
    { x: 3, y: 5, modifier: 'ice' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'ice' },
    { kind: 'clear-modifier', modifier: 'gravestone-2' },
    { kind: 'collect', color: 'bat', count: 14 },
  ],
  starThresholds: [16, 19],
} satisfies RawLevel
