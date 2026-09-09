import { loadJSON, saveJSON, trackPointers, unlockAudio } from '@gamiq/shared'
import avatarUrl from '../../assets/meta/juni-and-crumb.webp'
import mapBackgroundUrl from '../../assets/meta/sky-islands-map-v2.webp'
import { sfx } from '../game/audio.ts'
import { loadStars } from '../game/progress.ts'
import { registerScreen, type Screen, type ScreenHost } from '../game/screens.ts'
import { LEVELS } from '../levels/index.ts'
import { CHAPTERS, chapterOf, chapterSpans, type DoorNode, layoutDoors } from './chapters.ts'
import {
  earnedStars,
  normalizeMapState,
  pendingCelebration,
  totalStars,
  unlockedIndex,
} from './progress.ts'
import { storyFor } from './story.ts'

const STYLE_ID = 'gift-glitch-map-style'
const MAP_KEY = 'christmas-gift-glitch:map'

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

function image(src: string): HTMLImageElement {
  const value = new Image()
  value.src = src
  return value
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
}

function traceRoute(ctx: CanvasRenderingContext2D, nodes: readonly DoorNode[]): void {
  const first = nodes[0]
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]
    const b = nodes[i + 1]
    if (!a || !b) continue
    const midY = (a.y + b.y) / 2
    ctx.bezierCurveTo(a.x, midY, b.x, midY, b.x, b.y)
  }
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = el('style')
  style.id = STYLE_ID
  style.textContent = `
.glitch-map-root{position:absolute;inset:0;pointer-events:none;color:#fff5db}
.glitch-map-top{position:absolute;z-index:2;top:0;left:0;right:0;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:calc(var(--glitch-sat) + 12px) calc(var(--glitch-sar) + 62px) 0 calc(var(--glitch-sal) + 12px);filter:drop-shadow(0 2px 5px rgb(8 20 42/.8))}
.glitch-map-world{font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#fff5db}
.glitch-map-kicker{display:block;margin-top:2px;font-size:10px;font-weight:700;letter-spacing:.02em;text-transform:none;color:#bcecff}
.glitch-map-stars{border:2px solid rgb(245 196 81/.75);border-radius:999px;background:rgb(12 34 58/.82);padding:6px 11px;color:#f5c451;font-size:13px;font-weight:900;white-space:nowrap}
.glitch-story{position:absolute;z-index:3;left:50%;bottom:calc(var(--glitch-sab) + 12px);width:min(440px,calc(100vw - 24px));transform:translateX(-50%);pointer-events:auto;border:2px solid rgb(245 196 81/.75);border-radius:22px;background:linear-gradient(155deg,rgb(15 55 65/.96),rgb(9 29 52/.97));box-shadow:0 14px 40px rgb(3 14 30/.5),inset 0 1px rgb(255 255 255/.16);padding:13px 14px 14px;text-align:left}
.glitch-story-label{color:#7cc9e8;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
.glitch-story h2{margin:3px 0 4px;color:#fff5db;font-size:20px;line-height:1.1}
.glitch-story p{margin:0;color:rgb(255 245 219/.82);font-size:12px;line-height:1.35}
.glitch-story button{width:100%;margin-top:10px;padding:10px 14px;border:2px solid #ffe7a1;border-radius:13px;background:linear-gradient(#e75a59,#b92940);box-shadow:0 4px 0 #701b34;color:white;font:800 15px system-ui;cursor:pointer}
.glitch-story button:active{transform:translateY(2px);box-shadow:0 2px 0 #701b34}
@media(min-width:700px){.glitch-map-world{font-size:15px}.glitch-map-kicker{font-size:12px}.glitch-story p{font-size:13px}.glitch-story h2{font-size:23px}}
`
  document.head.append(style)
}

export function registerMetaScreens(): void {
  ensureStyle()
  registerScreen('map', (host) => new JourneyMapScreen(host))
}

class JourneyMapScreen implements Screen {
  readonly element: HTMLElement
  readonly #host: ScreenHost
  readonly #background = image(mapBackgroundUrl)
  readonly #avatar = image(avatarUrl)
  readonly #stars = loadStars()
  readonly #unlocked = unlockedIndex(this.#stars)
  readonly #worldLabel: HTMLElement
  readonly #kicker: HTMLElement
  readonly #storyLabel: HTMLElement
  readonly #storyTitle: HTMLElement
  readonly #storyBody: HTMLElement
  readonly #playButton: HTMLButtonElement
  readonly #stopPointers: () => void
  #nodes: DoorNode[] = []
  #contentHeight = 0
  #width = 0
  #height = 0
  #camera = 0
  #selected = this.#unlocked
  #time = 0
  #celebrating = false
  #drag: { y: number; camera: number; moved: boolean } | undefined
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
    this.#camera = this.#clampCamera(this.#camera + delta * unit)
  }

  constructor(host: ScreenHost) {
    this.#host = host
    const root = el('div', 'glitch-map-root')
    this.element = root
    const top = el('div', 'glitch-map-top', root)
    const world = el('div', 'glitch-map-world', top)
    this.#worldLabel = el('span', undefined, world)
    this.#kicker = el('span', 'glitch-map-kicker', world)
    el('div', 'glitch-map-stars', top).textContent =
      `★ ${totalStars(this.#stars)}/${LEVELS.length * 3}`

    const card = el('section', 'glitch-story', root)
    this.#storyLabel = el('div', 'glitch-story-label', card)
    this.#storyTitle = el('h2', undefined, card)
    this.#storyBody = el('p', undefined, card)
    this.#playButton = el('button', undefined, card)
    this.#playButton.type = 'button'
    this.#playButton.addEventListener('click', () => this.#play())
    this.#refreshCard()

    const state = normalizeMapState(loadJSON<unknown>(MAP_KEY, null)) ?? { celebrated: 0 }
    this.#celebrating = pendingCelebration(state, this.#unlocked, LEVELS.length) !== undefined
    if (this.#celebrating) saveJSON(MAP_KEY, { celebrated: this.#unlocked })

    host.canvas.addEventListener('wheel', this.#onWheel, { passive: false })

    this.#stopPointers = trackPointers(host.canvas, {
      down: (p) => {
        unlockAudio()
        this.#drag = { y: p.y, camera: this.#camera, moved: false }
      },
      move: (p) => {
        const drag = this.#drag
        if (!drag) return
        const dy = p.y - drag.y
        if (Math.abs(dy) > 8) drag.moved = true
        if (drag.moved) this.#camera = this.#clampCamera(drag.camera - dy)
      },
      up: (p) => {
        const drag = this.#drag
        this.#drag = undefined
        if (!drag?.moved) this.#tap(p.x, p.y)
      },
      cancel: () => {
        this.#drag = undefined
      },
    })
  }

  update(dt: number): void {
    this.#time += dt
    if (this.#celebrating && this.#time > 1.4) this.#celebrating = false
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.#drawBackground(ctx, width, height)
    ctx.save()
    ctx.translate(0, -this.#camera)
    this.#drawChapterBands(ctx, width)
    this.#drawPath(ctx)
    this.#drawNodes(ctx)
    this.#drawAvatar(ctx)
    ctx.restore()
    this.#drawSnow(ctx, width, height)
  }

  resize(width: number, height: number): void {
    const first = this.#width === 0
    this.#width = width
    this.#height = height
    const layout = layoutDoors(width, LEVELS.length)
    this.#nodes = layout.nodes
    this.#contentHeight = layout.contentHeight
    if (first)
      this.#camera = this.#clampCamera((this.#nodes[this.#unlocked]?.y ?? 0) - height * 0.43)
    else this.#camera = this.#clampCamera(this.#camera)
  }

  dispose(): void {
    this.#host.canvas.removeEventListener('wheel', this.#onWheel)
    this.#stopPointers()
  }

  #clampCamera(value: number): number {
    return Math.max(0, Math.min(value, Math.max(0, this.#contentHeight - this.#height)))
  }

  #tap(x: number, y: number): void {
    const worldY = y + this.#camera
    let closest: DoorNode | undefined
    let distance = 52
    for (const node of this.#nodes) {
      const next = Math.hypot(node.x - x, node.y - worldY)
      if (next < distance) {
        distance = next
        closest = node
      }
    }
    if (!closest) return
    if (closest.index > this.#unlocked) {
      sfx.reject()
      return
    }
    sfx.select()
    this.#selected = closest.index
    this.#refreshCard()
  }

  #play(): void {
    unlockAudio()
    sfx.select()
    this.#host.navigate('play', { level: this.#selected })
  }

  #refreshCard(): void {
    const beat = storyFor(this.#selected)
    const chapter = CHAPTERS[chapterOf(this.#selected)] ?? CHAPTERS[0]
    const level = LEVELS[this.#selected]
    if (!chapter || !level) throw new Error('Christmas campaign metadata is incomplete')
    this.#worldLabel.textContent = chapter.name
    this.#kicker.textContent = chapter.kicker
    this.#storyLabel.textContent = `Dispatch ${this.#selected + 1} of ${LEVELS.length}`
    this.#storyTitle.textContent = beat.title
    this.#storyBody.textContent = beat.body
    const replay = earnedStars(level, this.#stars) > 0
    this.#playButton.textContent = replay
      ? `Replay ${this.#selected + 1}`
      : `Fix dispatch ${this.#selected + 1}`
  }

  #drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#0b2439'
    ctx.fillRect(0, 0, width, height)
    if (this.#background.complete && this.#background.naturalWidth > 0) {
      const scale = Math.max(
        width / this.#background.naturalWidth,
        height / this.#background.naturalHeight,
      )
      const w = this.#background.naturalWidth * scale
      const h = this.#background.naturalHeight * scale
      ctx.globalAlpha = 0.9
      ctx.drawImage(this.#background, (width - w) / 2, (height - h) / 2, w, h)
      ctx.globalAlpha = 1
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgb(3 18 42 / .08)')
    gradient.addColorStop(0.5, 'rgb(18 52 71 / .2)')
    gradient.addColorStop(1, 'rgb(3 18 42 / .44)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  #drawChapterBands(ctx: CanvasRenderingContext2D, width: number): void {
    for (const span of chapterSpans(LEVELS.length)) {
      const first = this.#nodes[span.first]
      const last = this.#nodes[span.last]
      const theme = CHAPTERS[span.chapter]
      if (!first || !last || !theme) continue
      const top = last.y - 96
      const bottom = first.y + 82
      const gradient = ctx.createLinearGradient(0, top, 0, bottom)
      gradient.addColorStop(0, `${theme.top}42`)
      gradient.addColorStop(1, `${theme.bottom}36`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, top, width, bottom - top)
      rounded(ctx, 18, top + 18, Math.min(width - 36, 250), 35, 18)
      ctx.fillStyle = 'rgb(7 29 49 / .78)'
      ctx.fill()
      ctx.strokeStyle = theme.accent
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#fff5db'
      ctx.font = '800 13px system-ui'
      ctx.textBaseline = 'middle'
      ctx.fillText(theme.name, 34, top + 36)
    }
  }

  #drawPath(ctx: CanvasRenderingContext2D): void {
    traceRoute(ctx, this.#nodes)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgb(22 54 72 / .7)'
    ctx.lineWidth = 23
    ctx.stroke()
    traceRoute(ctx, this.#nodes)
    ctx.strokeStyle = '#fff2cc'
    ctx.lineWidth = 15
    ctx.setLineDash([3, 19])
    ctx.stroke()
    ctx.setLineDash([])
  }

  #drawNodes(ctx: CanvasRenderingContext2D): void {
    for (const node of this.#nodes) {
      const level = LEVELS[node.index]
      if (!level) continue
      const done = earnedStars(level, this.#stars)
      const locked = node.index > this.#unlocked
      const selected = node.index === this.#selected
      const radius = node.boss ? 31 : 26
      const pulse = node.index === this.#unlocked ? Math.sin(this.#time * 4) * 2 : 0

      ctx.save()
      ctx.translate(node.x, node.y)
      ctx.globalAlpha = locked ? 0.72 : 1
      ctx.shadowColor = selected ? '#f5c451' : 'rgb(4 19 38 / .7)'
      ctx.shadowBlur = selected ? 18 : 8
      ctx.fillStyle = locked ? '#6e91a2' : done ? '#2b8a6e' : '#c83e4d'
      ctx.beginPath()
      ctx.arc(0, 0, radius + pulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = selected ? '#fff5db' : '#f5c451'
      ctx.lineWidth = selected ? 5 : 3
      ctx.stroke()
      ctx.fillStyle = '#fff5db'
      ctx.font = `900 ${node.boss ? 17 : 15}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(locked ? '•' : String(node.index + 1), 0, done ? -4 : 1)
      if (done) {
        ctx.fillStyle = '#f5c451'
        ctx.font = '800 9px system-ui'
        ctx.fillText('★'.repeat(done), 0, 15)
      }
      if (node.boss) {
        ctx.font = '18px system-ui'
        ctx.fillText('♛', 0, -radius - 11)
      }
      ctx.restore()
    }
  }

  #drawAvatar(ctx: CanvasRenderingContext2D): void {
    const node = this.#nodes[this.#unlocked]
    if (!node) return
    const size = 94 + Math.sin(this.#time * 2.2) * 2
    const y = node.y - 68
    if (this.#celebrating) {
      ctx.strokeStyle = `rgb(245 196 81 / ${Math.max(0, 1 - this.#time / 1.4)})`
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.arc(node.x, node.y, 38 + this.#time * 48, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (this.#avatar.complete && this.#avatar.naturalWidth > 0) {
      ctx.drawImage(this.#avatar, node.x - size / 2, y - size / 2, size, size)
    }
  }

  #drawSnow(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgb(255 255 255 / .72)'
    for (let i = 0; i < 36; i++) {
      const x = ((i * 97 + this.#time * (8 + (i % 5))) % (width + 20)) - 10
      const y = ((i * 173 + this.#time * (15 + (i % 7))) % (height + 20)) - 10
      ctx.beginPath()
      ctx.arc(x, y, 1 + (i % 3) * 0.55, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
