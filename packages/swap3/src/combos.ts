/**
 * Power-up × power-up combos: all ten pairwise swaps from the concept matrix
 * (epic 9pbwcw). Swapping two power-ups together detonates them as one
 * combined effect instead of two independent ones:
 *
 * | Swap                  | Result                                                                   |
 * |-----------------------|--------------------------------------------------------------------------|
 * | sweep + sweep         | Cross Sweep — row AND column through the pair                            |
 * | sweep + homing  | blue carries the sweep to the densest row/column and sweeps it          |
 * | sweep + blast          | Triple Sweep — 3 rows + 3 columns around the pair                        |
 * | sweep + prism      | most common colour → launched sweeps                                     |
 * | blue + blue         | three little blues hit three objective tiles                            |
 * | blue + blast          | blue drops the red on the densest 3×3 cluster                       |
 * | blast + blast           | Giant Blast — 5×5 explosion                                              |
 * | blast + prism       | most common colour → chain-detonating red blasts                      |
 * | blue + prism      | most common colour → little blues that home to objective tiles          |
 * | prism + prism   | Night of the Witches — full-board clear, one layer off every obstacle    |
 *
 * Mechanism: the swap activator below replaces the default from
 * `powerups.ts` — imported first, so this registration wins regardless of
 * barrel order. A combo computes its combined footprint up front and returns
 * it as the activation plan's `detonate` list; the two cast tiles are stripped
 * to plain tiles so only the combined footprint (plus any power-up caught
 * inside it, which chains through the registry) goes off. That chaining is
 * what launches the prism family's converted tiles.
 *
 * Animatable events: `game.ts` records the `combo` event (pair + cells) from
 * the plan, the footprint lands as `clear` events (cause 'powerup'), and every
 * obstacle inside it takes exactly one direct hit (`obstacle` events) — so
 * layered obstacles lose one layer, not all of them.
 */
import './powerups.ts'
import { inBounds, tileAt } from './board.ts'
import { posKey } from './pos.ts'
import { type ActivationPlan, findObjectiveTile, registerSwapActivator } from './registry.ts'
import type { Board, Pos, PowerupKind, TileType } from './types.ts'
import { emptyClearedRecord, TILE_TYPES } from './types.ts'

export interface ComboContext {
  board: Board
  /** Post-swap cells of the two swapped power-ups. */
  a: Pos
  b: Pos
}

/** Returns the combined footprint to clear (the cast cells are added by the activator). */
export type ComboEffect = (ctx: ComboContext) => Pos[]

// — Footprint helpers ————————————————————————————————————————————————————————

function rowCells(board: Board, y: number): Pos[] {
  const cells: Pos[] = []
  for (let x = 0; x < board.width; x++) cells.push({ x, y })
  return cells
}

function colCells(board: Board, x: number): Pos[] {
  const cells: Pos[] = []
  for (let y = 0; y < board.height; y++) cells.push({ x, y })
  return cells
}

/** The square of radius `radius` around (cx, cy), clipped to the board. */
function windowCells(board: Board, cx: number, cy: number, radius: number): Pos[] {
  const cells: Pos[] = []
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (inBounds(board, { x, y })) cells.push({ x, y })
    }
  }
  return cells
}

function dedupeCells(cells: readonly Pos[]): Pos[] {
  const seen = new Set<string>()
  const unique: Pos[] = []
  for (const at of cells) {
    const key = posKey(at)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(at)
    }
  }
  return unique
}

function tileCount(board: Board, cells: readonly Pos[]): number {
  let count = 0
  for (const at of cells) if (tileAt(board, at)) count++
  return count
}

function contains(board: Board, cells: readonly Pos[], at: Pos): boolean {
  return inBounds(board, at) && cells.some((c) => c.x === at.x && c.y === at.y)
}

/**
 * The row or column holding the most tiles. Ties prefer the line through
 * `anchor`, then rows over columns, then the lower index.
 */
function densestLine(board: Board, anchor: Pos): Pos[] {
  let best: Pos[] | undefined
  let bestCount = -1
  let bestAnchor = false
  const consider = (cells: Pos[]) => {
    const count = tileCount(board, cells)
    const onAnchor = contains(board, cells, anchor)
    if (count > bestCount || (count === bestCount && onAnchor && !bestAnchor)) {
      best = cells
      bestCount = count
      bestAnchor = onAnchor
    }
  }
  for (let y = 0; y < board.height; y++) consider(rowCells(board, y))
  for (let x = 0; x < board.width; x++) consider(colCells(board, x))
  return best ?? []
}

/**
 * The clipped square of `radius` around the centre holding the most tiles.
 * Ties prefer windows covering the anchor cells (in order), then row-major.
 */
function densestWindow(board: Board, radius: number, anchors: readonly Pos[]): Pos[] {
  let best: Pos[] | undefined
  let bestCount = -1
  let bestAnchorHits = -1
  for (let cy = 0; cy < board.height; cy++) {
    for (let cx = 0; cx < board.width; cx++) {
      const cells = windowCells(board, cx, cy, radius)
      const count = tileCount(board, cells)
      const anchorHits = anchors.filter((at) => contains(board, cells, at)).length
      if (count > bestCount || (count === bestCount && anchorHits > bestAnchorHits)) {
        best = cells
        bestCount = count
        bestAnchorHits = anchorHits
      }
    }
  }
  return best ?? []
}

/** The colour with the most tiles on the board; ties in `TILE_TYPES` order. */
function mostCommonColor(board: Board): TileType | undefined {
  const counts = emptyClearedRecord()
  for (const cell of board.cells) if (cell.tile) counts[cell.tile.type]++
  let best: TileType | undefined
  let bestCount = 0
  for (const type of TILE_TYPES) {
    if (counts[type] > bestCount) {
      best = type
      bestCount = counts[type]
    }
  }
  return best
}

function cellsOfColor(board: Board, color: TileType): Pos[] {
  const cells: Pos[] = []
  board.cells.forEach((cell, index) => {
    if (cell.tile?.type === color) {
      cells.push({ x: index % board.width, y: Math.floor(index / board.width) })
    }
  })
  return cells
}

/**
 * Up to `count` distinct target tiles for homing effects: the registered
 * objective selector asked from each origin first, remaining slots filled
 * with the nearest tiles (distance from the first origin, row-major ties).
 * The origin cells themselves are never targets.
 */
function objectiveTargets(board: Board, origins: readonly Pos[], count: number): Pos[] {
  const picked = new Set(origins.map(posKey))
  const targets: Pos[] = []
  const take = (at: Pos) => {
    const key = posKey(at)
    if (picked.has(key) || !tileAt(board, at)) return
    picked.add(key)
    targets.push(at)
  }
  for (const origin of origins) {
    if (targets.length >= count) break
    const target = findObjectiveTile(board, origin)
    if (target) take(target)
  }
  const origin = origins[0]
  if (targets.length < count && origin) {
    const candidates: { at: Pos; distance: number }[] = []
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const at = { x, y }
        if (picked.has(posKey(at)) || !tileAt(board, at)) continue
        candidates.push({ at, distance: Math.abs(x - origin.x) + Math.abs(y - origin.y) })
      }
    }
    candidates.sort((p, q) => p.distance - q.distance || p.at.y - q.at.y || p.at.x - q.at.x)
    for (const candidate of candidates) {
      if (targets.length >= count) break
      take(candidate.at)
    }
  }
  return targets
}

/** Converts every plain tile of the most common colour into `powerup`. */
function convertMostCommon(board: Board, powerup: PowerupKind): Pos[] {
  const color = mostCommonColor(board)
  if (!color) return []
  const cells: Pos[] = []
  for (const at of cellsOfColor(board, color)) {
    const tile = tileAt(board, at)
    // Tiles that already carry a power-up keep it — the player earned it.
    if (!tile || tile.powerup) continue
    tile.powerup = powerup
    // Launched sweeps alternate their sweep direction for varied coverage.
    if (powerup === 'sweep') tile.dir = cells.length % 2 === 0 ? 'h' : 'v'
    cells.push(at)
  }
  return cells
}

// — The ten combos ———————————————————————————————————————————————————————————

/** Broom + Broom — Cross Sweep: the row AND the column through the pair. */
export function crossSweep(ctx: ComboContext): Pos[] {
  return dedupeCells([...rowCells(ctx.board, ctx.a.y), ...colCells(ctx.board, ctx.a.x)])
}

/** Broom + Ghost — the blue carries the sweep to the densest line and sweeps it. */
export function carriedSweep(ctx: ComboContext): Pos[] {
  return densestLine(ctx.board, ctx.a)
}

/** Broom + Pumpkin — Triple Sweep: three rows + three columns around the pair. */
export function tripleSweep(ctx: ComboContext): Pos[] {
  const cells: Pos[] = []
  for (let y = ctx.a.y - 1; y <= ctx.a.y + 1; y++) {
    if (y >= 0 && y < ctx.board.height) cells.push(...rowCells(ctx.board, y))
  }
  for (let x = ctx.a.x - 1; x <= ctx.a.x + 1; x++) {
    if (x >= 0 && x < ctx.board.width) cells.push(...colCells(ctx.board, x))
  }
  return dedupeCells(cells)
}

/** Broom + Prism — the most common colour is turned into launched sweeps. */
export function sweepLaunch(ctx: ComboContext): Pos[] {
  return convertMostCommon(ctx.board, 'sweep')
}

/** Ghost + Ghost — three little blues hit three objective tiles. */
export function homingTrio(ctx: ComboContext): Pos[] {
  return objectiveTargets(ctx.board, [ctx.a, ctx.b], 3)
}

/** Ghost + Pumpkin — the red is dropped on the densest 3×3 cluster. */
export function redDrop(ctx: ComboContext): Pos[] {
  return densestWindow(ctx.board, 1, [ctx.b, ctx.a])
}

/** Pumpkin + Pumpkin — Giant Blast: a 5×5 explosion around the pair. */
export function giantBlast(ctx: ComboContext): Pos[] {
  return windowCells(ctx.board, ctx.a.x, ctx.a.y, 2)
}

/** Pumpkin + Prism — the most common colour chain-detonates as red blasts. */
export function blastChain(ctx: ComboContext): Pos[] {
  return convertMostCommon(ctx.board, 'blast')
}

/** Ghost + Prism — the most common colour becomes objective-homing little blues. */
export function homingSwarm(ctx: ComboContext): Pos[] {
  return convertMostCommon(ctx.board, 'homing')
}

/** Prism + Prism — Night of the Witches: full-board clear, every obstacle loses one layer. */
export function nightOfWitches(ctx: ComboContext): Pos[] {
  const cells: Pos[] = []
  for (let y = 0; y < ctx.board.height; y++) {
    for (let x = 0; x < ctx.board.width; x++) cells.push({ x, y })
  }
  return cells
}

// — Registration ——————————————————————————————————————————————————————————————

function comboKey(a: PowerupKind, b: PowerupKind): string {
  return a < b ? `${a}+${b}` : `${b}+${a}`
}

const COMBO_EFFECTS = new Map<string, ComboEffect>()

const COMBOS: readonly (readonly [PowerupKind, PowerupKind, ComboEffect])[] = [
  ['sweep', 'sweep', crossSweep],
  ['sweep', 'homing', carriedSweep],
  ['sweep', 'blast', tripleSweep],
  ['sweep', 'prism', sweepLaunch],
  ['homing', 'homing', homingTrio],
  ['homing', 'blast', redDrop],
  ['blast', 'blast', giantBlast],
  ['blast', 'prism', blastChain],
  ['homing', 'prism', homingSwarm],
  ['prism', 'prism', nightOfWitches],
]

for (const [a, b, effect] of COMBOS) COMBO_EFFECTS.set(comboKey(a, b), effect)

/** The combined effect of a power-up pair, regardless of swap order. */
export function getComboEffect(a: PowerupKind, b: PowerupKind): ComboEffect | undefined {
  return COMBO_EFFECTS.get(comboKey(a, b))
}

/**
 * Swap activation with combos: two power-ups swapped together resolve as one
 * combined effect; every other swap keeps the default behaviour from
 * `powerups.ts` (only a prism charges itself with a plain tile's colour).
 */
function swapActivation(board: Board, a: Pos, b: Pos): ActivationPlan | null {
  const tileA = tileAt(board, a)
  const tileB = tileAt(board, b)
  const powerA = tileA?.powerup
  const powerB = tileB?.powerup

  if (tileA && tileB && powerA && powerB) {
    const effect = getComboEffect(powerA, powerB)
    const cells = effect ? effect({ board, a, b }) : []
    // Both power-ups are consumed as the casters: stripped to plain tiles so
    // only the combined footprint (plus chained power-ups) detonates.
    tileA.powerup = undefined
    tileB.powerup = undefined
    return {
      detonate: dedupeCells([a, b, ...cells]),
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

registerSwapActivator(swapActivation)
