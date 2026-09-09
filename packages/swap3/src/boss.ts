import type { ObstacleHit, Rng } from './registry.ts'
import { getCellModifier, registerCellModifier, registerTurnHook } from './registry.ts'
import type { Board, GameEvent, Pos } from './types.ts'

/**
 * Boss house mechanic (ticket ToTS-sxjp6c). The chapter finale puts a greedy
 * monster on the board as a tile-less occupant cell and drives it from the
 * level's `boss` config (`hp`, `throwEvery`, `throws`):
 *
 * - The boss sits in a `boss-<hp>` cell (hp remaining, like the layered
 *   obstacles' ids). A match adjacent to the boss or a power-up footprint
 *   covering it deals one damage per resolution pass; at 0 hp the cell breaks
 *   open and behaves as a normal column cell from that pass on. Every damage
 *   event also feeds `GoalTracker.recordBossHit()`, so a boss goal with
 *   `hits: hp` is met exactly when the boss dies — win = boss hp 0.
 * - Every `throwEvery` moves the boss throws its obstacle onto a random plain
 *   cell: overlays (cover, ice, lock) wrap the tile that is there, occupants
 *   (blocker, spreader) replace it, mirroring the spreader's own spread.
 * - The bare `boss` modifier (no config) stays the level-format hook from the
 *   goals ticket: an inert marker whose hits the goal tracker counts by match
 *   adjacency.
 *
 * Emits `obstacle` events (`damage`/`destroy` for hits, `spread` for throws)
 * plus a `clear` when a throw eats a tile, so the renderer can animate all of
 * it. Wired into the level system by `createLevelGame` (`goals.ts`); arms
 * itself on import like the other plug-in modules.
 */

export const BOSS_MAX_HP = 99

/** Boss behaviour knobs from the level's `boss` field. */
export interface BossConfig {
  /** Hit points: adjacent matches and power-up hits deal one damage each. */
  hp: number
  /** The boss throws an obstacle every `throwEvery` resolved moves. */
  throwEvery: number
  /** Modifier id placed per throw, e.g. `cover-2` or `spreader-3`. */
  throws: string
}

const BOSS_ROOT = 'boss'
const BOSS_HP_ID = /^boss-([1-9][0-9]*)$/

/** True for the bare `boss` marker and the `boss-<hp>` occupant ids. */
export function isBossModifier(id: string): boolean {
  return id === BOSS_ROOT || BOSS_HP_ID.test(id)
}

function bossHpOf(id: string): number {
  return Number(BOSS_HP_ID.exec(id)?.[1] ?? 0)
}

/** The live boss with its remaining hp, or null while none is on the board. */
export function findBoss(board: Board): { at: Pos; hp: number } | null {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const id = board.cells[y * board.width + x]?.modifier
      if (!id) continue
      const hp = bossHpOf(id)
      if (hp > 0) return { at: { x, y }, hp }
    }
  }
  return null
}

// — Damage ———————————————————————————————————————————————————————————————————

interface BossSession {
  config: BossConfig
  /** Moves until the next throw; 0 means due (and overdue if a throw had no target). */
  untilThrow: number
  onDamage?: () => void
}

/**
 * Per-board boss sessions. Keyed weakly so a finished level's board is
 * collected with its session and concurrent games never cross-talk.
 */
const sessions = new WeakMap<Board, BossSession>()

/**
 * Arm the boss behaviour for `board`. Called by `createLevelGame` with the
 * level's `boss` config; `onDamage` is invoked once per damage event so the
 * goal tracker can count boss hits from the real mechanic.
 */
export function attachBoss(board: Board, config: BossConfig, onDamage?: () => void): void {
  if (!getCellModifier({ modifier: config.throws })) {
    throw new Error(
      `swap3: boss.throws '${config.throws}' is not a registered modifier — import the module that defines it`,
    )
  }
  sessions.set(board, { config, untilThrow: config.throwEvery, onDamage })
}

function hitBoss(hit: ObstacleHit, emit: (event: GameEvent) => void): void {
  const id = hit.cell.modifier ?? ''
  const hp = bossHpOf(id)
  if (hp <= 1) {
    // Defeated: the cell becomes a normal column cell from this pass on.
    hit.cell.modifier = undefined
    emit({ type: 'obstacle', at: hit.at, modifier: id, action: 'destroy' })
  } else {
    const next = `boss-${hp - 1}`
    hit.cell.modifier = next
    emit({ type: 'obstacle', at: hit.at, modifier: next, action: 'damage' })
  }
  sessions.get(hit.board)?.onDamage?.()
}

// — Throws ———————————————————————————————————————————————————————————————————

/** Obstacle families that replace the tile instead of wrapping it. */
const OCCUPANT_ROOTS = new Set(['blocker', 'spreader'])

function modifierRoot(id: string): string {
  return id.replace(/-[1-9][0-9]*$/, '')
}

function throwObstacle(
  board: Board,
  config: BossConfig,
  rng: Rng,
  emit: (event: GameEvent) => void,
): boolean {
  const targets: Pos[] = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cell = board.cells[y * board.width + x]
      if (cell?.tile && !cell.modifier) targets.push({ x, y })
    }
  }
  const target = targets.length > 0 ? rng.pick(targets) : undefined
  const cell = target ? board.cells[target.y * board.width + target.x] : undefined
  if (!target || !cell) return false

  if (OCCUPANT_ROOTS.has(modifierRoot(config.throws))) {
    const eaten = cell.tile
    if (eaten) {
      cell.tile = undefined
      emit({ type: 'clear', cause: 'obstacle', cells: [{ at: target, tile: eaten }] })
    }
  }
  cell.modifier = config.throws
  emit({ type: 'obstacle', at: target, modifier: config.throws, action: 'spread' })
  return true
}

function bossTurn(board: Board, rng: Rng, emit: (event: GameEvent) => void): void {
  const session = sessions.get(board)
  if (!session || !findBoss(board)) return
  session.untilThrow--
  if (session.untilThrow > 0) return
  // Without a plain cell to hit, the throw stays due and retries next move.
  if (throwObstacle(board, session.config, rng, emit)) {
    session.untilThrow = session.config.throwEvery
  }
}

// — Registration ——————————————————————————————————————————————————————————————

// The bare marker is an inert occupant (its hits are counted by the goal
// tracker's adjacency heuristic); numbered ids carry hp and take damage.
registerCellModifier({ id: BOSS_ROOT, gravityBarrier: true })
for (let hp = 1; hp <= BOSS_MAX_HP; hp++) {
  registerCellModifier({ id: `boss-${hp}`, gravityBarrier: true, onHit: hitBoss })
}
registerTurnHook(bossTurn)
