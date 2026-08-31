import { loadJSON, saveJSON, trackPointers, unlockAudio } from '@gamiq/shared'
import type { ValidMove } from '../engine/board.ts'
import type { GoalDef, LevelGame } from '../engine/goals.ts'
import { levelStars } from '../engine/goals.ts'
import { areAdjacent, samePos } from '../engine/pos.ts'
import type { GameEvent, Pos, SpawnedCell, TileType } from '../engine/types.ts'
import { LEVELS, levelGame } from '../levels/index.ts'
import { sfx } from './audio.ts'
import { bossArtFor } from './boss-art.ts'
import { BoardView, type FallTween } from './board-view.ts'
import { easeInQuad } from './draw.ts'
import { Fx } from './fx.ts'
import { registerLegacyObstacleAliases, stripTilelessObstacleTiles } from './obstacle-aliases.ts'
import { recordStars } from './progress.ts'
import { registerScreen, type Screen, type ScreenHost } from './screens.ts'
import { modifierSpriteUrl, POWERUP_LABELS, TILE_COLORS, TILE_URLS, loadSprite } from './sprites.ts'
import { boardWorld } from './tutorial/core.ts'
import { TutorialDirector } from './tutorial/director.ts'
import { levelScripts } from './tutorial/scripts.ts'
import { storageTutorialHost } from './tutorial/seen.ts'

/**
 * The play screen: renders the swap-3 board from the engine's event stream,
 * handles touch input (tap-select + tap-neighbour or drag to swap, tap to
 * activate power-ups), and layers juice on top — particles, screen shake,
 * candle glows, synth audio and an idle hint after ~5 s. HUD, pause and
 * win/lose overlays live in a DOM layer above the canvas.
 */

type ClearEvent = Extract<GameEvent, { type: 'clear' }>
type ActivateEvent = Extract<GameEvent, { type: 'power-activate' }>
type ConvertEvent = Extract<GameEvent, { type: 'convert' }>
type MatchEvent = Extract<GameEvent, { type: 'match' }>
type ObstacleEvent = Extract<GameEvent, { type: 'obstacle' }>

/** One slice of the replay timeline; `dur`/tweens are set in `start()`. */
interface Step {
  dur: number
  start?(): void
  update?(t: number): void
  done?(): void
}

const HINT_DELAY = 5

const OBSTACLE_COLORS: Record<string, string> = {
  cobweb: '#d9d2f2',
  gravestone: '#a8adbd',
  ice: '#bfe8ff',
  lock: '#e3b341',
  slime: '#a4d43c',
}

interface Chip {
  chip: HTMLButtonElement
  count: HTMLSpanElement
}

const TILE_LABELS: Record<TileType, string> = {
  pumpkin: 'pumpkins',
  ghost: 'ghosts',
  skull: 'skulls',
  bat: 'bats',
  candy: 'candies',
  potion: 'potions',
}

const MODIFIER_LABELS: Record<string, string> = {
  cobweb: 'cobweb',
  gravestone: 'gravestone',
  ice: 'cursed ice',
  lock: 'lock',
  slime: 'slime',
}

/** Plain-language goal description — shown on chip tap and on first sight. */
function describeGoal(goal: GoalDef): string {
  switch (goal.kind) {
    case 'collect':
      return `Collect ${goal.count} ${TILE_LABELS[goal.color]}: match them or blast them with power-ups.`
    case 'deliver':
      return `Deliver ${goal.count} ${TILE_LABELS[goal.color]}: clear matches on the bottom row so they drop into the basket.`
    case 'clear-modifier': {
      const match = /^([a-z]+)(?:-(\d+))?$/.exec(goal.modifier)
      const root = match?.[1] ?? goal.modifier
      const layers = Number(match?.[2] ?? 1)
      const base = MODIFIER_LABELS[root] ?? root
      const label =
        layers >= 2 ? `${layers === 2 ? 'double' : 'triple'} ${base}s` : `${base}s`
      return `Clear every ${label}: match next to them or hit them with power-ups.`
    }
    case 'boss':
      return `Defeat the boss: land ${goal.hits} hits — matches next to it and power-up blasts hurt it.`
  }
}

const GOAL_HINT_SEEN_KEY = 'trick-or-treat-swap:goal-hint-seen'

/** Goal kinds the player has already been shown a hint for (persistent). */
function loadGoalHintSeen(): Record<string, true> {
  return loadJSON(GOAL_HINT_SEEN_KEY, {})
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  parent?.append(node)
  return node
}

function levelFromParams(params: unknown): number {
  const level =
    typeof params === 'object' && params !== null && 'level' in params ? params.level : undefined
  return typeof level === 'number' && Number.isInteger(level) && level >= 0 ? level : 0
}

export function registerPlayScreen(): void {
  registerLegacyObstacleAliases()
  registerScreen<{ level: number }>(
    'play',
    (host, params) => new PlayScreen(host, levelFromParams(params)),
  )
}

class PlayScreen implements Screen {
  readonly element: HTMLElement
  readonly #host: ScreenHost
  readonly #levelIndex: number
  readonly #bundle: LevelGame
  readonly #view: BoardView
  readonly #fx = new Fx()
  readonly #stopPointers: () => void
  readonly #tutorial: TutorialDirector

  readonly #hud: HTMLElement
  readonly #overlay: HTMLElement
  readonly #goalHint: HTMLElement
  readonly #movesEl: HTMLElement
  readonly #chips: Chip[] = []
  readonly #hasDeliver: boolean
  readonly #boss: { sprite: HTMLImageElement; maxHp: number } | undefined
  readonly #bossArtUrl: string | undefined

  #goalHintTimer = 0
  #hintIndex = -1

  #queue: Step[] = []
  #current: Step | undefined
  #ct = 0
  #selected: Pos | null = null
  #hint: ValidMove | null = null
  #idleTime = 0
  #paused = false
  #overlayOpen = false
  #time = 0
  #drag: { start: { x: number; y: number }; cell: Pos | null; consumed: boolean } | undefined
  #stars: { x: number; y: number; r: number; phase: number; speed: number }[] = []

  constructor(host: ScreenHost, levelIndex: number) {
    this.#host = host
    this.#levelIndex = levelIndex
    this.#bundle = levelGame(levelIndex)
    stripTilelessObstacleTiles(this.#bundle.game.board)
    this.#view = new BoardView(this.#bundle.game.board)
    this.#hasDeliver = this.#bundle.level.goals.some((g) => g.kind === 'deliver')
    if (this.#bundle.level.boss) {
      this.#bossArtUrl = bossArtFor(levelIndex)
      this.#boss = { sprite: loadSprite(this.#bossArtUrl), maxHp: this.#bundle.level.boss.hp }
    }

    const root = el('div', 'tots-root')
    this.element = root
    const hud = this.#buildHud(root)
    this.#hud = hud.hud
    this.#movesEl = hud.movesEl
    this.#goalHint = hud.goalHint
    this.#overlay = el('div', 'tots-overlay', root)
    this.#overlay.hidden = true
    this.#buildBanner(root)
    this.#updateChips()
    this.#showFirstTimeGoalHint()

    this.#stopPointers = trackPointers(host.canvas, {
      down: (p) => this.#onDown(p.x, p.y),
      move: (p) => this.#onMove(p.x, p.y),
      up: () => this.#onUp(),
      cancel: () => {
        this.#drag = undefined
      },
    })

    // Tutorial & teaching flow: scripted overlays driven by the engine's
    // event stream; its DOM layer mounts below the pause/result overlays.
    const game = this.#bundle.game
    this.#tutorial = new TutorialDirector(
      boardWorld(game.board, () => game.stats.movesUsed),
      levelScripts(this.#bundle.level.id),
      storageTutorialHost(),
    )
    this.#tutorial.mount(root, this.#overlay)
  }

  // — Screen lifecycle ————————————————————————————————————————————————————

  update(dt: number): void {
    if (this.#paused) return
    this.#time += dt
    this.#fx.update(dt)
    this.#view.update(dt)
    this.#tutorial.update(dt)
    if (this.#current) {
      this.#advance(dt)
    } else if (this.#queue.length > 0) {
      this.#startNext()
    } else if (!this.#bundle.game.result) {
      this.#idleTime += dt
      if (this.#idleTime >= HINT_DELAY && !this.#hint) {
        this.#hint = this.#bundle.game.findHint()
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.#drawBackdrop(ctx, width, height)
    ctx.save()
    if (this.#fx.shake > 0.1) {
      ctx.translate(
        (Math.random() * 2 - 1) * this.#fx.shake,
        (Math.random() * 2 - 1) * this.#fx.shake,
      )
    }
    this.#view.render(ctx, {
      time: this.#time,
      selected: this.#selected,
      hint: this.#hint,
      deliverRow: this.#hasDeliver,
      boss: this.#boss,
    })
    this.#drawTutorialHighlight(ctx)
    this.#fx.render(ctx)
    this.#fx.renderBoardFlash(ctx, this.#view.area)
    ctx.restore()
  }

  resize(width: number, height: number): void {
    const cs = getComputedStyle(document.documentElement)
    const inset = (name: string) => Number.parseFloat(cs.getPropertyValue(name)) || 0
    const hudBottom = this.#hud.getBoundingClientRect().bottom
    const area = {
      x: inset('--tots-sal') + 8,
      y: hudBottom + 8,
      w: width - inset('--tots-sal') - inset('--tots-sar') - 16,
      h: height - (hudBottom + 8) - inset('--tots-sab') - 8,
    }
    this.#view.layout(area)
    this.#stars = []
    for (let i = 0; i < Math.round((width * height) / 16000); i++) {
      this.#stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 2,
      })
    }
  }

  dispose(): void {
    this.#stopPointers()
    this.#tutorial.dispose()
    window.clearTimeout(this.#goalHintTimer)
  }

  // — Replay sequencer ————————————————————————————————————————————————————

  get #busy(): boolean {
    return this.#current !== undefined || this.#queue.length > 0
  }

  #enqueue(events: readonly GameEvent[]): void {
    this.#tutorial.feed(events)
    let cascadeDepth = 0
    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      if (!e) continue
      switch (e.type) {
        case 'reject':
          this.#queue.push(this.#rejectStep(e.a, e.b))
          break
        case 'swap':
          this.#queue.push(this.#swapStep(e.a, e.b))
          break
        case 'cascade':
          cascadeDepth = e.depth
          this.#queue.push(this.#cascadeStep(e.depth))
          break
        case 'match':
          this.#queue.push(this.#matchStep(e))
          break
        case 'convert':
          this.#queue.push(this.#convertStep(e))
          break
        case 'power-activate':
          this.#queue.push(this.#activateStep(e, nextClear(events, i)))
          break
        case 'combo':
          this.#queue.push(this.#comboStep(e.a.at, e.b.at))
          break
        case 'clear':
          this.#queue.push(this.#clearStep(e, cascadeDepth))
          break
        case 'fall': {
          const next = events[i + 1]
          if (next?.type === 'spawn') {
            this.#queue.push(this.#fallStep(e.moves, next.cells))
            i++
          } else {
            this.#queue.push(this.#fallStep(e.moves, undefined))
          }
          break
        }
        case 'spawn':
          this.#queue.push(this.#fallStep([], e.cells))
          break
        case 'obstacle':
          this.#queue.push(this.#obstacleStep(e))
          break
        case 'shuffle':
          this.#queue.push(this.#shuffleStep())
          break
        case 'move':
          this.#queue.push(this.#moveStep(e.left))
          break
        case 'game-over':
          this.#queue.push(this.#gameOverStep(e.result))
          break
      }
    }
  }

  #startNext(): void {
    const step = this.#queue.shift()
    if (!step) return
    this.#current = step
    this.#ct = 0
    step.start?.()
    step.update?.(0)
  }

  #advance(dt: number): void {
    let current = this.#current
    if (!current) return
    this.#ct += dt
    while (current) {
      if (this.#ct < current.dur) break
      this.#ct -= current.dur
      current.update?.(1)
      current.done?.()
      const next = this.#queue.shift()
      if (!next) {
        current = undefined
        break
      }
      current = next
      current.start?.()
    }
    this.#current = current
    if (!current) {
      this.#onSettled()
      return
    }
    current.update?.(this.#ct / current.dur)
  }

  /** A move finished animating: re-sync with the engine and refresh the HUD. */
  #onSettled(): void {
    this.#view.sync()
    this.#tutorial.settle()
    this.#selected = null
    this.#hint = null
    this.#idleTime = 0
    this.#updateChips()
    if (this.#bundle.game.result === 'win' && !this.#overlayOpen) this.#showResult(true)
    if (this.#bundle.game.result === 'lose' && !this.#overlayOpen) this.#showResult(false)
  }

  // — Steps ———————————————————————————————————————————————————————————————

  #swapStep(a: Pos, b: Pos): Step {
    let tweens: { v: { ox: number; oy: number }; x0: number; y0: number }[] = []
    return {
      dur: 0.16,
      start: () => {
        this.#view.applySwap(a, b)
        tweens = [this.#view.tileVisualAt(a), this.#view.tileVisualAt(b)].flatMap((v) =>
          v ? [{ v, x0: v.ox, y0: v.oy }] : [],
        )
        sfx.swap()
      },
      update: (t) => {
        const e = 1 - (1 - t) * (1 - t)
        for (const tw of tweens) {
          tw.v.ox = tw.x0 * (1 - e)
          tw.v.oy = tw.y0 * (1 - e)
        }
      },
      done: () => {
        for (const tw of tweens) {
          tw.v.ox = 0
          tw.v.oy = 0
        }
      },
    }
  }

  #rejectStep(a: Pos, b: Pos): Step {
    return {
      dur: 0.3,
      start: () => sfx.reject(),
      update: (t) => {
        const wiggle = Math.sin(t * Math.PI * 6) * 5 * (1 - t)
        for (const p of [a, b]) {
          const v = this.#view.tileVisualAt(p)
          if (!v) continue
          const dir = samePos(p, a) ? 1 : -1
          v.ox = wiggle * dir
        }
      },
      done: () => {
        for (const p of [a, b]) {
          const v = this.#view.tileVisualAt(p)
          if (v) {
            v.ox = 0
            v.oy = 0
          }
        }
      },
    }
  }

  #matchStep(e: MatchEvent): Step {
    return {
      dur: 0.08,
      start: () => {
        this.#view.flash(e.at)
        if (e.shape !== 'run3') {
          const cx = e.at.reduce((sum, p) => sum + p.x, 0) / e.at.length
          const cy = e.at.reduce((sum, p) => sum + p.y, 0) / e.at.length
          const c = this.#view.centerOf({ x: Math.round(cx), y: Math.round(cy) })
          this.#fx.burst(c.x, c.y, '#ffd23f', { count: 6, speed: 130, life: 0.4 })
        }
      },
    }
  }

  #convertStep(e: ConvertEvent): Step {
    return {
      dur: 0.2,
      start: () => {
        const c = this.#view.centerOf(e.at)
        this.#fx.burst(c.x, c.y, '#ffd23f', { count: 12, speed: 170, life: 0.5 })
        this.#fx.ring(c.x, c.y, this.#view.cell * 0.9, 'rgb(255 210 63)', 3, 0.35)
        this.#fx.floatText(c.x, c.y - this.#view.cell * 0.7, POWERUP_LABELS[e.powerup], '#ffd23f')
        sfx.convert()
      },
    }
  }

  #activateStep(e: ActivateEvent, clear: ClearEvent | undefined): Step {
    return {
      dur: e.powerup === 'little-ghost' ? 0.34 : 0.16,
      start: () => {
        const c = this.#view.centerOf(e.at)
        if (e.powerup === 'little-ghost') {
          const target = clear?.cells.find((cell) => !samePos(cell.at, e.at))?.at
          if (target) {
            const t1 = this.#view.centerOf(target)
            this.#fx.flight(c.x, c.y, t1.x, t1.y, 0.3)
          }
          sfx.ghost()
        } else if (e.powerup === 'bomb') {
          this.#fx.burst(c.x, c.y, '#ffd23f', { count: 8, speed: 90, gravity: 0, life: 0.3 })
          sfx.fuse()
        } else if (e.powerup === 'broom') {
          this.#fx.burst(c.x, c.y, '#ffe9a3', { count: 6, speed: 90, gravity: 0, life: 0.3 })
          sfx.fuse()
        } else {
          this.#fx.burst(c.x, c.y, '#c9b8ff', { count: 10, speed: 120, gravity: 0, life: 0.35 })
        }
      },
    }
  }

  #comboStep(a: Pos, b: Pos): Step {
    return {
      dur: 0.28,
      start: () => {
        for (const p of [a, b]) {
          const c = this.#view.centerOf(p)
          this.#fx.ring(c.x, c.y, this.#view.cell * 1.6, 'rgb(255 138 42)', 5, 0.4)
          this.#fx.burst(c.x, c.y, '#ff8a2a', { count: 12, speed: 220, life: 0.5 })
        }
        const ca = this.#view.centerOf(a)
        const cb = this.#view.centerOf(b)
        this.#fx.floatText(
          (ca.x + cb.x) / 2,
          (ca.y + cb.y) / 2 - this.#view.cell,
          'COMBO!',
          '#ff8a2a',
        )
        this.#fx.kick(7)
        sfx.combo()
      },
    }
  }

  #clearStep(e: ClearEvent, depth: number): Step {
    return {
      dur: 0.24,
      start: () => {
        const cells = e.cells
        const bomb = cells.find((c) => c.tile.powerup === 'bomb')
        const broom = cells.find((c) => c.tile.powerup === 'broom')
        const cauldron = cells.some((c) => c.tile.powerup === 'cauldron')
        const ghost = cells.find((c) => c.tile.powerup === 'little-ghost')
        if (bomb) {
          const c = this.#view.centerOf(bomb.at)
          this.#fx.ring(c.x, c.y, this.#view.cell * 2.4, 'rgb(255 179 71)', 7, 0.5)
          this.#fx.burst(c.x, c.y, '#ff8a2a', { count: 22, speed: 320, life: 0.7 })
          this.#fx.kick(10)
          sfx.bomb()
        }
        if (broom) {
          const horizontal = broom.tile.dir !== 'v'
          const c = this.#view.centerOf(broom.at)
          const area = this.#view.area
          this.#fx.streak(
            horizontal ? area.x + area.w / 2 : c.x,
            horizontal ? c.y : area.y + area.h / 2,
            horizontal,
            (horizontal ? area.w : area.h) + this.#view.cell,
          )
          this.#fx.kick(3)
          sfx.broom()
        }
        if (cauldron) {
          this.#fx.rainbowFlash()
          sfx.cauldron()
        }
        if (ghost) {
          const c = this.#view.centerOf(ghost.at)
          this.#fx.ring(c.x, c.y, this.#view.cell, 'rgb(255 255 255)', 4, 0.35)
        }
        for (const cell of cells) {
          const c = this.#view.centerOf(cell.at)
          this.#view.beginClear(cell.at)
          this.#fx.burst(c.x, c.y, TILE_COLORS[cell.tile.type], { count: 7, speed: 190 })
        }
        sfx.pop(depth, cells.length)
        if (this.#hasDeliver && cells.some((c) => c.at.y === this.#view.rows - 1)) {
          const bottom = this.#view.centerOf({
            x: Math.floor(this.#view.cols / 2),
            y: this.#view.rows - 1,
          })
          this.#fx.floatText(bottom.x, bottom.y - this.#view.cell * 0.4, 'Delivered!', '#ffd23f')
          sfx.deliver()
        }
        this.#pulseChips()
      },
    }
  }

  /** Gravity + refills tween together so columns land as one motion. */
  #fallStep(moves: { from: Pos; to: Pos }[], spawnCells: SpawnedCell[] | undefined): Step {
    let tweens: FallTween[] = []
    let stepDur = 0.12
    const step: Step = {
      dur: 0.12,
      start: () => {
        tweens = this.#view.applyFalls(moves)
        if (spawnCells) tweens.push(...this.#view.applySpawns(spawnCells))
        stepDur = tweens.reduce((max, t) => Math.max(max, t.dur), 0.12)
        step.dur = stepDur
      },
      update: (t) => {
        const local = t * stepDur
        for (const tw of tweens) {
          const e = easeInQuad(Math.min(1, local / tw.dur))
          tw.v.ox = tw.x0 * (1 - e)
          tw.v.oy = tw.y0 * (1 - e)
        }
      },
      done: () => {
        for (const tw of tweens) {
          tw.v.ox = 0
          tw.v.oy = 0
          tw.v.squash = 1
        }
      },
    }
    return step
  }

  #obstacleStep(e: ObstacleEvent): Step {
    return {
      dur: 0.18,
      start: () => {
        const root = modifierRoot(e.modifier)
        const color = OBSTACLE_COLORS[root] ?? '#c9b8ff'
        const c = this.#view.centerOf(e.at)
        if (e.action === 'destroy') {
          this.#view.updateModifier(e.at, undefined)
          this.#fx.burst(c.x, c.y, color, { count: 14, speed: 230 })
          this.#fx.kick(2)
          if (root === 'slime') sfx.spread()
          else sfx.break()
        } else if (e.action === 'spread') {
          this.#view.updateModifier(e.at, e.modifier)
          this.#fx.burst(c.x, c.y, color, { count: 10, speed: 160 })
          sfx.spread()
        } else {
          this.#view.updateModifier(e.at, e.modifier)
          this.#fx.burst(c.x, c.y, color, { count: 6, speed: 140 })
          sfx.hit()
        }
      },
    }
  }

  #shuffleStep(): Step {
    return {
      dur: 0.45,
      start: () => {
        this.#view.sync()
        const area = this.#view.area
        for (let i = 0; i < 14; i++) {
          this.#fx.burst(
            area.x + Math.random() * area.w,
            area.y + Math.random() * area.h,
            '#c9b8ff',
            { count: 2, speed: 90, life: 0.5 },
          )
        }
        this.#fx.rainbowFlash()
        sfx.shuffle()
      },
    }
  }

  #moveStep(left: number | null): Step {
    return {
      dur: 0.06,
      start: () => {
        this.#movesEl.textContent = left === null ? '∞' : String(left)
        const counter = this.#movesEl.parentElement
        if (counter) {
          counter.classList.remove('tots-pulse')
          void counter.offsetWidth
          counter.classList.add('tots-pulse')
        }
      },
    }
  }

  #cascadeStep(depth: number): Step {
    return {
      dur: 0.3,
      start: () => {
        const area = this.#view.area
        this.#fx.floatText(area.x + area.w / 2, area.y + 14, `Cascade ×${depth}`, '#c9b8ff')
        sfx.cascade(depth)
      },
    }
  }

  #gameOverStep(result: 'win' | 'lose'): Step {
    let waves = 0
    return {
      dur: result === 'win' ? 1.1 : 0.8,
      start: () => {
        if (result === 'win') {
          sfx.win()
          const area = this.#view.area
          this.#fx.confettiBurst(area.x + area.w * 0.25, area.y + 10)
        } else {
          sfx.lose()
        }
      },
      update: (t) => {
        if (result !== 'win') return
        const area = this.#view.area
        const marks = [0.12, 0.35, 0.58]
        while (waves < marks.length) {
          const mark = marks[waves]
          if (mark === undefined || t <= mark) break
          this.#fx.confettiBurst(area.x + area.w * (0.2 + 0.3 * waves), area.y + 10)
          waves++
        }
      },
      done: () => {
        this.#showResult(result === 'win')
      },
    }
  }

  // — Input ———————————————————————————————————————————————————————————————

  #onDown(x: number, y: number): void {
    unlockAudio()
    if (this.#paused || this.#busy || this.#bundle.game.result || this.#drag) return
    this.#drag = { start: { x, y }, cell: this.#view.posAt(x, y), consumed: false }
  }

  #onMove(x: number, y: number): void {
    const drag = this.#drag
    if (!drag || drag.consumed || this.#busy) return
    const dx = x - drag.start.x
    const dy = y - drag.start.y
    if (Math.hypot(dx, dy) < this.#view.cell * 0.35) return
    drag.consumed = true
    const cell = drag.cell
    if (!cell) return
    const target =
      Math.abs(dx) > Math.abs(dy)
        ? { x: cell.x + Math.sign(dx), y: cell.y }
        : { x: cell.x, y: cell.y + Math.sign(dy) }
    this.#trySwap(cell, target)
  }

  #onUp(): void {
    const drag = this.#drag
    this.#drag = undefined
    if (!drag || drag.consumed) return
    this.#tapCell(drag.cell)
  }

  #tapCell(cell: Pos | null): void {
    this.#idleTime = 0
    this.#hint = null
    if (!cell) {
      this.#selected = null
      return
    }
    const tile =
      this.#bundle.game.board.cells[this.#bundle.game.board.width * cell.y + cell.x]?.tile
    if (!this.#selected) {
      if (tile?.powerup) {
        this.#tapPowerup(cell)
        return
      }
      this.#selected = cell
      sfx.select()
      return
    }
    if (samePos(this.#selected, cell)) {
      if (tile?.powerup) {
        this.#tapPowerup(cell)
        return
      }
      this.#selected = null
      return
    }
    if (areAdjacent(this.#selected, cell)) {
      this.#trySwap(this.#selected, cell)
      return
    }
    if (tile?.powerup) {
      this.#tapPowerup(cell)
      return
    }
    this.#selected = cell
    sfx.select()
  }

  #tapPowerup(at: Pos): void {
    this.#selected = null
    this.#idleTime = 0
    this.#enqueue(this.#bundle.game.tryTap(at).events)
  }

  #trySwap(a: Pos, b: Pos): void {
    this.#selected = null
    this.#hint = null
    this.#idleTime = 0
    this.#enqueue(this.#bundle.game.trySwap(a, b).events)
  }

  // — HUD & overlays ——————————————————————————————————————————————————————

  #buildHud(root: HTMLElement): {
    hud: HTMLElement
    movesEl: HTMLElement
    goalHint: HTMLElement
  } {
    const hud = el('div', 'tots-hud', root)
    const top = el('div', 'tots-hud-top', hud)

    const pause = el('button', 'tots-icon-btn', top)
    pause.type = 'button'
    pause.textContent = '❚❚'
    pause.setAttribute('aria-label', 'Pause')
    pause.addEventListener('click', () => {
      unlockAudio()
      this.#showPause()
    })

    const title = el('div', 'tots-title', top)
    const name = el('div', 'tots-level-name', title)
    name.textContent = this.#bundle.level.name
    const moves = el('div', 'tots-moves', title)
    const movesEl = el('span', 'tots-moves-count', moves)
    movesEl.textContent = String(this.#bundle.level.moves)
    moves.append(' moves left')

    el('span', 'tots-icon-spacer', top)

    const goalsRow = el('div', 'tots-goals', hud)
    this.#bundle.level.goals.forEach((goal, index) => {
      this.#chips.push(this.#buildChip(goalsRow, goal, index))
    })
    const goalHint = el('div', 'tots-goal-hint', hud)
    goalHint.hidden = true
    return { hud, movesEl, goalHint }
  }

  #buildChip(row: HTMLElement, goal: GoalDef, index: number): Chip {
    const description = describeGoal(goal)
    const chip = el('button', 'tots-chip', row)
    chip.type = 'button'
    chip.setAttribute('aria-label', description)
    chip.addEventListener('click', () => {
      unlockAudio()
      this.#toggleGoalHint(index)
    })
    if (goal.kind === 'collect' || goal.kind === 'deliver') {
      const img = el('img', 'tots-chip-img', chip)
      img.src = TILE_URLS[goal.color]
      img.alt = goal.color
      img.draggable = false
      if (goal.kind === 'deliver') {
        chip.classList.add('tots-chip-deliver')
        const arrow = el('span', 'tots-chip-emoji', chip)
        arrow.textContent = '⬇'
        arrow.setAttribute('aria-hidden', 'true')
      }
    } else {
      const url =
        goal.kind === 'clear-modifier'
          ? modifierSpriteUrl(goal.modifier)
          : goal.kind === 'boss'
            ? this.#bossArtUrl
            : undefined
      const icon = el('span', 'tots-chip-emoji', chip)
      icon.textContent = url ? '' : '👹'
      if (url) {
        const img = el('img', 'tots-chip-img', chip)
        img.src = url
        img.alt = goal.kind === 'clear-modifier' ? goal.modifier : 'boss'
        img.draggable = false
        icon.remove()
      }
    }
    const count = el('span', 'tots-chip-count', chip)
    count.textContent = '0'
    return { chip, count }
  }

  #updateChips(): void {
    const progress = this.#bundle.tracker.progress
    this.#chips.forEach((chip, i) => {
      const p = progress[i]
      if (!p) return
      chip.count.textContent = `${p.current}/${p.target}`
      chip.chip.classList.toggle('tots-done', p.met)
    })
  }

  #pulseChips(): void {
    for (const { chip } of this.#chips) {
      chip.classList.remove('tots-pulse')
      void chip.offsetWidth
      chip.classList.add('tots-pulse')
    }
  }

  // — Goal hints ———————————————————————————————————————————————————————————

  #toggleGoalHint(index: number): void {
    if (this.#hintIndex === index) this.#hideGoalHint()
    else this.#showGoalHint(index)
  }

  #showGoalHint(index: number): void {
    const goal = this.#bundle.level.goals[index]
    if (!goal) return
    this.#hintIndex = index
    this.#goalHint.textContent = describeGoal(goal)
    this.#goalHint.hidden = false
    for (const [i, { chip }] of this.#chips.entries()) {
      chip.classList.toggle('tots-chip-open', i === index)
    }
    window.clearTimeout(this.#goalHintTimer)
    this.#goalHintTimer = window.setTimeout(() => this.#hideGoalHint(), 6000)
  }

  #hideGoalHint(): void {
    this.#hintIndex = -1
    this.#goalHint.hidden = true
    for (const { chip } of this.#chips) chip.classList.remove('tots-chip-open')
    window.clearTimeout(this.#goalHintTimer)
  }

  /** First level in play order introducing a goal kind explains itself once. */
  #showFirstTimeGoalHint(): void {
    const seen = loadGoalHintSeen()
    const index = this.#bundle.level.goals.findIndex((goal) => seen[goal.kind] !== true)
    if (index === -1) return
    this.#showGoalHint(index)
    seen[this.#bundle.level.goals[index]!.kind] = true
    saveJSON(GOAL_HINT_SEEN_KEY, seen)
  }

  #buildBanner(root: HTMLElement): void {
    const banner = el('div', 'tots-banner', root)
    const strong = el('strong', undefined, banner)
    strong.textContent = `Level ${this.#bundle.level.id}`
    const span = el('span', undefined, banner)
    span.textContent = this.#bundle.level.name
    banner.addEventListener('animationend', () => banner.remove())
  }

  #showPause(): void {
    if (this.#overlayOpen || this.#bundle.game.result) return
    this.#paused = true
    this.#overlayOpen = true
    const panel = this.#openOverlay()
    const title = el('h2', 'tots-panel-title', panel)
    title.textContent = 'Paused'
    const actions = el('div', 'tots-actions', panel)
    this.#addButton(actions, 'Resume', true, () => {
      this.#overlayOpen = false
      this.#overlay.hidden = true
      this.#paused = false
      this.#idleTime = 0
    })
    this.#addButton(actions, 'Restart', false, () => this.#restart())
    this.#addMapButton(actions)
  }

  #showResult(win: boolean): void {
    if (this.#overlayOpen) return
    this.#overlayOpen = true
    this.#tutorial.end()
    const { level, game } = this.#bundle
    const panel = this.#openOverlay()

    const title = el('h2', 'tots-panel-title', panel)
    const subtitle = el('p', 'tots-panel-subtitle', panel)
    const actions = el('div', 'tots-actions', panel)

    if (win) {
      const stars = levelStars(level, game)
      recordStars(level.id, stars)
      title.textContent = 'Door opened!'
      title.classList.add('tots-win')
      const starsRow = el('div', 'tots-stars', panel)
      for (let i = 0; i < 3; i++) {
        const star = el('span', i < stars ? 'on' : undefined, starsRow)
        star.textContent = '★'
        star.style.animationDelay = `${0.15 + i * 0.18}s`
      }
      subtitle.textContent = `${game.movesLeft ?? 0} moves left · Level ${level.id} cleared`
      if (this.#levelIndex + 1 < LEVELS.length) {
        this.#addButton(actions, 'Next door →', true, () =>
          this.#host.navigate('play', { level: this.#levelIndex + 1 }),
        )
      }
      this.#addButton(actions, 'Replay', !this.#hasNextLevel(), () => this.#restart())
    } else {
      title.textContent = 'Out of moves!'
      subtitle.textContent = 'The treats got away… try again!'
      this.#addButton(actions, 'Retry', true, () => this.#restart())
    }
    this.#addMapButton(actions)
  }

  #hasNextLevel(): boolean {
    return this.#levelIndex + 1 < LEVELS.length
  }

  #openOverlay(): HTMLElement {
    // Guard against the overlay having been detached (devtools removal, or a
    // future dispose/reuse ordering slip): a panel mounted into a detached
    // node is invisible and the frozen result looks like a hang.
    if (!this.#overlay.isConnected) this.element.append(this.#overlay)
    this.#overlay.replaceChildren()
    this.#overlay.hidden = false
    return el('div', 'tots-panel', this.#overlay)
  }

  #addButton(parent: HTMLElement, label: string, primary: boolean, onClick: () => void): void {
    const button = el('button', primary ? 'tots-btn tots-primary' : 'tots-btn', parent)
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', () => {
      unlockAudio()
      onClick()
    })
  }

  #addMapButton(parent: HTMLElement): void {
    if (!this.#host.hasScreen('map')) return
    this.#addButton(parent, 'Alley map', false, () => this.#host.navigate('map'))
  }

  #restart(): void {
    this.#host.navigate('play', { level: this.#levelIndex })
  }

  // — Backdrop ————————————————————————————————————————————————————————————

  /** Pulsing gold rings on the cells the tutorial step points at. */
  #drawTutorialHighlight(ctx: CanvasRenderingContext2D): void {
    const cells = this.#tutorial.highlight
    if (cells.length === 0) return
    const alpha = 0.55 + 0.3 * Math.sin(this.#time * 5)
    ctx.lineWidth = 4
    ctx.strokeStyle = `rgb(255 210 63 / ${alpha})`
    for (const p of cells) {
      const c = this.#view.centerOf(p)
      ctx.beginPath()
      ctx.arc(c.x, c.y, this.#view.cell * 0.62, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  #drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#1a1033')
    gradient.addColorStop(0.55, '#120b26')
    gradient.addColorStop(1, '#0b0e14')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Moon haze.
    const moon = ctx.createRadialGradient(
      width * 0.82,
      height * 0.12,
      4,
      width * 0.82,
      height * 0.12,
      Math.min(width, height) * 0.3,
    )
    moon.addColorStop(0, 'rgb(139 124 196 / 0.16)')
    moon.addColorStop(1, 'rgb(139 124 196 / 0)')
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = moon
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    for (const star of this.#stars) {
      const twinkle = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(this.#time * star.speed + star.phase))
      ctx.fillStyle = `rgb(226 220 255 / ${twinkle})`
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** First `clear` event after `from` — the footprint of an activation. */
function nextClear(events: readonly GameEvent[], from: number): ClearEvent | undefined {
  for (let j = from + 1; j < events.length; j++) {
    const e = events[j]
    if (e?.type === 'clear') return e
  }
  return undefined
}

function modifierRoot(id: string): string {
  const m = /^([a-z]+)/.exec(id)
  return m?.[1] ?? id
}
