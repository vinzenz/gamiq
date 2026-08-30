import { drawSprite, powerupSprites } from './sprites.ts'

/**
 * Procedural juice: particles, floating text, rings, broom streaks, ghost
 * flights, screen shake and the cauldron rainbow flash. All code-drawn (see
 * ASSETS.md — combo FX stay procedural), updated and rendered every frame.
 */

const MAX_PARTICLES = 350

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  g: number
  age: number
  life: number
  size: number
  color: string
  square: boolean
  rot: number
  vr: number
}

interface Floater {
  x: number
  y: number
  text: string
  color: string
  age: number
}

interface Ring {
  x: number
  y: number
  age: number
  life: number
  radius: number
  color: string
  width: number
}

interface Streak {
  /** Centre of the swept row/column, plus the pixel span to sweep. */
  x: number
  y: number
  horizontal: boolean
  span: number
  age: number
  life: number
}

interface Flight {
  x0: number
  y0: number
  x1: number
  y1: number
  age: number
  life: number
}

export interface BurstOptions {
  count?: number
  speed?: number
  size?: number
  gravity?: number
  life?: number
  square?: boolean
}

const CONFETTI_COLORS = ['#ff8a2a', '#ffd23f', '#ff7ac2', '#8b7cc4', '#6fe38a', '#a8d8f8']

export class Fx {
  shake = 0
  rainbow = 0
  #particles: Particle[] = []
  #floaters: Floater[] = []
  #rings: Ring[] = []
  #streaks: Streak[] = []
  #flights: Flight[] = []

  burst(x: number, y: number, color: string, opts: BurstOptions = {}): void {
    if (this.#particles.length > MAX_PARTICLES) return
    const { count = 8, speed = 180, size = 5, gravity = 400, life = 0.55, square = false } = opts
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const v = speed * (0.4 + Math.random() * 0.8)
      this.#particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - speed * 0.25,
        g: gravity,
        age: 0,
        life: life * (0.7 + Math.random() * 0.6),
        size: size * (0.6 + Math.random() * 0.8),
        color,
        square,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
      })
    }
  }

  confettiBurst(x: number, y: number): void {
    for (let i = 0; i < 34; i++) {
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      if (!color) continue
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
      const v = 220 + Math.random() * 260
      this.#particles.push({
        x: x + (Math.random() - 0.5) * 60,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        g: 520,
        age: 0,
        life: 1.1 + Math.random() * 0.7,
        size: 4 + Math.random() * 4,
        color,
        square: true,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 16,
      })
    }
  }

  ring(x: number, y: number, radius: number, color: string, width = 5, life = 0.45): void {
    this.#rings.push({ x, y, age: 0, life, radius, color, width })
  }

  /** Bright sweep along a row/column; sparkles trail the moving head. */
  streak(x: number, y: number, horizontal: boolean, span: number, life = 0.38): void {
    this.#streaks.push({ x, y, horizontal, span, age: 0, life })
  }

  /** Little ghost gliding from a power-up cell to its objective. */
  flight(x0: number, y0: number, x1: number, y1: number, life = 0.32): void {
    this.#flights.push({ x0, y0, x1, y1, age: 0, life })
  }

  floatText(x: number, y: number, text: string, color = '#fff'): void {
    this.#floaters.push({ x, y, text, color, age: 0 })
  }

  kick(amount: number): void {
    this.shake = Math.min(16, this.shake + amount)
  }

  rainbowFlash(): void {
    this.rainbow = 1
  }

  update(dt: number): void {
    this.shake = this.shake * Math.exp(-6 * dt)
    if (this.shake < 0.03) this.shake = 0
    this.rainbow = Math.max(0, this.rainbow - dt * 2.6)

    for (const p of this.#particles) {
      p.age += dt
      p.vy += p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
    }
    this.#particles = this.#particles.filter((p) => p.age < p.life)

    for (const f of this.#floaters) f.age += dt
    this.#floaters = this.#floaters.filter((f) => f.age < 1.1)

    for (const r of this.#rings) r.age += dt
    this.#rings = this.#rings.filter((r) => r.age < r.life)

    for (const s of this.#streaks) {
      const before = s.age
      s.age += dt
      // Sparkles ride the sweeping head while it travels.
      if (before < s.life * 0.85) {
        const head = easeOutQuad(Math.min(1, s.age / s.life)) * s.span * 0.5
        const size = 3 + Math.random() * 3
        this.#particles.push({
          x: s.horizontal ? s.x - s.span / 2 + head : s.x + (Math.random() - 0.5) * 14,
          y: s.horizontal ? s.y + (Math.random() - 0.5) * 14 : s.y - s.span / 2 + head,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          g: 120,
          age: 0,
          life: 0.3,
          size,
          color: '#ffe9a3',
          square: false,
          rot: 0,
          vr: 0,
        })
      }
    }
    this.#streaks = this.#streaks.filter((s) => s.age < s.life)

    for (const f of this.#flights) {
      const before = f.age
      f.age += dt
      if (before < f.life && f.age >= f.life) {
        this.ring(f.x1, f.y1, 26, 'rgb(255 255 255)', 3, 0.3)
        this.burst(f.x1, f.y1, '#a8d8f8', { count: 8, speed: 150, life: 0.4 })
      } else if (f.age < f.life && Math.random() < 0.5) {
        const t = easeOutQuad(f.age / f.life)
        this.#particles.push({
          x: f.x0 + (f.x1 - f.x0) * t + (Math.random() - 0.5) * 10,
          y: f.y0 + (f.y1 - f.y0) * t + (Math.random() - 0.5) * 10,
          vx: 0,
          vy: -20,
          g: 0,
          age: 0,
          life: 0.3,
          size: 3,
          color: '#cfe8ff',
          square: false,
          rot: 0,
          vr: 0,
        })
      }
    }
    this.#flights = this.#flights.filter((f) => f.age < f.life)
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.#particles) {
      const t = p.age / p.life
      ctx.globalAlpha = 1 - t * t
      ctx.fillStyle = p.color
      if (p.square) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    for (const s of this.#streaks) {
      const t = Math.min(1, s.age / s.life)
      const head = easeOutQuad(t) * s.span * 0.5
      const x0 = s.horizontal ? s.x - head : s.x
      const y0 = s.horizontal ? s.y : s.y - head
      const x1 = s.horizontal ? s.x + head : s.x
      const y1 = s.horizontal ? s.y : s.y + head
      ctx.globalAlpha = 0.5 * (1 - t)
      ctx.strokeStyle = '#ffd23f'
      ctx.lineWidth = 16
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
      ctx.globalAlpha = 0.9 * (1 - t)
      ctx.strokeStyle = '#fff6d8'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    for (const f of this.#flights) {
      const t = easeOutQuad(Math.min(1, f.age / f.life))
      const bob = Math.sin(f.age * 22) * 4
      drawSprite(
        ctx,
        powerupSprites['little-ghost'],
        f.x0 + (f.x1 - f.x0) * t,
        f.y0 + (f.y1 - f.y0) * t + bob,
        40,
        {
          alpha: 0.95,
        },
      )
    }

    for (const r of this.#rings) {
      const t = r.age / r.life
      ctx.globalAlpha = 1 - t
      ctx.strokeStyle = r.color
      ctx.lineWidth = r.width * (1 - t * 0.5)
      ctx.beginPath()
      ctx.arc(r.x, r.y, 6 + easeOutQuad(t) * r.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    for (const f of this.#floaters) {
      const t = f.age / 1.1
      ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85
      ctx.font = '700 17px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 4
      ctx.strokeStyle = 'rgb(16 10 30 / 0.9)'
      const y = f.y - 30 * t
      ctx.strokeText(f.text, f.x, y)
      ctx.fillStyle = f.color
      ctx.fillText(f.text, f.x, y)
      ctx.globalAlpha = 1
    }
  }

  /** Cauldron colour-clear flash, drawn over the board rect. */
  renderBoardFlash(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
  ): void {
    if (this.rainbow <= 0) return
    const t = performance.now() / 1000
    const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y)
    for (let i = 0; i <= 6; i++) {
      gradient.addColorStop(i / 6, `hsl(${(t * 300 + i * 60) % 360} 90% 65%)`)
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = this.rainbow * 0.22
    ctx.fillStyle = gradient
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    ctx.restore()
  }
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}
