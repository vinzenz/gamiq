export interface LoopHandlers {
  /**
   * Called every frame. `dt` is the delta time in seconds, clamped to 0.1 so
   * physics stays stable after long stalls; `elapsed` is total seconds since
   * the loop started.
   */
  frame: (dt: number, elapsed: number) => void
}

export interface GameLoop {
  start(): void
  stop(): void
  readonly running: boolean
}

/**
 * requestAnimationFrame loop with clamped delta time that pauses while the
 * tab is hidden (and resumes automatically when it becomes visible again).
 */
export function createLoop(handlers: LoopHandlers): GameLoop {
  let rafId = 0
  let last = 0
  let elapsed = 0
  let running = false
  let resumeOnVisible = false

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick)
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    elapsed += dt
    handlers.frame(dt, elapsed)
  }

  const start = () => {
    if (running) return
    running = true
    last = performance.now()
    rafId = requestAnimationFrame(tick)
  }

  const stop = () => {
    if (!running) return
    running = false
    cancelAnimationFrame(rafId)
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (running) {
        resumeOnVisible = true
        stop()
      }
    } else if (resumeOnVisible) {
      resumeOnVisible = false
      start()
    }
  })

  return {
    start,
    stop,
    get running() {
      return running
    },
  }
}
