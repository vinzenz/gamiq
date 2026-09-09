import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L16 — Webbed Willows: the chapter's obstacle meets the last one. Webs
 * glue their lanes down while ice locks the tiles below them, so the two
 * blockers have to be traded off — webs only peel to a direct match, ice
 * only cracks to a neighbouring one. The cauldron (straight match-5) is
 * the comfy way through a webbed lane.
 */
export const level16 = {
  id: 16,
  name: 'Webbed Willows',
  seed: 20276,
  moves: 12,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 1, y: 2, modifier: 'cover-2' },
    { x: 5, y: 2, modifier: 'cover-2' },
    { x: 3, y: 3, modifier: 'ice' },
    { x: 2, y: 5, modifier: 'ice' },
    { x: 4, y: 5, modifier: 'ice' },
  ],
  goals: [
    { kind: 'clear-modifier', modifier: 'ice' },
    { kind: 'collect', color: 'blue', count: 14 },
  ],
  starThresholds: [2, 6],
} satisfies RawLevel
