import type { PowerupKind, TileType } from '@gamiq/swap3/types'

/**
 * The declarative tutorial-step format (ticket GiftGlitch-a5d77f).
 *
 * A tutorial is a list of small scripts; each script is a list of steps, and
 * every step is four declarative fields: **trigger → highlight → text →
 * await**. Content tickets author steps as plain data (see `scripts.ts`,
 * which holds them as typed TS data the compiler checks — parsed JSON of the
 * same shape validates identically through `core.ts`'s runtime checks).
 *
 * ```jsonc
 * {
 *   "id": "level-3-broom-use",
 *   "trigger": { "kind": "powerup-created", "powerup": "broom" },
 *   "title": "A Witch's Broom!",
 *   "text": "Tap it to sweep its whole row or column.",
 *   "highlight": { "kind": "powerup", "powerup": "broom" },
 *   "await": { "kind": "activate", "powerup": "broom" }
 * }
 * ```
 *
 * The tutorial engine (`core.ts`) plays one script at a time: a step shows
 * when its trigger fires (and every earlier step of the script is done) and
 * closes when its await resolves. Steps already in the seen store are
 * skipped, so replays never re-teach what the player has mastered.
 */

/** What a showing step points at on the board. Resolved against live state. */
export type TutorialHighlight =
  | { kind: 'none' }
  /** The two tiles of a valid move (the idle-hint source). */
  | { kind: 'hint' }
  /** Every tile currently carrying that power-up. */
  | { kind: 'powerup'; powerup: PowerupKind }
  /** One distinct cell per power-up, both halves of a combo. */
  | { kind: 'powerups'; a: PowerupKind; b: PowerupKind }
  /** Every cell carrying that obstacle (modifier root, e.g. `cobweb`). */
  | { kind: 'modifier'; root: string }
  /** Every tile of a colour. */
  | { kind: 'color'; color: TileType }

/**
 * When a step shows. Board triggers (`start`, `powerups-present`,
 * `obstacle-seen`) are re-checked continuously; event triggers fire from the
 * engine's event stream. `any-of` ORs several triggers, e.g. teach a combo
 * when the player first *can* (both halves on the board) *or does* swap it.
 */
export type TutorialTrigger =
  | { kind: 'start' }
  | { kind: 'powerup-created'; powerup: PowerupKind }
  | { kind: 'powerups-present'; a: PowerupKind; b: PowerupKind }
  | { kind: 'combo'; a: PowerupKind; b: PowerupKind }
  | { kind: 'obstacle-seen'; root: string }
  | { kind: 'any-of'; of: readonly TutorialTrigger[] }

/**
 * When a showing step closes. `tap` renders a blocking panel ("Got it!");
 * every other kind renders a non-blocking toast that stays until satisfied —
 * so teaching never dead-ends a move in progress.
 */
export type TutorialAwait =
  | { kind: 'tap' }
  | { kind: 'seconds'; seconds: number }
  /** The next resolved accepted move (rejections don't count). */
  | { kind: 'move' }
  /** The next power-up activation, optionally of one kind. */
  | { kind: 'activate'; powerup?: PowerupKind }
  /** The next power-up × power-up swap. */
  | { kind: 'combo-used' }

export interface TutorialStep {
  /** Globally unique; the seen store is keyed by step id. */
  id: string
  trigger: TutorialTrigger
  title?: string
  text: string
  highlight?: TutorialHighlight
  /** Default: `{ kind: 'tap' }`. */
  await?: TutorialAwait
}

export interface TutorialScript {
  /** Globally unique; marks the whole script seen once completed/skipped. */
  id: string
  steps: readonly TutorialStep[]
}
