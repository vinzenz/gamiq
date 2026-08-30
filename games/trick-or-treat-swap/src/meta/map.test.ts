import { deepStrictEqual, equal, ok } from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CHAPTERS,
  chapterOf,
  chapterSpans,
  isChapterFinal,
  layoutDoors,
  NODE_STEP,
} from './chapters.ts'
import { avatarStart, totalStars, unlockedIndex } from './progress.ts'

/** Stand-in campaign with ids 1–7 (like the real LEVELS, keyed by id). */
const campaign = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id }))

describe('alley chapters', () => {
  it('groups levels into six-door segments, last one short', () => {
    deepStrictEqual(chapterSpans(13), [
      { chapter: 0, first: 0, last: 5 },
      { chapter: 1, first: 6, last: 11 },
      { chapter: 2, first: 12, last: 12 },
    ])
  })

  it('maps levels to chapters and marks chapter finals as boss houses', () => {
    equal(chapterOf(0), 0)
    equal(chapterOf(5), 0)
    equal(chapterOf(6), 1)
    equal(isChapterFinal(5, 13), true)
    equal(isChapterFinal(4, 13), false)
    equal(isChapterFinal(11, 13), true)
    equal(isChapterFinal(12, 13), true)
  })

  it('clamps to the last defined theme beyond the six chapters', () => {
    equal(chapterOf(600), CHAPTERS.length - 1)
    equal(chapterSpans(601).at(-1)?.chapter, CHAPTERS.length - 1)
  })

  it('lays doors bottom-up in a zigzag with wider chapter gaps', () => {
    const { nodes, contentHeight } = layoutDoors(390, 13)
    equal(nodes.length, 13)
    const [first, second] = nodes
    const sixth = nodes[5]
    const seventh = nodes[6]
    const last = nodes[12]
    ok(first && second && sixth && seventh && last)
    ok(first.y > second.y, 'level 1 sits at the bottom of the strip')
    ok(first.x < second.x, 'doors alternate sides')
    equal(first.y - second.y, NODE_STEP)
    equal(sixth.y - seventh.y, NODE_STEP + 74, 'chapter boundary adds an extra gap')
    ok(contentHeight > last.y)
    equal(nodes[5]?.boss, true, 'sixth door closes its chapter')
    equal(last.boss, true, 'campaign finale is a boss house')
  })

  it('keeps x positions inside the viewport at any width', () => {
    for (const width of [320, 390, 768, 1200]) {
      const { nodes } = layoutDoors(width, 13)
      for (const node of nodes) {
        ok(node.x >= 44 && node.x <= width - 44, `x ${node.x} out of bounds at width ${width}`)
      }
    }
  })
})

describe('alley progression', () => {
  it('unlocks the first level without stars', () => {
    equal(unlockedIndex({}, campaign), 0)
    equal(unlockedIndex({ 1: 2 }, campaign), 1)
    equal(unlockedIndex({ 1: 3, 2: 1, 3: 2 }, campaign), 3)
  })

  it('keeps the last door replayable once the campaign is done', () => {
    const all = { 1: 3, 2: 2, 3: 3, 4: 1, 5: 2, 6: 3, 7: 1 }
    equal(unlockedIndex(all, campaign), 6)
  })

  it('caps stars at three per level for the total', () => {
    equal(totalStars({ 1: 3, 2: 1 }, campaign), 4)
    equal(totalStars({}, campaign), 0)
  })

  it('never starts the avatar ahead of the unlocked door', () => {
    equal(avatarStart({ avatar: 9 }, 3, 7), 3)
    equal(avatarStart({ avatar: 2 }, 3, 7), 2)
    equal(avatarStart({ avatar: 0 }, 0, 7), 0)
  })
})
