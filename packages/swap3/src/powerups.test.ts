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
import { blastEffect, homingEffect, prismEffect, sweepEffect } from './powerups.ts'
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

const PALETTE = { a: 'red', b: 'blue', c: 'ivory', d: 'purple', e: 'pink' } as const

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
      { rows: RUN4_GRID, a: { x: 2, y: 2 }, b: { x: 2, y: 1 }, powerup: 'sweep' },
      { rows: RUN5_GRID, a: { x: 2, y: 2 }, b: { x: 2, y: 1 }, powerup: 'prism' },
      { rows: LT_GRID, a: { x: 2, y: 2 }, b: { x: 3, y: 2 }, powerup: 'blast' },
      { rows: SQUARE_GRID, a: { x: 1, y: 1 }, b: { x: 1, y: 2 }, powerup: 'homing' },
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
    strictEqual(getPowerupEffect('sweep'), sweepEffect)
    strictEqual(getPowerupEffect('blast'), blastEffect)
    strictEqual(getPowerupEffect('prism'), prismEffect)
    strictEqual(getPowerupEffect('homing'), homingEffect)
  })

  it('sweep sweeps its row or column, direction of the match', () => {
    const board = boardFromRows(['abcde', 'bcdea', 'cabac'], PALETTE)
    const horizontal = makeTile('red', 'sweep', 'h')
    deepStrictEqual(sweepEffect(effectCtx(board, { x: 2, y: 1 }, horizontal)), [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ])
    const vertical = makeTile('red', 'sweep', 'v')
    deepStrictEqual(sweepEffect(effectCtx(board, { x: 2, y: 1 }, vertical)), [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ])
    const dirless = makeTile('red', 'sweep')
    strictEqual(sweepEffect(effectCtx(board, { x: 2, y: 1 }, dirless)).length, 5)
  })

  it('blast blasts exactly the 3×3 around itself, clipped to the board', () => {
    const board = boardFromRows(['abcde', 'bcdea', 'cabac'], PALETTE)
    const tile = makeTile('blue', 'blast')
    deepStrictEqual(blastEffect(effectCtx(board, { x: 2, y: 1 }, tile)), [
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
    deepStrictEqual(blastEffect(effectCtx(board, { x: 0, y: 0 }, tile)), [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ])
  })

  it('prism clears exactly its charged colour', () => {
    const board = boardFromRows(['abcdc', 'eeacb'], PALETTE)
    const tile = makeTile('green', 'prism')
    tile.charge = 'ivory'
    deepStrictEqual(posKeys(prismEffect(effectCtx(board, { x: 0, y: 0 }, tile))), [
      '2,0',
      '3,1',
      '4,0',
    ])
  })

  it('prism without a charge clears one random present colour', () => {
    const board = boardFromRows(['abcde', 'abcde'], PALETTE)
    const counts = countTypes(board)
    const tile = makeTile('green', 'prism')
    const cells = prismEffect(effectCtx(board, { x: 0, y: 0 }, tile, 9))
    ok(cells.length > 0)
    const first = cells[0]
    ok(first)
    const firstTile = tileAt(board, first)
    ok(firstTile)
    ok(cells.every((at) => tileAt(board, at)?.type === firstTile.type))
    strictEqual(cells.length, counts[firstTile.type])
    const repeat = prismEffect(effectCtx(board, { x: 0, y: 0 }, tile, 9))
    deepStrictEqual(posKeys(repeat), posKeys(cells))
  })

  it('little blue pops the nearest tile, ties in row-major order', () => {
    const board = boardFromRows(['..bt', '....', '.G..', 't..t'], {
      b: 'blue',
      t: 'purple',
      G: 'red',
    })
    const tile = makeTile('red', 'homing')
    deepStrictEqual(homingEffect(effectCtx(board, { x: 1, y: 2 }, tile)), [{ x: 0, y: 3 }])

    const tied = boardFromRows(['Gt', 'tt'], { G: 'red', t: 'purple' })
    deepStrictEqual(homingEffect(effectCtx(tied, { x: 0, y: 0 }, tile)), [{ x: 1, y: 0 }])
  })

  it('little blue prefers the registered objective tile over distance', () => {
    const board = boardFromRows(['..bt', '....', '.G..', 't..t'], {
      b: 'blue',
      t: 'purple',
      G: 'red',
    })
    const tile = makeTile('red', 'homing')
    registerObjectiveTileSelector(() => ({ x: 3, y: 0 }))
    try {
      deepStrictEqual(homingEffect(effectCtx(board, { x: 1, y: 2 }, tile)), [{ x: 3, y: 0 }])
      deepStrictEqual(findObjectiveTile(board, { x: 1, y: 2 }), { x: 3, y: 0 })
    } finally {
      registerObjectiveTileSelector(undefined)
    }
    deepStrictEqual(homingEffect(effectCtx(board, { x: 1, y: 2 }, tile)), [{ x: 0, y: 3 }])
  })
})

describe('activation planning', () => {
  it('charges a prism with the colour of the tile it was swapped with', () => {
    const board = boardFromRows(['ab', 'cd'], PALETTE)
    requireCell(board, { x: 0, y: 0 }).tile = makeTile('green', 'prism')
    swapTiles(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    const plan = planSwapActivation(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    ok(plan)
    deepStrictEqual(plan.detonate, [{ x: 1, y: 0 }])
    ok(plan.activated && samePos(plan.activated.at, { x: 1, y: 0 }))
    const prism = requireCell(board, { x: 1, y: 0 }).tile
    ok(prism)
    strictEqual(prism.charge, 'blue')
  })

  it('plans a combo for two power-ups swapped into each other', () => {
    const board = boardFromRows(['ab', 'cd'], PALETTE)
    requireCell(board, { x: 0, y: 0 }).tile = makeTile('red', 'sweep', 'h')
    requireCell(board, { x: 1, y: 0 }).tile = makeTile('blue', 'blast')
    swapTiles(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    const plan = planSwapActivation(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    ok(plan)
    deepStrictEqual(plan.detonate, [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ])
    ok(plan.combo)
    deepStrictEqual(plan.combo.a, { at: { x: 0, y: 0 }, powerup: 'blast' })
    deepStrictEqual(plan.combo.b, { at: { x: 1, y: 0 }, powerup: 'sweep' })
  })

  it('leaves plain tiles and non-prism power-up swaps unplanned', () => {
    const plain = boardFromRows(['ab', 'cd'], PALETTE)
    swapTiles(plain, { x: 0, y: 0 }, { x: 1, y: 0 })
    strictEqual(planSwapActivation(plain, { x: 0, y: 0 }, { x: 1, y: 0 }), null)

    const sweepBoard = boardFromRows(['ab', 'cd'], PALETTE)
    requireCell(sweepBoard, { x: 0, y: 0 }).tile = makeTile('red', 'sweep', 'h')
    swapTiles(sweepBoard, { x: 0, y: 0 }, { x: 1, y: 0 })
    strictEqual(planSwapActivation(sweepBoard, { x: 0, y: 0 }, { x: 1, y: 0 }), null)

    strictEqual(planTapActivation(sweepBoard, { x: 1, y: 1 }), null)
    const tapPlan = planTapActivation(sweepBoard, { x: 1, y: 0 })
    ok(tapPlan)
    deepStrictEqual(tapPlan.detonate, [{ x: 1, y: 0 }])
  })
})

describe('resolveMatches with an activation plan', () => {
  it('detonates planned cells before matching and chains caught power-ups', () => {
    const board = boardFromRows(['abcde', 'cabed', 'edcba'], PALETTE)
    requireCell(board, { x: 2, y: 1 }).tile = makeTile('red', 'sweep', 'h')
    requireCell(board, { x: 3, y: 1 }).tile = makeTile('purple', 'blast')
    strictEqual(detectShapes(board).length, 0)

    const result = resolveMatches(board, createRng(21), TILE_TYPES, [], {
      detonate: [{ x: 3, y: 1 }],
    })
    const clear = clearCells(result.events, 0)
    strictEqual(clear.cause, 'powerup')
    // blast 3×3 at (3,1) plus the sweep's whole row 1
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

  it('activates a prism swapped with a tile, clearing exactly that colour', () => {
    const board = boardFromRows(['abcde', 'bdace', 'cebad', 'Cdbae'], { ...PALETTE, C: 'green' })
    requireCell(board, { x: 0, y: 3 }).tile = makeTile('green', 'prism')
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
    strictEqual(activate.powerup, 'prism')
    strictEqual(activate.via, 'swap')
    deepStrictEqual(activate.at, { x: 1, y: 3 })

    const clear = clearCells(outcome.events, 2)
    strictEqual(clear.cause, 'powerup')
    // the prism and every purple on the board (incl. the swapped one)
    deepStrictEqual(cellKeys(clear.cells), ['0,3', '1,1', '1,3', '3,0', '4,2'])
    ok(game.stats.cleared.purple >= 4)
    strictEqual(game.stats.movesUsed, 1)
  })

  it('activates a prism by tap, clearing one random colour and consuming it', () => {
    const board = boardFromRows(gridRows, PALETTE)
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('green', 'prism')
    const game = new Swap3Game({ seed: 7, board })
    // the constructor may reshuffle a dead board — tap wherever the prism sits
    const index = board.cells.findIndex((c) => c.tile?.powerup === 'prism')
    ok(index >= 0)
    const at = { x: index % board.width, y: Math.floor(index / board.width) }
    const counts = countTypes(board)

    const outcome = game.tryTap(at)
    ok(outcome.accepted)
    const activate = outcome.events[0]
    ok(activate && activate.type === 'power-activate')
    strictEqual(activate.powerup, 'prism')
    strictEqual(activate.via, 'tap')

    const clear = clearCells(outcome.events, 1)
    strictEqual(clear.cause, 'powerup')
    const others = clear.cells.filter((c) => !samePos(c.at, at))
    const color = others.length > 0 ? others[0]?.tile.type : 'green'
    ok(color)
    if (others.length > 0) ok(others.every((c) => c.tile.type === color))
    strictEqual(clear.cells.length, color === 'green' ? counts.green : counts[color] + 1)
    ok(game.board.cells.every((cell) => !cell.tile?.powerup))
    ok(outcome.events.some((e) => e.type === 'move'))
    strictEqual(game.stats.movesUsed, 1)
  })

  it('little blue homes to the nearest tile when tapped', () => {
    const board = boardFromRows(gridRows, PALETTE)
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('ivory', 'homing')
    const game = new Swap3Game({ seed: 11, board })
    ok(!game.log.some((e) => e.type === 'shuffle'))

    const outcome = game.tryTap({ x: 2, y: 2 })
    ok(outcome.accepted)
    const activate = outcome.events[0]
    ok(activate && activate.type === 'power-activate')
    strictEqual(activate.powerup, 'homing')
    const clear = clearCells(outcome.events, 1)
    deepStrictEqual(cellKeys(clear.cells), ['2,1', '2,2'])
    strictEqual(game.stats.movesUsed, 1)
  })

  it('raises the combo event and detonates both power-ups of a power-up swap', () => {
    const board = boardFromRows(gridRows, PALETTE)
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('pink', 'sweep', 'h')
    requireCell(board, { x: 3, y: 2 }).tile = makeTile('blue', 'blast')
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
    deepStrictEqual(combo.a, { at: { x: 2, y: 2 }, powerup: 'blast' })
    deepStrictEqual(combo.b, { at: { x: 3, y: 2 }, powerup: 'sweep' })

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
    const board = boardFromRows(['badce', 'ebBca', 'cadeb'], { ...PALETTE, B: 'purple' })
    requireCell(board, { x: 2, y: 1 }).tile = makeTile('purple', 'sweep', 'h')
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

  it('treats a non-prism power-up swap like any matchless swap', () => {
    const board = boardFromRows(gridRows, PALETTE)
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('green', 'sweep', 'h')
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
