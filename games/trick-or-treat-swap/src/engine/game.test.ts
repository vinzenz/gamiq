import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { requireCell } from './board.ts'
import { boardFromRows, FIXTURE_PALETTE, RUN4_GRID, typeMatrix } from './board-strings.ts'
import { Swap3Game } from './game.ts'
import { detectShapes } from './match.ts'
import { registerCellModifier, unregisterCellModifier } from './registry.ts'
import type { Board } from './types.ts'

const run4Board = (): Board => boardFromRows(RUN4_GRID, FIXTURE_PALETTE)

/** Vertical stripes shifted per row: no runs, no squares, no improving swap. */
const deadBoard = (): Board => {
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

describe('Swap3Game', () => {
  it('is reproducible from seed + move sequence', () => {
    const g1 = new Swap3Game({ seed: 1337 })
    const g2 = new Swap3Game({ seed: 1337 })
    deepStrictEqual(typeMatrix(g1.board), typeMatrix(g2.board))

    for (let step = 0; step < 5; step++) {
      const h1 = g1.findHint()
      const h2 = g2.findHint()
      ok(h1)
      ok(h2)
      deepStrictEqual(h1, h2)
      const o1 = g1.trySwap(h1.a, h1.b)
      const o2 = g2.trySwap(h2.a, h2.b)
      ok(o1.accepted && o2.accepted)
      deepStrictEqual(typeMatrix(g1.board), typeMatrix(g2.board))
      deepStrictEqual(
        g1.log.map((e) => e.type),
        g2.log.map((e) => e.type),
      )
      strictEqual(g1.stats.movesUsed, g2.stats.movesUsed)
    }
  })

  it('accepts a valid swap, spends a move and settles the board', () => {
    const game = new Swap3Game({ seed: 9, board: run4Board() })
    const hint = game.findHint()
    ok(hint)
    const outcome = game.trySwap(hint.a, hint.b)
    ok(outcome.accepted)
    strictEqual(outcome.events[0]?.type, 'swap')
    strictEqual(game.stats.movesUsed, 1)
    strictEqual(detectShapes(game.board).length, 0)
    ok(game.board.cells.every((cell) => cell.tile))
  })

  it('rejects a swap that matches nothing and leaves the board alone', () => {
    const game = new Swap3Game({ seed: 9, board: run4Board() })
    const before = typeMatrix(game.board)
    const outcome = game.trySwap({ x: 0, y: 2 }, { x: 1, y: 2 }) // two identical tiles
    ok(!outcome.accepted)
    strictEqual(outcome.events[0]?.type, 'reject')
    deepStrictEqual(typeMatrix(game.board), before)
    strictEqual(game.stats.movesUsed, 0)
  })

  it('rejects out-of-bounds and non-adjacent swaps', () => {
    const game = new Swap3Game({ seed: 9, board: run4Board() })
    const far = game.trySwap({ x: -1, y: 0 }, { x: 0, y: 0 })
    ok(!far.accepted)
    ok(far.events[0]?.type === 'reject' && far.events[0].reason === 'bounds')
    const diag = game.trySwap({ x: 0, y: 0 }, { x: 1, y: 1 })
    ok(!diag.accepted)
    ok(diag.events[0]?.type === 'reject' && diag.events[0].reason === 'adjacent')
    strictEqual(game.stats.movesUsed, 0)
  })

  it('rejects swaps on locked cells', () => {
    registerCellModifier({ id: 'test-lock', swappable: () => false })
    try {
      const game = new Swap3Game({ seed: 9, board: run4Board() })
      const hint = game.findHint()
      ok(hint)
      requireCell(game.board, hint.a).modifier = 'test-lock'
      requireCell(game.board, hint.b).modifier = 'test-lock'
      const outcome = game.trySwap(hint.a, hint.b)
      ok(!outcome.accepted)
      ok(outcome.events[0]?.type === 'reject' && outcome.events[0].reason === 'locked')
      strictEqual(game.stats.movesUsed, 0)
      requireCell(game.board, hint.a).modifier = undefined
      requireCell(game.board, hint.b).modifier = undefined
    } finally {
      unregisterCellModifier('test-lock')
    }
  })

  it('creates a broom from a match-4 and reports it as an event', () => {
    const game = new Swap3Game({ seed: 5, board: run4Board() })
    const outcome = game.trySwap({ x: 2, y: 2 }, { x: 2, y: 1 })
    ok(outcome.accepted)
    const convert = outcome.events.find((e) => e.type === 'convert')
    ok(convert && convert.type === 'convert')
    strictEqual(convert.powerup, 'broom')
    strictEqual(convert.tile.dir, 'h')
    deepStrictEqual(convert.at, { x: 2, y: 2 })
    ok(game.stats.powerupsCreated >= 1)
  })

  it('ends in defeat when the move limit runs out, then locks the game', () => {
    const game = new Swap3Game({ seed: 5, board: run4Board(), moves: 1 })
    const outcome = game.trySwap({ x: 2, y: 2 }, { x: 2, y: 1 })
    ok(outcome.accepted)
    const last = outcome.events.at(-1)
    ok(last && last.type === 'game-over' && last.result === 'lose')
    strictEqual(game.result, 'lose')
    strictEqual(game.movesLeft, 0)
    const again = game.trySwap({ x: 0, y: 0 }, { x: 1, y: 0 })
    ok(!again.accepted)
    ok(again.events[0]?.type === 'reject' && again.events[0].reason === 'over')
  })

  it('lets the evaluation hook win the game', () => {
    const game = new Swap3Game({
      seed: 5,
      board: run4Board(),
      onEval: (snap) => (snap.stats.cleared.skull >= 3 ? 'win' : undefined),
    })
    const outcome = game.trySwap({ x: 2, y: 2 }, { x: 2, y: 1 })
    ok(outcome.accepted)
    const last = outcome.events.at(-1)
    ok(last && last.type === 'game-over' && last.result === 'win')
    strictEqual(game.result, 'win')
  })

  it('reshuffles a board that has no valid move', () => {
    const board = deadBoard()
    strictEqual(detectShapes(board).length, 0)
    const game = new Swap3Game({ seed: 3, board })
    ok(game.log.some((e) => e.type === 'shuffle'))
    ok(game.findHint())
    strictEqual(detectShapes(game.board).length, 0)
  })

  it('keeps a provided board untouched when it already has a move', () => {
    const board = run4Board()
    const before = typeMatrix(board)
    new Swap3Game({ seed: 4, board })
    deepStrictEqual(typeMatrix(board), before)
  })
})
