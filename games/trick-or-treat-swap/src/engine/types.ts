/** The six base tile types, matching the art in `ASSETS.md`. */
export const TILE_TYPES = ['pumpkin', 'ghost', 'skull', 'bat', 'candy', 'potion'] as const
export type TileType = (typeof TILE_TYPES)[number]

/**
 * Power-up kinds, each created by a distinct match shape:
 * broom ← match-4, bomb ← L/T match-5, cauldron ← straight match-5,
 * little-ghost ← 2×2 square. Their board effects live in the power-ups ticket
 * and plug in through the registry (`registry.ts`).
 */
export const POWERUPS = ['broom', 'bomb', 'cauldron', 'little-ghost'] as const
export type PowerupKind = (typeof POWERUPS)[number]

export interface Pos {
  x: number
  y: number
}

/** Row/column sweep direction of a match, stored on brooms. */
export type SweepDir = 'h' | 'v'

/**
 * A tile keeps its `type` (its colour for matching) even after it is converted
 * into a power-up, and a unique `id` so the renderer can track it through
 * gravity and refills.
 */
export interface Tile {
  id: number
  type: TileType
  powerup?: PowerupKind
  dir?: SweepDir
  /** Cauldron only: the colour it is charged to clear on its next detonation. */
  charge?: TileType
}

/**
 * Board cell. `modifier` is the extension seam for obstacles (cobweb,
 * gravestone, cursed ice, lock, slime): the behaviour of each modifier id is
 * defined in the registry, so obstacles can be added without touching core.
 */
export interface Cell {
  tile?: Tile
  modifier?: string
}

export interface Board {
  width: number
  height: number
  /** Row-major cells, index = y * width + x. */
  cells: Cell[]
}

export type MatchShape = 'run3' | 'run4' | 'run5' | 'intersection' | 'square'

export type ClearCause = 'match' | 'powerup' | 'obstacle'

export type RejectReason = 'over' | 'bounds' | 'adjacent' | 'locked' | 'no-match' | 'no-powerup'

export interface ClearedCell {
  at: Pos
  tile: Tile
}

export interface SpawnedCell {
  at: Pos
  tile: Tile
}

export interface FallMove {
  from: Pos
  to: Pos
}

/**
 * Turn resolution as an ordered event stream; the renderer and audio animate
 * from this instead of from board diffs. A player swap yields (in order):
 * `swap` → for every cascade pass: [`cascade`] `match` [`convert`] `clear`
 * `fall` `spawn` → then `move` and finally `game-over` / `shuffle` if one
 * applies. Rejected swaps yield a single `reject`. Direct power-up activations
 * (tap, or a swap that activates instead of matching) insert a `power-activate`
 * — or a `combo` for power-up × power-up swaps — right after `swap`/at the
 * start, and their clears arrive as the first resolution pass.
 */
export type GameEvent =
  | { type: 'swap'; a: Pos; b: Pos }
  | { type: 'reject'; a: Pos; b: Pos; reason: RejectReason }
  | { type: 'match'; shape: MatchShape; at: Pos[]; tileType: TileType }
  | { type: 'convert'; at: Pos; tileType: TileType; powerup: PowerupKind; tile: Tile }
  | { type: 'power-activate'; at: Pos; powerup: PowerupKind; via: 'tap' | 'swap' }
  | {
      type: 'combo'
      a: { at: Pos; powerup: PowerupKind }
      b: { at: Pos; powerup: PowerupKind }
    }
  | { type: 'clear'; cause: ClearCause; cells: ClearedCell[] }
  | { type: 'fall'; moves: FallMove[] }
  | { type: 'spawn'; cells: SpawnedCell[] }
  | { type: 'cascade'; depth: number }
  | { type: 'shuffle' }
  | { type: 'move'; used: number; left: number | null }
  | { type: 'game-over'; result: 'win' | 'lose' }
  | {
      type: 'obstacle'
      at: Pos
      /** Modifier id after the change (the destroyed id for 'destroy'). */
      modifier: string
      action: 'damage' | 'destroy' | 'spread'
    }

export interface GameStats {
  movesUsed: number
  cleared: Record<TileType, number>
  powerupsCreated: number
  /** Longest cascade chain (in resolution passes) seen so far. */
  bestCascade: number
}

export function emptyClearedRecord(): Record<TileType, number> {
  // Keep in sync with TILE_TYPES.
  return { pumpkin: 0, ghost: 0, skull: 0, bat: 0, candy: 0, potion: 0 }
}
