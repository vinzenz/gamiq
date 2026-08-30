import type { RawLevel } from '../engine/goals.ts'

/**
 * L8 — Headstone Row: Graveyard Path opens with the second obstacle. Three
 * single-hit gravestones clog the middle; only matches right beside them (or
 * a power-up footprint) chip them, and they never move or match themselves.
 * A broom from the combo lesson (broom + bomb is taught here) is the comfy
 * way to crack all three at once.
 */
export const level8 = {
  id: 8,
  name: 'Headstone Row',
  seed: 20268,
  moves: 16,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, potion: 2 },
  obstacles: [
    { x: 2, y: 3, modifier: 'gravestone-1' },
    { x: 3, y: 4, modifier: 'gravestone-1' },
    { x: 4, y: 3, modifier: 'gravestone-1' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'gravestone-1' },
    { kind: 'collect', color: 'bat', count: 14 },
  ],
  starThresholds: [3, 8],
} satisfies RawLevel
