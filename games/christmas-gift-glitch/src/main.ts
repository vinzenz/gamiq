import './style.css'
import {
  applyCanvasScale,
  createLoop,
  onViewportResize,
  resizeCanvasToDisplaySize,
  setupViewport,
  toggleFullscreen,
  unlockAudio,
} from '@gamiq/shared'
import { registerPlayScreen } from './game/play.ts'
import { createScreen, hasScreen, type Screen, type ScreenHost } from './game/screens.ts'
import { registerMetaScreens } from './meta/index.ts'

/**
 * App shell: owns the canvas, the rAF loop and the screen registry. Everything
 * else (alley map, play screen now; tutorial later) registers itself under
 * an id with `registerScreen()` and is mounted through `host.navigate`.
 */

registerPlayScreen()
registerMetaScreens()

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

const canvas = requireElement<HTMLCanvasElement>('#game')
const screenRoot = requireElement<HTMLDivElement>('#screens')
const fullscreenButton = requireElement<HTMLButtonElement>('#fullscreen')
const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('Canvas 2D not supported')

setupViewport()

let size = resizeCanvasToDisplaySize(canvas)
let current: Screen | undefined

const host: ScreenHost = {
  canvas,
  dom: screenRoot,
  hasScreen,
  navigate: (id, params) => {
    current?.dispose?.()
    screenRoot.replaceChildren()
    current = createScreen(id, host, params)
    if (current.element) screenRoot.append(current.element)
    current.resize?.(size.width, size.height)
  },
}

// Dev/testing hook: `?level=N` opens the play screen at level N (1-based);
// otherwise the shell opens on the alley map.
const levelParam = Number.parseInt(new URLSearchParams(location.search).get('level') ?? '', 10)
const startLevel = Number.isInteger(levelParam) && levelParam >= 1 ? levelParam - 1 : undefined
if (startLevel === undefined) host.navigate('map')
else host.navigate('play', { level: startLevel })

const stopResizing = onViewportResize((next) => {
  size = resizeCanvasToDisplaySize(canvas)
  current?.resize?.(next.width, next.height)
})

fullscreenButton.addEventListener('click', () => {
  unlockAudio()
  void toggleFullscreen()
})

const loop = createLoop({
  frame: (dt) => {
    current?.update(dt)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#081c34'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    applyCanvasScale(ctx, canvas)
    current?.render(ctx, size.width, size.height)
  },
})
loop.start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopResizing()
    loop.stop()
    current?.dispose?.()
  })
}
