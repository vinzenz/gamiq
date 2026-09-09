import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L6 — Webbed Porch: first obstacle, in its easiest form. Five single-layer
 * webs sit on ordinary tiles; one direct match each peels them. The
 * clear-modifier goal rides along with a colour goal, and the broom (from
 * L3) is the obvious shortcut — this is also where the first combo
 * (broom + broom → Cross Sweep) tends to occur naturally.
 */
export const level6 = {
  id: 6,
  name: 'Webbed Porch',
  seed: 20266,
  moves: 14,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2 },
  obstacles: [
    { x: 1, y: 1, modifier: 'cover-1' },
    { x: 5, y: 1, modifier: 'cover-1' },
    { x: 3, y: 3, modifier: 'cover-1' },
    { x: 1, y: 5, modifier: 'cover-1' },
    { x: 5, y: 5, modifier: 'cover-1' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'cover-1' },
    { kind: 'collect', color: 'blue', count: 12 },
  ],
  starThresholds: [2, 8],
} satisfies RawLevel
