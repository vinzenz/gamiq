import type { RawLevel } from '../engine/goals.ts'

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
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 2, candy: 2 },
  obstacles: [
    { x: 3, y: 3, modifier: 'lock' },
    { x: 4, y: 3, modifier: 'boss' },
    { x: 5, y: 3, modifier: 'lock' },
  ],
  boss: { hp: 11, throwEvery: 4, throws: 'slime-3' },
  goals: [
    { kind: 'boss', hits: 11 },
    { kind: 'collect', color: 'candy', count: 12 },
  ],
  starThresholds: [0, 20],
} satisfies RawLevel
