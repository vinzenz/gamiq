/**
 * Trick-or-Treat Swap — swap-3 board engine.
 *
 * Pure, framework-free core: seeded board generation, match detection
 * (run-3/4/5, L/T intersection, 2×2 square), gravity/refill with cascades,
 * reshuffles, and turn resolution emitted as an ordered event stream that the
 * renderer and audio animate from. Power-up effects and obstacles plug in via
 * the registries in `registry.ts` without touching these files. The four
 * power-ups (effects, tap/swap activation, combo events) live in `powerups.ts`, the ten
 * pairwise power-up combos in `combos.ts`, and the five blockers (cobweb, gravestone, cursed
 * ice, lock, slime) in `obstacles.ts`, and the boss house mechanic in `boss.ts`; all are
 * armed by importing this module.
 */

export * from './board.ts'
export * from './boss.ts'
export * from './combos.ts'
export * from './game.ts'
export * from './match.ts'
export * from './obstacles.ts'
export * from './pos.ts'
export * from './powerups.ts'
export * from './registry.ts'
export * from './resolve.ts'
export * from './rng.ts'
export * from './types.ts'
