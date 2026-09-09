import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L36 — The Dungeon Kitchen: a narrow tower board where every column is
 * precious. Four locks dam the tower and cursed ice caps the lower cells,
 * with the clear-all-locks goal forcing the colour hunt through the
 * narrow lanes. Dense boards mean lots of cascades — the cauldron shines.
 */
export const level36 = {
  id: 36,
  name: 'The Dungeon Kitchen',
  seed: 20296,
  moves: 26,
  shape: ['......', '......', '......', '......', '......', '......', '......', '......'],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 1, y: 1, modifier: 'lock' },
    { x: 4, y: 1, modifier: 'lock' },
    { x: 2, y: 4, modifier: 'lock' },
    { x: 3, y: 4, modifier: 'lock' },
    { x: 1, y: 6, modifier: 'ice' },
    { x: 4, y: 6, modifier: 'ice' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'lock' },
    { kind: 'collect', color: 'red', count: 14 },
  ],
  starThresholds: [2, 17],
} satisfies RawLevel
