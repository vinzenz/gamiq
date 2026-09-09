import type { Pos } from './types.ts'

/** True when both positions refer to the same cell. */
export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y
}

/** Stable string key for a position, used for sets/maps during resolution. */
export function posKey(p: Pos): string {
  return `${p.x},${p.y}`
}

/** True when the two positions are horizontal/vertical neighbours. */
export function areAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
}
