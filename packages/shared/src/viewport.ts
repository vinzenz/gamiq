/**
 * Locks the page into a mobile-game-friendly state: correct viewport meta and
 * prevention of scroll, pinch-zoom, double-tap zoom and long-press menus.
 * Call once at startup, before other helpers.
 */
export function setupViewport(): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'viewport'
    document.head.prepend(meta)
  }
  meta.content =
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'

  const prevent = (event: Event) => event.preventDefault()
  document.addEventListener('touchmove', prevent, { passive: false })
  document.addEventListener('gesturestart', prevent)
  document.addEventListener('contextmenu', prevent)
  document.addEventListener('dblclick', prevent)
}

export interface ViewportSize {
  width: number
  height: number
}

export function getViewportSize(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * Subscribes to viewport resizes (uses visualViewport where available, which
 * also fires for on-screen keyboard and browser chrome changes). Returns an
 * unsubscribe function.
 */
export function onViewportResize(callback: (size: ViewportSize) => void): () => void {
  const fire = () => callback(getViewportSize())
  const viewport = window.visualViewport
  if (viewport) {
    viewport.addEventListener('resize', fire)
    return () => viewport.removeEventListener('resize', fire)
  }
  window.addEventListener('resize', fire)
  return () => window.removeEventListener('resize', fire)
}
