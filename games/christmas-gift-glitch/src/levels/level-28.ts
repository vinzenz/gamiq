import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L28 — Hillside Wake: Cemetery Hill opens easy on purpose — the breather
 * after the Gourd Golem. Two thin webs and two one-hit stones on a wide
 * board, one modest colour goal, and the chapter's softest budget: a
 * reminder lap of every blocker so far before the mixes get serious.
 */
export const level28 = {
  id: 28,
  name: 'Hillside Wake',
  seed: 20288,
  moves: 20,
  shape: [
    '#......#',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ],
  tileTypes: { red: 2, blue: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 2, y: 3, modifier: 'cover-1' },
    { x: 5, y: 3, modifier: 'cover-1' },
    { x: 3, y: 5, modifier: 'blocker-1' },
    { x: 4, y: 5, modifier: 'blocker-1' },
  ],
  goals: [{ kind: 'collect', color: 'green', count: 12 }],
  starThresholds: [14, 15],
} satisfies RawLevel
