import type { RawLevel } from '@gamiq/swap3/goals'

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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 2, y: 3, modifier: 'blocker-1' },
    { x: 3, y: 4, modifier: 'blocker-1' },
    { x: 4, y: 3, modifier: 'blocker-1' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'blocker-1' },
    { kind: 'collect', color: 'purple', count: 14 },
  ],
  starThresholds: [3, 8],
} satisfies RawLevel
