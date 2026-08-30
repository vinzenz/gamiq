import { deepStrictEqual, ok, strictEqual, throws } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LEVELS, levelGame } from '../levels/index.ts'
import { requireCell } from './board.ts'
import { boardFromRows, FIXTURE_PALETTE } from './board-strings.ts'
import { Swap3Game } from './game.ts'
import type { GoalProgress, RawLevel } from './goals.ts'
import {
  buildLevelBoard,
  createLevelGame,
  GoalTracker,
  LevelValidationError,
  levelStars,
  loadLevel,
  starsFor,
} from './goals.ts'
import { detectShapes } from './match.ts'
import type { Board } from './types.ts'

const baseLevel = (): RawLevel => ({
  id: 1,
  name: 'Fixture',
  seed: 7,
  moves: 20,
  shape: ['.....', '.....', '.....', '.....', '.....'],
  tileTypes: { pumpkin: 1, ghost: 1, skull: 1 },
  goals: [{ kind: 'collect', color: 'pumpkin', count: 5 }],
  starThresholds: [2, 6],
})

/**
 * Deterministic match fixture: swapping (2,3) with (2,4) drops the skull into
 * the bottom row and forms a match-4 there, clearing three skulls on the
 * bottom row. (1,3) is marked 'boss' and touches the run, (0,0)/(4,0) carry
 * cobwebs away from the action.
 */
const DELIVER_ROWS = ['abcde', 'bcdef', 'cdefa', 'deXab', 'XXeXa']

const deliverFixture = (): Board => {
  const board = boardFromRows(DELIVER_ROWS, FIXTURE_PALETTE)
  requireCell(board, { x: 1, y: 3 }).modifier = 'boss'
  requireCell(board, { x: 0, y: 0 }).modifier = 'cobweb'
  requireCell(board, { x: 4, y: 0 }).modifier = 'cobweb'
  return board
}

const goalProgress = (tracker: GoalTracker, kind: string): GoalProgress => {
  const entry = tracker.progress.find((p) => p.goal.kind === kind)
  ok(entry, `no ${kind} goal in tracker`)
  return entry
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

describe('loadLevel', () => {
  it('accepts a well-formed level and normalizes it', () => {
    const level = loadLevel(baseLevel())
    strictEqual(level.id, 1)
    strictEqual(level.width, 5)
    strictEqual(level.height, 5)
    deepStrictEqual([...level.tileTypes], ['pumpkin', 'ghost', 'skull'])
    strictEqual(level.pool.length, 3)
    strictEqual(level.obstacles.length, 0)
  })

  it('expands spawn weights into the pick pool', () => {
    const level = loadLevel({ ...baseLevel(), tileTypes: { pumpkin: 3, ghost: 1, skull: 2 } })
    strictEqual(level.pool.length, 6)
    strictEqual(level.pool.filter((type) => type === 'pumpkin').length, 3)
    strictEqual(level.pool.filter((type) => type === 'ghost').length, 1)
  })

  it('collects every problem into one loud error', () => {
    try {
      loadLevel({
        ...baseLevel(),
        id: 0,
        tileTypes: { pumpkin: 1, ghost: 1 },
        goals: [],
        starThresholds: [5, 2],
      })
      ok(false, 'expected loadLevel to throw')
    } catch (error) {
      ok(error instanceof LevelValidationError)
      ok(error.issues.some((issue) => issue.startsWith('id:')))
      ok(error.issues.some((issue) => issue.startsWith('tileTypes:')))
      ok(error.issues.some((issue) => issue.startsWith('goals:')))
      ok(error.issues.some((issue) => issue.startsWith('starThresholds:')))
      ok(error.issues.length >= 4)
    }
  })

  it('rejects non-object data', () => {
    throws(() => loadLevel('level 1'), /JSON object/)
    throws(() => loadLevel(null), /JSON object/)
  })

  it('rejects broken shape masks', () => {
    throws(() => loadLevel({ ...baseLevel(), shape: ['.....', '..'] }), /shape\[1\]/)
    throws(
      () => loadLevel({ ...baseLevel(), shape: ['.....', '....x', '.....', '.....', '.....'] }),
      /only/,
    )
    throws(
      () => loadLevel({ ...baseLevel(), shape: ['##.##', '##.##', '##.##', '##.##', '##.##'] }),
      /playable/,
    )
  })

  it('rejects unusable spawn palettes', () => {
    throws(() => loadLevel({ ...baseLevel(), tileTypes: { pumpkin: 1, ghost: 1 } }), /at least 3/)
    throws(
      () => loadLevel({ ...baseLevel(), tileTypes: { pumpkin: 0, ghost: 1, skull: 1 } }),
      /weight/,
    )
    throws(
      () => loadLevel({ ...baseLevel(), tileTypes: { pumpkin: 1, ghost: 1, skull: 1, slime: 1 } }),
      /unknown tile type/,
    )
  })

  it('rejects obstacle placements that make no sense', () => {
    throws(
      () =>
        loadLevel({
          ...baseLevel(),
          shape: ['#....', '.....', '.....', '.....', '.....'],
          obstacles: [{ x: 0, y: 0, modifier: 'cobweb' }],
        }),
      /not a playable cell/,
    )
    throws(
      () => loadLevel({ ...baseLevel(), obstacles: [{ x: 9, y: 9, modifier: 'cobweb' }] }),
      /outside/,
    )
    throws(
      () => loadLevel({ ...baseLevel(), obstacles: [{ x: 0, y: 0, modifier: 'void' }] }),
      /reserved for shape-mask holes/,
    )
    throws(
      () =>
        loadLevel({
          ...baseLevel(),
          obstacles: [
            { x: 1, y: 1, modifier: 'cobweb' },
            { x: 1, y: 1, modifier: 'cobweb' },
          ],
        }),
      /used twice/,
    )
  })

  it('rejects goals that reference the level wrong', () => {
    throws(
      () => loadLevel({ ...baseLevel(), goals: [{ kind: 'spin', color: 'pumpkin', count: 1 }] }),
      /unknown kind/,
    )
    throws(
      () => loadLevel({ ...baseLevel(), goals: [{ kind: 'collect', color: 'potion', count: 1 }] }),
      /never spawns/,
    )
    throws(
      () => loadLevel({ ...baseLevel(), goals: [{ kind: 'clear-modifier', modifier: 'cobweb' }] }),
      /not placed anywhere/,
    )
    throws(() => loadLevel({ ...baseLevel(), goals: [{ kind: 'boss', hits: 3 }] }), /boss/)
    throws(
      () =>
        loadLevel({
          ...baseLevel(),
          shape: ['.....', '.....', '.....', '.....', '#####'],
          goals: [{ kind: 'deliver', color: 'pumpkin', count: 1 }],
        }),
      /bottom row/,
    )
  })

  it('rejects star thresholds that cannot be reached', () => {
    throws(() => loadLevel({ ...baseLevel(), starThresholds: [5, 2] }), /3★ threshold/)
    throws(() => loadLevel({ ...baseLevel(), starThresholds: [2, 99] }), /move budget/)
  })
})

describe('buildLevelBoard', () => {
  it('builds match-free boards with obstacles attached', () => {
    const level = loadLevel({ ...baseLevel(), obstacles: [{ x: 2, y: 2, modifier: 'cobweb' }] })
    const board = buildLevelBoard(level)
    strictEqual(detectShapes(board).length, 0)
    strictEqual(requireCell(board, { x: 2, y: 2 }).modifier, 'cobweb')
    ok(board.cells.every((cell) => cell.tile))
  })

  it('hollows mask holes out of the board and refills never fill them', () => {
    const { game } = createLevelGame({
      ...baseLevel(),
      id: 92,
      seed: 42,
      moves: 10,
      shape: ['#....', '#....', '.....', '.....', '.....'],
      goals: [{ kind: 'collect', color: 'skull', count: 300 }],
      starThresholds: [0, 3],
    })
    for (let move = 0; move < 4 && game.result === null; move++) {
      const hint = game.findHint()
      ok(hint)
      ok(game.trySwap(hint.a, hint.b).accepted)
    }
    for (const pos of [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ]) {
      const cell = requireCell(game.board, pos)
      strictEqual(cell.modifier, 'void')
      strictEqual(cell.tile, undefined)
    }
    ok(game.board.cells.every((cell) => cell.tile || cell.modifier === 'void'))
  })
})

describe('GoalTracker', () => {
  it('counts collect, deliver and boss progress from engine events', () => {
    const game = new Swap3Game({ seed: 7, board: deliverFixture() })
    const tracker = new GoalTracker(game, [
      { kind: 'collect', color: 'skull', count: 3 },
      { kind: 'deliver', color: 'skull', count: 3 },
      { kind: 'boss', hits: 1 },
    ])
    strictEqual(detectShapes(game.board).length, 0)
    ok(!tracker.allMet)

    const outcome = game.trySwap({ x: 2, y: 3 }, { x: 2, y: 4 })
    ok(outcome.accepted)
    tracker.sync()

    // Whatever cascades add, the tracker must mirror the event stream exactly.
    const collect = goalProgress(tracker, 'collect')
    strictEqual(collect.current, game.stats.cleared.skull)
    ok(collect.current >= 3)
    ok(collect.met)

    let expectedDeliver = 0
    for (const event of outcome.events) {
      if (event.type !== 'clear') continue
      for (const cell of event.cells) {
        if (cell.at.y === game.board.height - 1 && cell.tile.type === 'skull') expectedDeliver++
      }
    }
    ok(expectedDeliver >= 3)
    strictEqual(goalProgress(tracker, 'deliver').current, expectedDeliver)

    ok(tracker.bossHits >= 1)
    ok(goalProgress(tracker, 'boss').met)
    ok(tracker.allMet)
  })

  it('tracks clear-modifier goals from the board', () => {
    const game = new Swap3Game({ seed: 7, board: deliverFixture() })
    const tracker = new GoalTracker(game, [{ kind: 'clear-modifier', modifier: 'cobweb' }])
    const cobwebs = goalProgress(tracker, 'clear-modifier')
    strictEqual(cobwebs.target, 2)
    strictEqual(cobwebs.current, 0)
    ok(!tracker.allMet)

    requireCell(game.board, { x: 0, y: 0 }).modifier = undefined
    tracker.sync()
    strictEqual(goalProgress(tracker, 'clear-modifier').current, 1)

    requireCell(game.board, { x: 4, y: 0 }).modifier = undefined
    tracker.sync()
    ok(goalProgress(tracker, 'clear-modifier').met)
    ok(tracker.allMet)
  })

  it('lets the boss ticket record hits by hand', () => {
    const game = new Swap3Game({ seed: 7, board: deliverFixture() })
    const tracker = new GoalTracker(game, [{ kind: 'boss', hits: 2 }])
    const boss = goalProgress(tracker, 'boss')
    tracker.recordBossHit()
    strictEqual(goalProgress(tracker, 'boss').current, 1)
    ok(!boss.met)
    tracker.recordBossHit()
    ok(goalProgress(tracker, 'boss').met)
  })
})

describe('createLevelGame', () => {
  const winnable = (): RawLevel => ({
    ...baseLevel(),
    id: 90,
    name: 'Wiring',
    seed: 777,
    moves: 40,
    goals: [{ kind: 'collect', color: 'pumpkin', count: 4 }],
    starThresholds: [2, 6],
  })

  it('wins the moment all goals are met and awards stars from moves left', () => {
    const { level, game, tracker } = createLevelGame(winnable())
    playOut(game)
    strictEqual(game.result, 'win')
    ok(goalProgress(tracker, 'collect').met)
    const stars = levelStars(level, game)
    ok(stars >= 1 && stars <= 3)
    const last = game.log.at(-1)
    ok(last && last.type === 'game-over' && last.result === 'win')
  })

  it('loses when moves run out with goals unmet', () => {
    const { level, game } = createLevelGame({
      ...winnable(),
      id: 91,
      seed: 9,
      moves: 3,
      goals: [{ kind: 'collect', color: 'pumpkin', count: 999 }],
      starThresholds: [0, 2],
    })
    playOut(game)
    strictEqual(game.result, 'lose')
    strictEqual(game.stats.movesUsed, 3)
    strictEqual(levelStars(level, game), 0)
    const last = game.log.at(-1)
    ok(last && last.type === 'game-over' && last.result === 'lose')
  })

  it('awards stars from moves left', () => {
    const level = loadLevel({ ...winnable(), starThresholds: [2, 5] })
    strictEqual(starsFor(level, 5), 3)
    strictEqual(starsFor(level, 4), 2)
    strictEqual(starsFor(level, 2), 2)
    strictEqual(starsFor(level, 1), 1)
    strictEqual(starsFor(level, 0), 1)
  })
})

describe('placeholder levels', () => {
  it('all campaign levels load with ids in play order', () => {
    LEVELS.forEach((raw, index) => {
      strictEqual(loadLevel(raw).id, index + 1)
    })
  })

  it('each starts match-free and with a move available', () => {
    for (const raw of LEVELS) {
      const level = loadLevel(raw)
      strictEqual(detectShapes(buildLevelBoard(level)).length, 0)
      const { game } = createLevelGame(raw)
      ok(game.findHint(), `level ${level.id} has no opening move`)
    }
  })

  it('levelGame builds the requested level and rejects the rest', () => {
    strictEqual(levelGame(4).level.id, 5)
    throws(() => levelGame(LEVELS.length), /no level at index/)
  })
})
