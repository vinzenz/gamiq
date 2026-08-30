import type { RawLevel } from '../engine/goals.ts'

/**
 * L7 — Count Snackula: the first boss house (Maple Lane finale). The count
 * squats mid-board behind a pair of webs and hurls fresh cobwebs every four
 * moves, so the chapter's obstacle stays relevant while the player learns
 * the boss loop: park matches and power-ups next to the monster until it
 * pops. Small hp pool keeps the first boss a lesson, not a wall.
 */
export const level7 = {
  id: 7,
  name: 'Count Snackula',
  seed: 20267,
  moves: 20,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2 },
  obstacles: [
    { x: 2, y: 3, modifier: 'cobweb-1' },
    { x: 3, y: 3, modifier: 'boss' },
    { x: 4, y: 3, modifier: 'cobweb-1' },
  ],
  boss: { hp: 6, throwEvery: 4, throws: 'cobweb-1' },
  goals: [{ kind: 'boss', hits: 6 }],
  starThresholds: [5, 12],
} satisfies RawLevel
