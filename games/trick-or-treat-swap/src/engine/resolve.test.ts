import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { makeTile, requireCell, swapTiles } from './board.ts'
import { boardFromRows } from './board-strings.ts'
import { detectShapes } from './match.ts'
import { getPowerupEffect, registerPowerupEffect } from './registry.ts'
import { resolveMatches } from './resolve.ts'
import { createRng } from './rng.ts'
import type { GameEvent } from './types.ts'
import { TILE_TYPES } from './types.ts'

const COLORS = TILE_TYPES

/** Engineered 4×6 cascade: pass 1 clears the skull column and ghost row, the
 * bats then fall into a fresh 3-run at row 4 → pass 2. */
const CASCADE_GRID = ['abca', 'Wcab', 'bacc', 'XWWb', 'Xbca', 'XYYY']

const CASCADE_PALETTE = {
  a: 'pumpkin',
  b: 'candy',
  c: 'potion',
  W: 'bat',
  X: 'skull',
  Y: 'ghost',
} as const

describe('resolveMatches', () => {
  it('does nothing on a settled board', () => {
    const board = boardFromRows(['abc', 'def', 'abc'], {
      a: 'pumpkin',
      b: 'ghost',
      c: 'skull',
      d: 'bat',
      e: 'candy',
      f: 'potion',
    })
    const result = resolveMatches(board, createRng(1), COLORS)
    strictEqual(result.events.length, 0)
    strictEqual(result.cascades, 0)
    strictEqual(result.powerupsCreated, 0)
    for (const type of COLORS) strictEqual(result.cleared[type], 0)
  })

  it('resolves a plain match-3 with clear, gravity and refill events', () => {
    const board = boardFromRows(['aaa..', 'bc...', '.....'], {
      a: 'pumpkin',
      b: 'ghost',
      c: 'skull',
    })
    const result = resolveMatches(board, createRng(3), COLORS)
    deepStrictEqual(
      result.events.map((e) => e.type),
      ['match', 'clear', 'fall', 'spawn'],
    )
    strictEqual(result.cascades, 1)
    ok(result.cleared.pumpkin >= 3)
    strictEqual(detectShapes(board).length, 0)
    ok(board.cells.every((cell) => cell.tile))

    const match = result.events[0]
    ok(match && match.type === 'match')
    strictEqual(match.shape, 'run3')
    const clear = result.events[1]
    ok(clear && clear.type === 'clear')
    strictEqual(clear.cause, 'match')
    strictEqual(clear.cells.length, 3)
  })

  it('cascades until the board settles', () => {
    const board = boardFromRows(CASCADE_GRID, CASCADE_PALETTE)
    const result = resolveMatches(board, createRng(5), COLORS)
    ok(result.cascades >= 2, `expected a cascade, got ${result.cascades}`)
    ok(
      result.events.some((e) => e.type === 'cascade' && e.depth === 2),
      'expected a cascade event at depth 2',
    )
    ok(result.cleared.bat >= 3, 'the fallen bats should have been cleared')
    strictEqual(detectShapes(board).length, 0)
    ok(board.cells.every((cell) => cell.tile))
  })

  it('converts a match-4 into a broom at the swapped cell', () => {
    const board = boardFromRows(['abcde', 'cdXab', 'XXbXa', 'bcaed', 'decab'], {
      a: 'pumpkin',
      b: 'ghost',
      c: 'skull',
      d: 'bat',
      e: 'candy',
      X: 'skull',
    })
    const a = { x: 2, y: 2 }
    const b = { x: 2, y: 1 }
    swapTiles(board, a, b)
    const result = resolveMatches(board, createRng(7), COLORS, [a, b])

    const convert = result.events.find(
      (e): e is Extract<GameEvent, { type: 'convert' }> => e.type === 'convert',
    )
    ok(convert, 'expected a convert event')
    strictEqual(convert.powerup, 'broom')
    strictEqual(convert.tileType, 'skull')
    deepStrictEqual(convert.at, { x: 2, y: 2 })
    const convertedTile = requireCell(board, convert.at).tile
    ok(convertedTile)
    strictEqual(convertedTile.id, convert.tile.id)
    ok(result.powerupsCreated >= 1)
    ok(result.cleared.skull >= 3)
    strictEqual(detectShapes(board).length, 0)
  })

  it('fires a registered power-up effect for a cleared power-up tile', () => {
    const previous = getPowerupEffect('broom')
    registerPowerupEffect('broom', (ctx) =>
      Array.from({ length: ctx.board.width }, (_, x) => ({ x, y: ctx.at.y })),
    )
    try {
      const board = boardFromRows(['bbbcd', '.....', '.....'], {
        b: 'ghost',
        c: 'skull',
        d: 'bat',
      })
      requireCell(board, { x: 1, y: 0 }).tile = makeTile('ghost', 'broom')
      const result = resolveMatches(board, createRng(11), COLORS)

      const powerClear = result.events.find(
        (e): e is Extract<GameEvent, { type: 'clear' }> =>
          e.type === 'clear' && e.cause === 'powerup',
      )
      ok(powerClear, 'expected a powerup-caused clear')
      deepStrictEqual(
        powerClear.cells.map((c) => c.at),
        [
          { x: 3, y: 0 },
          { x: 4, y: 0 },
        ],
      )
      ok(result.cleared.ghost >= 3)
    } finally {
      if (previous) registerPowerupEffect('broom', previous)
    }
  })

  it('defaults to only clearing the power-up tile itself', () => {
    const board = boardFromRows(['bb...', '.....'], { b: 'ghost' })
    requireCell(board, { x: 2, y: 0 }).tile = makeTile('ghost', 'cauldron')
    const result = resolveMatches(board, createRng(13), COLORS)

    const powerClears = result.events.filter(
      (e): e is Extract<GameEvent, { type: 'clear' }> =>
        e.type === 'clear' && e.cause === 'powerup',
    )
    strictEqual(powerClears.length, 0)
    strictEqual(result.cleared.ghost, 3)
  })

  it('leaves cell modifiers attached when tiles are cleared', () => {
    const board = boardFromRows(['aaa..', '.....'], { a: 'pumpkin', b: 'ghost' })
    const original = requireCell(board, { x: 0, y: 0 }).tile
    requireCell(board, { x: 0, y: 0 }).modifier = 'test-web'
    resolveMatches(board, createRng(17), COLORS)
    strictEqual(requireCell(board, { x: 0, y: 0 }).modifier, 'test-web')
    const refilled = requireCell(board, { x: 0, y: 0 }).tile
    ok(!refilled || refilled.id !== original?.id, 'original tile should be gone')
  })
})
