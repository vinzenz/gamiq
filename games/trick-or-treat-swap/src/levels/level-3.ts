import type { RawLevel } from '../engine/goals.ts'

/**
 * L3 — Broom Closet: match-4 lesson. A five-colour board keeps runs common
 * enough that a Witch's Broom (match 4 in a line) shows up within a few
 * moves and the tutorial overlay teaches the tap-to-sweep. Two chunky
 * collect goals give the broom something useful to plough through.
 */
export const level3 = {
  id: 3,
  name: 'Broom Closet',
  seed: 20263,
  moves: 10,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2 },
  goals: [
    { kind: 'collect', color: 'skull', count: 14 },
    { kind: 'collect', color: 'bat', count: 14 },
  ],
  starThresholds: [2, 5],
} satisfies RawLevel
