import './style.css'
import {
  applyCanvasScale,
  createLoop,
  loadBest,
  onViewportResize,
  resizeCanvasToDisplaySize,
  setupViewport,
  toggleFullscreen,
  tone,
  trackPointers,
  unlockAudio,
  updateBest,
} from '@gamiq/shared'

const GAME_ID = 'trick-or-treat-swap'

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

const canvas = requireElement<HTMLCanvasElement>('#game')
const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('Canvas 2D not supported')
const fullscreenButton = requireElement<HTMLButtonElement>('#fullscreen')

setupViewport()

interface Target {
  x: number
  y: number
  radius: number
  age: number
  lifetime: number
  hue: number
}

interface Pop {
  x: number
  y: number
  age: number
  hue: number
  hit: boolean
}

type Phase = 'ready' | 'playing' | 'gameover'

const state = {
  phase: 'ready' as Phase,
  time: 0,
  score: 0,
  lives: 3,
  best: loadBest(GAME_ID),
  newBest: false,
  targets: [] as Target[],
  pops: [] as Pop[],
  spawnTimer: 0,
}

let width = 1
let height = 1

const resize = () => {
  const size = resizeCanvasToDisplaySize(canvas)
  width = size.width
  height = size.height
}
resize()
const stopResizing = onViewportResize(resize)

/** Ramps from 0 to 1 over 75 seconds of play. */
const difficulty = () => Math.min(1, state.time / 75)

const startGame = () => {
  state.phase = 'playing'
  state.time = 0
  state.score = 0
  state.lives = 3
  state.newBest = false
  state.targets = []
  state.pops = []
  state.spawnTimer = 0.5
}

const endGame = () => {
  state.phase = 'gameover'
  state.time = 0
  const result = updateBest(GAME_ID, state.score)
  state.best = result.best
  state.newBest = result.improved
}

const spawnTarget = () => {
  const radius = 24 + Math.random() * 18
  const padX = radius + 16
  const padTop = radius + 88 // keep clear of the HUD and fullscreen button
  const padBottom = radius + 16
  const lifetime = 2.4 - 1.3 * difficulty()
  state.targets.push({
    x: padX + Math.random() * Math.max(1, width - padX * 2),
    y: padTop + Math.random() * Math.max(1, height - padTop - padBottom),
    radius,
    age: 0,
    lifetime,
    hue: Math.floor(Math.random() * 360),
  })
}

const update = (dt: number) => {
  state.time += dt
  for (const pop of state.pops) pop.age += dt
  state.pops = state.pops.filter((pop) => pop.age < 0.45)

  if (state.phase !== 'playing') return

  state.spawnTimer -= dt
  if (state.spawnTimer <= 0) {
    spawnTarget()
    state.spawnTimer = 1.05 - 0.55 * difficulty()
  }

  for (const target of state.targets) target.age += dt
  const expired = state.targets.filter((target) => target.age >= target.lifetime)
  if (expired.length > 0) {
    state.targets = state.targets.filter((target) => target.age < target.lifetime)
    state.lives -= expired.length
    tone(130, 0.28, { type: 'sawtooth', volume: 0.1 })
    if (state.lives <= 0) endGame()
  }
}

const popAt = (x: number, y: number) => {
  // Topmost first, with a slightly forgiving hit radius.
  for (let i = state.targets.length - 1; i >= 0; i--) {
    const target = state.targets[i]
    if (!target) continue
    const dx = x - target.x
    const dy = y - target.y
    if (dx * dx + dy * dy <= (target.radius + 12) ** 2) {
      state.targets.splice(i, 1)
      state.score += 1
      state.pops.push({ x: target.x, y: target.y, age: 0, hue: target.hue, hit: true })
      tone(520 + Math.random() * 180, 0.09, { type: 'triangle', volume: 0.16 })
      return
    }
  }
  state.pops.push({ x, y, age: 0, hue: 0, hit: false })
  tone(170, 0.05, { volume: 0.05 })
}

trackPointers(canvas, {
  down: (point) => {
    unlockAudio()
    if (state.phase === 'ready') {
      startGame()
    } else if (state.phase === 'playing') {
      popAt(point.x, point.y)
    } else if (state.time > 0.8) {
      // Small delay so the game-over tap doesn't instantly restart.
      startGame()
    }
  },
})

fullscreenButton.addEventListener('click', () => {
  unlockAudio()
  void toggleFullscreen()
})

const circle = (x: number, y: number, radius: number) => {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
}

const drawCenteredText = (text: string, y: number, font: string, color: string) => {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, y)
}

const render = () => {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#0b0e14'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  applyCanvasScale(ctx, canvas)

  for (const target of state.targets) {
    const remaining = Math.max(0, 1 - target.age / target.lifetime)
    ctx.fillStyle = `hsl(${target.hue} 70% 58%)`
    circle(target.x, target.y, target.radius)
    ctx.fill()
    // Countdown ring
    ctx.strokeStyle = `hsl(${target.hue} 80% 70% / 0.6)`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(
      target.x,
      target.y,
      target.radius + 7,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * remaining,
    )
    ctx.stroke()
  }

  for (const pop of state.pops) {
    const t = pop.age / 0.45
    ctx.globalAlpha = 1 - t
    ctx.strokeStyle = pop.hit ? `hsl(${pop.hue} 80% 70%)` : 'rgb(255 255 255 / 0.5)'
    ctx.lineWidth = 2
    circle(pop.x, pop.y, 8 + t * (pop.hit ? 42 : 22))
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const safeLeft = 16
  const safeTop = 14
  ctx.font = '600 18px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgb(230 233 242 / 0.9)'
  ctx.fillText(`Score ${state.score}`, safeLeft, safeTop)
  for (let i = 0; i < 3; i++) {
    circle(safeLeft + 6 + i * 20, safeTop + 40, 5.5)
    ctx.fillStyle = i < state.lives ? 'rgb(94 234 148)' : 'rgb(255 255 255 / 0.15)'
    ctx.fill()
  }
  if (state.best > 0) {
    ctx.fillStyle = 'rgb(230 233 242 / 0.45)'
    ctx.fillText(`Best ${state.best}`, safeLeft, safeTop + 56)
  }

  const pulse = 0.6 + 0.4 * Math.sin(state.time * 4)
  if (state.phase === 'ready') {
    drawCenteredText('🎃 Trick or Treat Swap', height * 0.36, '700 44px system-ui, sans-serif', '#e6e9f2')
    drawCenteredText(
      'Tap the dots before they fade. 3 misses and it’s over.',
      height * 0.36 + 46,
      '400 16px system-ui, sans-serif',
      'rgb(230 233 242 / 0.65)',
    )
    ctx.globalAlpha = pulse
    drawCenteredText(
      'Tap to start',
      height * 0.55,
      '600 22px system-ui, sans-serif',
      'rgb(94 234 148)',
    )
    ctx.globalAlpha = 1
  } else if (state.phase === 'gameover') {
    drawCenteredText('Game over', height * 0.34, '700 40px system-ui, sans-serif', '#e6e9f2')
    drawCenteredText(
      `Score ${state.score}`,
      height * 0.34 + 52,
      '600 26px system-ui, sans-serif',
      'rgb(94 234 148)',
    )
    if (state.newBest) {
      drawCenteredText('New best!', height * 0.34 + 90, '600 18px system-ui, sans-serif', '#facc15')
    } else {
      drawCenteredText(
        `Best ${state.best}`,
        height * 0.34 + 90,
        '400 18px system-ui, sans-serif',
        'rgb(230 233 242 / 0.55)',
      )
    }
    ctx.globalAlpha = pulse
    drawCenteredText(
      'Tap to try again',
      height * 0.55,
      '600 20px system-ui, sans-serif',
      'rgb(230 233 242 / 0.8)',
    )
    ctx.globalAlpha = 1
  }
}

const loop = createLoop({
  frame: (dt) => {
    update(dt)
    render()
  },
})
loop.start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopResizing()
    loop.stop()
  })
}
