import type { Level } from '@gamiq/swap3/goals'
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
 * storage I/O around it. The only extra state is the door up to which the
 * map has already celebrated arrivals, persisted so the celebration plays
 * exactly once per win and reloads never replay it.
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
  /** Level index up to which the map has already celebrated arrivals. */
  celebrated: number
}

/** Validate a parsed storage payload; undefined when it is not a map state.
 *  Legacy `{ avatar }` payloads migrate to `celebrated` so existing players
 *  do not get a spurious celebration after updating. */
export function normalizeMapState(value: unknown): MapState | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as { celebrated?: unknown; avatar?: unknown }
  const celebrated = raw.celebrated ?? raw.avatar
  return typeof celebrated === 'number' && Number.isInteger(celebrated) && celebrated >= 0
    ? { celebrated }
    : undefined
}

/** The door that earned an arrival celebration, if progress is fresh — the
 *  kid always stands at the unlocked door; this only decides whether the
 *  door-open + candy moment still has to play. */
export function pendingCelebration(
  state: MapState,
  unlocked: number,
  levelCount: number,
): number | undefined {
  const target = Math.min(unlocked, levelCount - 1)
  return unlocked > state.celebrated ? target : undefined
}
