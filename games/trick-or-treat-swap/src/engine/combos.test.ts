import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { makeTile, requireCell, swapTiles, tileAt } from './board.ts'
import { boardFromRows } from './board-strings.ts'
import {
  broomLaunch,
  carriedSweep,
  crossSweep,
  getComboEffect,
  ghostTrio,
  giantBlast,
  nightOfWitches,
  pumpkinDrop,
  tripleSweep,
} from './combos.ts'
import { Swap3Game } from './game.ts'
import { cobwebCell, gravestoneCell, iceCell, lockCell, slimeCell } from './obstacles.ts'
import { posKey } from './pos.ts'
import { planSwapActivation, registerObjectiveTileSelector } from './registry.ts'
import { resolveMatches } from './resolve.ts'
import { createRng } from './rng.ts'
import type { GameEvent, Pos, PowerupKind } from './types.ts'
import { POWERUPS, TILE_TYPES } from './types.ts'

const PALETTE = { a: 'pumpkin', b: 'ghost', c: 'skull', d: 'bat', e: 'candy', f: 'potion' } as const

const posKeys = (cells: readonly Pos[]) => cells.map(posKey).sort()

const cellKeys = (cells: readonly { at: Pos }[]) => cells.map((c) => posKey(c.at)).sort()

const clearCells = (events: readonly GameEvent[], index: number) => {
  const event = events[index]
  ok(event && event.type === 'clear', `expected a clear event at #${index}`)
  return event
}

/** First clear of a resolution (obstacle events may precede it in the stream). */
const firstClear = (events: readonly GameEvent[]) => {
  const event = events.find((entry) => entry.type === 'clear')
  ok(event && event.type === 'clear', 'expected a clear event')
  return event
}

/** Swap two power-up tiles into each other and plan the activation. */
const planCombo = (board: ReturnType<typeof boardFromRows>, a: Pos, b: Pos) => {
  swapTiles(board, a, b)
  const plan = planSwapActivation(board, a, b)
  ok(plan, `expected a combo plan for the swap at (${a.x}, ${a.y})`)
  const combo = plan.combo
  ok(combo, 'expected the plan to carry a combo')
  return { plan, combo }
}

describe('combo registry', () => {
  it('registers exactly the ten pairwise combos, order-independent', () => {
    const pairs: (readonly [PowerupKind, PowerupKind])[] = []
    for (let i = 0; i < POWERUPS.length; i++) {
      const a = POWERUPS[i]
      ok(a)
      for (let j = i; j < POWERUPS.length; j++) {
        const b = POWERUPS[j]
        ok(b)
        pairs.push([a, b])
      }
    }
    strictEqual(pairs.length, 10)
    for (const [a, b] of pairs) {
      ok(getComboEffect(a, b), `missing combo for ${a} + ${b}`)
      strictEqual(getComboEffect(a, b), getComboEffect(b, a))
    }
  })
})

describe('the ten combo footprints', () => {
  it('broom + broom: cross sweep clears the row AND the column', () => {
    const board = boardFromRows(['abcde', 'bcdea', 'cabac'], PALETTE)
    deepStrictEqual(posKeys(crossSweep({ board, a: { x: 2, y: 1 }, b: { x: 3, y: 1 } })), [
      '0,1',
      '1,1',
      '2,0',
      '2,1',
      '2,2',
      '3,1',
      '4,1',
    ])
  })

  it('broom + ghost: sweeps the densest line, preferring the line through the pair', () => {
    const board = boardFromRows(['aba', 'aba', 'aba', 'bbc'], PALETTE)
    deepStrictEqual(posKeys(carriedSweep({ board, a: { x: 0, y: 1 }, b: { x: 1, y: 1 } })), [
      '0,0',
      '0,1',
      '0,2',
      '0,3',
    ])
    const rowWins = boardFromRows(['aaaa', 'bbbb', 'cccc'], PALETTE)
    deepStrictEqual(
      posKeys(carriedSweep({ board: rowWins, a: { x: 1, y: 1 }, b: { x: 2, y: 1 } })),
      ['0,1', '1,1', '2,1', '3,1'],
    )
  })

  it('broom + bomb: triple sweep of three rows and three columns', () => {
    const board = boardFromRows(['abc', 'bcd', 'cab'], PALETTE)
    deepStrictEqual(posKeys(tripleSweep({ board, a: { x: 1, y: 1 }, b: { x: 1, y: 0 } })), [
      '0,0',
      '0,1',
      '0,2',
      '1,0',
      '1,1',
      '1,2',
      '2,0',
      '2,1',
      '2,2',
    ])
    const big = boardFromRows(['abcde', 'bcdea', 'cabac', 'eabcd', 'deabc'], PALETTE)
    strictEqual(tripleSweep({ board: big, a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }).length, 16)
  })

  it('broom + cauldron: turns the most common plain colour into launched brooms', () => {
    const board = boardFromRows(['aaab', 'abca', 'baba'], PALETTE)
    requireCell(board, { x: 3, y: 2 }).tile = makeTile('pumpkin', 'little-ghost')
    const cells = broomLaunch({ board, a: { x: 0, y: 0 }, b: { x: 1, y: 0 } })
    deepStrictEqual(posKeys(cells), ['0,0', '0,1', '1,0', '1,2', '2,0', '3,1'])
    for (const [i, at] of cells.entries()) {
      const tile = tileAt(board, at)
      ok(tile)
      strictEqual(tile.powerup, 'broom')
      strictEqual(tile.dir, i % 2 === 0 ? 'h' : 'v')
    }
    // A tile that already carried a power-up keeps it.
    strictEqual(tileAt(board, { x: 3, y: 2 })?.powerup, 'little-ghost')
  })

  it('ghost + ghost: three little ghosts hit three distinct objective tiles', () => {
    const board = boardFromRows(['G.t.', '....', '.t.t'], { G: 'pumpkin', t: 'bat' })
    const cells = ghostTrio({ board, a: { x: 1, y: 1 }, b: { x: 0, y: 1 } })
    // No goal system plugged in: the three nearest tiles, nearest first.
    deepStrictEqual(posKeys(cells), ['0,0', '1,2', '2,0'])

    registerObjectiveTileSelector(() => ({ x: 3, y: 2 }))
    try {
      const homed = ghostTrio({ board, a: { x: 1, y: 1 }, b: { x: 0, y: 1 } })
      // The selector's tile plus two nearest fallbacks — never a duplicate.
      deepStrictEqual(posKeys(homed), ['0,0', '1,2', '3,2'])
    } finally {
      registerObjectiveTileSelector(undefined)
    }
  })

  it('ghost + bomb: drops the pumpkin on the densest 3×3 cluster', () => {
    const board = boardFromRows(['aa..d', 'aa.d.', 'aa...'], PALETTE)
    deepStrictEqual(posKeys(pumpkinDrop({ board, a: { x: 4, y: 2 }, b: { x: 0, y: 0 } })), [
      '0,0',
      '0,1',
      '0,2',
      '1,0',
      '1,1',
      '1,2',
    ])
    // Uniform density: the window covering the swapped pair wins the tie.
    const uniform = boardFromRows(['aaaaa', 'aaaaa', 'aaaaa'], PALETTE)
    deepStrictEqual(
      posKeys(pumpkinDrop({ board: uniform, a: { x: 3, y: 0 }, b: { x: 3, y: 1 } })),
      ['1,0', '1,1', '1,2', '2,0', '2,1', '2,2', '3,0', '3,1', '3,2'],
    )
  })

  it('bomb + bomb: giant 5×5 blast centred on the pair, clipped to the board', () => {
    const board = boardFromRows(['abcde', 'bcdea', 'cabac', 'eabcd', 'deabc'], PALETTE)
    strictEqual(giantBlast({ board, a: { x: 2, y: 2 }, b: { x: 2, y: 1 } }).length, 25)
    deepStrictEqual(posKeys(giantBlast({ board, a: { x: 0, y: 0 }, b: { x: 1, y: 0 } })), [
      '0,0',
      '0,1',
      '0,2',
      '1,0',
      '1,1',
      '1,2',
      '2,0',
      '2,1',
      '2,2',
    ])
  })

  it('bomb + cauldron: the most common colour chain-detonates as pumpkin bombs', () => {
    const board = boardFromRows(['aab', 'acd', 'cba'], PALETTE)
    requireCell(board, { x: 1, y: 2 }).tile = makeTile('bat', 'bomb')
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('skull', 'cauldron')
    const { plan, combo } = planCombo(board, { x: 1, y: 2 }, { x: 2, y: 2 })
    deepStrictEqual(combo.a, { at: { x: 1, y: 2 }, powerup: 'cauldron' })
    deepStrictEqual(combo.b, { at: { x: 2, y: 2 }, powerup: 'bomb' })
    for (const at of [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]) {
      strictEqual(tileAt(board, at)?.powerup, 'bomb')
    }
    // The casters are consumed, not detonated as themselves.
    strictEqual(tileAt(board, { x: 1, y: 2 })?.powerup, undefined)
    strictEqual(tileAt(board, { x: 2, y: 2 })?.powerup, undefined)

    const result = resolveMatches(board, createRng(5), TILE_TYPES, [], plan)
    const clear = clearCells(result.events, 0)
    strictEqual(clear.cause, 'powerup')
    deepStrictEqual(cellKeys(clear.cells), [
      '0,0',
      '0,1',
      '0,2',
      '1,0',
      '1,1',
      '1,2',
      '2,0',
      '2,1',
      '2,2',
    ])
    ok(board.cells.every((cell) => !cell.tile?.powerup))
  })

  it('ghost + cauldron: the most common colour becomes objective-homing little ghosts', () => {
    const board = boardFromRows(['aab', 'acd', 'cba'], PALETTE)
    requireCell(board, { x: 1, y: 2 }).tile = makeTile('skull', 'cauldron')
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('candy', 'little-ghost')
    registerObjectiveTileSelector(() => ({ x: 2, y: 0 }))
    try {
      const { plan } = planCombo(board, { x: 1, y: 2 }, { x: 2, y: 2 })
      for (const at of [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ]) {
        strictEqual(tileAt(board, at)?.powerup, 'little-ghost')
      }
      const result = resolveMatches(board, createRng(6), TILE_TYPES, [], plan)
      const clear = clearCells(result.events, 0)
      // Cast cells, the three converted ghosts, and the shared objective tile.
      deepStrictEqual(cellKeys(clear.cells), ['0,0', '0,1', '1,0', '1,2', '2,0', '2,2'])
    } finally {
      registerObjectiveTileSelector(undefined)
    }
  })

  it('cauldron + cauldron: full-board clear and one layer off every obstacle', () => {
    const board = boardFromRows(['abcde', 'deabc', 'bcdae'], PALETTE)
    board.cells[0] = cobwebCell(3, makeTile('pumpkin'))
    board.cells[1] = gravestoneCell(2)
    board.cells[2] = iceCell(makeTile('skull'))
    board.cells[3] = lockCell(makeTile('bat'))
    board.cells[4] = slimeCell(3)
    requireCell(board, { x: 0, y: 2 }).tile = makeTile('potion', 'cauldron')
    requireCell(board, { x: 1, y: 2 }).tile = makeTile('potion', 'cauldron')
    deepStrictEqual(
      posKeys(nightOfWitches({ board, a: { x: 0, y: 2 }, b: { x: 1, y: 2 } })).length,
      15,
    )
    const { plan } = planCombo(board, { x: 0, y: 2 }, { x: 1, y: 2 })
    strictEqual(plan.detonate.length, 15)

    // Seed 1 resolves in a single pass (no refill cascades), so the pass-1
    // obstacle interaction is asserted exactly.
    const result = resolveMatches(board, createRng(1), TILE_TYPES, [], plan)
    const clear = firstClear(result.events)
    // Every tile goes except the ones shielded by an onHit obstacle: the webbed
    // tile, the cracked-free ice tile and the freed caged tile survive this pass.
    deepStrictEqual(cellKeys(clear.cells), [
      '0,1',
      '0,2',
      '1,1',
      '1,2',
      '2,1',
      '2,2',
      '3,1',
      '3,2',
      '4,1',
      '4,2',
    ])
    strictEqual(requireCell(board, { x: 0, y: 0 }).modifier, 'cobweb-2')
    strictEqual(requireCell(board, { x: 1, y: 0 }).modifier, 'gravestone-1')
    strictEqual(requireCell(board, { x: 2, y: 0 }).modifier, undefined)
    strictEqual(requireCell(board, { x: 3, y: 0 }).modifier, undefined)
    strictEqual(requireCell(board, { x: 4, y: 0 }).modifier, undefined)
    // The webbed tile never leaves its cell (the web stays a gravity barrier);
    // the freed ice/cage tiles survive the pass and fall down their columns.
    strictEqual(tileAt(board, { x: 0, y: 0 })?.type, 'pumpkin')
    const survivors = board.cells.map((cell) => cell.tile?.type)
    ok(survivors.includes('skull'), 'the cracked-free ice tile should survive')
    ok(survivors.includes('bat'), 'the freed caged tile should survive')
    const obstacleEvents = result.events.filter((event) => event.type === 'obstacle')
    strictEqual(obstacleEvents.length, 5)
    ok(board.cells.every((cell) => !cell.tile?.powerup))
  })
})

describe('combo resolution through the board', () => {
  it('a launched-broom combo clears the union of the launched sweeps', () => {
    const board = boardFromRows(['aab', 'aca'], PALETTE)
    requireCell(board, { x: 2, y: 0 }).tile = makeTile('bat', 'broom')
    requireCell(board, { x: 2, y: 1 }).tile = makeTile('potion', 'cauldron')
    const { plan } = planCombo(board, { x: 2, y: 0 }, { x: 2, y: 1 })
    strictEqual(tileAt(board, { x: 0, y: 0 })?.powerup, 'broom')
    strictEqual(tileAt(board, { x: 2, y: 0 })?.powerup, undefined)

    const result = resolveMatches(board, createRng(7), TILE_TYPES, [], plan)
    const clear = clearCells(result.events, 0)
    strictEqual(clear.cause, 'powerup')
    deepStrictEqual(cellKeys(clear.cells), ['0,0', '0,1', '1,0', '1,1', '2,0', '2,1'])
  })

  it('combo sweeps peel exactly one cobweb layer per direct hit', () => {
    const board = boardFromRows(['abcde', 'deabc', 'bcdae'], PALETTE)
    board.cells[1] = cobwebCell(2, makeTile('skull'))
    requireCell(board, { x: 1, y: 1 }).tile = makeTile('pumpkin', 'broom', 'v')
    requireCell(board, { x: 1, y: 2 }).tile = makeTile('bat', 'broom', 'h')
    const { plan, combo } = planCombo(board, { x: 1, y: 1 }, { x: 1, y: 2 })
    deepStrictEqual(combo, {
      a: { at: { x: 1, y: 1 }, powerup: 'broom' },
      b: { at: { x: 1, y: 2 }, powerup: 'broom' },
    })

    const result = resolveMatches(board, createRng(4), TILE_TYPES, [], plan)
    const clear = firstClear(result.events)
    deepStrictEqual(cellKeys(clear.cells), ['0,1', '1,1', '1,2', '2,1', '3,1', '4,1'])
    strictEqual(requireCell(board, { x: 1, y: 0 }).modifier, 'cobweb-1')
    strictEqual(tileAt(board, { x: 1, y: 0 })?.type, 'skull')
  })

  it('keeps the default swap behaviour for non-combo pairs', () => {
    const board = boardFromRows(['ab', 'cd'], PALETTE)
    requireCell(board, { x: 0, y: 0 }).tile = makeTile('potion', 'cauldron')
    swapTiles(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    const plan = planSwapActivation(board, { x: 0, y: 0 }, { x: 1, y: 0 })
    ok(plan)
    strictEqual(plan.combo, undefined)
    deepStrictEqual(plan.detonate, [{ x: 1, y: 0 }])
    strictEqual(tileAt(board, { x: 1, y: 0 })?.charge, 'ghost')

    const plain = boardFromRows(['ab', 'cd'], PALETTE)
    requireCell(plain, { x: 0, y: 0 }).tile = makeTile('pumpkin', 'broom', 'h')
    swapTiles(plain, { x: 0, y: 0 }, { x: 1, y: 0 })
    strictEqual(planSwapActivation(plain, { x: 0, y: 0 }, { x: 1, y: 0 }), null)
  })

  it('a combo swap in Swap3Game emits swap → combo → clear and spends one move', () => {
    const board = boardFromRows(['abcde', 'deabc', 'bcdae', 'eabcd'], PALETTE)
    requireCell(board, { x: 2, y: 2 }).tile = makeTile('candy', 'little-ghost')
    requireCell(board, { x: 3, y: 2 }).tile = makeTile('ghost', 'broom', 'h')
    const game = new Swap3Game({ seed: 3, board })
    ok(!game.log.some((event) => event.type === 'shuffle'))

    const outcome = game.trySwap({ x: 2, y: 2 }, { x: 3, y: 2 })
    ok(outcome.accepted)
    deepStrictEqual(
      outcome.events.slice(0, 3).map((event) => event.type),
      ['swap', 'combo', 'clear'],
    )
    const combo = outcome.events[1]
    ok(combo && combo.type === 'combo')
    deepStrictEqual(combo.a, { at: { x: 2, y: 2 }, powerup: 'broom' })
    deepStrictEqual(combo.b, { at: { x: 3, y: 2 }, powerup: 'little-ghost' })

    // The ghost carries the broom to the densest row: row 2, through the pair.
    const clear = clearCells(outcome.events, 2)
    deepStrictEqual(cellKeys(clear.cells), ['0,2', '1,2', '2,2', '3,2', '4,2'])
    ok(game.board.cells.every((cell) => !cell.tile?.powerup))
    strictEqual(game.stats.movesUsed, 1)
  })
})
