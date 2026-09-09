import type { RawLevel } from '@gamiq/swap3/goals'

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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 2, y: 2, modifier: 'ice' },
    { x: 4, y: 2, modifier: 'ice' },
    { x: 1, y: 4, modifier: 'blocker-2' },
    { x: 5, y: 4, modifier: 'blocker-2' },
    { x: 3, y: 5, modifier: 'ice' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'ice' },
    { kind: 'clear-modifier', modifier: 'blocker-2' },
    { kind: 'collect', color: 'purple', count: 14 },
  ],
  starThresholds: [16, 19],
} satisfies RawLevel
