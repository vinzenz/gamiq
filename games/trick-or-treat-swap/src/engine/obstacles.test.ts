import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyGravity, makeTile, requireCell } from './board.ts'
import { boardFromRows, FIXTURE_PALETTE, RUN4_GRID } from './board-strings.ts'
import { Swap3Game } from './game.ts'
import { detectShapes } from './match.ts'
import { SLIME_SPREAD_MOVES } from './obstacles.ts'
import { isSwappable, registerPowerupEffect, runTurnHooks } from './registry.ts'
import { resolveMatches } from './resolve.ts'
import { createRng } from './rng.ts'
import type { Board, Cell, GameEvent, Pos, TileType } from './types.ts'
import { TILE_TYPES } from './types.ts'
import './obstacles.ts'

// Test-only power-up footprints, so the interaction matrix does not depend on
// the real effects: the bomb is a "harpoon" (its own cell plus two to the
// right), the broom sweeps its row.
registerPowerupEffect('bomb', (ctx) => [ctx.at, { x: ctx.at.x + 2, y: ctx.at.y }])
registerPowerupEffect('broom', (ctx) => {
  const hit: Pos[] = []
  for (let x = 0; x < ctx.board.width; x++) hit.push({ x, y: ctx.at.y })
  return hit
})

/** Refill palette without one colour, so refills can never rematch that colour. */
function without(type: TileType): TileType[] {
  return TILE_TYPES.filter((c) => c !== type)
}

function emptyBoard(width: number, height: number): Board {
  return { width, height, cells: Array.from({ length: width * height }, () => ({})) }
}

function put(board: Board, x: number, y: number, type?: TileType, modifier?: string): Cell {
  const cell = requireCell(board, { x, y })
  cell.tile = type ? makeTile(type) : undefined
  if (modifier) cell.modifier = modifier
  return cell
}

function putPowerup(
  board: Board,
  x: number,
  y: number,
  type: TileType,
  powerup: 'bomb' | 'broom',
): void {
  requireCell(board, { x, y }).tile = makeTile(type, powerup)
}

function modifierAt(board: Board, x: number, y: number): string | undefined {
  return requireCell(board, { x, y }).modifier
}

type ObstacleEvent = Extract<GameEvent, { type: 'obstacle' }>

function obstacleEvents(result: { events: GameEvent[] }): ObstacleEvent[] {
  return result.events.filter((e): e is ObstacleEvent => e.type === 'obstacle')
}

function collect(): { events: GameEvent[]; emit: (event: GameEvent) => void } {
  const events: GameEvent[] = []
  return { events, emit: (event) => events.push(event) }
}

/** Settled 3×3 with a pumpkin column at x=1; the centre cell carries `modifier`. */
function pumpkinColumnBoard(modifier: string): Board {
  const board = emptyBoard(3, 3)
  put(board, 0, 0, 'ghost')
  put(board, 1, 0, 'pumpkin')
  put(board, 2, 0, 'skull')
  put(board, 0, 1, 'skull')
  put(board, 1, 1, 'pumpkin', modifier)
  put(board, 2, 1, 'ghost')
  put(board, 0, 2, 'bat')
  put(board, 1, 2, 'pumpkin')
  put(board, 2, 2, 'candy')
  return board
}

/**
 * 5×3 with a pumpkin run-3 at (0,1)–(2,1) whose third cell is a harpoon bomb:
 * the footprint is the run plus (4,1); (3,1) is cleared only as filler bat.
 * Everything else is settled, so caller-placed cells are the only modifiers.
 */
function bombBoard(): Board {
  const board = emptyBoard(5, 3)
  const fill0: TileType[] = ['pumpkin', 'ghost', 'skull', 'pumpkin', 'ghost']
  const fill2: TileType[] = ['ghost', 'skull', 'pumpkin', 'ghost', 'skull']
  fill0.forEach((type, x) => {
    put(board, x, 0, type)
  })
  fill2.forEach((type, x) => {
    put(board, x, 2, type)
  })
  put(board, 0, 1, 'pumpkin')
  put(board, 1, 1, 'pumpkin')
  putPowerup(board, 2, 1, 'pumpkin', 'bomb')
  put(board, 3, 1, 'bat')
  put(board, 4, 1, 'skull')
  return board
}

describe('cobweb', () => {
  it('a match on the tile peels one layer, keeps the tile, and orders its events', () => {
    const board = pumpkinColumnBoard('cobweb-2')
    const result = resolveMatches(board, createRng(42), without('pumpkin'))
    const cell = requireCell(board, { x: 1, y: 1 })
    strictEqual(cell.modifier, 'cobweb-1')
    strictEqual(cell.tile?.type, 'pumpkin')
    deepStrictEqual(result.cleared.pumpkin, 2, 'the webbed tile is not counted as cleared')
    deepStrictEqual(
      result.events.map((e) => e.type),
      ['match', 'obstacle', 'clear', 'spawn'],
    )
  })

  it('the last layer comes off with a destroy event and the tile is freed in place', () => {
    const board = pumpkinColumnBoard('cobweb-1')
    const freed = requireCell(board, { x: 1, y: 1 }).tile
    const result = resolveMatches(board, createRng(1), without('pumpkin'))
    strictEqual(modifierAt(board, 1, 1), undefined)
    ok(
      freed && board.cells.some((c) => c.tile?.id === freed.id),
      'the freed tile survives the peel (it may settle downwards)',
    )
    deepStrictEqual(
      obstacleEvents(result).map((e) => [e.action, e.modifier]),
      [['destroy', 'cobweb-1']],
    )
  })

  it('three matches strip a fresh cobweb; a bare cell then matches with no events', () => {
    const board = pumpkinColumnBoard('cobweb-3')
    const rng = createRng(42)
    for (const expected of ['cobweb-2', 'cobweb-1', undefined]) {
      put(board, 1, 0, 'pumpkin')
      put(board, 1, 2, 'pumpkin')
      resolveMatches(board, rng, without('pumpkin'))
      strictEqual(modifierAt(board, 1, 1), expected)
    }
    put(board, 1, 0, 'pumpkin')
    put(board, 1, 1, 'pumpkin')
    put(board, 1, 2, 'pumpkin')
    const result = resolveMatches(board, rng, without('pumpkin'))
    deepStrictEqual(obstacleEvents(result), [], 'no web left, no obstacle events')
    ok(result.cleared.pumpkin >= 3, 'the bare column clears like any other')
  })

  it('a match merely next to the web leaves it alone', () => {
    const board = emptyBoard(4, 2)
    put(board, 0, 0, 'pumpkin', 'cobweb-2')
    put(board, 1, 0, 'bat')
    put(board, 2, 0, 'bat')
    put(board, 3, 0, 'bat')
    put(board, 0, 1, 'ghost')
    put(board, 1, 1, 'skull')
    put(board, 2, 1, 'pumpkin')
    put(board, 3, 1, 'ghost')
    const result = resolveMatches(board, createRng(42), without('pumpkin'))
    const cell = requireCell(board, { x: 0, y: 0 })
    strictEqual(cell.modifier, 'cobweb-2')
    strictEqual(cell.tile?.type, 'pumpkin')
    deepStrictEqual(obstacleEvents(result), [])
  })
})

describe('gravestone', () => {
  it('an adjacent match chips one hit off and no tile spawns there', () => {
    const board = emptyBoard(5, 1)
    put(board, 0, 0, undefined, 'gravestone-3')
    put(board, 1, 0, 'bat')
    put(board, 2, 0, 'bat')
    put(board, 3, 0, 'bat')
    put(board, 4, 0, 'skull')
    const result = resolveMatches(board, createRng(1), TILE_TYPES)
    const stone = requireCell(board, { x: 0, y: 0 })
    strictEqual(stone.modifier, 'gravestone-2')
    strictEqual(stone.tile, undefined)
    deepStrictEqual(
      obstacleEvents(result).map((e) => [e.action, e.modifier]),
      [['damage', 'gravestone-2']],
    )
  })

  it('the last hit breaks it and the cell refills', () => {
    const board = emptyBoard(5, 1)
    put(board, 0, 0, undefined, 'gravestone-1')
    put(board, 1, 0, 'bat')
    put(board, 2, 0, 'bat')
    put(board, 3, 0, 'bat')
    put(board, 4, 0, 'skull')
    const result = resolveMatches(board, createRng(1), TILE_TYPES)
    const stone = requireCell(board, { x: 0, y: 0 })
    strictEqual(stone.modifier, undefined)
    ok(stone.tile, 'a tile spawns where the stone broke')
    deepStrictEqual(
      obstacleEvents(result).map((e) => e.action),
      ['destroy'],
    )
  })

  it('falling tiles stack on top of it instead of passing through', () => {
    const board = emptyBoard(1, 5)
    put(board, 0, 0, 'bat')
    put(board, 0, 2, undefined, 'gravestone-1')
    put(board, 0, 3, 'bat')
    put(board, 0, 4, 'bat')
    deepStrictEqual(applyGravity(board), [{ from: { x: 0, y: 0 }, to: { x: 0, y: 1 } }])
    strictEqual(requireCell(board, { x: 0, y: 2 }).tile, undefined)
  })
})

describe('cursed ice', () => {
  it('a frozen tile rejects swaps with reason "locked"', () => {
    const board = boardFromRows(RUN4_GRID, FIXTURE_PALETTE)
    requireCell(board, { x: 2, y: 1 }).modifier = 'ice'
    const game = new Swap3Game({ seed: 1, board })
    const outcome = game.trySwap({ x: 2, y: 2 }, { x: 2, y: 1 })
    strictEqual(outcome.accepted, false)
    const reject = outcome.events.at(-1)
    ok(reject && reject.type === 'reject' && reject.reason === 'locked')
  })

  it('an adjacent match cracks it free and the tile survives', () => {
    const board = emptyBoard(4, 1)
    put(board, 0, 0, 'skull', 'ice')
    put(board, 1, 0, 'skull')
    put(board, 2, 0, 'skull')
    put(board, 3, 0, 'skull')
    const result = resolveMatches(board, createRng(42), without('skull'))
    const cell = requireCell(board, { x: 0, y: 0 })
    strictEqual(cell.modifier, undefined)
    strictEqual(cell.tile?.type, 'skull')
    strictEqual(isSwappable(cell), true, 'the cracked tile can be swapped again')
    deepStrictEqual(
      obstacleEvents(result).map((e) => e.action),
      ['destroy'],
    )
  })

  it('a frozen tile takes part in no match shape', () => {
    const board = emptyBoard(4, 1)
    for (let x = 0; x < 4; x++) put(board, x, 0, 'skull', 'ice')
    strictEqual(detectShapes(board).length, 0)
  })
})

describe('lock', () => {
  it('an adjacent match of the locked colour frees the tile', () => {
    const board = emptyBoard(4, 1)
    put(board, 0, 0, 'bat', 'lock')
    put(board, 1, 0, 'bat')
    put(board, 2, 0, 'bat')
    put(board, 3, 0, 'bat')
    const result = resolveMatches(board, createRng(42), without('bat'))
    const cell = requireCell(board, { x: 0, y: 0 })
    strictEqual(cell.modifier, undefined)
    strictEqual(cell.tile?.type, 'bat')
    deepStrictEqual(
      obstacleEvents(result).map((e) => e.action),
      ['destroy'],
    )
  })

  it('a match of another colour leaves the lock alone', () => {
    const board = emptyBoard(4, 1)
    put(board, 0, 0, 'skull', 'lock')
    put(board, 1, 0, 'bat')
    put(board, 2, 0, 'bat')
    put(board, 3, 0, 'bat')
    const result = resolveMatches(board, createRng(42), without('skull'))
    const cell = requireCell(board, { x: 0, y: 0 })
    strictEqual(cell.modifier, 'lock')
    strictEqual(cell.tile?.type, 'skull')
    deepStrictEqual(obstacleEvents(result), [])
  })

  it('a locked tile rejects swaps and joins no match shape', () => {
    const board = boardFromRows(RUN4_GRID, FIXTURE_PALETTE)
    requireCell(board, { x: 2, y: 1 }).modifier = 'lock'
    const game = new Swap3Game({ seed: 1, board })
    const outcome = game.trySwap({ x: 2, y: 2 }, { x: 2, y: 1 })
    strictEqual(outcome.accepted, false)
    const reject = outcome.events.at(-1)
    ok(reject && reject.type === 'reject' && reject.reason === 'locked')
    const trio = emptyBoard(3, 1)
    put(trio, 0, 0, 'skull', 'lock')
    put(trio, 1, 0, 'skull', 'lock')
    put(trio, 2, 0, 'skull', 'lock')
    strictEqual(detectShapes(trio).length, 0)
  })
})

describe('slime', () => {
  it('a match next to it dissolves it and the cell refills', () => {
    const board = emptyBoard(5, 1)
    put(board, 0, 0, undefined, 'slime-3')
    put(board, 1, 0, 'bat')
    put(board, 2, 0, 'bat')
    put(board, 3, 0, 'bat')
    put(board, 4, 0, 'skull')
    const result = resolveMatches(board, createRng(1), TILE_TYPES)
    const cell = requireCell(board, { x: 0, y: 0 })
    strictEqual(cell.modifier, undefined)
    ok(cell.tile, 'the dissolved cell refills like a normal column cell')
    deepStrictEqual(
      obstacleEvents(result).map((e) => e.action),
      ['destroy'],
    )
  })

  it('the countdown ticks down each move until it spreads onto a neighbour', () => {
    const board = emptyBoard(3, 3)
    put(board, 1, 1, undefined, 'slime-3')
    for (const [x, y] of [
      [0, 1],
      [2, 1],
      [1, 0],
      [1, 2],
    ] as const) {
      put(board, x, y, 'pumpkin')
    }
    const { events, emit } = collect()
    const rng = createRng(5)

    runTurnHooks(board, rng, emit)
    strictEqual(modifierAt(board, 1, 1), 'slime-2')
    runTurnHooks(board, rng, emit)
    strictEqual(modifierAt(board, 1, 1), 'slime-1')
    deepStrictEqual(events, [], 'ticking down is silent bookkeeping')

    runTurnHooks(board, rng, emit)
    strictEqual(modifierAt(board, 1, 1), `slime-${SLIME_SPREAD_MOVES}`, 'the parent resets fully')
    const spreads = events.filter(
      (e): e is ObstacleEvent => e.type === 'obstacle' && e.action === 'spread',
    )
    strictEqual(spreads.length, 1)
    const target = spreads[0]?.at
    ok(target)
    ok(
      Math.abs(target.x - 1) + Math.abs(target.y - 1) === 1,
      `the spread target (${target.x}, ${target.y}) must neighbour the parent`,
    )
    strictEqual(modifierAt(board, target.x, target.y), `slime-${SLIME_SPREAD_MOVES}`)
    const cleared = events.filter((e) => e.type === 'clear' && e.cause === 'obstacle')
    strictEqual(cleared.length, 1, 'the tile under the new goo is eaten with a clear event')
  })

  it('the spread eats exactly one neighbour tile and skips modifier cells', () => {
    const board = emptyBoard(3, 3)
    put(board, 1, 1, undefined, 'slime-1')
    const neighbours = [
      [0, 1],
      [2, 1],
      [1, 0],
      [1, 2],
    ] as const
    for (const [x, y] of neighbours) put(board, x, y, 'pumpkin')
    put(board, 1, 0, 'skull', 'ice') // an iced cell is never a spread target
    const { events, emit } = collect()
    runTurnHooks(board, createRng(5), emit)

    const spreads = events.filter(
      (e): e is ObstacleEvent => e.type === 'obstacle' && e.action === 'spread',
    )
    strictEqual(spreads.length, 1)
    const target = spreads[0]?.at
    ok(target)
    const targetCell = requireCell(board, target)
    strictEqual(targetCell.modifier, `slime-${SLIME_SPREAD_MOVES}`)
    strictEqual(targetCell.tile, undefined, 'the goo ate the tile under the new patch')
    ok(events.some((e) => e.type === 'clear' && e.cause === 'obstacle'))
    for (const [x, y] of neighbours) {
      if (x === target.x && y === target.y) continue
      const cell = requireCell(board, { x, y })
      strictEqual(cell.modifier, x === 1 && y === 0 ? 'ice' : undefined)
      strictEqual(cell.tile?.type, x === 1 && y === 0 ? 'skull' : 'pumpkin')
    }
  })

  it('a blocked-in slime keeps its countdown and retries', () => {
    const board = emptyBoard(3, 3)
    put(board, 1, 1, undefined, 'slime-1')
    for (const [x, y] of [
      [0, 1],
      [2, 1],
      [1, 0],
      [1, 2],
    ] as const) {
      put(board, x, y, undefined, 'gravestone-1')
    }
    const { events, emit } = collect()
    runTurnHooks(board, createRng(5), emit)
    strictEqual(modifierAt(board, 1, 1), 'slime-1', 'still primed to spread once space opens up')
    deepStrictEqual(events, [])
  })

  it('ticks down during a real game move away from the action', () => {
    const board = boardFromRows(RUN4_GRID, FIXTURE_PALETTE)
    requireCell(board, { x: 4, y: 4 }).tile = undefined
    requireCell(board, { x: 4, y: 4 }).modifier = 'slime-3'
    const game = new Swap3Game({ seed: 3, board })
    const hint = game.findHint()
    ok(hint)
    const outcome = game.trySwap(hint.a, hint.b)
    strictEqual(outcome.accepted, true)
    strictEqual(modifierAt(game.board, 4, 4), 'slime-2')
  })
})

describe('power-up interaction matrix', () => {
  // Every blocker once inside the harpoon footprint at (4,1), once just off
  // it at (4,0) — adjacent only to footprint cells, never to match cells. The
  // edge cobweb wears a bat so the skull pair below it cannot pre-match.
  const cases = [
    {
      name: 'cobweb',
      place: (b: Board, x: number, y: number) =>
        put(b, x, y, y === 0 ? 'bat' : 'skull', 'cobweb-2'),
      intact: 'cobweb-2',
      hit: 'cobweb-1',
    },
    {
      name: 'gravestone',
      place: (b: Board, x: number, y: number) => put(b, x, y, undefined, 'gravestone-3'),
      intact: 'gravestone-3',
      hit: 'gravestone-2',
    },
    {
      name: 'cursed ice',
      place: (b: Board, x: number, y: number) => put(b, x, y, 'bat', 'ice'),
      intact: 'ice',
      hit: undefined,
    },
    {
      name: 'lock',
      place: (b: Board, x: number, y: number) => put(b, x, y, 'candy', 'lock'),
      intact: 'lock',
      hit: undefined,
    },
    {
      name: 'slime',
      place: (b: Board, x: number, y: number) => put(b, x, y, undefined, 'slime-3'),
      intact: 'slime-3',
      hit: undefined,
    },
  ]

  for (const c of cases) {
    it(`${c.name}: a power-up footprint covering it hits it directly`, () => {
      const board = bombBoard()
      const cell = c.place(board, 4, 1)
      const tileBefore = cell.tile
      const result = resolveMatches(board, createRng(1), TILE_TYPES)
      strictEqual(cell.modifier, c.hit)
      if (tileBefore) {
        strictEqual(cell.tile, tileBefore, 'the tile under the obstacle survives a direct hit')
      }
      ok(obstacleEvents(result).some((e) => e.at.x === 4 && e.at.y === 1))
    })

    it(`${c.name}: a footprint edge merely next to it does nothing`, () => {
      const board = bombBoard()
      const cell = c.place(board, 4, 0)
      const tileBefore = cell.tile
      const result = resolveMatches(board, createRng(1), TILE_TYPES)
      strictEqual(cell.modifier, c.intact)
      if (tileBefore) strictEqual(cell.tile, tileBefore)
      deepStrictEqual(
        obstacleEvents(result).filter((e) => e.at.x === 4 && e.at.y === 0),
        [],
      )
    })
  }

  it('a broom sweep hits a gravestone in its row and clears around it', () => {
    const board = emptyBoard(5, 3)
    putPowerup(board, 0, 1, 'bat', 'broom')
    put(board, 1, 1, 'bat')
    put(board, 2, 1, 'bat')
    put(board, 3, 1, 'skull')
    put(board, 4, 1, undefined, 'gravestone-3')
    const fill0: TileType[] = ['pumpkin', 'ghost', 'skull', 'pumpkin', 'ghost']
    const fill2: TileType[] = ['ghost', 'skull', 'pumpkin', 'ghost', 'skull']
    fill0.forEach((type, x) => {
      put(board, x, 0, type)
    })
    fill2.forEach((type, x) => {
      put(board, x, 2, type)
    })
    const result = resolveMatches(board, createRng(1), TILE_TYPES)
    strictEqual(modifierAt(board, 4, 1), 'gravestone-2')
    ok(obstacleEvents(result).some((e) => e.at.x === 4 && e.at.y === 1 && e.action === 'damage'))
    deepStrictEqual(result.cleared.bat, 3, 'the sweep cleared the row around the stone')
  })
})
