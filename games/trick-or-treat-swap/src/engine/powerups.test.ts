import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { makeTile, requireCell, swapTiles, tileAt } from './board.ts'
import {
  boardFromRows,
  FIXTURE_PALETTE,
  LT_GRID,
  RUN4_GRID,
  RUN5_GRID,
  SQUARE_GRID,
} from './board-strings.ts'
import { Swap3Game } from './game.ts'
import { detectShapes } from './match.ts'
import { posKey, samePos } from './pos.ts'
import { bombEffect, broomEffect, cauldronEffect, ghostEffect } from './powerups.ts'
import type { PowerupEffectContext } from './registry.ts'
import {
  findObjectiveTile,
  getPowerupEffect,
  planSwapActivation,
  planTapActivation,
  registerObjectiveTileSelector,
} from './registry.ts'
import { resolveMatches } from './resolve.ts'
import { createRng } from './rng.ts'
import type { Board, GameEvent, Pos, Tile, TileType } from './types.ts'
import { emptyClearedRecord, TILE_TYPES } from './types.ts'

const PALETTE = { a: 'pumpkin', b: 'ghost', c: 'skull', d: 'bat', e: 'candy' } as const

const posKeys = (cells: readonly Pos[]) => cells.map(posKey).sort()

const cellKeys = (cells: readonly { at: Pos }[]) => cells.map((c) => posKey(c.at)).sort()

const clearCells = (events: readonly GameEvent[], index: number) => {
  const event = events[index]
  ok(event && event.type === 'clear', `expected a clear event at #${index}`)
  return event
}

const countTypes = (board: Board): Record<TileType, number> => {
  const counts = emptyClearedRecord()
  for (const cell of board.cells) if (cell.tile) counts[cell.tile.type]++
  return counts
}

const effectCtx = (board: Board, at: Pos, tile: Tile, seed = 1): PowerupEffectContext => ({
  board,
  at,
  tile,
  cause: 'chain',
  rng: createRng(seed),
})

describe('power-up creation', () => {
  it('each match shape converts into its power-up on the event stream', () => {
    const cases = [
      { rows: RUN4_GRID, a: { x: 2, y: 2 }, b: { x: 2, y: 1 }, powerup: 'broom' },
      { rows: RUN5_GRID, a: { x: 2, y: 2 }, b: { x: 2, y: 1 }, powerup: 'cauldron' },
      { rows: LT_GRID, a: { x: 2, y: 2 }, b: { x: 3, y: 2 }, powerup: 'bomb' },
      { rows: SQUARE_GRID, a: { x: 1, y: 1 }, b: { x: 1, y: 2 }, powerup: 'little-ghost' },
    ] as const

    for (const [i, testCase] of cases.entries()) {
      const board = boardFromRows(testCase.rows, FIXTURE_PALETTE)
      swapTiles(board, testCase.a, testCase.b)
      const result = resolveMatches(board, createRng(i + 1), TILE_TYPES, [testCase.a, testCase.b])
      const converts = result.events.filter((e) => e.type === 'convert')
      ok(
        converts.some((e) => e.type === 'convert' && e.powerup === testCase.powerup),
        `expected a ${testCase.powerup} convert for ${testCase.rows.join('/')}`,
      )
      ok(result.powerupsCreated >= 1)
    }
  })
})

describe('power-up effects', () => {
  it('are armed in the registry on import', () => {
    strictEqual(getPowerupEffect('broom'), broomEffect)
    strictEqual(getPowerupEffect('bomb'), bombEffect)
    strictEqual(getPowerupEffect('cauldron'), cauldronEffect)
    strictEqual(getPowerupEffect('little-ghost'), ghostEffect)
  })

  it('broom sweeps its row or column, direction of the match', () => {
    const board = boardFromRows(['abcde', 'bcdea', 'cabac'], PALETTE)
    const horizontal = makeTile('pumpkin', 'broom', 'h')
    deepStrictEqual(broomEffect(effectCtx(board, { x: 2, y: 1 }, horizontal)), [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ])
    const vertical = makeTile('pumpkin', 'broom', 'v')
    deepStrictEqual(broomEffect(effectCtx(board, { x: 2, y: 1 }, vertical)), [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ])
    const dirless = makeTile('pumpkin', 'broom')
    strictEqual(broomEffect(effectCtx(board, { x: 2, y: 1 }, dirless)).length, 5)
  })

  it('bomb blasts exactly the 3×3 around itself, clipped to the board', () => {
    const board = boardFromRows(['abcde', 'bcdea', 'cabac'], PALETTE)
    const tile = makeTile('ghost', 'bomb')
    deepStrictEqual(bombEffect(effectCtx(board, { x: 2, y: 1 }, tile)), [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ])
    deepStrictEqual(bombEffect(effectCtx(board, { x: 0, y: 0 }, tile)), [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ])
  })

  it('cauldron clears exactly its charged colour', () => {
    const board = boardFromRows(['abcdc', 'eeacb'], PALETTE)
    const tile = makeTile('potion', 'cauldron')
    tile.charge = 'skull'
    deepStrictEqual(posKeys(cauldronEffect(effectCtx(board, { x: 0, y: 0 }, tile))), [
      '2,0',
      '3,1',
      '4,0',
    ])
  })

  it('cauldron without a charge clears one random present colour', () => {
    const board = boardFromRows(['abcde', 'abcde'], PALETTE)
    const counts = countTypes(board)
    const tile = makeTile('potion', 'cauldron')
    const cells = cauldronEffect(effectCtx(board, { x: 0, y: 0 }, tile, 9))
    ok(cells.length > 0)
    const first = cells[0]
    ok(first)
    const firstTile = tileAt(board, first)
    ok(firstTile)
    ok(cells.every((at) => tileAt(board, at)?.type === firstTile.type))
    strictEqual(cells.length, counts[firstTile.type])
    const repeat = cauldronEffect(effectCtx(board, { x: 0, y: 0 }, tile, 9))
    deepStrictEqual(posKeys(repeat), posKeys(cells))
  })

  it('little ghost pops the nearest tile, ties in row-major order', () => {
    const board = boardFromRows(['..bt', '....', '.G..', 't..t'], {
      b: 'ghost',
      t: 'bat',
      G: 'pumpkin',
    })
    const tile = makeTile('pumpkin', 'little-ghost')
    deepStrictEqual(ghostEffect(effectCtx(board, { x: 1, y: 2 }, tile)), [{ x: 0, y: 3 }])

    const tied = boardFromRows(['Gt', 'tt'], { G: 'pumpkin', t: 'bat' })
    deepStrictEqual(ghostEffect(effectCtx(tied, { x: 0, y: 0 }, tile)), [{ x: 1, y: 0 }])
  })

  it('little ghost prefers the registered objective tile over distance', () => {
    const board = boardFromRows(['..bt', '....', '.G..', 't..t'], {
      b: 'ghost',
      t: 'bat',
      G: 'pumpkin',
    })
    const tile = makeTile('pumpkin', 'little-ghost')
    registerObjectiveTileSelector(() => ({ x: 3, y: 0 }))
    try {
      deepStrictEqual(ghostEffect(effectCtx(board, { x: 1, y: 2 }, tile)), [{ x: 3, y: 0 }])
      deepStrictEqual(findObjectiveTile(board, { x: 1, y: 2 }), { x: 3, y: 0 })
    } finally {
      registerObjectiveTileSelector(undefined)
    }
    deepStrictEqual(ghostEffect(effectCtx(board, { x: 1, y: 2 }, tile)), [{ x: 0, y: 3 }])
  })
})

describe('activation planning', () => {
  it('charges a cauldron with the colour of the tile it was swapped with', () => {
    const board = boardFromRows(['ab', 'cd'], PALETTE)
    requireCell(board, { x: 0, y: 0 }).tile = makeTile('potion', 'cauldron')
    swapTiles(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    const plan = planSwapActivation(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    ok(plan)
    deepStrictEqual(plan.detonate, [{ x: 1, y: 0 }])
    ok(plan.activated && samePos(plan.activated.at, { x: 1, y: 0 }))
    const cauldron = requireCell(board, { x: 1, y: 0 }).tile
    ok(cauldron)
    strictEqual(cauldron.charge, 'ghost')
  })

  it('plans a combo for two power-ups swapped into each other', () => {
    const board = boardFromRows(['ab', 'cd'], PALETTE)
    requireCell(board, { x: 0, y: 0 }).tile = makeTile('pumpkin', 'broom', 'h')
    requireCell(board, { x: 1, y: 0 }).tile = makeTile('ghost', 'bomb')
    swapTiles(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    const plan = planSwapActivation(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    ok(plan)
    deepStrictEqual(plan.detonate, [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ])
    ok(plan.combo)
    deepStrictEqual(plan.combo.a, { at: { x: 0, y: 0 }, powerup: 'bomb' })
    deepStrictEqual(plan.combo.b, { at: { x: 1, y: 0 }, powerup: 'broom' })
  })

  it('leaves plain tiles and non-cauldron power-up swaps unplanned', () => {
    const plain = boardFromRows(['ab', 'cd'], PALETTE)
    swapTiles(plain, { x: 0, y: 0 }, { x: 1, y: 0 })
    strictEqual(planSwapActivation(plain, { x: 0, y: 0 }, { x: 1, y: 0 }), null)

    const broomBoard = boardFromRows(['ab', 'cd'], PALETTE)
    requireCell(broomBoard, { x: 0, y: 0 }).tile = makeTile('pumpkin', 'broom', 'h')
    swapTiles(broomBoard, { x: 0, y: 0 }, { x: 1, y: 0 })
    strictEqual(planSwapActivation(broomBoard, { x: 0, y: 0 }, { x: 1, y: 0 }), null)

    strictEqual(planTapActivation(broomBoard, { x: 1, y: 1 }), null)
    const tapPlan = planTapActivation(broomBoard, { x: 1, y: 0 })
    ok(tapPlan)
    deepStrictEqual(tapPlan.detonate, [{ x: 1, y: 0 }])
  })
})

describe('resolveMatches with an activation plan', () => {
  it('detonates planned cells before matching and chains caught power-ups', () => {
    const board = boardFromRows(['abcde', 'cabed', 'edcba'], PALETTE)
    requireCell(board, { x: 2, y: 1 }).tile = makeTile('pumpkin', 'broom', 'h')
    requireCell(board, { x: 3, y: 1 }).tile = makeTile('bat', 'bomb')
    strictEqual(detectShapes(board).length, 0)

    const result = resolveMatches(board, createRng(21), TILE_TYPES, [], {
      detonate: [{ x: 3, y: 1 }],
    })
    const clear = clearCells(result.events, 0)
    strictEqual(clear.cause, 'powerup')
    // bomb 3×3 at (3,1) plus the broom's whole row 1
    deepStrictEqual(cellKeys(clear.cells), [
      '0,1',
      '1,1',
      '2,0',
      '2,1',
      '2,2',
      '3,0',
      '3,1',
      '3,2',
      '4,0',
      '4,1',
      '4,2',
    ])
    ok(result.cascades >= 1)
    strictEqual(detectShapes(board).length, 0)
  })
})

describe('Swap3Game power-up activation', () => {
  // shape-free with plenty of valid moves, so the constructor never reshuffles
  const gridRows = ['abcde', 'deabc', 'bcdae', 'eabcd']

  it('activates a cauldron swapped with a tile, clearing exactly that colour', () => {
    const board = boardFromRows(['abcde', 'bdace', 'cebad', 'Cdbae'], { ...PALETTE, C: 'potion' })
    requireCell(board, { x: 0, y: 3 }).tile = makeTile('potion', 'cauldron')
    const game = new Swap3Game({ seed: 42, board })
    ok(!game.log.some((e) => e.type === 'shuffle'))

    const outcome = game.trySwap({ x: 0, y: 3 }, { x: 1, y: 3 })
    ok(outcome.accepted)
    deepStrictEqual(
      outcome.events.slice(0, 3).map((e) => e.type),
      ['swap', 'power-activate', 'clear'],
    )
    const activate = outcome.events[1]
    ok(activate && activate.type === 'power-activate')
    strictEqual(activate.powerup, 'cauldron')
    strictEqual(activate.via, 'swap')
    deepStrictEqual(activate.at, { x: 1, y: 3 })

    const clear = clearCells(outcome.events, 2)
    strictEqual(clear.cause, 'powerup')
    // the cauldron and every bat on the board (incl. the swapped one)
    deepStrictEqual(cellKeys(clear.cells), ['0,3', '1,1', '1,3', '3,0', '4,2'])
    ok(game.stats.cleared.bat >= 4)
    strictEqual(game.stats.movesUsed, 1)
  })

  it('activates a cauldron by tap, clearing one random colour and consuming it', () => {
    const board = boardFromRows(gridRows, PALETTE)
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('potion', 'cauldron')
    const game = new Swap3Game({ seed: 7, board })
    // the constructor may reshuffle a dead board — tap wherever the cauldron sits
    const index = board.cells.findIndex((c) => c.tile?.powerup === 'cauldron')
    ok(index >= 0)
    const at = { x: index % board.width, y: Math.floor(index / board.width) }
    const counts = countTypes(board)

    const outcome = game.tryTap(at)
    ok(outcome.accepted)
    const activate = outcome.events[0]
    ok(activate && activate.type === 'power-activate')
    strictEqual(activate.powerup, 'cauldron')
    strictEqual(activate.via, 'tap')

    const clear = clearCells(outcome.events, 1)
    strictEqual(clear.cause, 'powerup')
    const others = clear.cells.filter((c) => !samePos(c.at, at))
    const color = others.length > 0 ? others[0]?.tile.type : 'potion'
    ok(color)
    if (others.length > 0) ok(others.every((c) => c.tile.type === color))
    strictEqual(clear.cells.length, color === 'potion' ? counts.potion : counts[color] + 1)
    ok(game.board.cells.every((cell) => !cell.tile?.powerup))
    ok(outcome.events.some((e) => e.type === 'move'))
    strictEqual(game.stats.movesUsed, 1)
  })

  it('little ghost homes to the nearest tile when tapped', () => {
    const board = boardFromRows(gridRows, PALETTE)
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('skull', 'little-ghost')
    const game = new Swap3Game({ seed: 11, board })
    ok(!game.log.some((e) => e.type === 'shuffle'))

    const outcome = game.tryTap({ x: 2, y: 2 })
    ok(outcome.accepted)
    const activate = outcome.events[0]
    ok(activate && activate.type === 'power-activate')
    strictEqual(activate.powerup, 'little-ghost')
    const clear = clearCells(outcome.events, 1)
    deepStrictEqual(cellKeys(clear.cells), ['2,1', '2,2'])
    strictEqual(game.stats.movesUsed, 1)
  })

  it('raises the combo event and detonates both power-ups of a power-up swap', () => {
    const board = boardFromRows(gridRows, PALETTE)
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('candy', 'broom', 'h')
    requireCell(board, { x: 3, y: 2 }).tile = makeTile('ghost', 'bomb')
    const game = new Swap3Game({ seed: 3, board })
    ok(!game.log.some((e) => e.type === 'shuffle'))

    const outcome = game.trySwap({ x: 2, y: 2 }, { x: 3, y: 2 })
    ok(outcome.accepted)
    deepStrictEqual(
      outcome.events.slice(0, 3).map((e) => e.type),
      ['swap', 'combo', 'clear'],
    )
    const combo = outcome.events[1]
    ok(combo && combo.type === 'combo')
    deepStrictEqual(combo.a, { at: { x: 2, y: 2 }, powerup: 'bomb' })
    deepStrictEqual(combo.b, { at: { x: 3, y: 2 }, powerup: 'broom' })

    const clear = clearCells(outcome.events, 2)
    strictEqual(clear.cause, 'powerup')
    deepStrictEqual(cellKeys(clear.cells), [
      '0,2',
      '1,1',
      '1,2',
      '1,3',
      '2,1',
      '2,2',
      '2,3',
      '3,1',
      '3,2',
      '3,3',
      '4,2',
    ])
    strictEqual(game.stats.movesUsed, 1)
  })

  it('detonates a power-up consumed by a regular match', () => {
    const board = boardFromRows(['badce', 'ebBca', 'cadeb'], { ...PALETTE, B: 'bat' })
    requireCell(board, { x: 2, y: 1 }).tile = makeTile('bat', 'broom', 'h')
    const game = new Swap3Game({ seed: 19, board })
    ok(!game.log.some((e) => e.type === 'shuffle'))

    const outcome = game.trySwap({ x: 2, y: 0 }, { x: 2, y: 1 })
    ok(outcome.accepted)
    const matchClear = clearCells(outcome.events, 2)
    strictEqual(matchClear.cause, 'match')
    deepStrictEqual(cellKeys(matchClear.cells), ['2,0', '2,1', '2,2'])
    const powerClear = clearCells(outcome.events, 3)
    strictEqual(powerClear.cause, 'powerup')
    deepStrictEqual(cellKeys(powerClear.cells), ['0,0', '1,0', '3,0', '4,0'])
  })

  it('treats a non-cauldron power-up swap like any matchless swap', () => {
    const board = boardFromRows(gridRows, PALETTE)
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('potion', 'broom', 'h')
    const game = new Swap3Game({ seed: 5, board })
    const before = countTypes(board)

    const outcome = game.trySwap({ x: 2, y: 2 }, { x: 2, y: 1 })
    ok(!outcome.accepted)
    ok(outcome.events[0]?.type === 'reject' && outcome.events[0].reason === 'no-match')
    deepStrictEqual(countTypes(board), before)
    strictEqual(game.stats.movesUsed, 0)
  })

  it('rejects taps that hit nothing activatable and taps after game over', () => {
    const board = boardFromRows(gridRows, PALETTE)
    const game = new Swap3Game({ seed: 8, board })

    const bounds = game.tryTap({ x: -1, y: 0 })
    ok(!bounds.accepted)
    ok(bounds.events[0]?.type === 'reject' && bounds.events[0].reason === 'bounds')
    const plain = game.tryTap({ x: 0, y: 0 })
    ok(!plain.accepted)
    ok(plain.events[0]?.type === 'reject' && plain.events[0].reason === 'no-powerup')
    strictEqual(game.stats.movesUsed, 0)

    const limited = new Swap3Game({ seed: 8, board: boardFromRows(gridRows, PALETTE), moves: 1 })
    const hint = limited.findHint()
    ok(hint)
    ok(limited.trySwap(hint.a, hint.b).accepted)
    strictEqual(limited.result, 'lose')
    const over = limited.tryTap({ x: 0, y: 0 })
    ok(!over.accepted)
    ok(over.events[0]?.type === 'reject' && over.events[0].reason === 'over')
  })
})
