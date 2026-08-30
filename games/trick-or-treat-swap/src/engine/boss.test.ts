import { deepStrictEqual, ok, strictEqual, throws } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { makeTile, requireCell } from './board.ts'
import { boardFromRows, FIXTURE_PALETTE } from './board-strings.ts'
import { attachBoss, findBoss, isBossModifier } from './boss.ts'
import { Swap3Game } from './game.ts'
import type { RawLevel } from './goals.ts'
import { buildLevelBoard, createLevelGame, GoalTracker, loadLevel } from './goals.ts'
import { detectShapes } from './match.ts'
import './obstacles.ts'
import './powerups.ts'
import type { Board, GameEvent } from './types.ts'

/**
 * Match-4 fixture (same shape as the goals ticket's deliver fixture): swapping
 * (2,3) with (2,4) forms a skull run across the bottom row that touches the
 * boss cell at (1,3) via (1,4). The boss cell itself is a tile-less occupant.
 */
const BOSS_ROWS = ['abcde', 'bcdef', 'cdefa', 'deXab', 'XXeXa']

const bossFixture = (id: string): Board => {
  const board = boardFromRows(BOSS_ROWS, FIXTURE_PALETTE)
  const cell = requireCell(board, { x: 1, y: 3 })
  cell.tile = undefined
  cell.modifier = id
  return board
}

/** Broom fixture: a broom at (3,2), boss cell at (1,2), no matches, one valid move. */
const broomFixture = (id: string): Board => {
  const board = boardFromRows(['abcde', 'deabc', 'b.bea', 'ceabd', 'eadcb'], FIXTURE_PALETTE)
  const boss = requireCell(board, { x: 1, y: 2 })
  boss.tile = undefined
  boss.modifier = id
  requireCell(board, { x: 3, y: 2 }).tile = makeTile('pumpkin', 'broom', 'h')
  return board
}

/** Play hint swaps until the game ends (bounded by the move budget). */
const playOut = (game: Swap3Game): void => {
  while (game.result === null) {
    const hint = game.findHint()
    ok(hint, 'no hint but the game has not ended')
    const outcome = game.trySwap(hint.a, hint.b)
    ok(outcome.accepted)
  }
}

type ObstacleEvent = Extract<GameEvent, { type: 'obstacle' }>

const spreadEvents = (events: readonly GameEvent[]): ObstacleEvent[] =>
  events.filter(
    (event): event is ObstacleEvent => event.type === 'obstacle' && event.action === 'spread',
  )

const bossLevel = (): RawLevel => ({
  id: 60,
  name: 'Boss House',
  seed: 4242,
  moves: 60,
  shape: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  tileTypes: { pumpkin: 2, ghost: 2, skull: 2, bat: 1 },
  obstacles: [{ x: 3, y: 3, modifier: 'boss' }],
  goals: [{ kind: 'boss', hits: 2 }],
  starThresholds: [10, 25],
  boss: { hp: 2, throwEvery: 50, throws: 'cobweb-1' },
})

describe('boss basics', () => {
  it('recognises boss modifier ids', () => {
    ok(isBossModifier('boss'))
    ok(isBossModifier('boss-1'))
    ok(isBossModifier('boss-99'))
    ok(!isBossModifier('bosses'))
    ok(!isBossModifier('boss-0'))
    ok(!isBossModifier('cobweb-2'))
  })

  it('finds the live boss and its hp', () => {
    const board = bossFixture('boss-7')
    deepStrictEqual(findBoss(board), { at: { x: 1, y: 3 }, hp: 7 })
    strictEqual(findBoss(bossFixture('boss')), null, 'the bare marker is not a live boss')
    strictEqual(findBoss(boardFromRows(BOSS_ROWS, FIXTURE_PALETTE)), null)
  })

  it('refuses to arm an unregistered thrown modifier', () => {
    throws(
      () => attachBoss(bossFixture('boss-1'), { hp: 1, throwEvery: 1, throws: 'unicorn-1' }),
      /not a registered modifier/,
    )
  })
})

describe('boss damage', () => {
  it('destroys a 1 hp boss on an adjacent match and frees the cell', () => {
    const board = bossFixture('boss-1')
    const game = new Swap3Game({ seed: 7, board })
    const tracker = new GoalTracker(game, [{ kind: 'boss', hits: 1 }])
    let hits = 0
    attachBoss(board, { hp: 1, throwEvery: 50, throws: 'cobweb-1' }, () => {
      hits++
      tracker.recordBossHit()
    })
    ok(!tracker.allMet)

    const outcome = game.trySwap({ x: 2, y: 3 }, { x: 2, y: 4 })
    ok(outcome.accepted)
    tracker.sync()

    const destroy = outcome.events.find(
      (event) => event.type === 'obstacle' && event.action === 'destroy',
    )
    ok(destroy, 'no destroy event')
    strictEqual(requireCell(board, { x: 1, y: 3 }).modifier, undefined, 'cell not freed')
    strictEqual(hits, 1)
    strictEqual(tracker.bossHits, 1)
    ok(tracker.allMet)
    strictEqual(findBoss(board), null)
    // The freed cell fills like a normal column cell in the same move.
    ok(requireCell(board, { x: 1, y: 3 }).tile, 'freed cell did not refill')
  })

  it('deals one damage per resolution pass, not per match', () => {
    const board = bossFixture('boss-2')
    const game = new Swap3Game({ seed: 7, board })
    const tracker = new GoalTracker(game, [{ kind: 'boss', hits: 2 }])
    attachBoss(board, { hp: 2, throwEvery: 99, throws: 'cobweb-1' }, () => tracker.recordBossHit())

    const outcome = game.trySwap({ x: 2, y: 3 }, { x: 2, y: 4 })
    ok(outcome.accepted)
    tracker.sync()

    // Every pass that holds a match adjacent to the boss deals exactly one
    // hit (damage, or the final destroy) — never one per match group.
    const bossCell = { x: 1, y: 3 }
    const damagingPasses = new Set<number>()
    let depth = 1
    for (const event of outcome.events) {
      if (event.type === 'cascade') depth = event.depth
      if (event.type !== 'match') continue
      const touches = event.at.some(
        (at) => Math.abs(at.x - bossCell.x) + Math.abs(at.y - bossCell.y) === 1,
      )
      if (touches) damagingPasses.add(depth)
    }
    const bossHits = outcome.events.filter(
      (event) =>
        event.type === 'obstacle' &&
        (event.action === 'damage' || event.action === 'destroy') &&
        event.modifier.startsWith('boss-'),
    )
    ok(damagingPasses.size >= 1, 'fixture lost its adjacent match')
    strictEqual(bossHits.length, damagingPasses.size)
    strictEqual(tracker.bossHits, damagingPasses.size)
    strictEqual(findBoss(board)?.hp ?? 0, Math.max(0, 2 - damagingPasses.size))
    strictEqual(tracker.allMet, damagingPasses.size >= 2)
  })

  it('takes damage from power-up footprints covering the boss cell', () => {
    const board = broomFixture('boss-1')
    const game = new Swap3Game({ seed: 7, board })
    ok(detectShapes(board).length === 0, 'broom fixture has pre-made matches')
    const tracker = new GoalTracker(game, [{ kind: 'boss', hits: 1 }])
    attachBoss(board, { hp: 1, throwEvery: 99, throws: 'cobweb-1' }, () => tracker.recordBossHit())

    const outcome = game.tryTap({ x: 3, y: 2 })
    ok(outcome.accepted)
    tracker.sync()

    const destroy = outcome.events.find(
      (event) => event.type === 'obstacle' && event.action === 'destroy',
    )
    ok(destroy, 'the broom sweep did not hit the boss')
    strictEqual(requireCell(board, { x: 1, y: 2 }).modifier, undefined)
    ok(tracker.allMet)
  })

  it('lets the freed cell fall and refill normally after defeat', () => {
    const board = bossFixture('boss-1')
    const game = new Swap3Game({ seed: 7, board })
    attachBoss(board, { hp: 1, throwEvery: 99, throws: 'cobweb-1' })
    ok(game.trySwap({ x: 2, y: 3 }, { x: 2, y: 4 }).accepted)

    // Tiles stacked above the old boss cell drop into it on the next move.
    const hint = game.findHint()
    ok(hint)
    ok(game.trySwap(hint.a, hint.b).accepted)
    for (let y = 0; y < board.height; y++) {
      ok(requireCell(board, { x: 1, y }).tile, `column 1 has a hole at y=${y}`)
    }
  })
})

describe('boss throws', () => {
  it('throws every N moves onto a plain cell, wrapping the tile', () => {
    const board = bossFixture('boss-99')
    const game = new Swap3Game({ seed: 7, board })
    attachBoss(board, { hp: 99, throwEvery: 2, throws: 'cobweb-1' })

    let spreads = 0
    let firstThrow: ObstacleEvent | undefined
    for (let move = 1; move <= 4; move++) {
      const hint = game.findHint()
      ok(hint)
      const outcome = game.trySwap(hint.a, hint.b)
      ok(outcome.accepted)
      const thrown = spreadEvents(outcome.events)
      spreads += thrown.length
      strictEqual(spreads, Math.floor(move / 2), `wrong throw count after move ${move}`)
      if (thrown[0] && !firstThrow) {
        firstThrow = thrown[0]
        const cell = requireCell(board, firstThrow.at)
        strictEqual(cell.modifier, 'cobweb-1')
        ok(cell.tile, 'cobweb must wrap the tile it lands on')
      }
    }
    ok(firstThrow)
    strictEqual(firstThrow.modifier, 'cobweb-1')
  })

  it('occupant throws replace the tile and emit the eaten clear', () => {
    const board = bossFixture('boss-99')
    const game = new Swap3Game({ seed: 7, board })
    attachBoss(board, { hp: 99, throwEvery: 1, throws: 'slime-3' })

    const hint = game.findHint()
    ok(hint)
    const outcome = game.trySwap(hint.a, hint.b)
    ok(outcome.accepted)
    const thrown = spreadEvents(outcome.events)
    strictEqual(thrown.length, 1)
    const at = thrown[0]?.at
    ok(at)
    const cell = requireCell(board, at)
    // The slime hook may tick the fresh slime in the same move (hook order is
    // import order), so accept the freshly thrown id or its first tick.
    ok(cell.modifier === 'slime-3' || cell.modifier === 'slime-2', `got ${cell.modifier}`)
    strictEqual(cell.tile, undefined, 'slime must eat the tile it lands on')
    ok(
      outcome.events.some((event) => event.type === 'clear' && event.cause === 'obstacle'),
      'no clear event for the eaten tile',
    )
  })

  it('stops throwing once the boss is defeated', () => {
    const board = bossFixture('boss-1')
    const game = new Swap3Game({ seed: 7, board })
    attachBoss(board, { hp: 1, throwEvery: 1, throws: 'cobweb-1' })

    const kill = game.trySwap({ x: 2, y: 3 }, { x: 2, y: 4 })
    ok(kill.accepted)
    strictEqual(spreadEvents(kill.events).length, 0, 'threw in its own death move')
    for (let move = 0; move < 2; move++) {
      const hint = game.findHint()
      ok(hint)
      const outcome = game.trySwap(hint.a, hint.b)
      ok(outcome.accepted)
      strictEqual(spreadEvents(outcome.events).length, 0, 'threw after defeat')
    }
  })

  it('never throws for a bare boss marker without a session', () => {
    const board = bossFixture('boss')
    const game = new Swap3Game({ seed: 7, board })
    const tracker = new GoalTracker(game, [{ kind: 'boss', hits: 1 }])

    const outcome = game.trySwap({ x: 2, y: 3 }, { x: 2, y: 4 })
    ok(outcome.accepted)
    tracker.sync()
    strictEqual(spreadEvents(outcome.events).length, 0)
    strictEqual(requireCell(board, { x: 1, y: 3 }).modifier, 'boss', 'marker must stay inert')
    ok(tracker.allMet, 'the adjacency hook form still counts hits')
  })
})

describe('boss in the level system', () => {
  it('validates the boss field', () => {
    const level = loadLevel(bossLevel())
    deepStrictEqual(level.boss, { hp: 2, throwEvery: 50, throws: 'cobweb-1' })
  })

  it('rejects broken boss configs', () => {
    const bad = (boss: unknown, pattern: RegExp) => {
      throws(() => loadLevel({ ...bossLevel(), boss }), pattern)
    }
    bad(null, /must be an object/)
    bad({ hp: 0, throwEvery: 1, throws: 'cobweb-1' }, /boss\.hp/)
    bad({ hp: 100, throwEvery: 1, throws: 'cobweb-1' }, /boss\.hp/)
    bad({ hp: 1.5, throwEvery: 1, throws: 'cobweb-1' }, /boss\.hp/)
    bad({ hp: 3, throwEvery: 0, throws: 'cobweb-1' }, /boss\.throwEvery/)
    bad({ hp: 3, throwEvery: 51, throws: 'cobweb-1' }, /boss\.throwEvery/)
    bad({ hp: 3, throwEvery: 1, throws: '' }, /boss\.throws/)
    bad({ hp: 3, throwEvery: 1 }, /boss\.throws/)
    bad({ hp: 3, throwEvery: 1, throws: 'void' }, /cannot be thrown/)
    bad({ hp: 3, throwEvery: 1, throws: 'boss-2' }, /cannot be thrown/)
  })

  it('cross-checks the boss cell and the boss goal', () => {
    const withoutCell = { ...bossLevel(), obstacles: [] }
    throws(() => loadLevel(withoutCell), /no cell carries the 'boss' modifier/)

    const withoutGoal = { ...bossLevel(), goals: [{ kind: 'collect', color: 'bat', count: 5 }] }
    throws(() => loadLevel(withoutGoal), /goal is missing/)

    const mismatched = {
      ...bossLevel(),
      goals: [{ kind: 'boss', hits: 5 }],
    }
    throws(() => loadLevel(mismatched), /must equal the boss goal's hits/)

    const twin = {
      ...bossLevel(),
      obstacles: [
        { x: 3, y: 3, modifier: 'boss' },
        { x: 5, y: 5, modifier: 'boss' },
      ],
    }
    throws(() => loadLevel(twin), /at most one 'boss' cell/)

    const expanded = {
      ...bossLevel(),
      obstacles: [{ x: 3, y: 3, modifier: 'boss-2' }],
    }
    throws(() => loadLevel(expanded), /bare 'boss' cell/)

    // The hook form (no config) stays legal: goal + placed cell, no boss field.
    const hookForm = { ...bossLevel(), boss: undefined }
    strictEqual(loadLevel(hookForm).boss, undefined)
  })

  it('builds the boss cell as a tile-less occupant carrying the hp', () => {
    const board = buildLevelBoard(loadLevel(bossLevel()))
    const boss = requireCell(board, { x: 3, y: 3 })
    strictEqual(boss.modifier, 'boss-2')
    strictEqual(boss.tile, undefined)

    const bare = buildLevelBoard(loadLevel({ ...bossLevel(), boss: undefined }))
    const marker = requireCell(bare, { x: 3, y: 3 })
    strictEqual(marker.modifier, 'boss')
    strictEqual(marker.tile, undefined)
  })

  it('keeps the boss cell empty while it lives', () => {
    const { game } = createLevelGame(bossLevel())
    const hint = game.findHint()
    ok(hint)
    ok(game.trySwap(hint.a, hint.b).accepted)
    const cell = requireCell(game.board, { x: 3, y: 3 })
    ok(cell.modifier === 'boss-1' || cell.modifier === 'boss-2', 'boss cell lost its hp id')
    strictEqual(cell.tile, undefined)
  })
})

describe('boss levels are playable', () => {
  it('hp knob: the level is won when the boss dies, not by collecting', () => {
    const { game, tracker } = createLevelGame(bossLevel())
    playOut(game)
    strictEqual(game.result, 'win')
    ok(game.stats.movesUsed < 60, 'won only because the moves ran out?')
    strictEqual(tracker.bossHits, 2)
    const destroy = game.log.find(
      (event) => event.type === 'obstacle' && event.action === 'destroy',
    )
    ok(destroy, 'the boss never died')
    strictEqual(findBoss(game.board), null)
  })

  it('throwEvery knob: a throw every move for every resolved move', () => {
    const raw: RawLevel = {
      ...bossLevel(),
      id: 61,
      name: 'Throw Every Move',
      moves: 5,
      goals: [{ kind: 'boss', hits: 99 }],
      starThresholds: [0, 0],
      boss: { hp: 99, throwEvery: 1, throws: 'cobweb-1' },
    }
    const { game } = createLevelGame(raw)
    playOut(game)
    strictEqual(game.result, 'lose')
    strictEqual(game.stats.movesUsed, 5)
    strictEqual(spreadEvents(game.log).length, 5)
  })

  it('throws knob: gravestones land and replace the tile, level stays winnable', () => {
    const raw: RawLevel = {
      ...bossLevel(),
      id: 62,
      name: 'Gravestone Thrower',
      seed: 2026,
      goals: [{ kind: 'boss', hits: 2 }],
      boss: { hp: 2, throwEvery: 3, throws: 'gravestone-1' },
    }
    const { game, tracker } = createLevelGame(raw)
    playOut(game)
    strictEqual(game.result, 'win')
    strictEqual(tracker.bossHits, 2)
    const spreads = spreadEvents(game.log)
    ok(spreads.length > 0, 'no gravestones were thrown')
    ok(
      spreads.some((event) => event.modifier === 'gravestone-1'),
      'only non-gravestone throws happened',
    )
    ok(
      game.log.some((event) => event.type === 'clear' && event.cause === 'obstacle'),
      'no tile was eaten by a thrown occupant',
    )
  })

  it('hook form: a bare boss level is winnable without a boss field', () => {
    const raw: RawLevel = { ...bossLevel(), id: 63, boss: undefined }
    const { game, tracker } = createLevelGame(raw)
    playOut(game)
    strictEqual(game.result, 'win')
    ok(tracker.bossHits >= 2)
    strictEqual(requireCell(game.board, { x: 3, y: 3 }).modifier, 'boss', 'marker must survive')
    strictEqual(spreadEvents(game.log).length, 0, 'hook form must never throw')
  })
})
