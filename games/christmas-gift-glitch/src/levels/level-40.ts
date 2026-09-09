import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L40 — Count Dracula: the last door on the alley. The count sits behind
 * triple-layer webs, hits harder than every boss before him (16), and
 * every three moves snaps a lock over a fresh treat — the board slowly
 * cages itself unless the player keeps springing colours. A pumpkin goal
 * keeps the score ticking through the longest fight in the game.
 */
export const level40 = {
  id: 40,
  name: 'Count Dracula',
  seed: 20300,
  moves: 30,
  shape: [
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ],
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, green: 2 },
  obstacles: [
    { x: 3, y: 3, modifier: 'cover-3' },
    { x: 4, y: 3, modifier: 'boss' },
    { x: 5, y: 3, modifier: 'cover-3' },
  ],
  boss: { hp: 16, throwEvery: 3, throws: 'lock' },
  goals: [
    { kind: 'boss', hits: 16 },
    { kind: 'collect', color: 'red', count: 15 },
  ],
  starThresholds: [0, 18],
} satisfies RawLevel
