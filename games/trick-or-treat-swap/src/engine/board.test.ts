import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyGravity,
  createBoard,
  findValidMove,
  refillBoard,
  requireCell,
  shuffleBoard,
  swapTiles,
  wouldMatchAt,
} from './board.ts'
import { boardFromRows, FIXTURE_PALETTE, RUN4_GRID, typeMatrix } from './board-strings.ts'
import { detectShapes } from './match.ts'
import { registerCellModifier, unregisterCellModifier } from './registry.ts'
import { createRng } from './rng.ts'
import type { Board, TileType } from './types.ts'
import { TILE_TYPES } from './types.ts'

const COLORS = TILE_TYPES

describe('createBoard', () => {
  it('fills the board with no pre-made shapes and at least one move', () => {
    const board = createBoard({ width: 7, height: 8, rng: createRng(1234), colors: COLORS })
    strictEqual(board.cells.length, 56)
    ok(board.cells.every((cell) => cell.tile))
    strictEqual(detectShapes(board).length, 0)
    ok(findValidMove(board))
  })

  it('is reproducible from the seed', () => {
    const a = createBoard({ width: 6, height: 6, rng: createRng(55), colors: COLORS })
    const b = createBoard({ width: 6, height: 6, rng: createRng(55), colors: COLORS })
    deepStrictEqual(typeMatrix(a), typeMatrix(b))
  })

  it('differs between seeds', () => {
    const a = createBoard({ width: 6, height: 6, rng: createRng(1), colors: COLORS })
    const b = createBoard({ width: 6, height: 6, rng: createRng(2), colors: COLORS })
    ok(JSON.stringify(typeMatrix(a)) !== JSON.stringify(typeMatrix(b)))
  })
})

describe('applyGravity', () => {
  it('compacts tiles downwards per column', () => {
    const board = boardFromRows(['ab.c', '.b..', '....', 'c..a'], {
      a: 'pumpkin',
      b: 'ghost',
      c: 'skull',
    })
    const moves = applyGravity(board)
    deepStrictEqual(typeMatrix(board), [
      [undefined, undefined, undefined, undefined],
      [undefined, undefined, undefined, undefined],
      ['pumpkin', 'ghost', undefined, 'skull'],
      ['skull', 'ghost', undefined, 'pumpkin'],
    ])
    ok(moves.length > 0)
    ok(moves.every((m) => m.to.y > m.from.y))
  })

  it('stacks tiles on gravity barriers without moving the barrier tile', () => {
    registerCellModifier({ id: 'test-wall', gravityBarrier: true })
    try {
      const board = boardFromRows(['a.a', '.b.', 'W..', '...'], {
        a: 'pumpkin',
        b: 'ghost',
        W: 'bat',
      })
      requireCell(board, { x: 0, y: 2 }).modifier = 'test-wall'
      const moves = applyGravity(board)
      const types = typeMatrix(board)
      strictEqual(types[0]?.[0], undefined)
      strictEqual(types[1]?.[0], 'pumpkin') // stacks on top of the barrier
      strictEqual(types[2]?.[0], 'bat') // barrier tile stays put
      strictEqual(types[3]?.[1], 'ghost')
      strictEqual(types[3]?.[2], 'pumpkin')
      ok(!moves.some((m) => m.from.y === 2 && m.from.x === 0))
      ok(moves.some((m) => m.from.x === 1 && m.to.y === 3))
    } finally {
      unregisterCellModifier('test-wall')
    }
  })
})

describe('refillBoard', () => {
  it('fills every empty cell but leaves barrier cells alone', () => {
    registerCellModifier({ id: 'test-wall', gravityBarrier: true })
    try {
      const board = boardFromRows(['...', '...', '...'], {})
      requireCell(board, { x: 1, y: 1 }).modifier = 'test-wall'
      const spawned = refillBoard(board, createRng(9), COLORS)
      strictEqual(spawned.length, 8)
      strictEqual(
        typeMatrix(board)
          .flat()
          .filter((t) => t === undefined).length,
        1,
      )
    } finally {
      unregisterCellModifier('test-wall')
    }
  })
})

describe('findValidMove', () => {
  it('returns a swap that actually produces a match', () => {
    const board = boardFromRows(RUN4_GRID, FIXTURE_PALETTE)
    const move = findValidMove(board)
    ok(move)
    swapTiles(board, move.a, move.b)
    ok(wouldMatchAt(board, move.a) || wouldMatchAt(board, move.b))
    swapTiles(board, move.a, move.b)
  })

  it('finds no move on a dead board', () => {
    strictEqual(findValidMove(shiftPatternBoard()), null)
  })
})

describe('shuffleBoard', () => {
  it('turns a dead board into a playable one and preserves the tile set', () => {
    const board = shiftPatternBoard()
    const before = sortedTypes(board)
    ok(shuffleBoard(board, createRng(21)))
    strictEqual(detectShapes(board).length, 0)
    ok(findValidMove(board))
    deepStrictEqual(sortedTypes(board), before)
  })
})

/** Vertical stripes shifted per row: no runs, no squares, and no improving swap. */
function shiftPatternBoard(): Board {
  const keys = ['a', 'b', 'c', 'd', 'e', 'f'] as const
  const rows: string[] = []
  for (let y = 0; y < 8; y++) {
    let row = ''
    for (let x = 0; x < 7; x++) {
      const key = keys[(x + y) % keys.length]
      if (!key) throw new Error('unreachable')
      row += key
    }
    rows.push(row)
  }
  return boardFromRows(rows, {
    a: 'pumpkin',
    b: 'ghost',
    c: 'skull',
    d: 'bat',
    e: 'candy',
    f: 'potion',
  })
}

function sortedTypes(board: Board): TileType[] {
  return typeMatrix(board)
    .flat()
    .filter((t): t is TileType => t !== undefined)
    .sort()
}
