import { createBoard, requireCell } from './board.ts'
import { attachBoss, BOSS_MAX_HP, type BossConfig, isBossModifier } from './boss.ts'
import { Swap3Game } from './game.ts'
import { areAdjacent, samePos } from './pos.ts'
import { registerCellModifier } from './registry.ts'
import { createRng } from './rng.ts'
import type { Board, Pos, TileType } from './types.ts'
import { emptyClearedRecord, TILE_TYPES } from './types.ts'

/**
 * Level format + goal system (ticket ToTS-aan7wa).
 *
 * Levels are data. `RawLevel` is the JSON shape documented in
 * `src/levels/LEVELS.md`; the files under `src/levels/` hold it as typed TS
 * data (`satisfies RawLevel`) so the compiler checks it too, but `loadLevel`
 * treats its input as `unknown` and re-validates everything at runtime, so
 * parsed JSON of the same shape works identically.
 *
 * The schema is split from the engine on purpose: this module is a consumer
 * of `Swap3Game` (board, event log, eval hook), not part of the core.
 */

/** A '#' cell in the shape mask: never filled, blocks gravity and refills. */
const VOID = 'void'

registerCellModifier({ id: VOID, gravityBarrier: true })

/**
 * Goal list entries. The four obstacle flavours from the epic (covers,
 * blockers, cursed ice, cages) share one kind and differ only in modifier
 * id; the behaviour of peeling/breaking/freeing lives with the obstacles
 * ticket, the goal just watches the board for leftover cells.
 */
export type GoalDef =
  | { kind: 'collect'; color: TileType; count: number }
  | { kind: 'clear-modifier'; modifier: string }
  | { kind: 'deliver'; color: TileType; count: number }
  | { kind: 'boss'; hits: number }

export interface RawObstacle {
  x: number
  y: number
  modifier: string
}

/** The documented JSON level shape, before validation. */
export interface RawLevel {
  id: number
  name: string
  seed: number
  moves: number
  /** Row-major grid mask, '.' playable / '#' blocked; rows share one length. */
  shape: readonly string[]
  /** Relative spawn weights; every type with weight ≥ 1 can spawn. */
  tileTypes: Partial<Record<TileType, number>>
  obstacles?: readonly RawObstacle[]
  /** Chapter-finale boss house; needs a placed 'boss' cell and a boss goal. */
  boss?: BossConfig
  goals: readonly GoalDef[]
  /** Moves left on a win needed for 2 and 3 stars. */
  starThresholds: readonly [number, number]
}

export interface LevelObstacle {
  at: Pos
  modifier: string
}

/** A validated level, ready to build a game from. */
export interface Level {
  readonly id: number
  readonly name: string
  readonly seed: number
  readonly moves: number
  readonly shape: readonly string[]
  readonly width: number
  readonly height: number
  /** Unique tile types that can spawn, in schema order. */
  readonly tileTypes: readonly TileType[]
  /** `tileTypes` expanded by weight; what `rng.pick` draws from. */
  readonly pool: readonly TileType[]
  readonly obstacles: readonly LevelObstacle[]
  readonly boss?: BossConfig
  readonly goals: readonly GoalDef[]
  readonly starThresholds: readonly [number, number]
}

export class LevelValidationError extends Error {
  readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    super(
      `invalid level data (${issues.length} problem${issues.length === 1 ? '' : 's'}):\n- ${issues.join('\n- ')}`,
    )
    this.name = 'LevelValidationError'
    this.issues = [...issues]
  }
}

const MAX_DIM = 16
const MIN_PLAYABLE = 9

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function isTileType(value: unknown): value is TileType {
  return typeof value === 'string' && (TILE_TYPES as readonly string[]).includes(value)
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isIntPair(value: unknown): value is readonly [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((entry) => isInt(entry))
}

/** Validated integer with a range, reporting through `issue` when out of bounds. */
function intIn(
  value: unknown,
  min: number,
  max: number,
  issue: (message: string) => void,
): number | undefined {
  if (!isInt(value) || value < min || value > max) {
    issue(`must be an integer in [${min}, ${max}]`)
    return undefined
  }
  return value
}

/**
 * Validate raw level data and normalize it. Collects every problem it finds
 * and throws one `LevelValidationError` listing them all, so a broken level
 * fails loudly at load instead of misbehaving mid-game.
 */
export function loadLevel(raw: unknown): Level {
  if (!isRecord(raw)) throw new LevelValidationError(['level data must be a JSON object'])
  const issues: string[] = []
  const src = raw

  let id: number | undefined
  if (isInt(src.id) && src.id >= 1) id = src.id
  else issues.push('id: must be an integer ≥ 1')

  let name: string | undefined
  if (typeof src.name === 'string' && src.name.trim().length > 0 && src.name.length <= 40) {
    name = src.name
  } else {
    issues.push('name: must be a non-empty string of at most 40 characters')
  }

  let seed: number | undefined
  if (isInt(src.seed) && src.seed >= 0) seed = src.seed
  else issues.push('seed: must be an integer ≥ 0')

  let moves: number | undefined
  if (isInt(src.moves) && src.moves >= 1 && src.moves <= 999) moves = src.moves
  else issues.push('moves: must be an integer in [1, 999]')

  // Boss house config (chapter finale).
  const rawBoss = src.boss
  let boss: BossConfig | undefined
  if (rawBoss !== undefined) {
    if (!isRecord(rawBoss)) {
      issues.push('boss: must be an object with hp, throwEvery and throws')
    } else {
      const issue = (message: string) => issues.push(`boss.${message}`)
      const hp = intIn(rawBoss.hp, 1, BOSS_MAX_HP, (message) => issue(`hp: ${message}`))
      const throwEvery = intIn(rawBoss.throwEvery, 1, 50, (message) =>
        issue(`throwEvery: ${message}`),
      )
      const thrown = rawBoss.throws
      if (typeof thrown !== 'string' || thrown.length === 0 || thrown.length > 24) {
        issue('throws: must be a non-empty string of at most 24 characters')
      } else if (thrown === VOID || isBossModifier(thrown)) {
        issue(`throws: '${thrown}' cannot be thrown onto the board`)
      }
      if (hp !== undefined && throwEvery !== undefined && typeof thrown === 'string') {
        boss = { hp, throwEvery, throws: thrown }
      }
    }
  }

  // Shape mask.
  const shape = src.shape
  let mask: readonly string[] = []
  let width = 0
  let height = 0
  let playable = 0
  if (!isStringArray(shape) || shape.length === 0) {
    issues.push('shape: must be a non-empty array of strings')
  } else {
    mask = shape
    height = shape.length
    width = shape[0]?.length ?? 0
    if (height < 3 || height > MAX_DIM) issues.push(`shape: need 3–${MAX_DIM} rows, got ${height}`)
    if (width < 3 || width > MAX_DIM)
      issues.push(`shape: rows must be 3–${MAX_DIM} cells wide, got ${width}`)
    for (const [y, row] of shape.entries()) {
      if (row.length !== width) issues.push(`shape[${y}]: all rows must have the same length`)
      if (!/^[.#]+$/.test(row)) issues.push(`shape[${y}]: only '.' and '#' are allowed`)
      playable += [...row].filter((c) => c === '.').length
    }
    if (playable < MIN_PLAYABLE) {
      issues.push(`shape: need at least ${MIN_PLAYABLE} playable cells, got ${playable}`)
    }
  }

  // Spawn weights.
  const tileTypes = src.tileTypes
  const weights: [TileType, number][] = []
  if (!isRecord(tileTypes)) {
    issues.push('tileTypes: must be an object mapping tile types to weights')
  } else {
    for (const [key, value] of Object.entries(tileTypes)) {
      if (!isTileType(key)) {
        issues.push(`tileTypes.${key}: unknown tile type (use ${TILE_TYPES.join(', ')})`)
      } else if (!isInt(value) || value < 1 || value > 20) {
        issues.push(`tileTypes.${key}: weight must be an integer in [1, 20]`)
      } else {
        weights.push([key, value])
      }
    }
    if (weights.length < 3) {
      issues.push(`tileTypes: at least 3 types with weight ≥ 1 are needed, got ${weights.length}`)
    }
  }
  const spawned = weights.map(([type]) => type)
  const pool = weights.flatMap(([type, weight]) => Array.from({ length: weight }, () => type))

  // Obstacle placement.
  const obstacles: LevelObstacle[] = []
  let bossPlaced = 0
  const placedModifiers = new Set<string>()
  const occupied = new Set<string>()
  const rawObstacles = src.obstacles ?? []
  if (!Array.isArray(rawObstacles)) {
    issues.push('obstacles: must be an array')
  } else {
    for (const [i, entry] of rawObstacles.entries()) {
      if (!isRecord(entry)) {
        issues.push(`obstacles[${i}]: must be an object with x, y and modifier`)
        continue
      }
      const { x, y, modifier } = entry
      if (!isInt(x) || !isInt(y) || width === 0 || x < 0 || x >= width || y < 0 || y >= height) {
        issues.push(`obstacles[${i}]: position (${x}, ${y}) is outside the ${width}×${height} grid`)
        continue
      }
      const row = mask[y]
      if (row === undefined || row.charAt(x) !== '.') {
        issues.push(`obstacles[${i}]: position (${x}, ${y}) is not a playable cell`)
        continue
      }
      if (typeof modifier !== 'string' || modifier.trim().length === 0 || modifier.length > 24) {
        issues.push(`obstacles[${i}].modifier: must be a non-empty string of at most 24 characters`)
        continue
      }
      if (modifier === VOID) {
        issues.push(`obstacles[${i}].modifier: '${VOID}' is reserved for shape-mask holes`)
        continue
      }
      if (modifier !== 'boss' && isBossModifier(modifier)) {
        issues.push(
          `obstacles[${i}].modifier: place the bare 'boss' cell; its hp comes from the boss field`,
        )
        continue
      }
      if (modifier === 'boss' && bossPlaced > 0) {
        issues.push(`obstacles[${i}]: at most one 'boss' cell per level`)
        continue
      }
      const key = `${x},${y}`
      if (occupied.has(key)) {
        issues.push(`obstacles[${i}]: position (${x}, ${y}) is used twice`)
        continue
      }
      occupied.add(key)
      placedModifiers.add(modifier)
      if (modifier === 'boss') bossPlaced++
      obstacles.push({ at: { x, y }, modifier })
    }
  }

  // Goals.
  const goals: GoalDef[] = []
  const rawGoals = src.goals
  if (!Array.isArray(rawGoals) || rawGoals.length === 0) {
    issues.push('goals: must be a non-empty array')
  } else {
    if (rawGoals.length > 8) issues.push('goals: at most 8 goals per level')
    for (const [i, goal] of rawGoals.entries()) {
      const issue = (msg: string) => issues.push(`goals[${i}]: ${msg}`)
      if (!isRecord(goal) || typeof goal.kind !== 'string') {
        issue('must be an object with a kind')
        continue
      }
      const intField = (field: string, min: number, max: number): number | undefined => {
        const value = goal[field]
        if (!isInt(value) || value < min || value > max) {
          issue(`${field}: must be an integer in [${min}, ${max}]`)
          return undefined
        }
        return value
      }
      const colorField = (): TileType | undefined => {
        const value = goal.color
        if (!isTileType(value)) {
          issue(`color: unknown tile type (use ${TILE_TYPES.join(', ')})`)
          return undefined
        }
        if (!spawned.includes(value))
          issue(`color: '${value}' never spawns, give it weight in tileTypes`)
        return value
      }
      switch (goal.kind) {
        case 'collect': {
          const color = colorField()
          const n = intField('count', 1, 999)
          if (color !== undefined && n !== undefined)
            goals.push({ kind: 'collect', color, count: n })
          break
        }
        case 'clear-modifier': {
          const modifier = goal.modifier
          if (typeof modifier !== 'string' || modifier.length === 0) {
            issue('modifier: must be a non-empty string')
          } else if (!placedModifiers.has(modifier)) {
            issue(`modifier '${modifier}' is not placed anywhere; add an obstacle for it`)
          } else {
            goals.push({ kind: 'clear-modifier', modifier })
          }
          break
        }
        case 'deliver': {
          const color = colorField()
          const n = intField('count', 1, 999)
          const bottom = mask[height - 1] ?? ''
          if (!bottom.includes('.'))
            issue('the bottom row of shape has no playable cell to deliver into')
          if (color !== undefined && n !== undefined)
            goals.push({ kind: 'deliver', color, count: n })
          break
        }
        case 'boss': {
          const n = intField('hits', 1, 99)
          if (!placedModifiers.has('boss')) {
            issue("no cell carries the 'boss' modifier; place one in obstacles")
          } else if (n !== undefined) {
            goals.push({ kind: 'boss', hits: n })
          }
          break
        }
        default:
          issue(`unknown kind '${goal.kind}'`)
      }
    }
  }

  // Cross-checks: the boss config, its cell and its goal must agree.
  const bossGoal = goals.find(
    (goal): goal is Extract<GoalDef, { kind: 'boss' }> => goal.kind === 'boss',
  )
  if (boss !== undefined) {
    if (bossPlaced === 0) {
      issues.push("boss: no cell carries the 'boss' modifier; place one in obstacles")
    }
    if (!bossGoal) {
      issues.push("boss: a { kind: 'boss' } goal is missing, so hp 0 could never end the level")
    } else if (bossGoal.hits !== boss.hp) {
      issues.push(`boss.hp: must equal the boss goal's hits (${boss.hp} ≠ ${bossGoal.hits})`)
    }
  }

  // Star thresholds: [moves left for 2★, moves left for 3★].
  const thresholds = src.starThresholds
  let stars: [number, number] | undefined
  if (!isIntPair(thresholds)) {
    issues.push('starThresholds: must be [twoStars, threeStars], two integers ≥ 0')
  } else {
    const [two, three] = thresholds
    if (two < 0) issues.push('starThresholds: thresholds must be ≥ 0')
    if (two > three) issues.push('starThresholds: the 3★ threshold must be ≥ the 2★ threshold')
    if (moves !== undefined && three > moves) {
      issues.push(
        'starThresholds: the 3★ threshold is above the move budget, 3★ would be unreachable',
      )
    }
    stars = [two, three]
  }

  if (issues.length > 0) throw new LevelValidationError(issues)
  if (id === undefined || name === undefined || seed === undefined || moves === undefined) {
    throw new LevelValidationError(['level data is incomplete'])
  }
  if (stars === undefined) throw new LevelValidationError(['starThresholds are missing'])

  return {
    id,
    name,
    seed,
    moves,
    shape: mask,
    width,
    height,
    tileTypes: spawned,
    pool,
    obstacles,
    boss,
    goals,
    starThresholds: stars,
  }
}

/**
 * Build the starting board for a level: a match-free weighted fill of the
 * full rectangle, then the mask's '#' cells hollowed out (kept empty forever
 * via the 'void' gravity barrier) and the level's obstacles attached to their
 * cells. The engine reshuffles on its own if the fill has no valid move.
 */
export function buildLevelBoard(level: Level): Board {
  const board = createBoard({
    width: level.width,
    height: level.height,
    rng: createRng(level.seed),
    colors: level.pool,
  })
  for (const [y, row] of level.shape.entries()) {
    for (let x = 0; x < level.width; x++) {
      if (row.charAt(x) !== '#') continue
      const cell = requireCell(board, { x, y })
      cell.tile = undefined
      cell.modifier = VOID
    }
  }
  for (const { at, modifier } of level.obstacles) {
    const cell = requireCell(board, at)
    cell.modifier = modifier
    // The boss is a tile-less occupant; with a config the bare marker
    // expands to `boss-<hp>` so the board itself carries the hit points.
    if (isBossModifier(modifier)) {
      cell.tile = undefined
      if (level.boss) cell.modifier = `boss-${level.boss.hp}`
    }
  }
  return board
}

export interface GoalProgress {
  readonly goal: GoalDef
  readonly current: number
  readonly target: number
  readonly met: boolean
}

/**
 * Watches a game's event log and board and turns them into goal progress.
 *
 * Event-driven goals read the engine's event stream: `collect` and `deliver`
 * count cleared tiles from `clear` events (a tile counts as delivered when it
 * is cleared while sitting on the board's bottom row, i.e. dropped into the
 * basket), and `boss` counts matches that touch a boss cell. Obstacle goals
 * (`clear-modifier`) scan the settled board instead: a modifier goal is met
 * when no cell carries that modifier any more, which stays correct whatever
 * events the obstacles ticket later emits.
 *
 * Call `sync()` after every move (the `createLevelGame` eval hook does this
 * for you); the constructor syncs once so start-board obstacles are counted.
 */
export class GoalTracker {
  readonly #game: Swap3Game
  readonly #goals: readonly GoalDef[]
  #consumed = 0
  readonly #collected = emptyClearedRecord()
  readonly #delivered = emptyClearedRecord()
  #bossHits = 0
  readonly #modifierLeft = new Map<string, number>()
  readonly #modifierTotal = new Map<string, number>()

  constructor(game: Swap3Game, goals: readonly GoalDef[]) {
    this.#game = game
    this.#goals = goals
    this.sync()
  }

  /** Consume everything logged since the last sync, then rescan the board. */
  sync(): void {
    const log = this.#game.log
    const bossCells = this.#cellsOf('boss')
    while (this.#consumed < log.length) {
      const event = log[this.#consumed]
      this.#consumed++
      if (!event) continue
      if (event.type === 'clear') {
        for (const { at, tile } of event.cells) {
          this.#collected[tile.type]++
          if (at.y === this.#game.board.height - 1) this.#delivered[tile.type]++
        }
      } else if (event.type === 'match') {
        const touchesBoss = event.at.some((cell) =>
          bossCells.some((b) => samePos(b, cell) || areAdjacent(b, cell)),
        )
        if (touchesBoss) this.#bossHits++
      }
    }

    const left = new Map<string, number>()
    for (const cell of this.#game.board.cells) {
      if (cell.modifier && cell.modifier !== VOID) {
        left.set(cell.modifier, (left.get(cell.modifier) ?? 0) + 1)
      }
    }
    this.#modifierLeft.clear()
    for (const [id, n] of left) {
      this.#modifierLeft.set(id, n)
      // Totals grow with the highest count seen, so obstacles that arrive
      // mid-level (spreader, boss spawns) still count toward their goal.
      this.#modifierTotal.set(id, Math.max(this.#modifierTotal.get(id) ?? 0, n))
    }
  }

  get progress(): readonly GoalProgress[] {
    return this.#goals.map((goal) => {
      let current: number
      let target: number
      switch (goal.kind) {
        case 'collect':
          current = this.#collected[goal.color]
          target = goal.count
          break
        case 'deliver':
          current = this.#delivered[goal.color]
          target = goal.count
          break
        case 'clear-modifier': {
          const total = Math.max(this.#modifierTotal.get(goal.modifier) ?? 0, 1)
          current = total - (this.#modifierLeft.get(goal.modifier) ?? 0)
          target = total
          break
        }
        case 'boss':
          current = this.#bossHits
          target = goal.hits
          break
      }
      return {
        goal,
        current: Math.max(0, Math.min(current, target)),
        target,
        met: current >= target,
      }
    })
  }

  get allMet(): boolean {
    return this.#goals.length > 0 && this.progress.every((g) => g.met)
  }

  /** Boss hits counted so far; `recordBossHit` feeds it by hand. */
  get bossHits(): number {
    return this.#bossHits
  }

  /**
   * Hook for the boss ticket: once the real boss mechanic exists it can call
   * this instead of relying on the match-adjacency heuristic.
   */
  recordBossHit(): void {
    this.#bossHits++
  }

  #cellsOf(modifier: string): Pos[] {
    const found: Pos[] = []
    const board = this.#game.board
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        if (board.cells[y * board.width + x]?.modifier === modifier) found.push({ x, y })
      }
    }
    return found
  }
}

/** Stars for a win, from moves left: ≥ 3★ threshold → 3, ≥ 2★ → 2, else 1. */
export function starsFor(level: Level, movesLeft: number): 1 | 2 | 3 {
  const [two, three] = level.starThresholds
  if (movesLeft >= three) return 3
  if (movesLeft >= two) return 2
  return 1
}

/** Stars earned in a finished game; a loss earns none. */
export function levelStars(level: Level, game: Swap3Game): 0 | 1 | 2 | 3 {
  if (game.result !== 'win') return 0
  return starsFor(level, game.movesLeft ?? 0)
}

export interface LevelGame {
  readonly level: Level
  readonly game: Swap3Game
  readonly tracker: GoalTracker
}

/**
 * One-call level start: validate, build the board, open a `Swap3Game` with
 * the level's pool and move budget, and wire win/lose to the goals — win the
 * moment every goal is met, lose when the last move is spent without that.
 */
export function createLevelGame(raw: unknown): LevelGame {
  const level = loadLevel(raw)
  const board = buildLevelBoard(level)
  let tracker: GoalTracker | undefined
  const game = new Swap3Game({
    seed: level.seed,
    board,
    colors: level.pool,
    moves: level.moves,
    onEval: (snapshot) => {
      tracker?.sync()
      if (tracker?.allMet) return 'win'
      return snapshot.movesLeft === 0 ? 'lose' : undefined
    },
  })
  tracker = new GoalTracker(game, level.goals)
  if (level.boss) attachBoss(game.board, level.boss, () => tracker?.recordBossHit())
  return { level, game, tracker }
}
