import type { ValidMove } from '../engine/board.ts'
import type { Board, FallMove, Pos, SpawnedCell, Tile } from '../engine/types.ts'
import { easeInQuad, easeOutQuad, roundRectPath } from './draw.ts'
import { drawSprite, modifierSprite, powerupSprites, TILE_COLORS, tileSprites } from './sprites.ts'

/**
 * Visual mirror of the engine board. The engine resolves a whole move before
 * the renderer sees it, so the play screen replays the event stream against
 * this view: swaps/falls/spawns tween pixel offsets, clears shrink out, and
 * modifiers follow the obstacle events. Tile objects are shared references —
 * conversions (a tile becoming a power-up) show up automatically.
 */

export interface VisualTile {
  tile: Tile
  /** Pixel offset from the tile's board position (tweened to 0). */
  ox: number
  oy: number
  scale: number
  alpha: number
  /** 0..1 landing squash, decays in `update()`. */
  squash: number
}

export interface FallTween {
  v: VisualTile
  x0: number
  y0: number
  dur: number
}

export interface BoardArea {
  x: number
  y: number
  w: number
  h: number
}

export interface BoardRenderOptions {
  time: number
  selected: Pos | null
  hint: ValidMove | null
  deliverRow: boolean
}

interface DyingTile {
  x: number
  y: number
  tile: Tile
  ox: number
  oy: number
  age: number
}

const DYING_DUR = 0.22
const FLASH_DUR = 0.16
/** Modifiers whose sprite replaces the (absent) tile. */
const TILELESS = new Set(['gravestone', 'slime'])
/** Modifiers drawn as an overlay on top of their tile. */
const OVERLAYS = new Set(['cobweb', 'ice', 'lock'])

export class BoardView {
  cell = 48
  originX = 0
  originY = 0

  #board: Board
  #cols: number
  #rows: number
  #tiles: (VisualTile | undefined)[]
  #modifiers: (string | undefined)[]
  #dying: DyingTile[] = []
  #flash: { cells: Pos[]; age: number } | undefined

  constructor(board: Board) {
    this.#board = board
    this.#cols = board.width
    this.#rows = board.height
    this.#tiles = []
    this.#modifiers = []
    this.sync()
  }

  get cols(): number {
    return this.#cols
  }

  get rows(): number {
    return this.#rows
  }

  get area(): BoardArea {
    return {
      x: this.originX,
      y: this.originY,
      w: this.cell * this.#cols,
      h: this.cell * this.#rows,
    }
  }

  /** Rebuild from the real board (level start, reshuffles, drift recovery). */
  sync(): void {
    this.#tiles = this.#board.cells.map((cell) =>
      cell.tile ? { tile: cell.tile, ox: 0, oy: 0, scale: 1, alpha: 1, squash: 0 } : undefined,
    )
    this.#modifiers = this.#board.cells.map((cell) => cell.modifier)
    this.#dying = []
    this.#flash = undefined
  }

  #index(p: Pos): number {
    return p.y * this.#cols + p.x
  }

  centerOf(p: Pos): { x: number; y: number } {
    return {
      x: this.originX + (p.x + 0.5) * this.cell,
      y: this.originY + (p.y + 0.5) * this.cell,
    }
  }

  posAt(px: number, py: number): Pos | null {
    const x = Math.floor((px - this.originX) / this.cell)
    const y = Math.floor((py - this.originY) / this.cell)
    if (x < 0 || y < 0 || x >= this.#cols || y >= this.#rows) return null
    return { x, y }
  }

  tileVisualAt(p: Pos): VisualTile | undefined {
    return this.#tiles[this.#index(p)]
  }

  layout(area: BoardArea): void {
    this.cell = Math.max(
      20,
      Math.min(Math.floor(area.w / this.#cols), Math.floor(area.h / this.#rows), 96),
    )
    this.originX = area.x + (area.w - this.cell * this.#cols) / 2
    this.originY = area.y + (area.h - this.cell * this.#rows) / 2
  }

  /** Swap two visual tiles; their offsets tween back to zero (swap step). */
  applySwap(a: Pos, b: Pos): void {
    const ia = this.#index(a)
    const ib = this.#index(b)
    const va = this.#tiles[ia]
    const vb = this.#tiles[ib]
    this.#tiles[ia] = vb
    this.#tiles[ib] = va
    const dx = (b.x - a.x) * this.cell
    const dy = (b.y - a.y) * this.cell
    if (va) {
      va.ox = -dx
      va.oy = -dy
    }
    if (vb) {
      vb.ox = dx
      vb.oy = dy
    }
  }

  applyFalls(moves: FallMove[]): FallTween[] {
    const tweens: FallTween[] = []
    for (const m of moves) {
      const v = this.#tiles[this.#index(m.from)]
      this.#tiles[this.#index(m.from)] = undefined
      this.#tiles[this.#index(m.to)] = v
      if (!v) continue
      v.ox = (m.from.x - m.to.x) * this.cell
      v.oy = (m.from.y - m.to.y) * this.cell
      const dist = Math.abs(m.from.x - m.to.x) + Math.abs(m.from.y - m.to.y)
      tweens.push({ v, x0: v.ox, y0: v.oy, dur: 0.14 + dist * 0.035 })
    }
    return tweens
  }

  /** New tiles drop in from above the board, stacked per column. */
  applySpawns(cells: SpawnedCell[]): FallTween[] {
    const tweens: FallTween[] = []
    const perColumn = new Map<number, number>()
    for (const c of cells) {
      const k = perColumn.get(c.at.x) ?? 0
      perColumn.set(c.at.x, k + 1)
      const v: VisualTile = {
        tile: c.tile,
        ox: 0,
        oy: -(k + 1) * this.cell * 1.15,
        scale: 1,
        alpha: 1,
        squash: 0,
      }
      this.#tiles[this.#index(c.at)] = v
      tweens.push({ v, x0: 0, y0: v.oy, dur: 0.2 + (k + 1) * 0.05 })
    }
    return tweens
  }

  /** Pop a tile out of the grid into the shrinking-`dying` layer. */
  beginClear(at: Pos): void {
    const v = this.#tiles[this.#index(at)]
    this.#tiles[this.#index(at)] = undefined
    if (v) this.#dying.push({ x: at.x, y: at.y, tile: v.tile, ox: v.ox, oy: v.oy, age: 0 })
  }

  updateModifier(at: Pos, modifier: string | undefined): void {
    this.#modifiers[this.#index(at)] = modifier
  }

  flash(cells: Pos[]): void {
    this.#flash = { cells, age: 0 }
  }

  update(dt: number): void {
    for (const d of this.#dying) d.age += dt
    this.#dying = this.#dying.filter((d) => d.age < DYING_DUR)
    if (this.#flash) {
      this.#flash.age += dt
      if (this.#flash.age >= FLASH_DUR) this.#flash = undefined
    }
    for (const v of this.#tiles) {
      if (v && v.squash > 0) v.squash = Math.max(0, v.squash - dt * 6)
    }
  }

  render(ctx: CanvasRenderingContext2D, opts: BoardRenderOptions): void {
    const { cell, originX, originY } = this
    const w = cell * this.#cols
    const h = cell * this.#rows

    // Panel behind the board.
    roundRectPath(ctx, originX - 7, originY - 7, w + 14, h + 14, 16)
    ctx.fillStyle = 'rgb(22 13 40 / 0.78)'
    ctx.fill()
    ctx.strokeStyle = 'rgb(139 124 196 / 0.45)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.save()
    roundRectPath(ctx, originX, originY, w, h, 10)
    ctx.clip()

    // Cell floors.
    for (let y = 0; y < this.#rows; y++) {
      for (let x = 0; x < this.#cols; x++) {
        const i = y * this.#cols + x
        const modifier = this.#modifiers[i]
        const px = originX + x * cell
        const py = originY + y * cell
        if (modifier === 'void') {
          ctx.fillStyle = 'rgb(9 7 18 / 0.85)'
          ctx.fillRect(px, py, cell, cell)
          continue
        }
        ctx.fillStyle = (x + y) % 2 === 0 ? 'rgb(255 255 255 / 0.075)' : 'rgb(255 255 255 / 0.03)'
        ctx.fillRect(px, py, cell, cell)
        if (modifier === 'boss') {
          const glow = ctx.createRadialGradient(
            px + cell / 2,
            py + cell / 2,
            2,
            px + cell / 2,
            py + cell / 2,
            cell * 0.7,
          )
          const a = 0.16 + 0.1 * Math.sin(opts.time * 3)
          glow.addColorStop(0, `rgba(255, 138, 42, ${a})`)
          glow.addColorStop(1, 'rgba(255, 138, 42, 0)')
          ctx.fillStyle = glow
          ctx.fillRect(px, py, cell, cell)
        }
        if (opts.deliverRow && y === this.#rows - 1) {
          ctx.fillStyle = 'rgb(255 138 42 / 0.1)'
          ctx.fillRect(px, py, cell, cell)
        }
      }
    }

    // Under-modifiers, tiles, overlays — one layering pass per cell.
    for (let y = 0; y < this.#rows; y++) {
      for (let x = 0; x < this.#cols; x++) {
        const i = y * this.#cols + x
        const modifier = this.#modifiers[i]
        const root = modifier ? modifierRoot(modifier) : ''
        const c = this.centerOf({ x, y })
        if (root && TILELESS.has(root)) {
          drawSprite(ctx, modifierSprite(modifier ?? ''), c.x, c.y, cell * 0.94, {
            fallback: '#5a5f70',
          })
        }
        const v = this.#tiles[i]
        if (v) {
          const sprite = v.tile.powerup ? powerupSprites[v.tile.powerup] : tileSprites[v.tile.type]
          drawSprite(ctx, sprite, c.x + v.ox, c.y + v.oy, cell * 0.94 * v.scale, {
            alpha: v.alpha,
            scaleX: 1 + 0.12 * v.squash,
            scaleY: 1 - 0.16 * v.squash,
            fallback: TILE_COLORS[v.tile.type],
          })
        }
        if (root && OVERLAYS.has(root)) {
          drawSprite(ctx, modifierSprite(modifier ?? ''), c.x, c.y, cell * 0.98, { alpha: 0.96 })
        }
      }
    }

    // Match flash.
    if (this.#flash) {
      const t = this.#flash.age / FLASH_DUR
      ctx.fillStyle = `rgb(255 255 255 / ${0.5 * Math.sin(Math.PI * t)})`
      for (const p of this.#flash.cells) {
        roundRectPath(
          ctx,
          originX + p.x * cell + 2,
          originY + p.y * cell + 2,
          cell - 4,
          cell - 4,
          cell * 0.2,
        )
        ctx.fill()
      }
    }

    // Selection ring.
    if (opts.selected) {
      const pulse = Math.sin(opts.time * 6) * 1.5
      roundRectPath(
        ctx,
        originX + opts.selected.x * cell + 3 - pulse,
        originY + opts.selected.y * cell + 3 - pulse,
        cell - 6 + pulse * 2,
        cell - 6 + pulse * 2,
        cell * 0.22,
      )
      ctx.strokeStyle = 'rgb(255 210 63 / 0.35)'
      ctx.lineWidth = 7
      ctx.stroke()
      ctx.strokeStyle = '#ffd23f'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }

    // Idle hint pulses on both tiles of a valid move.
    if (opts.hint) {
      const a = 0.3 + 0.25 * Math.sin(opts.time * 5)
      for (const p of [opts.hint.a, opts.hint.b]) {
        const c = this.centerOf(p)
        ctx.strokeStyle = `rgb(255 255 255 / ${a})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(c.x, c.y, cell * 0.58, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // Shrinking cleared tiles.
    for (const d of this.#dying) {
      const t = easeInQuad(d.age / DYING_DUR)
      const c = this.centerOf({ x: d.x, y: d.y })
      const sprite = d.tile.powerup ? powerupSprites[d.tile.powerup] : tileSprites[d.tile.type]
      drawSprite(ctx, sprite, c.x + d.ox, c.y + d.oy, cell * 0.94 * (1 - t), {
        alpha: 1 - easeOutQuad(t),
      })
    }

    ctx.restore()

    // Candle-glow accents flickering at the panel edges.
    const flicker = 0.06 + 0.03 * (Math.sin(opts.time * 7) * 0.5 + Math.sin(opts.time * 13.7) * 0.5)
    for (const gx of [originX + w * 0.1, originX + w * 0.9]) {
      const gy = originY + h + 2
      const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, cell * 2)
      glow.addColorStop(0, `rgba(255, 166, 77, ${flicker})`)
      glow.addColorStop(1, 'rgba(255, 166, 77, 0)')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = glow
      ctx.fillRect(gx - cell * 2, gy - cell * 2, cell * 4, cell * 4)
      ctx.restore()
    }
  }
}

function modifierRoot(id: string): string {
  const m = /^([a-z]+)/.exec(id)
  return m?.[1] ?? id
}
