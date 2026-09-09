import { loadJSON, saveJSON, trackPointers, unlockAudio } from '@gamiq/shared'
import alleyCh1Url from '../../assets/meta/alley-ch1.webp'
import alleyCh2Url from '../../assets/meta/alley-ch2.webp'
import alleyCh3Url from '../../assets/meta/alley-ch3.webp'
import alleyCh4Url from '../../assets/meta/alley-ch4.webp'
import alleyCh5Url from '../../assets/meta/alley-ch5.webp'
import alleyCh6Url from '../../assets/meta/alley-ch6.webp'
import houseClosedUrl from '../../assets/meta/house-cottage-closed.webp'
import houseOpenUrl from '../../assets/meta/house-cottage-open.webp'
import playerGhostUrl from '../../assets/meta/player-ghost.webp'
import roadUrl from '../../assets/meta/road-cobblestone.webp'
import { sfx } from '../game/audio.ts'
import { roundRectPath } from '../game/draw.ts'
import { Fx } from '../game/fx.ts'
import { loadStars } from '../game/progress.ts'
import { registerScreen, type Screen, type ScreenHost } from '../game/screens.ts'
import { tileSprites } from '../game/sprites.ts'
import { LEVELS } from '../levels/index.ts'
import {
  CHAPTERS,
  type ChapterTheme,
  chapterOf,
  chapterSpans,
  type DoorNode,
  layoutDoors,
} from './chapters.ts'
import {
  earnedStars,
  normalizeMapState,
  pendingCelebration,
  totalStars,
  unlockedIndex,
} from './progress.ts'

/**
 * The alley map (ticket ToTS-ra73yg): one scrolling strip of door nodes on
 * both sides of a walking path, lampposts and drifting fog, split into themed
 * chapter segments with a boss house at every chapter's end. The kid avatar
 * always stands at the next unplayed door — reloads never replay a walk; when
 * the previous session ended with fresh progress, the door swings open with a
 * candy burst once, right where he stands.
 */

const DOOR_OPEN_DUR = 0.5
const CANDY_COUNT = 9

interface Candy {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  age: number
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

function frac(n: number): number {
  return n - Math.floor(n)
}

type Point = { x: number; y: number }

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function loadImage(src: string): HTMLImageElement {
  const img = new Image()
  img.src = src
  return img
}

function traceSmoothLine(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  if (points.length < 2) return
  const n = points.length
  const first = points[0]
  if (!first) return
  ctx.moveTo(first.x, first.y)
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, n - 1)]
    if (!p0 || !p1 || !p2 || !p3) continue
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }
}

function themeFor(chapter: number): ChapterTheme {
  const theme = CHAPTERS[Math.max(0, Math.min(chapter, CHAPTERS.length - 1))]
  if (!theme) throw new Error('no chapter themes defined')
  return theme
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

const STYLE_ID = 'tots-map-style'
const ROAD_ANCHOR = 46
const CHAPTER_STRIP_URLS = [
  alleyCh1Url,
  alleyCh2Url,
  alleyCh3Url,
  alleyCh4Url,
  alleyCh5Url,
  alleyCh6Url,
]
const CHAPTER_STRIP_IMAGES = CHAPTER_STRIP_URLS.map(loadImage)
const HOUSE_CLOSED = loadImage(houseClosedUrl)
const HOUSE_OPEN = loadImage(houseOpenUrl)
const PLAYER_GHOST = loadImage(playerGhostUrl)
const ROAD_TEXTURE = loadImage(roadUrl)
const ROAD_EDGE_COLOR = 'rgb(34 24 55 / 0.55)'
const ROAD_SHADE_COLOR = 'rgb(20 12 32 / 0.45)'
const ROAD_SKY_COLOR = 'rgb(255 238 220 / 0.08)'

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = el('style')
  style.id = STYLE_ID
  style.textContent = `
.tots-map-root{position:absolute;inset:0;pointer-events:none}
.tots-map-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(var(--tots-sat) + 10px) calc(var(--tots-sar) + 62px) 0 calc(var(--tots-sal) + 10px)}
.tots-map-chapter{font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:rgb(139 124 196 / .95);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tots-map-stars{font-size:13px;font-weight:700;color:#ffd23f;border:1px solid rgb(139 124 196 / .45);border-radius:999px;background:rgb(22 13 40 / .8);padding:5px 12px;white-space:nowrap}
.tots-map-continue{position:absolute;left:50%;bottom:calc(var(--tots-sab) + 14px);transform:translateX(-50%);pointer-events:auto;border:1px solid rgb(255 138 42 / .7);border-radius:14px;background:linear-gradient(180deg,#ff8a2a,#e06a10);color:#241543;font-size:16px;font-weight:700;padding:13px 22px;cursor:pointer;box-shadow:0 8px 24px rgb(0 0 0 / .45);animation:tots-map-bob 2.2s ease-in-out infinite}
.tots-map-continue:active{background:linear-gradient(180deg,#ff9c4d,#ff8a2a)}
@media (min-width: 768px){
  .tots-map-top{padding:calc(var(--tots-sat) + 12px) calc(var(--tots-sar) + 72px) 0 calc(var(--tots-sal) + 14px)}
  .tots-map-chapter{font-size:15px}
  .tots-map-stars{font-size:14px}
  .tots-map-continue{font-size:17px;padding:14px 24px}
}
@keyframes tots-map-bob{50%{transform:translateX(-50%) translateY(-3px)}}`
  document.head.append(style)
}

const MAP_KEY = 'trick-or-treat-swap:map'

function loadMapState(): { celebrated: number } {
  return normalizeMapState(loadJSON<unknown>(MAP_KEY, null)) ?? { celebrated: 0 }
}

export function registerMetaScreens(): void {
  ensureStyle()
  registerScreen('map', (host) => new AlleyMapScreen(host))
}

class AlleyMapScreen implements Screen {
  readonly element: HTMLElement
  readonly #host: ScreenHost
  readonly #stripCache = new Map<number, HTMLCanvasElement>()
  #width = 0
  #height = 0
  #nodes: DoorNode[] = []
  #contentHeight = 0
  #camera = 0
  #follow = true
  #time = 0

  readonly #stars: Record<string, number>
  #unlocked: number
  #avatarAt: number
  /** Seconds since the celebration (or mount); ≤ -1 = not yet played. */
  #arrival = -1
  #celebratePending = false
  #candy: Candy[] = []
  #shakes = new Map<number, number>()
  readonly #fx = new Fx()

  readonly #chapterLabel: HTMLElement
  readonly #continueButton: HTMLButtonElement
  readonly #stopPointers: () => void
  #drag: { x0: number; y0: number; moved: boolean; camera0: number } | undefined
  readonly #onWheel = (event: WheelEvent): void => {
    if (event.ctrlKey) return
    event.preventDefault()
    const unit =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? Math.max(1, this.#height)
          : 1
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
    this.#follow = false
    this.#camera = this.#clampCamera(this.#camera + delta * unit)
  }

  constructor(host: ScreenHost) {
    this.#host = host
    ensureStyle()
    this.#stars = loadStars()
    this.#unlocked = unlockedIndex(this.#stars)
    const mapState = loadMapState()
    this.#avatarAt = this.#unlocked
    // Claim the celebration up front so a reload mid-flourish never replays it.
    this.#celebratePending =
      pendingCelebration(mapState, this.#unlocked, LEVELS.length) !== undefined
    this.#arrival = this.#celebratePending ? -1 : 9999
    if (this.#celebratePending) saveJSON(MAP_KEY, { celebrated: this.#unlocked })

    const root = el('div', 'tots-map-root')
    this.element = root
    const top = el('div', 'tots-map-top', root)
    this.#chapterLabel = el('div', 'tots-map-chapter', top)
    el('div', 'tots-map-stars', top).textContent =
      `★ ${totalStars(this.#stars)}/${LEVELS.length * 3}`
    this.#continueButton = el('button', 'tots-map-continue', root)
    this.#continueButton.type = 'button'
    this.#continueButton.addEventListener('click', () => {
      unlockAudio()
      sfx.select()
      this.#host.navigate('play', { level: this.#unlocked })
    })
    this.#refreshHud()

    host.canvas.addEventListener('wheel', this.#onWheel, { passive: false })

    this.#stopPointers = trackPointers(host.canvas, {
      down: (p) => {
        unlockAudio()
        this.#drag = { x0: p.x, y0: p.y, moved: false, camera0: this.#camera }
      },
      move: (p) => {
        const drag = this.#drag
        if (!drag) return
        const dx = p.x - drag.x0
        const dy = p.y - drag.y0
        if (!drag.moved && Math.hypot(dx, dy) > 10) drag.moved = true
        if (drag.moved) {
          this.#follow = false
          this.#camera = this.#clampCamera(drag.camera0 - dy)
        }
      },
      up: (p) => {
        const drag = this.#drag
        this.#drag = undefined
        if (drag && !drag.moved) this.#tap(p.x, p.y)
      },
      cancel: () => {
        this.#drag = undefined
      },
    })
  }

  // — Screen lifecycle ————————————————————————————————————————————————————

  update(dt: number): void {
    this.#time += dt
    this.#fx.update(dt)
    for (const [index, left] of this.#shakes) {
      const next = left - dt
      if (next <= 0) this.#shakes.delete(index)
      else this.#shakes.set(index, next)
    }
    this.#updateCandy(dt)

    if (this.#arrival >= 0) this.#arrival += dt

    if (this.#follow) {
      const p = this.#avatarPos()
      const target = this.#clampCamera(p.y - this.#height * 0.58)
      this.#camera += (target - this.#camera) * Math.min(1, dt * 5)
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.#drawSky(ctx, width, height)
    ctx.save()
    ctx.translate(0, -this.#camera)
    if (this.#fx.shake > 0.1) {
      ctx.translate(
        (Math.random() * 2 - 1) * this.#fx.shake,
        (Math.random() * 2 - 1) * this.#fx.shake,
      )
    }
    this.#drawBands(ctx, width)
    this.#drawPath(ctx)
    this.#drawSigns(ctx, width)
    this.#drawLampposts(ctx)
    for (const node of this.#nodes) this.#drawHouse(ctx, node)
    this.#drawAvatar(ctx)
    this.#drawCandy(ctx)
    this.#drawFog(ctx, width)
    this.#fx.render(ctx)
    ctx.restore()
    this.#drawVignette(ctx, width, height)
  }

  resize(width: number, height: number): void {
    const firstLayout = this.#width === 0
    this.#width = width
    this.#height = height
    const { nodes, contentHeight } = layoutDoors(width, LEVELS.length)
    this.#nodes = nodes
    this.#contentHeight = contentHeight
    this.#camera = firstLayout
      ? this.#clampCamera(this.#avatarPos().y - height * 0.58)
      : this.#clampCamera(this.#camera)
    if (firstLayout && this.#celebratePending) this.#celebrate()
  }

  dispose(): void {
    this.#host.canvas.removeEventListener('wheel', this.#onWheel)
    this.#stopPointers()
  }

  // — Arrival celebration —————————————————————————————————————————————————

  /** Door-open + candy moment at the freshly unlocked door; no walking. */
  #celebrate(): void {
    this.#celebratePending = false
    const node = this.#nodes[this.#unlocked]
    if (!node) return
    this.#arrival = 0
    sfx.convert()
    const y = node.y - (node.boss ? 92 : 78)
    this.#fx.burst(node.x, y, '#ffd23f', { count: 16, speed: 210, life: 0.6 })
    this.#fx.ring(node.x, y, 46, 'rgb(255 210 63)', 4, 0.5)
    this.#fx.floatText(node.x, y - 34, '+🍬', '#ff7ac2')
    for (let i = 0; i < CANDY_COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
      const speed = 150 + Math.random() * 170
      this.#candy.push({
        x: node.x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 9,
        age: 0,
      })
    }
    this.#refreshHud()
  }

  #avatarPos(): { x: number; y: number } {
    const at = this.#nodes[this.#avatarAt]
    return at ? { x: at.x, y: at.y } : { x: 0, y: 0 }
  }

  /** 0 = closed … 1 = open, for the current door's swing-in animation. */
  #doorOpen(index: number): number {
    if (index !== this.#unlocked) return 0
    if (this.#arrival < 0) return 0
    return clamp01(this.#arrival / DOOR_OPEN_DUR)
  }

  // — Input ———————————————————————————————————————————————————————————————

  #clampCamera(y: number): number {
    return Math.max(0, Math.min(y, this.#contentHeight - this.#height))
  }

  #tap(x: number, y: number): void {
    const wy = y + this.#camera
    for (const node of this.#nodes) {
      const size = node.boss ? 150 : 120
      const bottom = node.y - (node.boss ? 58 : 46) + 12
      const onHouse = Math.abs(node.x - x) <= size / 2 && wy >= bottom - size && wy <= bottom
      const onPath = Math.hypot(node.x - x, node.y - 10 - wy) <= 36
      if (!onHouse && !onPath) continue
      if (node.index <= this.#unlocked) {
        sfx.select()
        this.#host.navigate('play', { level: node.index })
      } else {
        this.#shakes.set(node.index, 0.45)
        sfx.reject()
      }
      return
    }
  }

  // — HUD ——————————————————————————————————————————————————————————————————

  #refreshHud(): void {
    const theme = themeFor(chapterOf(this.#avatarAt))
    this.#chapterLabel.textContent = `Chapter ${CHAPTERS.indexOf(theme) + 1} · ${theme.name}`
    const current = LEVELS[this.#unlocked]
    const done =
      this.#unlocked === LEVELS.length - 1 &&
      current !== undefined &&
      earnedStars(current, this.#stars) > 0
    const doorId = LEVELS[this.#unlocked]?.id ?? this.#unlocked + 1
    this.#continueButton.textContent = done
      ? `🍬 Replay door ${doorId}`
      : `👻 Knock on door ${doorId}`
  }

  #updateCandy(dt: number): void {
    this.#candy = this.#candy.filter((c) => c.age < 1.6)
    for (const c of this.#candy) {
      c.age += dt
      c.vy += 620 * dt
      c.x += c.vx * dt
      c.y += c.vy * dt
      c.rot += c.vr * dt
    }
  }

  // — Drawing: backdrop ————————————————————————————————————————————————————

  #drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#150c2b')
    gradient.addColorStop(1, '#0b0e14')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    for (let i = 0; i < 42; i++) {
      const x = frac(Math.sin(i * 127.1) * 43758.5) * width
      const y = frac(Math.sin(i * 311.7) * 12543.2) * height
      const twinkle = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(this.#time * (0.6 + (i % 5) * 0.3) + i))
      ctx.fillStyle = `rgb(226 220 255 / ${twinkle})`
      ctx.beginPath()
      ctx.arc(x, y, 0.8 + (i % 3) * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  /** Themed backdrop band per chapter segment, with generated strip art first. */
  #drawBands(ctx: CanvasRenderingContext2D, width: number): void {
    for (const span of chapterSpans(LEVELS.length)) {
      const slice = this.#nodes.slice(span.first, span.last + 1)
      const first = slice[0]
      const last = slice[slice.length - 1]
      if (!first || !last) continue
      const next = this.#nodes[span.last + 1]
      const previous = this.#nodes[span.first - 1]
      const top = next ? (last.y + next.y) / 2 - 100 : last.y - 240
      const bottom = previous ? (first.y + previous.y) / 2 + 100 : first.y + 240
      const theme = themeFor(span.chapter)
      const strip = CHAPTER_STRIP_IMAGES[Math.min(span.chapter, CHAPTER_STRIP_IMAGES.length - 1)]
      const hasStrip = strip?.complete === true && strip.naturalWidth > 0

      if (strip && hasStrip) {
        this.#drawStrip(ctx, strip, top, bottom, width, span.chapter)
      } else {
        const gradient = ctx.createLinearGradient(0, top, 0, bottom)
        gradient.addColorStop(0, theme.groundTop)
        gradient.addColorStop(1, theme.groundBottom)
        ctx.fillStyle = gradient
        ctx.fillRect(-6, top, width + 12, bottom - top)
        this.#drawProps(ctx, theme, span.first, top, bottom, width)
      }
    }
  }

  #drawProps(
    ctx: CanvasRenderingContext2D,
    theme: ChapterTheme,
    seed: number,
    top: number,
    bottom: number,
    width: number,
  ): void {
    ctx.fillStyle = 'rgb(8 6 16 / 0.5)'
    ctx.strokeStyle = 'rgb(8 6 16 / 0.5)'
    for (let k = 0; k < 4; k++) {
      const x = frac(Math.sin((seed + k) * 91.7) * 3758.5) * width
      const y = top + (bottom - top) * (0.22 + 0.56 * frac(Math.sin((seed + k) * 47.3) * 9758.5))
      switch (theme.props) {
        case 'houses': {
          const w = 30 + (k % 2) * 14
          const h = 22 + (k % 3) * 8
          ctx.fillRect(x - w / 2, y - h, w, h)
          ctx.beginPath()
          ctx.moveTo(x - w / 2 - 4, y - h)
          ctx.lineTo(x, y - h - 12)
          ctx.lineTo(x + w / 2 + 4, y - h)
          ctx.fill()
          break
        }
        case 'graves':
          roundRectPath(ctx, x - 7, y - 16, 14, 16, 7)
          ctx.fill()
          break
        case 'trees':
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x, y - 26)
          ctx.moveTo(x, y - 14)
          ctx.lineTo(x - 9, y - 26)
          ctx.moveTo(x, y - 19)
          ctx.lineTo(x + 9, y - 30)
          ctx.stroke()
          break
        case 'pumpkins':
          ctx.beginPath()
          ctx.ellipse(x, y - 7, 10, 7, 0, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'hill':
          if (k === 0) {
            ctx.beginPath()
            ctx.ellipse(width / 2, bottom, width * 0.75, (bottom - top) * 0.5, 0, Math.PI, 0)
            ctx.fill()
          } else {
            ctx.fillRect(x - 1.5, y - 18, 3, 18)
            ctx.fillRect(x - 6, y - 13, 12, 3)
          }
          break
        case 'castle': {
          const w = 26 + (k % 2) * 16
          const h = 34 + (k % 3) * 14
          ctx.fillRect(x - w / 2, y - h, w, h)
          for (let b = 0; b < 3; b++) ctx.fillRect(x - w / 2 + b * (w / 2.5), y - h - 6, 5, 6)
          break
        }
      }
    }
  }

  #drawStrip(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    top: number,
    bottom: number,
    width: number,
    chapter: number,
  ): void {
    const height = Math.ceil(bottom - top)
    const pixelWidth = Math.ceil(width)
    let layer = this.#stripCache.get(chapter)
    if (!layer || layer.width !== pixelWidth || layer.height !== height) {
      layer = document.createElement('canvas')
      layer.width = pixelWidth
      layer.height = height
      const paint = layer.getContext('2d')
      if (!paint) return
      paint.imageSmoothingEnabled = true
      paint.imageSmoothingQuality = 'high'
      // One scene per chapter. Repeating the strip creates visible horizon seams.
      paint.drawImage(image, 0, 0, pixelWidth, height)
      if (chapter > 0) {
        paint.globalCompositeOperation = 'destination-in'
        const fade = paint.createLinearGradient(0, height - 200, 0, height)
        fade.addColorStop(0, '#fff')
        fade.addColorStop(1, 'rgb(255 255 255 / 0)')
        paint.fillStyle = fade
        paint.fillRect(0, 0, pixelWidth, height)
      }
      this.#stripCache.set(chapter, layer)
    }
    ctx.drawImage(layer, 0, top)
  }

  #drawPath(ctx: CanvasRenderingContext2D): void {
    if (this.#nodes.length === 0) return
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    const first = this.#nodes[0]
    const last = this.#nodes[this.#nodes.length - 1]
    if (!first || !last) {
      ctx.restore()
      return
    }
    const pathPoints: Point[] = [
      { x: first.x, y: first.y + ROAD_ANCHOR },
      ...this.#nodes,
      { x: last.x, y: last.y - ROAD_ANCHOR },
    ]

    const baseW = clampRange(this.#width * 0.14, 36, 72)
    const route = themeFor(chapterOf(this.#unlocked))
    ctx.strokeStyle = ROAD_EDGE_COLOR
    ctx.lineWidth = clampRange(baseW + 12, 46, 90)
    ctx.shadowColor = 'rgb(0 0 0 / 0.35)'
    ctx.shadowBlur = clampRange(baseW * 0.25, 9, 18)
    ctx.beginPath()
    traceSmoothLine(ctx, pathPoints)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = ROAD_SHADE_COLOR
    ctx.lineWidth = clampRange(baseW + 6, 40, 80)
    ctx.beginPath()
    traceSmoothLine(ctx, pathPoints)
    ctx.stroke()
    ctx.strokeStyle = ROAD_SKY_COLOR
    ctx.lineWidth = baseW
    ctx.beginPath()
    traceSmoothLine(ctx, pathPoints)
    ctx.stroke()
    const paving =
      ROAD_TEXTURE.complete && ROAD_TEXTURE.naturalWidth > 0
        ? ctx.createPattern(ROAD_TEXTURE, 'repeat')
        : null
    if (paving) paving.setTransform(new DOMMatrix().scale(0.42))
    ctx.strokeStyle = paving ?? route.path
    ctx.lineWidth = baseW - 4
    ctx.beginPath()
    traceSmoothLine(ctx, pathPoints)
    ctx.stroke()
    ctx.restore()
  }

  #drawSigns(ctx: CanvasRenderingContext2D, width: number): void {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const span of chapterSpans(LEVELS.length)) {
      const theme = themeFor(span.chapter)
      const firstNode = this.#nodes[span.first]
      const prevNode = this.#nodes[span.first - 1]
      if (!firstNode) continue
      const y =
        span.first === 0
          ? firstNode.y + 116
          : prevNode
            ? (firstNode.y + prevNode.y) / 2 + 6
            : firstNode.y + 116
      ctx.save()
      ctx.shadowColor = '#10091f'
      ctx.shadowBlur = 8
      ctx.font = '600 11px system-ui, sans-serif'
      ctx.fillStyle = theme.accent
      ctx.fillText(`CHAPTER ${span.chapter + 1}`, width / 2, y - 12)
      ctx.font = 'bold 17px system-ui, sans-serif'
      ctx.fillStyle = '#fff0d8'
      ctx.fillText(theme.name, width / 2, y + 9)
      ctx.restore()
    }
  }

  #drawLampposts(ctx: CanvasRenderingContext2D): void {
    const points: { x: number; y: number }[] = []
    for (let i = 0; i < this.#nodes.length; i++) {
      const a = this.#nodes[i]
      const b = this.#nodes[i + 1]
      if (a && b) points.push({ x: (a.x + b.x) / 2 + (i % 2 === 0 ? 34 : -34), y: (a.y + b.y) / 2 })
    }
    ctx.save()
    for (const [i, p] of points.entries()) {
      ctx.fillStyle = '#1c1526'
      ctx.fillRect(p.x - 2, p.y - 50, 4, 50)
      ctx.fillRect(p.x - 5, p.y - 52, 10, 4)
      const flicker = 0.3 + 0.05 * Math.sin(this.#time * 7 + i * 2.1)
      const glow = ctx.createRadialGradient(p.x, p.y - 58, 2, p.x, p.y - 58, 36)
      glow.addColorStop(0, `rgb(255 215 110 / ${flicker})`)
      glow.addColorStop(1, 'rgb(255 215 110 / 0)')
      ctx.fillStyle = glow
      ctx.fillRect(p.x - 36, p.y - 94, 72, 72)
      ctx.fillStyle = '#ffd76e'
      ctx.beginPath()
      ctx.arc(p.x, p.y - 58, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgb(255 215 110 / 0.08)'
      ctx.beginPath()
      ctx.ellipse(p.x, p.y + 3, 26, 8, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // — Drawing: doors & avatar ——————————————————————————————————————————————

  #drawHouse(ctx: CanvasRenderingContext2D, node: DoorNode): void {
    const level = LEVELS[node.index]
    if (!level) return
    const theme = themeFor(node.chapter)
    const stars = earnedStars(level, this.#stars)
    const locked = node.index > this.#unlocked
    const current = node.index === this.#unlocked
    const open = this.#doorOpen(node.index)
    const shake = this.#shakes.get(node.index) ?? 0
    const w = node.boss ? 92 : 70
    const h = node.boss ? 76 : 60
    const roof = node.boss ? 36 : 24
    const lift = node.boss ? 58 : 46
    const cx = node.x + (shake > 0 ? Math.sin(shake * 40) * 3 : 0)
    const by = node.y - lift

    ctx.save()
    // Ground shadow.
    ctx.fillStyle = 'rgb(0 0 0 / 0.35)'
    ctx.beginPath()
    ctx.ellipse(cx, by + 5, w * 0.62, 8, 0, 0, Math.PI * 2)
    ctx.fill()

    if (locked) ctx.globalAlpha = 0.62

    const size = node.boss ? 150 : 120
    const spriteTop = by - size + 12
    if (HOUSE_CLOSED.complete && HOUSE_CLOSED.naturalWidth > 0) {
      ctx.drawImage(HOUSE_CLOSED, cx - size / 2, spriteTop, size, size)
      if (open > 0 && HOUSE_OPEN.complete && HOUSE_OPEN.naturalWidth > 0) {
        ctx.globalAlpha = (locked ? 0.62 : 1) * open
        ctx.drawImage(HOUSE_OPEN, cx - size / 2, spriteTop, size, size)
      }
    } else {
      // Body + roof.
      ctx.fillStyle = theme.house
      roundRectPath(ctx, cx - w / 2, by - h, w, h, 8)
      ctx.fill()
      ctx.strokeStyle = 'rgb(0 0 0 / 0.35)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = theme.roof
      ctx.beginPath()
      ctx.moveTo(cx - w / 2 - 9, by - h)
      ctx.lineTo(cx, by - h - roof)
      ctx.lineTo(cx + w / 2 + 9, by - h)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      if (node.boss) {
        ctx.strokeStyle = theme.accent
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cx, by - h - roof)
        ctx.lineTo(cx, by - h - roof - 12)
        ctx.stroke()
        ctx.fillStyle = theme.accent
        ctx.beginPath()
        ctx.moveTo(cx, by - h - roof - 12)
        ctx.lineTo(cx + 12, by - h - roof - 8)
        ctx.lineTo(cx, by - h - roof - 4)
        ctx.closePath()
        ctx.fill()
      }

      // Windows (lit on finished/next houses).
      const lit = !locked
      for (const side of [-1, 1]) {
        const wx = cx + side * w * 0.27
        const wy = by - h * 0.66
        if (lit) {
          ctx.save()
          ctx.shadowColor = theme.windowGlow
          ctx.shadowBlur = 10
          ctx.fillStyle = theme.windowGlow
        } else {
          ctx.fillStyle = 'rgb(10 8 18 / 0.8)'
        }
        roundRectPath(ctx, wx - 6, wy - 7, 12, 14, 3)
        ctx.fill()
        if (lit) ctx.restore()
      }

      // Door: swings open toward a warm interior.
      const dw = w * 0.34
      const dh = h * 0.52
      const dx = cx - dw / 2
      const dy = by - dh
      if (open > 0) {
        const interior = ctx.createLinearGradient(0, dy, 0, by)
        interior.addColorStop(0, '#ffdf8f')
        interior.addColorStop(1, '#b3722f')
        ctx.fillStyle = interior
        roundRectPath(ctx, dx, dy, dw, dh, 6)
        ctx.fill()
        ctx.fillStyle = `rgb(255 213 110 / ${0.22 * open})`
        ctx.beginPath()
        ctx.ellipse(cx, by + 4, dw * 0.85, 7, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = node.boss ? '#8c2f2f' : '#6b3f1d'
      roundRectPath(ctx, dx, dy, Math.max(1, dw * (1 - open)), dh, 6)
      ctx.fill()
      ctx.strokeStyle = 'rgb(0 0 0 / 0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      if (open < 0.5) {
        ctx.fillStyle = '#ffd23f'
        ctx.beginPath()
        ctx.arc(dx + dw * (1 - open) - 5, dy + dh / 2, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    if (node.boss) {
      ctx.font = '20px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = theme.accent
      ctx.fillText('♛', cx, spriteTop - 4)
    }

    if (locked) {
      ctx.font = '15px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🔒', cx, by - 22)
    }

    // Star row on the pavement below the door; they pop in on a celebration.
    const pop = node.index === this.#unlocked && this.#celebrating() ? this.#arrival : 99
    ctx.font = '17px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < 3; i++) {
      const scale = pop < 99 ? clamp01((pop - i * 0.18) / 0.25) : 1
      if (scale <= 0) continue
      const s = 1 + 0.5 * Math.sin(Math.PI * clamp01(scale))
      ctx.save()
      ctx.translate(cx + (i - 1) * 20, node.y + 22)
      ctx.scale(s, s)
      if (i < stars) {
        ctx.shadowColor = '#ffd23f'
        ctx.shadowBlur = 8
        ctx.fillStyle = '#ffd23f'
      } else {
        ctx.fillStyle = 'rgb(255 255 255 / 0.16)'
      }
      ctx.fillText('★', 0, 0)
      ctx.restore()
    }

    // Pulsing marker over the next door.
    if (current && !locked) {
      ctx.fillStyle = theme.accent
      ctx.font = '15px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('▼', cx, spriteTop - 18 + Math.sin(this.#time * 5) * 4)
    }
    ctx.restore()
  }

  /** True while the arrival celebration is still playing its first moments. */
  #celebrating(): boolean {
    return this.#celebratePending === false && this.#arrival >= 0 && this.#arrival < 1
  }

  #drawAvatar(ctx: CanvasRenderingContext2D): void {
    if (this.#nodes.length === 0) return
    const p = this.#avatarPos()
    const bob = Math.sin(this.#time * 2.4) * 1.2
    const size = clampRange(this.#width * 0.18, 64, 82)
    ctx.save()
    ctx.fillStyle = 'rgb(0 0 0 / 0.3)'
    ctx.beginPath()
    ctx.ellipse(p.x, p.y + 2, size * 0.22, size * 0.065, 0, 0, Math.PI * 2)
    ctx.fill()
    if (PLAYER_GHOST.complete && PLAYER_GHOST.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(PLAYER_GHOST, p.x - size / 2, p.y - size + bob, size, size)
    } else {
      ctx.fillStyle = '#f7f0ff'
      ctx.beginPath()
      ctx.arc(p.x, p.y - size * 0.42 + bob, size * 0.2, Math.PI, 0)
      ctx.lineTo(p.x + size * 0.2, p.y - size * 0.12 + bob)
      ctx.lineTo(p.x, p.y - size * 0.2 + bob)
      ctx.lineTo(p.x - size * 0.2, p.y - size * 0.12 + bob)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  #drawCandy(ctx: CanvasRenderingContext2D): void {
    const img = tileSprites.candy
    for (const c of this.#candy) {
      const alpha = clamp01(1 - (c.age - 1.1) / 0.5)
      if (alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(c.x, c.y)
      ctx.rotate(c.rot)
      ctx.drawImage(img, -11, -11, 22, 22)
      ctx.restore()
    }
  }

  #drawFog(ctx: CanvasRenderingContext2D, width: number): void {
    const count = Math.max(3, Math.round(this.#contentHeight / 260))
    ctx.save()
    for (let i = 0; i < count; i++) {
      const y = ((i + 0.5) / count) * this.#contentHeight
      const r = 90 + (i % 3) * 42
      const speed = 10 + (i % 5) * 5
      const x =
        ((frac(Math.sin(i * 37.7) * 8123.9) * (width + 240) + this.#time * speed) % (width + 240)) -
        120
      const gradient = ctx.createRadialGradient(x, y, 4, x, y, r)
      gradient.addColorStop(0, `rgb(190 180 230 / ${0.07 + (i % 2) * 0.03})`)
      gradient.addColorStop(1, 'rgb(190 180 230 / 0)')
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(1, 0.32)
      ctx.translate(-x, -y)
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  }

  #drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.45,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75,
    )
    gradient.addColorStop(0, 'rgb(5 3 12 / 0)')
    gradient.addColorStop(1, 'rgb(5 3 12 / 0.45)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
}
