import type { ObstacleHit, Rng } from './registry.ts'
import { registerCellModifier, registerTurnHook } from './registry.ts'
import type { Board, Cell, GameEvent, Pos, Tile } from './types.ts'

/**
 * The five blockers, registered as cell modifiers (`Cell.modifier`). Behaviour
 * lives here; the core only asks the registry predicates at its decision
 * points. Level JSON expresses obstacles through the modifier ids below:
 *
 * | id                          | obstacle    | rules |
 * |-----------------------------|-------------|-------|
 * | `cover-1` … `cover-3`     | Cover      | 1–3 layers over a tile; a match on the tile or a power-up covering it peels one layer, the tile survives. |
 * | `blocker-1` … `-3`       | Blocker  | Immovable occupant without a tile; adjacent matches and power-up footprints hit it (1–3 hits to break). No tile spawns there until it breaks. |
 * | `ice`                       | Cursed Ice  | Frozen tile: can't be swapped, matched or moved. An adjacent match or a power-up footprint cracks it free. |
 * | `lock`                      | Lock        | Locks its tile in place: can't be swapped or matched. Freed by an adjacent match of the locked tile's colour, or by a power-up footprint. |
 * | `spreader-1` … `spreader-N`       | Spreader       | Goo occupying a cell (no tile, nothing spawns). A match next to it or a power-up footprint dissolves it; otherwise the countdown in the id ticks down every move and at 1 it spreads onto a random adjacent plain cell, eating its tile. |
 *
 * Layer/hit counts are part of the id so a board (and its level JSON) stays a
 * plain serialisable tree. Every hit emits an `obstacle` event so the renderer
 * can animate peel/crack/break/spread.
 */

export const COVER_LAYERS = 3
export const BLOCKER_HITS = 3
/** Moves a spreader cell needs to spread (also the countdown it resets to). */
export const SPREADER_SPREAD_MOVES = 3

const NUMBERED = /^([a-z]+)-([1-9][0-9]*)$/

/** Obstacle family of a modifier id (`cover-2` → `cover`, `ice` → `ice`). */
function modifierRoot(id: string): string {
  return NUMBERED.exec(id)?.[1] ?? id
}

/** State counter of a modifier id (`cover-2` → 2, `ice` → 0). */
function modifierCount(id: string): number {
  return Number(NUMBERED.exec(id)?.[2] ?? 0)
}

function setCount(cell: Cell, root: string, count: number): string {
  const id = `${root}-${count}`
  cell.modifier = id
  return id
}

const emitDamage = (hit: ObstacleHit, id: string, emit: (event: GameEvent) => void) => {
  emit({ type: 'obstacle', at: hit.at, modifier: id, action: 'damage' })
}

const emitDestroy = (hit: ObstacleHit, id: string, emit: (event: GameEvent) => void) => {
  emit({ type: 'obstacle', at: hit.at, modifier: id, action: 'destroy' })
}

// — Cover ——————————————————————————————————————————————————————————————————

function hitCover(hit: ObstacleHit, emit: (event: GameEvent) => void): void {
  // Only clears landing on the webbed tile itself peel; neighbouring matches
  // leave the web alone.
  if (!hit.direct) return
  const id = hit.cell.modifier ?? ''
  const layers = modifierCount(id)
  if (layers <= 1) {
    hit.cell.modifier = undefined
    emitDestroy(hit, id, emit)
    return
  }
  emitDamage(hit, setCount(hit.cell, 'cover', layers - 1), emit)
}

// — Blocker ———————————————————————————————————————————————————————————————————

function hitBlocker(hit: ObstacleHit, emit: (event: GameEvent) => void): void {
  const id = hit.cell.modifier ?? ''
  const hits = modifierCount(id)
  if (hits <= 1) {
    // Broken: the cell becomes a normal column cell, so gravity/refill treat
    // it as such from the next step of this very pass on.
    hit.cell.modifier = undefined
    emitDestroy(hit, id, emit)
    return
  }
  emitDamage(hit, setCount(hit.cell, 'blocker', hits - 1), emit)
}

// — Cursed Ice / Lock ———————————————————————————————————————————————————————

function hitIce(hit: ObstacleHit, emit: (event: GameEvent) => void): void {
  const id = hit.cell.modifier ?? ''
  hit.cell.modifier = undefined
  emitDestroy(hit, id, emit)
}

function hitLock(hit: ObstacleHit, emit: (event: GameEvent) => void): void {
  // A cage breaks under a power-up footprint; a match only frees it when the
  // match has the locked tile's colour.
  const colourMatch = hit.cause === 'match' && hit.tileType === hit.cell.tile?.type
  if (!hit.direct && !colourMatch) return
  const id = hit.cell.modifier ?? ''
  hit.cell.modifier = undefined
  emitDestroy(hit, id, emit)
}

// — Spreader ————————————————————————————————————————————————————————————————————

function hitSpreader(hit: ObstacleHit, emit: (event: GameEvent) => void): void {
  const id = hit.cell.modifier ?? ''
  hit.cell.modifier = undefined
  emitDestroy(hit, id, emit)
}

const SPREADER_NEIGHBOURS: readonly Pos[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

/**
 * Per-move spreader behaviour: every surviving goo cell ticks its countdown, and
 * at 1 it spreads onto a random adjacent plain cell (no modifier), eating a
 * tile that may sit there. Blocked-in spreaders retry on the next move. Runs
 * after resolution, so a match that happened next to a spreader has already
 * dissolved it before it could spread.
 */
function spreadSpreader(board: Board, rng: Rng, emit: (event: GameEvent) => void): void {
  const spreaders: { at: Pos; cell: Cell; count: number }[] = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cell = board.cells[y * board.width + x]
      if (!cell?.modifier || modifierRoot(cell.modifier) !== 'spreader') continue
      spreaders.push({ at: { x, y }, cell, count: modifierCount(cell.modifier) })
    }
  }

  for (const spreader of spreaders) {
    if (spreader.count > 1) {
      setCount(spreader.cell, 'spreader', spreader.count - 1)
      continue
    }
    const targets: Pos[] = []
    for (const n of SPREADER_NEIGHBOURS) {
      const p = { x: spreader.at.x + n.x, y: spreader.at.y + n.y }
      if (p.x < 0 || p.y < 0 || p.x >= board.width || p.y >= board.height) continue
      const cell = board.cells[p.y * board.width + p.x]
      if (!cell || cell.modifier) continue
      targets.push(p)
    }
    if (targets.length === 0) continue
    const target = rng.pick(targets)
    const cell = board.cells[target.y * board.width + target.x]
    if (!cell) continue
    const eaten = cell.tile
    if (eaten) {
      cell.tile = undefined
      emit({ type: 'clear', cause: 'obstacle', cells: [{ at: target, tile: eaten }] })
    }
    cell.modifier = `spreader-${SPREADER_SPREAD_MOVES}`
    emit({
      type: 'obstacle',
      at: target,
      modifier: cell.modifier,
      action: 'spread',
    })
    setCount(spreader.cell, 'spreader', SPREADER_SPREAD_MOVES)
  }
}

// — Registration —————————————————————————————————————————————————————————————

/** The locked/frozen tile can neither be moved nor matched, and never falls. */
const frozen = {
  swappable: () => false,
  matchable: () => false,
  gravityBarrier: true,
}

// Webs are sticky: the tile under a web is glued in place and tiles above
// stack on the cell, so a web never ends up over nothing.
for (let layers = 1; layers <= COVER_LAYERS; layers++) {
  registerCellModifier({ id: `cover-${layers}`, gravityBarrier: true, onHit: hitCover })
}
for (let hits = 1; hits <= BLOCKER_HITS; hits++) {
  registerCellModifier({ id: `blocker-${hits}`, gravityBarrier: true, onHit: hitBlocker })
}
registerCellModifier({ id: 'ice', ...frozen, onHit: hitIce })
registerCellModifier({ id: 'lock', ...frozen, onHit: hitLock })
for (let moves = 1; moves <= SPREADER_SPREAD_MOVES; moves++) {
  registerCellModifier({ id: `spreader-${moves}`, gravityBarrier: true, onHit: hitSpreader })
}
registerTurnHook(spreadSpreader)

// — Level-data helpers ———————————————————————————————————————————————————————

function cellWith(modifier: string, tile?: Tile): Cell {
  const cell: Cell = { modifier }
  if (tile) cell.tile = tile
  return cell
}

function checkedCount(value: number, max: number, name: string): number {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} needs an integer between 1 and ${max}, got ${value}`)
  }
  return value
}

/** Coverbed tile: `layers` 1–3 layers of web over the (optional) tile. */
export function coverCell(layers: number, tile?: Tile): Cell {
  return cellWith(`cover-${checkedCount(layers, COVER_LAYERS, 'cover layers')}`, tile)
}

/** Blocker with `hits` 1–3 hit points left; never holds a tile. */
export function blockerCell(hits = BLOCKER_HITS): Cell {
  return cellWith(`blocker-${checkedCount(hits, BLOCKER_HITS, 'blocker hits')}`)
}

/** Frozen tile: keeps the tile, blocks swapping/matching/movement. */
export function iceCell(tile: Tile): Cell {
  return cellWith('ice', tile)
}

/** Locked tile: keeps the tile; matching its colour (or a power-up) frees it. */
export function lockCell(tile: Tile): Cell {
  return cellWith('lock', tile)
}

/** Spreader patch with `movesLeft` moves until it spreads (1–SPREADER_SPREAD_MOVES). */
export function spreaderCell(movesLeft = SPREADER_SPREAD_MOVES): Cell {
  return cellWith(`spreader-${checkedCount(movesLeft, SPREADER_SPREAD_MOVES, 'spreader moves')}`)
}
