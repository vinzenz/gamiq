import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { requireCell } from './board.ts'
import {
  boardFromRows,
  FIXTURE_PALETTE,
  LT_GRID,
  RUN4_GRID,
  RUN5_GRID,
  SQUARE_GRID,
} from './board-strings.ts'
import type { MatchedShape } from './match.ts'
import { detectShapes } from './match.ts'
import { registerCellModifier, unregisterCellModifier } from './registry.ts'

function shapesOf(rows: readonly string[]): MatchedShape[] {
  return detectShapes(boardFromRows(rows, FIXTURE_PALETTE))
}

describe('detectShapes', () => {
  it('finds a horizontal 3-run', () => {
    const shapes = shapesOf(['aaa..', '.d.e.', 'e.f.e'])
    strictEqual(shapes.length, 1)
    const shape = shapes[0]
    ok(shape)
    strictEqual(shape.shape, 'run3')
    strictEqual(shape.tileType, 'pumpkin')
    strictEqual(shape.powerup, undefined)
    deepStrictEqual(shape.cells, [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ])
  })

  it('finds a vertical 3-run', () => {
    const shapes = shapesOf(['ad.', 'ae.', 'af.', 'be.', 'cf.'])
    strictEqual(shapes.length, 1)
    const shape = shapes[0]
    ok(shape)
    strictEqual(shape.shape, 'run3')
    deepStrictEqual(shape.cells, [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ])
  })

  it('finds a match-4 as a broom with sweep direction', () => {
    const h = shapesOf(['aaaa.', '.bc..'])
    strictEqual(h.length, 1)
    const hShape = h[0]
    ok(hShape)
    strictEqual(hShape.shape, 'run4')
    strictEqual(hShape.powerup, 'broom')
    strictEqual(hShape.dir, 'h')

    const v = shapesOf(['a.', 'a.', 'a.', 'a.', 'b.'])
    strictEqual(v.length, 1)
    const vShape = v[0]
    ok(vShape)
    strictEqual(vShape.shape, 'run4')
    strictEqual(vShape.powerup, 'broom')
    strictEqual(vShape.dir, 'v')
    deepStrictEqual(vShape.spawn, { x: 0, y: 2 })
  })

  it('finds a straight match-5 as a cauldron', () => {
    const shapes = shapesOf(['aaaaa', 'bbcb.'])
    strictEqual(shapes.length, 1)
    const shape = shapes[0]
    ok(shape)
    strictEqual(shape.shape, 'run5')
    strictEqual(shape.powerup, 'cauldron')
    deepStrictEqual(shape.spawn, { x: 2, y: 0 })
  })

  it('finds an L as an intersection (pumpkin bomb)', () => {
    const shapes = shapesOf(['a....', 'a....', 'aaab.'])
    strictEqual(shapes.length, 1)
    const shape = shapes[0]
    ok(shape)
    strictEqual(shape.shape, 'intersection')
    strictEqual(shape.powerup, 'bomb')
    strictEqual(shape.cells.length, 5)
    deepStrictEqual(shape.spawn, { x: 0, y: 2 })
  })

  it('finds a T as an intersection (pumpkin bomb)', () => {
    const shapes = shapesOf(['.....', '..a..', 'aaab.', '..a..'])
    strictEqual(shapes.length, 1)
    const shape = shapes[0]
    ok(shape)
    strictEqual(shape.shape, 'intersection')
    strictEqual(shape.powerup, 'bomb')
    deepStrictEqual(shape.spawn, { x: 2, y: 2 })
  })

  it('prefers the intersection over a match-4 cross', () => {
    const shapes = shapesOf(['a....', 'a....', 'aaaa.', 'a....'])
    strictEqual(shapes.length, 1)
    const shape = shapes[0]
    ok(shape)
    strictEqual(shape.shape, 'intersection')
    strictEqual(shape.powerup, 'bomb')
  })

  it('finds a 2×2 square as a little ghost', () => {
    const shapes = shapesOf(['aa.', 'aa.', 'b.c'])
    strictEqual(shapes.length, 1)
    const shape = shapes[0]
    ok(shape)
    strictEqual(shape.shape, 'square')
    strictEqual(shape.powerup, 'little-ghost')
    strictEqual(shape.cells.length, 4)
  })

  it('a run claims cells before a square can form', () => {
    const shapes = shapesOf(['aaa.', 'aa..'])
    strictEqual(shapes.length, 1)
    const shape = shapes[0]
    ok(shape)
    strictEqual(shape.shape, 'run3')
  })

  it('finds several independent shapes at once', () => {
    const shapes = shapesOf(['aaa.', '....', 'ddd.'])
    strictEqual(shapes.length, 2)
    ok(shapes.every((s) => s.shape === 'run3'))
  })

  it('power-up fixture grids are shape-free before the swap', () => {
    for (const rows of [RUN4_GRID, RUN5_GRID, LT_GRID, SQUARE_GRID]) {
      strictEqual(shapesOf(rows).length, 0)
    }
  })

  it('unmatchable cells break runs', () => {
    registerCellModifier({ id: 'test-frozen', matchable: () => false })
    try {
      strictEqual(detectShapes(boardFromRows(['aaaa'], FIXTURE_PALETTE)).length, 1)
      const board = boardFromRows(['aaaa'], FIXTURE_PALETTE)
      requireCell(board, { x: 1, y: 0 }).modifier = 'test-frozen'
      strictEqual(detectShapes(board).length, 0)
    } finally {
      unregisterCellModifier('test-frozen')
    }
  })
})
