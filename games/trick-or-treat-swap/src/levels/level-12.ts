import type { RawLevel } from '../engine/goals.ts'

/**
 * L12 — The Long Row: the pre-boss gauntlet. Everything Graveyard Path has
 * taught so far in one board — deliveries, a colour goal, webs and two-hit
 * stones — with the tightest budget of the chapter. Power-up combos are no
 * longer a bonus here, they are the sensible line.
 */
export const level12 = {
  id: 12,
  name: 'The Long Row',
  seed: 20272,
  moves: 28,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 3 },
  obstacles: [
    { x: 1, y: 2, modifier: 'cobweb-1' },
    { x: 5, y: 2, modifier: 'cobweb-1' },
    { x: 3, y: 4, modifier: 'cobweb-1' },
    { x: 2, y: 3, modifier: 'gravestone-2' },
    { x: 4, y: 3, modifier: 'gravestone-2' },
  ],
  goals: [
    { kind: 'deliver', color: 'candy', count: 3 },
    { kind: 'collect', color: 'pumpkin', count: 12 },
    { kind: 'clear-modifier', modifier: 'cobweb-1' },
  ],
  starThresholds: [4, 6],
} satisfies RawLevel
