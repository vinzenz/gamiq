import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L4 — Pumpkin Carving: the Pumpkin Bomb lesson. L/T match-5s need a fifth
 * colour to happen at a sane rate, so the palette widens here; the goals are
 * fat enough that a 3×3 blast (or three) is the comfortable way to finish.
 */
export const level4 = {
  id: 4,
  name: 'Pumpkin Carving',
  seed: 20264,
  moves: 16,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2 },
  goals: [
    { kind: 'collect', color: 'red', count: 15 },
    { kind: 'collect', color: 'pink', count: 15 },
  ],
  starThresholds: [3, 11],
} satisfies RawLevel
