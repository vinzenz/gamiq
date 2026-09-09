import type { RawLevel } from '@gamiq/swap3/goals'

/**
 * L27 — The Gourd Golem: the Pumpkin Patch finale. A carved colossus
 * caged between two locks hurls fresh slime onto the field every four
 * moves — its own goo keeps coming back, so the slime lesson applies under
 * a boss clock for the first time. A candy goal keeps the basket-lesson
 * colours paying while it lasts.
 */
export const level27 = {
  id: 27,
  name: 'The Gourd Golem',
  seed: 20287,
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
  tileTypes: { red: 2, blue: 2, ivory: 2, purple: 2, pink: 2 },
  obstacles: [
    { x: 3, y: 3, modifier: 'lock' },
    { x: 4, y: 3, modifier: 'boss' },
    { x: 5, y: 3, modifier: 'lock' },
  ],
  boss: { hp: 11, throwEvery: 4, throws: 'spreader-3' },
  goals: [
    { kind: 'boss', hits: 11 },
    { kind: 'collect', color: 'pink', count: 12 },
  ],
  starThresholds: [0, 20],
} satisfies RawLevel
