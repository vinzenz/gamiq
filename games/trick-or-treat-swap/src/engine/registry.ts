import { posKey, samePos } from './pos.ts'
import type { Rng } from './rng.ts'
import type {
  Board,
  Cell,
  ClearCause,
  GameEvent,
  Pos,
  PowerupKind,
  Tile,
  TileType,
} from './types.ts'
import { POWERUPS } from './types.ts'

// Re-exported for the seam types below and for sibling modules that plug in
// through this registry (obstacles, power-ups).
export type { Rng }

/**
 * Extension point for power-up effects (power-ups ticket) and combos. An effect
 * receives the detonating power-up tile and returns the cells it clears; cells
 * that are themselves power-ups chain-detonate through the same registry.
 * Replace a default by registering the same kind again.
 */
export interface PowerupEffectContext {
  board: Board
  /** Cell the power-up occupies when it goes off. */
  at: Pos
  tile: Tile
  /** 'match' when the player's match consumed it, 'chain' when another effect or a direct activation set it off. */
  cause: 'match' | 'chain'
  rng: Rng
}

export type PowerupEffect = (ctx: PowerupEffectContext) => Pos[]

const powerupEffects = new Map<PowerupKind, PowerupEffect>()

export function registerPowerupEffect(kind: PowerupKind, effect: PowerupEffect): void {
  powerupEffects.set(kind, effect)
}

export function getPowerupEffect(kind: PowerupKind): PowerupEffect | undefined {
  return powerupEffects.get(kind)
}

/** Core placeholder: a power-up with no registered behaviour only clears itself. */
const clearSelf: PowerupEffect = (ctx) => [ctx.at]

for (const kind of POWERUPS) registerPowerupEffect(kind, clearSelf)

/**
 * Extension point for obstacles (cobweb, gravestone, cursed ice, lock, slime).
 * A modifier id is attached to cells in level data; these predicates are asked
 * by the core at every relevant decision point, so new obstacles register here
 * without any core changes.
 */
export interface ModifierDef {
  id: string
  /** May the tile in this cell be swapped? Default: yes. */
  swappable?: (cell: Cell) => boolean
  /** Does the tile take part in match detection? Default: yes. */
  matchable?: (cell: Cell) => boolean
  /** Do falling tiles stack on top of this cell instead of passing through? */
  gravityBarrier?: boolean
  /**
   * Called once per resolution pass when a clear reaches this cell: directly
   * (the cell is inside the cleared footprint, `direct: true`) or via a match
   * on an adjacent cell (`direct: false`, `cause: 'match'`). Mutate the cell to
   * apply the damage (peel a layer, crack the ice …) and emit `obstacle`
   * events. Modifiers with an onHit hook soak up direct hits: their cell is
   * kept out of the clear entirely, so the tile underneath survives the pass.
   */
  onHit?: (hit: ObstacleHit, emit: (event: GameEvent) => void) => void
}

const modifiers = new Map<string, ModifierDef>()

export function registerCellModifier(def: ModifierDef): void {
  modifiers.set(def.id, def)
}

export function unregisterCellModifier(id: string): void {
  modifiers.delete(id)
}

export function isSwappable(cell: Cell): boolean {
  if (!cell.tile) return false
  const def = cell.modifier ? modifiers.get(cell.modifier) : undefined
  if (!def) return true
  return def.swappable ? def.swappable(cell) : true
}

export function isMatchable(cell: Cell): boolean {
  if (!cell.tile) return false
  const def = cell.modifier ? modifiers.get(cell.modifier) : undefined
  if (!def) return true
  return def.matchable ? def.matchable(cell) : true
}

export function isGravityBarrier(cell: Cell): boolean {
  if (!cell.modifier) return false
  return modifiers.get(cell.modifier)?.gravityBarrier ?? false
}

/**
 * Plan for a direct power-up activation (tap, or a swap that activates rather
 * than matches). Produced by the activators registered below (see
 * `powerups.ts`); `Swap3Game` turns it into `power-activate`/`combo` events and
 * hands it to `resolveMatches`, which clears the planned cells before matching.
 */
export interface ActivationPlan {
  /** Cells that detonate: cleared first, firing their power-up effects. */
  detonate: readonly Pos[]
  /** The single power-up going off by direct player action. */
  activated?: { at: Pos; powerup: PowerupKind }
  /** Set when two power-ups are swapped into each other. */
  combo?: {
    a: { at: Pos; powerup: PowerupKind }
    b: { at: Pos; powerup: PowerupKind }
  }
}

export type SwapActivator = (board: Board, a: Pos, b: Pos) => ActivationPlan | null
export type TapActivator = (board: Board, at: Pos) => ActivationPlan | null

let swapActivator: SwapActivator | undefined
let tapActivator: TapActivator | undefined

export function registerSwapActivator(activator: SwapActivator | undefined): void {
  swapActivator = activator
}

export function registerTapActivator(activator: TapActivator | undefined): void {
  tapActivator = activator
}

export function planSwapActivation(board: Board, a: Pos, b: Pos): ActivationPlan | null {
  return swapActivator?.(board, a, b) ?? null
}

export function planTapActivation(board: Board, at: Pos): ActivationPlan | null {
  return tapActivator?.(board, at) ?? null
}

/**
 * Where homing effects (little ghost) should hit, e.g. collect-goal colours or
 * obstacles. Registered by the goal system; without one, homing effects fall
 * back to the nearest tile.
 */
export type ObjectiveTileSelector = (board: Board, from: Pos) => Pos | null

let objectiveTileSelector: ObjectiveTileSelector | undefined

export function registerObjectiveTileSelector(selector: ObjectiveTileSelector | undefined): void {
  objectiveTileSelector = selector
}

export function findObjectiveTile(board: Board, from: Pos): Pos | null {
  return objectiveTileSelector?.(board, from) ?? null
}

/** One clear reaching an obstacle cell. */
export interface ObstacleHit {
  board: Board
  /** The obstacle cell. */
  at: Pos
  cell: Cell
  /**
   * True when the hit lands on the obstacle cell itself (inside the clear
   * footprint); false when it comes from a match on an adjacent cell.
   */
  direct: boolean
  cause: ClearCause
  /** Colour and cells of the triggering match, when cause is 'match'. */
  tileType?: TileType
  matchCells?: readonly Pos[]
}

export function getCellModifier(cell: Cell): ModifierDef | undefined {
  return cell.modifier ? modifiers.get(cell.modifier) : undefined
}

/** A position inside the clear footprint plus what put it there. */
export interface ObstacleClearSource {
  at: Pos
  cause: ClearCause
}

/** One match shape that started a resolution pass. */
export interface ObstacleMatchGroup {
  cells: readonly Pos[]
  tileType: TileType
}

function cellAt(board: Board, p: Pos): Cell | undefined {
  if (p.x < 0 || p.y < 0 || p.x >= board.width || p.y >= board.height) return undefined
  return board.cells[p.y * board.width + p.x]
}

const NEIGHBOURS: readonly Pos[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

function matchGroupAt(
  matches: readonly ObstacleMatchGroup[],
  at: Pos,
): ObstacleMatchGroup | undefined {
  return matches.find((group) => group.cells.some((c) => samePos(c, at)))
}

/**
 * Notify obstacle cells about one resolution pass's clears and collect their
 * events. `direct` is the full clear footprint (matches plus power-up
 * expansions); `matches` are the match shapes that started the pass, whose
 * cells double as the adjacency source for match-triggered obstacles
 * (gravestone, cursed ice, lock, slime). Each obstacle cell is notified at
 * most once per pass — direct hits first, then one adjacent match.
 */
export function applyObstacleHits(
  board: Board,
  direct: readonly ObstacleClearSource[],
  matches: readonly ObstacleMatchGroup[],
): GameEvent[] {
  const events: GameEvent[] = []
  const emit = (event: GameEvent) => events.push(event)
  const notified = new Set<string>()

  const notify = (at: Pos, hitDirect: boolean, cause: ClearCause, group?: ObstacleMatchGroup) => {
    const cell = cellAt(board, at)
    if (!cell) return
    const def = cell.modifier ? modifiers.get(cell.modifier) : undefined
    if (!def?.onHit) return
    const key = posKey(at)
    if (notified.has(key)) return
    notified.add(key)
    def.onHit(
      {
        board,
        at,
        cell,
        direct: hitDirect,
        cause,
        tileType: group?.tileType,
        matchCells: group?.cells,
      },
      emit,
    )
  }

  for (const source of direct) {
    notify(source.at, true, source.cause, matchGroupAt(matches, source.at))
  }
  for (const group of matches) {
    for (const cell of group.cells) {
      for (const n of NEIGHBOURS) {
        notify({ x: cell.x + n.x, y: cell.y + n.y }, false, 'match', group)
      }
    }
  }
  return events
}

/**
 * Hooks run after every accepted move has been resolved to rest, before the
 * move event (slime spread …). They may mutate the board and emit events.
 */
export type TurnHook = (board: Board, rng: Rng, emit: (event: GameEvent) => void) => void

const turnHooks: TurnHook[] = []

export function registerTurnHook(hook: TurnHook): void {
  turnHooks.push(hook)
}

export function runTurnHooks(board: Board, rng: Rng, emit: (event: GameEvent) => void): void {
  for (const hook of turnHooks) hook(board, rng, emit)
}
