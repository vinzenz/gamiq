import { posKey } from './pos.ts'
import { isMatchable } from './registry.ts'
import type { Board, MatchShape, Pos, PowerupKind, TileType } from './types.ts'

/**
 * One detected match shape. `spawn` is the fallback birthplace of the shape's
 * power-up; resolution prefers a cell the player actually swapped into.
 */
export interface MatchedShape {
  cells: Pos[]
  tileType: TileType
  shape: MatchShape
  powerup?: PowerupKind
  spawn: Pos
  dir?: 'h' | 'v'
}

/** Tile type at a cell if the cell holds a matchable tile, else undefined. */
export function matchableTypeAt(board: Board, x: number, y: number): TileType | undefined {
  const cell = board.cells[y * board.width + x]
  if (!cell || !isMatchable(cell)) return undefined
  return cell.tile?.type
}

interface Run {
  cells: Pos[]
  dir: 'h' | 'v'
  tileType: TileType
}

function findRuns(board: Board): Run[] {
  const runs: Run[] = []

  const pushRun = (cells: Pos[], dir: 'h' | 'v', tileType: TileType) => {
    runs.push({ cells, dir, tileType })
  }

  for (let y = 0; y < board.height; y++) {
    let x = 0
    while (x < board.width) {
      const type = matchableTypeAt(board, x, y)
      if (!type) {
        x++
        continue
      }
      let end = x + 1
      while (end < board.width && matchableTypeAt(board, end, y) === type) end++
      if (end - x >= 3) {
        const cells: Pos[] = []
        for (let cx = x; cx < end; cx++) cells.push({ x: cx, y })
        pushRun(cells, 'h', type)
      }
      x = end
    }
  }

  for (let x = 0; x < board.width; x++) {
    let y = 0
    while (y < board.height) {
      const type = matchableTypeAt(board, x, y)
      if (!type) {
        y++
        continue
      }
      let end = y + 1
      while (end < board.height && matchableTypeAt(board, x, end) === type) end++
      if (end - y >= 3) {
        const cells: Pos[] = []
        for (let cy = y; cy < end; cy++) cells.push({ x, y: cy })
        pushRun(cells, 'v', type)
      }
      y = end
    }
  }

  return runs
}

/** Merge runs that share a cell, so an L/T is judged as one shape. */
function groupRuns(runs: Run[]): Run[][] {
  const parent = runs.map((_, i) => i)
  const find = (i: number): number => {
    let root = i
    while (parent[root] !== root) root = parent[root] ?? root
    return root
  }
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b)
  }

  const byCell = new Map<string, number>()
  runs.forEach((run, i) => {
    for (const cell of run.cells) {
      const key = posKey(cell)
      const other = byCell.get(key)
      if (other === undefined) byCell.set(key, i)
      else union(i, other)
    }
  })

  const groups = new Map<number, Run[]>()
  runs.forEach((run, i) => {
    const root = find(i)
    const list = groups.get(root)
    if (list) list.push(run)
    else groups.set(root, [run])
  })
  return [...groups.values()]
}

function midCell(run: Run): Pos {
  const mid = run.cells[Math.floor(run.cells.length / 2)]
  if (mid) return mid
  throw new Error('internal error: empty run')
}

function shapeFromGroup(group: Run[]): MatchedShape | null {
  const first = group[0]
  if (!first) return null

  const cellMap = new Map<string, Pos>()
  for (const run of group) {
    for (const cell of run.cells) cellMap.set(posKey(cell), cell)
  }
  const cells = [...cellMap.values()]

  const longestRun = group.reduce(
    (best, run) => (run.cells.length > best.cells.length ? run : best),
    first,
  )
  const longest = longestRun.cells.length
  const hasH = group.some((run) => run.dir === 'h')
  const hasV = group.some((run) => run.dir === 'v')
  const base = { cells, tileType: first.tileType }

  // Precedence: straight-5+ beats L/T, L/T beats match-4.
  if (longest >= 5) {
    return { ...base, shape: 'run5', powerup: 'cauldron', spawn: midCell(longestRun) }
  }
  if (hasH && hasV && cells.length >= 5) {
    const hKeys = new Set(group.filter((r) => r.dir === 'h').flatMap((r) => r.cells.map(posKey)))
    const vKeys = new Set(group.filter((r) => r.dir === 'v').flatMap((r) => r.cells.map(posKey)))
    const crossing = cells.find((c) => hKeys.has(posKey(c)) && vKeys.has(posKey(c)))
    return {
      ...base,
      shape: 'intersection',
      powerup: 'bomb',
      spawn: crossing ?? midCell(longestRun),
    }
  }
  if (longest === 4) {
    return {
      ...base,
      shape: 'run4',
      powerup: 'broom',
      spawn: midCell(longestRun),
      dir: longestRun.dir,
    }
  }
  return { ...base, shape: 'run3', spawn: midCell(longestRun) }
}

/**
 * Detect every match shape on the board: 3-in-a-row, match-4 (broom),
 * L/T match-5 (bomb), straight match-5 (cauldron) and 2×2 squares
 * (little-ghost). Runs are detected first; squares only form from cells no
 * run has claimed, so overlapping shapes resolve to the bigger one.
 */
export function detectShapes(board: Board): MatchedShape[] {
  const shapes: MatchedShape[] = []
  const claimed = new Set<string>()

  for (const group of groupRuns(findRuns(board))) {
    const shape = shapeFromGroup(group)
    if (!shape) continue
    shapes.push(shape)
    for (const cell of shape.cells) claimed.add(posKey(cell))
  }

  for (let y = 0; y + 1 < board.height; y++) {
    for (let x = 0; x + 1 < board.width; x++) {
      const type = matchableTypeAt(board, x, y)
      if (!type) continue
      const corners: Pos[] = [
        { x, y },
        { x: x + 1, y },
        { x, y: y + 1 },
        { x: x + 1, y: y + 1 },
      ]
      if (corners.some((c) => claimed.has(posKey(c)))) continue
      if (corners.every((c) => matchableTypeAt(board, c.x, c.y) === type)) {
        shapes.push({
          cells: corners,
          tileType: type,
          shape: 'square',
          powerup: 'little-ghost',
          spawn: { x, y },
        })
        for (const c of corners) claimed.add(posKey(c))
      }
    }
  }

  return shapes
}
