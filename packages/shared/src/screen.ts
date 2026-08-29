export type Orientation = 'portrait' | 'landscape'

export function getOrientation(): Orientation {
  return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait'
}

/** Subscribes to orientation changes via matchMedia. Returns an unsubscribe function. */
export function onOrientationChange(callback: (orientation: Orientation) => void): () => void {
  const query = window.matchMedia('(orientation: landscape)')
  const handler = () => callback(query.matches ? 'landscape' : 'portrait')
  query.addEventListener('change', handler)
  return () => query.removeEventListener('change', handler)
}

export function isFullscreen(): boolean {
  return document.fullscreenElement !== null
}

export async function enterFullscreen(
  element: HTMLElement = document.documentElement,
): Promise<void> {
  try {
    await element.requestFullscreen()
  } catch {
    // Unsupported (e.g. iPhone Safari) or rejected — the game must work without it.
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen()) return
  try {
    await document.exitFullscreen()
  } catch {
    // Ignore.
  }
}

export async function toggleFullscreen(
  element: HTMLElement = document.documentElement,
): Promise<void> {
  if (isFullscreen()) {
    await exitFullscreen()
  } else {
    await enterFullscreen(element)
  }
}

/** Best-effort orientation lock — usually needs fullscreen on mobile browsers. Returns whether it succeeded. */
export async function lockOrientation(orientation: Orientation): Promise<boolean> {
  try {
    await screen.orientation.lock(orientation)
    return true
  } catch {
    return false
  }
}

export interface WakeLockHandle {
  release(): Promise<void>
}

/**
 * Keeps the screen on while playing. Re-acquires automatically after the tab
 * has been backgrounded. Returns undefined when the API is unavailable.
 */
export async function requestWakeLock(): Promise<WakeLockHandle | undefined> {
  if (!('wakeLock' in navigator)) return undefined

  let sentinel: WakeLockSentinel | undefined
  const acquire = async () => {
    try {
      sentinel = await navigator.wakeLock.request('screen')
    } catch {
      // Denied or unavailable; not fatal.
    }
  }
  await acquire()
  if (!sentinel) return undefined

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && sentinel?.released) void acquire()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return {
    release: async () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      try {
        await sentinel?.release()
      } catch {
        // Already released.
      }
    },
  }
}
