import { detectShapes, matchableTypeAt } from './match.ts'
import { isGravityBarrier, isSwappable } from './registry.ts'
import type { Rng } from './rng.ts'
import type {
  Board,
  Cell,
  FallMove,
  Pos,
  PowerupKind,
  SpawnedCell,
  SweepDir,
  Tile,
  TileType,
} from './types.ts'

let nextTileId = 1

export function makeTile(type: TileType, powerup?: PowerupKind, dir?: SweepDir): Tile {
  const tile: Tile = { id: nextTileId++, type }
  if (powerup) tile.powerup = powerup
  if (dir) tile.dir = dir
  return tile
}

export function inBounds(board: Board, p: Pos): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < board.width && p.y < board.height
}

export function requireCell(board: Board, p: Pos): Cell {
  const cell = board.cells[p.y * board.width + p.x]
  if (!cell)
    throw new Error(`cell (${p.x}, ${p.y}) is outside the ${board.width}×${board.height} board`)
  return cell
}

export function tileAt(board: Board, p: Pos): Tile | undefined {
  return board.cells[p.y * board.width + p.x]?.tile
}

export function swapTiles(board: Board, a: Pos, b: Pos): void {
  const cellA = requireCell(board, a)
  const cellB = requireCell(board, b)
  const moved = cellA.tile
  cellA.tile = cellB.tile
  cellB.tile = moved
}

/**
 * Would the tile at `p` (after a swap) be part of a 3+ run right now?
 * Unmatchable cells (e.g. cursed ice later on) break runs.
 */
export function wouldMatchAt(board: Board, p: Pos): boolean {
  const type = matchableTypeAt(board, p.x, p.y)
  if (!type) return false

  let horizontal = 1
  for (let x = p.x - 1; x >= 0 && matchableTypeAt(board, x, p.y) === type; x--) horizontal++
  for (let x = p.x + 1; x < board.width && matchableTypeAt(board, x, p.y) === type; x++)
    horizontal++

  let vertical = 1
  for (let y = p.y - 1; y >= 0 && matchableTypeAt(board, p.x, y) === type; y--) vertical++
  for (let y = p.y + 1; y < board.height && matchableTypeAt(board, p.x, y) === type; y++) vertical++

  return horizontal >= 3 || vertical >= 3
}

export interface ValidMove {
  a: Pos
  b: Pos
}

/**
 * First swap (row-major, right before down) that produces a match. Only
 * swappable tiles are considered; locked tiles can never be part of a move.
 */
export function findValidMove(board: Board): ValidMove | null {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const a = { x, y }
      if (!isSwappable(requireCell(board, a))) continue
      for (const b of [
        { x: x + 1, y },
        { x, y: y + 1 },
      ]) {
        if (!inBounds(board, b)) continue
        if (!isSwappable(requireCell(board, b))) continue
        swapTiles(board, a, b)
        const works = wouldMatchAt(board, a) || wouldMatchAt(board, b)
        swapTiles(board, a, b)
        if (works) return { a, b }
      }
    }
  }
  return null
}

/**
 * Rearrange the swappable tiles in place until the board has no shape and at
 * least one valid move. Tile objects keep their ids (and power-ups), so the
 * renderer can animate the shuffle. Returns false if no arrangement was found
 * (practically impossible with ≥4 colours).
 */
export function shuffleBoard(board: Board, rng: Rng): boolean {
  const positions: Pos[] = []
  const tiles: Tile[] = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cell = requireCell(board, { x, y })
      if (cell.tile && isSwappable(cell)) {
        positions.push({ x, y })
        tiles.push(cell.tile)
      }
    }
  }
  if (tiles.length < 2) return false

  const original = [...tiles]
  for (let attempt = 0; attempt < 200; attempt++) {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = rng.int(i + 1)
      const a = tiles[i]
      const b = tiles[j]
      if (a === undefined || b === undefined) continue
      tiles[i] = b
      tiles[j] = a
    }
    writeTiles(board, positions, tiles)
    if (detectShapes(board).length === 0 && findValidMove(board)) return true
  }

  writeTiles(board, positions, original)
  return false
}

function writeTiles(board: Board, positions: Pos[], tiles: Tile[]): void {
  positions.forEach((pos, i) => {
    const tile = tiles[i]
    if (tile) requireCell(board, pos).tile = tile
  })
}

/**
 * Compact every column downwards. Gravity barriers (obstacle seam) keep their
 * own tile in place and make tiles above stack on top of them.
 */
export function applyGravity(board: Board): FallMove[] {
  const moves: FallMove[] = []
  for (let x = 0; x < board.width; x++) {
    let write = board.height - 1
    for (let y = board.height - 1; y >= 0; y--) {
      const cell = requireCell(board, { x, y })
      if (isGravityBarrier(cell)) {
        write = y - 1
        continue
      }
      if (!cell.tile) continue
      if (write !== y) {
        const target = requireCell(board, { x, y: write })
        target.tile = cell.tile
        cell.tile = undefined
        moves.push({ from: { x, y }, to: { x, y: write } })
      }
      write--
    }
  }
  return moves
}

/** Fill every empty, non-barrier cell with a fresh random tile. */
export function refillBoard(board: Board, rng: Rng, colors: readonly TileType[]): SpawnedCell[] {
  const spawned: SpawnedCell[] = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cell = requireCell(board, { x, y })
      if (cell.tile || isGravityBarrier(cell)) continue
      const tile = makeTile(rng.pick(colors))
      cell.tile = tile
      spawned.push({ at: { x, y }, tile })
    }
  }
  return spawned
}

/**
 * Create a full board with no pre-made matches (no 3-run, no 2×2 square) and
 * at least one valid move, reshuffling deterministically if the fill got stuck.
 */
export function createBoard(opts: {
  width: number
  height: number
  rng: Rng
  colors: readonly TileType[]
}): Board {
  if (opts.colors.length < 3) throw new Error('createBoard needs at least 3 tile types')

  const board: Board = { width: opts.width, height: opts.height, cells: [] }
  for (let y = 0; y < opts.height; y++) {
    for (let x = 0; x < opts.width; x++) {
      const avoid = new Set<TileType>()
      const type = (cx: number, cy: number) => matchableTypeAt(board, cx, cy)

      const left1 = type(x - 1, y)
      const left2 = type(x - 2, y)
      if (left1 && left1 === left2) avoid.add(left1)

      const up1 = type(x, y - 1)
      const up2 = type(x, y - 2)
      if (up1 && up1 === up2) avoid.add(up1)

      // Don't complete a 2×2 square either: squares are power-up shapes and
      // must never exist on a settled board.
      if (x >= 1 && y >= 1) {
        const diag = type(x - 1, y - 1)
        const above = type(x, y - 1)
        const before = type(x - 1, y)
        if (diag && diag === above && diag === before) avoid.add(diag)
      }

      const options = opts.colors.filter((c) => !avoid.has(c))
      board.cells.push({ tile: makeTile(rngOr(opts.rng, options, opts.colors)) })
    }
  }

  let attempts = 0
  while (!findValidMove(board) && attempts < 100) {
    attempts++
    if (!shuffleBoard(board, opts.rng)) break
  }
  return board
}

function rngOr(rng: Rng, options: readonly TileType[], all: readonly TileType[]): TileType {
  return options.length > 0 ? rng.pick(options) : rng.pick(all)
}
