import type { ValidMove } from './board.ts'
import {
  createBoard,
  findValidMove,
  inBounds,
  requireCell,
  shuffleBoard,
  swapTiles,
  wouldMatchAt,
} from './board.ts'
import { areAdjacent } from './pos.ts'
import { isSwappable, planSwapActivation, planTapActivation, runTurnHooks } from './registry.ts'
import type { MoveResolution } from './resolve.ts'
import { resolveMatches } from './resolve.ts'
import type { Rng } from './rng.ts'
import { createRng } from './rng.ts'
import type { Board, GameEvent, GameStats, Pos, TileType } from './types.ts'
import { emptyClearedRecord, TILE_TYPES } from './types.ts'

export interface EvalSnapshot {
  stats: Readonly<GameStats>
  movesLeft: number | null
}

export interface Swap3Options {
  seed: number
  width?: number
  height?: number
  /** Colour palette to draw from; defaults to all six tile types. */
  colors?: readonly TileType[]
  /** Move limit; null/undefined means the level does not count moves. */
  moves?: number
  /**
   * Pre-built board (level layouts with obstacles). It must be match-free;
   * it is mutated in place, and reshuffled if it has no valid move.
   */
  board?: Board
  /**
   * Win/lose evaluation hook, called after every resolved move. Return
   * 'win'/'lose' to end the game, undefined to defer (default: lose when the
   * move limit is exhausted).
   */
  onEval?: (snapshot: EvalSnapshot) => 'win' | 'lose' | undefined
  /**
   * Seam for power-up/combo activations that resolve without forming a match
   * (e.g. swapping a cauldron with a tile). Return true to let the swap
   * through; the resolution then spends the move even if nothing matches.
   * Activations registered through the registry (`powerups.ts`) are planned
   * first and take precedence; this hook only approves extra swaps.
   */
  canActivateSwap?: (board: Board, a: Pos, b: Pos) => boolean
}

export interface SwapOutcome {
  accepted: boolean
  events: readonly GameEvent[]
}

const DEFAULT_WIDTH = 7
const DEFAULT_HEIGHT = 8

/**
 * Stateful swap-3 game: owns the board, the seeded RNG and the move/goal
 * accounting. Pure logic — no DOM, no timers — so the render/audio layer can
 * drive it at its own pace from the event stream.
 */
export class Swap3Game {
  readonly board: Board
  readonly rng: Rng
  readonly colors: readonly TileType[]
  readonly moveLimit: number | null
  readonly log: GameEvent[] = []
  readonly stats: GameStats
  result: 'win' | 'lose' | null = null

  readonly #onEval?: Swap3Options['onEval']
  readonly #canActivateSwap?: Swap3Options['canActivateSwap']

  constructor(options: Swap3Options) {
    this.colors = options.colors ?? TILE_TYPES
    this.rng = createRng(options.seed)
    this.moveLimit = options.moves ?? null
    this.stats = { movesUsed: 0, cleared: emptyClearedRecord(), powerupsCreated: 0, bestCascade: 0 }
    this.#onEval = options.onEval
    this.#canActivateSwap = options.canActivateSwap
    this.board =
      options.board ??
      createBoard({
        width: options.width ?? DEFAULT_WIDTH,
        height: options.height ?? DEFAULT_HEIGHT,
        rng: this.rng,
        colors: this.colors,
      })
    if (!findValidMove(this.board)) this.#reshuffle()
  }

  get movesLeft(): number | null {
    return this.moveLimit === null ? null : this.moveLimit - this.stats.movesUsed
  }

  /** Any swap that would produce a match — also the idle-hint source. */
  findHint(): ValidMove | null {
    return findValidMove(this.board)
  }

  trySwap(a: Pos, b: Pos): SwapOutcome {
    const start = this.log.length
    const finish = (accepted: boolean): SwapOutcome => ({
      accepted,
      events: this.log.slice(start),
    })
    const reject = (reason: 'over' | 'bounds' | 'adjacent' | 'locked' | 'no-match') => {
      this.#record({ type: 'reject', a, b, reason })
      return finish(false)
    }

    if (this.result) return reject('over')
    if (!inBounds(this.board, a) || !inBounds(this.board, b)) return reject('bounds')
    if (!areAdjacent(a, b)) return reject('adjacent')
    if (!isSwappable(requireCell(this.board, a)) || !isSwappable(requireCell(this.board, b))) {
      return reject('locked')
    }

    swapTiles(this.board, a, b)
    const activation = planSwapActivation(this.board, a, b)
    const approved = activation !== null || (this.#canActivateSwap?.(this.board, a, b) ?? false)
    if (!approved && !wouldMatchAt(this.board, a) && !wouldMatchAt(this.board, b)) {
      swapTiles(this.board, a, b)
      return reject('no-match')
    }

    this.#record({ type: 'swap', a, b })
    if (activation?.combo) {
      this.#record({ type: 'combo', a: activation.combo.a, b: activation.combo.b })
    } else if (activation?.activated) {
      this.#record({
        type: 'power-activate',
        at: activation.activated.at,
        powerup: activation.activated.powerup,
        via: 'swap',
      })
    }
    this.#finishMove(
      resolveMatches(this.board, this.rng, this.colors, [a, b], activation ?? undefined),
    )
    return finish(true)
  }

  /**
   * Activate the power-up occupying `at` (tap). Costs a move like a swap does;
   * rejections are reported as a `reject` event with `b === a`.
   */
  tryTap(at: Pos): SwapOutcome {
    const start = this.log.length
    const finish = (accepted: boolean): SwapOutcome => ({
      accepted,
      events: this.log.slice(start),
    })
    const reject = (reason: 'over' | 'bounds' | 'locked' | 'no-powerup') => {
      this.#record({ type: 'reject', a: at, b: at, reason })
      return finish(false)
    }

    if (this.result) return reject('over')
    if (!inBounds(this.board, at)) return reject('bounds')
    const cell = requireCell(this.board, at)
    if (!cell.tile) return reject('no-powerup')
    if (!isSwappable(cell)) return reject('locked')

    const activation = planTapActivation(this.board, at)
    if (!activation) return reject('no-powerup')

    if (activation.activated) {
      this.#record({
        type: 'power-activate',
        at: activation.activated.at,
        powerup: activation.activated.powerup,
        via: 'tap',
      })
    }
    this.#finishMove(resolveMatches(this.board, this.rng, this.colors, [], activation))
    return finish(true)
  }

  #finishMove(resolution: MoveResolution): void {
    this.log.push(...resolution.events)
    // Obstacle seam: per-move board effects (slime spread) run once the board
    // has settled, still inside the move that triggered them.
    runTurnHooks(this.board, this.rng, (event) => this.#record(event))

    for (const type of TILE_TYPES) this.stats.cleared[type] += resolution.cleared[type]
    this.stats.powerupsCreated += resolution.powerupsCreated
    this.stats.bestCascade = Math.max(this.stats.bestCascade, resolution.cascades)
    this.stats.movesUsed++
    this.#record({ type: 'move', used: this.stats.movesUsed, left: this.movesLeft })

    const verdict = this.#evaluate()
    if (verdict) {
      this.result = verdict
      this.#record({ type: 'game-over', result: verdict })
    } else if (!findValidMove(this.board)) {
      this.#reshuffle()
    }
  }

  #record(event: GameEvent): void {
    this.log.push(event)
  }

  #reshuffle(): void {
    if (!shuffleBoard(this.board, this.rng)) {
      throw new Error('trick-or-treat-swap: board could not be reshuffled into a playable state')
    }
    this.#record({ type: 'shuffle' })
  }

  #evaluate(): 'win' | 'lose' | null {
    const verdict = this.#onEval?.({ stats: this.stats, movesLeft: this.movesLeft })
    if (verdict) return verdict
    if (this.moveLimit !== null && this.stats.movesUsed >= this.moveLimit) return 'lose'
    return null
  }
}
