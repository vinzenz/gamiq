import { ok, strictEqual, throws } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildLevelBoard, createLevelGame, loadLevel } from '@gamiq/swap3/goals'
import { detectShapes } from '@gamiq/swap3/match'
import { LEVELS, levelGame } from './index.ts'

describe('The Great Gift Glitch campaign', () => {
  it('loads all levels in play order', () => {
    for (const [index, raw] of LEVELS.entries()) {
      strictEqual(loadLevel(raw).id, index + 1)
    }
  })

  it('starts every level match-free with a move available', () => {
    for (const raw of LEVELS) {
      const level = loadLevel(raw)
      strictEqual(detectShapes(buildLevelBoard(level)).length, 0)
      ok(createLevelGame(raw).game.findHint(), `level ${level.id} has no opening move`)
    }
  })

  it('builds requested levels and rejects out-of-range indexes', () => {
    strictEqual(levelGame(4).level.id, 5)
    throws(() => levelGame(LEVELS.length), /no level at index/)
  })
})
