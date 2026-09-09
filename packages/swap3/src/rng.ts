/**
 * Minimal seeded RNG (mulberry32). Boards, refills and reshuffles all draw from
 * it, so a game is reproducible from its seed plus the sequence of player moves.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number
  /** Uniform element of a non-empty list. */
  pick<T>(items: readonly T[]): T
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (maxExclusive: number) => {
    if (maxExclusive <= 0) throw new Error(`rng.int needs a positive bound, got ${maxExclusive}`)
    return Math.floor(next() * maxExclusive)
  }

  const pick = <T>(items: readonly T[]): T => {
    const item = items[int(items.length)]
    if (item === undefined) throw new Error('rng.pick called with an empty list')
    return item
  }

  return { next, int, pick }
}
