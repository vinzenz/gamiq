import { deepStrictEqual, equal, ok } from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CHAPTERS,
  chapterOf,
  chapterSpans,
  isBossHouse,
  layoutDoors,
  NODE_STEP,
} from './chapters.ts'
import { pendingCelebration, totalStars, unlockedIndex } from './progress.ts'

/** Stand-in campaign with ids 1–7 (like the real LEVELS, keyed by id). */
const campaign = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id }))

describe('alley chapters', () => {
  it('splits the campaign along its boss doors (7/6/7/7/7/6)', () => {
    deepStrictEqual(chapterSpans(13), [
      { chapter: 0, first: 0, last: 6 },
      { chapter: 1, first: 7, last: 12 },
    ])
    deepStrictEqual(chapterSpans(40).at(-1), { chapter: 5, first: 34, last: 39 })
  })

  it('maps levels to chapters and marks boss houses', () => {
    equal(chapterOf(0), 0)
    equal(chapterOf(5), 0)
    equal(chapterOf(6), 0, 'door 7 is still chapter 1 — its final')
    equal(chapterOf(7), 1)
    equal(chapterOf(39), 5)
    equal(isBossHouse(6, 13), true, 'door 7 carries the chapter-1 boss')
    equal(isBossHouse(5, 13), false)
    equal(isBossHouse(12, 13), true, 'door 13 carries the chapter-2 boss')
    equal(isBossHouse(36, 40), true, 'castle mid-chapter boss (37)')
    equal(isBossHouse(39, 40), true, 'campaign finale (40)')
  })

  it('clamps to the last defined theme beyond the six chapters', () => {
    equal(chapterOf(600), CHAPTERS.length - 1)
    equal(chapterSpans(601).at(-1)?.chapter, CHAPTERS.length - 1)
  })

  it('lays doors bottom-up in a zigzag with wider chapter gaps', () => {
    const { nodes, contentHeight } = layoutDoors(390, 13)
    equal(nodes.length, 13)
    const [first, second] = nodes
    const seventh = nodes[6]
    const eighth = nodes[7]
    const last = nodes[12]
    ok(first && second && seventh && eighth && last)
    ok(first.y > second.y, 'level 1 sits at the bottom of the strip')
    ok(first.x < second.x, 'doors alternate sides')
    equal(first.y - second.y, NODE_STEP)
    equal(seventh.y - eighth.y, NODE_STEP + 74, 'chapter boundary adds an extra gap')
    ok(contentHeight > last.y)
    equal(seventh.boss, true, 'seventh door closes chapter 1 (Count Snackula)')
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

  it('celebrates only progress that is fresher than the last visit', () => {
    equal(pendingCelebration({ celebrated: 9 }, 3, 7), undefined, 'stale spot never re-celebrates')
    equal(pendingCelebration({ celebrated: 2 }, 3, 7), 3)
    equal(pendingCelebration({ celebrated: 5 }, 2, 7), undefined)
    equal(pendingCelebration({ celebrated: 0 }, 0, 7), undefined)
  })
})
