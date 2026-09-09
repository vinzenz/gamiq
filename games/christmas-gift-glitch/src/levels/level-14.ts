import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L14 — Frostbite Fen: Witch's Hollow opens with cursed ice in its easiest
 * form. Four frozen treats sit apart from each other; any match beside one
 * cracks it free, so the level is a low-pressure lesson with a wide-open
 * board and a soft budget. Doubles as the breather after the Grave Warden.
 */
export const level14 = {
  id: 14,
  name: 'Frostbite Fen',
  seed: 20274,
  moves: 11,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { red: 2, blue: 2, ivory: 2, pink: 2, green: 2 },
  obstacles: [
    { x: 2, y: 3, modifier: 'ice' },
    { x: 4, y: 3, modifier: 'ice' },
    { x: 1, y: 5, modifier: 'ice' },
    { x: 5, y: 5, modifier: 'ice' },
  ],
  goals: [
    { kind: 'collect', color: 'green', count: 12 },
    { kind: 'collect', color: 'pink', count: 12 },
  ],
  starThresholds: [1, 5],
} satisfies RawLevel
