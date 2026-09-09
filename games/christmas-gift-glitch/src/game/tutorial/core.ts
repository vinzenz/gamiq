import { findValidMove } from '@gamiq/swap3/board'
import type { Board, GameEvent, Pos, PowerupKind, TileType } from '@gamiq/swap3/types'
import type {
  TutorialAwait,
  TutorialHighlight,
  TutorialScript,
  TutorialStep,
  TutorialTrigger,
} from './types.ts'

/**
 * The tutorial engine (ticket GiftGlitch-a5d77f) — pure state, no DOM, so the
 * teaching flow is unit-testable. It plays the scripts it is given in order:
 * a script's next step shows when its trigger fires and nothing else is
 * showing; the step closes when its await resolves. Dismissed steps and
 * completed/skipped scripts are recorded through the `TutorialHost` seen
 * store, so replays skip what the player has already been taught.
 *
 * The play screen wraps this core in the DOM shell (`director.ts`) and feeds
 * it three moments: `feed()` with every engine event batch, `settle()` when a
 * move finished animating, and `end()` when the game is over.
 */

/** Seen-tutorial persistence seam (storage in `seen.ts`, maps in tests). */
export interface TutorialHost {
  isSeen(id: string): boolean
  markSeen(id: string): void
}

/** What the core needs to know about the live board. */
export interface TutorialWorld {
  powerupCells(powerup: PowerupKind): Pos[]
  modifierCells(root: string): Pos[]
  colorCells(color: TileType): Pos[]
  findHint(): readonly [Pos, Pos] | null
  movesUsed(): number
}

/** Level start waits out the intro banner before the first overlay. */
const START_DELAY = 2.2
/** Event-satisfied steps stay on screen long enough to be readable. */
const MIN_SHOW = 1.2
/** Trigger-history cap; only long-off stale events fall off the back. */
const MAX_KEPT_EVENTS = 512

interface ScriptRun {
  script: TutorialScript
  /** Index of the current step (the next one to show). */
  index: number
  done: boolean
}

/** Cells whose tile carries `powerup`, in row-major order. */
export function powerupCellsOn(board: Board, powerup: PowerupKind): Pos[] {
  const found: Pos[] = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      if (board.cells[y * board.width + x]?.tile?.powerup === powerup) found.push({ x, y })
    }
  }
  return found
}

/** Cells carrying a modifier with the given root (`cover-2` → `cobweb`). */
export function modifierRootCellsOn(board: Board, root: string): Pos[] {
  const found: Pos[] = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const modifier = board.cells[y * board.width + x]?.modifier
      if (modifier && modifierRoot(modifier) === root) found.push({ x, y })
    }
  }
  return found
}

/** Cells whose tile has the given colour. */
export function colorCellsOn(board: Board, color: TileType): Pos[] {
  const found: Pos[] = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      if (board.cells[y * board.width + x]?.tile?.type === color) found.push({ x, y })
    }
  }
  return found
}

function modifierRoot(id: string): string {
  return id.match(/^[a-z]+/)?.[0] ?? id
}

/** World adapter for a real game board; `movesUsed` comes from the engine. */
export function boardWorld(board: Board, movesUsed: () => number): TutorialWorld {
  return {
    powerupCells: (powerup) => powerupCellsOn(board, powerup),
    modifierCells: (root) => modifierRootCellsOn(board, root),
    colorCells: (color) => colorCellsOn(board, color),
    findHint: () => {
      const hint = findValidMove(board)
      return hint ? [hint.a, hint.b] : null
    },
    movesUsed,
  }
}

export interface ActiveTutorialStep {
  scriptId: string
  step: TutorialStep
  /** `true` while the step's await is `tap` (blocking panel with a button). */
  blocking: boolean
}

export class TutorialCore {
  readonly #runs: ScriptRun[]
  readonly #host: TutorialHost
  readonly #world: TutorialWorld

  #active: ScriptRun | undefined
  #showing: TutorialStep | undefined
  #showingAwait: TutorialAwait = { kind: 'tap' }
  /** Recent engine events; triggers match history, awaits only their slice. */
  #events: GameEvent[] = []
  #armIndex = 0
  #age = 0
  #shown = 0
  #remaining: number | undefined
  #armedMoves = 0
  #pendingDismiss = false
  #highlight: Pos[] = []
  #ended = false
  #version = 0

  constructor(scripts: readonly TutorialScript[], host: TutorialHost, world: TutorialWorld) {
    // Already-seen scripts never enter the rotation at all.
    this.#runs = scripts
      .filter((script) => !host.isSeen(script.id))
      .map((script) => ({
        script,
        index: 0,
        done: false,
      }))
    this.#host = host
    this.#world = world
  }

  /** Bumped whenever the visible state changes; UI shells re-render on it. */
  get version(): number {
    return this.#version
  }

  /** The step currently on screen, if any. */
  get current(): ActiveTutorialStep | undefined {
    if (!this.#showing || !this.#active) return undefined
    return {
      scriptId: this.#active.script.id,
      step: this.#showing,
      blocking: this.#showingAwait.kind === 'tap',
    }
  }

  get highlight(): readonly Pos[] {
    return this.#highlight
  }

  /** Feed one move's engine events (call right after enqueueing them). */
  feed(events: readonly GameEvent[]): void {
    if (this.#ended || events.length === 0) return
    this.#events.push(...events)
    if (this.#events.length > MAX_KEPT_EVENTS) {
      const drop = this.#events.length - MAX_KEPT_EVENTS
      this.#events.splice(0, drop)
      this.#armIndex = Math.max(0, this.#armIndex - drop)
    }
    // Awaiting steps satisfied by this very move start their dismissal here:
    // only events since the step appeared count as its evidence.
    const aw = this.#showingAwait
    if (this.#showing && !this.#pendingDismiss) {
      if (aw.kind === 'activate' && this.#eventsHaveActivate(aw)) {
        this.#pendingDismiss = true
      } else if (aw.kind === 'combo-used' && this.#eventsHaveCombo()) {
        this.#pendingDismiss = true
      }
    }
    this.#evaluate()
  }

  /** A move finished animating: closes `move` awaits, re-checks the board. */
  settle(): void {
    if (this.#ended) return
    if (
      this.#showing &&
      this.#showingAwait.kind === 'move' &&
      this.#world.movesUsed() > this.#armedMoves
    ) {
      this.#dismiss()
    }
    this.#evaluate()
  }

  /** Frame tick: countdowns, queue rotation, board-trigger re-checks. */
  update(dt: number): void {
    if (this.#ended) return
    this.#age += dt
    if (this.#showing) {
      this.#shown += dt
      if (this.#remaining !== undefined) {
        this.#remaining -= dt
        if (this.#remaining <= 0) this.#dismiss()
      } else if (this.#pendingDismiss && this.#shown >= MIN_SHOW) {
        this.#dismiss()
      }
    }
    this.#evaluate()
  }

  /** "Got it!" tapped on a blocking panel. */
  continueStep(): void {
    if (this.#ended || !this.#showing || this.#showingAwait.kind !== 'tap') return
    this.#dismiss()
  }

  /** Skip the active script (it is marked seen; queued popups still run). */
  skip(): void {
    if (this.#ended) return
    if (this.#active) {
      this.#host.markSeen(this.#active.script.id)
      this.#active.done = true
      this.#active = undefined
    }
    this.#showing = undefined
    this.#pendingDismiss = false
    this.#highlight = []
    this.#version++
    this.#evaluate()
  }

  /** Game over: close everything; the interrupted step replays next attempt. */
  end(): void {
    if (this.#ended) return
    this.#ended = true
    this.#showing = undefined
    this.#active = undefined
    this.#highlight = []
    this.#version++
  }

  // — Internals ————————————————————————————————————————————————————————————

  #dismiss(): void {
    const active = this.#active
    this.#showing = undefined
    this.#showingAwait = { kind: 'tap' }
    this.#pendingDismiss = false
    this.#remaining = undefined
    this.#highlight = []
    if (active) {
      this.#host.markSeen(active.script.steps[active.index]?.id ?? active.script.id)
      active.index++
      this.#active = undefined
      // Reactivate the same script if it still has unseen steps; it keeps
      // queue priority while it waits for its next trigger.
      if (this.#eligibleIndex(active) >= 0) this.#active = active
      else active.done = true
    }
    this.#version++
    this.#evaluate()
  }

  /** First step from `run.index` that is not individually seen, or -1. */
  #eligibleIndex(run: ScriptRun): number {
    const steps = run.script.steps
    let index = run.index
    while (index < steps.length && this.#host.isSeen(steps[index]?.id ?? '')) index++
    if (index >= steps.length) {
      // Every step taught: remember at script level so future plays skip fast.
      this.#host.markSeen(run.script.id)
      run.done = true
      if (run === this.#active) this.#active = undefined
      return -1
    }
    run.index = index
    return index
  }

  #evaluate(): void {
    if (this.#ended || this.#showing) return
    // Nothing shows during the intro banner (event history keeps triggers
    // alive, so anything that fired meanwhile shows right after it).
    if (this.#age < START_DELAY) return
    // The active script keeps priority: show its next step as soon as the
    // trigger fires; while it merely waits, later scripts may step in —
    // list order decides which, and an earlier script wins the moment its
    // own trigger is (still or again) met.
    if (this.#active) {
      const index = this.#eligibleIndex(this.#active)
      const step = index >= 0 ? this.#active.script.steps[index] : undefined
      if (step && this.#triggerMet(step.trigger)) {
        this.#show(step)
        return
      }
    }
    for (const run of this.#runs) {
      if (run.done || run === this.#active) continue
      const index = this.#eligibleIndex(run)
      const step = index >= 0 ? run.script.steps[index] : undefined
      if (step && this.#triggerMet(step.trigger)) {
        this.#active = run
        this.#show(step)
        return
      }
    }
  }

  #show(step: TutorialStep): void {
    const aw = step.await ?? { kind: 'tap' }
    this.#showing = step
    this.#showingAwait = aw
    this.#shown = 0
    this.#pendingDismiss = false
    this.#remaining = aw.kind === 'seconds' ? aw.seconds : undefined
    this.#armedMoves = this.#world.movesUsed()
    this.#armIndex = this.#events.length
    this.#highlight = this.#resolveHighlight(step.highlight)
    this.#version++
  }

  #resolveHighlight(highlight: TutorialHighlight | undefined): Pos[] {
    if (!highlight || highlight.kind === 'none') return []
    switch (highlight.kind) {
      case 'hint':
        return [...(this.#world.findHint() ?? [])]
      case 'powerup':
        return this.#world.powerupCells(highlight.powerup)
      case 'powerups': {
        const a = this.#world.powerupCells(highlight.a)
        const b = this.#world.powerupCells(highlight.b)
        if (highlight.a === highlight.b) return a.slice(0, 2)
        return [a[0], b[0]].filter((p) => p !== undefined)
      }
      case 'modifier':
        return this.#world.modifierCells(highlight.root)
      case 'color':
        return this.#world.colorCells(highlight.color)
    }
  }

  #triggerMet(trigger: TutorialTrigger): boolean {
    switch (trigger.kind) {
      case 'start':
        return true
      case 'powerup-created':
        return this.#events.some((e) => e.type === 'convert' && e.powerup === trigger.powerup)
      case 'powerups-present': {
        const a = this.#world.powerupCells(trigger.a)
        return trigger.a === trigger.b
          ? a.length >= 2
          : a.length > 0 && this.#world.powerupCells(trigger.b).length > 0
      }
      case 'combo':
        return this.#events.some((e) => e.type === 'combo' && pairMatches(e, trigger))
      case 'obstacle-seen':
        return (
          this.#world.modifierCells(trigger.root).length > 0 ||
          this.#events.some(
            (e) => e.type === 'obstacle' && modifierRoot(e.modifier) === trigger.root,
          )
        )
      case 'any-of':
        return trigger.of.some((child) => this.#triggerMet(child))
    }
  }

  #eventsHaveActivate(aw: Extract<TutorialAwait, { kind: 'activate' }>): boolean {
    return this.#sinceArm().some(
      (e) => e.type === 'power-activate' && (aw.powerup === undefined || e.powerup === aw.powerup),
    )
  }

  #eventsHaveCombo(): boolean {
    return this.#sinceArm().some((e) => e.type === 'combo')
  }

  /** Events fed since the showing step appeared — its await's evidence. */
  #sinceArm(): readonly GameEvent[] {
    return this.#events.slice(Math.min(this.#armIndex, this.#events.length))
  }
}

/** Combos are unordered: broom×ghost is the same swap as ghost×broom. */
function pairMatches(
  event: Extract<GameEvent, { type: 'combo' }>,
  trigger: Extract<TutorialTrigger, { kind: 'combo' }>,
): boolean {
  const { a, b } = trigger
  const { a: ea, b: eb } = event
  return (ea.powerup === a && eb.powerup === b) || (ea.powerup === b && eb.powerup === a)
}
