import type { RawLevel } from '../engine/goals.ts'

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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2 },
  obstacles: [
    { x: 1, y: 1, modifier: 'cobweb-1' },
    { x: 5, y: 1, modifier: 'cobweb-1' },
    { x: 3, y: 3, modifier: 'cobweb-1' },
    { x: 1, y: 5, modifier: 'cobweb-1' },
    { x: 5, y: 5, modifier: 'cobweb-1' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'cobweb-1' },
    { kind: 'collect', color: 'ghost', count: 12 },
  ],
  starThresholds: [2, 8],
} satisfies RawLevel
