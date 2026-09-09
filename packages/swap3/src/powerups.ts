/**
 * The four power-ups: their board effects and their direct activation
 * (power-ups ticket). Everything registers into the engine's registries at
 * import time, so importing this module (or the engine barrel) arms it.
 *
 * - Witch's Broom (match-4): sweeps its row or column, direction of the match.
 * - Pumpkin Bomb (L/T match-5): 3×3 blast around the blast.
 * - Magic Prism (straight match-5): clears every tile of one colour — the
 *   tile it was swapped with (`charge`), otherwise a random colour (tap/chain).
 * - Homing Tile (2×2): homes to the nearest objective tile and pops it.
 *
 * Activation: tapping a power-up or swapping it with a tile detonates it and
 * spends a move; it occupies its board tile and is consumed by its effect.
 * Swapping two power-ups together raises the distinct `combo` event and both
 * detonate through their own effects — dedicated pair effects belong to the
 * combos ticket, which can replace the swap activator registered here.
 */
import { inBounds, tileAt } from './board.ts'
import {
  type ActivationPlan,
  findObjectiveTile,
  type PowerupEffectContext,
  registerPowerupEffect,
  registerSwapActivator,
  registerTapActivator,
} from './registry.ts'
import type { Board, Pos, TileType } from './types.ts'

/** Every cell of the sweep's row (`dir 'h'` or missing) or column (`dir 'v'`). */
export function sweepEffect(ctx: PowerupEffectContext): Pos[] {
  const cells: Pos[] = []
  if (ctx.tile.dir === 'v') {
    for (let y = 0; y < ctx.board.height; y++) cells.push({ x: ctx.at.x, y })
  } else {
    for (let x = 0; x < ctx.board.width; x++) cells.push({ x, y: ctx.at.y })
  }
  return cells
}

/** Every cell of the 3×3 block centred on the blast, clipped to the board. */
export function blastEffect(ctx: PowerupEffectContext): Pos[] {
  const cells: Pos[] = []
  for (let y = ctx.at.y - 1; y <= ctx.at.y + 1; y++) {
    for (let x = ctx.at.x - 1; x <= ctx.at.x + 1; x++) {
      if (inBounds(ctx.board, { x, y })) cells.push({ x, y })
    }
  }
  return cells
}

/**
 * Every tile of the prism's charged colour, else a random colour present on
 * the board. The charge is one-shot: the swap activator stamps it with the
 * colour of the tile the player swapped the prism with.
 */
export function prismEffect(ctx: PowerupEffectContext): Pos[] {
  const present = new Set<TileType>()
  for (const cell of ctx.board.cells) if (cell.tile) present.add(cell.tile.type)
  const charge = ctx.tile.charge
  const color =
    charge && present.has(charge)
      ? charge
      : present.size > 0
        ? ctx.rng.pick([...present])
        : undefined
  if (!color) return []

  const cells: Pos[] = []
  ctx.board.cells.forEach((cell, index) => {
    if (cell.tile?.type === color) {
      cells.push({ x: index % ctx.board.width, y: Math.floor(index / ctx.board.width) })
    }
  })
  return cells
}

/**
 * The nearest objective tile (registered selector), falling back to the
 * nearest tile at all while no goal system is plugged in. Ties break in
 * row-major order so activations stay reproducible.
 */
export function homingEffect(ctx: PowerupEffectContext): Pos[] {
  const target = findObjectiveTile(ctx.board, ctx.at) ?? nearestTile(ctx.board, ctx.at)
  return target ? [target] : []
}

function nearestTile(board: Board, from: Pos): Pos | null {
  let best: Pos | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      if (x === from.x && y === from.y) continue
      if (!tileAt(board, { x, y })) continue
      const distance = Math.abs(x - from.x) + Math.abs(y - from.y)
      if (distance < bestDistance) {
        best = { x, y }
        bestDistance = distance
      }
    }
  }
  return best
}

/**
 * Swap activation plan: the board is in post-swap state. Two power-ups always
 * combo (both detonate, `combo` event); a prism charges itself with the
 * colour of the plain tile it was swapped with; every other power-up only
 * activates through an actual match.
 */
function swapActivation(board: Board, a: Pos, b: Pos): ActivationPlan | null {
  const tileA = tileAt(board, a)
  const tileB = tileAt(board, b)
  const powerA = tileA?.powerup
  const powerB = tileB?.powerup

  if (tileA && tileB && powerA && powerB) {
    return {
      detonate: [a, b],
      combo: { a: { at: a, powerup: powerA }, b: { at: b, powerup: powerB } },
    }
  }
  if (tileA && tileB && powerB === 'prism' && !powerA) {
    tileB.charge = tileA.type
    return { detonate: [b], activated: { at: b, powerup: 'prism' } }
  }
  if (tileA && tileB && powerA === 'prism' && !powerB) {
    tileA.charge = tileB.type
    return { detonate: [a], activated: { at: a, powerup: 'prism' } }
  }
  return null
}

/** Tap activation: any power-up detonates where it sits; a prism picks fresh. */
function tapActivation(board: Board, at: Pos): ActivationPlan | null {
  const tile = tileAt(board, at)
  if (!tile?.powerup) return null
  if (tile.powerup === 'prism') tile.charge = undefined
  return { detonate: [at], activated: { at, powerup: tile.powerup } }
}

registerPowerupEffect('sweep', sweepEffect)
registerPowerupEffect('blast', blastEffect)
registerPowerupEffect('prism', prismEffect)
registerPowerupEffect('homing', homingEffect)
registerSwapActivator(swapActivation)
registerTapActivator(tapActivation)
