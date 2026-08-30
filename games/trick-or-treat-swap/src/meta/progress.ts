import type { Level } from '../engine/goals.ts'
import { LEVELS } from '../levels/index.ts'

/**
 * Alley-map progression (ticket ToTS-ra73yg).
 *
 * The play screen already persists earned stars per level id under the shared
 * `trick-or-treat-swap:stars` key (`src/game/progress.ts`). Everything else is
 * derived from it: a level is unlocked once every level before it has at least
 * one star, and the current chapter is the unlocked level's chapter. One
 * storage key therefore carries the whole progression and it survives reloads.
 *
 * This module is pure so the derivations stay unit-testable under
 * `node --test` (which cannot load `@gamiq/shared`); the map screen does the
 * storage I/O around it. The only extra state is where the kid avatar stands,
 * persisted alongside so the map walks him to the next door once per win.
 */

export function earnedStars(level: Pick<Level, 'id'>, stars: Record<string, number>): number {
  return stars[String(level.id)] ?? 0
}

/** First level with no stars yet — the next door to knock on. */
export function unlockedIndex(
  stars: Record<string, number>,
  levels: readonly Pick<Level, 'id'>[] = LEVELS,
): number {
  for (const [index, level] of levels.entries()) {
    if ((stars[String(level.id)] ?? 0) < 1) return index
  }
  return levels.length - 1
}

export function totalStars(
  stars: Record<string, number>,
  levels: readonly Pick<Level, 'id'>[] = LEVELS,
): number {
  return levels.reduce((sum, level) => sum + Math.min(3, earnedStars(level, stars)), 0)
}

export interface MapState {
  /** Level index the kid is standing at. */
  avatar: number
}

/** Validate a parsed storage payload; undefined when it is not a map state. */
export function normalizeMapState(value: unknown): MapState | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const avatar = (value as { avatar?: unknown }).avatar
  return typeof avatar === 'number' && Number.isInteger(avatar) && avatar >= 0
    ? { avatar }
    : undefined
}

/** Where the kid starts: the remembered spot, never ahead of the unlocked door. */
export function avatarStart(state: MapState, unlocked: number, levelCount: number): number {
  return Math.min(Math.max(0, state.avatar), unlocked, levelCount - 1)
}
