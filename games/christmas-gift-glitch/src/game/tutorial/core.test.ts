import { ok, strictEqual } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { makeTile, requireCell } from '@gamiq/swap3/board'
import { boardFromRows, FIXTURE_PALETTE } from '@gamiq/swap3/board-strings'
import type { Board, GameEvent, Pos, PowerupKind } from '@gamiq/swap3/types'
import { POWERUPS } from '@gamiq/swap3/types'
import { LEVELS, levelGame } from '../../levels/index.ts'
import { boardWorld, TutorialCore, type TutorialHost, type TutorialWorld } from './core.ts'
import { levelScripts } from './scripts.ts'
import type { TutorialScript, TutorialStep, TutorialTrigger } from './types.ts'

/**
 * Unit tests for the tutorial core (ticket GiftGlitch-a5d77f): trigger → show →
 * await → dismiss, seen-store resumes, queue rotation and game-over closing.
 */

// — Fixtures ———————————————————————————————————————————————————————————————

const seenIds = new Set<string>()
const fakeHost = (): TutorialHost => {
  seenIds.clear()
  return {
    isSeen: (id) => seenIds.has(id),
    markSeen: (id) => seenIds.add(id),
  }
}

let moves = 0
const fakeWorld = (
  board: Board = boardFromRows(['abcde', 'bcdef', 'cdefa', 'deXab', 'XXeXa'], FIXTURE_PALETTE),
): TutorialWorld => ({
  ...boardDeps(board),
  movesUsed: () => moves,
})

function boardDeps(board: Board) {
  return {
    powerupCells: (powerup: PowerupKind): Pos[] => {
      const found: Pos[] = []
      board.cells.forEach((cell, i) => {
        if (cell.tile?.powerup === powerup)
          found.push({ x: i % board.width, y: Math.floor(i / board.width) })
      })
      return found
    },
    modifierCells: (root: string): Pos[] => {
      const found: Pos[] = []
      board.cells.forEach((cell, i) => {
        if ((cell.modifier ?? '').match(/^[a-z]+/)?.[0] === root) {
          found.push({ x: i % board.width, y: Math.floor(i / board.width) })
        }
      })
      return found
    },
    colorCells: (): Pos[] => [],
    findHint: (): readonly [Pos, Pos] | null => null,
  }
}

const step = (over: Partial<TutorialStep> & { id: string }): TutorialStep => ({
  trigger: { kind: 'start' },
  text: 'teaching text',
  ...over,
})

const script = (id: string, steps: readonly TutorialStep[]): TutorialScript => ({ id, steps })

const convert = (powerup: PowerupKind): GameEvent => ({
  type: 'convert',
  at: { x: 0, y: 0 },
  tileType: 'red',
  powerup,
  tile: makeTile('red', powerup),
})
const activate = (powerup: PowerupKind): GameEvent => ({
  type: 'power-activate',
  at: { x: 0, y: 0 },
  powerup,
  via: 'tap',
})
const combo = (a: PowerupKind, b: PowerupKind): GameEvent => ({
  type: 'combo',
  a: { at: { x: 0, y: 0 }, powerup: a },
  b: { at: { x: 1, y: 0 }, powerup: b },
})
const spread = (modifier: string): GameEvent => ({
  type: 'obstacle',
  at: { x: 2, y: 2 },
  modifier,
  action: 'spread',
})
const moveUsed = (used: number): GameEvent => ({ type: 'move', used, left: 20 - used })

/** Advance past the level-banner start delay. */
const settleIn = (core: TutorialCore): void => {
  core.update(1)
  core.update(2)
}

const showingId = (core: TutorialCore): string | undefined => core.current?.step.id

// — Start trigger & delay ——————————————————————————————————————————————————

describe('tutorial start trigger', () => {
  it('waits out the intro banner before the first overlay', () => {
    const core = new TutorialCore([script('s', [step({ id: 'a' })])], fakeHost(), fakeWorld())
    core.update(1)
    strictEqual(core.current, undefined)
    core.update(2)
    ok(core.current, 'step should show after the banner delay')
    ok(core.current.blocking, 'a tap await is a blocking panel')
  })

  it('never shows a script already marked seen', () => {
    const host = fakeHost()
    seenIds.add('s')
    const core = new TutorialCore([script('s', [step({ id: 'a' })])], host, fakeWorld())
    settleIn(core)
    strictEqual(core.current, undefined)
  })

  it('resumes a half-seen script at its first unseen step', () => {
    const host = fakeHost()
    seenIds.add('a')
    const core = new TutorialCore(
      [script('s', [step({ id: 'a' }), step({ id: 'b' }), step({ id: 'c' })])],
      host,
      fakeWorld(),
    )
    settleIn(core)
    strictEqual(showingId(core), 'b')
    core.continueStep()
    strictEqual(showingId(core), 'c')
  })

  it('keeps a blocking tap step open until continued', () => {
    const core = new TutorialCore([script('s', [step({ id: 'a' })])], fakeHost(), fakeWorld())
    settleIn(core)
    core.update(5)
    strictEqual(showingId(core), 'a', 'tap awaits never time out')
    core.continueStep()
    strictEqual(core.current, undefined)
  })
})

// — Await resolution ———————————————————————————————————————————————————————

describe('tutorial awaits', () => {
  it('auto-dismisses a seconds toast', () => {
    const core = new TutorialCore(
      [script('s', [step({ id: 'a', await: { kind: 'seconds', seconds: 4 } })])],
      fakeHost(),
      fakeWorld(),
    )
    settleIn(core)
    core.update(2)
    ok(core.current, 'still inside the 4 s window')
    core.update(3)
    strictEqual(core.current, undefined, 'dismissed after the window passes')
  })

  it('closes a move await only on the next settled move', () => {
    const core = new TutorialCore(
      [script('s', [step({ id: 'a', await: { kind: 'move' } })])],
      fakeHost(),
      fakeWorld(),
    )
    settleIn(core)
    moves = 1
    core.feed([moveUsed(1)])
    strictEqual(showingId(core), 'a', 'the move that armed the step must not close it')
    core.settle()
    strictEqual(core.current, undefined, 'the next settled move closes it')
  })

  it('keeps a move await open while the move count is unchanged', () => {
    const core = new TutorialCore(
      [script('s', [step({ id: 'a', await: { kind: 'move' } })])],
      fakeHost(),
      fakeWorld(),
    )
    settleIn(core)
    core.settle()
    ok(core.current, 'a rejected swap spends no move and closes nothing')
  })

  it('closes an activate await on a matching activation only', () => {
    const core = new TutorialCore(
      [
        script('s', [
          step({ id: 'a' }),
          step({
            id: 'b',
            trigger: { kind: 'powerup-created', powerup: 'sweep' },
            highlight: { kind: 'powerup', powerup: 'sweep' },
            await: { kind: 'activate', powerup: 'sweep' },
          }),
        ]),
      ],
      fakeHost(),
      fakeWorld(),
    )
    settleIn(core)
    core.feed([convert('sweep')])
    core.continueStep()
    strictEqual(showingId(core), 'b', 'the broom teaching appears once the broom exists')
    ok(!core.current?.blocking, 'an activate await is a non-blocking toast')

    core.feed([activate('blast')])
    core.update(2)
    ok(core.current, 'the wrong power-up does not close it')
    core.feed([activate('sweep')])
    core.update(0.5)
    strictEqual(core.current, undefined, 'a matching activation dismisses it')
  })

  it('lets event-satisfied steps linger for MIN_SHOW', () => {
    const core = new TutorialCore(
      [script('s', [step({ id: 'a', await: { kind: 'activate' } })])],
      fakeHost(),
      fakeWorld(),
    )
    settleIn(core)
    core.feed([activate('sweep')])
    core.update(0.5)
    ok(core.current, 'dismissed too fast to read')
    core.update(1)
    strictEqual(core.current, undefined, 'then they dismiss')
  })

  it('ignores pre-arm events when judging an await', () => {
    const core = new TutorialCore(
      [script('s', [step({ id: 'a', await: { kind: 'combo-used' } })])],
      fakeHost(),
      fakeWorld(),
    )
    core.feed([combo('sweep', 'sweep')])
    settleIn(core)
    ok(core.current, 'a start-triggered step still shows')
    core.feed([moveUsed(1)])
    core.update(2)
    ok(core.current, 'a combo from before the step appeared does not dismiss it')
    core.feed([combo('blast', 'blast')])
    core.update(2)
    strictEqual(core.current, undefined, 'a fresh combo does')
  })
})

// — Triggers from the event stream & board —————————————————————————————————

describe('tutorial triggers', () => {
  it('matches combo pairs regardless of order', () => {
    const core = new TutorialCore(
      [script('s', [step({ id: 'a', trigger: { kind: 'combo', a: 'sweep', b: 'homing' } })])],
      fakeHost(),
      fakeWorld(),
    )
    core.feed([combo('homing', 'sweep')])
    core.update(3)
    strictEqual(showingId(core), 'a')
  })

  it('needs two distinct cells for a doubled powerups-present trigger', () => {
    const board = boardFromRows(['abcde', 'bcdef', 'cdefa', 'deXab', 'XXeXa'], FIXTURE_PALETTE)
    requireCell(board, { x: 0, y: 0 }).tile = makeTile('red', 'sweep')
    const world = fakeWorld(board)
    const core = new TutorialCore(
      [
        script('s', [
          step({
            id: 'a',
            trigger: { kind: 'powerups-present', a: 'sweep', b: 'sweep' },
            highlight: { kind: 'powerups', a: 'sweep', b: 'sweep' },
          }),
        ]),
      ],
      fakeHost(),
      world,
    )
    core.update(3)
    strictEqual(core.current, undefined, 'one broom is not a broom × broom combo')
    requireCell(board, { x: 1, y: 1 }).tile = makeTile('blue', 'sweep')
    core.update(0.1)
    strictEqual(showingId(core), 'a', 'two brooms are')
    strictEqual(core.highlight.length, 2, 'both halves get highlighted')
  })

  it('fires obstacle-seen from a board scan or a spread event', () => {
    const board = boardFromRows(['abcde', 'bcdef', 'cdefa', 'deXab', 'XXeXa'], FIXTURE_PALETTE)
    requireCell(board, { x: 4, y: 0 }).modifier = 'cover-2'
    const core = new TutorialCore(
      [
        script('s', [
          step({
            id: 'a',
            trigger: { kind: 'obstacle-seen', root: 'cover' },
            highlight: { kind: 'modifier', root: 'cover' },
          }),
        ]),
      ],
      fakeHost(),
      fakeWorld(board),
    )
    core.update(3)
    strictEqual(showingId(core), 'a', 'level-start cobwebs count as seen')
    strictEqual(core.highlight.length, 1)

    const eventCore = new TutorialCore(
      [script('s', [step({ id: 'a', trigger: { kind: 'obstacle-seen', root: 'spreader' } })])],
      fakeHost(),
      fakeWorld(),
    )
    eventCore.update(3)
    strictEqual(eventCore.current, undefined)
    eventCore.feed([spread('spreader-3')])
    eventCore.update(0.1)
    strictEqual(showingId(eventCore), 'a', 'a mid-level slime spread counts too')
  })
})

// — Script queue, skip and game over ———————————————————————————————————————

describe('tutorial script queue', () => {
  it('lets a queued popup step in while the level script waits', () => {
    const board = boardFromRows(['abcde', 'bcdef', 'cdefa', 'deXab', 'XXeXa'], FIXTURE_PALETTE)
    requireCell(board, { x: 0, y: 0 }).modifier = 'cover'
    const core = new TutorialCore(
      [
        script('level', [
          step({ id: 'l1' }),
          step({ id: 'l2', trigger: { kind: 'powerup-created', powerup: 'sweep' } }),
        ]),
        script('popup', [
          step({
            id: 'p1',
            trigger: { kind: 'obstacle-seen', root: 'cover' },
            await: { kind: 'seconds', seconds: 2 },
          }),
        ]),
      ],
      fakeHost(),
      fakeWorld(board),
    )
    settleIn(core)
    strictEqual(showingId(core), 'l1', 'the level script goes first')
    core.continueStep()
    strictEqual(showingId(core), 'p1', 'popup shows while the broom teaching waits')
    core.feed([convert('sweep')])
    core.update(3)
    strictEqual(showingId(core), 'l2', 'the level script resumes once its trigger fires')
  })

  it('marks a completed script seen', () => {
    const host = fakeHost()
    const core = new TutorialCore([script('s', [step({ id: 'a' })])], host, fakeWorld())
    settleIn(core)
    core.continueStep()
    ok(seenIds.has('a'), 'dismissed steps are recorded')
    ok(seenIds.has('s'), 'completed scripts are recorded')
  })

  it('skips the active script but lets later popups still fire', () => {
    const core = new TutorialCore(
      [
        script('level', [
          step({ id: 'l1' }),
          step({ id: 'l2', trigger: { kind: 'powerup-created', powerup: 'blast' } }),
        ]),
        script('popup', [step({ id: 'p1', trigger: { kind: 'obstacle-seen', root: 'ice' } })]),
      ],
      fakeHost(),
      fakeWorld(),
    )
    settleIn(core)
    strictEqual(showingId(core), 'l1')
    core.skip()
    ok(seenIds.has('level'), 'the whole script is marked seen')
    strictEqual(core.current, undefined)
    core.feed([spread('ice')])
    core.update(0.1)
    strictEqual(showingId(core), 'p1', 'queued popups survive a skip')
  })

  it('closes everything on game over without marking the step seen', () => {
    const host = fakeHost()
    const core = new TutorialCore([script('s', [step({ id: 'a' })])], host, fakeWorld())
    settleIn(core)
    core.end()
    strictEqual(core.current, undefined)
    core.update(1)
    strictEqual(core.current, undefined, 'an ended core stays quiet')
    ok(!seenIds.has('a'), 'the interrupted step replays next attempt')

    const replay = new TutorialCore([script('s', [step({ id: 'a' })])], fakeHost(), fakeWorld())
    settleIn(replay)
    strictEqual(showingId(replay), 'a')
  })
})

// — Shipped content sanity (L1–L12 path without dead ends) —————————————————

describe('tutorial campaign content', () => {
  it('has a script for every level 1–12', () => {
    for (let level = 1; level <= 12; level++) {
      const scripts = levelScripts(level)
      ok(scripts.length > 1, `level ${level} should carry its script plus obstacle popups`)
      strictEqual(scripts[0]?.id, `level-${level}`)
      ok((scripts[0]?.steps.length ?? 0) > 0)
    }
  })

  it('uses unique step ids, valid awaits and non-empty teaching text', () => {
    const awaits = new Set(['tap', 'seconds', 'move', 'activate', 'combo-used'])
    for (let level = 1; level <= 12; level++) {
      const ids = new Set<string>()
      for (const entry of levelScripts(level)) {
        for (const s of entry.steps) {
          ok(!ids.has(s.id), `duplicate step id ${s.id} on level ${level}`)
          ids.add(s.id)
          ok(s.text.length > 0, `${s.id} has no text`)
          const aw = s.await ?? { kind: 'tap' }
          ok(awaits.has(aw.kind), `${s.id} has an unknown await kind`)
          if (aw.kind === 'seconds') ok(aw.seconds > 0, `${s.id} awaits a non-positive time`)
        }
      }
    }
  })

  it('only references real power-up kinds and pairs every combo half with itself or a partner', () => {
    for (let level = 6; level <= 12; level++) {
      const first = levelScripts(level)[0]?.steps[0]
      ok(first, `level ${level} has a combo step`)
      const trigger = first?.trigger
      if (trigger?.kind !== 'any-of') {
        ok(false, `level ${level} combo step must teach can-or-does (any-of)`)
        continue
      }
      const present = trigger.of.find(
        (t): t is Extract<TutorialTrigger, { kind: 'powerups-present' }> =>
          t.kind === 'powerups-present',
      )
      ok(present, `level ${level} has a powerups-present trigger`)
      ok(POWERUPS.includes(present.a) && POWERUPS.includes(present.b))
    }
  })

  it('plays the real L1–L5 campaign to an end with the tutorial wired in', () => {
    let stepsShown = 0
    for (let index = 0; index < LEVELS.length; index++) {
      const bundle = levelGame(index)
      const game = bundle.game
      const core = new TutorialCore(
        levelScripts(bundle.level.id),
        fakeHost(),
        boardWorld(game.board, () => game.stats.movesUsed),
      )
      core.update(3) // banner
      let guard = 400
      while (game.result === null && guard-- > 0) {
        core.update(0.25)
        if (core.current) {
          stepsShown++
          if (core.current.blocking) core.continueStep()
        }
        const hint = game.findHint()
        if (!hint) break
        core.feed(game.trySwap(hint.a, hint.b).events)
        for (let frame = 0; frame < 4; frame++) {
          core.update(0.25)
          core.settle()
          if (core.current?.blocking) core.continueStep()
        }
      }
      ok(game.result, `level ${bundle.level.id} reaches win/lose under teaching overlays`)
      core.end()
      strictEqual(core.current, undefined)
    }
    ok(stepsShown > 0, 'the teaching flow actually showed steps along the way')
  })
})
