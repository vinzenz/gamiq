import { applyGravity, refillBoard, requireCell } from './board.ts'
import { detectShapes } from './match.ts'
import { posKey, samePos } from './pos.ts'
import {
  type ActivationPlan,
  applyObstacleHits,
  getCellModifier,
  getPowerupEffect,
  type ObstacleMatchGroup,
} from './registry.ts'
import type { Rng } from './rng.ts'
import type { Board, ClearCause, GameEvent, Pos, Tile, TileType } from './types.ts'
import { emptyClearedRecord } from './types.ts'

export interface MoveResolution {
  events: GameEvent[]
  /** Tiles cleared per colour, for goal tracking. */
  cleared: Record<TileType, number>
  powerupsCreated: number
  /** Number of resolution passes; 2+ means the move cascaded. */
  cascades: number
}

interface ClearTask {
  at: Pos
  cause: ClearCause
}

/**
 * Resolve the board to rest: detect shapes, convert shape spawns into
 * power-ups, clear (detonating any power-up caught in the clear through the
 * effect registry), then apply gravity and refill. Repeats until the board has
 * no shapes left, emitting the event stream as it goes.
 *
 * `preferred` are the cells the player swapped; a shape containing one spawns
 * its power-up there instead of at the shape's fallback point.
 *
 * `plan` seeds the first pass with direct activations (tap / activating swap,
 * see `ActivationPlan`): those cells detonate before any shape is matched.
 */
export function resolveMatches(
  board: Board,
  rng: Rng,
  colors: readonly TileType[],
  preferred: readonly Pos[] = [],
  plan?: ActivationPlan,
): MoveResolution {
  const events: GameEvent[] = []
  const cleared = emptyClearedRecord()
  let powerupsCreated = 0
  let pass = 0
  let pending = plan

  for (;;) {
    const shapes = detectShapes(board)
    if (shapes.length === 0 && !pending) break
    pass++
    if (pass > 1) events.push({ type: 'cascade', depth: pass })

    const tasks: ClearTask[] = []
    const matchGroups: ObstacleMatchGroup[] = []
    const reserved: { at: Pos; cause: ClearCause }[] = []
    if (pending) {
      for (const at of pending.detonate) tasks.push({ at, cause: 'powerup' })
      pending = undefined
    }
    for (const shape of shapes) {
      events.push({ type: 'match', shape: shape.shape, at: shape.cells, tileType: shape.tileType })
      matchGroups.push({ cells: shape.cells, tileType: shape.tileType })
      // Only shapes that produce a power-up reserve a spawn cell; a plain run
      // clears every cell it covers.
      const spawn = shape.powerup
        ? (preferred.find((p) => shape.cells.some((c) => samePos(c, p))) ?? shape.spawn)
        : undefined
      for (const cell of shape.cells) {
        // The power-up birthplace survives the clear; everything else goes.
        if (spawn && samePos(cell, spawn)) {
          reserved.push({ at: cell, cause: 'match' })
          continue
        }
        tasks.push({ at: cell, cause: 'match' })
      }
      if (shape.powerup && spawn) {
        const tile = requireCell(board, spawn).tile
        if (tile) {
          tile.powerup = shape.powerup
          if (shape.dir) tile.dir = shape.dir
          powerupsCreated++
          events.push({
            type: 'convert',
            at: spawn,
            tileType: tile.type,
            powerup: shape.powerup,
            tile,
          })
        }
      }
    }

    // Expand the clear set through the power-up effect registry (BFS so
    // detonations chain, each newly hit power-up firing its own effect).
    const seen = new Set<string>()
    const clearedCells: { at: Pos; tile: Tile; cause: ClearCause }[] = []
    let i = 0
    while (i < tasks.length) {
      const task = tasks[i]
      i++
      if (!task) break
      const key = posKey(task.at)
      if (seen.has(key)) continue
      seen.add(key)

      const cell = requireCell(board, task.at)
      // Obstacle seam: a modifier with an onHit hook soaks up direct hits —
      // its tile survives the pass, the hook applies the damage below.
      if (cell.modifier && getCellModifier(cell)?.onHit) continue
      const tile = cell.tile
      if (!tile) continue
      clearedCells.push({ at: task.at, tile, cause: task.cause })

      if (tile.powerup) {
        const effect = getPowerupEffect(tile.powerup)
        if (effect) {
          const extra = effect({
            board,
            at: task.at,
            tile,
            cause: task.cause === 'match' ? 'match' : 'chain',
            rng,
          })
          for (const pos of extra) {
            if (!seen.has(posKey(pos))) tasks.push({ at: pos, cause: 'powerup' })
          }
        }
      }
    }

    // Obstacle seam: let soak-up modifiers react to the footprint and to the
    // adjacent matches (peel, crack, break …) before the clears land.
    events.push(...applyObstacleHits(board, [...tasks, ...reserved], matchGroups))

    for (const cause of ['match', 'powerup'] as const) {
      const group = clearedCells.filter((c) => c.cause === cause)
      if (group.length > 0) {
        events.push({
          type: 'clear',
          cause,
          cells: group.map((c) => ({ at: c.at, tile: c.tile })),
        })
      }
    }
    for (const entry of clearedCells) {
      cleared[entry.tile.type]++
      requireCell(board, entry.at).tile = undefined
    }

    const falls = applyGravity(board)
    if (falls.length > 0) events.push({ type: 'fall', moves: falls })
    const spawned = refillBoard(board, rng, colors)
    if (spawned.length > 0) events.push({ type: 'spawn', cells: spawned })
  }

  return { events, cleared, powerupsCreated, cascades: pass }
}
